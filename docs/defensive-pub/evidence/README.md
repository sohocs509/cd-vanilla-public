# Evidence — independent archives and their identifiers

Third-party, dated records that the published bytes were publicly retrievable. These
corroborate the OpenTimestamps anchors: the anchors prove *when the bytes existed*, these
prove *that the public could get them*. Both are needed and they are not the same claim.

Nothing here depends on Enthropic Data continuing to exist, or on this repository staying
online.

---

## Software Heritage — archived 2026-08-15

Save request `2426591`, `save_task_status: succeeded`, `visit_status: full`.

| What | Identifier |
|---|---|
| Repository snapshot | `swh:1:snp:41977f6b7b27ab1a29ae27fd5889b358f5834f36` |
| `docs/SPEC.md` (content) | `swh:1:cnt:08626ba292a3adf59290e4335af02074e48941c0` |
| `cell-crypto.js` (content) | `swh:1:cnt:9ca50b405ce218a158d2ce7f2ec517bfc331389f` |

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

Capture requested for the repository page and the raw URLs of `docs/SPEC.md`,
`cell-crypto.js` and `docs/DEFENSIVE-DISCLOSURE.md`. Each returned HTTP 302 to a stored
snapshot, which is the accept-and-store response.

Retrieve with `https://web.archive.org/web/2026/<url>`, or query
`https://archive.org/wayback/available?url=<url>` for the exact timestamp.

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
