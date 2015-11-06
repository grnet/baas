if not exist "%~dp0\build\cygwin" mkdir %~dp0\build\cygwin
if not exist "%~dp0\build\cygwin\packages" mkdir %~dp0\build\cygwin\packages
.\setup-x86_64.exe -q -Y -N -n -d -R %~dp0\build\cygwin -l %~dp0\build\cygwin\packages -s ftp://ftp.snt.utwente.nl/pub/software/cygwin/ -P python,gnupg,librsync-devel,librsync1,wget,python-setuptools,gcc-core,gcc,patch,unzip
