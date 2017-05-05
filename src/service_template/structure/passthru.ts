import {getUpstreamNameDown, getUpstreamNameUp} from "./upstream";

export function createPassthru(arg, direction: 'up'|'down') {
	const {service, configMainBody, configFileServer} = arg;
	
	const upstream = direction === 'down'
		? getUpstreamNameDown(service)
		: getUpstreamNameUp(service);
	
	return `
## upstream config
proxy_set_header Host ${service.outerDomainName};
proxy_next_upstream error timeout invalid_header non_idempotent http_503;

## pass to upstream (define above)
proxy_pass http://${upstream};
`;
}
