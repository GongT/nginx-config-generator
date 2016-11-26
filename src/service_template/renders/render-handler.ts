import {IServiceConfig} from "../../handler";
import {getAllNames} from "../../lib/labels";
import {whoAmI} from "../../../who_am_i/index";
import {RANDOM_UNIQUE_ID} from "../../boot";

export function renderHandler(service: IServiceConfig) {
	
	`###   GENERATED FILE ; DO NOT MODIFY   ###

### globalRawConfig start
${globalRawConfig.map((cb) => {
		return cb(service);
	}).join('\n')}
### globalRawConfig end

${createUpstream(service)}

${body}
`;
}

// https
function createSSLServer(service: IServiceConfig) {
	return `###createSSLServer
server {
	
	${createServiceBody(service)}
}`;
}

function createSSLJump(service: IServiceConfig) {
	return `###createSSLJump
server {
	listen 80;
	listen [::]:80;
	server_name ${service.outerSubDomainName};
	
	${createCertBot(service)}
	
	location / {
		return 301 https://${service.outerSubDomainName}$request_uri;
	}
}`;
}

