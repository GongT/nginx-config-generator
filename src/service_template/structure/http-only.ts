import {createMainBody, createServerBody} from "./body";
import {createServerName} from "./server_name";
import {IServiceConfig} from "../../handler";

export function createHttpDownServer(service: IServiceConfig) {
	return `
### createHttpDownServer
server {
	${createServerName(service)}
	
	listen 81;
	listen [::]:81;
	
	${createServerBody(service).replace(/^/mg, '\t').trim()}
	
    ${createMainBody(service, 'down').replace(/^/mg, '\t').trim()}
}
### createHttpDownServer END
`;
}
export function createHttpUpServer(service: IServiceConfig) {
	return `
### createHttpUpServer
server {
	${createServerName(service)}
	
	listen 80;
	listen [::]:80;
	
	${createServerBody(service).replace(/^/mg, '\t').trim()}
	
    ${createMainBody(service, 'up').replace(/^/mg, '\t').trim()}
}
### createHttpUpServer END
`;
}
