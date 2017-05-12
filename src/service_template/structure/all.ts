import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createServerBody} from "./body";
import {createServerName} from "./server_name";
import {IServiceConfig} from "../../handler";
import {existsSync} from "fs";
import {createSSLFailedServer} from "./create-ssl-failed-server";

export function createAllServer(service: IServiceConfig) {
	if (!existsSync(service.certFile)) {
		return createSSLFailedServer(service);
	}
	
	return `
#### createAllServer
server {
	${createServerName(service)}
	
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(service).replace(/^/mg, '\t')}
	
	${createSSL(service).replace(/^/mg, '\t')}
	
    ${createServerBody(service).replace(/^/mg, '\t')}
}
#### createAllServer END
`;
}
