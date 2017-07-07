export function array_unique(arr: string[]) {
	const u = {}, a = [];
	for (let i = 0, l = arr.length; i < l; ++i) {
		if (u.hasOwnProperty(arr[i])) {
			continue;
		}
		a.push(arr[i]);
		u[arr[i]] = 1;
	}
	return a;
}
