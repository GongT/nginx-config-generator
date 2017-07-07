export function getServiceName(n: string) {
	const name = n.replace(/^\//, '').replace(/\//, '-');
	return /^[a-z\-0-9._]+$/.test(name)? name : '';
}
