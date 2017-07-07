import "@gongt/jenv-data/global";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {lstatSync, readdirSync, unlinkSync} from "fs";
import {resolve} from "path";
import {SERVER_SAVE_FOLDER, SERVICE_SAVE_FOLDER} from "./init/folders";
import {serviceMapper} from "./init/services";
import {connectDocker, handleChange, initComplete} from "./lib/docker";
import {FileTracker} from "./lib/file-change-tracker";
import {reloadNginxConfig} from "./lib/restart-nginx";
import {getServiceName} from "./lib/service-name";

const debug_silly = createLogger(LEVEL.SILLY, 'handle');
const debug_normal = createLogger(LEVEL.INFO, 'handle');
const debug_notice = createLogger(LEVEL.NOTICE, 'handle');

function getNameDockerMap(list: DockerInspect[]): {[id: string]: DockerInspect} {
	const ret = {};
	list.forEach((ins) => {
		const name = getServiceName(ins.Name);
		if (name) {
			ret[name] = ins;
		}
	});
	return ret;
}
connectDocker(2000); // wait 2s every action

handleChange(async (list: DockerInspect[]) => {
	debug_normal('docker status changed!');
	const runningDocker = getNameDockerMap(list);
	
	let changed = false;
	const fileTracker: FileTracker = new FileTracker;
	
	for (const creator of serviceMapper.values()) {
		if (runningDocker.hasOwnProperty(creator.serviceName)) {
			creator.docker(runningDocker[creator.serviceName]);
			delete runningDocker[creator.serviceName];
		} else {
			creator.noDocker();
		}
		creator.createTemplate(fileTracker);
	}
	
	// debug_normal(`creating config files in "${SERVICE_SAVE_FOLDER}".`);
	
	removeUnusedFiles(SERVICE_SAVE_FOLDER, fileTracker);
	removeUnusedFiles(SERVER_SAVE_FOLDER, fileTracker);
	
	// if not inited, force load
	if (fileTracker.hasSomeChange() || !initComplete) {
		await reloadNginxConfig();
	}
});

function removeUnusedFiles(root: string, fileTracker: FileTracker): boolean {
	let changed = false;
	readdirSync(root).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(root, f);
		
		if (!fileTracker.isKnown(file)) {
			if (lstatSync(file).isDirectory()) {
				debug_normal('removing unknown file in directory: %s', file);
				removeUnusedFiles(file, fileTracker);
			} else {
				fileTracker.know(file);
				debug_normal('removing old unknown file: %s', file);
				try {
					unlinkSync(file);
				} catch (e) {
					debug_notice('remove file error: %s', e.message);
				}
			}
		}
	});
	return changed;
}
