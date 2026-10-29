@echo off
:: Activate virtual environment
call ./.venv/Scripts/activate.bat

:: NOTE: requirements files are maintained by hand (runtime / dev / build
:: split) — do NOT write `pip freeze` over them: the build venv also holds
:: packaging and test tools, which belong in requirements-build/-dev.txt.

:: Build with Nuitka
python -m nuitka free_snap_tap.py 

:: --- Rename and move executable ---
:: Define source (dist) and destination (current dir)
set src=free_snap_tap_nuitka.exe
set dest=.

:: Get current date and time in YYMMDD-HHMM format.
:: wmic is deprecated/removed on Windows 11 24H2+, so use PowerShell here.
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyMMdd-HHmm"') do set filedate=%%a

:: Define new filename (with date/time suffix)
set newname=free_snap_tap_nuitka_%filedate%.exe

:: Check if source file exists
if exist %src% (
    :: Move and rename the file
    copy /y %src% %dest%\free_snap_tap_nuitka_.exe
    move /y %src% %dest%\%newname%
    echo Moved and renamed: %newname%
) else (
    echo ERROR: Source file not found: %src%
)

pause