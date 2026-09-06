from pathlib import Path

import pytest

from fst_manager import Config_Manager

# SMOKE test, not a behavioral spec: the maintainer's real config (~1600 lines, local file, gitignored)
# must parse and presort cleanly after parser changes. Only aggregate counts are pinned.
BIG_CONFIG_PATH = Path(__file__).resolve().parents[1] / 'FSTconfig_test.txt'


def test_big_config_parses():
    if not BIG_CONFIG_PATH.exists():
        pytest.skip('FSTconfig_test.txt not present')

    cm = Config_Manager(str(BIG_CONFIG_PATH))
    multi_focus, default_args, default_lines = cm.load_config()

    total_taps = 0
    total_rebinds = 0
    total_macros = 0
    total_aliases = 0
    for name in multi_focus:
        cm.presort_lines(default_lines + multi_focus[name][1])
        total_taps += len(cm.tap_groups_hr)
        total_rebinds += len(cm.rebinds_hr)
        total_macros += len(cm.macros_hr)
        total_aliases += len(cm.alias_hr)

    assert len(multi_focus) == 53
    assert total_taps == 27
    assert total_rebinds == 324
    assert total_macros == 314
    assert total_aliases == 30
