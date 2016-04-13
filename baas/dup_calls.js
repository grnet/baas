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

var DUP_ERR_CODES = {
    RESTORE_DIR_EXISTS : 11,
    GPG_FAILED : 31,
    CONNECTION_FAILED : 38
};

function get_backup_set() {
    var cloud = $("#cloud").val().replace(/^\s+|\s+$/gm,'');
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    return backups[cloud + "/" + backup_name];
}

function backup(restore) {
    $("#loader").show();
    if($("#error-alert")) $("#error-alert").hide();
    $("#msg").html("");
    if(!restore) {
        if(check_empty_passphrase()) {
            save_backup_set(false);
            disable_form(true);
            disable_actions(true);
            disable_buttons(true);

            call_duplicity("backup", get_backup_set(), false);
        } else {
            g_tab_clicked = "backup";
            g_value = false;
        }
    } else {
        $('#res-passphrase-error small').hide();
        call_duplicity("restore", null, false);
    }
}

function get_env_values() {
    var sel_pass = $('#passphrase_m').val() ? $('#passphrase_m') :
        $("#res-passphrase");
    var passphrase = sel_pass.val();

    var sel_cloud = $("#cloud").val() ? $("#cloud") : $("#res-cloud");
    var cloud_name = sel_cloud.val().replace(/^\s+|\s+$/gm,'');
    var cloud = clouds[cloud_name];

    return [passphrase, cloud.pithos_public + '/' + cloud.uuid, cloud.token];
}

function make_env() {
    var env = {};
    for(var k in process.env) {
        if(k.toUpperCase() != "PATH" || process.platform != "win32") {
            env[k] = process.env[k];
	}
    }
    var env_values = get_env_values();
    env['PASSPHRASE'] = env_values[0];
    env['SWIFT_PREAUTHURL'] = env_values[1];
    env['SWIFT_PREAUTHTOKEN'] = env_values[2];
    if(process.platform == "win32") {
        env["PATH"] = "/bin:/usr/bin";
    }
    return env;
}

function build_extra_args(field_value, type, params) {
    var args = field_value.split(",");
    $.each(args, function(i, value) {
        value = value.trim();
        if(!value) return true;
        if(process.platform == 'win32') {
            value = value.replace(/\\/g, "/");
        }
        var arg1 = "--" + type;
        params.push(arg1);
        params.push(value);
    });
}

function check_restore_errors(code) {
    if(code == DUP_ERR_CODES.RESTORE_DIR_EXISTS) {
        toggle_msgs(false, "msg", false);
        $("#modal-confirm").foundation("reveal", "open");
        var i = 0;
        $("#modal-confirm").on('close.fndtn.reveal',
            function(e) {
                if(e.namespace !== "fndtn.reveal") return;
                    i++;
                    $(this).click(function(event) {
                    // event is fired more than once
                    // so have to check
                        if(event.target.id == "modal-accept" &&
                            i == 1) {
                            $("#loader").show();
                            call_duplicity("restore", null, true);
                        }
                    });
                }
            );
        return true;
    }
    if(code == DUP_ERR_CODES.GPG_FAILED) {
        toggle_msgs(false, "msg", false);
        $('#res-passphrase-error small').
            text(errors.passphrase_wrong);
        $('#res-passphrase-error small').show();
        return true;
    }
    return false;
}

function load_status() {
    $('#backup_details').hide();
    $("#loader").show();
    toggle_msgs(false, "msg", false);
    $("#status_contents").html("");
    call_duplicity("status", get_backup_set(), false);
}

function remove_all(force) {
    $("#loader").show();
    toggle_msgs(false, "msg", false);
    g_value = force;
    g_tab_clicked = "remove_all";
    call_duplicity("remove", get_backup_set(), force);
}

function load_timeview() {
    $('#backup_details').hide();
    $("#loader").show();
    toggle_msgs(false, "msg", false);
    call_duplicity("timeview", get_backup_set(), false);
}

function array_to_str(args) {
    var str = "";
    for(var i = 0; i < args.length; i++) {
        str += args[i] + " ";
    }
    return str;
}

