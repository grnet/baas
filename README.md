# BaaS

Backup as a Service

## Build instructions

### Build instructions for Windows

I. Cygwin installation and setup
    1. Download Cygwin setup.exe from https://www.cygwin.com/setup-x86_64.exe in this directory.
    2. Execute install.bat
        This will install Cygwin and prerequisite packages under .\build\cygwin.
        It will also download and install python-lockfile, duplicity and python-swiftclient.

II. Node.js
    1. Install Node.js from https://nodejs.org/en/
        Important: npm3 is required. To update:
        - cd %ProgramFiles%\nodejs
        - npm -g install npm@latest

    2. Install nw-builder : npm -g install nw-builder

III. Clone repo and build
    1. Get the code from the baas repo
    2. cd into baas directory
    3. nwbuild -p win64 -v 0.12.0 baas
    4. copy contents of build\baas\win64 folder into build directory

### Build instructions for Linux

I. Building duplicity
   1. You will need python, pip and gnupg.
   2. Make sure you have librsync-dev installed.
   3. pip install wheel.
   4. Download and unpack the latest duplicity source code from https://launchpad.net/duplicity/0.7-series
   5. Run make_duplicity.sh <path_to_duplicity_src>. This will build duplicity and collect its dependencies under build/duplicity. In order to run the executable build/duplicity/duplicity, you need to set PYTHONPATH=build/duplicity/lib.

## Copyright and license

Copyright (C) 2015 GRNET S.A.

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
