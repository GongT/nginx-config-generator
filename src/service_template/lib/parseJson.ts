const fs = require('fs');

module.exports = function parseJson(file) {
	const json = fs.readFileSync(file, 'utf-8');
	try {
		return JSON.parse(json);
	} catch (e) {
		e.message += ` ( in file ${file} )`;
		throw e;
	}
};
