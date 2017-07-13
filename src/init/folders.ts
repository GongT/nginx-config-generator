import {ensureDirSync, pathExistsSync} from "fs-extra";
import {dirname, resolve} from "path";

export let CONFIGFILE_PATH;
if (process.env.RUN_IN_DOCKER) {
	if (!pathExistsSync('/data/config/nginx.conf')) {
		throw new Error(`can't start becouse nginx.conf file not found in /data/config/nginx. docker link error, or source nginx docker wrong.`);
	}
	CONFIGFILE_PATH = '/data/config';
} else {
	CONFIGFILE_PATH = resolve(__dirname, '../../debug_nginx_storage');
}

export const HTTP_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'html');
export const SERVICE_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'generated.d');
export const LOADER_FILE_PATH = resolve(CONFIGFILE_PATH, 'conf.d/generated.conf');

export function debugPath(str: string) {
	return str.replace(SERVICE_SAVE_FOLDER + '/', '').replace(CONFIGFILE_PATH, '');
}

export function init() {
	ensureDirSync(SERVICE_SAVE_FOLDER);
	ensureDirSync(dirname(LOADER_FILE_PATH));
}
