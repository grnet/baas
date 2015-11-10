
function go_to_restore(name) {
    g_res_directory = path.join(get_user_home(), "Backups");
    var time_path = $("#time-path").val();
    if(time_path != "/") time_path += "/";
    if(time_path.startsWith("/")) time_path = time_path.replace("/", "");

    g_res_file = time_path + name;
    g_timestamp = selected_date;

    $("#restore-tab-link").trigger("click");
}

function show_contents_by_date(error, stdout, stderr) {
    $("#time-contents").empty();

    var ul = $("<ul></ul>")
        .attr("class", "no-bullet")
        .attr("id", "timeview-contents-list");
    var contents = JSON.parse(stdout);
    $.each(contents, function(i, el) {
        var f = "open_folder('" + el.name + "')";
        var restore_f = "show_rest_icon('" + i + "')";
        var el_link = $("<a></a>")
            .attr("href", "#")
            .attr("onclick", restore_f);
        if(el.type == 'dir') {
            el_link.attr("ondblclick", f);
        }
        var locale_date = new Date(el.timestamp).toLocaleString();
        var li = $("<li>&nbsp;<span>" + el.name + "&nbsp;</span><span class='right'>"
            + locale_date + "</span></li>")
            .attr("id", el.name);
        var icon_class = (el.type == 'dir')
            ? "fa fa-folder yellow-folder left" :
            "fa fa-file-text-o green-file left";
        var icon = $("<i></i>")
            .attr("class", icon_class);
        var rest_icon = $("<i></i>")
            .attr("id", "rest_icon_" + i)
            .attr("title", "Restore")
            .attr("class", "hide")
            .attr("onclick", "go_to_restore('" + el.name + "')");

        li.append(icon);
        li.append(rest_icon);
        el_link.append(li);
        ul.append(el_link);
    });

    $("#time-contents").append(ul);
    $("#loader").hide();
}

function show_rest_icon(name) {
    $("#rest_icon_" + name).removeClass("hide");
    $("#rest_icon_" + name).addClass("fa fa-download");
}

var init_path = "";
function open_folder(name) {
    $("#time-path").val(init_path + name);
    get_contents_by_date(selected_date);
}

function go_to_path(cur_path) {
    if( cur_path != "/") {
        cur_path = cur_path.slice(0,-1);
    }
    $("#time-path").val(cur_path);
    get_contents_by_date(selected_date);
}

function fill_breadcrumbs(path) {
    $(".breadcrumbs").empty();
    var path_parts = [];
    if(path != "/") {
        path_parts = path.split("/");
    } else {
        path_parts = [path];
    }
    var len = path_parts.length;
    var cur_path = "";
    $.each(path_parts, function(i, value) {
        if(value == "/" || !value) {
            value = "ROOT";
            cur_path = "/";
        } else {
            cur_path += value + "/";
        }
        var li_crumb = $("<li></li>");
        if(i == len-1) {
            li_crumb.addClass("current");
        }
        var a_crumb = $("<a>" + value + "</a>")
            .attr("href", "#")
            .attr("onclick", "go_to_path('" + cur_path + "')");
        li_crumb.append(a_crumb);
        $(".breadcrumbs").append(li_crumb);
    });
}

var selected_date = "";
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
    selected_date = value;
    fill_breadcrumbs(time_path);
    if(time_path != "/") {
        init_path = time_path + "/";
    } else {
        init_path = time_path;
    }
    var time_script = path.join(exec_path, 'timeview.py');
    var datapath = path.join(BAAS_CACHE_DIR, 'timeviews');

    if(process.platform == 'win32') {
        time_script = time_script.replace(/\\/g, "\\\\");
        exec(CYGWIN_BASH + " -c \"/usr/bin/cygpath '" + time_script + "' \"",
            function(error, stdout, stderr) {
                time_script = String(stdout).replace(/(\r\n|\n|\r)/gm, "");
                if(error) $("#msg").html(error);
                var cmd = build_win_commands();
                var time_cmd = "python " + time_script + " " + datapath + " swift://" +
                    container + " get " + value + " '" + time_path + "'"
                exec(CYGWIN_BASH + " -c '" + cmd + time_cmd + "'",
                    show_contents_by_date);
        });
    } else {
        var time_cmd = "python " + time_script + " " + datapath + " swift://" +
            container + " get " + value + " '" + time_path + "'"
        exec(time_cmd, show_contents_by_date);
    }
}

function load_timeview() {
    $("#backup_details").hide();
    $("#loader").show();

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
                    var iso_time = value.replace('.', 'T');
                    dates_list += "<a href='#' onclick='get_contents_by_date(\""
                        + iso_time + "\")' id='" + iso_time + "'>" + value.replace('.', ' ') + "</a><br>";
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

