import {IExtraStatus, IServiceConfig, IServiceStatus, RouteDirection} from "../config.define";
import {ConfigFile, ConfigFileCreator} from "../template/base.configfile";

export type BuilderCreator<T, A> = new (baseOpt: {service: IServiceConfig}, config: A) => T;

export interface BuilderInterface {
	configFiles(status: IServiceStatus|IServiceStatus&IExtraStatus): IterableIterator<ConfigFile<any>>
}

export abstract class Builder<SubType> implements BuilderInterface {
	protected service: IServiceConfig;
	protected config: SubType;
	
	constructor(baseOpt: {service: IServiceConfig}, config: SubType) {
		if (!baseOpt.service) {
			throw new Error(this.constructor.name + ': no passingData');
		}
		this.service = baseOpt.service;
		this.config = config;
		this.includes = [];
		this.autos = [];
		
		this.init(config);
		
		Object.freeze(this.includes);
	}
	
	protected createSubBuilder<T, A>(construct: BuilderCreator<T, A>, arg: A) {
		return new construct({service: this.service}, arg);
	}
	
	protected abstract init(config: SubType): void;
	
	private includes: {me: ConfigFileCreator<any>; want: ConfigFileCreator<any>}[];
	
	protected include(me: ConfigFileCreator<any>, want: ConfigFileCreator<any>) {
		this.includes.push({me, want});
	}
	
	private includeYield(list: ConfigFile<any>[]) {
		for (let self of list) {
			for (let {me, want}of this.includes) {
				if (self.constructor === me) {
					for (let other of list) {
						if (other.constructor === want) {
							self.include(other);
						}
					}
				}
			}
		}
	}
	
	private autos: Builder<any>[];
	
	protected auto(...builders: Builder<any>[]) {
		this.autos.push(...builders);
	}
	
	protected abstract buildConfigFile(status: IServiceStatus&IExtraStatus): IterableIterator<ConfigFile<any>>;
	
	public *configFiles(status: IServiceStatus|IServiceStatus&IExtraStatus): IterableIterator<ConfigFile<any>> {
		if (!this.service) {
			throw new Error(this.constructor.name + ': no passingData');
		}
		
		let directions;
		if (status.hasOwnProperty('direction')) {
			directions = [status['direction']];
		} else {
			directions = [RouteDirection.IN, RouteDirection.OUT]
		}
		
		for (let direction of directions) {
			const all: ConfigFile<any>[] = [];
			const wrapStatus: IServiceStatus&IExtraStatus = Object.assign({}, status, {direction});
			
			for (let i of this.buildConfigFile(wrapStatus)) {
				i.doInit({
					direction,
					serviceName: this.service.serviceName,
				});
				yield i;
				all.push(i);
			}
			
			for (let builder of this.autos) {
				for (let inc of builder.configFiles(wrapStatus)) {
					yield inc;
					all.push(inc);
				}
			}
			
			this.includeYield(all)
		}
	}
}
