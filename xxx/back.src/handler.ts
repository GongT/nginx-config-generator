import {InitFailQuit, NotifyInitCompleteEvent} from "@gongt/ts-stl-server/boot/service-control";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import * as extend from "extend";
import {lstatSync, readdirSync, unlinkSync} from "fs";
import {resolve} from "path";
import {SERVER_SAVE_FOLDER, SERVICE_SAVE_FOLDER} from "./boot";
import {whoAmI} from "./config";
import {connectDocker, handleChange} from "./lib/docker";
import {writeGeneratedFile, writeServerFile} from "./lib/files";
import {getAllNames, getServiceKnownAlias, getServiceName} from "./lib/labels";
import {reloadNginxConfig} from "./lib/restart-nginx";
import {generateConfigFile, generateServerFile} from "./service_template/template-render";
const debug_start = createLogger(LEVEL.NOTICE, 'start');
const debug_normal = createLogger(LEVEL.INFO, 'handle');
const debug_notice = createLogger(LEVEL.NOTICE, 'handle');
const debug_nginx_error = createLogger(LEVEL.ERROR, 'nginx');
const debug_init_error = createLogger(LEVEL.EMERG, 'init');

let inited = false;

export interface LocationDefine {
	type: string;
	location?: string;
	options?: {
		[key: string]: any;
	};
}
export interface StreamDefine {
	port: number;
}

export interface IServiceConfig {
	serverName: string;
	locations: {[path: string]: string|LocationDefine};
	servers?: {[ports: string]: StreamDefine};
	machines: string[];
	SSL: boolean|'force';
	certFile?: string;
	outerSubDomainName?: string;
	interfaceMachine: string[];
	outerDomainName?: string;
	existsCurrentServer: string;
	alias?: string[],
	_alias: string[];
	extraBodyString?: string;
	configFileGlobal?: string[];
	upStream?: {
		configFileServer: string[];
		configMainBody: string[];
	};
	downStream?: {
		configFileServer: string[];
		configMainBody: string[];
	};
}

export function switchBody(service: IServiceConfig, direction: 'up'|'down') {
	if (direction === 'up') {
		return service.upStream;
	}
	if (direction === 'down') {
		return service.downStream;
	}
	throw new TypeError(`direction "${direction}" unknown.`);
}

const serviceDefines: IServiceConfig[] = Object.keys(JsonEnv.services).map((name) => {
	const obj: IServiceConfig = extend(true, {}, JsonEnv.services[name], {
		existsCurrentServer: '',
	});
	
	obj.serverName = name;
	obj.outerDomainName = (obj.outerSubDomainName || name) + '.' + JsonEnv.baseDomainName;
	if (!obj._alias) {
		debug_start('service %s has no alias.', name);
		obj._alias = [];
	}
	
	debug_start('registed service [%s]: %s', name, JSON.stringify(obj, null, 4).replace(/\n/g, '\n\t '));
	
	return obj;
});

function getServiceMap(list: DockerInspect[]): {[id: string]: DockerInspect} {
	const ret = {};
	list.forEach((ins) => {
		const name = getServiceName(ins);
		if (name) {
			ret[name] = ins;
		}
	});
	return ret;
}
connectDocker(4000); // wait 4s every action

handleChange(async (list) => {
	debug_normal('docker status changed!');
	const runningService = getServiceMap(list);
	serviceDefines.forEach((obj) => {
		if (runningService.hasOwnProperty(obj.serverName)) {
			obj.existsCurrentServer = runningService[obj.serverName].Config.Hostname;
			obj._alias = getAllNames(runningService[obj.serverName]);
			delete runningService[obj.serverName];
		} else {
			obj.existsCurrentServer = '';
			obj._alias = getServiceKnownAlias(obj.serverName);
		}
	});
	
	const createdFiles = {};
	const createdFilesServers = {};
	
	debug_normal('# Config Files');
	debug_normal(`creating config files in "${SERVICE_SAVE_FOLDER}".`);
	serviceDefines.forEach((service: IServiceConfig) => {
		const content = generateConfigFile(service);
		writeGeneratedFile(createdFiles, service.serverName, content);
		
		if (service.servers) {
			const serverContent = generateServerFile(service);
			if (serverContent) {
				writeServerFile(createdFilesServers, service.serverName, serverContent);
			}
		}
	});
	
	debug_normal('# Running Service');
	Object.keys(runningService).forEach((name) => {
		console.error('');
		const container: DockerInspect = runningService[name];
		const serviceName = getServiceName(container);
		
		if (!serviceName) {
			debug_normal(`container name not valid: ${name}`);
		}
		if (serviceName === process.env.PROJECT_NAME) {
			debug_normal(`ignore my self`);
			return;
		}
		
		const fakeService: IServiceConfig = {
			serverName: serviceName,
			locations: {},
			machines: [],
			SSL: false,
			interfaceMachine: [whoAmI.id],
			existsCurrentServer: container.Config.Hostname,
			_alias: getAllNames(container),
			extraBodyString: 'access_log /dev/stdout tiny;',
		};
		
		const content = generateConfigFile(fakeService);
		writeGeneratedFile(createdFiles, serviceName, content);
	});
	
	removeUnusedFiles(SERVICE_SAVE_FOLDER, createdFiles);
	removeUnusedFiles(SERVER_SAVE_FOLDER, createdFilesServers);
	const anyChange = somethingChanged(createdFiles) || somethingChanged(createdFilesServers);
	
	if (anyChange || !inited) {
		try {
			await reloadNginxConfig();
			
			if (!inited) {
				debug_start('>>> first trigger reload, send complete notify.');
				inited = true;
				NotifyInitCompleteEvent();
			}
		} catch (e) {
			if (!inited) {
				debug_init_error(e);
				inited = true;
				InitFailQuit();
				console.error(new Error("process.exit"));
				process.exit(1);
			}
		}
	}
});

function somethingChanged(obj) {
	return Object.keys(obj).some(i => obj[i]);
}
function removeUnusedFiles(root: string, changedFiles: {[absFile: string]: boolean}) {
	readdirSync(root).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(root, f);
		
		if (!changedFiles.hasOwnProperty(file)) {
			if (lstatSync(file).isDirectory()) {
				console.error('removing unknown file in directory: %s', file);
				removeUnusedFiles(file, changedFiles);
			} else {
				console.error('removing unknown file: %s', file);
				try {
					unlinkSync(file);
					debug_normal('file removed');
					changedFiles[file] = true;
				} catch (e) {
					debug_notice('remove file error: %s', e.trace);
				}
			}
		}
	});
}
