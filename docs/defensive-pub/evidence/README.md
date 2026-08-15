# Evidence — independent archives and their identifiers

Third-party, dated records that the published bytes were publicly retrievable. These
corroborate the OpenTimestamps anchors: the anchors prove *when the bytes existed*, these
prove *that the public could get them*. Both are needed and they are not the same claim.

Nothing here depends on Enthropic Data continuing to exist, or on this repository staying
online.

---

## Software Heritage — archived 2026-08-15

Two save requests, both `save_task_status: succeeded` with `visit_status: full`.

| What | Identifier |
|---|---|
| Repository snapshot — request `2426591`, at commit `792cec8` | `swh:1:snp:41977f6b7b27ab1a29ae27fd5889b358f5834f36` |
| Repository snapshot — request `2426597`, includes this record | `swh:1:snp:746c463ff7a290f0c59dfec44c81fa41de2190dc` |
| `docs/SPEC.md` (content) | `swh:1:cnt:08626ba292a3adf59290e4335af02074e48941c0` |
| `cell-crypto.js` (content) | `swh:1:cnt:9ca50b405ce218a158d2ce7f2ec517bfc331389f` |

Either snapshot is sufficient; the second is later and strictly larger. The two `cnt:`
identifiers are unchanged between them, because the specification and the reference
implementation were not touched — which is the point of anchoring them.

Resolve any of them at `https://archive.softwareheritage.org/<swhid>`.

The two `cnt:` identifiers are **content-addressed**: they are the SHA-1-git of the file
bytes, so they name the specification and the reference implementation themselves, not a
location that could later serve something else. Confirmed archived by API resolution on
2026-08-15.

> These are a different hash function from the SHA-256 digests in `REGISTER.md` and are not
> interchangeable with them. `swh:1:cnt:` is SHA-1-git — Software Heritage's content
> address. The Bitcoin anchors commit to the SHA-256 values. Both name the same bytes by
> different means, and each should be cited for what it proves: SWH for public
> availability, OpenTimestamps for date of existence.

## Internet Archive / Wayback Machine — captured 2026-08-15

**Confirmed by retrieving the stored copies and hashing them** — not merely by the capture
request succeeding. Each archived file was downloaded from the Wayback snapshot and its
SHA-256 compared against the anchored digest:

| Archived URL | Snapshot | SHA-256 of the stored copy |
|---|---|---|
| raw `docs/SPEC.md` | `20260815124807` | `870a5ea0…d8d20c0d` — **matches the v1.3 anchor** |
| raw `cell-crypto.js` | `20260815124813` | `277cbcfe…8e7537bb` — **matches the v1.3 anchor** |
| raw `docs/DEFENSIVE-DISCLOSURE.md` | `20260815124819` | corrected text confirmed present |

This is the strongest form this evidence takes, and it is worth being explicit about why:
an independent third party, with no relationship to Enthropic Data, is holding a dated copy
of bytes that hash to the digests committed to the Bitcoin blockchain. Existence, content
and public availability are each independently checkable, by different parties, using
different mechanisms.

The repository landing page was also captured. One request
(`docs/defensive-pub/anchors/README.md`) was refused with HTTP 429 and not retried — the
anchored bytes it describes are archived in full at Software Heritage above, so nothing
rests on it.

Retrieve any of them with `https://web.archive.org/web/2026/<url>`.

> Read-backs against `archive.org/wayback/available` and the CDX index were rate-limited
> (429) and briefly 503 during this work. That is archive.org throttling, not a problem
> with the captures; fetching `web.archive.org/web/2026/<url>` directly worked and is what
> the table above was verified with. Use that path if the availability API refuses.

> Wayback is recorded here as *moderate–strong* corroboration, per §5 of the publishing
> guide — weaker than Software Heritage for source code because it captures rendered pages
> rather than the repository object graph. It is redundancy, not the primary record.

---

## What is still missing

**No venue submission has been made.** These archives establish public availability; they
do not place the disclosure anywhere an examiner routinely searches. DP-001 remains
`draft`. Until a filing exists, this directory records reachability, not prior art in the
form examiners encounter it.

When a venue accepts a submission, record the publication number or DOI in
`../REGISTER.md` and save the acceptance confirmation into `dp-001/` beside this file.
