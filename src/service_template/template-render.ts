import {IServiceConfig} from "../handler";
import {createAllServer} from "./structure/all";
import {createHttpsServer} from "./structure/https-only";
import {createHttpDownServer, createHttpUpServer} from "./structure/http-only";
import {
	createUpstreamAll,
	createUpstreamDown,
	createUpstreamUp,
	getUpstreamNameDown,
	getUpstreamNameUp
} from "./structure/upstream";
import {whoAmI} from "../config";
import * as Debug from "debug";
import {normalizeService} from "./normalize";
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
	normalizeService(service);
	
	const upstream = createUpstreamAll(service);
	
	let bodyGoingDown;
	if (!isGateway(service) || service.SSL === false) {
		debugFn(`create http server: only HTTP (SSL=${service.SSL}).`);
		bodyGoingDown = createHttpDownServer(service);
	} else if (service.SSL === 'force') {
		debugFn('create http server: force HTTPS.');
		bodyGoingDown = createHttpsServer(service);
	} else if (service.SSL === true) {
		debugFn('create http server: both HTTP & HTTPS.');
		bodyGoingDown = createAllServer(service);
	} else {
		debugFn(`unknown SSL option: ${service.SSL}.`);
		throw new Error('SSL config error?!');
	}
	
	const bodyGoingUp = createHttpUpServer(service);
	
	return `###   GENERATED FILE ; DO NOT MODIFY   ###
${service.configFileGlobal.join('\n')}
${upstream.trim()}
${bodyGoingDown.trim()}
${bodyGoingUp.trim()}
`.replace(/\n\s*(\n\s*\n)/g, '$1')
}

export function isGateway(service: IServiceConfig) {
	return service.interfaceMachine.indexOf(whoAmI.id) !== -1;
}
