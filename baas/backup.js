
var container = "";

var errors = {
    backup_name_empty: 'Provide a Backup Name',
    backup_name_illegal: 'Invalid Entry. Name must start with '
        + '\'Backup_\' and followed by characters [A-Za-z0-9-_]',
    cloud_empty: 'Select cloud configuration',
    dir_not_chosen : 'Provide a local directory',
    res_file_illegal: 'Invalid Entry. Provide a valid file name',
    path_empty: 'Provide a path',
    passphrase_empty: 'Provide a Passphrase'
};


function check_directory(dir_id) {
    if(!$('#' + dir_id).html()) {
        $('#' + dir_id + '-error small').text(errors.dir_not_chosen);
        $('#' + dir_id + '-error small').show();
        return false;
    } else $('#' + dir_id + '-error small').hide();
    return true;
}


function hide_error_divs() {
    $('#backup-name-error small').hide();
    $('#res-backup-name-error small').hide();
    $('#directory-error small').hide();
    $('#res-directory-error small').hide();
    $('#cloud-error small').hide();
    $('#res-cloud-error small').hide();
    $('#passphrase-error small').hide();
    $('#res-passphrase-error small').hide();
    $('#exclude-error small').hide();
    $('#include-error small').hide();
    $('#res-file-error small').hide();
    $('#timestamp-error small').hide();
    $('#time-head-error small').hide();
}

function load_backup(backup) {
    $(".tabs").show();
    $(".tabs-content").show();
    $('#backup_details_tab').addClass('active');
    $('#msg').html('');
    $('#msg').removeClass('panel');
    $("#time-dates").html("");
    $("#time-contents").html("");
    $("#time-path").val("/");

    hide_error_divs();

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
        selected_backup = "";
        $("#selected-bar").hide();
        $("#backup-name").val('Backup_');
        $("#directory").html('');
        $("#res-directory").html('');
        $("#cloud").val('');
        $("#passphrase").val('');
        $("#exclude").val('');
        $("#include").val('');
        disable_form(false);
        disable_actions(true);
    }
    $("#backup_details").show();
}

function save_backup_set() {
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    var directory = $("#directory").html();
    var cloud = $("#cloud").val();
    var save_pass = $("#save_passphrase").is(":checked");
    var passphrase = (save_pass) ? $("#passphrase").val() : "";
    var exclude = $("#exclude").val();
    var include = $("#include").val();

    var backup_set = {};
    backup_set.name = backup_name;
    backup_set.local_dir = directory;
    backup_set.cloud = cloud;
    backup_set.passphrase = passphrase;
    backup_set.container = backup_name;
    container = backup_set.container;
    backup_set.exclude = exclude;
    backup_set.include = include;
    backups[backup_name] =  backup_set;
    render_backup_sets("");

    write_conf_file(BACKUP_CONF_FILE, backups);
    activate_li("li_" + backup_name);
}

function delete_backup(backup) {
    delete backups[backup.name];
    render_backup_sets("");
    write_conf_file(BACKUP_CONF_FILE, backups);
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
    write_conf_file(BACKUP_CONF_FILE, backups);
}

