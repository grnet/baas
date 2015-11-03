.\install.bat
nwbuild -p win64 -v 0.12.3 baas
cp build\baas\win64\* build
rm -r build\baas
cp src\timeview.py .\build
