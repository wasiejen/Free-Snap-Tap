@echo off
python .\free_snap_tap.py ^
::-debug ^
::-tapfile=my_taps.txt ^
::-keyfile=my_keys.txt ^
-crossover=50 ^
-delay=10,2 ^
::-nomenu ^
::-nocontrols ^
::-nodelay ^

pause