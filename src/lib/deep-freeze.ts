export function deepFreeze(object: any) {
	for (let i in object) {
		if (typeof object[i] === 'object') {
			deepFreeze(object[i])
		}
	}
	Object.freeze(object);
}
