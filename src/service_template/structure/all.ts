import {createSSL} from "./ssl";
import {createBody} from "./body";

export function createAllServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
#### createAllServer
server {
	server_name ${service.serviceName};
	
	listen 80;
	listen [::]:80;
	
	${createSSL(arg)}
    
    ${createBody(arg)}
}
#### createAllServer END
`;
}
