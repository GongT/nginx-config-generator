import {createPassthru} from "./passthru";
import {debugFn} from "../template-render";
export function createBody(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	debugFn('body: http');
	
	return `
## createBody
location / {
	## extra bodies
	${configMainBody.join('\n').replace(/\n/g, '\n\t')}
	
	## manual set body
	${(service.extraBodyString || '').replace(/^/g, '\t')}
	
	## main bodies
	${createPassthru(arg).replace(/\n/g, '\n\t')}
}
## extraBodies
${configFileServer.join('\n').replace(/\n/g, '\n')}
## createBody END
`;
}
