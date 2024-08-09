@echo off
pyinstaller --onefile --icon=./icons/keyboard.ico free_snap_tap.py %*
cd ./dist
move /y free_snap_tap.exe ../
pause

:: C:\Users\wasiejen\Desktop