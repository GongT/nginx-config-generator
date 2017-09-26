import {ILocationConfig} from "../config.define";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigValuesBundle} from "./nginx-config-structure";

export interface IManualLocationConfig extends ILocationConfig {
	content: string;
	direction?: string;
}

export interface IManualLocationOption {
	content: string;
	id: string;
}

export class ManualLocationConfigFile extends ConfigFile<IManualLocationOption> {
	protected debugInspect(): string {
		return '< manual >';
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	get fileName() {
		return `configs/${this.option.id}.${this.directionName}.manual.conf`;
	}
	
	protected buildContent(): ConfigValuesBundle {
		const config = new ConfigValuesBundle('manual');
		config.push(this.option.content);
		return config;
	}
}
