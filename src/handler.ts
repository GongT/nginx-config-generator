import "@gongt/jenv-data/global";
import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";
import {lstatSync, readdirSync, rmdirSync, unlinkSync} from "fs";
import {resolve} from "path";
import {debugPath, SERVICE_SAVE_FOLDER} from "./init/folders";
import {defaultServer, globalFile, mainServiceLoader, serviceMapper, streamServiceLoader} from "./init/services";
import {connectDocker, handleChange, initComplete} from "./lib/docker";
import {FileTracker} from "./lib/file-change-tracker";
import {reloadNginxConfig} from "./lib/restart-nginx";
import {getServiceName} from "./lib/service-name";

const debug_silly = createLogger(LOG_LEVEL.SILLY, 'handle');
const debug_normal = createLogger(LOG_LEVEL.INFO, 'handle');
const debug_notice = createLogger(LOG_LEVEL.NOTICE, 'handle');

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
	
	mainServiceLoader.configFile().writeFile(fileTracker);
	streamServiceLoader.configFile().writeFile(fileTracker);
	globalFile.configFile().writeFile(fileTracker);
	defaultServer.configFile().writeFile(fileTracker);
	
	// debug_normal(`creating config files in "${SERVICE_SAVE_FOLDER}".`);
	
	removeUnusedFiles(SERVICE_SAVE_FOLDER, fileTracker);
	
	// if not inited, force load
	if (fileTracker.hasSomeChange() || !initComplete) {
		await reloadNginxConfig();
	}
});

function removeUnusedFiles(root: string, fileTracker: FileTracker): boolean {
	let allDeleted = true;
	readdirSync(root).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		let absPath = resolve(root, f);
		
		if (fileTracker.isKnown(absPath)) {
			allDeleted = false;
		} else {
			let fileDebug = debugPath(absPath);
			if (lstatSync(absPath).isDirectory()) {
				fileDebug += '/';
				debug_silly('removing unknown file in directory: %s', fileDebug);
				const subEmpty = removeUnusedFiles(absPath, fileTracker);
				if (subEmpty) {
					debug_normal('  noting left in %s, remove folder.', absPath);
					try {
						rmdirSync(absPath);
					} catch (e) {
						debug_notice('  remove folder error: %s', debugPath(e.message));
					}
					allDeleted = true;
				}
			} else {
				debug_silly('removing old unknown file: %s', fileDebug);
				try {
					unlinkSync(absPath);
				} catch (e) {
					debug_notice('remove file error: %s', e.message);
				}
			}
		}
	});
	
	return allDeleted;
}
