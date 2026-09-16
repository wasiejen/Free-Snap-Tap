# research/ — research docs (dated findings, NOT instructions)

Purpose: dated findings on ideas worth exploring — research that informs a
maintainer decision. This folder is NOT instructions, NOT a TODO, and NOT
the knowledge base (verified, gained knowledge lives in `agent/knowledge/`).

What goes here: ONE dated doc per research topic, named
`YYYY-MM-DD_<topic>.md`. A research doc records: problem framing with short
citations, reference design(s), feasibility in this build, risks, and ranked
recommendations. It builds nothing. Every doc starts with a `Session_ID:` +
`Agent:` header (maintainer ruling 2026-09-16) — the resume path for the
session that produced it (or the archive lookup if it is gone). Addenda to an
existing doc are separate dated files in the same folder; the source doc stays
the untouched record.

What does NOT go here:
- implementation (code, plugins, prompts — the repo owns those)
- approved proposals → `.opencode/proposals/`
- verified, actionable findings → `agent/knowledge/`
- task specs / handover files → `agent/handover/`

A research doc RECOMMENDS; the maintainer DECIDES; an approved build lands in
the normal code / plugin / prompt scope and leaves the doc as a record.
