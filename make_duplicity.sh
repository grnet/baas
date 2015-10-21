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

PLATFORM=linux-x86_64

if [ -z "$1" ]
  then
    echo "Usage: $0 <path_to_duplicity_src>"
    exit
fi

cd "$(dirname "$0")"
ROOTPATH=$(pwd)
cd $1
SRCPATH=$(pwd)
cd $ROOTPATH
echo $(pwd)
echo $SRCPATH

BUILDDIR=$ROOTPATH/build
DUPL=$BUILDDIR/duplicity
echo building under $DUPL
rm -rf $DUPL
mkdir -p $DUPL
WHEELHOUSE=$DUPL/wheelhouse

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
python setup.py build
cd build/lib.${PLATFORM}-2.7
cp -pr * $DUPL/lib
cd ../scripts-2.7
cp -p duplicity $DUPL

echo built in $DUPL
echo must be used with PYTHONPATH=$DUPL/lib
