import {IServiceConfig} from "../handler";
import {createReplacer} from "./renders/create-replacer";
import {createAllServer} from "./structure/all";
import {createHttpsServer} from "./structure/https-only";
import {createHttpServer} from "./structure/http-only";
import {createUpstream} from "./structure/upstream";
import {whoAmI} from "../config";

export function generateConfigFile(service: IServiceConfig) {
	const configFileGlobal = ['###   GENERATED FILE ; DO NOT MODIFY   ###'];
	const configFileServer = ['### server bodies '];
	const configMainBody = [];
	
	configFileGlobal.push(createUpstream(service));
	
	const createServerSection = createReplacer(service, configFileGlobal, configFileServer, configMainBody);
	
	if (!service.locations) {
		service.locations = {};
	}
	
	Object.keys(service.locations).map((location) => {
		createServerSection({
			type: service.locations[location],
			params: {
				location
			},
		});
	});
	
	let body;
	if (!isInterface(service) || service.SSL === false) {
		body = createHttpServer({service, configMainBody, configFileServer});
	} else if (service.SSL === 'force') {
		body = createHttpsServer({service, configMainBody, configFileServer});
	} else if (service.SSL === true) {
		body = createAllServer({service, configMainBody, configFileServer});
	} else {
		throw new Error('SSL config error?!');
	}
	
	return `
${configFileGlobal.join('\n')}

${body}
`.replace(/\n\s*(\n\s*\n)/g, '$1')
}

function isInterface(service: IServiceConfig) {
	return service.interfaceMachine.indexOf(whoAmI.id) !== -1;
}
