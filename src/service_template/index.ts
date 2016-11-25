const fs = require('fs'),
	path = require('path'),
	extend = require('util')._extend;
const Script = require('vm').Script;

export function createAllServiceConfig() {
	if (!targetPath || !fs.existsSync(fs.realpathSync(targetPath))) {
		console.error('target path not exists.');
		process.exit(1);
	}
	console.log('target path: %s', targetPath);
	
	require('@gongt/jenv-data/global');
	
	const baseDomain = `${JsonEnv.baseDomainName}`;
	const template = require('./lib/template');
	const serverMap = require('../who_am_i/get_server_ip.json');

// const serviceGroup = JsonEnv.serviceGroup;
	
	const defineExtract = [];
	const globalfiles = {};
	Object.keys(JsonEnv.nginx_services).forEach((serviceName) => {
		const serviceDefine = JsonEnv.nginx_services[serviceName];
		
		const serverRawConfig = wrapConfigFileContentAsFunction(serviceDefine['server-config'], {}, {tabs: 1});
		
		const globalRawConfig = [];
		globalRawConfig.push(wrapConfigFileContentAsFunction(serviceDefine['http-config'], {}, {tabs: 0}));
		
		let extraLocationRawContent = [];
		
		if (serviceDefine.locations) {
			const extraLocations = serviceDefine.locations;
			extraLocationRawContent = Object.keys(extraLocations).map((location) => {
				let config = {}, preDefine = extraLocations[location];
				if (Array.isArray(preDefine)) {
					[preDefine, config] = preDefine;
				}
				config.location = location;
				
				const defPath = path.resolve(__dirname, '../../pre_define_location', preDefine);
				const rawConfig = readConfigRawFile(defPath, config, {tabs: 1});
				
				if (!globalfiles.hasOwnProperty(defPath)) {
					globalfiles[defPath] = true;
					const rawGlobalConfig = readConfigRawFile(defPath + '.global', config, {tabs: 0});
					globalRawConfig.push(rawGlobalConfig);
				}
				
				return rawConfig;
			});
		}
		
		const machines = serviceDefine.machines;
		const allDevelopMatchines = machines.map((serverId) => {
			const server = serverMap[serverId];
			if (!server) {
				throw new Error(`unknown deployTo server: ${serverId} in serverMap ${JSON.stringify(serverMap, null, 2)}`);
			}
			return server;
		});
		
		defineExtract.push({
			deployServers: allDevelopMatchines,
			SSL: serviceDefine.SSL,
			extraHeaders: serviceDefine.extraHeaders,
			serverRawConfig: extraLocationRawContent.concat([serverRawConfig]),
			globalRawConfig: globalRawConfig,
			serviceName: serviceName,
			domainName: `${serviceName}.${baseDomain}`,
		});
	});
	
	defineExtract.forEach((service) => {
		const nginxConfig = template(service);
		const confFileName = `${service.domainName}.conf`;
		
		const configFilePath = path.resolve(targetPath, confFileName);
		fs.writeFileSync(configFilePath, nginxConfig, 'utf-8');
		console.log('saved %s to file %s', service.serviceName, configFilePath);
	});
}
function readConfigFile(file, def) {
	if (fs.existsSync(file + '.json')) {
		return parseJson(file + '.json');
	} else if (fs.existsSync(file + '.js')) {
		return require(file + '.js');
	} else {
		return def;
	}
}
function readConfigRawFile(file, options, comOptions) {
	if (fs.existsSync(file + '.conf')) {
		const text = fs.readFileSync(file + '.conf', 'utf-8');
		
		if (!comOptions) {
			comOptions = {};
		}
		if (typeof comOptions.tabs !== 'number') {
			comOptions.tabs = 1;
		}
		
		return wrapConfigFileContentAsFunction(text, file, options || {}, comOptions);
	} else {
		return return_empty;
	}
}
function return_empty() {
	return '';
}
function wrapConfigFileContentAsFunction(text, fileName, options, comOptions = {}) {
	if (typeof text !== 'string') {
		return return_empty;
	}
	let script = text.trim();
	script = JSON.stringify(script);
	script = script.replace(/^"|"$/g, '');
	script = '`' + script + '`';
	
	const fn = new Script(script);
	return (context) => {
		const newContext = extend({}, context);
		newContext.options = options;
		const ret = fn.runInNewContext(newContext);
		return `## ${fileName} options=${JSON.stringify(options)} comOptions=${JSON.stringify(comOptions)}
${prepend_tabs_each_line(ret, comOptions.tabs)}`;
	};
}

function prepend_tabs_each_line(str, count) {
	const tabs = (new Array(count || 0)).fill('\t').join('');
	return `${tabs}${str.replace(/\n/g, '\n' + tabs)}`;
}
