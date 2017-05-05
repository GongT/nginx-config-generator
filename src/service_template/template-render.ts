import {IServiceConfig} from "../handler";
import {createReplacer} from "./renders/create-replacer";
import {createAllServer} from "./structure/all";
import {createHttpsServer} from "./structure/https-only";
import {createHttpServer} from "./structure/http-only";
import {createUpstreamDown, createUpstreamUp, getUpstreamNameDown, getUpstreamNameUp} from "./structure/upstream";
import {whoAmI} from "../config";
import * as Debug from "debug";
const debug = Debug('template');

export function debugFn(str: string) {
	debug(str.replace(/\n/g, '\n\t  '));
}

export function generateServerFile(service: IServiceConfig): string {
	const created = [];
	
	debug('server config: %s', service.serverName);
	Object.keys(service.servers).forEach((port) => {
		console.log('  port: %s', port);
		const def = service.servers[port];
		if (!def) {
			console.log('  Error: no config', service);
			throw new Error('server no config in service ' + service.serverName);
		}
		const proxyPort = def.port;
		console.log('  proxy to: %s', proxyPort);
		created.push(createUpstreamDown(service, proxyPort));
		created.push(createUpstreamUp(service, proxyPort));
		created.push(`## proxy ${port}
server {
	listen ${1 + parseInt(port)};
	proxy_pass ${getUpstreamNameDown(service, proxyPort)};
}
server {
	listen ${parseInt(port)};
	proxy_pass ${getUpstreamNameUp(service, proxyPort)};
}
`);
		
		return true;
	});
	
	if (created.length) {
		created.unshift('###   GENERATED FILE ; DO NOT MODIFY   ###\n');
		return created.join('\n');
	}
}

export function generateConfigFile(service: IServiceConfig): string {
	const configFileGlobal = ['###   GENERATED FILE ; DO NOT MODIFY   ###'];
	const configFileServer = ['### server bodies '];
	const configMainBody = [];
	
	configFileGlobal.push(createUpstreamDown(service));
	configFileGlobal.push(createUpstreamUp(service));
	
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
	
	let bodyGoingDown;
	if (!isGateway(service) || service.SSL === false) {
		debugFn(`create http server: only HTTP (SSL=${service.SSL}).`);
		bodyGoingDown = createHttpServer({service, configMainBody, configFileServer}, 'down');
	} else if (service.SSL === 'force') {
		debugFn('create http server: force HTTPS.');
		bodyGoingDown = createHttpsServer({service, configMainBody, configFileServer});
	} else if (service.SSL === true) {
		debugFn('create http server: both HTTP & HTTPS.');
		bodyGoingDown = createAllServer({service, configMainBody, configFileServer});
	} else {
		debugFn(`unknown SSL option: ${service.SSL}.`);
		throw new Error('SSL config error?!');
	}
	
	const bodyGoingUp = createHttpServer({service, configMainBody, configFileServer}, 'up');
	
	return `
${configFileGlobal.join('\n')}

${bodyGoingDown}

${bodyGoingUp}
`.replace(/\n\s*(\n\s*\n)/g, '$1')
}

export function isGateway(service: IServiceConfig) {
	return service.interfaceMachine.indexOf(whoAmI.id) !== -1;
}
