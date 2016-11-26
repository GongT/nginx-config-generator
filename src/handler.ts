import * as Debug from "debug";
import {handleChange} from "./lib/docker";
import {getServiceMap} from "./lib/labels";
import {generateConfigFile} from "./service_template/template-render";
import {readdirSync, unlinkSync} from "fs";
import {SERVICE_SAVE_FOLDER} from "./boot";
import {resolve} from "path";
const debug = Debug('config:main');

export interface IServiceConfig {
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
		const item = JsonEnv.nginx_services[name];
		const obj: IServiceConfig = Object.assign({}, item);
		
		obj.existsCurrentServer = runningService.hasOwnProperty(name);
		obj.running = runningService[name];
		obj.serviceName = name;
		if (!obj.outerSubDomainName) {
			obj.outerSubDomainName = obj.serviceName + '.' + JsonEnv.baseDomainName;
		}
		
		return obj;
	});
	
	readdirSync(SERVICE_SAVE_FOLDER).forEach((f) => {
		if (f === '.' || f === '..') {
			return;
		}
		const file = resolve(SERVICE_SAVE_FOLDER, f);
		console.error('removing old file: %s', file);
		
		unlinkSync(file);
	});
	
	serviceDefines.forEach((service: IServiceConfig) => {
		const configFile = resolve(SERVICE_SAVE_FOLDER, `${service.serviceName}.conf`);
		console.log('creating new file: %s', configFile);
		
		const content = generateConfigFile(service);
		
	})
});
