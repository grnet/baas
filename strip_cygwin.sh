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

export PATH=/usr/bin:$PATH

cd "$(dirname "$0")"
ROOTPATH=$(pwd)
CYGWIN=$ROOTPATH/build/cygwin
cd $CYGWIN

rm -r usr/share/doc # 26M
find usr/share/locale/ -maxdepth 1 -mindepth 1 | grep -v en | xargs rm -r # 39M
rm -r usr/share/man/* # 3M
rm -r usr/share/info/* # 2M
cd bin && rm dumper.exe objdump.exe as.exe lynx.exe ld.exe ld.bfd.exe strip.exe objcopy.exe gprof.exe && cd ..

