import {createSSL} from "./ssl";
import {createBody} from "./body";
import {createCertBotPass} from "./certbot";

export function createAllServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
#### createAllServer
server {
	server_name ${service.serverName};
	
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(arg)}
	
	${createSSL(arg)}
    
    ${createBody(arg)}
}
#### createAllServer END
`;
}
