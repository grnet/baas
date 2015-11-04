
var container = "";

function load_backup(backup) {
    $(".tabs").show();
    $(".tabs-content").show();
    $('#backup_details_tab').addClass('active');
    $('#backup-name-error small').hide();
    $('#directory-error small').hide();
    $('#res-directory-error small').hide();
    $('#cloud-error small').hide();
    $('#passphrase-error small').hide();
    $('#exclude-error small').hide();
    $('#include-error small').hide();
    $('#res-file-error small').hide();
    $('#timestamp-error small').hide();
    $('#time-head-error small').hide();
    $('#msg').html('');
    $('#msg').removeClass('panel');
    $("#time-dates").html("");
    $("#time-contents").html("");
    $("#time-path").val("/");


    if(backup) {
        container = backup.container;
        $("#backup-name").val(backup.name);
        $("#directory").html(backup.local_dir);
        $("#cloud").val(backup.cloud);
        $("#passphrase").val(backup.passphrase);
        if(backup.passphrase != "") {
            $("#save_passphrase").prop("checked", true);
        }
        if(backup.first_backup) {
            disable_form(true);
            disable_actions(false);
        } else {
            disable_actions(true);
            disable_form(false);
        }
        $("#exclude").val(backup.exclude);
        $("#include").val(backup.include);
    } else {
        container = "";
        $("#backup-name").val('');
        $("#directory").html('');
        $("#res-directory").html('');
        $("#cloud").val('');
        $("#passphrase").val('');
        $("#exclude").val('');
        $("#include").val('');
        disable_form(false);
        disable_actions(true);
        // de-activate all tabs
        activate_li("dummy");
    }
    $("#backup_details_link").trigger("click");
}

function save_backup_set() {
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    var directory = $("#directory").html();
    var cloud = $("#cloud").val();
    var save_pass = $("#save_passphrase").is(":checked");
    var passphrase = (save_pass) ? $("#passphrase").val() : "";
    var exclude = $("#exclude").val();
    var include = $("#include").val();

    if($("#" + backup_name).attr("id")) {
        $.each(backups, function(i, backup_set) {
            if(backup_set.name == backup_name) {
                backup_set.name = backup_name;
                backup_set.local_dir = directory;
                backup_set.cloud = cloud;
                backup_set.passphrase = passphrase;
                backup_set.exclude = exclude;
                backup_set.include = include;
            }
        });
    } else {
        var backup_set = {"name" : "", "local_dir" : "",
            "cloud" : "", "passphrase" : "", "container" : "",
            "first_backup" : "", "exclude" : "", "include" : "" };
        backup_set.name = backup_name;
        backup_set.local_dir = directory;
        backup_set.cloud = cloud;
        backup_set.passphrase = passphrase;
        backup_set.container = "Backup_" + backup_name;
        container = backup_set.container;
        backup_set.exclude = exclude;
        backup_set.include = include;
        backups.push(backup_set);
        render_backup_sets("");
    }
    var root_backup_sets = {"backups" : "" };
    root_backup_sets.backups = backups;
    write_conf_file(BACKUP_CONF_FILE, root_backup_sets);
    activate_li("li_" + backup_name);
}

function delete_backup(backup) {
    var i = backups.indexOf(backup);
    backups.splice(i, 1);
    render_backup_sets("");

    var root_backup_sets = {"backups" : "" };
    root_backup_sets.backups = backups;
    write_conf_file(BACKUP_CONF_FILE, root_backup_sets);
    $(".tabs").hide();
    $(".tabs-content").hide();
}

function write_first_backup() {
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    var first_backup = null;
    $.each(backups, function(i, backup_set) {
        if(backup_set.name == backup_name) {
            backup_set.first_backup = Date.now();
        }
    });
    var root_backup_sets = {"backups" : "" };
    root_backup_sets.backups = backups;
    write_conf_file(BACKUP_CONF_FILE, root_backup_sets);
}

