@echo off
:: activate virtual environment
call ./.venv/Scripts/activate.bat
pause
python .\free_snap_tap.py ^
::-debug ^
-file=FSTconfig_test.txt 

pause