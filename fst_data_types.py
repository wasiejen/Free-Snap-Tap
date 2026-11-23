'''
Free-Snap-Tap V1.3.0
last updated: 241015-1041
'''

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from time import monotonic


class Lifecycle_State(Enum):
    '''F-A5 (review Item 3): the lifecycle states the asyncio logic loop owns.

    Only the lifecycle machine writes them (free_snap_tap.Lifecycle_Machine).
    Legs that run on other threads - the hook pump (alt+END / alt+PAGE_DOWN /
    alt+delete), the Qt thread, the CLI menu - never write state: they POST a
    request with Lifecycle_Machine.post_transition and return.

    RUNNING   listeners live, filter active
    PAUSED    listeners live, filter paused (what alt+delete asks for)
    MENU      listeners stopped, the CLI menu owns the console
    STOPPING  shutdown requested: run() returns, cleanup runs, exit code 0

    The arg_manager flags (STOPPED / MENU_ENABLED / WIN32_FILTER_PAUSED) stay
    what the FILTER reads (the whole suite and the pump legs depend on them);
    this state is what the LOOP reads to decide whether to park, re-show the
    menu or exit. Item 3's defect was that those flags were write-only with
    respect to the loop - nothing re-read them after startup.'''
    RUNNING = 'running'
    PAUSED = 'paused'
    MENU = 'menu'
    STOPPING = 'stopping'


# --- ticket ledger (F-A6, ladder R0) -------------------------------------
# Design contract: estate projects/estate/research/2026-11-16_fst-ticket-ledger.md
# section (C). The ledger answers ONE question: "which physical events does FST
# owe, who emitted them, from which generation". It is evidence plus a debt
# registry - it never decides (suppression policy stays filter-local).

TICKET_SCHEDULED = 'scheduled'
TICKET_INJECTED = 'injected'
TICKET_COMPLETED = 'completed'
TICKET_STATES = (TICKET_SCHEDULED, TICKET_INJECTED, TICKET_COMPLETED)

TICKET_PRESS = 'press'
TICKET_RELEASE = 'release'
TICKET_KINDS = (TICKET_PRESS, TICKET_RELEASE)

SOURCE_TAP = 'tap'
SOURCE_REBIND = 'rebind'
SOURCE_MACRO = 'macro'
SOURCE_TOGGLE = 'toggle'
SOURCE_DRAIN = 'drain'
TICKET_SOURCE_KINDS = (SOURCE_TAP, SOURCE_REBIND, SOURCE_MACRO, SOURCE_TOGGLE,
                       SOURCE_DRAIN)


class Ticket():
    '''One physical event FST emitted or owes. Plain data, __slots__, NO
    behavior (the store owns the transitions; see Ticket_Ledger).

    The six RESERVED fields of the design contract:
      vk          the int virtual-key code the event targets
      source_kind which emitter class produced it (tap|rebind|macro|toggle|drain)
      source_id   which emitter instance/leg (tap-group alias, macro alias,
                  lane name, or the drain name for a drain leg)
      gen_id      the snapshot generation that was live when the ticket opened -
                  the ledger is generation-INDEPENDENT, so cross-generation debt
                  is nameable instead of orphaned
      kind        press | release
      seq         globally monotonic, also the drop-ring cross-reference key
    plus the two operational reservations:
      state       scheduled | injected | completed - flipped by ONE attribute
                  store only (never read-modify-write from another thread)
      is_mouse    the mouse legs share the same send path but a different veto
      created_at  monotonic seconds at construction - the F-B4 status dump's
                  ticket-aging watch ages from it; stamped from the clock here
                  (never injected: one clock for every age in the artifact),
                  written once, never rewritten

    The growth slot the contract reserves but this unit does NOT implement:
    reason_code (suppression annotation). created_at (compaction TTL) is the
    slot the F-B4 dump now uses for aging; the compaction TTL itself has not
    landed.'''
    __slots__ = ('vk', 'source_kind', 'source_id', 'gen_id', 'kind', 'seq',
                 'state', 'is_mouse', 'created_at')

    def __init__(self, vk, source_kind, source_id, gen_id, kind, seq,
                 state=TICKET_SCHEDULED, is_mouse=False):
        self.vk = vk
        self.source_kind = source_kind
        self.source_id = source_id
        self.gen_id = gen_id
        self.kind = kind
        self.seq = seq
        self.state = state
        self.is_mouse = is_mouse
        # one monotonic read at construction, before the ticket is published:
        # a concurrent reader either sees the ticket (with its age anchor) or
        # does not see it, never a half-filled record
        self.created_at = monotonic()

    def __repr__(self):
        return (f"Ticket(seq={self.seq}, vk={self.vk}, kind={self.kind}, "
                f"state={self.state}, src={self.source_kind}/{self.source_id}, "
                f"gen={self.gen_id}, mouse={self.is_mouse})")


