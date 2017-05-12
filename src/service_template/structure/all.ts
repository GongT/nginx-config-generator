import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createServerBody} from "./body";
import {createServerName} from "./server_name";
import {IServiceConfig} from "../../handler";
import {existsSync} from "fs";

export function createAllServer(service: IServiceConfig) {
	if (!existsSync(service.certFile)) {
		return null;
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
