import {HTTP_SAVE_FOLDER} from "../init/folders";
import {ConfigFile, KnownStore} from "./template/base.configfile";
import {ConfigSection, ConfigValue, ConfigValuesBundle} from "./template/nginx-config-structure";

export class DefaultServerBuilder {
	constructor() {
	}
	
	configFile(): ConfigFile<any> {
		return new DefaultServer({});
	}
}

export class DefaultServer extends ConfigFile<{}> {
	protected debugInspect(): string {
		return this.serviceName;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.LOADER;
	}
	
	get fileName(): string {
		return 'default.conf';
	}
	
	buildContent() {
		const config = new ConfigValuesBundle('defaults');
		
		const failServer = new ConfigSection('server');
		
		failServer.push(new ConfigValue('listen', ['18281', 'default_server']));
		failServer.push(new ConfigValue('server_name', '_'));
		failServer.push(new ConfigValue('root', HTTP_SAVE_FOLDER));
		
		const failRoot = new ConfigSection('location /');
		failRoot.push(new ConfigValue('echo', '<h1>This site is not working.</h1>').wrap());
		failRoot.push(new ConfigValue('return', '500'));
		failServer.push(failRoot);
		
		config.push(failServer);
		return config;
	}
}
