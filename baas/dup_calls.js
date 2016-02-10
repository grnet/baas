// Copyright (C) 2015 GRNET S.A.

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
        save_backup_set(false);
        disable_form(true);
        disable_actions(true);
        disable_buttons(true);

        call_duplicity("backup", get_backup_set(), false);
    } else {
        $('#res-passphrase-error small').hide();
        call_duplicity("restore", null, false);
    }
}

function get_env_values() {
    var sel_pass = $('#passphrase').val() ? $('#passphrase') :
        $("#res-passphrase");
    var passphrase = sel_pass.val();

    var sel_cloud = $("#cloud").val() ? $("#cloud") : $("#res-cloud");
    var cloud_name = sel_cloud.val().replace(/^\s+|\s+$/gm,'');
    var cloud = clouds[cloud_name];

    return [passphrase, cloud.pithos_public + '/' + cloud.uuid, cloud.token];
}

function set_envs() {
    var env_values = get_env_values();
    process.env['PASSPHRASE'] = env_values[0];
    process.env['SWIFT_PREAUTHURL'] = env_values[1];
    process.env['SWIFT_PREAUTHTOKEN'] = env_values[2];
}

function build_win_commands() {
    var env_values = get_env_values();

    return "export PATH=/usr/bin/:$PATH;" +
        "ulimit -n 1024;" +
        "export PASSPHRASE=" + env_values[0] + ";" +
        "export SWIFT_PREAUTHURL=" + env_values[1] + ";" +
        "export SWIFT_PREAUTHTOKEN=" + env_values[2] + ";";
}
function show_cloud_error() {
    toggle_error(false, "");
    show_alert_box("A problem occured.<br>" +
        "Please check your <a href='#' " +
        "onclick=$('#cloud-settings-link').trigger('click')>" +
        "cloud settings</a>", "error", false);
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
        toggle_error(false, "");
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
    } else if(code == DUP_ERR_CODES.GPG_FAILED) {
        toggle_error(false, "");
        $('#res-passphrase-error small').
            text(errors.passphrase_wrong);
        $('#res-passphrase-error small').show();
    }
}

function toggle_msgs(data, msgDiv) {
    if(data) {
        $("#" + msgDiv).addClass("panel");
        $("#" + msgDiv).append(data.toString());
        $("#" + msgDiv).animate({scrollTop: "+=300px"}, "slow");
    } else {
        $("#" + msgDiv).removeClass("panel");
        $("#" + msgDiv).html("");
    }
}

function load_status() {
    $('#backup_details').hide();
    $("#loader").show();
    $("#status_contents").html("");
    call_duplicity("status", get_backup_set(), false);
}

function remove_all(force) {
    $("#loader").show();
    call_duplicity("remove", get_backup_set(), force);
}

function load_timeview() {
    $('#backup_details').hide();
    $("#loader").show();
    call_duplicity("timeview", get_backup_set(), false);
}

function call_duplicity(mode, backup_set, force) {
    var win_cmd = "";
    if(process.platform == 'win32') {
        win_cmd = build_win_commands();
    } else {
        set_envs();
    }

    var args = [];
    switch(mode) {
        case "backup":
            args = [backup_set.backup_type, // full | incremental
                backup_set.local_dir,
                "swift://" + backup_set.container];

            args.push("--exclude-device-files");
            args.push("--num-retries", "2");
            build_extra_args(backup_set.include, "include", args);
            build_extra_args(backup_set.exclude, "exclude", args);
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
                        catch(e) { toggle_error(e, e); }
                    }
                });
            } else {
                local_dir = $("#res-directory").html();
            }
            args = ["swift://" + container_name, local_dir];

            if(timestamp) args.push("--time", timestamp);
            if(file_to_restore) args.push("--file-to-restore",
                file_to_restore);
            args.push("-v8");
            break;

        case "status":
        case "timeview":
            args = ["collection-status", "swift://" + backup_set.container];
            break;
        case "remove":
            var time = $("#remove-all").val();
            args = ["remove-older-than", time,
                 "swift://" + backup_set.container];
            break;
        default:
            break;
    }

    var log_file = path.join(BAAS_LOG_DIR, "dup_" +
            new Date().toISOString() + ".log");
    args.push("--log-file", log_file);
    if(backup_set) {
        args.push("--ssl-cacert-file", clouds[backup_set.cloud].cert);
    } else {
        var res_cloud = $("#res-cloud").val();
        args.push("--ssl-cacert-file", clouds[res_cloud].cert);
    }
    if(force) args.push("--force");

    // call duplicity
    var wProcess = spawn(DUPLICITY_PATH, args);

    var output_str = "";
    function dup_call_out(data) {
        if(mode == "status") {
            toggle_msgs(data, "status_contents");
        } else if(mode == "remove") {
            toggle_msgs(data, "cleanup-msg");
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
            toggle_msgs(data, "msg");
            if(mode == "backup") {
                backup_set.last_status = "Running";
            }
        }
    }

    function dup_call_err(data) {
        if(mode == "remove") {
            toggle_msgs(data, "cleanup-msg");
            $("#force-delete").hide();
        } else {
            toggle_msgs(data, "msg");
        }
    }

    function dup_call_exit(code) {
        console.log("exit code === " + code);
        $("#loader").hide();
        if(mode == "backup") {
            disable_actions(false);
            if(code == 0) {
                show_alert_box("Successfully completed", "success", true);
                backup_set.last_status = "Completed";
                backup_set.last_backup = new Date();
                if(typeof backup_set.first_backup == 'undefined') {
                    backup_set.first_backup = new Date();
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
            } else {
                check_restore_errors(code);
            }
        } else if(mode == "timeview") {
            if(code == 0) {
                parse_collection_status(output_str);
            } else if(code == DUP_ERR_CODES.CONNECTION_FAILED) {
                show_cloud_error();
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
