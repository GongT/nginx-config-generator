import {createBody} from "./body";
import {createSSL} from "./ssl";

export function createHttpsServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
### createHttpsServer
server {
	server_name ${service.serviceName};
	
	${createSSL(arg).replace(/\n/g, '\n\t')}
    
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
server {
	server_name ${service.serviceName};
	
	listen 80;
	listen [::]:80;
	
	# SSL jump
	return 301 https://${service.outerSubDomainName}$request_uri;
}
### createHttpsServer END
`;
}
