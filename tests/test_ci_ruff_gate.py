"""CI pin (F-B2): the ruff F gate must be a hard (failing) step.

Improvement plan F-B2 / architecture review Item 10: the `ruff check
--select F` step was switched from informational to a hard gate once the
6 pre-existing F findings were cleared. This test locks that state: the
workflow must contain exactly one `ruff check --select F` step and that
step must NOT carry `continue-on-error: true`, so an informational
fallback cannot creep back in unnoticed.

Plain-text pin on purpose: PyYAML is not a dev dependency, and the CI
file is a small fixed-shape document.
"""

from pathlib import Path

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "ci.yml"


def _step_blocks(lines):
    '''Return the list of step blocks of the first job (each a list of lines).'''
    blocks = []
    current = None
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- ") and line[0:6].isspace():
            current = [line]
            blocks.append(current)
        elif current is not None:
            current.append(line)
    return blocks


def _ruff_f_steps(lines):
    '''Return the step blocks whose run line invokes the ruff F gate.'''
    return [block for block in _step_blocks(lines)
            if any("ruff check --select F" in line for line in block)]


def test_ci_workflow_exists():
    assert WORKFLOW.is_file(), f"missing CI workflow: {WORKFLOW}"


def test_ruff_f_gate_step_present_exactly_once():
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    steps = _ruff_f_steps(lines)
    assert len(steps) == 1, (
        "expected exactly one hard ruff F step, found "
        f"{len(steps)}: {[s[0].strip() for s in steps]}")


def test_ruff_f_gate_step_is_not_continue_on_error():
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    steps = _ruff_f_steps(lines)
    assert steps, "no ruff F step found in the CI workflow"
    for step in steps:
        offenders = [line.strip() for line in step if "continue-on-error: true" in line]
        assert not offenders, (
            "the ruff F gate must fail the build (F-B2 hard gate); "
            f"step carries: {offenders} in step: {step[0].strip()}")
