# Defensive Publishing Guide — Cellular Defense

**Enthropic Data LLC · Weddington, NC · enthropicdata.com**
*Working guide for creating and filing defensive publications ("defensive disclosures") for the Cellular Defense `.cell` platform.*

**Status:** Internal reference · Last updated 2026-07-18
**Scope:** the `.cell` / `.celz` encrypted-envelope format (cd-vanilla reference implementation), its cryptographic architecture, and the broker/relay systems built on it.

> ✅ **Strategy decision (2026-07-18): Cellular Defense is going the *pure defensive-publishing* path — no patent is being sought or asserted.** The SPEC's old "Patent Pending" line has been corrected accordingly. That simplifies everything below: there is no "freeze until filing" step and no grace-period clock to manage. The goal is singular — establish durable, enabling prior art so the `.cell` platform and its mechanisms can never be patented out from under Enthropic Data, and so anyone (including us) is permanently free to implement them.
>
> ⚠️ This is still engineering-and-strategy guidance, not legal advice. The one thing to double-check before publishing (Section 3) is simply: *is there anything here we'd rather keep as a trade secret than disclose?* For a client-side, inspectable format the answer is almost always "no," but confirm it once.

---

## 1. What defensive publishing is (and why Cellular Defense needs it)

**Defensive publishing** = deliberately putting a technical disclosure into the public record so that it becomes **prior art**. Once something is established prior art, *nobody* — not a competitor, not a patent troll, not a well-funded incumbent — can later obtain a valid patent on it, because it fails the novelty (and often the non-obviousness) requirement. It is a low-cost way to guarantee **freedom to operate**: you keep the right to use your own invention forever, and you deny others the ability to fence it off.

It is the mirror image of patenting:

| | Patent | Defensive publication |
|---|---|---|
| Goal | *Exclude others* from using it | *Prevent others from excluding you* |
| Cost | High ($10k–$30k+ per patent, multi-year) | Low ($0–$200, days) |
| Grants you | A monopoly you can license/enforce | No monopoly — just permanent freedom to operate |
| Grants competitors | Nothing | The same freedom to operate (they can use it too) |
| Timeline | 2–5 years to grant | Immediate prior-art effect on publication date |
| Maintenance | Renewal fees for 20 years | None |

**Why this matters for Cellular Defense specifically:**

1. **The core is genuinely novel-adjacent but built from standard primitives.** The `.cell` format composes AES-256-GCM, ECDH P-256, HKDF, AES-KW, PBKDF2, WebAuthn PRF, and Shamir SSS — all public, all standardized. The *novelty* lives in the **specific composition**: metadata-as-AAD binding, the canonical-serialization audit chain, the browser-native zero-knowledge envelope, the Mitosis lineage chain, the quorum-wrapped-CEK access map. That kind of "novel arrangement of known parts" is exactly what a competitor might try to patent *around* you — and exactly what a strong defensive publication neutralizes.
2. **You've chosen not to patent — so prior art is your *only* protection against being fenced in.** With no patent of your own, a competitor's patent on any of these mechanisms would be a direct threat to your freedom to operate. Defensive publication is the shield: it makes every disclosed mechanism unpatentable by anyone, forever.
3. **The reference implementation is (or is heading) public.** cd-vanilla is a clean-room reference spec written "for security researchers, third-party implementers, and technical evaluators." That audience *is* the ideal prior-art readership. A published SPEC already does a lot of defensive-publishing work — but only if its disclosure is complete, enabling, and durably timestamped (Sections 5–7).

---

## 2. The three things a disclosure must do to be effective prior art

A blog post that says "we built encrypted files" is worthless as prior art. To actually block a future patent, a defensive publication must satisfy the same bar an examiner applies to a patent's own specification:

1. **Public accessibility.** It must be genuinely available to the interested public — indexed, searchable, retrievable by a "person having ordinary skill in the art" (PHOSITA) without undue effort. A file on a private server does *not* count. (See venue table, Section 4.)
2. **Enablement.** It must describe the invention in enough detail that a skilled practitioner could **build it without inventing anything themselves**. Hand-waving ("we bind the metadata cryptographically") is not enabling; the exact AAD construction, byte order, and serialization rules *are*. Your SPEC's algorithm blocks (`meta = [prev_hash, threshold, lifetime, policy]`, the canonicalization pseudocode, the HKDF `info` string) are gold here.
3. **A fixed, provable date.** Prior art is dated. You must be able to prove the disclosure existed **on or before** a given date, in a way a third party (patent office, court) will accept. This is where amateur defensive publishing fails — see Section 5.

