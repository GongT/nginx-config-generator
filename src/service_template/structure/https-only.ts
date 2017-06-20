import {existsSync} from "fs";
import {IServiceConfig} from "../../handler";
import {createServerName} from "../structure/server_name";
import {createMainBody, createServerBody, section} from "./body";
import {createCertBotPass} from "./certbot";
import {createSSL} from "./ssl";

export function createHttpsServer(service: IServiceConfig) {
	if (!existsSync(service.certFile)) {
		return null;
	}
	
	return `
### createHttpsServer
server {
	${createServerName(service)}
	${section('ssl', createSSL(service))}
	${section('body', createServerBody(service, 'down'))}
	${section('main', createMainBody(service, 'down'))}
}
server { # http jump in https server
	${createServerName(service)}
	listen 81;
	listen [::]:81;
	${section('certbot', createCertBotPass(service))}
	${section('force jump to https', SSLJump(service))}
}
### createHttpsServer END
`;
}

export function SSLJump(service: IServiceConfig) {
	return `location / {
	return 301 https://${service.outerDomainName}$request_uri;
}`
}
