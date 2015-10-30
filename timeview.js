
function show_contents_by_date(error, stdout, stderr) {
    $("#timeview-contents-list").empty();
    if(error) $("#msg").html(error);
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
        var li = $("<li>&nbsp;" + el.name + "&nbsp;</li>")
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
    $("#time-contents").html(ul);
}

function go_to_restore(name) {
    $("#res-directory").html(path.join(get_user_home(), "Backups"));
    var time_path = $("#time-path").val();
    if(time_path != "/") time_path += "/";
    if(time_path.startsWith("/")) time_path = time_path.replace("/", "");

    $("#res-file").val(time_path + name);
    $("#timestamp").val(selected_date);
    $("#restore_details_link").trigger("click");
}

function show_rest_icon(name) {
    $("#rest_icon_" + name).removeClass("hide");
    $("#rest_icon_" + name).addClass("fa fa-cloud-download");
}

var init_path = "";
function open_folder(name) {
    $("#time-path").val(init_path + name);
    get_contents_by_date(selected_date);
}

var selected_date = "";
function get_contents_by_date(value) {
    selected_date = value;

    var time_path = $("#time-path").val();
    if(time_path != "/") {
        init_path = time_path + "/";
    } else {
        init_path = time_path;
    }
    if(!time_path) {
        $("#time-head-error small").text(errors.path_empty);
        $("#time-head-error small").show();
        return;
    } else {
        $("#time-head-error small").text('');
        $("#time-head-error small").hide();
    }

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
                        + iso_time + "\")'>" + value.replace('.', ' ') + "</a><br>";
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