function handle_error(data) {
    toggle_msgs(data.toString(), "msg", false);
    $("#loader").hide();
}

function handle_success() {
    spawn_dup_process(arguments[0].args, arguments[0].backup_set,
            arguments[0].backup_name, arguments[0].mode);
}

function create_container(args, backup_set, backup_name, mode) {
    try {
        var astakos =
            getClient('astakos',
                    clouds[backup_set.cloud].pithos_public,
                    clouds[backup_set.cloud].token,
                    clouds[backup_set.cloud].cert);

        var pithos_url =
            "/" + clouds[backup_set.cloud].uuid + "/" + backup_set.container;
        var headers = {"X-Container-Policy-project" : $("#project").val()};
        astakos.put(pithos_url, headers, null, [201, 202],
                handle_success.bind(null, {args: args, backup_set: backup_set,
                backup_name: backup_name, mode: mode}),
                handle_error);
    } catch (err) {
        toggle_msgs(err, "msg", false);
        return false;
    }
    return true;
}

function build_dup_args(mode, backup_set, force, backup_name) {
    var args = [];
    args.push(DUPLICITY_PATH);

    switch(mode) {
        case "backup":
            var local_dir = (process.platform == "win32") ?
                get_unix_path(backup_set.local_dir) :
                backup_set.local_dir;
            args.push(backup_set.backup_type, // full | incremental
                local_dir,
                "swift://" + backup_set.container);

            args.push("--exclude-device-files");
            args.push("--num-retries", "2");
            build_extra_args(backup_set.include, "include", args);
            build_extra_args(backup_set.exclude, "exclude", args);
            args.push("-v4");

            $('html,body').animate({
                scrollTop: $("#msg_div").offset().top}, 1000);
            break;

        case "restore":
            var container_name = $("#res-backup-name").val();
            var timestamp = $("#timestamp").val();
            var file_to_restore = $("#res-file").val();
            var local_dir = "";
            if(file_to_restore) {
                local_dir = path.join($("#res-directory").html(),
                    file_to_restore);
                fs.stat(local_dir, function (err, stats) {
                    if(err) {
                        try { mkdirp.sync(local_dir); }
                        catch(e) { toggle_msgs(e, "msg", false); }
                    }
                });
            } else {
                local_dir = $("#res-directory").html();
            }
            if(process.platform == "win32") {
                local_dir = get_unix_path(local_dir);
            }
            args.push("swift://" + container_name, local_dir);

            if(timestamp) args.push("--time", timestamp);
            if(file_to_restore) args.push("--file-to-restore",
                file_to_restore);
            args.push("-v4");
            break;

        case "status":
        case "timeview":
            args.push("collection-status", "swift://" + backup_set.container);
            break;
        case "remove":
            var time = $("#remove-all").val();
            args.push("remove-older-than", time,
                 "swift://" + backup_set.container);
            break;
        default:
            break;
    }

    var log_file = path.join(BAAS_LOG_DIR, "dup_" +
            new Date().toISOString() + ".log");
    if(process.platform == "win32") {
        log_file = get_unix_path(log_file);
    }
    args.push("--log-file", log_file);
    args.push("--archive-dir", BAAS_ARCHIVE_DIR);
    args.push("--gpg-homedir", GPG_DIR);
    args.push("--name", backup_name);

    var sel_cloud = (backup_set) ? backup_set.cloud :
        $("#res-cloud").val();
    var cert = (clouds[sel_cloud].cert) ?
        clouds[sel_cloud].cert : DEFAULT_CERT;
    args.push("--ssl-cacert-file", cert);

    if(force) args.push("--force");

    return args;
}

