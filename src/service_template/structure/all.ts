import {createSSL} from "./ssl";
import {createBody} from "./body";
import {createCertBotPass} from "./certbot";
import {createPublicServerSection} from "./public-server-sections";

export function createAllServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	return `
#### createAllServer
server {
	server_name ${service._alias.join(' ')};
	
	listen 81;
	listen [::]:81;
	
	${createPublicServerSection().replace(/\n/g, '\n\t')}
	
	${createCertBotPass(arg).replace(/\n/g, '\n\t')}
	
	${createSSL(arg, false).replace(/\n/g, '\n\t')}
    
    ${createBody(arg, 'down').replace(/\n/g, '\n\t')}
}
#### createAllServer END
`;
}
