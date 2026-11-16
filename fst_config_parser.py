'''
F-C2 (architecture review Item 4): the ONE config line grammar.

Before this module the config grammar existed twice in fst_manager.py:
Config_Validator._check_group_line classified cleaned lines by the same rules
as Config_Manager.presort_lines ("splits exactly like presort_lines does"),
the comment/continuation cleaning lived only in Config_Manager while the
validator walked its output, the <alias>/(name) prefix strip and the
<focus>/<arg> dispatch were written three or four times, and the start-argument
name spelling rule (U361 dashed twins) existed once in the validator and once
in Argument_Manager.apply_start_arguments. Two parallel parsers stay in sync
only by comments, and the drift already happened once (see the delay bounds
below). This module owns the grammar ONCE; the validator and the runtime both
consume it, so a rule can no longer move in one lane only.

Owned here:
  - split_key_group                   the bracket-aware comma split
  - clean_comment_lines               comment/inline-comment cleaning (numbered)
  - combine_multiline_continuations   ':' continuation join (numbered)
  - clean_focus_header/focus_scope_of the <focus> header cleaning
  - normalize_start_arg_name          the U361 dashed-spelling name rule
  - parse_int_list                    the delay/probability value parse
  - classify_line/parse_config_lines  ONE dispatch -> typed ConfigLine records
  - LineNamer                         default (TAP_n)/(REB_n)/(MAC_n)/(SEQ_n)

Layering: this module imports only "re" and fst_data_types. fst_manager.py
imports this module, never the reverse - no import cycle.

NOT OWNED YET, DEFERRED ON PURPOSE - the <alias>/(name) PREFIX STRIP still has
three live copies (Config_Validator._collect_alias_definitions records the
token; Config_Validator._check_group_line cuts it with a SLICE;
Config_Manager._parse_lines_for_focus_manager cuts it with replace(), which
removes EVERY occurrence of the token in the line). Those are not the same
rule for a line that repeats its own alias text, so merging them is a behavior
change, not a move - it needs its own decision and its own pins. F-C2 left it
out and says so here rather than letting the claim below read as complete.

KNOWN DRIFT, PRESERVED ON PURPOSE (unifying either bound changes which configs
work, which is a maintainer call, not a refactor side effect):
  - delay 0: the validator accepts it (DELAY_RANGE -> 0 <= delay <= 1000) while
    the runtime keeps only 0 < delay <= 1000 (RUNTIME_DELAY_RANGE), so
    '-tapdelay=0,10' passes validation and silently becomes (10, 10) with a
    console line. Both bounds live here as named constants so the pair is
    visible in one place; tests/test_config_parser.py pins both.
  - default item names: the validator counts EVERY line of a kind while
    presort_lines counts only the unnamed ones, so an aliased tap line shifts
    the validator's (TAP_n) numbering away from the runtime's. LineNamer
    carries both policies explicitly (count_named=True/False) instead of two
    hand-written counter pairs; the violation-report text stays the validator's.
'''
import re

from fst_data_types import FOCUS_NAME_ILLEGAL

# config line headers (the grammar's only structural markers)
FOCUS_HEADER = '<focus>'
ARG_HEADER = '<arg>'

# validator delay acceptance bound: DELAY_RANGE[0] <= delay <= DELAY_RANGE[1]
DELAY_RANGE = (0, 1000)
# runtime delay acceptance bound, INCLUSIVE both ends: RUNTIME_DELAY_RANGE[0]
# <= delay <= RUNTIME_DELAY_RANGE[1] - (1, 1000) is the historical
# '0 < delay <= 1000' of apply_start_arguments.extract_delays written as a
# named range. NOT the same rule as DELAY_RANGE (the validator accepts 0, the
# runtime does not) - see the module docstring (the delay-0 drift Item 4
# names); preserved byte-for-byte, both bounds pinned in
# tests/test_config_parser.py.
RUNTIME_DELAY_RANGE = (1, 1000)


