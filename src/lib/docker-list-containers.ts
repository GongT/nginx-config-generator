import * as Debug from "debug";
const debug = Debug('list');

export function docker_list_containers(dockerApi) {
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
