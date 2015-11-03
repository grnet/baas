call nwbuild -p win64 -v 0.12.3 baas
copy build\baas\win64\* build
cmd /c "rd /s /q build\baas"
copy src\timeview.py .\build
