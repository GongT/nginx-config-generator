import {createBody} from "./body";
import {createCertBotPass} from "./certbot";

export function createHttpServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
### createHttpServer
server {
	server_name ${service.serverName};
	
	listen 80;
	listen [::]:80;
    
	${createCertBotPass(arg)}
	
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
### createHttpServer END
`;
}
