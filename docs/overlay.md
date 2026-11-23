# Overlay - status indicator, crosshair, toast boxes

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

### [Status Indicator - simple overlay for in game control]

- `<arg>-status_indicator=*size in pixel*`
- can be used as default argument and in focus groups - per-focus values are applied while the GUI loop is running
  - the GUI loop itself only starts if `-status_indicator` or `-tray_icon` is enabled at startup
  - see picture above - just a small dot that changes based on being active to green and on inactive to red
  - right mouse click opens the menu
  - double left mouse click or middle mouse click will open the config file
  - left mouse drag moves it anywhere; a resolution or scale change keeps that RELATIVE position (the same fraction of the screen, clamped fully on-screen) - never dragged, it stays at the startup top-right corner

### [Crosshair] as function of the GUI overlay
- `<arg>-crosshair` or `<arg>-crosshair=*pixel delta x*,*pixel delta y*`
  - displays a simple crosshair as overlay and can be controlled on a per game basis
- needs the GUI loop to be started at startup - via `-status_indicator` or via `-tray_icon` alone
  - the tray icon menu offers "Toggle Crosshair", so it can also be toggled without a status indicator

### [Toast boxes] - geometry of the toast messages
- the toast row hangs below the status indicator; the toast BOX WIDTH fits its text (#464)
  - the width source is the measured text (the same font metrics the wrapping uses) plus a 4 px buffer on each side, clamped to `[8 characters, 480 px]`
  - so a short message like `mm` gets a small box; a long text grows to the 480 px cap and WRAPS into multiple lines there
  - the minimum is 8 monospace characters of the toast font, so it scales with the font size; 480 px is the `TOAST_TEXT_MAX_WIDTH` cap
- the EXTEND DIRECTION follows the screen half the cycle sits on
  - cycle on the RIGHT half: the box extends LEFT from it (the long-standing behavior)
  - cycle on the LEFT half: the box extends RIGHT, away from the screen edge
  - a cycle centered exactly on the screen midline counts as the right half
- the TEXT ALIGNMENT mirrors the same side: right-bounded text while the cycle is on the right (the text hugs the cycle), left-bounded while it is on the left - direction and alignment always flip together
- a resolution or scale change re-anchors the row under the moved indicator and re-mirrors the live toasts to the new side


