import {resolve} from "path";
import {IServiceConfig} from "../handler";
import {createReplacer, ReplaceParams} from "./renders/create-replacer";
import {getUpstreamNameDown, getUpstreamNameUp} from "./structure/upstream";

export function getCertFilePath(service: IServiceConfig) {
	return resolve('/data/letsencrypt/live', service.outerDomainName, 'privkey.pem');
}

export function normalizeService(service: IServiceConfig) {
	if (!service.configFileGlobal) {
		service.configFileGlobal = [];
	}
	const configFileGlobal = service.configFileGlobal;
	configFileGlobal.push('');
	
	if (!service.upStream) {
		service.upStream = {
			configMainBody: [],
			configFileServer: [],
		};
	}
	if (!service.downStream) {
		service.downStream = {
			configMainBody: [],
			configFileServer: [],
		};
	}
	
	const createServerSectionUp = createReplacer(service, configFileGlobal,
		service.upStream.configFileServer, service.upStream.configMainBody);
	const createServerSectionDown = createReplacer(service, configFileGlobal,
		service.downStream.configFileServer, service.downStream.configMainBody);
	
	function createServerSection(P: ReplaceParams) {
		createServerSectionUp({
			...P,
			upstream: getUpstreamNameUp(service),
		});
		createServerSectionDown({
			...P,
			upstream: getUpstreamNameDown(service),
		});
	}
	
	if (!service.locations) {
		service.locations = {};
	}
	
	Object.keys(service.locations).map((location) => {
		const conf = service.locations[location];
		if (typeof conf === 'string') {
			createServerSection({
				type: conf,
				params: {
					location,
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
					location,
				}),
			});
		}
	});
	
	if (service.SSL) {
		service.certFile = getCertFilePath(service);
	}
}
