@echo off
pyinstaller --onefile --icon=./icons/keyboard.ico free_snap_tap.py %*
cd ./dist
move /y free_snap_tap.exe ../
pause




:: After writing the code you want to convert the file from .py to .exe, so possibly you will use pyinstaller and it is good to make exe file. So you can hide the console in this way:
:: 
:: pyinstaller --onefile main.py --windowed
:: 
:: I used to this way and it works.