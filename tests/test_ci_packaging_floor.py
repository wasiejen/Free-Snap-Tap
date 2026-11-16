"""CI pin (F-B3): packaging floor and the tag build job.

Improvement plan F-B3 / architecture review Item 12 / ruling D2:
- the Python 3.12 floor must be stated in the README install section and
  every workflow python pin must match it (CI pin 3.12 == floor, no drift);
- both build scripts stay tracked (Nuitka primary, PyInstaller backup);
- a tag-triggered build-only job exists: it triggers on v* tags, uploads the
  built exe as an artifact, and never re-runs the test suite;
- README documents Nuitka FIRST as the primary build path, the PyInstaller
  section stays labeled as the simpler alternative for users building
  their own exe.

If a pyproject.toml is ever added, its requires-python must state the same
3.12 floor as the README (consistency guard, inert while no pyproject).

Plain-text pin on purpose: PyYAML is not a dev dependency (same rationale
as test_ci_ruff_gate.py), and both files are small fixed-shape documents.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
README = REPO / "README.md"
WORKFLOWS = REPO / ".github" / "workflows"
FLOOR = "3.12"
FLOOR_README_MARK = "Python 3.12 or newer"
NUITKA_HEAD = "### Nuitka (primary build path)"
PYINSTALLER_HEAD = "### PyInstaller (simpler alternative for users"


def _workflow_texts():
    return {p.name: p.read_text(encoding="utf-8")
            for p in sorted(WORKFLOWS.glob("*.yml"))}


def _python_version_pins(text):
    pins = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("python-version:"):
            value = stripped.split(":", 1)[1].split("#", 1)[0]
            pins.append(value.strip().strip("'\""))
    return pins


def _tag_build_workflow(texts):
    '''Workflows triggered on v* tags (F-B3 build-only job).'''
    return {name: text for name, text in texts.items()
            if "tags:" in text and '"v*"' in text}


def test_readme_states_python_floor():
    text = README.read_text(encoding="utf-8")
    assert FLOOR_README_MARK in text, (
        "README install section must state the Python floor with the exact "
        f"phrase {FLOOR_README_MARK!r} (F-B3)")


def test_readme_nuitka_section_primary_before_pyinstaller():
    text = README.read_text(encoding="utf-8")
    nuitka = text.find(NUITKA_HEAD)
    pyinstaller = text.find(PYINSTALLER_HEAD)
    assert nuitka != -1, f"README build section lacks {NUITKA_HEAD!r}"
    assert pyinstaller != -1, f"README build section lacks {PYINSTALLER_HEAD!r}"
    assert nuitka < pyinstaller, (
        "ruling D2: Nuitka is the primary build path - its README section "
        "must come before the PyInstaller (simpler alternative) section")


def test_readme_labels_pyinstaller_as_simpler_alternative():
    text = README.read_text(encoding="utf-8")
    assert "simpler alternative for users building their own exe" in text, (
        "ruling D2: the PyInstaller section must carry the user-simple "
        "backup label")


def test_all_workflow_python_pins_match_floor():
    texts = _workflow_texts()
    assert texts, f"no workflow files under {WORKFLOWS}"
    pins = [pin for text in texts.values() for pin in _python_version_pins(text)]
    assert pins, "no python-version pins found in any workflow"
    drift = {pin for pin in pins if pin != FLOOR}
    assert not drift, (
        f"python-version pins {sorted(drift)} drift from the stated {FLOOR} "
        "floor (F-B3)")


def test_tag_build_workflow_exists():
    builds = _tag_build_workflow(_workflow_texts())
    assert builds, (
        'F-B3: no tag-triggered build workflow found (need "tags:" + "v*" '
        f"in {sorted(WORKFLOWS.glob('*.yml'))})")


def test_tag_build_workflow_is_build_only():
    builds = _tag_build_workflow(_workflow_texts())
    assert builds, "no tag build workflow found"
    for name, text in builds.items():
        assert "upload-artifact" in text, (
            f"{name}: the tag build job must upload the exe as a build artifact")
        offenders = [line.strip() for line in text.splitlines()
                     if "pytest" in line and not line.strip().startswith("#")]
        assert not offenders, (
            f"{name}: the tag build job must NOT re-run the test suite "
            f"(ci.yml already runs it); found: {offenders}")


def test_both_build_scripts_stay_tracked():
    for name in ("built_nuitka.bat", "built_pyinstaller.bat"):
        assert (REPO / name).is_file(), (
            f"ruling D2 keeps both build paths: {name} must exist")


def test_pyproject_requires_python_matches_floor_if_added():
    pyproject = REPO / "pyproject.toml"
    if not pyproject.is_file():
        # No packaging metadata file exists; the floor lives in README +
        # workflow pins (pinned above). Guard only fires once one is added.
        return
    text = pyproject.read_text(encoding="utf-8")
    assert f'requires-python = ">={FLOOR}"' in text, (
        f"pyproject.toml requires-python must state the {FLOOR} floor "
        "consistently with the README (F-B3)")
