"""U-M1: every fenced example block in docs/invocations.md must pass the
product Config_Validator - the doc's copy-paste promise, pinned.

Each fence is validated AS ONE CONFIG (that is what a fence is when you
paste it - no injected preambles), so an alias-using fence must carry
its own alias definition, exactly like the worked blocks do.
"""
import re
from pathlib import Path

from fst_manager import CONSTRAINT_FUNCTIONS, Config_Manager, Config_Validator

DOC = Path(__file__).resolve().parents[1] / 'docs' / 'invocations.md'

# an entry of the form `(name(...)...)` outside the example fences - the
# entry spelling is `|(name(...))` for invocations and `(name(...))` for
# the repetition entries, both start at an opening paren before the name
ENTRY_FORM = re.compile(r'\((\w+)\(')


def split_fenced(text):
    """(prose_lines, fenced_blocks) - one block per ```bash fence,
    each block a list of (line_no, raw) tuples"""
    prose, blocks, block, in_block = [], [], None, False
    for n, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if not in_block and stripped.startswith('```bash'):
            in_block, block = True, []
            continue
        if in_block and stripped.startswith('```'):
            in_block = False
            blocks.append(block)
            block = None
            continue
        if in_block:
            block.append((n, raw))
        else:
            prose.append(raw)
    return prose, blocks


def example_function_names(blocks):
    return {name for block in blocks for _, raw in block
            for name in re.findall(r'\b(\w+)\(', raw)}


def violations_of(content):
    cm = Config_Manager()
    numbered = cm._combine_multilines_numbered(
        cm._clean_comments_numbered(content.splitlines(keepends=True)))
    return Config_Validator().validate(numbered)


class TestInvocationsDocExamples:
    def test_every_documented_entry_has_an_example(self):
        """the per-entry contract: every config function this doc shows a
        `(name(...))` entry for must appear in at least one example fence -
        a new entry without an example, or a deleted example, fails here"""
        prose, blocks = split_fenced(DOC.read_text(encoding='utf-8'))
        entry_names = {n for line in prose for n in ENTRY_FORM.findall(line)}
        entry_names &= set(CONSTRAINT_FUNCTIONS)
        missing = entry_names - example_function_names(blocks)
        assert missing == set(), f'doc entries without an example: {missing}'

    def test_every_fence_validates_as_one_config(self):
        """zero violations per fence (comments stripped as the loader
        strips them): no unknown function, no arity error, no unresolved
        alias, no vk error - each fence pastes standalone"""
        _, blocks = split_fenced(DOC.read_text(encoding='utf-8'))
        assert blocks, 'no example fences found - extraction broken?'
        found = []
        for block in blocks:
            content = '\n'.join(raw for _, raw in block) + '\n'
            for v in violations_of(content):
                found.append((block[0][0], v.severity, v.rule, v.message))
        assert found == []

    def test_harness_rejects_a_bogus_function(self):
        """negative control: the same pipeline flags an unknown function
        name, so the pins above cannot pass vacuously"""
        vs = violations_of('<scan> v\nw|(no_such_fn_xyz(1)) : w\n')
        assert any(v.severity == Config_Validator.WARNING
                   and 'unknown function' in v.message for v in vs)