class Ticket_Ledger():
    '''The store behind FST_Keyboard._ledger: {vk_code: [Ticket, ...]}.

    Ownership rule (design contract (C), for THREADING.md later): the RUNTIME
    owns the ledger for the process lifetime. Generations come and go, the
    ledger NEVER rebuilds, and a snapshot swap MUST NOT touch any ledger
    reference - debt is precisely what does not die with a generation.

    SINGLE-STORE DISCIPLINE (the rule that keeps hot-path reads lock-free, and
    the reason this store exists at all): a ticket's fields are written either
    at construction or by exactly ONE attribute store afterwards (a state flip).
    A thread that is not the opener must NEVER read a ticket, mutate two fields,
    and write it back - that compound is a torn read for the pump (design
    report, TOP-3 risk 1). The store therefore exposes no such path: readers
    return NEW snapshot lists, transitions are `open` / `mark` / `close`, and
    compaction prunes IN PLACE (completed tickets from the front only) so the
    list object a concurrent writer holds is never the discarded one.
    Pinned in tests/test_ticket_ledger_pins.py.

    Logging goes through a callable handed in at construction (the flow-lane
    debug method), because this module must not import fst_manager (cycle). The
    callable is called with lazy %s args, so a disabled flow lane pays nothing
    for formatting.'''

    __slots__ = ('_by_vk', '_seq_source', '_high', 'log', 'MAX_PER_VK')

    def __init__(self, log=None, max_per_vk=64):
        # itertools.count().__next__() is a single C-level call: monotonic and
        # race-free under the GIL across the pump, the lanes and the drains.
        from itertools import count
        self._by_vk = {}
        self._seq_source = count(1)
        # the highest seq ISSUED (tracked at open - not derived from the
        # counter's private state, F-A6 reviewer P2-5): this is what a status
        # dump reports as the high-water mark
        self._high = 0
        self.log = log
        self.MAX_PER_VK = max_per_vk

    # -- transitions -------------------------------------------------------

    def open(self, vk, source_kind, source_id, kind, gen_id,
             state=TICKET_SCHEDULED, is_mouse=False):
        '''Record that `vk` is owed/emitted. Appends to the per-vk list
        (list.append is safe under the GIL and the read path tolerates a
        concurrent append); a missing bucket is created with ONE dict store.'''
        if source_kind not in TICKET_SOURCE_KINDS:
            raise ValueError(f"unknown ticket source_kind {source_kind!r}")
        if kind not in TICKET_KINDS:
            raise ValueError(f"unknown ticket kind {kind!r}")
        if state not in TICKET_STATES:
            raise ValueError(f"unknown ticket state {state!r}")
        ticket = Ticket(vk, source_kind, source_id, gen_id, kind,
                        next(self._seq_source), state, is_mouse)
        bucket = self._by_vk.get(vk)
        if bucket is None:
            # the dict entry for a vk is created ONCE and its list object is
            # then never rebound (see _prune) - a writer that grabbed the list
            # mid-flight can never append into a discarded list
            bucket = [ticket]
            self._by_vk[vk] = bucket
        else:
            bucket.append(ticket)
        if ticket.seq > self._high:
            self._high = ticket.seq
        self._log('open', ticket)
        if len(bucket) > self.MAX_PER_VK:
            self._prune(vk, bucket)
        return ticket

    def mark(self, ticket, state):
        '''Flip ONE attribute (the GIL-atomic single store the lock-free read
        path relies on). Never call this with a compound update of two fields.'''
        if state not in TICKET_STATES:
            raise ValueError(f"unknown ticket state {state!r}")
        ticket.state = state
        self._log('mark', ticket)
        return ticket

    def close(self, ticket):
        '''The one transition a drain path uses when its release left: completed.'''
        return self.mark(ticket, TICKET_COMPLETED)

    # -- reads (snapshots, never live containers) --------------------------

    def tickets(self, vk=None, gen_id=None, kind=None, state=None):
        '''A NEW list of matching tickets, in ONE scan. `state` may be one
        state or a tuple of states. Every bucket is copied first, so a caller
        iterating this result is never affected by a concurrent append or prune
        (the repo's existing list(...) snapshot pattern).'''
        states = None
        if state is not None:
            states = state if isinstance(state, tuple) else (state,)
        buckets = ([self._by_vk.get(vk)] if vk is not None
                   else list(self._by_vk.values()))
        found = []
        for bucket in buckets:
            if not bucket:
                continue
            for ticket in list(bucket):
                if gen_id is not None and ticket.gen_id != gen_id:
                    continue
                if kind is not None and ticket.kind != kind:
                    continue
                if states is not None and ticket.state not in states:
                    continue
                found.append(ticket)
        return found

    def open_tickets(self, gen_id=None, kind=None):
        # ONE scan, not one per open state: two scans could return the same
        # ticket twice if its state flipped between them (F-A6 reviewer P2-3),
        # and this is the exact query the R2+ invariant asserts on.
        return self.tickets(gen_id=gen_id, kind=kind,
                            state=(TICKET_SCHEDULED, TICKET_INJECTED))

    def open_presses(self):
        '''The invariant's query: presses FST still owes (design contract (C)).'''
        return self.open_tickets(kind=TICKET_PRESS)

    def counts(self):
        '''state -> count over every bucket (the future F-B4 status-dump shape).'''
        tally = {state: 0 for state in TICKET_STATES}
        for bucket in list(self._by_vk.values()):
            for ticket in list(bucket):
                tally[ticket.state] = tally.get(ticket.state, 0) + 1
        return tally

    def high_seq(self):
        '''The highest ticket seq ISSUED so far (0 when none).'''
        return self._high

    def audit(self, context, gen_id=None, expected_source_kinds=()):
        '''Debug-only invariant line (R2: it CLASSIFIES the debt it finds).
        Open tickets whose source_kind is in `expected_source_kinds` are
        expected-until-exit (a latched toggle, a macro that legally ends with a
        key held); the rest are violations - a generation or task that died
        owing something it should have drained. Returns the VIOLATION count (0 =
        invariant holds), logs both classes when anything is open, and changes
        NOTHING (shadow - reacting to debt is R3+/R4 work).'''
        open_now = self.open_tickets(gen_id=gen_id)
        if not open_now:
            return 0
        expected = tuple(expected_source_kinds)
        violations = [t for t in open_now if t.source_kind not in expected]
        if self.log:
            self.log("TICKET audit context=%s gen=%s open=%d violations=%d "
                     "expected=%d seqs_bad=%s seqs_ok=%s",
                     context, gen_id, len(open_now), len(violations),
                     len(open_now) - len(violations),
                     ",".join(str(t.seq) for t in violations) or '-',
                     ",".join(str(t.seq) for t in open_now
                              if t.source_kind in expected) or '-')
        return len(violations)

    # -- internals ---------------------------------------------------------

    def _prune(self, vk, bucket):
        '''Bound the per-vk history (design report TOP-3 risk 3: an unbounded
        list is phantom debt).

        It drops only COMPLETED tickets - the oldest ones, keeping the most
        recent MAX_PER_VK of them and EVERY open ticket, in original order -
        and it commits the result with ONE in-place store (`bucket[:] = keep`)
        so the list object stays the one every writer appended to. A
        rebind-based prune lost a concurrently opened ticket exactly this way
        (F-A6 reviewer P1-1). A reader iterating a list(...) copy is unaffected
        either way.'''
        closed = [t for t in bucket if t.state == TICKET_COMPLETED]
        keep_closed = {id(t) for t in closed[-self.MAX_PER_VK:]}
        keep = [t for t in bucket
                if t.state != TICKET_COMPLETED or id(t) in keep_closed]
        dropped = len(bucket) - len(keep)
        if dropped > 0:
            bucket[:] = keep
            if self.log:
                self.log("TICKET compact vk=%s dropped=%d kept=%d",
                         vk, dropped, len(keep))

    def _log(self, action, ticket):
        if self.log:
            self.log("TICKET %s vk=%s kind=%s state=%s src=%s/%s gen=%s seq=%s"
                     " mouse=%s", action, ticket.vk, ticket.kind, ticket.state,
                     ticket.source_kind, ticket.source_id, ticket.gen_id,
                     ticket.seq, ticket.is_mouse)


