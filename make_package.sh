#!/usr/bin/env bash
# Copyright (C) 2015 GRNET S.A.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

OS_NAME=$(/bin/uname -s)
OS_NAME=${OS_NAME:0:6}

if [[ "$OS_NAME" = "CYGWIN" ]]
then
    export PATH=/usr/bin:$PATH
fi

if [ -z "$1" ]
  then
    echo "Usage: $0 <platform> (can be win32,win64,osx32,osx64,linux32,linux64)"
    exit
fi

PLATFORM=$1

NW_VERSION=0.12.3

cd "$(dirname "$0")"
ROOTPATH=$(pwd)

cd baas
npm install
cd ..

rm -rf build/baas
nwbuild -p $PLATFORM -v $NW_VERSION baas

DIST=dist/baas
rm -rf $DIST; mkdir -p $DIST

echo Copying baas
cp -r build/baas/$PLATFORM/* $DIST
cp src/timeview.py $DIST
echo Copying duplicity
cp -r build/duplicity/* $DIST

if [[ "$OS_NAME" = "CYGWIN" ]]
then
  echo Copying cygwin
  cp -r build/cygwin $DIST
fi

echo Built under $DIST
