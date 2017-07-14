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

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export class GlobalBodyConfigFile extends ConfigFile<{Host: string;}> {
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
		ret.push(new ConfigValue('proxy_set_header', ['X-Proxy-Path', `"\${http_x_proxy_path}${whoAmI.id}->"`]));
		//language=TEXT
		ret.push(`
header_filter_by_lua_block {
	if not ngx.header["X-Proxy-Path"] then
		local reqRoutePath = ngx.req.get_headers()["X-Proxy-Path"];
		if reqRoutePath then
			ngx.header["X-Proxy-Path"] = reqRoutePath .. "${whoAmI.id}"
		else
			ngx.header["X-Proxy-Path"] = "${whoAmI.id}"
		end
	end
}
access_by_lua_block {
	local reqRoutePath = ngx.req.get_headers()["X-Proxy-Path"];
	if reqRoutePath and string.find(reqRoutePath, "${whoAmI.id}") then
		ngx.say("<h1>Server Error: Loop Detected</h1><p>" .. reqRoutePath .. "</p>")
		ngx.exit(ngx.HTTP_SERVICE_UNAVAILABLE)
	end
}
`);
		
		ret.push(new ConfigValue('proxy_set_header', ['X-Https', '"$https$http_x_https"']));
		ret.push(new ConfigValue('proxy_set_header', ['X-Http2', '"$http2$http_x_http2"']));
		
		ret.push(new ConfigValue('proxy_set_header', ['Host', this.option.Host]));
		
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
