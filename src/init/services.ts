import {JsonEnv} from "@gongt/jenv-data";
import {ServiceCreator} from "../service-creator/service-creator";

export const serviceMapper: Map<string, ServiceCreator> = new Map();

export function initServices() {
	Object.keys(JsonEnv.services).forEach((name) => {
		const creator = new ServiceCreator(name);
		serviceMapper.set(name, creator);
	});
}
