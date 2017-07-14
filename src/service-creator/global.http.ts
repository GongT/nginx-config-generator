import {ConfigFile, KnownStore} from "./template/base.configfile";
import {ConfigSection, ConfigValue, ConfigValuesBundle} from "./template/nginx-config-structure";

const s = JSON.stringify;
function logContent(type: AccessLog) {
	switch (type) {
	case AccessLog.main:
		return s(`$http_x_proxy_path $request_method $host$request_uri, STATUS $status, $body_bytes_sent BYTES RESPONSE FROM $upstream_addr`);
	case AccessLog.tiny:
		return s(`$http_x_proxy_path $request_method $host$request_uri $status <- $upstream_addr`);
	case AccessLog.cache:
		return s(`$http_x_proxy_path $request_method $host$request_uri $status. CACHE: $upstream_cache_status <-$body_bytes_sent- $upstream_addr`);
	case AccessLog.robot:
		return s(`[$time_local] "$request" FROM "$http_referer" Status: $status
	"$http_user_agent"`);
	}
}

export enum AccessLog {
	none = 0,
	main,
	tiny,
	cache,
	robot,
}

export function accessLogName(level: AccessLog) {
	if (level === AccessLog.none) {
		return 'off';
	}
	return `ncg_${AccessLog[level]}`;
}

export class HttpConfigBuilder {
	constructor() {
	}
	
	configFile(): ConfigFile<any> {
		return new MainConfig({});
	}
}

export class MainConfig extends ConfigFile<{}> {
	protected debugInspect(): string {
		return this.serviceName;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.HTTP;
	}
	
	get fileName(): string {
		return 'generated.conf';
	}
	
	buildContent(): ConfigValuesBundle {
		const config = new ConfigValuesBundle('');
		
		config.push(mapper('log_abnormal', 'status', {
			'~^[123]': '0',
			'default': '1',
		}));
		config.push(mapper('connection_upgrade', 'http_upgrade', {
			'': 'close',
			'default': 'upgrade',
		}));
		
		for (let level of [AccessLog.main, AccessLog.tiny, AccessLog.cache, AccessLog.robot]) {
			config.push(new ConfigValue('log_format', [accessLogName(level), logContent(level)]));
		}
		
		config.push(new ConfigValue('access_log', ['/dev/stdout', accessLogName(AccessLog.main)]));
		config.push(new ConfigValue('error_log', ['/dev/stderr', 'warn']));
		
		config.push(new ConfigValue('include', 'generated.d/default.conf'));
		config.push(new ConfigValue('include', 'generated.d/services.conf'));
		
		return config;
	}
}

function mapper(varName: string, from: string, map: {[id: string]: string}) {
	const mapper = new ConfigSection(`map $${from} $${varName}`);
	Object.keys(map).forEach((k) => {
		mapper.push(new ConfigValue(k || "''", map[k]));
	});
	return mapper;
}
