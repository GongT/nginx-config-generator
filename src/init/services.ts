import {JsonEnv} from "@gongt/jenv-data";
import {DefaultServerBuilder} from "../service-creator/global.default_server";
import {HttpConfigBuilder} from "../service-creator/global.http";
import {MainLoaderBuilder} from "../service-creator/global.services";
import {StreamLoaderBuilder} from "../service-creator/global.streams";
import {ServiceCreator} from "../service-creator/service-creator";

export const serviceMapper: Map<string, ServiceCreator> = new Map();
export const mainServiceLoader: MainLoaderBuilder = new MainLoaderBuilder();
export const streamServiceLoader: StreamLoaderBuilder = new StreamLoaderBuilder();
export const globalFile: HttpConfigBuilder = new HttpConfigBuilder();
export const defaultServer: DefaultServerBuilder = new DefaultServerBuilder();

export function initServices() {
	Object.keys(JsonEnv.services).forEach((name) => {
		const creator = new ServiceCreator(name);
		serviceMapper.set(name, creator);
		mainServiceLoader.registerService(name);
		if (creator.hasStreamServer) {
			streamServiceLoader.registerService(name);
		}
	});
}
