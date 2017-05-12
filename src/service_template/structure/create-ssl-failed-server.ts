import {createServerName} from "../structure/server_name";
import {createCertBotPass} from "./certbot";
import {IServiceConfig} from "../../handler";

export function createSSLFailedServer(service: IServiceConfig) {
	return `
### createHttpsServer - no ssl cert found...  at: ${service.certFile}
server {
	${createServerName(service)}
	
	listen 80;
	listen [::]:80;
	
	${createCertBotPass(service).replace(/\n/g, '\n\t')}
	
	location / {
		root /etc/nginx/html;
		return 500 /etc/nginx/html/nosslcert.html;
	}
}`;
}
