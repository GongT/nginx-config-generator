import {whoAmI} from "../../../who_am_i/index";
const extend = require('util')._extend;

export function template(data) {
	const opt = extend({}, data);
	const {SSL, serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig, globalRawConfig,} = opt;
	
	const head = `###   GENERATED FILE ; DO NOT MODIFY   ###
	
### globalRawConfig start
${globalRawConfig.map((cb) => {
		return cb(opt);
	}).join('\n')}
### globalRawConfig end

upstream ${serviceName}_services {
	${deployServers.map((ipConfig) => {
		return createUpstream(ipConfig, serviceName);
	}).join('\n\t').trim()}
}`;
	
	let body;
	if (!whoAmI.front || SSL === 'off' || SSL === false) {
		body = createHttpServer(opt);
	} else if (SSL === 'force') {
		body = createSSLJump(opt) + '\n\n' + createSSLServer(opt);
	} else if (SSL === 'on' || SSL === true) {
		body = createHttpServer(opt, true) + '\n\n' + createSSLServer(opt);
	} else {
		throw new Error('SSL config error?!');
	}
	
	return head + '\n\n' + body + '\n\n';
}
