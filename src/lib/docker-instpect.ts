import {DockerListItem} from "./docker-list-containers";
export function docker_inspect(dockerApi, nameOrInfo: (string|DockerListItem)): Promise<DockerInspect> {
	return new Promise((resolve, reject) => {
		const id = typeof nameOrInfo === 'string'? nameOrInfo : nameOrInfo.Id;
		
		dockerApi.getContainer(id).inspect((err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

export function docker_inspect_all(dockerApi, list: (string|DockerListItem)[]): Promise<DockerInspect[]> {
	return Promise.all(list.map((cInfo) => {
		return docker_inspect(dockerApi, cInfo);
	}));
}