If a disclosure has all three, it defeats novelty for everything it *explicitly and enablingly* describes, plus (for obviousness) the trivial variations a skilled person would derive from it.

---

## 3. The one gate before publishing — publish or keep secret?

Since the patent path is off the table, the triage collapses to a single, simple question per element: **publish it (make it prior art) or keep it a trade secret?** There is no "freeze until filing," no grace-period clock, no international-novelty trap to manage. You are free to publish everything the moment it's ready.

### 3.1 The only two buckets that remain

| Bucket | Choose when… | Action |
|---|---|---|
| **P. Publish** | It's a mechanism, format, or protocol you want to guarantee stays free to implement — i.e. you'd be harmed if a competitor patented it. | Defensively publish (Section 4+). This is **almost everything** in Cellular Defense. |
| **S. Keep secret** | The value depends on it being unobservable — a server-side heuristic, ranking, or process that produces no artifact a third party can inspect. | Do **not** publish. |

**Why bucket S is nearly empty for Cellular Defense:** `.cell` is a *client-side, self-contained, inspectable* format. Anything that ships in the browser or in a `.cell` file is already observable by anyone who has one — it cannot be a durable trade secret, so there's no reason not to publish it and gain the prior-art protection. The only genuine bucket-S candidates are purely server-side behaviors that never leave a trace in outputs (and CD, being zero-knowledge, has very few of those).

### 3.2 The hard exclusions — never in a publication

These aren't a strategic choice; they simply must never appear in any disclosure regardless of bucket:

- Private keys, PKCS#8 material, `.cdkey` private exports
- Private CA material (e.g. `data/ca-private.json`)
- API keys, `.env` secrets, Cap secrets, DB credentials
- Any customer/patient data or real ciphertext blobs

A defensive publication discloses **the mechanism**, never the secrets that instantiate it. (Section 9 step 5 is the scrub gate that enforces this.)

### 3.3 One thing to confirm once

Before the first filing, confirm with the IP owner (David Brown) that **nothing here is intended to be held back as a trade secret** — i.e. that the "pure defensive publishing" decision applies to the whole surface area, not just the format. For a client-side inspectable platform this is almost certainly "publish it all," but it's a one-time five-minute confirmation worth having on record.

---

## 4. Where to publish — venues ranked for Cellular Defense

Effectiveness as prior art depends on **durability**, **searchability**, and **credible timestamping**. Ranked best-to-good for our use:

| Venue | Cost | Timestamp quality | Indexed / searchable | Best for | Notes |
|---|---|---|---|---|---|
| **IP.com Prior Art Database** | ~$150–$200/disclosure | Excellent (purpose-built, examiner-trusted) | Yes — searched by USPTO/EPO examiners | The definitive defensive publication | The gold standard. Examiners actively search it. Assigns a citable publication number. |
| **Technical Disclosure Commons (TDCommons.org)** | **Free** | Excellent (run by a patent-services firm, DOI-stamped) | Yes — Google Scholar indexed | Best free option — use this as the default | Free, permanent, DOI'd, examiner-visible. Strongly recommended primary venue. |
| **Research Disclosure journal** | Paid | Excellent (established, examiner-recognized) | Yes | Traditional, respected | Long pedigree; examiners know it. |
| **arXiv (cs.CR)** | Free | Very good (versioned, dated, permanent) | Yes — Google Scholar, arXiv search | A rigorous crypto write-up of the `.cell` scheme | Requires endorsement for first-time authors; content must read like a paper. Excellent for the crypto-protocol disclosure. |
| **IACR ePrint Archive** | Free | Very good (dated, permanent, crypto-specific) | Yes — the crypto community's index | The cryptographic protocol paper | *The* venue crypto examiners and researchers search. Ideal for the AAD-binding / access-map / Shamir-CEK design. |
| **Peer-reviewed conf/journal (e.g. USENIX Security, PETS)** | Free–paid | Excellent + credibility | Yes | If you want academic credibility too | Slow (review cycles) and public disclosure happens at submission/preprint — mind Section 3 timing. |
| **Company blog + GitHub (public repo + SPEC)** | Free | **Weak on its own** — self-hosted, editable, no independent timestamp | Partially | Supplementary; not sufficient alone | A public GitHub repo *is* citable prior art if archived, but you must anchor the date externally (Section 5) — self-hosted dates are challengeable. |

