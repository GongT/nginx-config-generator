import {createBody} from "./body";
import {createSSL} from "./ssl";
import {createCertBotPass} from "./certbot";
import {createPublicServerSection} from "./public-server-sections";

export function createHttpsServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
### createHttpsServer
server {
	server_name ${service.alias.join(' ')};
	
	${createPublicServerSection().replace(/\n/g, '\n\t')}
	
	${createSSL(arg, true).replace(/\n/g, '\n\t')}
    
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
server { # http jump in https server
	server_name ${service.outerDomainName};
	
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(arg).replace(/\n/g, '\n\t')}
	
	# SSL jump
	location / {
		return 301 https://${service.outerDomainName}$request_uri;
	}
}
### createHttpsServer END
`;
}
