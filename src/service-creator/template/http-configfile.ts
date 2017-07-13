import {resolve} from "path";
import {directionName, RouteDirection} from "../config.define";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigSection, ConfigValue, ConfigValuesBundle} from "./nginx-config-structure";

export interface HttpTemplateOption {
	server_name: string[];
	Host: string;
	direction: string;
}

export abstract class HttpServerConfigFile<T> extends ConfigFile<T&HttpTemplateOption> {
	get listen() {
		const port = this.option.direction === directionName(RouteDirection.IN)
			? 81 : 80;
		return [`${port}`, `[::]:${port}`];
	}
	
	abstract get type(): string;
	
	protected debugInspect(): string {
		return this.option.server_name[0];
	}
	
	get fileName(): string {
		return `routes/${this.type}-${this.option.direction}.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	buildContent() {
		const httpConfig = new ConfigSection('server');
		
		httpConfig.push(ConfigValuesBundle.fromArray('listen', this.listen));
		httpConfig.push(new ConfigValue('server_name', this.option.server_name));
		httpConfig.push(new ConfigValue('default_type', 'text/html'));
		
		return httpConfig;
	}
}

export class HttpConfigFile extends HttpServerConfigFile<{}> {
	get type() {
		return 'http';
	}
}

export class FakeHttpsConfigFile extends HttpServerConfigFile<{}> {
	private sslConfig: ConfigValuesBundle;
	
	init() {
		const config = this.sslConfig = new ConfigValuesBundle('fake ssl');
		
		config.push(new ConfigValue('ssl_certificate', 'conf.d/ss-nginx.crt'));
		config.push(new ConfigValue('ssl_certificate_key', 'conf.d/ss-nginx.key'));
		
		config.push(new ConfigValue('ssl_protocols', ['TLSv1', 'TLSv1.1', 'TLSv1.2']));
	}
	
	get type() {
		return 'fake-https';
	}
	
	get listen() {
		return ['443 ssl', '[::]:443 ssl'];
	}
	
	buildContent() {
		const config = super.buildContent();
		
		config.push(this.sslConfig);
		
		return config;
	}
}

export class HttpsConfigFile extends HttpServerConfigFile<{certPath: string, allowInsecure: Boolean}> {
	private sslConfig: ConfigValuesBundle;
	
	get type() {
		return 'https';
	}
	
	init() {
		const config = this.sslConfig = new ConfigValuesBundle('ssl');
		
		config.push(new ConfigValue('ssl_certificate', resolve(this.option.certPath, 'fullchain.pem')));
		config.push(new ConfigValue('ssl_certificate_key', resolve(this.option.certPath, 'privkey.pem')));
		config.push(new ConfigValue('ssl_trusted_certificate', resolve(this.option.certPath, 'chain.pem')));
		
		config.push(new ConfigValue('ssl_stapling', true));
		config.push(new ConfigValue('ssl_stapling_verify', true));
		
		config.push(new ConfigValue('ssl_session_cache', 'shared:SSL:4m'));
		config.push(new ConfigValue('ssl_session_timeout', '1440m'));
		
		config.push(new ConfigValue('ssl_protocols', ['TLSv1', 'TLSv1.1', 'TLSv1.2']));
		config.push(new ConfigValue('ssl_prefer_server_ciphers', true));
		config.push(new ConfigValue('ssl_ciphers', 'ECDHE-ECDSA-AES128-GCM-SHA256 ECDHE-ECDSA-AES256-GCM-SHA384 ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA ECDHE-ECDSA-AES128-SHA256 ECDHE-ECDSA-AES256-SHA384 ECDHE-RSA-AES128-GCM-SHA256 ECDHE-RSA-AES256-GCM-SHA384 ECDHE-RSA-AES128-SHA ECDHE-RSA-AES128-SHA256 ECDHE-RSA-AES256-SHA384 DHE-RSA-AES128-GCM-SHA256 DHE-RSA-AES256-GCM-SHA384 DHE-RSA-AES128-SHA DHE-RSA-AES256-SHA DHE-RSA-AES128-SHA256 DHE-RSA-AES256-SHA256 EDH-RSA-DES-CBC3-SHA').wrap());
	}
	
	get listen() {
		const arr = ['443 ssl http2', '[::]:443 ssl http2'];
		if (this.option.allowInsecure) {
			return super.listen.concat(arr);
		} else {
			return arr;
		}
	}
	
	buildContent() {
		const config = super.buildContent();
		
		config.push(this.sslConfig);
		
		return config;
	}
}

export class HttpJumpConfigFile extends HttpServerConfigFile<{}> {
	get type() {
		return 'jump';
	}
	
	buildContent() {
		const config = super.buildContent();
		
		//language=TEXT
		config.push(`# force redirect
location / {
	more_set_headers "Location: https://${this.option.Host}$is_args$args";
    echo_status 503;
	echo "<h1>redirecting to https://${this.option.Host}$is_args$args</h1>";
	break;
}
`);
		
		return config;
	}
}
