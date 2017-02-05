import {getUpstreamName} from "./upstream";

export function createPassthru(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	const upstream = getUpstreamName(service);
	
	return `
## upstream config
proxy_set_header Host ${service.outerDomainName};
proxy_next_upstream error timeout invalid_header non_idempotent http_503;

## pass to upstream (define above)
proxy_pass http://${upstream};
`;
}
