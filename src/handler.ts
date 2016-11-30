import * as Debug from "debug";
import {handleChange, docker} from "./lib/docker";
import {getServiceMap, getAllNames} from "./lib/labels";
import {generateConfigFile} from "./service_template/template-render";
import {readdirSync, writeFileSync, readFileSync, unlinkSync} from "fs";
import {SERVICE_SAVE_FOLDER} from "./boot";
import {resolve} from "path";
import {createHash} from "crypto";
import {docker_exec} from "./lib/docker-exec";
const debug = Debug('config:main');

export interface IServiceConfig {
	serverName: string;
	locations: {[path: string]: string};
	machines: string[];
	SSL: boolean | 'force';
	outerSubDomainName?: string;
	running: DockerInspect;
	existsCurrentServer: boolean;
	serviceName: string;
}

handleChange((list) => {
	debug('docker status changed!');
	const runningService = getServiceMap(list);
	
	const serviceDefines: IServiceConfig[] = Object.keys(JsonEnv.nginx_services).map((name) => {
		const obj: IServiceConfig = JSON.parse(JSON.stringify(JsonEnv.nginx_services[name]));
		
		obj.existsCurrentServer = runningService.hasOwnProperty(name);
		obj.running = runningService[name];
		obj.serviceName = name;
		if (!obj.outerSubDomainName) {
			obj.outerSubDomainName = obj.serviceName + '.' + JsonEnv.baseDomainName;
		}
		obj.serverName = obj.running? getAllNames(runningService[name]).join(' ') : obj.outerSubDomainName;
		
		return obj;
	});
	
	const hash = {};
	let someChange = 0;
	readdirSync(SERVICE_SAVE_FOLDER).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(SERVICE_SAVE_FOLDER, f);
		console.error('removing old file: %s', file);
		
		hash[file] = md5(readFileSync(file, 'utf-8'));
	});
	
	serviceDefines.forEach((service: IServiceConfig) => {
		const configFile = resolve(SERVICE_SAVE_FOLDER, `${service.serviceName}.conf`);
		
		console.log('creating new file: %s', configFile);
		
		const content = generateConfigFile(service);
		const newHash = md5(content);
		const oldHash = hash[configFile];
		
		delete hash[configFile];
		
		console.log('  hash check:\n\told= %s\n\tnew= %s', oldHash, newHash);
		
		if (oldHash === newHash) {
			console.log('\x1B[38;5;10mno-change\x1B[0m');
			return;
		} else {
			someChange++;
		}
		
		try {
			writeFileSync(configFile, content, 'utf-8');
			console.log('\x1B[38;5;10m >>> file created\x1B[0m');
		} catch (error) {
			someChange--;
			console.log('\x1B[38;5;9m write file error: %sx1B[0m', error.trace);
		}
	});
	
	Object.keys(hash).forEach((file) => {
		someChange++;
		try {
			unlinkSync(file);
			console.log('\x1B[38;5;10m >>> file removed\x1B[0m');
		} catch (e) {
			console.log('\x1B[38;5;9m remove file error: %sx1B[0m', e.trace);
		}
	});
	
	if (true) {
		console.log('try to restart nginx...');
		docker_exec(docker, 'nginx', ['/usr/sbin/nginx', '-t'])
			.then(([exit,out,err]) => {
				if (exit === 0) {
					console.log('\x1B[38;5;10m >>> nginx config reloaded. \x1B[0m')
				} else {
					console.log('\x1B[38;5;9m >>> nginx config has error. \x1B[0m')
				}
			}).catch((e) => {
			console.error('Docker Exec failed: ', e);
		});
	}
});

function showWhy() {
	
}

function md5(str) {
	return createHash('md5').update(str).digest().toString('hex');
}
