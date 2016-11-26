import {IServiceConfig} from "../handler";
import {resolve} from "path";
import {readdirSync, readFileSync} from "fs";
import {getAllNames} from "../lib/labels";
import {whoAmI} from "../../who_am_i/index";
import {sslJump} from "./renders/ssl-jump";
import {bodySamePart} from "./renders/body-same";
import {createUpstream} from "./renders/passthru.global";

interface PredefinedLocation {
	global?: (a: any, b: any) => string;
	server?: (a: any, b: any) => string;
}
const predefinedLocationConfigs: {[type: string]: PredefinedLocation} = {};
const TEMPLATE_PATH = resolve(__dirname, '../../template/pre_define_section');
readdirSync(TEMPLATE_PATH).forEach((fileName) => {
	if (/^\./.test(fileName)) {
		return;
	}
	
	fileName = fileName.replace(/\.conf$/, '');
	
	let type, pos;
	
	if (/\.global$/.test(fileName)) {
		pos = 'global';
		type = fileName.replace(/\.global$/, '');
	} else if (/\.server$/.test(fileName)) {
		pos = 'server';
		type = fileName.replace(/\.server$/, '');
	} else {
		throw new Error('unknwon file: ' + resolve(TEMPLATE_PATH, fileName));
	}
	
	if (!predefinedLocationConfigs[type]) {
		predefinedLocationConfigs[type] = {};
	}
	predefinedLocationConfigs[type][pos] =
		compile(readFileSync(resolve(TEMPLATE_PATH, fileName), 'utf-8'));
});

function compile(text) {
	const str = text
		.replace(/\$\{([^.])/g, '${b.$1')
		.replace(/\$\{\./g, '${a.');
	return eval('function (a,b) { return `' + str + '` }');
}

export function generateConfigFile(service: IServiceConfig) {
	const configFile = ['###   GENERATED FILE ; DO NOT MODIFY   ###'];
	const configFileBody = ['### extra bodies '];
	const createServerSection = createReplacer(service, configFile, configFileBody);
	
	if (!service.locations) {
		service.locations = {};
	}
	if (whoAmI.front || service.SSL !== false) { // ssl - require cert bot
		service.locations['/.well-known'] = 'certbot';
	}
	
	Object.keys(service.locations).map((location) => {
		createServerSection({
			type: service.locations[location],
			arguments: {
				location: location
			},
		});
	});
	
	const passthru = createServerSection({ arguments: {
		
	}, type: 'certbot'});
	
	if (!whoAmI.front || service.SSL === false) {
		bodySamePart(serverName, configFileBody.concat(withoutSSL(service)), sslJump(service));
		renderWithoutSSL(service, serverName, configFileBody, passthru);
	} else if (service.SSL === 'force') {
		bodySamePart(serverName, [], sslJump(service));
		renderWithoutSSL(service, serverName, [], sslJump(service));
		renderWithSSL(service, configFileBody, passthru);
	} else if (service.SSL === true) {
		renderWithoutSSL(service, serverName, configFileBody, passthru);
		renderWithSSL(service, configFileBody, passthru);
	} else {
		throw new Error('SSL config error?!');
	}
}

function createReplacer(service, configFile, configFileBody) {
	const serverName = service.running? getAllNames(service.running).join(' ') : service.outerSubDomainName;
	
	let upstream;
	if (service.existsCurrentServer) {
		configFile.push(createUpstream(service));
		upstream = `${service.serviceName}_services`;
	} else {
		upstream = 'default-global-upstream'
	}
	
	return ({arguments, type}) => {
		if (!predefinedLocationConfigs.hasOwnProperty(type)) {
			throw new Error(`unknown section type: ${type}, service=${service.serviceName}.`);
		}
		const predef: PredefinedLocation = predefinedLocationConfigs[type];
		
		const args = Object.assign({
			serverName,
			upstream,
			configFileBody,
		}, arguments);
		try {
			if (predef.global) {
				configFile.push(predef.global(service, args));
			}
			if (predef.server) {
				configFileBody.push(predef.server(service, args));
			}
		} catch (e) {
			throw new Error(`parse location failed: ${predefined}, location=${location}, service=${service.serviceName}.`)
		}
	}
}