# --- typed trigger identity (F-B1, review Item 6, D1 ruling) ----------------
# D1 (estate proposals/2026-11-15_fst-improvement-plan.md, Decisions RULED):
# trigger identity = (vk_code, is_press, CONSTRAINTS) as a typed hashable
# value. Constraints are identity because multi-trigger-per-key via different
# constraints is a product feature; the fix is the VALUE, not the evaluation
# semantics (constraint evaluation stays filter-local, unchanged by F-B1).
# Before F-B1 every __eq__/__hash__ in this module compared __repr__()
# strings, so every dict get on a config object rebuilt a repr tree per
# lookup, and the filter had to hand-compare bases to dodge that (review
# Item 6). Trigger_Key is the honest value: real dataclass equality and hash,
# the constraint payload frozen once as a tuple at construction time
# (validate time - generations reuse the value, events never rebuild one).
# key_string stays display-only (repr), never identity.

@dataclass(frozen=True)
class Trigger_Key():
    '''The D1-ruled trigger identity value: (vk_code, is_press, constraints).

    vk_code    the int virtual-key code (tests may carry a label - any
               hashable value is compared by value)
    is_press   the trigger polarity; None for a polarity-less Key (a Key
               expands into both polarities, its events own the bools)
    constraints the constraint payload frozen as a tuple ONCE at event
               construction - compared by value, so two constraint payloads
               that only rendered alike under the old repr (|50|0 vs |50)
               are distinct triggers, and two equal payloads on one key are
               the same trigger regardless of which config line spelled them

    A Key_Event carries its Trigger_Key from construction; Key_Group derives
    its identity from the tuple of its members' values. The hot path looks
    triggers up by the (vk_code, is_press) base of this value (see
    FST_Keyboard Runtime_Snapshot indices), so a fired keystroke hashes ints
    and bools instead of building repr strings.'''
    vk_code: int
    is_press: bool | None
    constraints: tuple = ()


