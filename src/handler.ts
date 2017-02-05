import * as Debug from "debug";
import {handleChange, docker} from "./lib/docker";
import {getAllNames, getServiceName, getServiceKnownAlias} from "./lib/labels";
import {generateConfigFile} from "./service_template/template-render";
import {readdirSync, writeFileSync, readFileSync, unlinkSync} from "fs";
import {SERVICE_SAVE_FOLDER} from "./boot";
import {resolve} from "path";
import {createHash} from "crypto";
import {docker_exec} from "./lib/docker-exec";
import * as extend from "extend";
import {existsSync} from "fs";
import {whoAmI} from "./config";
const debug_start = Debug('start');
const debug = Debug('handle');

export interface IServiceConfig {
	serverName: string;
	locations: {[path: string]: string};
	machines: string[];
	SSL: boolean | 'force';
	outerSubDomainName?: string;
	interfaceMachine: string;
	outerDomainName?: string;
	existsCurrentServer: string;
	alias?: string[],
	_alias: string[];
}

const serviceDefines: IServiceConfig[] = Object.keys(JsonEnv.services).map((name) => {
	const obj: IServiceConfig = extend(true, {}, JsonEnv.services[name], {
		existsCurrentServer: '',
	});
	
	obj.serverName = name;
	obj.outerDomainName = (obj.outerSubDomainName || name) + '.' + JsonEnv.baseDomainName;
	if (!obj._alias) {
		console.error('service %s has no alias.', name);
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

handleChange((list) => {
	debug('docker status changed!');
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
	
	debug(`creating config files in "${SERVICE_SAVE_FOLDER}".`);
	serviceDefines.forEach((service: IServiceConfig) => {
		console.error('');
		const content = generateConfigFile(service);
		writeFile(createdFiles, service.serverName, content);
	});
	
	Object.keys(runningService).forEach((name) => {
		console.error('');
		const container: DockerInspect = runningService[name];
		const serviceName = getServiceName(container);
		
		if (!serviceName) {
			debug(`container name not valid: ${name}`);
		}
		
		const fakeService: IServiceConfig = {
			serverName: serviceName,
			locations: {},
			machines: [],
			SSL: false,
			interfaceMachine: whoAmI.id,
			existsCurrentServer: container.Config.Hostname,
			_alias: getAllNames(container),
		};
		
		const content = generateConfigFile(fakeService);
		writeFile(createdFiles, serviceName, content);
	});
	
	readdirSync(SERVICE_SAVE_FOLDER).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(SERVICE_SAVE_FOLDER, f);
		
		if (!createdFiles.hasOwnProperty(file)) {
			console.error('removing old unknown file: %s', file);
			try {
				unlinkSync(file);
				debug('file removed');
				createdFiles[file] = true;
			} catch (e) {
				debug('remove file error: %s', e.trace);
			}
		}
	});
	
	if (process.env.RUN_IN_DOCKER && somethingChanged(createdFiles)) {
		debug('try to restart nginx...');
		docker_exec(docker, 'nginx', ['/usr/sbin/nginx', '-t']).then(([exit, out, err]) => {
			if (exit === 0) {
				console.log('\x1B[38;5;10m>>> nginx config test success. \x1B[0m');
				docker_exec(docker, 'nginx', ['/usr/sbin/nginx', '-s', 'reload']).then(([exit, out, err]) => {
					if (exit === 0) {
						console.log('\x1B[38;5;10m>>> nginx reload success. \x1B[0m');
					} else {
						console.log('\x1B[38;5;9m>>> nginx reload failed. \x1B[0m')
					}
				}).catch((e) => {
					console.error('Docker Exec failed: ', e);
				});
			} else {
				console.log('\x1B[38;5;9m>>> nginx config has error. \x1B[0m')
			}
		}).catch((e) => {
			console.error('Docker Exec failed: ', e);
		});
	}
});

function writeFile(storage: {[id: string]: boolean}, filename: string, content: string) {
	debug('file: %s', `${filename}.conf`);
	
	const configFile = resolve(SERVICE_SAVE_FOLDER, `${filename}.conf`);
	debug(`  location: ${configFile}.`);
	
	storage[configFile] = true;
	
	const oldHash = existsSync(configFile)? md5(readFileSync(configFile, 'utf-8')) : '';
	debug(`    old file hash    = ${oldHash}`);
	
	if (oldHash) {
		const newHash = md5(content);
		debug(`    new content hash = ${oldHash}`);
		
		if (oldHash === newHash) {
			debug('  file not changed.');
			debug(`file: ${filename}.conf -- complete`);
			storage[configFile] = false;
			return;
		} else {
			debug('  file changed.');
		}
	} else {
		debug('  file not exists.');
	}
	
	try {
		writeFileSync(configFile, content, 'utf-8');
		debug('  write complete.');
	} catch (error) {
		debug('  write file error: \n%s', error.trace);
		storage[configFile] = false;
	}
	debug(`file: ${filename}.conf -- complete`);
}

function md5(str) {
	return createHash('md5').update(str).digest().toString('hex');
}

function somethingChanged(obj) {
	return Object.keys(obj).some(i => obj[i]);
}
