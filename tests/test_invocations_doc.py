"""U-M1: every fenced example line in docs/invocations.md must pass the
product Config_Validator - the doc's copy-paste promise, pinned.

Each example line is validated as a STANDALONE config (that is what
copy-paste-ready means), with a '<scan> v' alias-definition preamble so
the alias references of the repetition examples resolve in the same
section they are used in - mirroring the worked blocks. The alias-using
fences carry their own '<scan> v' line, so they paste standalone too.
"""
import re
from pathlib import Path

from fst_manager import CONSTRAINT_FUNCTIONS, Config_Manager, Config_Validator

DOC = Path(__file__).resolve().parents[1] / 'docs' / 'invocations.md'

# an entry of the form `|(name(...)...)` outside the example fences
ENTRY_FORM = re.compile(r'\|\((\w+)\(')


def split_fenced(text):
    """(prose_lines, fenced_lines) - fenced lines are (line_no, raw)"""
    prose, fenced, in_block = [], [], False
    for n, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if not in_block and stripped.startswith('```bash'):
            in_block = True
            continue
        if in_block and stripped.startswith('```'):
            in_block = False
            continue
        if in_block:
            fenced.append((n, raw))
        else:
            prose.append(raw)
    return prose, fenced


def example_function_names(fenced):
    return {name for _, raw in fenced for name in re.findall(r'\b(\w+)\(', raw)}


def violations_of(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


class TestInvocationsDocExamples:
    def test_every_documented_entry_has_an_example(self):
        """the per-entry contract: every config function this doc shows an
        `|(name(...))` entry for must appear in at least one example fence -
        a new entry without an example, or a deleted fence, fails here"""
        prose, fenced = split_fenced(DOC.read_text(encoding='utf-8'))
        entry_names = {n for line in prose for n in ENTRY_FORM.findall(line)}
        entry_names &= set(CONSTRAINT_FUNCTIONS)
        missing = entry_names - example_function_names(fenced)
        assert missing == set(), f'doc entries without an example: {missing}'

    def test_every_example_line_validates_standalone(self):
        """zero violations per example line: no unknown function, no arity
        error, no vk error - every example parses and resolves"""
        _, fenced = split_fenced(DOC.read_text(encoding='utf-8'))
        found = []
        for n, line in fenced:
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
            content = (line if stripped.startswith('<scan> ')
                       else '<scan> v\n' + line)
            for v in violations_of(content):
                found.append((n, stripped, v.severity, v.rule, v.message))
        assert found == []

    def test_harness_rejects_a_bogus_function(self):
        """negative control: the same pipeline flags an unknown function
        name, so the pin above cannot pass vacuously"""
        vs = violations_of('<scan> v\nw|(no_such_fn_xyz(1)) : w\n')
        assert any(v.severity == Config_Validator.WARNING
                   and 'unknown function' in v.message for v in vs)
