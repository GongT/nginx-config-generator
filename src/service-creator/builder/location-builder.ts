import {IExtraStatus, ILocationConfig, IServiceConfig, IServiceStatus} from "../config.define";
import {ConfigFile} from "../template/base.configfile";
import {Builder} from "./base.builder";
import {UpstreamBuilder} from "./upstream-builder";

export interface ILocationRenderConfig {
	id: string;
}

export abstract class LocationBuilder<T extends ILocationConfig> extends Builder<T> {
	protected readonly id: string;
	
	constructor(baseOpt: {service: IServiceConfig}, locationDefine: T&ILocationRenderConfig) {
		super(baseOpt, locationDefine);
		
		this.id = locationDefine.id;
		
		Object.freeze(this);
	}
	
	protected init(config: T) {
	}
	
	private _upstream;
	
	protected get upstream() {
		return this._upstream;
	}
	
	protected createUpstream() {
		if (this._upstream) {
			return this._upstream;
		}
		this._upstream = this.createSubBuilder(UpstreamBuilder, {
			interfaceMachine: this.service.interfaceMachine,
			machines: this.service.machines,
			port: 80,
		});
		this.auto(this._upstream);
		return this._upstream;
	}
	
	protected abstract buildLocationFile(status: IServiceStatus&IExtraStatus,
	                                     location: ILocationConfig): IterableIterator<ConfigFile<any>>;
	
	protected buildConfigFile(status: IServiceStatus&IExtraStatus): IterableIterator<ConfigFile<any>> {
		return this.buildLocationFile(status, this.config);
	}
}
