import {debugFn} from "../template-render";
export function createCertBotPass(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	debugFn('handle certbot request.');
	
	return `###createCertBot
location /.well-known {
	root /data/certbot/${service.serverName}/;
	autoindex on;
	break;
}
`;
}
