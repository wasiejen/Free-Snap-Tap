@echo off
:: activate virtual environment
call ./.venv/Scripts/activate.bat
:: update requirements.txt
pip3 freeze > requirements.txt
:: create exe
pyinstaller --onefile --icon=./icons/keyboard.ico free_snap_tap.py %*
:: move exe to current directory
cd ./dist
move /y free_snap_tap.exe ../
pause
