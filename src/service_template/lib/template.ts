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

// support
function createSSLConfig(opt) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	
	return `###createSSLConfig
	ssl_certificate /etc/letsencrypt/live/${domainName}/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/${domainName}/privkey.pem;
	include /etc/letsencrypt/options-ssl-nginx.conf;
	ssl_trusted_certificate /etc/letsencrypt/live/${domainName}/chain.pem;
	ssl_stapling on;
	ssl_stapling_verify on;`
}

function createServiceBody(opt) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	
	return `### serverRawConfig start
	${serverRawConfig.map((cb) => {
		return cb(opt);
	}).join('\n\t').trim()}
	### serverRawConfig end
	
	###createServiceBody
	location / {
		### extra head start
		${extraHeaders.join(';\n\t\t')}
		### extra head end
		
		### upstream config
		proxy_http_version 1.1;
		proxy_set_header Host ${domainName};
		# health_check;
		proxy_buffer_size 128k;
		proxy_buffers 32 32k;
		proxy_busy_buffers_size 128k;
		proxy_next_upstream error timeout invalid_header non_idempotent http_503;
		
		### pass to upstream (define above)
		proxy_pass http://${serviceName}_services;
	}`
}

// https
function createSSLServer(opt) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	
	return `###createSSLServer
server {
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name ${domainName};
	
	${createSSLConfig(opt)}

	${createServiceBody(opt)}
}`;
}

// none https
function createHttpServer(opt, certbot: boolean = false) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	
	return `###createHttpServer
server {
	listen 80;
	listen [::]:80;
	server_name ${domainName};
	
	${certbot? createCertBot(opt) : ''}
	
	${createServiceBody(opt)}
}`;
}
function createCertBot(opt) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	return `###createCertBot
	location /.well-known {
		root /certbot/${domainName}/;
		autoindex on;
	}`;
}

function createSSLJump(opt) {
	const {serverGroup, domainName, serviceName, extraHeaders, deployServers, extraLocations, serverRawConfig,} = opt;
	
	return `###createSSLJump
server {
	listen 80;
	listen [::]:80;
	server_name ${domainName};
	
	${createCertBot(opt)}
	
	location / {
		return 301 https://${domainName}$request_uri;
	}
}`;
}

function createUpstream(config, hostname) {
	return `### ${config.name} <- myself
server ${hostname} weight=100 fail_timeout=5s;
`;
}
