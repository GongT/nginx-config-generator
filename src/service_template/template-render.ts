import {IServiceConfig} from "../handler";
import {createReplacer} from "./renders/create-replacer";
import {createAllServer} from "./structure/all";
import {createHttpsServer} from "./structure/https-only";
import {createHttpServer} from "./structure/http-only";
import {createUpstream, getUpstreamName} from "./structure/upstream";
import {whoAmI} from "../config";
import * as Debug from "debug";
const debug = Debug('template');

export function debugFn(str: string) {
	debug(str.replace(/\n/g, '\n\t  '));
}

export function generateServerFile(service: IServiceConfig): string {
	const created = ['###   GENERATED FILE ; DO NOT MODIFY   ###'];
	
	const notEmpty = Object.keys(service.servers).some((port) => {
		const def = service.servers[port];
		if (!def) {
			return false;
		}
		const proxyPort = def.port;
		
		created.push(createUpstream(service, proxyPort));
		created.push(`## proxy ${port}
server {
	listen ${port} ;
	proxy_pass ${getUpstreamName(service, proxyPort)};
}
`);
		
		return true;
	});
	
	if (notEmpty) {
		return created.join('\n');
	}
}

export function generateConfigFile(service: IServiceConfig): string {
	const configFileGlobal = ['###   GENERATED FILE ; DO NOT MODIFY   ###'];
	const configFileServer = ['### server bodies '];
	const configMainBody = [];
	
	configFileGlobal.push(createUpstream(service));
	
	const createServerSection = createReplacer(service, configFileGlobal, configFileServer, configMainBody);
	
	if (!service.locations) {
		service.locations = {};
	}
	
	Object.keys(service.locations).map((location) => {
		const conf = service.locations[location];
		if (typeof conf === 'string') {
			createServerSection({
				type: conf,
				params: {
					location
				},
			});
		} else {
			if (!conf.options) {
				conf.options = {};
			}
			if (conf.location) {
				location = conf.location;
			}
			createServerSection({
				type: conf.type,
				params: Object.assign(conf, {
					location
				}),
			});
		}
	});
	
	let body;
	if (!isInterface(service) || service.SSL === false) {
		debugFn(`create http server: only HTTP (SSL=${service.SSL}).`);
		body = createHttpServer({service, configMainBody, configFileServer});
	} else if (service.SSL === 'force') {
		debugFn('create http server: force HTTPS.');
		body = createHttpsServer({service, configMainBody, configFileServer});
	} else if (service.SSL === true) {
		debugFn('create http server: both HTTP & HTTPS.');
		body = createAllServer({service, configMainBody, configFileServer});
	} else {
		debugFn(`unknown SSL option: ${service.SSL}.`);
		throw new Error('SSL config error?!');
	}
	
	return `
${configFileGlobal.join('\n')}

${body}
`.replace(/\n\s*(\n\s*\n)/g, '$1')
}

function isInterface(service: IServiceConfig) {
	return whoAmI['front'];
}
