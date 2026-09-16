// for me (maintainer) to track what bugs I found. I switched now to live testing FST when possible

# 1 GUI BUG
when right clicking on the status indicator to open the context menu. no menu opens and Error raised.

Error calling Python override of QWidget::contextMenuEvent(): Traceback (most recent call last):
  File "C:\Users\Wasiejen\Projects\OpenCodeProjects\Free-Snap-Tap\Free-Snap-Tap\fst_overlay.py", line 595, in contextMenuEvent
    self.context_menu.exec_(event.globalPosition().toPoint())
                            ^^^^^^^^^^^^^^^^^^^^
AttributeError: 'PySide6.QtGui.QContextMenuEvent' object has no attribute 'globalPosition'
