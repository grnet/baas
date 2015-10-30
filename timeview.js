
function show_contents_by_date(error, stdout, stderr) {
    $("#timeview-contents-list").empty();
    if(error) $("#msg").html(error);
    var ul = $("<ul></ul>")
        .attr("class", "no-bullet")
        .attr("id", "timeview-contents-list");
    var contents = JSON.parse(stdout);
    $.each(contents, function(i, el) {
        var f = (el.type == 'dir') ?
            "open_folder('" + el.name + "')" : "";
        var el_link = $("<a></a>")
            .attr("href", "#")
            .attr("onclick", f);
        var li = $("<li>&nbsp;" + el.name + "</li>")
            .attr("id", el.name);
        var icon_class = (el.type == 'dir')
            ? "fa fa-folder yellow-folder left" :
            "fa fa-file-text-o green-file left";
        var icon = $("<i></i>")
            .attr("class", icon_class);

        li.append(icon);
        el_link.append(li);
        ul.append(el_link);
    });
    $("#loader").hide();
    $("#time-contents").html(ul);
}

function open_folder(name) {
    var time_path = $("#time-path").val();
    $("#time-path").val(time_path + name + "/");
}

function get_contents_by_date(value) {
    $("#loader").show();
    var time_path = $("#time-path").val();
    if(!time_path) {
        $("#time-head-error small").text(errors.path_empty);
        $("#time-head-error small").show();
        return;
    } else {
        $("#time-head-error small").text('');
        $("#time-head-error small").hide();
    }
    var container = null;
    var backup_name = $("#backup-name").val().replace(/^\s+|\s+$/gm,'');
    $.each(backups, function(i, backup_set) {
        if(backup_set.name == backup_name) {
            container = backup_set.container;
        }
    });

    var time_cmd = "python src/timeview.py timeviews/ swift://" +
            container + " get " + value + " " + time_path
    if(process.platform == 'win32') {
        var cmd = build_win_commands();
        exec(CYGWIN_BASH + " -c '" + cmd + time_dup_cmd + "'",
            show_contents_by_date);
    } else {
        exec(time_cmd, show_contents_by_date);
    }
}

function load_timeview() {
    $("#loader").show();
    $("#time-dates").html("");
    $("#time-contents").html("");

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
            var reg = "Num volumes:";
            var i = stdout.indexOf(reg);
            if(i > 0) {
                var sets = stdout.substring(i + reg.length);
                var datetime_reg = /(\d{4})(-)(\d{2})(-)(\d{2})(.)(\d{2})(:)(\d{2})(:)(\d{2})/g;
                var dates = sets.match(datetime_reg);
                dates = dates.sort();
                var dates_list = "";
                $.each(dates, function(i, value) {
                    dates_list += "<a href='#' onclick='get_contents_by_date(\""
                        + value.replace('.', 'T') + "\")'>" + value.replace('.', ' ') + "</a><br>";
                });
                $("#time-dates").html(dates_list);
            }
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

