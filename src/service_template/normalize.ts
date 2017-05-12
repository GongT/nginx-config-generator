import {IServiceConfig} from "../handler";
import {createReplacer} from "./renders/create-replacer";
import {resolve} from "path";

export function getCertFilePath(service: IServiceConfig) {
	return resolve('/data/letsencrypt/live', service.outerDomainName, 'privkey.pem');
}

export function normalizeService(service: IServiceConfig) {
	const configFileGlobal = service.configFileGlobal = [];
	const configFileServer = service.configFileServer = [];
	const configMainBody = service.configMainBody = [];
	
	configFileGlobal.push('');
	
	const createServerSection = createReplacer(service, configFileGlobal, configFileServer, configMainBody);
	
	if (!service.locations) {
		service.locations = {};
	}
	
	Object.keys(service.locations).map((location) => {
		const conf = service.locations[location];
		if (typeof conf === 'string') {
			createServerSection({
				type: conf,
				params: {
					location
				},
			});
		} else {
			if (!conf.options) {
				conf.options = {};
			}
			if (conf.location) {
				location = conf.location;
			}
			createServerSection({
				type: conf.type,
				params: Object.assign(conf, {
					location
				}),
			});
		}
	});
	
	if (service.SSL) {
		service.certFile = getCertFilePath(service);
	}
}
