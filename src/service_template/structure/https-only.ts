import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createServerBody} from "./body";
import {createServerName} from "../structure/server_name";
import {IServiceConfig} from "../../handler";
import {existsSync} from "fs";
import {createSSLFailedServer} from "./create-ssl-failed-server";

export function createHttpsServer(service: IServiceConfig) {
	if (!existsSync(service.certFile)) {
		return createSSLFailedServer(service);
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
	
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(service).replace(/\n/g, '\n\t')}
	
	# SSL jump
	location / {
		return 301 https://${service.outerDomainName}$request_uri;
	}
}
### createHttpsServer END
`;
}
