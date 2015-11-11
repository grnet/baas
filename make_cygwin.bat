@echo off
set MIRROR=ftp://ftp.snt.utwente.nl/pub/software/cygwin/
set PACKAGES=python,gnupg,librsync2,python-setuptools
set NAME=cygwin

if "%1" == "build" (
set NAME=%NAME%_build
set PACKAGES=%PACKAGES%,librsync-devel,wget,gcc-core,gcc,patch,unzip
) else (
if not "%1" == "dist" (
@echo Must give option build or dist
goto end
))

set BUILD=%~dp0%build
set CYGWIN=%BUILD%\%NAME%
set CACHE=%BUILD%\cygwin_packages
@echo %CYGWIN%
@echo %CACHE%
@echo %PACKAGES%
if not exist %CYGWIN% mkdir %CYGWIN%
if not exist %CACHE% mkdir %CACHE%
.\setup-x86_64.exe -q -Y -N -n -d -R %CYGWIN% -l %CACHE% -s %MIRROR% -P %PACKAGES%
:end