**Recommended Cellular Defense playbook:**

1. **Primary:** File the full SPEC + a plain-language disclosure on **TDCommons** (free, DOI, examiner-visible). This is your anchor publication.
2. **Reinforcing:** Post a rigorous protocol write-up on **IACR ePrint** and/or **arXiv cs.CR** — this reaches the exact PHOSITA (cryptographers) and is the most credible enablement record.
3. **Optional premium:** Add an **IP.com** publication for the one or two most commercially critical ★ mechanisms you most want to bulletproof.
4. **Supplementary:** Keep the public **GitHub repo + SPEC.md** live and **anchor its history externally** (Section 5) so the code itself is corroborating enabling prior art.

Publishing to *multiple* venues is normal and encouraged — redundancy makes the prior art harder to overlook or challenge.

---

## 5. Establishing a bulletproof priority date

A disclosure's date is only as strong as your ability to *prove* it independently. Self-asserted dates (a file's mtime, a blog's "posted on" line, a Git commit's author date — all of which the author can forge) are weak. Use one or more **independent, tamper-evident** anchors:

| Method | Strength | How |
|---|---|---|
| **Established publication venue** | Strongest | TDCommons/IP.com/arXiv/ePrint each assign an authoritative publication date you don't control. This is why Section 4 matters. |
| **Trusted timestamp (RFC 3161)** | Very strong | Get a cryptographic timestamp token over the SHA-256 of the document from a Time-Stamping Authority (e.g. FreeTSA, DigiCert). Proves "this exact content existed by this instant." |
| **OpenTimestamps (Bitcoin-anchored)** | Very strong | `ots stamp SPEC.md` → anchors the file hash into the Bitcoin blockchain. Free, decentralized, independently verifiable forever. Ideal for the GitHub-hosted SPEC and reference code. |
| **Git tag + signed commit + public push** | Moderate | A GPG-signed, tagged commit pushed to public GitHub gives a corroborated date (GitHub's receipt + the signature), but Git dates alone are author-settable — pair with OpenTimestamps. |
| **Software Heritage archive** | Strong | Submit the public repo to archive.softwareheritage.org — an independent, dated, permanent archive of the source (enabling prior art in code form). |
| **Wayback Machine snapshot** | Moderate–strong | Trigger an archive.org capture of the public SPEC/blog URL. Independent third-party dated snapshot. |

**Recommended anchoring stack for the `.cell` SPEC and reference code (all free):**

```
# 1. OpenTimestamps the canonical documents (independent, blockchain-anchored)
ots stamp SPEC.md
ots stamp cell-crypto.js          # the enabling reference implementation
ots stamp DEFENSIVE-PUBLISHING-GUIDE.md   # this file, if internal record wanted

# 2. Sign and tag the release commit
git tag -s cell-format-v1.2-defensive-pub -m "Public defensive disclosure of .cell format v1.2"
git push origin --tags

# 3. Push public repo to Software Heritage + Wayback
#    (submit the repo/SPEC URL to archive.softwareheritage.org and web.archive.org)

# 4. File on TDCommons / arXiv / IACR ePrint (venue assigns the authoritative date)
```

Keep the resulting `.ots` proof files, the venue publication numbers/DOIs, and the archive URLs together in a dated evidence folder (Section 9). If the date is ever challenged, this bundle is your proof.

---

## 6. Inventory — what's disclosable in Cellular Defense

This is the raw material for your disclosures. Every item below is a **publish (bucket P)** candidate — for a client-side inspectable format, essentially all of it should be published. The ones marked ★ are the strongest "novel arrangement of known parts" candidates — the exact things a competitor is most likely to try to patent around you, and therefore the highest-value defensive publications; publish those first and most thoroughly.

### 6.1 The envelope & format
- ★ **Browser-native zero-knowledge `.cell` envelope**: a self-contained JSON document that carries ciphertext + per-recipient wrapped keys + advisory metadata + audit chain, encrypted entirely client-side so the server holds only opaque ciphertext (§1–2, §4).
- **`.celz`** gzip variant; **`.cdpub` / `.cdkey`** key-file formats (§3, §13).
- **Encrypted manifest prefix**: `[4-byte LE len][manifest JSON][file bytes]`, gzip-then-encrypt, so filename/MIME/size are *inside* the ciphertext and invisible to the server (§5). ★ metadata-confidentiality-by-construction.
- **Optional in-ciphertext sender `meta`** object (note/case-number/reply-instructions) inheriting the payload's confidentiality+integrity with no version bump (§5.1).

### 6.2 Cryptographic composition
- ★ **Metadata-as-AAD binding (§4.4)**: binding `prev_hash`/`threshold`/`lifetime`/`policy` to the ciphertext as AES-GCM Additional Authenticated Data so the advisory header is **tamper-evident, non-strippable, and non-downgradeable** — an attacker can't edit `version` to `1.0` to bypass it because the ciphertext was produced *with* the AAD. This is the single most distinctive design choice; publish it thoroughly.
- ★ **Canonical-serialization audit chain (§4.1.1, §10)**: computing `header_hash`, `header_sig`, and AAD over a deterministic sorted-key/no-whitespace JSON so reformatting doesn't produce false tamper failures — with **per-version gating** so v1.0/v1.1 cells still verify under their original rules (§12).
- **Per-recipient CEK wrapping**: ephemeral ECDH P-256 → HKDF-SHA256 (`info="cellular-defense-cek-wrap-v1"`) → AES-KW, a fresh ephemeral keypair per recipient per cell for per-cell forward secrecy and key isolation (§6.1, §16).
- **Multi-method access map**: the same wrapped-CEK slot fillable by ECDH, PBKDF2 (600k), *or* WebAuthn/FIDO2 **PRF (hmac-secret)** — the PRF output used directly as the AES-KW key (§6.2–6.3).
- ★ **Quorum via Shamir-split *CEK*** (not the document): CEK split over GF(256) into N shares, each share wrapped independently in an access-map entry keyed by `share_index`; M-of-N reconstruction by Lagrange interpolation at x=0 (§6.4, §7). The "Shamir-share the content key, then wrap each share to a different access method" arrangement is a strong ★ candidate.
- **YubiKey-as-the-key derivation** (from the cd-cert-broker line): deriving the P-256 keypair *from* the WebAuthn PRF output (scalar = PRF mod n) rather than PRF-wrapping a stored key — the token *is* the key, never stored. ★ — a distinctive, high-value publish; give it its own disclosure.

### 6.3 Lifecycle & governance
- **Lifetime model** (permanent/flash/session/clinical/record/timed_release) with client-side pre-decrypt enforcement, made tamper-evident by the AAD binding while remaining honestly documented as *advisory toward an authorized holder* (§8).
- **Mitosis lineage chain (§11)**: `prev_hash` = predecessor's `header_hash`, forming an auditable chain-of-custody across re-encryptions (recipient/key/policy changes) — covered by hash, signature, and AAD.
- **Policy block** (copy_protection / watermark_mode / origin) committed into the signed, AAD-bound header (§9).
- **Apoptosis / revocation** and single-use semantics (referenced in the platform description).

### 6.4 Systems built on the format
- **Email-keyed public-cert directory + encrypted relay** (cd-cert-broker): magic-link-verified public-cert publishing (keys.openpgp.org pattern) + unguessable-link TTL blob relay with burn-after-read and per-download audit trail — private keys in browser IndexedDB only. ★ as a *system* composition.
- **Zero-knowledge broker architecture** where the server stores only opaque ciphertext and never holds plaintext, CEK, or any private key (§2.1).

> **Excluded from every disclosure (bucket S / hard exclusions, §3.2):** private keys, the private CA material (`data/ca-private.json`), API keys, `.env` secrets, Cap secrets, any server-side heuristic whose value depends on secrecy, and any customer/patient data. A defensive publication discloses *the mechanism*, never *the secrets that instantiate it*.

---

## 7. Anatomy of a strong defensive publication

A defensive publication borrows structure from a patent specification (because it's judged by the same enablement bar) but is written to be *found and understood*, not to claim monopoly. Use this skeleton:

1. **Title** — specific and keyword-rich so examiners' searches hit it. Bad: "A secure file system." Good: *"Tamper-Evident Metadata Binding for Client-Side-Encrypted Documents via AES-GCM Additional Authenticated Data."*
2. **Abstract (150–250 words)** — what the mechanism is and the problem it solves, in the language a searcher would use.
3. **Field & background / problem statement** — the prior situation and its shortcoming (e.g. "advisory header metadata in encrypted envelopes is typically strippable or downgradeable because it is not cryptographically bound to the ciphertext").
4. **Summary of the disclosed mechanism** — the idea in a paragraph.
5. **Detailed description — the enabling core.** Every parameter, byte order, algorithm identifier, serialization rule, and construction, at the level of your SPEC's algorithm blocks. Include:
   - Exact primitives and parameters (AES-256-GCM, 96-bit IV, ECDH P-256, HKDF-SHA256 with the literal `info` string, AES-KW, PBKDF2 600k, Shamir over GF(2⁸) poly `0x11b`).
   - The precise data structures (JSON layouts from §4).
   - The exact construction steps (the `meta` array order for AAD; the `canonicalize()` pseudocode; the encode/decode stacks from §5.2–5.3).
6. **Variations & alternatives** — deliberately enumerate the obvious variants (other curves, other KDFs, other quorum schemes, other access methods) so they're *also* covered as prior art and can't be patented as "the P-521 version of the same idea." **This is the highest-leverage section for blocking design-arounds.**
7. **Diagrams** — an architecture/data-flow figure and the audit-chain nesting diagram (§10) help both searchability and enablement.
8. **Worked example** — a concrete instance (the §15 complete example cell).
9. **Reference to implementation** — cite the public repo + timestamp anchors as corroborating enabling disclosure.

**Tone rules:** be *broad in what you cover* (enumerate variants) but *precise in how you describe it* (exact parameters). Avoid marketing language — examiners don't search for "military-grade"; they search for "AES-GCM additional authenticated data metadata binding."

---

## 8. Fill-in-the-blanks template (ready to use)

Copy this per disclosable mechanism. Below the template is a fully worked example for the flagship AAD-binding mechanism.

```markdown
# DEFENSIVE PUBLICATION

**Title:** <specific, keyword-rich>
**Authors / Assignee:** <inventors>, Enthropic Data LLC, Weddington, NC
**Publication date:** <date>   **Venue:** <TDCommons / IP.com / arXiv / ePrint>
**Timestamp anchors:** <OpenTimestamps hash; venue DOI/number; Wayback URL>

## Abstract
<150–250 words: mechanism + problem solved, in searchable language>

## Field
<the technical area — e.g. client-side/end-to-end encryption of documents>

## Background & Problem
<the prior situation and the specific shortcoming this addresses>

## Summary
<one-paragraph statement of the disclosed mechanism>

## Detailed Description
### Primitives & parameters
<exact algorithms, key sizes, IV sizes, iteration counts, curve, poly, info strings>
### Data structures
<the JSON layouts / byte layouts>
### Construction (step by step, enabling)
<numbered steps a PHOSITA can follow to build it, no gaps>
### Verification / decode path
<the inverse operations>

## Variations & Alternatives
<enumerate obvious substitutions so they are also prior art>

## Worked Example
<a concrete instance with representative values>

## Reference Implementation
<public repo URL + commit hash + timestamp anchor>
```

### 8.1 Worked example — flagship disclosure

```markdown
# DEFENSIVE PUBLICATION

**Title:** Tamper-Evident, Non-Downgradeable Binding of Advisory Header
Metadata to Ciphertext in Client-Side-Encrypted Document Envelopes via
AES-GCM Additional Authenticated Data

**Authors / Assignee:** [Inventors], Enthropic Data LLC, Weddington, NC
**Publication date:** [date]   **Venue:** Technical Disclosure Commons
**Timestamp anchors:** SHA-256 <hash> anchored via OpenTimestamps [txid];
TDCommons DOI [xxx]; repo commit [sha]

## Abstract
An encrypted-document envelope carries advisory metadata — a threshold/quorum
requirement, a lifetime policy, a distribution policy, and a lineage pointer —
alongside ciphertext. Conventionally this metadata sits in a plaintext or merely
hashed header, where a third party can strip it, alter it, or downgrade the
format to disable the behavior it governs, because it is not bound to the
ciphertext itself. This disclosure describes binding that metadata to the
ciphertext as AES-GCM Additional Authenticated Data (AAD), computed over a
deterministic canonical serialization, such that any modification, removal, or
version-downgrade of the bound metadata causes authenticated decryption to fail.
The binding is not strippable (the recipient always supplies current metadata as
AAD; there is no separate toggle to remove) and not downgradeable (re-encrypting
without the AAD is impossible without the content key). The mechanism is version-
gated so that earlier envelope versions verify under their original rules.

## Field
End-to-end / client-side encryption of documents; authenticated encryption with
associated data; tamper-evident metadata.

## Background & Problem
Client-side-encrypted document formats commonly attach governance metadata
(expiry, quorum thresholds, redistribution policy, version-lineage pointers) to
the ciphertext in a header. When that metadata is only in plaintext or protected
by an *unkeyed* hash, an attacker who edits the header can recompute the hash, so
the metadata is not authentic. Even with a signature over the header, an attacker
may attempt a downgrade: change a version field so that a lenient older code path
ignores the metadata. The problem is to make advisory metadata tamper-evident,
non-strippable, and non-downgradeable without adding a separate keyed MAC or a
server-side check.

## Summary
Fix the governing metadata before content encryption, serialize it canonically,
and pass it as the AAD input to AES-256-GCM when encrypting the document body.
The GCM authentication tag then covers both ciphertext and metadata. At decrypt
time the recipient reconstructs the same AAD from the current header; any
mismatch — including a downgrade attempt — fails the tag.

## Detailed Description
### Primitives & parameters
- Content cipher: AES-256-GCM, 256-bit content-encryption key (CEK), 96-bit
  random IV, 128-bit authentication tag.
- Canonical serialization: JSON with recursively lexicographically sorted object
  keys, no insignificant whitespace, primitive encoding identical to JSON.stringify;
  undefined-valued keys omitted; arrays preserve order with undefined→null.

### Data structures
The bound metadata is the fixed-order array:
    meta = [ prev_hash, threshold, lifetime, policy ]
where prev_hash is a lineage pointer (or null), threshold = {required M, of_total
N}, lifetime = {type, expires_at, release_at, on_expiry, single_use, minimum_atl},
policy = {copy_protection, watermark_mode, created_on_origin, origin_sig}.

### Construction (enabling)
1. Generate CEK (256-bit CSPRNG) and IV (96-bit CSPRNG).
2. Assemble `meta` from the finalized header fields (these are known before
   encryption; the per-recipient access map and payload hash are excluded because
   they are derived *after* encryption).
3. Compute AAD = UTF-8 bytes of canonicalize(meta).
4. Encrypt the (manifest-prefixed, gzip-compressed) body:
       ciphertext‖tag = AES-256-GCM(key=CEK, iv=IV, aad=AAD, plaintext=body)
5. Store IV and ciphertext in the envelope; store `meta` fields in the header.

### Verification / decode path
1. Reconstruct AAD = UTF-8 bytes of canonicalize([prev_hash, threshold,
   lifetime, policy]) from the *current* header.
2. Decrypt: body = AES-256-GCM-open(CEK, IV, AAD, ciphertext‖tag).
3. If any bound field was altered/removed, or the format was downgraded so a
   different AAD (or empty AAD) is supplied, the tag verification fails and no
   plaintext is released.

## Variations & Alternatives
- Any AEAD with associated-data support (AES-GCM-SIV, ChaCha20-Poly1305,
  AES-CCM) substitutes for AES-256-GCM.
- Any deterministic canonicalization (JCS/RFC 8785, CBOR canonical form,
  sorted-key encodings) substitutes for the described JSON canonicalization.
- The bound metadata set may be extended or reduced; the binding property holds
  for whatever fields are included in the AAD.
- Version gating may select serialization/AAD rules per envelope version so that
  legacy envelopes remain verifiable.
- Applicable to any per-recipient key-wrapping scheme (ECDH+HKDF+AES-KW, RSA-KEM,
  passphrase-KDF, FIDO2/WebAuthn PRF) since the binding is independent of how the
  CEK is distributed.

## Worked Example
[Insert the §15 complete-cell example with representative base64 values.]

## Reference Implementation
Public reference: github.com/<org>/cd-vanilla, cell-crypto.js at commit <sha>;
file hash anchored via OpenTimestamps on <date>.
```

---

## 9. End-to-end workflow (checklist)

```
[ ] 0. One-time: confirm with IP owner (David Brown) that the pure-defensive-pub
        decision applies to the whole surface area — nothing held back as a secret (§3.3).
[ ] 1. Inventory disclosable elements (Section 6). Confirm each is bucket P (publish);
        flag the rare bucket-S exception if any.
[ ] 2. Prioritize: ★ mechanisms first (highest patent-around risk).
[ ] 3. For each element: draft a disclosure from the Section 8 template.
        → Enabling detail (Section 7 §5) + Variations (Section 7 §6) are mandatory.
[ ] 4. Technical review: does a PHOSITA outside the team learn to BUILD it from this
        alone? (Have someone not on the project read it and try.)
[ ] 5. Scrub for hard-exclusion leakage (§3.2): no keys, CA material, .env secrets, customer data.
[ ] 6. Anchor the date (Section 5): OpenTimestamps + signed git tag + archives.
[ ] 7. Publish to primary venue (TDCommons) + reinforcing venue (arXiv/ePrint).
[ ] 8. Record evidence: save publication numbers/DOIs, .ots proofs, archive URLs,
        commit hashes into a dated evidence folder (e.g. docs/defensive-pub/evidence/).
[ ] 9. Log it: add a row to the disclosure register (Section 10) + a Kanboard task
        under project #30 for traceability.
[ ] 10. Re-run this loop whenever a materially new mechanism ships (each new ★ item).
```

---

## 10. Maintain a disclosure register

Keep a living index so nothing is published twice, nothing is forgotten, and the evidence trail is auditable. A simple table in `docs/defensive-pub/REGISTER.md`:

| ID | Mechanism | Priority | Status | Venue | Pub #/DOI | Date | Timestamp anchor | Evidence path |
|----|-----------|----------|--------|-------|-----------|------|------------------|---------------|
| DP-001 | Metadata-as-AAD binding | ★ | published | TDCommons | 10.xxxxx | 2026-… | ots:<txid> | evidence/dp-001/ |
| DP-002 | Canonical-serialization audit chain | ★ | draft | — | — | — | — | — |
| DP-003 | Shamir-split CEK access map | ★ | review | — | — | — | — | — |
| … | | | | | | | | |

Mirror the register into Kanboard project #30 (`[B] Cellular Defense`) so IP work is visible alongside engineering.

---

## 11. Pitfalls — how defensive publishing fails

1. **Non-enabling disclosure.** "We cryptographically bind the metadata" blocks nothing — a competitor can still patent the *specific* AAD construction. → Include exact parameters, byte order, and construction steps (Section 7 §5).
2. **No variant coverage.** Disclosing only the P-256 version lets someone patent "the same thing with P-521 / with ChaCha20 / with RSA." → Enumerate obvious alternatives (Section 7 §6).
3. **Weak/self-asserted date.** A blog date or Git author-date is editable and challengeable. → Anchor externally (Section 5).
4. **Private/ephemeral "publication."** A PDF emailed to a few people, or a page behind login, isn't publicly accessible prior art. → Use indexed, permanent venues (Section 4).
5. **Secret leakage.** Pasting a real key, `.env` value, or CA private key into a disclosure. → §3.2 hard exclusions + Section 9 scrub step; disclose mechanisms, never secrets.
6. **Marketing prose instead of technical prose.** Examiners search technical terms. "Bank-grade security" is unsearchable and unhelpful. → Write like the SPEC, not the landing page.
7. **One-and-done.** New mechanisms ship after the first disclosure and go unpublished, leaving fresh patent-around surface. → Re-run the loop per new ★ mechanism (Section 9 step 10).

---

## 12. TL;DR

- **Defensive publishing = making your invention permanent prior art** so no one can patent it and lock you out. Cheap, fast, permanent — but grants no monopoly.
- **CD is going pure defensive-pub — no patent (Section 3).** No filing to time, no grace-period clock. The only gate is "publish vs. keep secret," and for a client-side inspectable format that's *publish essentially everything* (secrets/keys/customer data always excluded, §3.2).
- **A disclosure only works if it's (1) publicly accessible, (2) enabling, and (3) provably dated.** Amateur attempts fail on enablement and date.
- **Default venue: TDCommons (free, DOI, examiner-visible); reinforce on arXiv/IACR ePrint.** Anchor dates with OpenTimestamps + signed tags + Software Heritage/Wayback.
- **The highest-value CD disclosures** are the "novel arrangement of standard primitives" mechanisms — metadata-as-AAD binding, the canonical-serialization audit chain, the Shamir-split-CEK access map, the multi-method wrapped-CEK slot, and the zero-knowledge browser envelope itself.
- **Cover variants explicitly** — that's what actually blocks design-arounds.
- **Register everything, anchor the evidence, re-run per new mechanism.**

---

*Cellular Defense · Enthropic Data LLC · enthropicdata.com — internal IP-strategy reference. Not legal advice. CD is on the pure defensive-publishing path (no patent sought); disclose mechanisms freely, never secrets.*
