///<reference path="../globals.d.ts"/>
import * as Debug from "debug";
import "source-map-support/register";
import "@gongt/jenv-data/global";
import {handleChange} from "./lib/docker";
import {existsSync, mkdirSync, writeFileSync} from "fs";
import {resolve, dirname} from "path";
import {getServiceMap} from "./lib/labels";
import {generateConfigFile} from "./generate-config-file";
const debug = Debug('config:main');

let CONFIGFILE_PATH;
if (process.env.RUN_IN_DOCKER) {
	if (!existsSync('/etc/nginx/nginx.conf')) {
		throw new Error(`can't start becouse nginx.conf file not found in /etc/nginx. docker link error, or source nginx docker wrong.`);
	}
	CONFIGFILE_PATH = '/etc/nginx';
} else {
	CONFIGFILE_PATH = resolve(__dirname, '../debug_nginx_storage');
}

const SERVICE_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'generated.d');
if (!existsSync(SERVICE_SAVE_FOLDER)) {
	mkdirSync(SERVICE_SAVE_FOLDER);
}

const LOADER_PATH = resolve(CONFIGFILE_PATH, 'conf.d/generated.conf');
if (!existsSync(dirname(LOADER_PATH))) {
	mkdirSync(dirname(LOADER_PATH));
}
writeFileSync(LOADER_PATH, `
upstream default-upstream {
    ### localhost <- myself
    server upstream weight=100 fail_timeout=1s;
}

include generated.d/*.conf;
`);

export interface MyNginxServicesConfig extends JsonEnvConfigModule.INginxServicesConfig {
	existsCurrentServer: boolean;
	serviceName: string;
}

handleChange((list) => {
	debug('docker status changed!');
	const runningService = getServiceMap(list);
	
	const serviceDefines: MyNginxServicesConfig[] = Object.keys(JsonEnv.nginx_services).map((name) => {
		const item = JsonEnv.nginx_services[name];
		const obj: MyNginxServicesConfig = Object.assign({}, item);
		
		obj.existsCurrentServer = runningService.hasOwnProperty(name);
		obj.serviceName = name;
		
		return obj;
	});
	
	serviceDefines.forEach((service) => {
		const content = generateConfigFile(service);
	})
});
