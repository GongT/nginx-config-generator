///<reference path="../globals.d.ts"/>
import "source-map-support/register";
import "@gongt/jenv-data/global";
import {existsSync, mkdirSync, writeFileSync} from "fs";
import {resolve, dirname} from "path";

export let CONFIGFILE_PATH;
if (process.env.RUN_IN_DOCKER) {
	if (!existsSync('/etc/nginx/nginx.conf')) {
		throw new Error(`can't start becouse nginx.conf file not found in /etc/nginx. docker link error, or source nginx docker wrong.`);
	}
	CONFIGFILE_PATH = '/etc/nginx';
} else {
	CONFIGFILE_PATH = resolve(__dirname, '../debug_nginx_storage');
}

export const SERVICE_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'generated.d');
if (!existsSync(SERVICE_SAVE_FOLDER)) {
	mkdirSync(SERVICE_SAVE_FOLDER);
}

export const LOADER_PATH = resolve(CONFIGFILE_PATH, 'conf.d/generated.conf');
if (!existsSync(dirname(LOADER_PATH))) {
	mkdirSync(dirname(LOADER_PATH));
}
writeFileSync(LOADER_PATH, `
upstream default-global-upstream {
    server upstream weight=100 fail_timeout=1s;
}

map $http_x_is_internal_request $is_loop_request {
    default "0";
    Value1  "1";
    Value2  "1";
    Value3  "1";
};

include generated.d/*.conf;
`);

require('./handler');