# decorator data type_check
def type_check(expected_type):
    def decorator(func):
        def wrapper(self, value):
            if not isinstance(value, expected_type):
                raise TypeError(f"Expected {expected_type}, got {type(value)}")
            return func(self, value)
        return wrapper
    return decorator


class ConfigError(Exception):
    '''
    a user config file failure (focus group name, key string) that
    must be surfaced at a user-facing boundary
    '''
    def __init__(self, reason, context=''):
        super().__init__(f"FST config error: {reason} ({context})")
        self.reason = reason
        self.context = context

    def __str__(self):
        return f"FST config error: {self.reason} ({self.context})"


class Input_Event(ABC):
    '''
    #XXX
    '''
    def __init__(self, vk_code, constraints=None, key_string = ''):
        # F-B1 (review Item 6): the old default was ONE shared [0, 0] list
        # handed to every default-constructed event; a fresh list per
        # instance removes the cross-object corruption class.
        if constraints is None:
            constraints = [0, 0]
        self._key_string = key_string
        self._vk_code = vk_code
        self._constraints = constraints

    @property
    def vk_code(self):
        return self._vk_code

    @property
    def constraints(self):
        return self._constraints

    @property
    def key_string(self):
        return self._key_string

    @abstractmethod
    def __hash__(self):
        pass

    # to be able to use complimentory to the Key class and return 2 Key_events
    @abstractmethod
    def get_key_events(self):
        pass

    @abstractmethod
    def _get_sign(self):
        pass

    @abstractmethod
    def __eq__(self, other) -> bool:
        pass

    # def __str__(self):
    #     if self._key_string is None:
    #         return f"Key_Event({self._vk_code}, {self._is_press}, {self._constraints})"
    #     else:
    #         return f"Key_Event({self._key_string}, {self._is_press}, {self._constraints})"

    def __repr__(self):
        constraints = ''
        value = 0
        for constraint in self._constraints:
            if isinstance(constraint, str):
                constraints += f"|({constraint})"
            if isinstance(constraint, int):
                if value != constraint:
                    value = constraint
                    constraints += f"{'|' + str(constraint) if constraint != 0 else ''}"
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}{constraints}"
        else:
            return f"{self._get_sign()}{self._key_string}{constraints}"


