' this will start the program without opening the command line window and only starting it as a tray icon
' overlay can also be started

Set WshShell = CreateObject("WScript.Shell")

' Define the base command
command = "pythonw.exe .\Free-Snap-Tap\free_snap_tap.py"

' Add arguments one by one
command = command & " -file=FSTconfig.txt"
command = command & " -tray_icon" ' Add as many arguments as needed

' Run the command invisibly
WshShell.Run command, 0, False