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
import {normalizeService} from "./normalize";
import {createSSLFailedServer} from "./structure/create-ssl-failed-server";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";

const debug = createLogger(LEVEL.INFO, 'template');

export function debugFn(str: string, ...args: any[]) {
	debug(str.replace(/\n/g, '\n\t  '), ...args);
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
	
	let bodyGoingDown, sslError = false;
	if (!isGateway(service) || service.SSL === false) {
		debugFn(`create http server: only HTTP (SSL=${service.SSL}).`);
		bodyGoingDown = createHttpDownServer(service);
	} else if (service.SSL === 'force') {
		debugFn('create http server: force HTTPS.');
		bodyGoingDown = createHttpsServer(service);
		sslError = !bodyGoingDown;
	} else if (service.SSL === true) {
		debugFn('create http server: both HTTP & HTTPS.');
		bodyGoingDown = createAllServer(service);
		sslError = !bodyGoingDown;
	} else {
		debugFn(`unknown SSL option: ${service.SSL}.`);
		throw new Error('SSL config error?!');
	}
	
	let sslErrorBody;
	if (sslError) {
		sslErrorBody = createSSLFailedServer(service);
	}
	const bodyGoingUp = createHttpUpServer(service);
	
	return `###   GENERATED FILE ; DO NOT MODIFY   ###
${service.configFileGlobal.join('\n')}
${upstream.trim()}
${sslError? '# SSL ERROR - NO BODY' : bodyGoingDown.trim()}
${sslError? sslErrorBody : bodyGoingUp.trim()}
`.replace(/\n\s*(\n\s*\n)/g, '$1')
}

export function isGateway(service: IServiceConfig) {
	return service.interfaceMachine.indexOf(whoAmI.id) !== -1;
}
