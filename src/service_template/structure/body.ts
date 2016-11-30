import {createPassthru} from "./passthru";
export function createBody(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	return `
## createBody
location / {
	## extra bodies
	${configMainBody.join('\n').replace(/\n/g, '\n\t')}
	
	## main bodies
	${createPassthru(arg).replace(/\n/g, '\n\t')}
}
## extraBodies
${configFileServer.join('\n').replace(/\n/g, '\n')}
## createBody END
`;
}
