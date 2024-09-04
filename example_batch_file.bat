@echo off
.\free_snap_tap.exe ^
::-debug ^
::-file=FSTconfig.txt ^
-crossover=20 ^
-tapdelay=5,2 ^
-aliasdelay=5,2 ^
::-nomenu ^
::-nocontrols ^
::-nodelay ^
::-focusapp=count 

pause