class Key_Event(Input_Event):
    '''
    #XXX
    '''
    def __init__(self, vk_code, is_press=True, constraints=None, key_string = None, is_toggle = False):
        super().__init__(vk_code, constraints=constraints, key_string=key_string)
        self._is_press = is_press
        self._is_toggle = is_toggle
        # F-B1 (D1): the typed trigger identity, built once HERE (a config
        # event is constructed at validate time; the filter's per-event
        # Key_Event is the only construction on the hot path). The
        # constraints tuple freezes the payload for value comparison.
        self._trigger_key = Trigger_Key(vk_code, is_press,
                                        tuple(self._constraints))

    @property
    def is_press(self):
        return self._is_press

    @property
    def trigger_key(self):
        '''The D1 typed identity value (created at construction, stable).'''
        return self._trigger_key

    @property
    def is_toggle(self):
        return self._is_toggle
    @is_toggle.setter
    def is_toggle(self, new_bool):
        self._is_toggle = new_bool

    def get_all(self):
        return self._vk_code, self._is_press, self._constraints

    def __hash__(self):
        # F-B1: value hash on the typed identity (was hash(self.__repr__()))
        return hash(self._trigger_key)

    # to be able to use complimentory to the Key class and return 2 Key_events
    def get_key_events(self):
        return [self, self]

    def get_opposite_key_event(self):
        return Key_Event(self._vk_code, not self._is_press, self._constraints, self._key_string)

    def __eq__(self, other) -> bool:
        # F-B1: value equality on the typed identity (was repr-string
        # equality); cross-type comparison falls back to False, matching the
        # old behaviour where a sign-prefixed event repr never matched a
        # bare Key or Key_Group repr.
        if isinstance(other, Key_Event):
            return self._trigger_key == other._trigger_key
        return NotImplemented

    def _get_sign(self):
        return '-' if self._is_press else '+'

    def repr_wo_constraints(self):
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}"
        else:
            return f"{self._get_sign()}{self._key_string}"


class Key(Input_Event):
    '''
    #XXX
    '''
    def __init__(self, vk_code, key_string='', constraints=None, is_toggle=False):
        super().__init__(vk_code, constraints=constraints, key_string=key_string)
        self._is_toggle = is_toggle
        # F-B1 (D1): typed identity value for this Key. is_press is None -
        # a Key is polarity-less (it expands into the press/release
        # Key_Events, which carry the bools); the constraints payload is
        # frozen once, shared by value with the events it expands into.
        self._trigger_key = Trigger_Key(vk_code, None, tuple(self._constraints))
        # class-level equality additionally separates the toggle latch from
        # the plain key (the old '^' repr sign did the same)
        self._identity = (vk_code, is_toggle, self._trigger_key.constraints)

        self.key_event = Key_Event(self._vk_code, is_press=True, constraints=constraints, key_string=key_string)
        if self._is_toggle:
            self.key_event.is_toggle = True
            self._key_events = [self.key_event, self.key_event]
        else:
            self._key_events = [self.key_event, self.key_event.get_opposite_key_event()]

    @property
    def is_toggle(self):
        return self._is_toggle

    def get_key_events(self):
        return self._key_events

    def _get_sign(self):
        return '^' if self._is_toggle else ''

    @property
    def trigger_key(self):
        '''The typed identity value (is_press None - see __init__).'''
        return self._trigger_key

    def __hash__(self):
        # F-B1: value hash (was hash(self.__repr__()))
        return hash(self._identity)

    def __eq__(self, other) -> bool:
        # F-B1: value equality (was repr-string equality)
        if isinstance(other, Key):
            return self._identity == other._identity
        return NotImplemented

    def __repr__(self):
        # display only (identity is the typed value above)
        if self._key_string is None:
            return f"{self._get_sign()}{self._vk_code}"
        else:
            return f"{self._get_sign()}{self._key_string}"


