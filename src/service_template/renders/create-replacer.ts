import {resolve} from "path";
import {readdirSync, readFileSync} from "fs";
import {getUpstreamNameDown} from "../structure/upstream";
import {debugFn} from "../template-render";
import {whoAmI} from "../../config";
import {IServiceConfig} from "../../handler";
import {CONFIG_PATH_REL} from "../../boot";

export interface PredefinedLocation {
	global?: (a: any, b: any) => string;
	server?: (a: any, b: any) => string;
	body?: (a: any, b: any) => string;
}

const predefinedLocationConfigs: {[type: string]: PredefinedLocation} = {};
const TEMPLATE_PATH = resolve(__dirname, '../../../template/pre_define_section');
readdirSync(TEMPLATE_PATH).forEach((fullFileName) => {
	if (/^\./.test(fullFileName)) {
		return;
	}
	
	const fileName = fullFileName.replace(/\.conf$/, '');
	
	let type, pos;
	
	if (/\.global$/.test(fileName)) {
		pos = 'global';
		type = fileName.replace(/\.global$/, '');
	} else if (/\.server$/.test(fileName)) {
		pos = 'server';
		type = fileName.replace(/\.server$/, '');
	} else if (/\.body/.test(fileName)) {
		pos = 'body';
		type = fileName.replace(/\.body/, '');
	} else {
		throw new Error('unknwon file: ' + resolve(TEMPLATE_PATH, fileName));
	}
	
	if (!predefinedLocationConfigs[type]) {
		predefinedLocationConfigs[type] = {};
	}
	predefinedLocationConfigs[type][pos] =
		compile(readFileSync(resolve(TEMPLATE_PATH, fullFileName), 'utf-8'));
});

function compile(text) {
	const str = text
		.replace(/\$\{([a-zA-Z0-9_])/g, '${b.$1')
		.replace(/\$\{\./g, '${a.');
	let fn;
	try {
		fn = eval('(a,b,$whoAmI) => { return `' + str + '` }');
	} catch (e) {
		console.error('=============\n`%s`\n=============', str);
		throw e;
	}
	
	return (a, b) => {
		try {
			return fn(a, Object.assign({escapeRegExp}, b), whoAmI);
		} catch (e) {
			console.error('=============\n`%s`\n=============', str);
			throw e;
		}
	}
}

export function createReplacer(service: IServiceConfig, configGlobal, configServer, configMainBody) {
	const isGlobalExists = {};
	return ({params, type}: {params?: any, type: string}) => {
		debugFn(`body section: [${type}]: ${JSON.stringify(params, null, 4)}`);
		
		if (!predefinedLocationConfigs.hasOwnProperty(type)) {
			throw new Error(`unknown section type: ${type}, service=${service.serverName}.`);
		}
		const predef: PredefinedLocation = predefinedLocationConfigs[type];
		
		const args = Object.assign({
			configMainBody: configMainBody,
			upstream: getUpstreamNameDown(service),
			configFolder: CONFIG_PATH_REL,
		}, params);
		
		try {
			if (predef.global && !isGlobalExists[type]) {
				isGlobalExists[type] = true;
				configGlobal.push(predef.global(service, {}));
			}
			if (predef.server) {
				configServer.push(predef.server(service, args));
			}
			if (predef.body) {
				configMainBody.push(predef.body(service, args));
			}
		} catch (e) {
			throw new Error(`parse location failed: ${type}, params=${args}, service=${service.serverName}.
${e.message}`);
		}
	}
}

export function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
