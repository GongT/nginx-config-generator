import {debugFn} from "../template-render";
import {IServiceConfig} from "../../handler";
export function createCertBotPass(service: IServiceConfig) {
	debugFn('handle certbot request.');
	
	return `###createCertBot
location /.well-known {
	root /data/certbot-root/${service.serverName}/;
	autoindex on;
	break;
}
`;
}
