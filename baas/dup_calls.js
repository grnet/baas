
var dup_verbosity = " -v8 ";

function backup(restore) {
    $("#loader").show();
    if(!restore) {
        save_backup_set();
        disable_form(true);
        disable_actions(false);
        disable_buttons(true);
    }
    run_duplicity(restore, false);
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

function run_duplicity(restore, force) {

    var container_name = "";
    if(restore) {
        container_name = $("#res-backup-name").val();
    } else {
        container_name = $("#backup-name").val();
    }

    var cloud = "";
    if(restore) {
        cloud = $("#res-cloud").val();
    } else {
        cloud = $("#cloud").val();
    }

    if(!restore) {
        backups[cloud + "/" + container_name].last_status = "Running";
    }

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
            fs.stat(directory, function (err, stats) {
                if(err) {
                    mkdirp.sync(directory, function(err) {
                        if(err) {
                            console.error(err);
                            $("#msg").html(err);
                            $("#msg").addClass("panel");
                        }
                    });
                }
            });
        } else {
            directory = $("#res-directory").html();
        }
    } else {
        directory = $("#directory").html();
    }

    var log_file = path.join(BAAS_LOG_DIR, "dup_" + new Date().toISOString() + ".log");
    var log_arg = " --log-file '" + log_file + "' ";

    var force_arg = (force) ? " --force " : "";

    function dup_output(error, stdout, stderr) {
        if(error) {
            $("#msg").html(stderr);
            $("#msg").addClass("panel");
            $("#loader").hide();
            if(!restore) {
                disable_form(false);
                disable_actions(true);
                backups[cloud + "/" + container_name].last_status = "Failed";
            } else {
                var exist_error =
                    new RegExp("Restore destination directory.* already exists.\nWill not overwrite.")
                    .exec(stderr);
                if(exist_error) {
                    $("#msg").html("");
                    $("#msg").removeClass("panel");
                    $("#modal-confirm").foundation("reveal", "open");
                    var i = 0;
                    $("#modal-confirm").on('close.fndtn.reveal', function(e) {
                        if(e.namespace !== "fndtn.reveal") return;
                        i++;
                        $(this).click(function(event) {
                            // event is fired more than once so have to check
                            if(event.target.id == "modal-accept" && i == 1) {
                                $("#loader").show();
                                run_duplicity(true, true);
                            }
                        });
                    });
                }
                var gpg_error = new RegExp("GPGError: GPG Failed").exec(stderr);
                if(gpg_error) {
                    $("#msg").html("");
                    $("#msg").removeClass("panel");
                    $('#res-passphrase-error small').text(errors.passphrase_wrong);
                    $('#res-passphrase-error small').show();
                } else {
                    $('#res-passphrase-error small').hide();
                }
            }
        } else {
            $("#loader").hide();
            $("#msg").html("");
            $("#msg").removeClass("panel");
            if(!restore) {
                backups[cloud + "/" + container_name].last_status = "Completed";
                backups[cloud + "/" + container_name].last_backup = new Date();
                if(typeof backups[cloud + "/" + container_name].first_backup == 'undefined') {
                    backups[cloud + "/" + container_name].first_backup = new Date();
                }
            }
        }
        if(!restore) {
            disable_buttons(false);
            write_conf_file(BACKUP_CONF_FILE, backups);
        }
    }

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
                var dup_cmd = DUPLICITY_PATH + " " + force_arg + include_arg +
                    exclude_arg + file_arg + time_arg + dirs + ";";

                exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'", dup_output);
        });
    } else {
        set_envs();

        var dirs = directory + " swift://" + container_name;
        if(restore) {
            dirs = " swift://" + container_name + " " + directory;
        }
        var dup_cmd = DUPLICITY_PATH + " " + force_arg + dup_verbosity + log_arg +
            include_arg + exclude_arg + file_arg + time_arg + dirs + ";";
        exec(dup_cmd , dup_output);
    }
}

function load_status() {
    $('#backup_details').hide();
    $("#loader").show();
    $("#status_contents").html("");

    function puts(error, stdout, stderr) {
        if(error) {
            $("#msg").html(error);
            $("#msg").addClass("panel");
        } else {
            $("#msg").html("");
            $("#msg").removeClass("panel");
            $("#status_contents").html(stdout);
        }
        $("#loader").hide();
    }
    var dup_cmd = DUPLICITY_PATH + " collection-status swift://" + container;
    if(process.platform == 'win32') {
        var cmd = build_win_commands();
        exec(CYGWIN_BASH + " -c '" + cmd + dup_cmd + "'", puts);
    } else {
        set_envs();
        exec(dup_cmd, {maxBuffer: 1000*1024} , puts);
    }
}