def split_key_group(group):
    '''split a key group on commas, ignoring commas inside parentheses;
    same rule as the bracket-aware split of Config_Manager.presort_lines'''
    parts = group.split(',')
    new_group = []
    temp = ''
    total_open = 0
    for part in parts:
        if temp == '':
            temp += part
        else:
            temp += ', ' + part
        total_open += part.count('(') - part.count(')')
        if total_open == 0:
            new_group.append(temp)
            temp = ''
    return new_group


def clean_comment_lines(lines):
    '''remove comments, commented-out keys and inline notes; keep the real
    line number of every kept line (the violation report names it).

    Moved out of Config_Manager._clean_comments_numbered unchanged (F-C2):
    the rule, the message-free contract and the header normalization are the
    grammar, and the validator walks this output, so it belongs with the
    grammar, not with the file-handling class.'''
    comments_cleaned_lines = []
    for line_number, line in enumerate(lines, start=1):
        ###XXX 241029-0711 strip to allow whitespaces in front
        line = line.replace('\n', '').replace('\t', '').strip()
        if not line:
            continue
        if line.startswith(FOCUS_HEADER):
            cleaned_line = FOCUS_HEADER
            ##260426-1838 multiple focus groups seperated by comma
            focus_group_names = line[7:].split('#')[0].split(',')
            if len(focus_group_names) > 1:
                # strip whitespace from focus group names and join them with comma again
                focus_group_names = ",".join([name.strip() for name in focus_group_names])
            else:
                focus_group_names = focus_group_names[0].strip()
            cleaned_line += focus_group_names
            comments_cleaned_lines.append((line_number, cleaned_line))
        elif line.startswith(ARG_HEADER):
            cleaned_line = ARG_HEADER
            cleaned_line += line[5:].split('#')[0].strip()
            comments_cleaned_lines.append((line_number, cleaned_line))
        elif line[0] == '#':
            continue
        else:
            ###XXX 241028-1224: commented out to make eval with spaces possible
            # line = line.replace(" ","")
            cleaned_group = []
            for key in line.split(','):
                # ignore fully commented out keys
                if key.strip().startswith('#'):
                    # if commented out key before :, add :
                    if key.find(':') >= 0:
                        cleaned_group.append(':')
                else:
                    # ignore comments after keys
                    cleaned_key = key.split('#')[0].strip()
                    if cleaned_key:
                        cleaned_group.append(cleaned_key)
            cleaned_line = ','.join(cleaned_group)
            if cleaned_line:
                comments_cleaned_lines.append((line_number, cleaned_line))

    return comments_cleaned_lines


def combine_multiline_continuations(numbered_lines):
    '''join a ':'-continuation line onto the sequence head above it; the head's
    line number is kept for the validator.

    Moved out of Config_Manager._combine_multilines_numbered unchanged (F-C2).
    Characterization: a continuation with NO head above it still raises
    IndexError here (pinned in tests/test_config_parser.py) - making it a
    reported violation instead is a behavior decision, not a refactor.'''
    multiline_cleaned_lines = []
    for line_number, line in numbered_lines:
        if len(line) > 1 and line[0] == ':':
            # add multiline to last multiline sequence
            last_number, last_line = multiline_cleaned_lines[-1]
            multiline_cleaned_lines[-1] = (last_number, last_line + line)
        else:
            multiline_cleaned_lines.append((line_number, line))

    return multiline_cleaned_lines


def sanitize_focus_text(text):
    '''the ONE focus-name sanitizer (fst_data_types.FOCUS_NAME_ILLEGAL): config
    headers, the runtime focus map, and the polled window title all pass
    through this same rule, because matching is done by
    cleaned_title.find(config_name) - a different pattern on either side
    silently disables a section (#399)'''
    return re.sub(FOCUS_NAME_ILLEGAL, '', text)


def clean_focus_header(line):
    '''the cleaned text behind <focus> (illegal focus characters removed);
    the ONE place the focus-name sanitizing regex runs on a config header'''
    return sanitize_focus_text(line.replace(FOCUS_HEADER, ''))


