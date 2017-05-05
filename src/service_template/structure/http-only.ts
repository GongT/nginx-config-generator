import {createBody} from "./body";
import {createCertBotPass} from "./certbot";
import {createPublicServerSection} from "./public-server-sections";

export function createHttpServer(arg, direction: 'up'|'down') {
	const {service, configMainBody, configFileServer} = arg;
	
	return `
### createHttpServer
server {
	server_name ${service._alias.join(' ')};
	
	listen ${direction==='down'?81:80};
	listen [::]:${direction==='down'?81:80};
	
	${createPublicServerSection().replace(/\n/g, '\n\t')}
    
	${createCertBotPass(arg).replace(/\n/g, '\n\t')}
	
    ${createBody(arg, direction).replace(/\n/g, '\n\t')}
}
### createHttpServer END
`;
}
