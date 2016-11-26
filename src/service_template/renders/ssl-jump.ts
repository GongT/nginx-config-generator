import {IServiceConfig} from "../../handler";
export function sslJump(service: IServiceConfig) {
	return `
# SSL jump
return 301 https://${service.outerSubDomainName}$request_uri;
`
}
