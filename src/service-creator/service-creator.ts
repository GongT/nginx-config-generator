import {JsonEnv} from "@gongt/jenv-data";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {pathExistsSync} from "fs-extra";
import {resolve} from "path";
import {inspect} from "util";
import {dockerNames} from "../init/docker-names";
import {deepFreeze} from "../lib/deep-freeze";
import {FileTracker} from "../lib/file-change-tracker";
import {isGatewayOfService, isGatewayServer, wantToRun} from "../lib/server-detect";
import {getServiceName} from "../lib/service-name";
import {HttpServerBuilder} from "./builder/http-server-builder";
import {StreamServerBuilder} from "./builder/stream-server-builder";
import {IServiceConfig, IServiceStatus} from "./config.define";
import {ServiceLoaderBuilder} from "./global.service";
import {ConfigFile} from "./template/base.configfile";
import IServersConfig = JsonEnvConfigModule.IServersConfig;
import I1883Config = JsonEnvConfigModule.I1883Config;
import extend = require('extend');

const debug_config = createLogger(LEVEL.INFO, 'config');

const debug_sill = createLogger(LEVEL.SILLY, 'generate');
const debug_normal = createLogger(LEVEL.INFO, 'generate');
const debug_notice = createLogger(LEVEL.NOTICE, 'generate');

export class ServiceCreator {
	protected serviceConfig: IServiceConfig;
	protected status: IServiceStatus = <any>{};
	
	protected stream: StreamServerBuilder;
	// protected stream_collector: GlobalFileCollector;
	
	protected http: HttpServerBuilder;
	protected collector: ServiceLoaderBuilder;
	
	protected files: ConfigFile<any>[];
	protected filesValid: string = null;
	
	constructor(public readonly serviceName: string) {
		this.serviceConfig = JsonEnv.services[serviceName];
		if (!this.serviceConfig) {
			throw new Error('unknown service: ' + serviceName);
		}
		
		this.serviceConfig = extend(true, {
			serviceName: getServiceName(serviceName),
			machines: [],
			interfaceMachine: [],
			alias: [],
			locations: {},
			servers: {},
		}, this.serviceConfig);
		
		this.checkConfig(this.serviceConfig);
		
		deepFreeze(this.serviceConfig);
		debug_config('%s:\n-----------\n%s\n-----------', serviceName, inspect(this.serviceConfig, false, Infinity, true));
		
		this.collector = new ServiceLoaderBuilder({service: this.serviceConfig}, {});
		
		this.http = new HttpServerBuilder({service: this.serviceConfig}, {});
		
		const {servers} = this.serviceConfig;
		if (Object.keys(servers).length) {
			this.stream = new StreamServerBuilder({service: this.serviceConfig}, {
				servers: Object.values(servers),
			});
		}
	}
	
	get hasStreamServer() {
		return !!this.stream;
	}
	
	private checkConfig(config: IServiceConfig) {
		const {
			serviceName, outerSubDomainName,
			machines, interfaceMachine,
		} = config;
		
		if (!outerSubDomainName) {
			config.outerSubDomainName = serviceName;
		}
		
		config.outerDomainName = config.outerSubDomainName + '.' + JsonEnv.baseDomainName;
		
		if (!config.alias) {
			config.alias = [];
		}
		config.alias.unshift(config.outerDomainName, serviceName);
		
		if (machines.length === 0) {
			throw new TypeError(`no machine in service "${serviceName}"`);
		}
		if (interfaceMachine.length === 0) {
			throw new TypeError(`no machine in service "${serviceName}"`);
		}
		
		config.isGateway = isGatewayOfService(config);
		config.wantServiceToRun = wantToRun(config);
		
		if (config.isGateway && !isGatewayServer()) {
			throw new Error(`want me is gateway of service "${serviceName}", but not.`);
		}
		
		if (!(config.SSL === true || config.SSL === false || config.SSL === 'force')) {
			throw new TypeError(`invalid option \`SSL' value in service "${serviceName}"`);
		}
		
		if (!config.isGateway) {
			config.SSL = false;
		}
		
		if (config.SSL) {
			config.SSLJump = config.SSL === 'force';
			config.SSLPath = `/data/letsencrypt/live/${config.outerDomainName}`;
		}
		
		if (!config.locations) {
			config.locations = {};
		}
		const locations = config.locations;
		Object.keys(locations).forEach((location) => {
			if (typeof locations[location] === 'string') {
				locations[location] = <any>{
					type: locations[location],
				};
			}
			if (!locations[location].location) {
				locations[location].location = location;
			}
		});
		if (!locations['/']) {
			locations['/'] = {
				type: 'root',
				location: '/',
			}
		}
		
		if (!config.servers) {
			config.servers = {};
		}
		const servers = config.servers;
		Object.keys(servers).forEach((name) => {
			if (typeof servers[name] === 'string' || typeof servers[name] === 'number') {
				servers[name] = {
					name,
					port: parseInt(<any>servers[name]),
				}
			}
		});
	}
	
	private publicStatus() {
		if (this.serviceConfig.SSL) {
			this.status.SSLExists = ['fullchain.pem', 'privkey.pem', 'chain.pem'].every((file) => {
				return pathExistsSync(resolve(this.serviceConfig.SSLPath, file));
			});
		} else {
			this.status.SSLExists = false;
		}
	}
	
	noDocker() {
		if (this.filesValid !== null) { // changed
			this.files = null;
		}
		this.filesValid = null;
		this.status.localRunning = false;
		this.status.dockerHost = null;
		this.status.nameAlias = [];
		this.publicStatus();
	}
	
	docker(dockerInspect: DockerInspect) {
		if (!dockerInspect.State.Running) {
			return this.noDocker();
		}
		if (this.filesValid === dockerInspect.Id) { // un-changed
			return;
		}
		this.files = null;
		this.filesValid = dockerInspect.Id;
		
		this.status.localRunning = true;
		this.status.dockerHost = dockerInspect.Config.Hostname;
		this.status.nameAlias = dockerNames(dockerInspect);
		this.publicStatus();
	}
	
	createTemplate(fileTracker: FileTracker) {
		if (this.files) {
			for (let file of this.files) {
				file.touchFile(fileTracker);
			}
			debug_normal('unchanged service: "%s"', this.serviceName);
			return;
		}
		debug_normal('create service file for "%s"', this.serviceName);
		const configFiles: ConfigFile<any>[] = [];
		if (this.http) {
			debug_normal('  http:');
			for (let file of this.http.configFiles(this.status)) {
				debug_normal('    %s', file.inspect());
				configFiles.push(file);
			}
		}
		
		if (this.stream) {
			debug_normal('  stream:');
			for (let file of this.stream.configFiles(this.status)) {
				configFiles.push(file);
			}
		}
		
		for (let file of this.collector.configFiles(this.status)) {
			configFiles.push(file);
		}
		
		for (let file of configFiles) {
			file.writeFile(fileTracker);
		}
		this.files = configFiles;
	}
}
