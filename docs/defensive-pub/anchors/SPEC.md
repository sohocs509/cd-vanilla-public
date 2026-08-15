# Cellular Defense — Cell Format Specification v1.2

**Enthropic Data LLC · enthropicdata.com · Weddington, NC**  
*Published as a defensive disclosure — freely implementable; no patent asserted.*

> **Since v1.1/v1.2:** the advisory header metadata (threshold, lifetime, policy,
> lineage) is now cryptographically bound to the ciphertext as AES-GCM
> *additional authenticated data* (§4.4), and all integrity hashes and signatures
> are computed over a **canonical JSON** serialization (§4.1.1) so that
> re-formatting the file (key order, whitespace) no longer breaks verification.
> Earlier `1.0`/`1.1` cells remain openable unchanged (§12).

---

## 1. Overview

Cellular Defense (CD) is a browser-native, zero-knowledge encrypted document platform. Documents are encrypted entirely within the sender's browser before leaving the device. The server stores only opaque ciphertext it cannot read under any circumstances. Recipients decrypt entirely within their own browser.

This document specifies the `.cell` file format, the cryptographic primitives, the access control architecture, and the security properties that can be independently verified. It is intended for security researchers, third-party implementers, and technical evaluators.

All cryptographic operations use the browser's **Web Crypto API** (W3C standard). No third-party cryptographic libraries are used.

---

## 2. Zero-Knowledge Architecture

Every `.cell` document is protected by two independent cryptographic layers.

| Layer | What It Protects | Algorithm | What an observer sees |
|-------|-----------------|-----------|----------------------|
| 1 | Document content | AES-256-GCM | Ciphertext only |
| 2 | Content Encryption Key (CEK) | ECDH P-256 + HKDF + AES-KW | Wrapped CEK only |

### 2.1 What the server/observer never holds

- ✗ Plaintext document content
- ✗ The Content Encryption Key (CEK)
- ✗ Any recipient private key
- ✗ Filename, MIME type, or file size
- ✗ Any key material sufficient to reconstruct a private key

### 2.2 What a `.cell` file exposes in plaintext

