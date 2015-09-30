

var fs = require('fs');
var path = require('path');

var BAAS_HOME_DIR = '.baas';
var BAAS_CONF_FILE = 'config.rc';

var config = { 'auth_url' : '', 'SWIFT_PREAUTHURL' : '', 'SWIFT_PREAUTHTOKEN' : '' };

function create_baas_dir() {

	var dir = path.join(process.env.HOME, BAAS_HOME_DIR);
	fs.stat(dir, function (err, stats) {
		if(err) {
			fs.mkdir(dir, function(error) {
				if(error) return console.error(error);
				console.log("Successfully created " + dir);
				create_conf_file();
			});
			return;
		}
		if(stats.isFile()) {
			return console.error("Failed to create " + dir + ", File exists.");
		}
	});
}

function create_conf_file() {

	var conf_file = path.join(process.env.HOME, BAAS_HOME_DIR, BAAS_CONF_FILE);
	fs.stat(conf_file, function (err, stats) {
		if(err) {
			fs.writeFile(conf_file, JSON.stringify(config), function(error) {
				if (error) return console.error(error);
				return console.log("Successfully created " + conf_file);
			});
			return;
		}
		if(!stats.isFile()) {
			return console.error("Failed to create " + conf_file + ", Directory exists.");
		}
	});

}

function write_conf_file(data) {
	var conf_file = path.join(process.env.HOME, BAAS_HOME_DIR, BAAS_CONF_FILE);
	fs.writeFile(conf_file, JSON.stringify(data, null, 2), function(error) {
		if(error) return console.error(error);
		console.log("Successfully updated " + conf_file);
	});

}
