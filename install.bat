@echo off
TITLE StyroCut software installation
cd Installation
@echo on

node-v14.16.0-x64.msi
python-2.7.18.amd64.msi
cmake-3.19.0-rc3-win64-x64.msi

cd ..
node install .


@echo off
pause