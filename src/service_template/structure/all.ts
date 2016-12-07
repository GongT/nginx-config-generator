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
	
	${createCertBotPass(arg).replace(/\n/g, '\n\t')}
	
	${createSSL(arg, false).replace(/\n/g, '\n\t')}
    
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
#### createAllServer END
`;
}