class Key_Group(object):
    '''
    #XXX
    '''
    def __init__(self, key_events=None):
        # F-B1 (review Item 6 named this default): key_events=[] handed ONE
        # shared list to every bare Key_Group - one call away from
        # cross-group corruption; a fresh list per instance closes it.
        if key_events is None:
            key_events = []
        if isinstance(key_events, Key_Event):
            key_events = [key_events]
        self._key_events = key_events

    @property
    def key_events(self):
        return self._key_events.copy()

    @key_events.setter
    @type_check(list)
    def key_events(self, new_list):
        self._key_events = new_list

    def get_key_events(self):
        return self._key_events

    def get_vk_codes(self):
        return [key.vk_code for key in self._key_events]

    def add_key_event(self, key_event):
        self._key_events.append(key_event)

    def append(self, key_event):
        self._key_events.append(key_event)

    def get_trigger(self):
        return self._key_events[0]

    @property
    def group_key(self):
        '''The group identity value: the tuple of its members' typed
        Trigger_Keys - built from the members' pre-built values, so the
        constraint payloads stay stored-once and comparison is by value.'''
        return tuple(key.trigger_key for key in self._key_events)

    def __hash__(self):
        # F-B1: value hash over the members' typed identities (was
        # hash(self.__repr__()) - a full repr-tree rebuild per dict get)
        return hash(self.group_key)

    def __eq__(self, other) -> bool:
        # F-B1: value equality (was repr-string equality)
        if isinstance(other, Key_Group):
            return self.group_key == other.group_key
        return NotImplemented

    def __repr__(self):
        key_strings = []
        for key_event in self._key_events:
            key_strings.append(repr(key_event))
        return "KG(" + ', '.join(key_strings) + ")"

    def __len__(self):
        return len(self._key_events)


# focus-name sanitizer rule: letters, numbers, spaces, "_", ".", ",", ":" and
# "-" keep, everything else is stripped. ONE pattern for BOTH sides of the
# focus match: the config side (Config_Manager strip + the validator mirror, so
# the warning can name the removed chars) and the active-window TITLE side
# (Focus_Task) - matching is cleaned_title.find(config_name), so the two sides
# must strip identically or a legal name never matches (FST #399, reviewer P0).
# Lives here (neutral module) because fst_manager imports fst_tasks.
FOCUS_NAME_ILLEGAL = r'[^a-zA-Z0-9,_. \-:]'


class Rebind(object):

    def __init__(self, trigger_group, replacement):
        self._trigger_group = trigger_group
        self._replacement = replacement
        self._alias = ''

    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias

    @property
    def trigger_group(self):
        return self._trigger_group

    @trigger_group.setter
    @type_check(Key_Group)
    def trigger_group(self, new_list):
        self._trigger_group = new_list

    @property
    def replacement(self):
        return self._replacement

    @replacement.setter
    @type_check(Key_Event)
    def replacement(self, new_list):
        self._replacement = new_list

    def get_trigger(self):
        return self._trigger_group.get_trigger()

    # def get_trigger_group(self):
    #     return self._trigger_group

    @property
    def _identity(self):
        # F-B1: value identity (alias, trigger group, replacement) - the
        # fields the old repr rendered; equality and hash compare these by
        # value instead of the repr string. Alias stays part of it, as in
        # the old repr.
        return (self._alias, self._trigger_group, self._replacement)

    def __hash__(self):
        return hash(self._identity)

    def __eq__(self, other) -> bool:
        if isinstance(other, Rebind):
            return self._identity == other._identity
        return NotImplemented

    def __repr__(self):
        return f"{self._alias} {self._trigger_group} : {self._replacement}"


class Macro(object):

    def __init__(self, trigger_group, key_groups):
        self._trigger_group = trigger_group
        self._key_groups = key_groups
        self._sequence_counter = 0
        self._num_sequences = len(self._key_groups)
        self._alias = ''

    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias

    @property
    def trigger_group(self):
        return self._trigger_group
    @property
    def num_sequences(self):
        return self._num_sequences
    @property
    def sequence_counter(self):
        return self._sequence_counter


    def _get_key_group(self):
        if self._num_sequences == 0:
            raise ValueError("No key groups in Macro")
        elif self._num_sequences == 1:
            return self._key_groups[0]
        else:
            if self._sequence_counter >= self._num_sequences:
                self._sequence_counter = 0
            group = self._key_groups[self._sequence_counter]
            self._sequence_counter += 1
            return group

    def get_key_events_of_current_sequence(self):
        return self._get_key_group().get_key_events()

    def reset_sequence_counter(self):
        self._sequence_counter = 0
    def get_sequence_counter(self):
        return self._sequence_counter

    def get_trigger(self):
        return self._trigger_group.get_trigger()

    @property
    def _identity(self):
        # F-B1: value identity (alias, trigger group, sequence groups) -
        # the fields the old repr rendered, compared by value.
        return (self._alias, self._trigger_group, tuple(self._key_groups))

    def __hash__(self):
        return hash(self._identity)

    def __eq__(self, other) -> bool:
        if isinstance(other, Macro):
            return self._identity == other._identity
        return NotImplemented

    def __repr__(self):
        output = f"{self._alias} {self._trigger_group} :: {self._key_groups[0]}"
        if self._num_sequences > 1:
            inset = output.find('::')
            for key_group in self._key_groups[1:]:
                output += f"\n{' ' * inset} : {key_group}"
        return output

