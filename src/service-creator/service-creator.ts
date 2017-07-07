import {JsonEnv} from "@gongt/jenv-data";
import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {pathExistsSync} from "fs-extra";
import {resolve} from "path";
import {dockerNames} from "../init/docker-names";
import {deepFreeze} from "../lib/deep-freeze";
import {FileTracker} from "../lib/file-change-tracker";
import {isGatewayOfService, isGatewayServer, wantToRun} from "../lib/server-detect";
import {getServiceName} from "../lib/service-name";
import {HttpServerBuilder} from "./builder/http-server-builder";
import {StreamServerBuilder} from "./builder/stream-server-builder";
import {IServiceConfig, IServiceStatus, RouteDirection} from "./config.define";
import {Template} from "./template/base";
import IServersConfig = JsonEnvConfigModule.IServersConfig;
import I1883Config = JsonEnvConfigModule.I1883Config;
import extend = require('extend');

const debug_sill = createLogger(LEVEL.SILLY, 'generate');
const debug_normal = createLogger(LEVEL.INFO, 'generate');
const debug_notice = createLogger(LEVEL.NOTICE, 'generate');

export class ServiceCreator {
	protected config: IServiceConfig;
	protected status: IServiceStatus = <any>{};
	
	protected stream: {income: StreamServerBuilder, outcome: StreamServerBuilder};
	protected http: {income: HttpServerBuilder, outcome: HttpServerBuilder};
	
	constructor(public readonly serviceName: string) {
		this.config = JsonEnv.services[serviceName];
		if (!this.config) {
			throw new Error('unknown service: ' + serviceName);
		}
		
		this.config = extend(true, {
			serviceName: getServiceName(serviceName),
			machines: [],
			interfaceMachine: [],
			alias: [],
			locations: {},
			servers: {},
		}, this.config);
		
		this.checkConfig(this.config);
		
		deepFreeze(this.config);
		
		this.createStream();
		this.createHttp();
	}
	
	private createHttp() {
		this.http = {
			income: new HttpServerBuilder({
				direction: RouteDirection.IN,
				config: this.config,
			}),
			outcome: new HttpServerBuilder({
				direction: RouteDirection.OUT,
				config: this.config,
			}),
		};
	}
	
	private createStream() {
		const {servers} = this.config;
		if (!Object.keys(servers).length) {
			return;
		}
		this.stream = {
			income: new StreamServerBuilder({
				servers,
			}),
			outcome: new StreamServerBuilder({
				servers,
			}),
		};
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
		
		if (!config.servers) {
			config.servers = {};
		}
		const servers = config.servers;
		Object.keys(servers).forEach((outPort) => {
			if (typeof servers[outPort] === 'string' || typeof servers[outPort] === 'number') {
				servers[outPort] = {
					outPort: <any>outPort,
					port: parseInt(<any>servers[outPort]),
				}
			}
		});
	}
	
	private publicStatus() {
		if (this.config.SSL) {
			this.status.SSLExists = ['fullchain.pem', 'privkey.pem', 'chain.pem'].every((file) => {
				return pathExistsSync(resolve(this.config.SSLPath, file));
			});
		}
	}
	
	noDocker() {
		this.status.localRunning = false;
		this.status.dockerHost = null;
		this.status.nameAlias = [];
		this.publicStatus();
	}
	
	docker(dockerInspect: DockerInspect) {
		this.status.localRunning = dockerInspect.State.Running;
		this.status.dockerHost = dockerInspect.Config.Hostname;
		this.status.nameAlias = dockerNames(dockerInspect);
		this.publicStatus();
	}
	
	createTemplate(fileTracker: FileTracker) {
		const templates: Template[] = [];
		if (this.http) {
			templates.push(this.http.income.buildTemplate(this.status));
			templates.push(this.http.outcome.buildTemplate(this.status));
		}
		
		if (this.stream) {
			templates.push(this.stream.income.buildTemplate(this.status));
			templates.push(this.stream.outcome.buildTemplate(this.status));
		}
		
		for (let template of templates) {
			if (template) {
				template.writeFiles(fileTracker);
			} else {
				debug_notice('a builder not return any template');
			}
		}
	}
}
