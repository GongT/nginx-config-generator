import {createBody} from "./body";

export function createHttpServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
### createHttpServer
server {
	server_name ${service.serverName};
	
	listen 80;
	listen [::]:80;
    
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
### createHttpServer END
`;
}
