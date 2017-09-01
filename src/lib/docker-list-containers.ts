import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";

const debug = createLogger(LOG_LEVEL.INFO, 'list');

export interface DockerListItem {
	Id: string;
}

export function docker_list_containers(dockerApi): Promise<DockerListItem[]> {
	return new Promise((resolve, reject) => {
		dockerApi.listContainers((err, data) => {
			if (err) {
				debug('list containers: Error ' + err.message);
				reject(err);
			} else {
				debug('list containers: ' + data.length);
				resolve(data);
			}
		});
	});
}
