:: the arguments except -file= should be used in the FSTconfig.txt file
:: use e.g. <arg>-nomenu

@echo off
.\free_snap_tap.exe ^
::-debug ^
::-file=FSTconfig.txt ^
::-crossover=20 ^
-tapdelay=5,2 ^
-aliasdelay=5,2 ^
::-nomenu ^
::-nocontrols ^
::-nodelay ^
-status_indicator=20
::-crosshair

pause