import {InitFailQuit, NotifyInitCompleteEvent} from "typescript-common-library/server/boot/service-control";
import {connectDocker, docker, handleChange} from "./lib/docker";
import {getAllNames, getServiceKnownAlias, getServiceName} from "./lib/labels";
import {generateConfigFile, generateServerFile} from "./service_template/template-render";
import {existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync} from "fs";
import {SERVER_SAVE_FOLDER, SERVICE_SAVE_FOLDER} from "./boot";
import {basename, resolve} from "path";
import {createHash} from "crypto";
import {docker_exec} from "./lib/docker-exec";
import * as extend from "extend";
import {whoAmI} from "./config";
import {createLogger, LEVEL} from "typescript-common-library/server/debug";
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
	outerSubDomainName?: string;
	interfaceMachine: string[];
	outerDomainName?: string;
	existsCurrentServer: string;
	alias?: string[],
	_alias: string[];
	extraBodyString?: string;
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

handleChange((list) => {
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
		writeFile(createdFiles, service.serverName, content);
		
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
		writeFile(createdFiles, serviceName, content);
	});
	
	removeUnusedFiles(SERVICE_SAVE_FOLDER, createdFiles);
	removeUnusedFiles(SERVER_SAVE_FOLDER, createdFilesServers);
	const anyChange = somethingChanged(createdFiles) || somethingChanged(createdFilesServers);
	
	if (anyChange) {
		debug_normal('try to restart nginx...');
		if (!process.env.RUN_IN_DOCKER) {
			debug_notice('  not run in docker, not restart nginx');
			return;
		}
		const p = docker_exec(docker, 'nginx', ['nginx', '-t']).then(([exit]) => {
			if (exit === 0) {
				debug_normal('>>> nginx config test success.');
				return docker_exec(docker, 'nginx', ['nginx', '-s', 'reload']).then(([exit]) => {
					if (exit === 0) {
						debug_normal('>>> nginx reload success.');
					} else {
						debug_nginx_error('>>> nginx reload failed.');
						throw new Error('nginx reload error');
					}
				}, (e) => {
					debug_nginx_error('Docker Exec failed: ', e);
					throw e;
				});
			} else {
				debug_nginx_error('>>> nginx config has error.');
				throw new Error('nginx config error');
			}
		});
		p.then(() => {
			debug_start('>>> inited = %s (%s).', inited, typeof inited);
		}, (e) => {
			debug_nginx_error('>>> Docker Exec failed: %s', e? e.stack || e.message : 'no message.');
		});
		if (!inited) {
			p.then(() => {
				debug_start('>>> first trigger reload, send complete notify.');
				inited = true;
				NotifyInitCompleteEvent();
			}, (e) => {
				debug_init_error(e);
				inited = true;
				InitFailQuit();
				console.error(new Error("process.exit"));
				process.exit(1);
			});
		}
	} else if (!inited) {
		debug_start('>>> first trigger reload, send complete notify.');
		inited = true;
		NotifyInitCompleteEvent();
	}
});

function writeFile(storage: {[id: string]: boolean}, filename: string, content: string) {
	const configFile = resolve(SERVICE_SAVE_FOLDER, `${filename}.conf`);
	return writeFileAbs(storage, configFile, content);
}
function writeServerFile(storage: {[id: string]: boolean}, filename: string, content: string) {
	const configFile = resolve(SERVER_SAVE_FOLDER, `${filename}.conf`);
	return writeFileAbs(storage, configFile, content);
}

function writeFileAbs(storage: {[id: string]: boolean}, configFile: string, content: string) {
	debug_normal('file: %s', basename(configFile));
	debug_normal(`  location: ${configFile}.`);
	
	storage[configFile] = true;
	
	const oldHash = existsSync(configFile)? md5(readFileSync(configFile, 'utf-8')) : '';
	debug_normal(`    old file hash    = ${oldHash}`);
	
	if (oldHash) {
		const newHash = md5(content);
		debug_normal(`    new content hash = ${oldHash}`);
		
		if (oldHash === newHash) {
			debug_normal('  file not changed.');
			debug_normal(`file: ${configFile} -- complete`);
			storage[configFile] = false;
			return;
		} else {
			debug_normal('  file changed.');
		}
	} else {
		debug_normal('  file not exists.');
	}
	
	try {
		writeFileSync(configFile, content, 'utf-8');
		debug_normal('  write complete.');
	} catch (error) {
		debug_normal('  write file error: \n%s', error.trace);
		storage[configFile] = false;
	}
	debug_normal(`file: ${configFile} -- complete`);
}

function md5(str) {
	return createHash('md5').update(str).digest().toString('hex');
}

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
			console.error('removing old unknown file: %s', file);
			try {
				unlinkSync(file);
				debug_normal('file removed');
				changedFiles[file] = true;
			} catch (e) {
				debug_normal('remove file error: %s', e.trace);
			}
		}
	});
}
