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
const cb_error = createLogger(LOG_LEVEL.ERROR, 'callback');
const debug_start = createLogger(LOG_LEVEL.NOTICE, 'start');
const debug_start_error = createLogger(LOG_LEVEL.ERROR, 'init');

export const docker = new Dockerode({
	socketPath: process.env.RUN_IN_DOCKER? '/data/host-var-run/docker.sock' : '/var/run/docker.sock',
});
const emitter = new DockerEvents({docker});
const runner = new CallbackRunner(scheduleGenerate);
const handlers: Callback[] = [];
export let initComplete = false;

let wto: Timeout;
runner.on(runner.EVENTS.START, () => {
	wto = timeout(10000);
	wto.then(() => {
		gen_log('------ generator not response in 10 seconds ------');
	});
});
runner.on(runner.EVENTS.END, () => {
	wto.kill();
});
const failQuit = (e: Error) => {
	NotifyInitErrorEvent();
	debug_start_error('>>> failed first generate: %s', e.message);
	InitFailQuit(e);
};
runner.once(runner.EVENTS.ERROR, failQuit);
runner.once(runner.EVENTS.END, () => {
	initComplete = true;
	debug_start('>>> first trigger reload, send complete notify.');
	NotifyInitCompleteEvent();
	runner.removeListener(runner.EVENTS.ERROR, failQuit);
});

// debug
const debugEnable = !process.env.RUN_IN_DOCKER;
if (debugEnable) {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '',
	});
	rl.on('line', (input) => {
		manualReload();
	});
}

function manualReload() {
	console.log('\x1Bc');
	runner.run('manual').then(() => {
		console.log('\x1B[38;5;10mManual trigger reload: OK! \x1B[0m',);
	}, (err) => {
		console.log('\x1B[38;5;9mManual trigger reload: Error!\x1B[0m\n%s', err.message);
	});
}

// watch
emitter.on("connect", function () {
	debug("connected to docker api");
	if (process.env.RUN_IN_DOCKER) {
		runner.delay(WAIT_TIME, 'connect').catch(hintError);
	} else {
		runner.run('connect').catch(hintError);
	}
});
emitter.on("start", function (message) {
	debug("container started: %s", message.id);
	debug_data(message);
	runner.delay(WAIT_TIME, "container started", message.id, true).catch(hintError);
});
emitter.on("die", function (message) {
	debug("container stopped: %s", message.id);
	debug_data(message);
	runner.delay(WAIT_TIME, "container stopped", message.id, false).catch(hintError);
});

debug_start('process pid: %s', process.pid);
process.on('SIGUSR2', () => {
	manualReload();
});

function hintError(e) {
	console.error('catch promise reject: %s', e? e.stack : 'no more info');
}

let WAIT_TIME: number = 1000;

export function connectDocker(wait: number = 1000) {
	WAIT_TIME = wait;
	debug("connecting to docker api");
	emitter.start();
}

export function disconnectDocker() {
	debug("disconnect from docker api");
	emitter.stop();
}

const knownBuilding = {};

async function scheduleGenerate(why: string, target?: string, started?: boolean) {
	debug('EVENT: %s', why);
	if (target) {
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
	
	if (debugEnable && why === 'manual') {
		await realDo(false);
	} else {
		await realDo();
	}
	gen_log('generator stopped');
}

let cache = {};

async function realDo(normal: boolean = true) {
	gen_log('generator started.');
	const containers = await docker_list_containers(docker);
	const list: DockerInspect[] = await docker_inspect_all(docker, containers);
	
	if (cache_equal(list) && normal) {
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

function re_cache(list: DockerInspect[]) {
	cache = {};
	list.forEach((insp) => {
		cache[insp.Id] = true;
	});
}

function cache_equal(list: DockerInspect[]) {
	if (Object.keys(cache).length !== list.length) {
		return false;
	}
	return list.every(function (insp) {
		return cache.hasOwnProperty(insp.Id);
	});
}

export function handleChange(cb: Callback) {
	debug('handle docker change: ', cb.name || '{anonymous}');
	handlers.push(cb);
}

type Timeout = Promise<void>&{kill(): void};

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
