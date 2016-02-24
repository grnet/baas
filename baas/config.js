// Copyright (C) 2015-2016 GRNET S.A.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var fs = require('fs');
var path = require('path');
var mkdirp = require("mkdirp");
var exec = require('child_process').exec;
var execFileSync = require('child_process').execFileSync;
var execFile = require('child_process').execFile;
var spawn = require('child_process').spawn;

var BAAS_HOME_DIR = '.baas';
var CLOUDS_CONF_FILE = 'clouds.rc';
var BACKUP_CONF_FILE = 'backups.rc';
var TEMPLATES_FILE = 'templates.rc';

var BAAS_LOG_DIR = path.join(get_user_home(), BAAS_HOME_DIR, 'log');
var BAAS_CACHE_DIR = path.join(get_user_home(), BAAS_HOME_DIR, 'cache');
var BAAS_ARCHIVE_DIR = path.join(BAAS_CACHE_DIR, 'duplicity');
var RESTORE_DEFAULT_DIR = path.join(get_user_home(), "Downloads");

var running_processes = [];
var SHA256 = require("crypto-js/sha256");

var exec_path = path.dirname(process.execPath);
if(process.platform == 'darwin') {
    exec_path = path.join(
	path.dirname(path.dirname(path.dirname(path.dirname(exec_path)))),
	"Resources");
    process.env['PATH'] = process.env['PATH'] + ':/usr/local/bin';
}

var DEFAULT_CERT = path.join(exec_path, 'cacert.pem');

var CYGWIN_BIN = path.join(exec_path, "cygwin", "bin");
var CYGWIN_CYGPATH = path.join(CYGWIN_BIN, "cygpath.exe");
var CYGWIN_ENV = path.join(CYGWIN_BIN, "env.exe");

var ENV_CMD = (process.platform == 'win32') ? CYGWIN_ENV : "/usr/bin/env";

function get_user_home() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var templates_data = {
  "BackupHome": {
    "name": "BackupHome",
    "local_dir": get_user_home(),
    "cloud": "",
    "passphrase": "",
    "container": "BackupHome",
    "exclude": "",
    "include": ""
  },
  "BackupEtc": {
    "name": "BackupEtc",
    "local_dir": "/etc",
    "cloud": "",
    "passphrase": "",
    "container": "BackupEtc",
    "exclude": "",
    "include": ""
  }
}

function get_unix_path(path) {
    var out = execFileSync(CYGWIN_CYGPATH, [path]);
    var win_value = String(out).replace(/(\r\n|\n|\r)/gm, "");
    return win_value;
}

function get_unix_exec_path(target) {
    if(process.platform == 'win32') {
        return get_unix_path(exec_path) + "/" + target;
    }
    return path.join(exec_path, target);
}

if(process.platform == "win32") {
    BAAS_ARCHIVE_DIR = get_unix_path(BAAS_ARCHIVE_DIR);
}

var DUPLICITY_PATH = get_unix_exec_path("duplicity");
var TIMEVIEW_PATH = get_unix_exec_path("timeview.py");

function create_conf_files() {
    create_conf_file(CLOUDS_CONF_FILE);
    create_conf_file(BACKUP_CONF_FILE);
    write_file_if_empty(TEMPLATES_FILE, templates_data);
    mkdirp(BAAS_LOG_DIR, function(err) {
        if(err) console.error(err);
    });
    mkdirp(BAAS_CACHE_DIR, function(err) {
        if(err) console.error(err);
    });
    mkdirp(BAAS_ARCHIVE_DIR, function(err) {
        if(err) console.error(err);
    });
}

function create_baas_dir() {
    var dir = path.join(get_user_home(), BAAS_HOME_DIR);
    fs.stat(dir, function (err, stats) {
        if(err) {
            fs.mkdir(dir, function(error) {
                if(error) return console.error(error);
                console.log("Successfully created " + dir);
                // Create conf files under new directory
                create_conf_files();
            });
            return;
        } else {
            if(stats.isFile()) {
                return console.error("Failed to create " + dir + ", File exists.");
            } else {
                // Directory found, check for conf files
                create_conf_files();
            }
        }
    });
}

function create_conf_file(filename) {
    var conf_file = path.join(get_user_home(), BAAS_HOME_DIR, filename);
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
    var conf_file = path.join(get_user_home(), BAAS_HOME_DIR, filename);
    fs.writeFile(conf_file, JSON.stringify(data, null, 2), function(error) {
        if(error) return console.error(error);
        console.log("Successfully updated " + conf_file);
    });

}

function write_file_if_empty(filename, data) {
    var file = path.join(get_user_home(), BAAS_HOME_DIR, filename);
    fs.stat(file, function(err, stats) {
        if(err || (stats && stats.size == 0)) {
            fs.writeFile(file, JSON.stringify(data, null, 2), function(error) {
                if(error) return console.error(error);
                console.log("Successfully initialized " + file);
            });
        }
    });
}

function load_data_from_file(filename, callback) {
    var conf_file = path.join(get_user_home(), BAAS_HOME_DIR, filename);
    fs.stat(conf_file, function (err, stats) {
        if(err) return console.error(err);
        fs.readFile(conf_file, function(error, data) {
            if(error) return console.error(error);
            callback(data);
        });
    });
}

var clients = { };
var kamaki = require('./static/js/kamaki.js');

/**
 * Return a client
 * Create or update a Client object if it's missing or is outdated
 */
function getClient(name, URL, token, CAPath) {
    if (clients[name] && clients[name].equalsURL(URL))
        clients[name].setToken(token);
    else if (clients[name])
        clients[name].setURL(URL);
    else clients[name] = new kamaki.Client(URL, token, CAPath);
    if (clients[name].getCA() !== CAPath) clients[name].setCA(CAPath);
    return clients[name];
}

function kill_callback(error, stdout, stderr) {
    if(error) {
        console.error(stderr);
    }
    console.log(stdout);
}

function kill_processes() {
    for(var i = 0; i < running_processes.length; i++) {
        console.log("About to kill " + running_processes[i][0].pid);
        running_processes[i][0].kill();
        var lockfile =
            path.join(BAAS_ARCHIVE_DIR, running_processes[i][1],
                    "lockfile.lock");
        console.log("About to unlink lockfile " + lockfile);
        fs.unlinkSync(lockfile);

    }
}
