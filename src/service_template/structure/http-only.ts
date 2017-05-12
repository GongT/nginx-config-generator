import {createMainBody, createServerBody, section} from "./body";
import {createServerName} from "./server_name";
import {IServiceConfig} from "../../handler";

export function createHttpDownServer(service: IServiceConfig) {
	return `
### createHttpDownServer
server {
	${createServerName(service)}
	listen 81;
	listen [::]:81;
	${section('body', createServerBody(service))}
	${section('main', createMainBody(service, 'down'))}
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
	${section('body', createServerBody(service))}
	${section('main', createMainBody(service, 'up'))}
}
### createHttpUpServer END
`;
}
