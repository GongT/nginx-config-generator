export function getServiceName(item: DockerInspect) {
	const name = item.Name.replace(/^\//, '').replace(/\//, '-');
	return /^[a-z\-0-9.]+$/.test(name)? name : '';
}

export function getServiceMap(list: DockerInspect[]): {[id: string]: DockerInspect} {
	const ret = {};
	list.forEach((ins) => {
		const name = getServiceName(ins);
		if (name) {
			ret[name] = ins;
		}
	});
	return ret;
}

export function getAllNames(item: DockerInspect) {
	let ret = [];
	const name = getServiceName(item);
	
	if (!name) {
		console.error(`invalid service name: ${item.Name}`);
		return [];
	}
	
	const alias = getServiceAlias(item);
	
	ret.push(name);
	if (alias.length) {
		ret = ret.concat(alias);
	}
	
	return ret;
}

export function getServiceAlias(ins: DockerInspect) {
	if (!ins.Config.Labels) {
		return [];
	}
	let alias: any = ins.Config.Labels['org.special-label.alias'];
	if (alias && typeof alias === 'string') {
		try {
			alias = JSON.parse(alias);
		} catch (e) {
			console.error('\x1B[38;5;9m%s\x1B[0m', new Error(`alias json invalid: ${ins.Name}`));
			return [];
		}
	}
	if (alias && !Array.isArray(alias)) {
		alias = [alias]
	}
	if (alias) {
		return alias;
	} else {
		return [];
	}
}
