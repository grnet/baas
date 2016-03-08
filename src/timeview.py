# Copyright (C) 2015-2016 GRNET S.A.

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from os import listdir, makedirs
from os.path import exists, isdir
import os
from subprocess import Popen, PIPE
import json
import errno


path_types = {'reg', 'dir', 'sym', 'fifo', 'sock', 'chr', 'blk'}


def path_join(base, *args):
    slash = base[0:1]
    if slash != '/':
        slash = ''
    base = slash + base.strip('/') + '/'
    return base + '/'.join(str(x).strip('/') for x in args)


def timestamp_rfc822_to_iso8601(string):
    from email.utils import parsedate
    year, month, day, hour, minute, second, _, _, _ = parsedate(string)
    return "%04u-%02u-%02uT%02u:%02u:%02u" % (
        year, month, day, hour, minute, second)


def print_listing(openfile, root, path=()):
    openfile.write(root.get('timestamp', "- -")
                   + ' ' +  root.get('type', '-')
                   + ' ' + '/'.join(path) + '\0\n')
    for name, entry in root['entries'].iteritems():
        print_listing(openfile, entry, path=path + (name,))


def put_timepoint(config, timepoint, data):
    root = {'entries': {}}
    lines = data.split('\0')
    for i, line in enumerate(lines):
        if i & 1 == 0:
            continue
        line.strip('\n').strip('\0')
        if not line:
            continue

        parts = line.split(' ', 2)
        entry_type = parts[0]
        if entry_type not in path_types:
            continue

        timestamp = ' '.join(parts[1:-1])
        segments = parts[-1].split('/')
        node = root
        for segment in segments:
            entries = node['entries']
            if segment not in entries:
                entries[segment] = {'entries': {}}
            node = entries[segment]

        node['timestamp'] = timestamp
        node['type'] = entry_type

    datafile = path_join(config['datapath'], timepoint)
    with open(datafile, "w") as f:
        f.write(json.dumps(root, indent=2))


def fetch_timepoint(config, timepoint):
    curpath = os.path.dirname(os.path.realpath(__file__))
    duplicity = os.path.join(curpath, 'duplicity')
    args = [duplicity, 'list-current-files', '-t', timepoint,
            '--ssl-cacert-file', config['cacert_file'],
            '--archive-dir', config['archive_dir'],
            '--gpg-homedir', config['gpg_homedir'],
            '--log-file', config['log_file'],
            '--name', config['backup_name'],
            config['target_url']]

    proc = Popen(args, stdout=PIPE, stderr=PIPE)
    procout, procerr = proc.communicate()
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(procerr)

    put_timepoint(config, timepoint, procout)


def get_timepoint(config, timepoint, path):
    datafile = path_join(config['datapath'], timepoint)
    retries = 1
    while True:
        try:
            with open(datafile) as f:
                data = f.read()
            break
        except IOError as e:
            if e.errno != errno.ENOENT or retries == 0:
                raise

        fetch_timepoint(config, timepoint)
        if retries <= 0:
            raise e
        retries -= 1

    node = json.loads(data)
    path = path.strip('/').split('/')
    for i in xrange(len(path)):
        segment = path[i]
        if not segment:
            continue

        entries = node['entries']
        if segment not in entries:
            return []

        node = entries[segment]

    return sorted({'name': name,
                   'type': entry['type'],
                   'timestamp': entry['timestamp']}
                  for name, entry in node['entries'].iteritems())


def ensure_datapath(datapath):
    if not exists(datapath):
        makedirs(datapath)
    elif not isdir(datapath):
        m = "%r not a directory" % datapath
        raise IOError(m)


def get_config():
    with open("timeview.config") as f:
        data = f.read()

    config = literal_eval(data)
    datapath = config['datapath']
    ensure_datapath(datapath)
    return config


def main():
    from sys import argv, stdin, stdout
    def help():
        print "Usage: %s <datapath> <target_url> <cacert_file> <archive_dir> <gpg_homedir> <log_file> <backup_name> [get <absolute_timepoint> <path> | list]" % argv[0]
        raise SystemExit(1)

    if len(argv) < 9:
        help()

    datapath = argv[1]
    ensure_datapath(datapath)
    target_url = argv[2]

    cmd = argv[8]
    if cmd not in ['get', 'list']:
        help()

    cacert_file = argv[3]
    archive_dir = argv[4]
    gpg_homedir = argv[5]
    log_file = argv[6]
    backup_name = argv[7]
    #config = get_config()
    config = {'datapath': datapath,
            'target_url': target_url,
            'cacert_file': cacert_file,
            'archive_dir': archive_dir,
            'gpg_homedir': gpg_homedir,
            'log_file': log_file,
            'backup_name': backup_name}

    if cmd == 'get':
        if len(argv) < 11:
            help()

        timepoint = argv[9]
        path = unicode(argv[10], encoding='UTF-8')
        r = get_timepoint(config, timepoint, path)
        print json.dumps(r, indent=2)

    elif cmd == 'list':
        print json.dumps(sorted(listdir(config['datapath'])), indent=2)

    else:
        help()


if __name__ == "__main__":
    main()
