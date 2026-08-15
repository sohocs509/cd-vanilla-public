# DP-001 — pre-filing checklist (internal)

Kept out of `DP-001-tdcommons-submission.md` deliberately. That file is the document
that gets uploaded to a venue, and a disclosure carrying a section headed "remove before
filing" is a disclosure that says it was filed carelessly. Process notes live here.

**Filed with TDCommons 2026-08-15.** The submitted artifact and its digests are in
`evidence/dp-001/`.

## Checklist as completed

- [x] **Author names** — TDCommons requires real named individual authors. David Brown, sole author, confirmed 2026-08-13.
- [x] **Assignee confirmation** — Enthropic Data LLC confirmed as the publishing entity, 2026-08-13. Partner agreement to publication is assumed on that confirmation; if any partner has not been asked, ask before filing.
- [x] **Repository is public** — **done 2026-08-15.** The Reference Implementation section cites `github.com/Enthropic-Data-LLC/cd-vanilla-public`, verified reachable anonymously, with both anchored files re-hashed from the published copies to their recorded digests. The enablement claim now rests on a repository any reader can open.
- [x] **Confirm no secrets** — this document contains no keys, credentials, or customer data. Re-verify after any edit.
      Whole-repository scan 2026-08-14, working tree and all 87 commits of history: no private keys,
      API tokens, JWTs or credentialed connection strings. The demonstration cells in
      `docs/figure-data/` carry public keys, salts and ciphertext only, which is the format working as
      designed. One finding, since resolved: the pre-redaction copy of a book screenshot
      (`64-audit.png`) remained in history at two revisions and exposed internal LAN addresses in the
      audit-log IP column. That history was rewritten the same day — see the note in
      `docs/defensive-pub/REGISTER.md`.
- [ ] **Submission date** — fill in.
- [ ] After acceptance: record the DOI / publication number in `docs/defensive-pub/REGISTER.md` and save the confirmation into `docs/defensive-pub/evidence/dp-001/`.
