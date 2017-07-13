import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigValue, ConfigValuesBundle} from "./nginx-config-structure";

// proxy_buffer_size 8k
// proxy_buffers 32 8k

export interface ProxyOption {
	id: string;
	
	upstream?: {
		url: string;
		stream?: boolean;
		tryNext?: (number|string)[];
		Host: string,
		ignoreClientAbourt?: boolean;
	};
	cache?: {
		zone: string;
		key: string|string[];
		methods?: string[];
		bypass?: string[];
		lock?: boolean;
		minUses?: number;
		revalidate?: boolean;
		useStale?: (number|string)[];
		cacheDays?: number|{
			[status: number]: string;
		}
	}
}

export class ProxyConfigFile extends ConfigFile<ProxyOption> {
	protected debugInspect(): string {
		let debug = [];
		if (this.option.upstream) {
			debug.push('upstream=' + this.option.upstream.url);
		}
		if (this.option.cache) {
			debug.push('cache=' + this.option.cache.zone);
		}
		return debug.join('; ');
	}
	
	get fileName() {
		return `locations/${this.option.id}.${this.directionName}.proxy.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	protected createCache() {
		const proxy_cache = new ConfigValuesBundle('proxy-cache');
		let {
			key, methods, zone, bypass, lock, minUses,
			revalidate, useStale, cacheDays,
		} = this.option.cache;
		
		proxy_cache.push(new ConfigValue('proxy_cache', zone));
		
		let keyStr;
		if (Array.isArray(key)) {
			keyStr = key.join('');
		} else {
			keyStr = key;
		}
		keyStr = this.serviceName + keyStr;
		proxy_cache.push(new ConfigValue('proxy_cache_key', keyStr).wrap());
		if (methods) {
			proxy_cache.push(new ConfigValue('proxy_cache_methods', methods));
		}
		if (!bypass) {
			bypass = [];
		}
		proxy_cache.push(new ConfigValue('proxy_cache_bypass', ['$arg_nocache', '$http_cookie', ...bypass]));
		if (lock) {
			proxy_cache.push(new ConfigValue('proxy_cache_lock', lock));
		}
		const mu = minUses? minUses.toString() : '5';
		proxy_cache.push(new ConfigValue('proxy_cache_min_uses', mu));
		if (revalidate) {
			proxy_cache.push(new ConfigValue('proxy_cache_revalidate', revalidate));
		}
		if (useStale) {
			useStale = useStale.map((v) => {
				return typeof v === 'number'? `http_${v}` : v;
			});
			proxy_cache.push(new ConfigValue('proxy_cache_use_stale', <string[]>useStale));
		}
		if (cacheDays) {
			if (typeof cacheDays === 'number') {
				proxy_cache.push(new ConfigValue('proxy_cache_valid', ['200', '404', cacheDays + 'd']));
				proxy_cache.push(new ConfigValue('proxy_cache_valid', ['any', '10s']));
			} else {
				Object.keys(cacheDays).forEach((status: number|string) => {
					const time = cacheDays[status];
					if (status === 0) {
						status = 'any';
					}
					proxy_cache.push(new ConfigValue('proxy_cache_valid', [status, time]));
				});
			}
		}
		return proxy_cache;
	}
	
	protected createPass() {
		const proxy_pass = new ConfigValuesBundle('proxy-pass');
		const {
			url, stream, tryNext, ignoreClientAbourt, Host,
		} = this.option.upstream;
		
		proxy_pass.push(new ConfigValue('proxy_http_version', '1.1'));
		proxy_pass.push(new ConfigValue('proxy_connect_timeout', '2s'));
		proxy_pass.push(new ConfigValue('proxy_next_upstream_tries', '3'));
		proxy_pass.push(new ConfigValue('proxy_buffer_size', '8k'));
		proxy_pass.push(new ConfigValue('proxy_buffers', ['32', '8k']));
		proxy_pass.push(new ConfigValue('proxy_busy_buffers_size', '64k'));
		if (stream) {
			proxy_pass.push(new ConfigValue('proxy_read_timeout', '1h'));
			proxy_pass.push(new ConfigValue('proxy_send_timeout', '1h'));
			
			proxy_pass.push(new ConfigValue('add_header', ['Cache-Control', '"no-store"']));
			proxy_pass.push(new ConfigValue('etag', 'off'));
			
			proxy_pass.push(new ConfigValue('proxy_set_header', ['Upgrade', '$http_upgrade']));
			proxy_pass.push(new ConfigValue('proxy_set_header', ['Connection', '$connection_upgrade']));
		} else {
			proxy_pass.push(new ConfigValue('proxy_set_header', ['Connection', '""']));
			proxy_pass.push(new ConfigValue('proxy_read_timeout', '12s'));
			proxy_pass.push(new ConfigValue('proxy_send_timeout', '6s'));
		}
		proxy_pass.push(new ConfigValue('proxy_set_header', ['Host', Host]));
		const n = tryNext || ['error', 'timeout', 500, 502, 'non_idempotent'];
		const tn = [];
		for (let v of n) {
			tn.push(typeof v === 'number'? `http_${v}` : v);
		}
		proxy_pass.push(new ConfigValue('proxy_next_upstream', tn));
		
		if (ignoreClientAbourt) {
			proxy_pass.push(new ConfigValue('proxy_ignore_client_abort', ignoreClientAbourt));
		}
		
		proxy_pass.push(new ConfigValue('proxy_pass', url));
		return proxy_pass;
	}
	
	buildContent() {
		const {cache, upstream} = this.option;
		
		const proxy = new ConfigValuesBundle('');
		
		if (cache) {
			if (upstream && upstream.stream) {
				throw new Error('unable to create cache on stream proxy.');
			}
			proxy.push(this.createCache());
		}
		if (upstream) {
			proxy.push(this.createPass());
			proxy.push(new ConfigValue('break', ''));
		}
		return proxy;
	}
}
