import {createPassthru} from "./passthru";
import {debugFn} from "../template-render";
import {IServiceConfig} from "../../handler";
import {CONFIG_PATH_REL} from "../../boot";

export function createMainBody(service: IServiceConfig, direction: 'up'|'down') {
	debugFn('body: http');
	
	return `
## createMainBody
location / {
	${section('extra bodies', service.configMainBody)}
	${section('manual set body', service.extraBodyString)}
	${section('main bodies', createPassthru(service, direction))}
}
## createMainBody END
`;
}

export function section(name, s: string|string[]) { // todo define not here
	if (typeof s === 'string') {
		s = s.trim().split('\n');
	}
	
	if (Array.isArray(s) && s.length) {
		s = s.slice();
		s.unshift('# section: ' + name);
		return s.join('\n').replace(/^/gm, '\t').trim();
	} else {
		return '## no section: ' + name;
	}
}

export function createServerBody(service: IServiceConfig) {
	const ret = [
		'# -> ' + service.serverName
	];
	
	ret.push('## extraBodies');
	ret.push(service.configFileServer.join('\n').trim());
	ret.push('## createBody END');
	
	ret.push(`include ${CONFIG_PATH_REL}/puiblic-body.conf;`);
	
	return ret.join('\n');
}