function spawn_dup_process(args, backup_set, backup_name, mode) {
    // call duplicity
    var wProcess = spawn(ENV_CMD, args, {env: make_env()});
    running_processes.push([wProcess, backup_name]);

    var force = (args.indexOf("--force") > -1) ? true : false;
    var output_str = "";
    function dup_call_out(data) {
        if(mode == "status") {
            toggle_msgs(data.toString(), "status_contents", true);
        } else if(mode == "remove") {
            toggle_msgs(data.toString(), "cleanup-msg", true);
            var nothing_to_del = new RegExp(
                "No old backup sets found, nothing deleted").exec(data);
            if(nothing_to_del) {
                $("#remove-all-button").show();
                $("#force-delete").hide();
            } else {
                if(!force) $("#force-delete").show();
                else {
                    $("#remove-all-button").show();
                    $("#force-delete").hide();
                }
            }
        } else if(mode == "timeview") {
            output_str += data.toString();
        } else {
            toggle_msgs(data.toString(), "msg", true);
            if(mode == "backup") {
                backup_set.last_status = "Running";
            }
        }
    }

    function dup_call_err(data) {
        if(mode == "remove") {
            toggle_msgs(data.toString(), "cleanup-msg", true);
            $("#force-delete").hide();
        } else {
            toggle_msgs(data.toString(), "msg", true);
        }
    }

    function dup_call_exit(code) {
        console.log("exit code === " + code);
        running_processes.pop(wProcess);
        $("#loader").hide();
        if(mode == "backup") {
            disable_actions(false);
            if(code == 0) {
                show_alert_box("Successfully completed", "success", true);
                backup_set.last_status = "Completed";
                backup_set.last_backup = new Date();
                if(typeof backup_set.first_backup == 'undefined') {
                    backup_set.first_backup = new Date();
                    $("#project_div").hide();
                }
                $("#inc").prop("disabled", false);
                $("#inc").prop("checked", true);
            } else {
                if(typeof backup_set.first_backup == 'undefined') {
                    disable_form(false);
                    disable_actions(true);
                }
                backup_set.last_status = "Failed";
                if(code == DUP_ERR_CODES.CONNECTION_FAILED) {
                    show_cloud_error();
                } else if(code == DUP_ERR_CODES.GPG_FAILED) {
                    toggle_msgs("", "msg", false);
                    show_passphrase_modal(true);
                } else {
                    show_alert_box("There was a problem uploading backup set",
                        "error", false);
                }
            }
            disable_buttons(false);
            write_conf_file(BACKUP_CONF_FILE, backups);
        } else if(mode == "restore") {
            if(code == 0) {
                show_alert_box("Successfully completed", "success", true);
            } else if(code == DUP_ERR_CODES.CONNECTION_FAILED) {
                show_cloud_error();
            } else if(!check_restore_errors(code)) {
                show_alert_box("A problem occured during restoring",
                    "error", false);
            }
        } else if(mode == "timeview") {
            if(code == 0) {
                parse_collection_status(output_str, args[4]);
            } else if(code == DUP_ERR_CODES.CONNECTION_FAILED) {
                show_cloud_error();
            }
        } else if(mode == "remove") {
            if(code == DUP_ERR_CODES.CONNECTION_FAILED) {
                show_cloud_error();
            } else if(code == DUP_ERR_CODES.GPG_FAILED) {
                toggle_msgs("", "cleanup-msg", false);
                show_passphrase_modal(true);
            }
        } else {
             if(code == DUP_ERR_CODES.CONNECTION_FAILED) show_cloud_error();
        }
    }

    // bind listeners
    wProcess.stdout.setEncoding("utf8");
    wProcess.stdout.on('data', dup_call_out);
    wProcess.stderr.setEncoding('utf8');
    wProcess.stderr.on('data', dup_call_err);
    wProcess.on('exit', dup_call_exit);
}

function call_duplicity(mode, backup_set, force) {

    toggle_msgs(false, "msg", false);
    var backup_name = (backup_set) ?
        hashed_backup_name(backup_set.cloud, backup_set.name) :
        hashed_backup_name($("#res-cloud").val(), $("#res-backup-name"));

    var args = build_dup_args(mode, backup_set, force, backup_name);
    if(mode == "backup" && typeof backup_set.first_backup === 'undefined') {
        create_container(args, backup_set, backup_name, mode);
    } else {
        spawn_dup_process(args, backup_set, backup_name, mode);
    }
}
