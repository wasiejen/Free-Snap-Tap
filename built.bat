@echo off
pyinstaller --onefile --icon=./icons/keyboard.ico free_snap_tap_txtgui.py %*
::pyinstaller --onefile --icon=./icons/keyboard.ico free_snap_tap.py %*
pause
