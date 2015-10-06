var fs = require('fs');
var path = require('path');

var BAAS_HOME_DIR = '.baas';
var CLOUDS_CONF_FILE = 'clouds.rc';
var BACKUP_CONF_FILE = 'backups.rc';

function create_baas_dir() {
	var dir = path.join(process.env.HOME, BAAS_HOME_DIR);
	fs.stat(dir, function (err, stats) {
		if(err) {
			fs.mkdir(dir, function(error) {
				if(error) return console.error(error);
				console.log("Successfully created " + dir);
				// Create conf files under new directory
				create_conf_file(CLOUDS_CONF_FILE);
				create_conf_file(BACKUP_CONF_FILE);
			});
			return;
		}
		if(stats.isFile()) {
			return console.error("Failed to create " + dir + ", File exists.");
		} else {
			// Directory found, check for conf files
			create_conf_file(CLOUDS_CONF_FILE);
			create_conf_file(BACKUP_CONF_FILE);
		}
	});
}

function create_conf_file(filename) {
	var conf_file = path.join(process.env.HOME, BAAS_HOME_DIR, filename);
	fs.stat(conf_file, function (err, stats) {
		if(err) {
			fs.writeFile(conf_file, "", function(error) {
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

function write_conf_file(filename, data) {
	var conf_file = path.join(process.env.HOME, BAAS_HOME_DIR, filename);
	fs.writeFile(conf_file, JSON.stringify(data, null, 2), function(error) {
		if(error) return console.error(error);
		console.log("Successfully updated " + conf_file);
	});

}

function load_data_from_file(filename, callback) {
	var conf_file = path.join(process.env.HOME, BAAS_HOME_DIR, filename);
	fs.stat(conf_file, function (err, stats) {
		if(err) return console.error(err);
		fs.readFile(conf_file, function(error, data) {
			if(error) return console.error(error);
			callback(data);
		});
	});
}
