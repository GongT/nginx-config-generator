import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createMainBody, createServerBody, section} from "./body";
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
	listen 81;
	listen [::]:81;
	${section('certbot', createCertBotPass(service))}
	${section('ssl', createSSL(service))}
	${section('body', createServerBody(service))}
	${section('main', createMainBody(service, 'down'))}
}
#### createAllServer END
`;
}
