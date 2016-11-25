const resolve = require('path').resolve;
const fs = require('fs');
const saveRoot = __dirname;
const debug = require('debug')('ip:load');

let serverMap, whoAmI;

if (process.env.RUN_IN_DOCKER) {
	console.log('current running in docker.');
	whoAmI = require('./who_am_i.json');
	debug('who am i: self = %s', JSON.stringify(whoAmI, null, 4));
	serverMap = require('./get_server_ip.json');
	debug('server map: %s', JSON.stringify(serverMap, null, 4));
} else {
	console.log('detecting deploy environment.');
	serverMap = require('./get_server_ip.js');
	fs.writeFileSync(resolve(saveRoot, 'get_server_ip.json'), JSON.stringify(serverMap, null, 4));
	
	whoAmI = require('./who_am_i.js');
	fs.writeFileSync(resolve(saveRoot, 'who_am_i.json'), JSON.stringify(whoAmI, null, 4));
}

module.exports = {
	whoAmI: whoAmI,
	serverMap: serverMap,
};

module.exports.forEach = function (cb) {
	Object.keys(serverMap).forEach((k) => {
		cb.call(serverMap, serverMap[k], k);
	});
};
module.exports.some = function (cb) {
	return Object.keys(serverMap).some((k) => {
		return cb.call(serverMap, serverMap[k], k);
	});
};
