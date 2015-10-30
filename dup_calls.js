
var dup_verbosity = " -v8 ";

function set_envs() {
    var passphrase = $('#passphrase').val();
    if(passphrase) {
        process.env['PASSPHRASE'] = passphrase;
    }
    var cloud_name = $("#cloud").val().replace(/^\s+|\s+$/gm,'');
    $.each(clouds, function(i, cloud) {
        if(cloud.name == cloud_name) {
            process.env['SWIFT_PREAUTHURL'] = cloud.pithos_public + '/' + cloud.uuid;
            process.env['SWIFT_PREAUTHTOKEN'] = cloud.token;
        }
    });
}

function build_win_commands() {
    var passphrase = $('#passphrase').val();
    var cloud_name = $("#cloud").val().replace(/^\s+|\s+$/gm,'');
    var preauth_url = null;
    var preauth_token = null;

    $.each(clouds, function(i, cloud) {
        if(cloud.name == cloud_name) {
            preauth_url = cloud.pithos_public + '/' + cloud.uuid;
            preauth_token = cloud.token;
        }
    });
    return "export PATH=/usr/bin/:$PATH;" +
        "ulimit -n 1024;" +
        "export PASSPHRASE=" + passphrase + ";" +
        "export SWIFT_PREAUTHURL=" + preauth_url + ";" +
        "export SWIFT_PREAUTHTOKEN=" + preauth_token + ";";
}

function run_duplicity(restore) {

    var container = null;
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    $.each(backups, function(i, backup_set) {
        if(backup_set.name == backup_name) {
            container = backup_set.container;
        }
    });

    var file_arg = "";
    var file_to_restore = $("#res-file").val();
    if(restore && file_to_restore) {
        file_arg = " --file-to-restore '" + file_to_restore + "' ";
    }

    var time_arg = "";
    var timestamp = $("#timestamp").val();
    if(restore && timestamp) {
        time_arg = " --time " + timestamp;
    }

    var exclude_arg = "";
    var exclude = $("#exclude").val();
    if(exclude && !restore) {
        var args = exclude.split(",");
        $.each(args, function(i, value) {
            if(process.platform == 'win32') {
                exec(CYGWIN_BASH + " -c \"/usr/bin/cygpath '" + value + "' \"",
                    function(error, stdout, stderr) {
                        if(error) $("#msg").html(error);
                        var win_value = String(stdout).replace(/(\r\n|\n|\r)/gm, "");
                        exclude_arg += " --exclude '" + win_value + "' ";
                    });
            } else {
                exclude_arg += " --exclude '" + value + "' ";
            }
        });
    }

    var include_arg = "";
    var include = $("#include").val();
    if(include && !restore) {
        var args = include.split(",");
        $.each(args, function(i, value) {
            if(process.platform == 'win32') {
                exec(CYGWIN_BASH + " -c \"/usr/bin/cygpath '" + value + "' \"",
                    function(error, stdout, stderr) {
                        if(error) $("#msg").html(error);
                        var win_value = String(stdout).replace(/(\r\n|\n|\r)/gm, "");
                        include_arg += " --include '" + win_value + "' ";
                    });
            } else {
                include_arg += " --include '" + value + "' ";
            }
        });
    }
    var directory = "";
    if(restore) {
        if(file_to_restore) {
            directory = path.join($("#res-directory").html(), file_to_restore);
            mkdirp(directory, function(err) {
                if(err) console.error(err);
            });
        } else {
            directory = $("#res-directory").html();
        }
    } else {
        directory = $("#directory").html();
    }
    var log_file = path.join(BAAS_LOG_DIR, "dup_" + new Date().toISOString() + ".log");
    var log_arg = " --log-file '" + log_file + "' ";

    if(process.platform == 'win32') {
        directory = directory.replace(/\\/g, "\\\\");
        exec(CYGWIN_BASH + " -c \"/usr/bin/cygpath '" + directory + "' \"",
            function(error, stdout, stderr) {
                directory = String(stdout).replace(/(\r\n|\n|\r)/gm, "");
                if(error) $("#msg").html(error);

                var dirs = directory + " swift://" + container;
                if(restore) {
                    dirs = " swift://" + container + " " + directory;
                }
                var cmd = build_win_commands();
                var dup_cmd = "duplicity " + dup_verbosity + log_arg + include_arg + exclude_arg + file_arg + time_arg + dirs + ";";

                exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'",
                    function(error, stdout, stderr){
                        if(error) {
                            $("#msg").html(error);
                            $("#msg").addClass("panel");
                        } else {
                            $("#msg").html("");
                            $("#msg").removeClass("panel");
                        }
                        $("#loader").hide();
                    });
        });
    } else {
        set_envs();

        var dirs = directory + " swift://" + container;
        if(restore) {
            dirs = " swift://" + container + " " + directory;
        }
        var dup_cmd = "duplicity " + dup_verbosity + log_arg + include_arg + exclude_arg + file_arg + time_arg + dirs + ";";
        exec(dup_cmd , function(error, stdout, stderr) {
            if(error) {
                $("#msg").addClass("panel");
                $("#msg").html(error);
            } else {
                $("#msg").html("");
                $("#msg").removeClass("panel");
            }
            $("#loader").hide();
        });
    }
}

function load_status() {
    $("#loader").show();
    $("#status").html("");

    var container = null;
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    $.each(backups, function(i, backup_set) {
        if(backup_set.name == backup_name) {
            container = backup_set.container;
        }
    });
    function puts(error, stdout, stderr) {
        if(error) {
            $("#msg").html(error);
            $("#msg").addClass("panel");
        } else {
            $("#msg").html("");
            $("#msg").removeClass("panel");
            $("#status").html(stdout.replace(/(?:\r\n|\r|\n)/g, '<br />'));
        }
        $("#loader").hide();
    }
    var dup_cmd = "duplicity collection-status swift://" + container;
    if(process.platform == 'win32') {
        var cmd = build_win_commands();
        exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'", puts);
    } else {
        set_envs();
        exec(dup_cmd, {maxBuffer: 1000*1024} , puts);
    }
}

function load_contents() {
    $("#loader").show();
    $("#contents").html("");

    var container = null;
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    $.each(backups, function(i, backup_set) {
        if(backup_set.name == backup_name) {
            container = backup_set.container;
        }
    });

    function puts(error, stdout, stderr) {
        if(error) {
            $("#msg").html(error);
            $("#msg").addClass("panel");
        } else {
            $("#msg").html("");
            $("#msg").removeClass("panel");
            $("#contents").html(stdout.replace(/(?:\r\n|\r|\n)/g, '<br />'));
        }
        $("#loader").hide();
    }
    var dup_cmd = "duplicity list-current-files swift://" + container;
    if(process.platform == 'win32') {
        var cmd = build_win_commands();
        exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'", puts);
    } else {
        set_envs();
        exec(dup_cmd , puts);
    }
}