- ✓ Format version and document ID
- ✓ Cell creation timestamp
- ✓ Encrypted CEK shares (useless without the recipient's private key)
- ✓ Recipient method, label, and key fingerprint (public metadata only)
- ✓ Lifetime and policy settings
- ✓ Header hash and optional sender signature

---

## 3. File Formats

| Extension | Description |
|-----------|-------------|
| `.cell` | Plain JSON — human-readable, inspectable in any text editor |
| `.celz` | gzip-compressed `.cell` — same structure, ~30% smaller, binary |
| `.cdpub` | Public key export — share with others to receive encrypted cells |
| `.cdkey` | Full key export (private + public) — use on another device; store securely |

`.celz` files are produced by gzip-compressing the UTF-8 encoded JSON of the `.cell` document. The decompressed content is identical to the `.cell` format.

---

## 4. Cell Envelope — JSON Structure

### 4.1 Top-level fields

```json
{
  "version":    "1.2",
  "doc_id":     "<ULID>",
  "created_at": <unix timestamp — seconds since epoch>,
  "header":     { ... },
  "header_hash":    "<base64 SHA-256 of canonical header serialization>",
  "header_sig":     "<base64 ECDSA-SHA256 signature> | null",
  "header_sig_by":  "<self-asserted fingerprint label of signing key> | null",
  "header_sig_key": "<base64 SPKI of signing public key> | null",
  "payload":    { ... }
}
```

**`doc_id`** — ULID (Universally Unique Lexicographically Sortable Identifier). 26 characters, Crockford base32. First 10 characters encode 48-bit millisecond timestamp; last 16 characters are 80-bit cryptographic random. Lexicographically sortable by creation time.

**`header_hash`** — SHA-256 of the header serialization (§4.1.1). For v1.2 this is the **canonical** form; for v1.0/v1.1 it is `JSON.stringify(header)`. Verified on open before any decryption. Note that `header_hash` is an **unkeyed** hash: it detects accidental corruption and benign re-formatting differences, but an attacker who edits the header can recompute it. Authenticity of the header against tampering comes from `header_sig` (sender identity) and the AES-GCM AAD binding (§4.4), not from `header_hash` alone.

**`header_sig`** — Optional ECDSA P-256 signature over the same header serialization bytes used for `header_hash` (§4.1.1). Provides sender authenticity. The signing key is the sender's ECDH P-256 key re-imported with ECDSA usage (same P-256 scalar, different algorithm label). If null, the cell is unsigned.

> **Trust note.** A valid `header_sig` only proves the holder of the private key matching `header_sig_key` produced it. `header_sig_by` is a self-asserted label and MUST NOT be trusted on its own. A verifier should anchor trust to the real fingerprint of `header_sig_key` (`SHA-256(SPKI)[:16]`) and resolve it against its own known keys/contacts before attributing identity.

### 4.1.1 Canonical serialization (v1.2)

For v1.2, `header_hash`, `header_sig`, and the AAD (§4.4) are computed over a **deterministic** serialization so that re-ordering object keys or pretty-printing the JSON does not change the bytes (and therefore does not produce a false "tampered/forged" failure). The canonicalization is:

```
canonicalize(v):
  if v is null or not an object:   return JSON.stringify(v)
  if v is an array:                return "[" + join(",", canonicalize(e==undefined ? null : e) for e in v) + "]"
  otherwise (object):
     keys = sort(keys of v where v[k] != undefined)      // lexicographic
     return "{" + join(",", JSON.stringify(k) + ":" + canonicalize(v[k]) for k in keys) + "}"
```

This mirrors `JSON.stringify`'s primitive encoding and string escaping; the only differences are recursively sorted keys and no insignificant whitespace. v1.0/v1.1 cells continue to be verified with their original `JSON.stringify` serialization for backward compatibility (§12).

### 4.2 Header

```json
"header": {
  "prev_hash":  "<base64url header_hash of predecessor cell> | null",
  "threshold":  { "required": <M>, "of_total": <N> },
  "lifetime":   { ... },
  "policy":     { ... },
  "access_map": [ ... ],
  "payload_hash": "<base64url SHA-256 of raw ciphertext bytes>"
}
```

**`prev_hash`** — Links this cell to a predecessor in a Mitosis chain (see §9). Null for original cells.

**`payload_hash`** — SHA-256 of the raw base64-decoded ciphertext bytes. Committed inside the header so it is covered by `header_hash` and `header_sig`. If the ciphertext is modified after sealing, this check fails on open.

**`threshold`** — Quorum requirement. `required` is M; `of_total` is N. For non-quorum cells: `required = 1`. See §6 for Shamir Secret Sharing.

### 4.3 Payload

```json
"payload": {
  "alg":      "AES-256-GCM",
  "encoding": "base64+gzip",
  "iv":       "<base64url 12-byte IV>",
  "ciphertext": "<base64url — AES-256-GCM encrypted content>"
}
```

The ciphertext contains a manifest-prefixed gzip stream (see §5). The AES-GCM authentication tag is appended to the ciphertext by WebCrypto and verified automatically on decryption.

### 4.4 Additional Authenticated Data (AAD) — v1.1+

The advisory metadata that is fixed *before* encryption — `prev_hash`, `threshold`, `lifetime`, `policy` — is bound to the ciphertext as AES-GCM **additional authenticated data**. AES-GCM authenticates AAD without encrypting it: the recipient supplies the same AAD at decrypt time, and any mismatch fails the authentication tag.

**AAD construction:**

```
meta = [ header.prev_hash, header.threshold, header.lifetime, header.policy ]   // array, fixed order
AAD  = UTF-8 bytes of:
         canonicalize(meta)        for v1.2
         JSON.stringify(meta)      for v1.1
```

`access_map` and `payload_hash` are **not** in the AAD because they do not exist yet when the body is encrypted (the access map wraps the freshly generated CEK; `payload_hash` is derived from the resulting ciphertext). They are instead covered by `header_hash`/`header_sig`.

**Properties:**

- **Not strippable.** The recipient's decrypt always supplies the current header's metadata as AAD; there is no separate field an attacker can remove to disable the check.
- **Not downgradeable.** Decrypting a v1.2 cell *without* the AAD (e.g. by editing `version` to `1.0`) also fails the tag, since the ciphertext was produced *with* the AAD. An attacker cannot re-encrypt without the CEK.
- This binds metadata against third-party/storage/transit tampering. It does not (and cannot) prevent a legitimate recipient — who necessarily recovers the CEK — from ignoring `lifetime`/`policy`; those remain advisory toward authorized holders (§8, §9).

Cells without a `version` (legacy v2.x) and v1.0 cells carry no AAD; they decrypt with empty AAD.

---

## 5. Encrypted Payload Structure

The plaintext fed into AES-256-GCM is:

```
[ 4 bytes LE uint32 — manifest length ][ manifest JSON bytes ][ file bytes ]
```

This entire concatenation is gzip-compressed and then encrypted. The server and any observer see only ciphertext — filename, MIME type, and file size are invisible.

### 5.1 Manifest JSON

```json
{
  "filename":     "document.pdf",
  "content_type": "application/pdf",
  "size":         284921,
  "meta":         { "note": "Q3 escrow docs — call before opening", "case": "2026-0417" }
}
```

The manifest is recovered after successful decryption by reading the 4-byte length prefix, parsing that many bytes as UTF-8 JSON, then taking the remaining bytes as the file content.

`meta` (added 2026-07-18) is an **optional, sender-defined JSON object** carried inside the ciphertext — a note to the recipient, a case number, reply instructions, or any application-defined structure. Because it lives inside the encrypted manifest, it enjoys the same confidentiality and integrity as the file content: the server and any observer never see it, and tampering fails GCM authentication. Readers that predate this field ignore it; it requires no format-version bump.

### 5.2 Encoding stack (encrypt path)

```
original file bytes
  → prepend [4-byte manifest len][manifest JSON]
  → gzip compress entire buffer
  → AES-256-GCM encrypt with random 96-bit IV and 256-bit CEK
  → base64url encode
  → stored in payload.ciphertext
```

### 5.3 Decoding stack (decrypt path)

```
payload.ciphertext
  → base64url decode
  → AES-256-GCM decrypt (CEK + IV) — auth tag verified automatically
  → gzip decompress
  → read 4-byte LE length prefix
  → parse manifest JSON (that many bytes)
  → remaining bytes = original file content
```

---

## 6. Access Map

Each entry in `header.access_map` holds a wrapped copy of the CEK (or a Shamir share of the CEK for quorum cells) for one recipient.

### 6.1 ECDH P-256 entry

```json
{
  "method":      "ecdh-p256",
  "label":       "Alice",
  "fingerprint": "<16 hex chars — first 8 bytes of SHA-256(SPKI)>",
  "share_index": <integer 1..N> | null,
  "wrapped_cek": {
    "eph_spki":  "<base64url — ephemeral sender public key, SPKI format>",
    "hkdf_salt": "<base64url — 32 random bytes>",
    "ct":        "<base64url — AES-KW wrapped CEK or CEK share>"
  }
}
```

**CEK wrapping (per recipient):**

```
ephemeral_keypair   = ECDH P-256 (generated fresh per recipient)
shared_bits         = ECDH(ephemeral_privkey, recipient_pubkey)   → 256 bits
hkdf_salt           = 32 random bytes
hkdf_key            = HKDF-SHA256(shared_bits, salt, info="cellular-defense-cek-wrap-v1", 256 bits)
wrapped_cek         = AES-KW(cek_or_share, hkdf_key)
```

**CEK unwrapping (recipient):**

```
shared_bits         = ECDH(recipient_privkey, eph_spki)
hkdf_key            = HKDF-SHA256(shared_bits, hkdf_salt, info="cellular-defense-cek-wrap-v1", 256 bits)
cek_or_share        = AES-KW-unwrap(ct, hkdf_key)
```

### 6.2 PBKDF2 (passphrase) entry

```json
{
  "method":      "pbkdf2",
  "label":       "My passphrase",
  "fingerprint": "<16 hex chars — SHA-256 of PBKDF2 salt>",
  "share_index": <integer> | null,
  "wrapped_cek": {
    "salt":       "<base64url — 32 random bytes>",
    "iterations": 600000,
    "ct":         "<base64url — AES-KW wrapped CEK or CEK share>"
  }
}
```

**Key derivation:**

```
base_key   = PBKDF2-SHA256(passphrase, salt, 600000 iterations) → AES-KW 256-bit key
wrapped    = AES-KW(cek_or_share, base_key)
```

### 6.3 YubiKey PRF (FIDO2) entry

```json
{
  "method":        "yubikey-prf",
  "label":         "My YubiKey",
  "fingerprint":   "<16 hex chars — SHA-256 of credential_id>",
  "share_index":   <integer> | null,
  "wrapped_cek": {
    "credential_id": "<base64url — WebAuthn credential ID>",
    "prf_salt":      "<base64url — 32 random bytes, the PRF eval input>",
    "ct":            "<base64url — AES-KW wrapped CEK or CEK share>"
  }
}
```

The PRF output (32 bytes) is used directly as the AES-KW wrapping key. Requires HTTPS or localhost, Chrome or Chromium, and a FIDO2 key with the hmac-secret extension (YubiKey 5 series, firmware 5.2+).

### 6.4 `share_index`

For quorum cells (`threshold.required > 1`), each access map entry holds one Shamir share. `share_index` is the x-coordinate of that share (1-indexed, matching the share's polynomial evaluation point). For non-quorum cells (`threshold.required = 1`), `share_index` is `null` and each entry holds the full CEK.

---

## 7. Quorum — Shamir Secret Sharing

When `threshold.required > 1`, the CEK is split into N shares using Shamir Secret Sharing over GF(256) before wrapping. Any M shares reconstruct the CEK; fewer than M shares reveal nothing.

### 7.1 Field arithmetic — GF(256)

Polynomial arithmetic over GF(2⁸) with irreducible polynomial `x⁸ + x⁴ + x³ + x + 1` (0x11b). Multiplication uses the Russian Peasant algorithm. Multiplicative inverse: `gfInv(x) = x^254 mod poly` (Fermat's little theorem in GF(2⁸)).

### 7.2 Share generation

For each byte position `b` of the CEK:

1. Build a degree-(k-1) polynomial `f` over GF(256) where `f(0) = secret[b]` and coefficients `f[1]..f[k-1]` are random.
2. Evaluate `f(i)` for `i = 1..N`. Each evaluation is one byte of share `i`.

### 7.3 Secret reconstruction (Lagrange interpolation at x=0)

Given M shares `(x₁, y₁)..(xₘ, yₘ)`, for each byte position:

```
secret[b] = Σᵢ yᵢ · Πⱼ≠ᵢ (xⱼ / (xᵢ ⊕ xⱼ))   (all operations in GF(256))
```

---

## 8. Lifetime Model

`header.lifetime` describes the intended usage lifetime of a cell. The client enforces lifetime constraints before any decryption.

```json
"lifetime": {
  "type":        "<type string>",
  "expires_at":  <unix timestamp> | null,
  "release_at":  <unix timestamp> | null,
  "on_expiry":   "none" | "delete" | "archive",
  "single_use":  <boolean>,
  "minimum_atl": <integer>
}
```

| Type | Description | Typical `expires_at` | `on_expiry` |
|------|-------------|---------------------|-------------|
| `permanent` | No expiry | `null` | `none` |
| `flash` | Single use, short-lived | `now + 1 hour` | `delete` |
| `session` | Hours to days | configurable | `delete` |
| `clinical` | Months (healthcare use) | configurable | `archive` |
| `record` | Years (compliance/legal) | configurable | `archive` |
| `timed_release` | Locked until `release_at` | configurable | configurable |

### 8.1 Client-side enforcement

Before any cryptographic operation:

1. **Timed release lock**: If `type = "timed_release"` and `release_at > now` → reject with "Timed release — unlocks `<date>`".
2. **Expiry**: If `expires_at` is set and `expires_at < now` → reject with "Cell expired `<date>`".

Since v1.1, `lifetime` is part of the AES-GCM AAD (§4.4), so a **third party cannot alter the lifetime** (e.g. extend `expires_at` or remove a `release_at`) without failing decryption. However, these are still **advisory toward an authorized holder**: a recipient who can recover the CEK can decrypt regardless of the date. Lifetime enforcement is therefore tamper-evident in transit/storage but is not a substitute for server-side access control in a full deployment.

---

## 9. Policy

`header.policy` carries distribution and presentation rules committed into the signed header.

```json
"policy": {
  "copy_protection":   "none" | "standard" | "strict",
  "watermark_mode":    "none" | "basic" | "full",
  "created_on_origin": "<URL of creating application>",
  "origin_sig":        "<CD server signature> | null"
}
```

| Field | Description |
|-------|-------------|
| `copy_protection` | Redistribution intent. `strict` triggers a visible warning to the recipient. |
| `watermark_mode` | Forensic watermarking intent. `basic` = recipient identity; `full` = forensic embedding. Actual rendering is application-layer. |
| `created_on_origin` | `window.location.origin` of the application that created the cell. |
| `origin_sig` | Reserved for CD server countersignature. `null` in standalone browser deployments. |

Policy is enforced by the application layer only; it is not a cryptographic access control mechanism. Since v1.1 it is bound to the ciphertext as AAD (§4.4), so its values are tamper-evident against third parties even though they are not enforced against an authorized recipient.

---

## 10. Audit Chain

The cell format provides a tamper-evident audit chain. Serialization below is the canonical form (§4.1.1) for v1.2, or `JSON.stringify` for v1.0/v1.1:

```
file bytes
  └─ encrypted in payload.ciphertext  (AES-256-GCM, with metadata bound as AAD — §4.4)
       └─ payload_hash = SHA-256(raw ciphertext bytes)
            └─ committed inside header (covered by header_hash)
                 └─ header_hash = SHA-256(serialize(header))
                      └─ header_sig = ECDSA-SHA256(serialize(header), sender_privkey)   [optional]
```

On open, the verifier checks in order:
1. `header_hash` matches `SHA-256(serialize(cell.header))` — detects corruption/benign reformat is tolerated by canonicalization.
2. `payload_hash` (inside header) matches `SHA-256(base64decode(payload.ciphertext))`.
3. If `header_sig` present: ECDSA-SHA256 over `serialize(cell.header)` verifies against `header_sig_key`.
4. **On decrypt**, the AES-GCM tag verifies the ciphertext *and* the AAD-bound metadata (§4.4); a mismatch — including any edit to `threshold`/`lifetime`/`policy`/`prev_hash` that slipped past the unkeyed `header_hash` — fails here.

Steps 1–3 run before decryption; step 4 is intrinsic to decryption. Together they detect any tampering with the header, the metadata, or the ciphertext.

---

## 11. Mitosis (Cell Lineage)

Mitosis is the operation of re-encrypting a cell to create a new version — changing recipients, rotating keys, or updating policy. The new cell references its predecessor via `header.prev_hash`.

```
cell₁: prev_hash = null
  └─ cell₂: prev_hash = cell₁.header_hash
       └─ cell₃: prev_hash = cell₂.header_hash
```

`prev_hash` equals the `header_hash` of the immediately preceding cell in the chain. This creates an auditable chain of custody for the document's access history.

`prev_hash` is included in the header and thus covered by `header_hash`, `header_sig`, and (since v1.1) the AES-GCM AAD (§4.4). Tampering with the lineage pointer is detected by the audit chain.

---

## 12. Format Versioning

The `version` field identifies the cell format version. The reference implementation supports exactly the versions listed in `SUPPORTED_VERSIONS = { "1.0", "1.1", "1.2" }`. New cells are written as **`1.2`** (`CELL_FORMAT_VERSION`).

| Version | Status | Notes |
|---------|--------|-------|
| `1.0` | Supported (read) | Original format. `header_hash`/`header_sig` over `JSON.stringify(header)`; no AAD. |
| `1.1` | Supported (read) | Adds AES-GCM AAD over `JSON.stringify([prev_hash, threshold, lifetime, policy])`. Hash/sig still over `JSON.stringify(header)`. |
| `1.2` | **Current (write)** | Canonical serialization (§4.1.1) for `header_hash`/`header_sig`/AAD. This specification. |

Open is version-gated: each cell is verified and AAD-bound using the serialization rules of *its own* `version`, so `1.0`/`1.1` cells continue to open unchanged. Behavior is selected only by `version === "1.1"` / `version === "1.2"`; anything else uses the v1.0 (no-AAD, `JSON.stringify`) rules.

**Unknown version behavior**: If `cell.version` is present but not in `SUPPORTED_VERSIONS`, the opener rejects the cell with a clear error: "Unsupported cell format version — update the app to open this cell."

**Legacy v2.0 detection**: If `cell.version` is absent and `cell.cd_version` is present, the cell is treated as legacy format. Legacy cells use `recipients` instead of `header.access_map` and `encrypted_body` instead of `payload`. The wrapped CEK in a legacy entry has no `hkdf_salt` field — the raw ECDH shared secret (first 32 bytes) is used directly as the AES-KW key without HKDF.

---

## 13. Key File Formats

### 13.1 `.cdpub` — Public key

Shared with others to receive encrypted cells. Contains no private key material.

```json
{
  "cd_pubkey":   "2.0",
  "label":       "Alice",
  "fingerprint": "<16 hex chars>",
  "method":      "ecdh-p256",
  "spki":        "<base64url — SubjectPublicKeyInfo, P-256>"
}
```

### 13.2 `.cdkey` — Private key export

Contains the full key record including private key. Must be stored securely.

```json
{
  "cd_key":      "2.0",
  "keyId":       "<UUID>",
  "label":       "My Key",
  "method":      "ecdh-p256",
  "fingerprint": "<16 hex chars>",
  "spki":        "<base64url — public key, SPKI format>",
  "pkcs8":       "<base64url — private key, PKCS#8 format>",
  "created_at":  <unix timestamp>,
  "exported_at": <unix timestamp>
}
```

### 13.3 Key fingerprint

`fingerprint = toHex(SHA-256(SPKI bytes)).slice(0, 16)`

16 lowercase hex characters (first 8 bytes of the SHA-256 of the SPKI-encoded public key). Used to match access map entries to available keys.

---

## 14. Cryptographic Primitive Reference

| Operation | Algorithm | Parameters |
|-----------|-----------|------------|
| Content encryption | AES-256-GCM | 256-bit random CEK, 96-bit random IV, 128-bit auth tag |
| CEK wrapping (ECDH) | AES-KW | 256-bit key derived via HKDF |
| ECDH key exchange | ECDH P-256 | Ephemeral sender keypair per recipient |
| Key derivation | HKDF-SHA256 | 256-bit output, 32-byte random salt, `info = "cellular-defense-cek-wrap-v1"` |
| CEK wrapping (passphrase) | AES-KW | 256-bit key via PBKDF2-SHA256, 600,000 iterations, 32-byte salt |
| CEK wrapping (YubiKey) | AES-KW | 256-bit key = PRF output (hmac-secret extension, 32 bytes) |
| GF(256) Shamir SSS | Over GF(2⁸) | Irreducible poly 0x11b (AES polynomial) |
| Metadata binding | AES-256-GCM AAD | `prev_hash`/`threshold`/`lifetime`/`policy` bound to ciphertext (v1.1+) |
| Header signing | ECDSA P-256 + SHA-256 | Signs canonical header bytes (§4.1.1) for v1.2; `JSON.stringify(header)` for v1.0/v1.1 |
| Audit hashes | SHA-256 | `header_hash`, `payload_hash`, fingerprints |
| Document ID | ULID | 48-bit ms timestamp + 80-bit CSPRNG, Crockford base32 |
| Randomness | `crypto.getRandomValues()` | Browser CSPRNG — never `Math.random()` |

All operations use the **Web Crypto API** (`crypto.subtle`). Requires a secure context (HTTPS or localhost).

---

## 15. Complete Example

A minimal v1.2 cell encrypted for a single ECDH recipient, no quorum, permanent lifetime, unsigned. The `prev_hash`/`threshold`/`lifetime`/`policy` are additionally bound as AES-GCM AAD (§4.4), and `header_hash` is over the canonical serialization (§4.1.1):

```json
{
  "version": "1.2",
  "doc_id": "01JXXXXXXXXXXXXXXXXXXXXXXXXX",
  "created_at": 1749420000,
  "header": {
    "prev_hash": null,
    "threshold": { "required": 1, "of_total": 1 },
    "lifetime": {
      "type": "permanent",
      "expires_at": null,
      "on_expiry": "none",
      "single_use": false,
      "minimum_atl": 1
    },
    "policy": {
      "copy_protection": "standard",
      "watermark_mode": "none",
      "created_on_origin": "http://localhost:8080",
      "origin_sig": null
    },
    "access_map": [
      {
        "method": "ecdh-p256",
        "label": "Alice",
        "fingerprint": "a1b2c3d4e5f6a7b8",
        "share_index": null,
        "wrapped_cek": {
          "eph_spki":  "<base64url — ephemeral public key>",
          "hkdf_salt": "<base64url — 32 random bytes>",
          "ct":        "<base64url — AES-KW wrapped 256-bit CEK>"
        }
      }
    ],
    "payload_hash": "<base64url — SHA-256 of raw ciphertext bytes>"
  },
  "header_hash":    "<base64 — SHA-256 of canonicalize(header)>",
  "header_sig":     null,
  "header_sig_by":  null,
  "header_sig_key": null,
  "payload": {
    "alg":        "AES-256-GCM",
    "encoding":   "base64+gzip",
    "iv":         "<base64url — 12-byte IV>",
    "ciphertext": "<base64url — gzip([4-byte len][manifest JSON][file bytes]) encrypted>"
  }
}
```

---

## 16. Security Properties

| Property | Mechanism |
|----------|-----------|
| Confidentiality | AES-256-GCM — IND-CPA secure |
| Authenticity (content) | AES-256-GCM auth tag — verified on decrypt |
| Authenticity (metadata) | AES-GCM AAD binds `threshold`/`lifetime`/`policy`/`prev_hash` — tamper-evident, not strippable/downgradeable (v1.1+) |
| Integrity (header) | SHA-256 `header_hash` (unkeyed — corruption/format check; authenticity from `header_sig` + AAD) |
| Integrity (ciphertext) | SHA-256 `payload_hash` committed in header |
| Sender authenticity | ECDSA P-256 `header_sig` — optional, per-cell; trust anchored to `header_sig_key` fingerprint, not the `header_sig_by` label |
| Reformat resilience | Canonical serialization — key-reorder/whitespace does not break hash/sig/AAD (v1.2) |
| Forward secrecy (per-cell) | Fresh ephemeral ECDH keypair per recipient per cell |
| Key isolation | Each recipient's CEK copy uses independent ephemeral keypair |
| Metadata confidentiality | Filename, type, size encrypted inside payload (§5) |
| Threshold access | Shamir SSS — M shares required, N-1 shares reveal nothing |
| Lineage integrity | `prev_hash` covered by `header_hash` and `header_sig` |
| Version safety | Unknown versions rejected with clear error |

---

## 17. Changelog

| Version | Date | Summary |
|---------|------|---------|
| 1.0 | 2026-06-08 | Initial published spec. ECDH+HKDF+AES-KW CEK wrapping; encrypted manifest; PBKDF2 and YubiKey PRF access methods; Shamir SSS quorum; full lifetime model; policy; header_hash/payload_hash audit chain; ECDSA header_sig; ULID doc_id; Mitosis prev_hash chain. |
| 1.1 | 2026-06-09 | Bind advisory metadata (`prev_hash`/`threshold`/`lifetime`/`policy`) to the ciphertext as AES-GCM AAD (§4.4) — tamper-evident, not strippable/downgradeable. AAD over `JSON.stringify([...])`; hash/sig still over `JSON.stringify(header)`. |
| 1.2 | 2026-06-09 | Canonical serialization (§4.1.1) for `header_hash`, `header_sig`, and AAD, so re-formatting (key order, whitespace) no longer breaks verification. Signature trust clarified to anchor on `header_sig_key`, not the `header_sig_by` label. v1.0/v1.1 cells remain openable. |

---

*Cellular Defense · Enthropic Data LLC · enthropicdata.com*
