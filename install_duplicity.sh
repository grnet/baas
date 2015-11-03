#!/bin/bash

cd ./build
export PATH=/usr/bin/:$PATH
easy_install-2.7 pip
pip install python-swiftclient
pip install lockfile

wget https://code.launchpad.net/duplicity/0.6-series/0.6.26/+download/duplicity-0.6.26.tar.gz
tar xzvf duplicity-0.6.26.tar
cd duplicity-0.6.26
python setup.py install
cd ..
rm -r duplicity-0.6.26
