///<reference path="./globals.d.ts"/>
import "source-map-support/register";
import "@gongt/jenv-data/global";
import {existsSync} from "fs";
import {resolve} from "path";
import {init as ensureFolders} from "./init/folders";
import {init as createReadConfig} from "./init/error-server";
import {init as createUpstreamAlertHtml} from "./init/upstream";
import {init as createCertAlertHtml} from "./init/nossl";
import {init as createPublicConfig} from "./init/public-config";

export let CONFIGFILE_PATH;
if (process.env.RUN_IN_DOCKER) {
	if (!existsSync('/data/config/nginx.conf')) {
		throw new Error(`can't start becouse nginx.conf file not found in /data/config/nginx. docker link error, or source nginx docker wrong.`);
	}
	CONFIGFILE_PATH = '/data/config';
} else {
	CONFIGFILE_PATH = resolve(__dirname, '../debug_nginx_storage');
}

export const HTTP_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'html');
export const SERVICE_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'generated.d');
export const CONFIG_PATH_REL = 'generated.d/sub-configs';
export const EXTRA_CONFIG_SAVE_FOLDER = resolve(CONFIGFILE_PATH, CONFIG_PATH_REL);
export const SERVER_SAVE_FOLDER = resolve(CONFIGFILE_PATH, 'servers.d');
export const LOADER_PATH = resolve(CONFIGFILE_PATH, 'conf.d/generated.conf');

ensureFolders();
createReadConfig();
createPublicConfig();
createUpstreamAlertHtml();
createCertAlertHtml();

require('./handler');
