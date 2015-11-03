if not exist "%~dp0\build\cygwin" mkdir %~dp0\build\cygwin
if not exist "%~dp0\build\cygwin\packages" mkdir %~dp0\build\cygwin\packages
.\setup-x86_64.exe -q  -N -n -d -R %~dp0\build\cygwin -l %~dp0\build\cygwin\packages -s ftp://ftp.gabrys.biz/pub/cygwin -P python,gnupg,librsync-devel,librsync1,wget,python-setuptools,gcc-core,gcc
%~dp0\build\cygwin\bin\bash.exe %~dp0\install_duplicity.sh
