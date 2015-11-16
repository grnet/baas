export PATH=/usr/bin:$PATH

cd "$(dirname "$0")"
ROOTPATH=$(pwd)
CYGWIN=$ROOTPATH/build/cygwin
cd $CYGWIN

rm -r usr/share/doc # 26M
find usr/share/locale/ -maxdepth 1 -mindepth 1 | grep -v en | xargs rm -r # 39M
rm -r usr/share/groff # 5M
rm -r usr/share/man/* # 3M
rm -r usr/share/info/* # 2M
cd bin && rm dumper.exe objdump.exe as.exe lynx.exe ld.exe ld.bfd.exe strip.exe objcopy.exe gprof.exe && cd ..

