import {createBody} from "./body";
import {createCertBotPass} from "./certbot";
import {getAllNames} from "../../lib/labels";
import {createPublicServerSection} from "./public-server-sections";

export function createHttpServer(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	return `
### createHttpServer
server {
	server_name ${service._alias.join(' ')};
	
	listen 80;
	listen [::]:80;
	
	${createPublicServerSection().replace(/\n/g, '\n\t')}
    
	${createCertBotPass(arg).replace(/\n/g, '\n\t')}
	
    ${createBody(arg).replace(/\n/g, '\n\t')}
}
### createHttpServer END
`;
}
