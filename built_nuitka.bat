@echo off
:: Activate virtual environment
call ./.venv/Scripts/activate.bat

:: Update requirements.txt (optional)
pip3 freeze > requirements.txt

:: Build with Nuitka
python -m nuitka free_snap_tap.py 

:: --- Rename and move executable ---
:: Define source (dist) and destination (current dir)
set src=free_snap_tap_nuitka_.exe
set dest=.

:: Get current date and time in YYMMDD-HHMM format
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set datetime=%%a
set filedate=%datetime:~2,6%-%datetime:~8,4%
set filedate=%filedate: =0%

:: Define new filename (with date/time suffix)
set newname=free_snap_tap_nuitka_%filedate%.exe

:: Check if source file exists
if exist %src% (
    :: Move and rename the file
    copy /y %src% %dest%
    move /y %src% %dest%\%newname%
    echo Moved and renamed: %newname%
) else (
    echo ERROR: Source file not found: %src%
)

pause