"use strict";

var dbInfo = exports.dbInfo = function(collections) {

	var dbInfo = {

		//Update this info with mongohq account info.
		name: 'DEPLOYMENT_NAME',
		url: 'MONGO_DB_URL',
		port: 'MONDO_DB_PORT',
		username: 'MONGO_DB_USER',
		password: 'MONGO_DB_PASS',
		collections: collections,
		secret: 'RANDOM_CIPHER_KEY'

	}

	return dbInfo;
}