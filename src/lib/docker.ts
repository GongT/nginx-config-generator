import {InitFailQuit, NotifyInitCompleteEvent, NotifyInitErrorEvent} from "@gongt/ts-stl-server/boot/service-control";
import {createLogger} from "@gongt/ts-stl-server/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-server/log/levels";
import {CallbackRunner} from "./callback-runner";
import {docker_inspect, docker_inspect_all} from "./docker-instpect";
import {docker_list_containers} from "./docker-list-containers";

export type Callback = (list: DockerInspect[]) => Promise<any>;

const Dockerode = require("dockerode");
const DockerEvents = require("docker-events");

const debug = createLogger(LOG_LEVEL.INFO, 'docker');
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
runner.once(runner.EVENTS.ERROR, (e: Error) => {
	NotifyInitErrorEvent();
	debug_start_error('>>> failed first generate: %s', e.message);
	InitFailQuit(e);
});
runner.once(runner.EVENTS.END, () => {
	initComplete = true;
	debug_start('>>> first trigger reload, send complete notify.');
	NotifyInitCompleteEvent();
});

// watch
emitter.on("connect", function () {
	debug("connected to docker api");
	if (process.env.RUN_IN_DOCKER) {
		runner.delay(WAIT_TIME, 'connect').catch();
	} else {
		runner.run('connect').catch();
	}
});
emitter.on("start", function (message) {
	debug("container started: %j", message);
	runner.delay(WAIT_TIME, "container started", message.id).catch();
});
emitter.on("die", function (message) {
	debug("container stopped: %j", message);
	runner.delay(WAIT_TIME, "container stopped", message.id).catch();
});

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

async function scheduleGenerate(why: string, target?: string) {
	debug('EVENT: %s', why);
	if (target) {
		debug('check %s is in building process...', target);
		const inspect = await docker_inspect(docker, target);
		const text = JSON.stringify(inspect, null, 2);
		if (/BUILDING['"]?\s*[=:]\s*['"]?yes/.test(text)) {
			debug('%s is in building process. ignore.', target);
			return;
		} else {
			debug('%s is not in building process. start generation.', target);
		}
	}
	
	await realDo();
	gen_log('generator stopped');
}

let cache = {};
async function realDo() {
	gen_log('generator started.');
	const containers = await docker_list_containers(docker);
	const list: DockerInspect[] = await docker_inspect_all(docker, containers);
	
	if (cache_equal(list)) {
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
