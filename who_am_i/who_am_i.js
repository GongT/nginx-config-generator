const os = require('os');
const ifaces = os.networkInterfaces();
const serverIpMap = require('./get_server_ip');
const extend = require('util')._extend;
const debug = require('debug')('ip:who_am_i');

module.exports = {
	id: undefined,
	name: undefined,
	localhost: undefined,
	internal: undefined,
	external: undefined,
};

// try find myself
let foundMySelf;

const forceServerId = JsonEnv.deploy.forceServerId || process.env.DOCKER_MY_SERVER_ID;
if (forceServerId) {
	debug('who_am_i: found server id from env [%s]', forceServerId);
	foundMySelf = serverIpMap[forceServerId];
	if (foundMySelf) {
		foundMySelf.id = forceServerId;
		debug('server not defined: ', forceServerId);
	}
} else {
	const matchedItems = [];
	Object.keys(ifaces).forEach((ifName) => {
		debug('found interface %s', ifName);
		return ifaces[ifName].forEach((ifcfg) => {
			debug('   found %s address: %s', ifcfg.family, ifcfg.address);
			
			const ip = ifcfg.address.trim();
			
			return Object.keys(serverIpMap).forEach(function (id) {
				const def = serverIpMap[id];
				def.id = id;
				if (def.detect === ip) {
					debug('       match self: %s', id);
					if (ifcfg.internal) {
						matchedItems.push(def);
					} else {
						matchedItems.unshift(def);
					}
				}
			});
		});
	});
	if (matchedItems.length) {
		foundMySelf = matchedItems[0];
	}
}

if (!foundMySelf) {
	console.error(`CAN'T FIND OUT WHO AM I\n  maybe a new server not list in server_ip.json ?`);
	console.error('server ip map: ', serverIpMap);
	if (!process.env.RUN_IN_DOCKER) {
		console.error('set `DOCKER_MY_SERVER_ID` environment var to debug.')
	}
	process.exit(2);
}

extend(module.exports, foundMySelf);

debug('who am i: self = %s', JSON.stringify(module.exports, null, 4));
