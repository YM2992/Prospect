@echo off
TITLE StyroCut software dependencies installation wizard
cd Installation

set /p nodejsInstalled="Is NodeJS installed? (y/n): "
if %nodejsInstalled%==n (
    echo Running NodeJS installation wizard ..
    START %cd%\node-v14.16.0-x64.msi
)

set /p pythonInstalled="Is python 2.7.18 installed? (y/n): "
if %pythonInstalled%==n (
    echo Running Python 2.7.18 installation wizard ..
    START %cd%\python-2.7.18.amd64.msi
)

set /p cmakeInstalled="Is CMake installed? (y/n): "
if %cmakeInstalled%==n (
    echo Running CMake installation wizard ..
    START %cd%\cmake-3.19.0-rc3-win64-x64.msi
)

set /p npmLibrariesInstalled="Are required npm libraries installed? (y/n): "
if %npmLibrariesInstalled%==n (
    cd ..
    npm install .
    echo Successfully installed Node libraries ..
    echo Installation complete
)


echo.
echo.
echo.

echo " _____ _              _                      __                   _             ___ _                 ___     _   _ "
echo "|_   _| |_  __ _ _ _ | |__  _  _ ___ _  _   / _|___ _ _   _  _ __(_)_ _  __ _  / __| |_ _  _ _ _ ___ / __|  _| |_| |"
echo "  | | | ' \/ _` | ' \| / / | || / _ \ || | |  _/ _ \ '_| | || (_-< | ' \/ _` | \__ \  _| || | '_/ _ \ (_| || |  _|_|"
echo "  |_| |_||_\__,_|_||_|_\_\  \_, \___/\_,_| |_| \___/_|    \_,_/__/_|_||_\__, | |___/\__|\_, |_| \___/\___\_,_|\__(_)"
echo "                            |__/                                        |___/           |__/                        "

echo.
echo.
echo.

pause