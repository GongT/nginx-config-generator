let JsonEnv;
const debug = require('debug')('ip:server_map');

if (global.JsonEnv) {
	JsonEnv = global.JsonEnv;
} else {
	JsonEnv = require('@gongt/jenv-data')();
}

const serverDefine = JsonEnv.deploy;
if (!serverDefine || !Object.keys(serverDefine).length) {
	throw new Error('no config.deploy exists');
}

const serverMap = {};
Object.keys(serverDefine).forEach((networkGroup) => {
	if (networkGroup === 'forceServerId') {
		return;
	}
	serverDefine[networkGroup].machines.forEach((d) => {
		const serverId = `${d.name}.${networkGroup}`;
		d.network = networkGroup;
		d.id = serverId;
		serverMap[serverId] = d;
	});
});

debug('server map: %s', JSON.stringify(serverMap, null, 4));
module.exports = serverMap;
