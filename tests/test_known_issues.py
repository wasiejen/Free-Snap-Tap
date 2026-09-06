"""Known issues deliberately left open.

Each xfail documents a *desired* behavior that does not hold yet. When the
issue is resolved, move the test into the regular test files and keep it
green. A removed test from this file means the behavior was reviewed and
accepted as-is (see AGENT_HANDOFF.md for the maintainer decisions).
"""
import pytest

from fst_data_types import Key_Event


@pytest.mark.xfail(
    reason="tabled (060926): Key_Event eq ignores constraints while the hash is based on the full repr. "
    "Whether eq and hash must agree is still an open design question - revisit once the suite covers dicts/sets of Key_Event"
)
def test_equal_key_events_have_equal_hash():
    pressed_1 = Key_Event('w', constraints=[100])
    pressed_2 = Key_Event('w', constraints=[200])
    assert pressed_1 == pressed_2
    assert hash(pressed_1) == hash(pressed_2)
