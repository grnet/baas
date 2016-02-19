# BaaS

Backup as a Service

## Build instructions

### Cygwin installation and setup
To build a package on Windows you need cygwin.

1. Download Cygwin setup.exe from https://www.cygwin.com/setup-x86_64.exe in
this directory.
2. Run `make_cygwin.bat build` to install the environment we need to build
duplicity under `build\cygwin_build`.
3. Run `make_cygwin.bat dist` to build a smaller instance needed for
deployment under `build\cygwin`.

### Install Node.js and npm

1. Install Node.js from https://nodejs.org/en/
2. Make sure that npm is also installed.
3. Install nw-builder : npm -g install nw-builder

* Note that on some systems node executable is installed as nodejs, and
  nw-builder fails to start. You will need to change the first line of
  /usr/local/bin/nwbuild to look for nodejs.

### Build duplicity

1. You will need python and gnupg. Make sure you have librsync-dev
installed. On Windows, these are provided by cygwin installed previously.
2. Run make_duplicity.sh; this will build duplicity and collect its
dependencies under build/duplicity. Note that on Windows you need to run it
with build\cygwin_build\bin\bash.exe.

* If it fails to find librsync, specify its location by setting variable
  LIBRSYNC_DIR before running the script.

### Build the package

1. Run make_package.sh <platform> (again, with
build\cygwin_build\bin\bash.exe on Windows) to build the nwjs application
and collect everything under dist/baas (or dist/baas.app on OSX)

2. Run python bundle.py <platform> to make a tar.gz (for Linux) or zip
archive (for Windows and OSX). On Windows it must be run as
build\cygwin_build\bin\bash.exe -c "/usr/bin/python bundle.py <platform>"

## Copyright and license

Copyright (C) 2015-2016 GRNET S.A.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
