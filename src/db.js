/**
 * This will function like a memory store for now, but the idea is we want to be able to run multiple
 * gdevice containers at the same time, so that one container isn't stuck handling 8 webrtc streams
 */

var db = {};

const get = (table,key) => {
	if (!Object.keys(db).includes(table)
		|| !Object.keys(db[table]).includes(key))
	{
		return null;
	}
	return db[key];
};

const put = (table,key,value) => {
	if (!Object.keys(db).includes(table)) {
		db[table] = {};
	}
	db[table][key] = value;
};

const del = (table,key) => {
	if (!Object.keys(db).includes(table)
		|| !Object.keys(db[table]).includes(key))
	{
		return false;
	}
	delete db[table][key];
};

export default {
	get, put, del
};