# class Macro_Sequence(Macro):

#     def __init__(self):
#         super().__init__(self)

#     def __hash__(self):
#         return hash(self.__repr__())

#     def __eq__(self, other):
#         raise NotImplementedError
#     def __repr__(self):
#         raise NotImplementedError

class Tap_Group(object):
    '''
    #XXX
    '''
    def __init__(self, keys=None) -> None:
        # F-B1 (review Item 6): keys=[] was a shared mutable default, and
        # states was initialized with the Key OBJECTS as keys while
        # update_tap_states writes int vk codes into the same dict - the
        # Key entries stayed 0 forever (dead weight the sum() tolerated).
        # Single-key the states dict by vk code from the start: the
        # declared keys and the event updates now address ONE entry each.
        if keys is None:
            keys = []
        self.keys = keys
        self.states = {}
        self.active_key = None
        for key in self.keys:
            # Key objects carry vk_code; tests may declare plain labels
            self.states[getattr(key, 'vk_code', key)] = 0
        self.last_key_pressed = None
        self.last_key_send = None
        self._alias = ''

    @property
    def alias(self):
        return self._alias
    @alias.setter
    @type_check(str)
    def alias(self, alias):
        self._alias = alias

    def update_tap_states(self, vk_code, is_press):
        if is_press:
            self.states[vk_code] = 1
            self.last_key_pressed = vk_code
        else:
            self.states[vk_code] = 0
        self.active_key = self.get_key_to_send()

    def release_hold(self):
        """
        Drop this group's hold bookkeeping and return the vk code it held down
        in the app (None when it held nothing).

        FST-404 (#404): the group is the single owner of its app-level hold
        (`last_key_send`). The CALLER emits the release - and must do so only
        AFTER this method ran: the simulated-key leg of the win32 filter
        suppresses any injected release of a vk that is still the group's
        `active_key`, so a release emitted before the bookkeeping is cleared
        is eaten by the owner's own veto.
        """
        held = self.last_key_send
        for code in self.states:
            self.states[code] = 0
        self.active_key = None
        self.last_key_send = None
        return held

    def get_vk_codes(self):
        # F-B1 (reviewer P2-3): same member contract as the states init in
        # __init__ - Key objects yield vk_code, plain labels pass through
        return [getattr(key, 'vk_code', key) for key in self.keys]

    def get_states(self):
        return self.states

    def get_last_key_pressed(self):
        return self.last_key_pressed

    def get_key_to_send(self):
        """
        Determine which key to send based on the current state of the tap group.
        - If no keys are pressed, no key is sent.
        - If one key is pressed, that key is sent.
        - If more than one key is pressed, the last pressed key is sent.
        """
        num_of_keys_pressed = sum(self.states.values())
        key_to_send = None
        if num_of_keys_pressed == 1:
            for key, state in self.states.items():
                if state == 1:
                    key_to_send = key
        elif num_of_keys_pressed > 1:
            key_to_send = self.last_key_pressed
        return key_to_send

    def get_active_key(self):
        return self.active_key

    def get_last_key_send(self):
        return self.last_key_send

    def set_last_key_send(self, last_key_send):
        self.last_key_send = last_key_send

    # def __str__(self):
    #     key_strings = []
    #     for key in self.keys:
    #         key_strings.append(repr(key))
    #     return "Tap_Group(" + ','.join(key_strings) + ")"

    @property
    def _identity(self):
        # F-B1: value identity over the declared keys (the members compare
        # and hash by their own typed values now); a property like
        # Rebind/Macro._identity (reviewer P2-4: one name, one kind)
        return tuple(self.keys)

    def __eq__(self, other) -> bool:
        if isinstance(other, Tap_Group):
            return self._identity == other._identity
        return NotImplemented

    def __hash__(self):
        return hash(self._identity)

    def __repr__(self):
        key_strings = []
        for key in self.keys:
            key_strings.append(repr(key))
        return "Tap_Group(" + ','.join(key_strings) + ")"