def focus_scope_of(line):
    '''the validator scope of a <focus> header: the first cleaned name; a blank
    first name ('<focus>,Alpha') scopes the section to '' = the default scope'''
    return clean_focus_header(line).split(',')[0].strip()


def normalize_start_arg_name(arg):
    '''U361 (TODO #356, ruling A 2026-11-04): dashed spellings are accepted -
    normalize '-' -> '_' in the NAME part for matching ('-always-active' ==
    '-always_active'); the text after '=' stays verbatim. Names not starting
    with '-' stay untouched (the validator rejects them; the parser must not
    rewrite them into valid args).

    Single implementation of the rule: the validator matched it for its
    START_ARG tables and apply_start_arguments matched it for the branch
    chain - two copies of one spelling rule (F-C2).'''
    name, sep, value = arg.partition('=')
    if name[:1] != '-':
        return arg
    return '-' + name[1:].replace('-', '_') + sep + value


def parse_int_list(value):
    '''int list from a start-argument value; None when any part is not a
    number (the caller reports it). Shared by the validator's -tapdelay/
    -aliasdelay/-macrodelay/-crossover/-status_indicator/-crosshair checks.'''
    try:
        return [int(part) for part in value.replace(' ', '').split(',')]
    except ValueError:
        return None


# --- the start-argument vocabulary (F-C3, review Item 4 inventory) ----------
#
# ONE vocabulary for the two entry worlds. The config world ('<arg>-flag'
# lines) checks a name against these sets and reports what it does not know;
# the command-line world (Argument_Manager.apply_start_arguments) dispatches
# on its own branch chain and is LENIENT where the config world is strict:
# '-tray_iconX' works there (branch prefix match) while the config validator
# warns 'unknown start argument'. The difference is deliberate today and
# pinned (tests/test_config_parser.py) - the vocabulary itself is one list.
START_ARG_FLAGS = frozenset({
    '-flow', '-debug_numpad', '-nomenu', '-nocontrols', '-delay', '-crossover',
    '-nodelay', '-exec_one_macro', '-status_indicator', '-crosshair',
    '-always_active', '-tray_icon', '-hide_cmd_window',
    '-no_warnings', '-default_always_active', '-default_off',
    '-drop_watch', '-no_toast_offload',
})
START_ARG_VALUES = frozenset({
    '-log', '-file', '-tapdelay', '-aliasdelay', '-macrodelay', '-crossover',
    '-focusapp', '-status_indicator', '-crosshair', '-save_dir',
    '-backup_root_dir',
})


def arg_value(arg, name):
    '''the value part of a '-name=value' start argument, or None when the
    argument is not that name or carries no value.

    This is the ONE '-name=' shape rule: the command-line chain spelled it
    'arg[:N] == "-name=" and len(arg) > N' eleven times, with N hand-counted
    per site (the classic off-by-one class); the config validator matches the
    name from the '<arg>' line against the tables above.'''
    prefix = name + '='
    if arg.startswith(prefix) and len(arg) > len(prefix):
        return arg[len(prefix):]
    return None


def prefix_matches(arg, name):
    '''the command-line world's lenient name test: '-tray_iconX' matches
    '-tray_icon'. Kept as a NAMED rule so the leniency is one documented fact
    instead of three slice accidents (the config validator has no such
    leniency - that pair is pinned)'''
    return arg[:len(name)] == name


def split_item_prefix(line):
    '''split a group line's declared-name prefix from its body:
    returns (declared_name, body, is_alias_definition).

      '<world> a, d'  -> ('<world>', 'a, d', True)   alias definition
      '(*n*) x : y'   -> ('(*n*)', 'x : y', False)   named group
      'a, d'          -> ('', 'a, d', False)

    A prefix is only recognized when its closing bracket sits past index 1
    ('<x>' IS a definition (bracket at index 2); '<>x', '()' or a bare '(' are
    ordinary text).
    The body is what remains, stripped. This SLICE rule is the validator's;
    Config_Manager._parse_lines_for_focus_manager still cuts with replace(),
    which also removes a LATER repetition of the same token in the line
    ('<w> a, <w>, d' loses its second member) - measured, documented, and NOT
    merged here: making the runtime match the validator would change which
    keys a real config feeds the containers (decision filed, see the module
    docstring).'''
    if line.startswith('<'):
        alias_end = line.find('>')
        if alias_end > 1:
            return line[:alias_end + 1], line[alias_end + 1:].strip(), True
    elif line.startswith('('):
        name_end = line.find(')')
        if name_end > 1:
            return line[:name_end + 1], line[name_end + 1:].strip(), False
    return '', line, False


