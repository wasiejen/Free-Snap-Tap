"""U-M1: every fenced example block in docs/invocations.md must pass the
product Config_Validator - the doc's copy-paste promise, pinned.

Each fence is validated AS ONE CONFIG (that is what a fence is when you
paste it - no injected preambles), so an alias-using fence must carry
its own alias definition, exactly like the worked blocks do.

U-M2 extends the same convention to docs/start-arguments.md (every
start argument of the START_ARG tables carries one example line, every
bash fence validates with zero violations) and docs/prefixes-suffixes.md
(every prefix/delay/constraint/evaluation FORM carries one example).
"""
import re
from pathlib import Path

from fst_manager import (CONSTRAINT_FUNCTIONS, Config_Manager, Config_Validator,
                         START_ARG_FLAGS, START_ARG_VALUES)

DOC = Path(__file__).resolve().parents[1] / 'docs' / 'invocations.md'
DOC_START = Path(__file__).resolve().parents[1] / 'docs' / 'start-arguments.md'
DOC_PFX = Path(__file__).resolve().parents[1] / 'docs' / 'prefixes-suffixes.md'

# an entry of the form `(name(...)...)` outside the example fences - the
# entry spelling is `|(name(...))` for invocations and `(name(...))` for
# the repetition entries, both start at an opening paren before the name
ENTRY_FORM = re.compile(r'\((\w+)\(')


def split_fenced(text, langs=('bash',)):
    """(prose_lines, fenced_blocks) - one block per fence whose info string
    starts with one of langs, each block a list of (line_no, raw) tuples"""
    prose, blocks, block, in_block = [], [], None, False
    for n, raw in enumerate(text.splitlines(), 1):
        stripped = raw.strip()
        if (not in_block and stripped.startswith('```')
                and any(stripped[3:].startswith(lang) for lang in langs)):
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


# --- U-M2: the same convention for start-arguments.md and prefixes-suffixes.md

# every start argument of the runtime vocabulary tables plus the one
# command-line-only spelling - each must appear in an example fence
START_ARG_EXAMPLES = sorted(START_ARG_FLAGS | START_ARG_VALUES | {'--elevate'})

# the forms docs/prefixes-suffixes.md teaches, each pinned by the exact
# token shape its example line uses
PREFIX_SUFFIX_FORMS = (
    ('press prefix -ke', r'(?m)^\s*-v : '),
    ('release prefix +ke', r'(?m)^\s*\+v : '),
    ('release prefix !ke', r'(?m)^\s*!v : '),
    ('toggle prefix ^Key', r'\^caps_lock'),
    ('constraint suffix (-ke)', r'\|\(\-a\)\|\(\-s\)'),
    ('static delay suffix', r'\|250\b'),
    ('random delay suffix', r'\|50\|120\b'),
    ('int-delay evaluation |(fn())', r'\|\(tr\("w"\)\)'),
    ('bool evaluation comparison', r"\|\(dc\('y'\) < 500\)"),
    ('always-False form |(!)', r'\|\(!\)'),
)


def fence_text(blocks):
    return '\n'.join(raw for block in blocks for _, raw in block)


def fence_violations(blocks):
    """every violation of every fence validated as ONE config, as
    (first line number, severity, rule, message) tuples"""
    found = []
    for block in blocks:
        content = '\n'.join(raw for _, raw in block) + '\n'
        for v in violations_of(content):
            found.append((block[0][0], v.severity, v.rule, v.message))
    return found


class TestStartArgumentsDocExamples:
    def test_every_start_arg_has_an_example(self):
        """the per-entry contract: every name of the runtime START_ARG
        tables (plus --elevate) appears in an example fence - a new
        argument without an example, or a deleted example, fails here"""
        _, blocks = split_fenced(DOC_START.read_text(encoding='utf-8'),
                                 langs=('bash', 'bat'))
        text = fence_text(blocks)
        assert text, 'no example fences found - extraction broken?'
        missing = [name for name in START_ARG_EXAMPLES if name not in text]
        assert missing == [], f'start arguments without an example: {missing}'

    def test_every_start_arg_fence_validates(self):
        """every bash fence (config-form examples) parses as one config
        with ZERO violations - no unknown start argument, no arity error"""
        _, blocks = split_fenced(DOC_START.read_text(encoding='utf-8'))
        assert blocks, 'no example fences found - extraction broken?'
        assert fence_violations(blocks) == []

    def test_bare_flag_example_lines_exist(self):
        """a flag that also has a value form must carry its own bare
        example line - substring coverage alone would be satisfied by
        the '=value' twin"""
        _, blocks = split_fenced(DOC_START.read_text(encoding='utf-8'),
                                 langs=('bash', 'bat'))
        text = fence_text(blocks)
        for name in ('-crossover', '-crosshair', '-status_indicator'):
            assert re.search(rf'(?m)^\s*<arg>{re.escape(name)}$', text), \
                f'no bare <arg>{name} example line'

    def test_harness_rejects_a_bogus_start_arg(self):
        """negative control: the same pipeline flags an unknown <arg>
        line, so the pin above cannot pass vacuously"""
        vs = violations_of('<arg>-totally_bogus_arg\n')
        assert any(v.severity == Config_Validator.WARNING
                   and 'unknown start argument' in v.message for v in vs)


class TestPrefixSuffixDocExamples:
    def test_every_documented_form_has_a_pinned_example(self):
        """the per-form contract: each prefix/delay/constraint/evaluation
        form this doc teaches appears in an example fence - deleting one
        example fails here naming the form"""
        _, blocks = split_fenced(DOC_PFX.read_text(encoding='utf-8'))
        text = fence_text(blocks)
        missing = [label for label, rx in PREFIX_SUFFIX_FORMS
                   if not re.search(rx, text)]
        assert missing == []

    def test_every_prefix_suffix_fence_validates(self):
        """every example fence parses as one config with zero violations"""
        _, blocks = split_fenced(DOC_PFX.read_text(encoding='utf-8'))
        assert blocks, 'no example fences found - extraction broken?'
        assert fence_violations(blocks) == []
