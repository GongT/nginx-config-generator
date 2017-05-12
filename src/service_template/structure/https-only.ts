import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createServerBody} from "./body";
import {createServerName} from "../structure/server_name";
import {IServiceConfig} from "../../handler";
import {existsSync} from "fs";

export function createHttpsServer(service: IServiceConfig) {
	const certExists = existsSync(service.certFile);
	const publicFetcher = `
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(service).replace(/\n/g, '\n\t')}`
	
	if (!certExists) {
		return `
### createHttpsServer - no ssl cert found...  at: ${service.certFile}
server {
	${createServerName(service)}
	${publicFetcher}
	
	location / {
		root /etc/nginx/html;
		return 500 /etc/nginx/html/nosslcert.html;
	}
}`
	}
	
	return `
### createHttpsServer
server {
	${createServerName(service)}
	
	${createSSL(service).replace(/\n/mg, '\n\t')}
	
    ${createServerBody(service).replace(/^/mg, '\t')}
}
server { # http jump in https server
	${createServerName(service)}
	${publicFetcher}
	
	# SSL jump
	location / {
		return 301 https://${service.outerDomainName}$request_uri;
	}
}
### createHttpsServer END
`;
}
