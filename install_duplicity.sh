#!/bin/bash

cd ./build
export PATH=/usr/bin/:$PATH
wget https://pypi.python.org/packages/source/l/lockfile/lockfile-0.11.0.tar.gz#md5=494b449935f95f0f62e621b5f52640f8
gunzip lockfile-0.11.0.tar.gz
tar -xvf lockfile-0.11.0.tar
cd lockfile-0.11.0
python setup.py install

cd ..
wget https://code.launchpad.net/duplicity/0.6-series/0.6.26/+download/duplicity-0.6.26.tar.gz
gunzip duplicity-0.6.26.tar.gz
tar -xvf duplicity-0.6.26.tar
cd duplicity-0.6.26
python setup.py install

easy_install-2.7 pip
pip install python-swiftclient
