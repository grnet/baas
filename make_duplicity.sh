#!/usr/bin/env bash
# Copyright (C) 2015-2016 GRNET S.A.
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

OS_NAME=$(uname -s)
if [ $? -ne 0 ]; then
    OS_NAME=$(/bin/uname -s)
fi
OS_NAME=${OS_NAME:0:6}

if [[ "$OS_NAME" = "CYGWIN" ]]
then
    export PATH=/usr/bin:$PATH
fi

cd "$(dirname "$0")"
ROOTPATH=$(pwd)
BUILDDIR=$ROOTPATH/build
mkdir -p $BUILDDIR

if [ -z "$1" ]
  then
    echo "Downloading duplicity"
    cd $BUILDDIR
    rm -rf duplicity-0.7.05*
    wget https://launchpad.net/duplicity/0.7-series/0.7.05/+download/duplicity-0.7.05.tar.gz
    tar xzvf duplicity-0.7.05.tar.gz
    cd duplicity-0.7.05
    SRCPATH=$(pwd)
  else
    cd $1
    SRCPATH=$(pwd)
fi

cd $ROOTPATH
echo $(pwd)
echo $SRCPATH

DUPL=$BUILDDIR/duplicity
echo building under $DUPL
rm -rf $DUPL
mkdir -p $DUPL/lib
WHEELHOUSE=$DUPL/wheelhouse
mkdir $WHEELHOUSE

easy_install-2.7 pip
pip install wheel
pip wheel lockfile -w $WHEELHOUSE
if [ $? -ne 0 ]; then
    exit 1
fi
pip wheel python-swiftclient -w $WHEELHOUSE

cd $WHEELHOUSE
for i in *; do unzip $i -d $DUPL/lib; done
cd $DUPL
rm -r $WHEELHOUSE

cd $SRCPATH
rm -rf build
patch -N -p0 < $ROOTPATH/src/duplicity-patches/timeview.patch
patch -N -p0 < $ROOTPATH/src/duplicity-patches/syspath.patch
patch -N -p0 < $ROOTPATH/src/duplicity-patches/cacert.patch
LIBRSYNC_DIR=/usr/local python setup.py build --executable="/usr/bin/env python"
cd build/lib.*
cp -pr * $DUPL/lib
cd ../scripts-2.7
cp -p duplicity $DUPL

if [[ "$OS_NAME" = "Darwin" ]]
then
    cd $DUPL/lib/duplicity
    LIBRSYNC=librsync.2.dylib
    LIBRSYNC_PATH=/usr/local/opt/librsync/lib/$LIBRSYNC
    cp $LIBRSYNC_PATH .
    chmod +w $LIBRSYNC
    install_name_tool -change $LIBRSYNC_PATH @loader_path/$LIBRSYNC _librsync.so
fi

echo built in $DUPL
echo must be used with PYTHONPATH=$DUPL/lib
