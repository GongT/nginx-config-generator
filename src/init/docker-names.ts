import {JsonEnv} from "@gongt/jenv-data";

export function dockerNames(inspect: DockerInspect): string[] {
	const ret = [];
	
	const name = inspect.Name.replace(/^\//, '').replace(/\//g, '.');
	
	ret.push(inspect.Id, name);
	
	if (inspect.Config.Labels && inspect.Config.Labels['org.special-label.alias']) {
		try {
			const arr: string[] = JSON.parse(inspect.Config.Labels['org.special-label.alias']);
			arr.filter((i) => {
				return name !== i;
			}).forEach((i) => {
				ret.push(i, i + '.' + JsonEnv.baseDomainName);
			})
		} catch (e) {
			console.error('Cannot parse label of docker %s: %s', inspect.Name, e.message);
		}
	}
	
	return ret.filter(unique);
}

export function unique<VT, T extends Array<VT>>(item: VT, index: number, self: T): boolean {
	return self.lastIndexOf(item) === index;
}
