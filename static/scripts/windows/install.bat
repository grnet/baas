if not exist "%~dp0\build" mkdir %~dp0\build 
if not exist "%~dp0\build\packages" mkdir %~dp0\build\packages 
#.\setup-x86_64.exe -q  -N -n -d -R %~dp0\build -l %~dp0\build\packages -s ftp://ftp.gabrys.biz/pub/cygwin -P python,gnupg,librsync-devel,librsync1,wget,python-setuptools,gcc-core,gcc
%~dp0\build\bin\bash.exe %~dp0\install_duplicity.sh
