import {whoAmI} from "../../config";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigValue, ConfigValuesBundle} from "./nginx-config-structure";

// proxy_buffer_size 8k
// proxy_buffers 32 8k

export interface HeaderPassingOption {
	id: string;
	
	passHaders?: string[];
	setProxyHeaders?: {[key: string]: string};
	setReturnHeaders?: string[];
}
export class GlobalBodyConfigFile extends ConfigFile<{}> {
	protected debugInspect(): string {
		return `globalBody`;
	}
	
	get fileName() {
		return `global-body.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	buildContent() {
		const ret = new ConfigValuesBundle('global-body');
		
		ret.push(new ConfigValue('proxy_pass_request_headers', 'on'));
		ret.push(new ConfigValue('more_set_headers', `X-Proxy-Path: \${http_x_proxy_path}${whoAmI.id}`).wrap());
		ret.push(new ConfigValue('more_set_headers', `X-GWService: ${this.serviceName}`).wrap());
		ret.push(new ConfigValue('proxy_set_header', ['X-Proxy-Path', `"\${http_x_proxy_path}${whoAmI.id}->"`]));
		ret.push(`
if ( $http_x_proxy_path ~ /->gw\.aliyun\-elastic($|->)/ ) {
	# 508 Loop Detected (WebDAV)
	return 508 $http_x_proxy_path;
}`);
		
		ret.push(new ConfigValue('proxy_set_header', ['X-Https', '"$https$http_x_https"']));
		ret.push(new ConfigValue('proxy_set_header', ['X-Http2', '"$http2$http_x_http2"']));
		
		return ret;
	}
}

export class HeaderPassingConfigFile extends ConfigFile<HeaderPassingOption> {
	protected debugInspect(): string {
		return this.option.id;
	}
	
	get fileName() {
		return `public/${this.option.id}.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	buildContent() {
		const ret = new ConfigValuesBundle('custom-header');
		
		let {
			passHaders,
			setProxyHeaders,
			setReturnHeaders,
		} = this.option;
		
		if (setProxyHeaders) {
			Object.keys(setProxyHeaders).forEach((header: string) => {
				ret.push(new ConfigValue('proxy_set_header', [header, setProxyHeaders[header]]));
			});
		}
		if (passHaders) {
			for (let pass of passHaders) {
				ret.push(new ConfigValue('proxy_pass_header', pass));
			}
		}
		if (setReturnHeaders) {
			for (let header of setReturnHeaders) {
				ret.push(new ConfigValue('more_set_headers', header).wrap());
			}
		}
		return ret;
	}
}
