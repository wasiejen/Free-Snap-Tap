# Controls, debug combos, status dump

> Part of the FST docs: [index](README.md) - [features & install](../README.md)

## Controls

- **Toggle Pause:** Press the `ALT + DELETE` key to pause or resume the program.
  - resuming will reload key and tap groups from files
- **Stop Execution:** Press the `ALT + END` key to stop the program.
- **Return to Menu:** Press the `ALT + PAGE_DOWN` key to return to the menu.
You can change the control key combinations in the py file under # Control key combination.

### [Numpad debug combos]

- only active with the start argument `<arg>-debug_numpad`
- `ALT + NUM1` to `ALT + NUM4` toggle the internal debug outputs DEBUG, DEBUG2, DEBUG3 and DEBUG4
- `ALT + NUM5` prints the internal representation of all groups
- `ALT + NUM6` toggles the drop-watch lane (U345, #291 H1): filter legs that
  die mid-event land named, ASCII-safe drop lines in the append-only
  `fst_drop.log` (and in `fst.log`); the raw-event ring rides always (µs
  cost) - `ALT + NUM6` on adds the ring tail + the dedicated file
- `ALT + NUM7` prints the real pressed-key states
- `ALT + NUM8` prints all pressed-key states (real and simulated)

### [Status dump - THE bug-report artifact]

- `fst_status.log` in the program's working directory (next to `fst.log`) is
  the ONE supported snapshot surface - written at every start-up and on every
  successful config reload, overwritten atomically, so it always matches the
  moment it was asked for. Attach it to a bug report.
- Sections: effective start arguments (post-validation) - lifecycle state -
  focus scope - group counts - tap / hold / toggle states (typed vk codes, no
  object reprs) - the ticket ledger - paths.
- The ledger section lists the open tickets (`seq vk kind state source_kind
  source_id gen mouse age_ms`) with counts by class, and names any ticket
  older than `CONSTANTS.STUCK_TICKET_MS` (default 5000 ms) with a
  `[StuckKeyWatch]` line - that line also lands in `fst.log` at WARNING.
- The dump renders on the asyncio loop thread, never on the keyboard hook
  pump, and has no hotkey of its own (the numpad combos above stay the
  ad-hoc live inspection surface).

