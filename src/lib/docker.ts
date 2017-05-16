import {docker_list_containers} from "./docker-list-containers";
import {docker_inspect_all} from "./docker-instpect";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
const Dockerode = require("dockerode");
const DockerEvents = require("docker-events");

const handlers: Handler[] = [];

const debug = createLogger(LEVEL.INFO, 'docker');
const gen_log = createLogger(LEVEL.INFO, 'gen');
const cb_error = createLogger(LEVEL.ERROR, 'callback');

export const docker = new Dockerode({
	socketPath: process.env.RUN_IN_DOCKER? '/data/host-var-run/docker.sock' : '/var/run/docker.sock'
});
const emitter = new DockerEvents({docker});

let busy = false, pending = false, t: NodeJS.Timer = null, ot: NodeJS.Timer = null;

// watch
emitter.on("connect", function () {
	debug("connected to docker api");
	scheduleGenerate('(re)connect');
});
emitter.on("start", function (message) {
	debug("container started: %j", message);
	if (ot) {
		clearTimeout(ot);
	}
	ot = setTimeout(() => {
		scheduleGenerate("container started", message.id);
		ot = null;
	}, WAIT_TIME);
});
emitter.on("die", function (message) {
	debug("container stopped: %j", message);
	if (ot) {
		clearTimeout(ot);
	}
	ot = setTimeout(() => {
		scheduleGenerate("container stopped", message.id);
		ot = null;
	}, WAIT_TIME);
});

let WAIT_TIME;
export function connectDocker(wait: number) {
	WAIT_TIME = wait;
	debug("connecting to docker api");
	emitter.start();
}
export function disconnectDocker() {
	debug("disconnect from docker api");
	emitter.stop();
}

function scheduleGenerate(why, target?) {
	if (target) {
		debug('check %s is in building process...', target);
		docker.getContainer(target).inspect((err, inspect) => {
			const text = JSON.stringify(inspect, null, 2);
			if (/BUILDING['"]?\s*[=:]\s*['"]?yes/.test(text)) {
				debug('%s is in building process. ignore.', target);
			} else {
				debug('%s is not in building process. start generation.', target);
				delayGenerate();
			}
		});
	} else {
		debug('EVENT: %s', why);
		realDo();
	}
}

function delayGenerate() {
	if (t) {
		return;
	}
	if (!t) {
		debug('wait %ss generate host...', WAIT_TIME / 1000);
		t = setTimeout(() => {
			debug('wait timeout reached, start generate');
			t = null;
			
			realDo();
		}, WAIT_TIME);
	}
}

let cache = {};
function realDo() {
	if (busy) {
		gen_log('generator busy. stop.');
		pending = true;
		return;
	}
	
	busy = true;
	gen_log('generator started.');
	docker_list_containers(docker).then((containers) => {
		return docker_inspect_all(docker, containers);
	}).then((list: DockerInspect[]) => {
		if (cache_equal(list)) {
			gen_log('nothing changed');
			return;
		}
		re_cache(list);
		
		const wait = handlers.map((cb) => {
			try {
				return cb(list);
			} catch (e) {
				displayError(e);
				return Promise.reject(e);
			}
		});
		
		const pWait = Promise.all(wait);
		let t = setTimeout(() => {
			t = null;
			gen_log('------ generator not response in 10 seconds ------')
		}, 10000);
		const clean = () => {
			if (t) {
				clearTimeout(t);
				t = null;
			}
		};
		pWait.then(clean, clean);
		
		return pWait;
	}).then(() => {
		busy = false;
		if (pending) {
			gen_log('pending... prepare next generation.');
			setImmediate(realDo);
		}
		gen_log('generator stopped.');
	}, (e) => {
		busy = false;
		gen_log('generator error: ' + e.message);
		setImmediate(() => {
			throw e;
		});
	});
}

function re_cache(list: DockerInspect[]) {
	cache = {};
	list.forEach((insp) => {
		cache[insp.Id] = true;
	})
}
function cache_equal(list: DockerInspect[]) {
	if (Object.keys(cache).length !== list.length) {
		return false;
	}
	return list.every(function (insp) {
		return cache.hasOwnProperty(insp.Id);
	});
}

export interface Handler {
	(allDockers: DockerInspect[]): void|Promise<any>;
}

let changeCount = 0;

export function handleChange(cb: Handler) {
	changeCount++;
	debug('handle docker change (handler count=%s)', changeCount);
	handlers.push(cb);
}

function displayError(e: Error) {
	cb_error(e.stack);
}
