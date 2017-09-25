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
		// httpConfig.push(new ConfigValue('more_set_headers', '"Strict-Transport-Security: max-age=31536000; includeSubDomains"',));
		
		return httpConfig;
	}
}

export class HttpConfigFile extends HttpServerConfigFile<{}> {
	get type() {
		return 'http';
	}
}

export class HttpWithJumpConfigFile extends HttpConfigFile {
	buildContent() {
		const config = super.buildContent();
		
		const $if = new ConfigSection('if ($redirect_https)');
		$if.push(new ConfigValue('return', ['302', '"https://$host$uri$is_args$args"']));
		$if.push(new ConfigValue('break'));
		
		const config_sec = new ConfigValuesBundle('force https');
		config_sec.push($if);
		
		config.push(config_sec);
		
		return config;
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

export interface HttpsConfig {
	certPath: string;
	withHttp: boolean;
}

export class HttpsConfigFile extends HttpServerConfigFile<HttpsConfig> {
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
		if (this.option.withHttp) {
			return super.listen.concat(arr);
		} else {
			return arr;
		}
	}
	
	buildContent() {
		const config = super.buildContent();
		
		config.push(new ConfigValue('more_set_headers', '"Strict-Transport-Security: max-age=31536000; includeSubDomains"',));
		config.push(this.sslConfig);
		
		return config;
	}
}
