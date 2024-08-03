
import keyboard

# Initialize the Controller
#controller = keyboard.Controller()


def on_key_event(event):
	if event.name == 'a':
		if event.event_type == 'down':
			print('down')
			#controller.press('d')
		elif event.event_type == 'up':
			#controller.release('d')
			print('up')









# Hook the keyboard events
keyboard.block_key('a')
keyboard.hook(on_key_event)

keyboard.wait('esc')

# Unhook all keyboard events when the GUI is closed
#keyboard.unhook_all()