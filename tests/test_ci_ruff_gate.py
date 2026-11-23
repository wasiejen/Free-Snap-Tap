"""CI pin (F-B2): the ruff F gate must be a hard (failing) step.

Improvement plan F-B2 / architecture review Item 10: the `ruff check
--select F` step was switched from informational to a hard gate once the
6 pre-existing F findings were cleared. This test locks that state: the
workflow must contain exactly one `ruff check --select F` step and that
step must NOT carry `continue-on-error: true`, so an informational
fallback cannot creep back in unnoticed.

#465 addition (same plain-text rationale): the CI test step must run the
chunked lane (suite_lane.py, process isolation per chunk - the ABORT2
mitigation the local gate uses) as a hard gate, and the flat single-process
pytest is banned from the workflow (it aborted every push at ~85% of the
suite since 2026-11-16).

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


def _lane_steps(lines):
    '''Return the step blocks whose run line invokes the chunked lane.'''
    return [block for block in _step_blocks(lines)
            if any("suite_lane.py" in line for line in block)]


def _pytest_lines(lines):
    '''Non-comment lines mentioning pytest - a flat run anywhere in CI.'''
    return [line.strip() for line in lines
            if "pytest" in line and not line.strip().startswith("#")]


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


def test_suite_step_runs_the_lane_exactly_once():
    # CONTRACT (#465): the full suite on CI runs through the chunked lane -
    # exactly one step invokes it, so the CI gate and the local gate share
    # the process-isolation mitigation for the Qt-teardown abort class
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    steps = _lane_steps(lines)
    assert len(steps) == 1, (
        "expected exactly one suite_lane.py step (chunked lane gate, #465), "
        f"found {len(steps)}: {[s[0].strip() for s in steps]}")


def test_ci_never_runs_flat_pytest():
    # CONTRACT (#465): the flat single-process run aborts natively at ~85%
    # of this suite (ABORT2) - no non-comment CI line may invoke pytest at
    # all; the suite runs ONLY through the lane step above
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    offenders = _pytest_lines(lines)
    assert not offenders, (
        "the CI test step must run the chunked lane, never a flat "
        f"single-process pytest run (#465); found: {offenders}")


def test_lane_step_is_not_continue_on_error():
    # CONTRACT (#465): the lane is the CI gate, not information - a red
    # chunk must fail the build (same hard-gate doctrine as the ruff F gate)
    lines = WORKFLOW.read_text(encoding="utf-8").splitlines()
    steps = _lane_steps(lines)
    assert steps, "no suite_lane.py step found in the CI workflow"
    for step in steps:
        offenders = [line.strip() for line in step if "continue-on-error: true" in line]
        assert not offenders, (
            "the lane gate must fail the build (#465 hard gate); "
            f"step carries: {offenders} in step: {step[0].strip()}")