# --- item types: the ':' classification (F-C2, review Item 4) ---------------
#
# One classification for both lanes. Before this, Config_Validator.
# _check_group_line and Config_Manager.presort_lines each carried their own
# copy of these branch rules and kept them in sync by comment only ("splits
# exactly like presort_lines does"). A line's TYPE is grammar, so it is
# decided once here; the validator turns a violation into a report, the
# runtime turns the same record into its category containers.
KIND_TAP = 'tap_group'
KIND_REBIND = 'rebind'
KIND_MACRO = 'macro'
KIND_SEQUENCE = 'macro_sequence'
KIND_DROPPED = 'dropped'

# default item names per type, in the order the report and the containers use
DEFAULT_NAME_LABELS = {KIND_TAP: 'TAP', KIND_REBIND: 'REB',
                       KIND_MACRO: 'MAC', KIND_SEQUENCE: 'SEQ'}


def classify_groups(body):
    '''classify one group line body by its ':' structure and hand back the
    (kind, groups) pair - the same split every consumer needs:
      'a, d'                  -> TAP
      'a : b'                 -> REBIND
      'a :: b, c'             -> MACRO
      'a :: b : c'            -> MACRO_SEQUENCE
      ':' alone               -> REBIND with two empty groups (the validator's
                                 'shape' rule is the one that reports the
                                 missing trigger - a SHAPE decision stays here)
      anything else (':' in a '::' group with a non-empty middle group)
                              -> DROPPED (the validator reports it, presort
                                 drops it - both unchanged behaviors)
    groups are stripped; no key validation happens here (that is a validator
    rule, and the runtime resolves keys later).'''
    groups = [x.strip() for x in body.split(':')]
    if len(groups) == 1:
        return KIND_TAP, groups
    if len(groups) == 2:
        return KIND_REBIND, groups
    if len(groups) > 2 and len(groups[1]) == 0:
        # 'a :: b' (macro) and 'a :: b : c' (sequence); a non-empty middle
        # group is NOT a sequence - it is the dropped shape
        if len(groups) > 3:
            return KIND_SEQUENCE, groups
        return KIND_MACRO, groups
    return KIND_DROPPED, groups


class LineNamer():
    '''the default (TAP_1)/(REB_2)/(MAC_1)/(SEQ_1) numbering of unnamed lines,
    in walk order - one algorithm, two documented policies (F-C2):

    count_named=True   the validator policy: EVERY line of a type advances the
                       counter, declared name or not, because the violation
                       report numbers the lines of the file as the user reads
                       them.
    count_named=False  the presort_lines policy: only UNNAMED lines advance it,
                       so the runtime containers keep their own numbering.

    The two policies differ as soon as one line carries a declared name - that
    is a known drift (the report may say (TAP_2) where the container says
    (TAP_1)); it is carried as a named policy here instead of two hand-written
    counter pairs so it is visible in one place.'''

    def __init__(self, count_named):
        self._count_named = bool(count_named)
        self._counts = {kind: 1 for kind in DEFAULT_NAME_LABELS}

    def name_for(self, kind, declared_name):
        '''the name this line is known by: its declared name when it has one,
        else the next default of its type'''
        if declared_name:
            if self._count_named:
                self._counts[kind] += 1
            return declared_name
        number = self._counts[kind]
        self._counts[kind] += 1
        return f'({DEFAULT_NAME_LABELS[kind]}_{number})'
