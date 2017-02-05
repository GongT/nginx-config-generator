import * as Debug from "debug";
import {handleChange, docker} from "./lib/docker";
import {getServiceMap, getAllNames} from "./lib/labels";
import {generateConfigFile} from "./service_template/template-render";
import {readdirSync, writeFileSync, readFileSync, unlinkSync} from "fs";
import {SERVICE_SAVE_FOLDER} from "./boot";
import {resolve} from "path";
import {createHash} from "crypto";
import {docker_exec} from "./lib/docker-exec";
import * as extend from "extend";
import {existsSync} from "fs";
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
	alias: string[];
}

const serviceDefines: IServiceConfig[] = Object.keys(JsonEnv.services).map((name) => {
	const obj: IServiceConfig = extend(true, {}, JsonEnv.services[name], {
		existsCurrentServer: '',
	});
	
	obj.serverName = name;
	obj.outerDomainName = (obj.outerSubDomainName || name) + '.' + JsonEnv.baseDomainName;
	if (!obj.alias) {
		obj.alias = [];
	}
	
	debug_start('registed service [%s]: %s', name, JSON.stringify(obj, null, 4).replace(/\n/g, '\n\t '));
	
	return obj;
});

handleChange((list) => {
	debug('docker status changed!');
	const runningService = getServiceMap(list);
	serviceDefines.forEach((obj) => {
		if (runningService.hasOwnProperty(obj.serverName)) {
			obj.existsCurrentServer = runningService[obj.serverName].Config.Hostname;
		} else {
			obj.existsCurrentServer = '';
		}
	});
	
	const createdFiles = {};
	let someChange = 0;
	
	debug(`creating config files in "${SERVICE_SAVE_FOLDER}".`);
	serviceDefines.forEach((service: IServiceConfig) => {
		console.error('');
		debug('file: %s', `${service.serverName}.conf`);
		
		const configFile = resolve(SERVICE_SAVE_FOLDER, `${service.serverName}.conf`);
		createdFiles[configFile] = true;
		
		const content = generateConfigFile(service);
		const oldHash = existsSync(configFile)? md5(readFileSync(configFile, 'utf-8')) : '';
		
		if (oldHash) {
			const newHash = md5(content);
			debug('  hash check:\n\t     old= %s\n\t     new= %s', oldHash, newHash);
			
			if (oldHash === newHash) {
				debug('  file not changed.');
				debug(`file: ${service.serverName}.conf -- complete`);
				return;
			} else {
				debug('  file changed.');
				someChange++;
			}
		} else {
			debug('  file not exists.');
			someChange++;
		}
		
		try {
			writeFileSync(configFile, content, 'utf-8');
			debug('  write complete.');
		} catch (error) {
			someChange--;
			debug('  write file error: \n%s', error.trace);
		}
		
		debug(`file: ${service.serverName}.conf -- complete`);
	});
	
	readdirSync(SERVICE_SAVE_FOLDER).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(SERVICE_SAVE_FOLDER, f);
		
		if (!createdFiles.hasOwnProperty(file)) {
			console.error('removing old unknown file: %s', file);
			someChange++;
			try {
				unlinkSync(file);
				debug('file removed');
			} catch (e) {
				debug('remove file error: %s', e.trace);
			}
		}
	});
	
	if (process.env.RUN_IN_DOCKER) {
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

function md5(str) {
	return createHash('md5').update(str).digest().toString('hex');
}
