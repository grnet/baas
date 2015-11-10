
var dup_verbosity = " -v8 ";

function backup(restore) {
    $("#loader").show();
    if(!restore) {
        save_backup_set();
        disable_form(true);
        disable_actions(false);
    }
    run_duplicity(restore);
}

function set_envs() {
    var sel_pass = $('#passphrase').val() ? $('#passphrase') : $("#res-passphrase");
    var passphrase = sel_pass.val();
    if(passphrase) {
        process.env['PASSPHRASE'] = passphrase;
    }
    var sel_cloud = $("#cloud").val() ? $("#cloud") : $("#res-cloud");
    var cloud_name = sel_cloud.val().replace(/^\s+|\s+$/gm,'');
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

    var file_arg = "";
    if(restore) {
        var file_to_restore = $("#res-file").val();
        if(file_to_restore) {
            file_arg = " --file-to-restore '" + file_to_restore + "' ";
        }
    }

    var time_arg = "";
    if(restore) {
        var timestamp = $("#timestamp").val();
        if(timestamp) {
            time_arg = " --time " + timestamp;
        }
    }

    var exclude_arg = "";
    if(!restore) {
        var exclude = $("#exclude").val();
        if(exclude) {
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
    }

    var include_arg = "";
    if(!restore) {
        var include = $("#include").val();
        if(include) {
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

    var container_name = "";
    if(restore) {
        container_name = $("#res-backup-name").val();
    } else {
        container_name = $("#backup-name").val();
    }

    var log_file = path.join(BAAS_LOG_DIR, "dup_" + new Date().toISOString() + ".log");
    var log_arg = " --log-file '" + log_file + "' ";

    if(process.platform == 'win32') {
        directory = directory.replace(/\\/g, "\\\\");
        exec(CYGWIN_BASH + " -c \"/usr/bin/cygpath '" + directory + "' \"",
            function(error, stdout, stderr) {
                directory = String(stdout).replace(/(\r\n|\n|\r)/gm, "");
                if(error) $("#msg").html(error);

                var dirs = directory + " swift://" + container_name;
                if(restore) {
                    dirs = " swift://" + container_name + " " + directory;
                }
                var cmd = build_win_commands();
                var dup_cmd = "duplicity " + include_arg +
                    exclude_arg + file_arg + time_arg + dirs + ";";

                exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'",
                    function(error, stdout, stderr){
                        if(error) {
                            $("#msg").html(error);
                            $("#msg").addClass("panel");
                            disable_form(false);
                            disable_actions(true);
                        } else {
                            $("#msg").html("");
                            $("#msg").removeClass("panel");
                            if(!restore &&
                                typeof backups[selected_backup].first_backup == 'undefined') {
                                write_first_backup();
                            }
                        }
                        $("#loader").hide();
                    });
        });
    } else {
        set_envs();

        var dirs = directory + " swift://" + container_name;
        if(restore) {
            dirs = " swift://" + container_name + " " + directory;
        }
        var dup_cmd = "duplicity " + dup_verbosity + log_arg +
            include_arg + exclude_arg + file_arg + time_arg + dirs + ";";
        exec(dup_cmd , function(error, stdout, stderr) {
            if(error) {
                $("#msg").addClass("panel");
                $("#msg").html(stderr);
                disable_form(false);
                disable_actions(true);
            } else {
                $("#msg").html("");
                $("#msg").removeClass("panel");
                if(!restore &&
                    typeof backups[container_name].first_backup == 'undefined') {
                    write_first_backup();
                }
            }
            $("#loader").hide();
        });
    }
}

function load_status() {
    $('#backup_details').hide();
    $("#loader").show();
    $("#status").html("");

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
