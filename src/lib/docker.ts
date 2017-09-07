import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {InitFailQuit, NotifyInitCompleteEvent, NotifyInitErrorEvent} from "@gongt/ts-stl-server/boot/service-control";
import {LOG_LEVEL} from "@gongt/ts-stl-server/log/levels";
import {CallbackRunner} from "./callback-runner";
import {docker_inspect, docker_inspect_all} from "./docker-instpect";
import {docker_list_containers} from "./docker-list-containers";

export type Callback = (list: DockerInspect[]) => Promise<any>;

const Dockerode = require("dockerode");
const DockerEvents = require("docker-events");

const debug = createLogger(LOG_LEVEL.INFO, 'docker');
const debug_data = createLogger(LOG_LEVEL.DATA, 'docker');
const gen_log = createLogger(LOG_LEVEL.INFO, 'gen');
const debug_start = createLogger(LOG_LEVEL.NOTICE, 'start');
const debug_start_error = createLogger(LOG_LEVEL.ERROR, 'init');

const runner = new CallbackRunner(scheduleGenerate);

/* show log when generate error */
runner.on(runner.EVENTS.ERROR, hintError);

function hintError(e) {
	console.error('catch promise reject: %s', e? e.stack : 'no more info');
}

/* send signal to systemd, when 1st generate complete */
export let initComplete = false;
runner.once(runner.EVENTS.ERROR, failQuit);
runner.once(runner.EVENTS.END, () => {
	initComplete = true;
	debug_start('>>> first trigger reload, send complete notify.');
	NotifyInitCompleteEvent();
	runner.removeListener(runner.EVENTS.ERROR, failQuit);
});

function failQuit(e: Error) {
	NotifyInitErrorEvent();
	debug_start_error('>>> failed first generate: %s', e.message);
	InitFailQuit(e);
}

/* RELOAD: actions */
const enum REASON {
	CONTAINER_START = 'container started',
	CONTAINER_STOP = 'container stopped',
	CONNECT = 'connected',
	DEBUG = 'debug-restart',
	SIGNAL = 'signal:SIGUSR2',
}

function manualReload(why: REASON) {
	console.log('\x1Bc');
	runner.manual(why).then(() => {
		console.log('\x1B[38;5;10mmanual trigger (by %s) reload: OK! \x1B[0m', why);
	}, (err) => {
		console.log('\x1B[38;5;9mmanual trigger (by %s) reload: Error!\x1B[0m\n%s', why, err.message);
	});
}

/* RELOAD: receive signal */
debug_start('process pid: %s', process.pid);
process.on('SIGUSR2', () => {
	manualReload(REASON.SIGNAL);
});

/* RELOAD: press Enter when debug */
const debugEnable = !process.env.RUN_IN_DOCKER;
if (debugEnable) {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '',
	});
	rl.on('line', (input) => {
		manualReload(REASON.DEBUG);
	});
}

/* docker event watcher */
let WAIT_TIME: number = 1000;
export const docker = new Dockerode({
	socketPath: process.env.RUN_IN_DOCKER? '/data/host-var-run/docker.sock' : '/var/run/docker.sock',
});
const emitter = new DockerEvents({docker});
emitter.on("connect", function () {
	debug("connected to docker api");
	if (process.env.RUN_IN_DOCKER) {
		runner.delay(WAIT_TIME).run(REASON.CONNECT);
	} else {
		runner.run(REASON.CONNECT);
	}
});
emitter.on("start", function (message) {
	debug("container started: %s", message.id);
	debug_data(message);
	runner.delay(WAIT_TIME).run(REASON.CONTAINER_START, message.id, true);
});
emitter.on("die", function (message) {
	debug("container stopped: %s", message.id);
	debug_data(message);
	runner.delay(WAIT_TIME).run(REASON.CONTAINER_STOP, message.id, false);
});

const knownBuilding = {};

async function scheduleGenerate(why: REASON, target?: string, started?: boolean) {
	debug('EVENT: %s', why);
	if (target) { // has target if caused by container start/stop. not by manual or 1st connect.
		if (started) {
			debug('check %s is in building process...', target);
			const inspect = await docker_inspect(docker, target);
			const text = JSON.stringify(inspect, null, 2);
			if (/BUILDING['"]?\s*[=:]\s*['"]?yes/.test(text)) {
				debug('%s is in building process. ignore.', target);
				knownBuilding[target] = true;
				return;
			} else {
				debug('%s is not in building process. start generation.', target);
			}
		} else {
			if (knownBuilding[target]) {
				debug('%s is in building process. ignore.', target);
				delete knownBuilding[target];
				return;
			}
		}
	}
	
	const isAuto = (why === REASON.CONTAINER_START) || (why === REASON.CONTAINER_STOP);
	await realDo(isAuto);
	
	gen_log('generator stopped');
}

async function realDo(skipUnchanged: boolean = true) {
	gen_log('generator started.');
	const containers = await docker_list_containers(docker);
	const list: DockerInspect[] = await docker_inspect_all(docker, containers);
	
	if (skipUnchanged && cache_equal(list)) {
		gen_log('nothing changed');
		return;
	}
	
	const ps = handlers.map(fn => {
		try {
			return fn(list);
		} catch (e) {
			return Promise.reject(e);
		}
	});
	
	await Promise.all(ps);
	
	re_cache(list);
	gen_log('generator completed.');
}

let cache = {};

function re_cache(list: DockerInspect[]) {
	cache = {};
	for (const inspect of list) {
		cache[inspect.Id] = true;
	}
}

function cache_equal(list: DockerInspect[]) {
	if (Object.keys(cache).length !== list.length) {
		return false;
	}
	for (const inspect of list) {
		if (!cache[inspect.Id]) {
			return false;
		}
	}
	return true;
}

/* exported API */
const handlers: Callback[] = [];

export function connectDocker(wait: number = 1000) {
	WAIT_TIME = wait;
	debug("connecting to docker api");
	emitter.start();
}

export function disconnectDocker() {
	debug("disconnect from docker api");
	emitter.stop();
}

export function handleChange(cb: Callback) {
	debug('handle docker change: ', cb.name || '{anonymous}');
	handlers.push(cb);
}

/* show log when generate take too many time (or hang) */
type Timeout = Promise<void>&{kill(): void};
let warnTimeout: Timeout;
runner.on(runner.EVENTS.START, () => {
	warnTimeout = timeout(10000);
	warnTimeout.then(() => {
		gen_log('------ generator not response in 10 seconds ------');
	});
});
runner.on(runner.EVENTS.END, () => {
	warnTimeout.kill();
});

function timeout(ms: number): Timeout {
	let to = null;
	const p = <any>new Promise((resolve, reject) => {
		to = setTimeout(() => {
			resolve();
		}, ms);
	});
	p.kill = () => {
		clearTimeout(to);
	};
	return p;
}
