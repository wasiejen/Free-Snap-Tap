"""U-M1: every fenced example line in docs/invocations.md must pass the
product Config_Validator - the doc's copy-paste promise, pinned.

Each example line is validated as a STANDALONE config (that is what
copy-paste-ready means), with a '<scan> v' alias-definition preamble so
the alias references of the repetition examples resolve in the same
section they are used in - mirroring the worked blocks.
"""
from pathlib import Path

from fst_manager import Config_Manager, Config_Validator

DOC = Path(__file__).resolve().parents[1] / 'docs' / 'invocations.md'


def fenced_example_lines(text):
    """non-comment, non-blank lines inside ```bash fences,
    as (doc_line_number, raw_line) tuples"""
    out, in_block = [], False
    for n, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if not in_block and stripped.startswith('```bash'):
            in_block = True
            continue
        if in_block and stripped.startswith('```'):
            in_block = False
            continue
        if in_block and stripped and not stripped.startswith('#'):
            out.append((n, raw))
    return out


def violations_of(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


class TestInvocationsDocExamples:
    def test_examples_found(self):
        """extraction works - a fence-format change must fail loudly here,
        not silently shrink the validated set"""
        lines = fenced_example_lines(DOC.read_text(encoding='utf-8'))
        assert len(lines) >= 49, f'only {len(lines)} example lines found'

    def test_every_example_line_validates_standalone(self):
        """zero violations per example line: no unknown function, no arity
        error, no vk error - every example parses and resolves"""
        lines = fenced_example_lines(DOC.read_text(encoding='utf-8'))
        found = []
        for n, line in lines:
            content = (line if line.strip().startswith('<scan> ')
                       else '<scan> v\n' + line)
            for v in violations_of(content):
                found.append((n, line.strip(), v.severity, v.rule, v.message))
        assert found == []

    def test_harness_rejects_a_bogus_function(self):
        """negative control: the same pipeline flags an unknown function
        name, so the pin above cannot pass vacuously"""
        vs = violations_of('<scan> v\nw|(no_such_fn_xyz(1)) : w\n')
        assert any(v.severity == Config_Validator.WARNING
                   and 'unknown function' in v.message for v in vs)
