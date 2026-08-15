# Cell Format — cd-vanilla

Browser-native zero-knowledge encrypted document format. Single HTML file, no dependencies, no server round-trips for crypto.

## What it does

Encrypts any file into a self-contained `.cell` or `.celz` envelope. Recipients decrypt in their browser using a key from their keychain, a passphrase, or a YubiKey. The server (if any) stores only ciphertext — it cannot read the file, the filename, the MIME type, or the file size.

## Quick start

Serve over HTTPS or localhost (WebCrypto requires a secure context):

```bash
python3 -m http.server 8080
# open http://localhost:8080/index.html
```

Or open `index.html` directly in Chrome/Edge (file:// works for WebCrypto in most builds).

## Key features

| Feature | Detail |
|---------|--------|
| Encryption | AES-256-GCM, 256-bit CEK, 96-bit random IV |
| Key wrapping | ECDH P-256 + HKDF-SHA256 + AES-KW (per recipient) |
| Passphrase | PBKDF2-SHA256, 600K iterations |
| YubiKey | FIDO2 PRF extension (YubiKey 5 series, HTTPS only) |
| Quorum | M-of-N Shamir Secret Sharing over GF(256) |
| Metadata | Filename, type, size, and optional sender `meta` encrypted inside payload |
| Tamper detection | SHA-256 `payload_hash` + `header_hash` audit chain |
| Authenticity | Optional ECDSA P-256 sender signature over header |
| Lineage | `prev_hash` chain for Mitosis (re-encrypt / key rotation) |
| Lifetime | 6 types, split by enforcer: `advisory` (not enforced on a keyholder) + `disposal` (operator-side, enforced) |
| Policy | copy_protection, watermark_mode, origin |
| Format | `.cell` (JSON) or `.celz` (gzip'd JSON) · all binary fields **standard base64** |
| Doc ID | ULID — lexicographically sortable by creation time |

## File layout

```
index.html          — the application shell (HTML + CSS + UI JS, no build step)
cell-crypto.js      — the crypto/format library, loaded by index.html
docs/SPEC.md        — format specification v1.3 (normative)
docs/defensive-pub/anchors/      — the anchored v1.2 bytes + Bitcoin timestamp proofs
tests/test.html     — browser test suite (51 tests, loads the library in a page)
tests/run.mjs       — headless runner for the same tests: npm test
tools/verify-cell.py — independent verifier, written from SPEC.md, no project code
```

## Running tests

```bash
# serve from project root
python3 -m http.server 8080 --bind 0.0.0.0

# open in browser
http://localhost:8080/tests/test.html
```

Tests run in-browser. WebCrypto requires `localhost` or HTTPS — plain IP addresses will fail. YubiKey tests are skipped (hardware required, test manually).

Or headless, which is what CI and the figure tooling use:

```bash
npm test          # 51/51, 2 hardware-skipped
```

## Format specification

Full spec: [`docs/SPEC.md`](docs/SPEC.md) — **v1.3**, and normative. The format is a
defensive disclosure: implement it freely, no licence needed ([`LICENSING.md`](LICENSING.md)).
The reference *code* is AGPL-3.0.

Verify a cell against the spec without trusting this code:

```bash
python3 tools/verify-cell.py docs/figure-data/*.cell
```

Brief summary of the encrypted payload structure:

```
AES-256-GCM ciphertext
  └─ gzip(
       [4-byte LE uint32 manifest length]
       [manifest JSON: {filename, content_type, size}]
       [original file bytes]
     )
```

Header audit chain:

```
payload_hash = SHA-256(raw ciphertext bytes)   ← inside header
header_hash  = SHA-256(JSON.stringify(header)) ← top-level field
header_sig   = ECDSA-P256(header JSON bytes)   ← optional, top-level
```

## Key formats

```
.cdpub   — public key  (share with anyone to receive encrypted cells)
.cdkey   — private key (keep secure, use on another device)
```

## Browser support

Requires CompressionStream, WebCrypto, IndexedDB. Chrome 80+, Firefox 113+, Safari 16.4+. YubiKey PRF requires Chrome/Chromium + HTTPS.

---

*Enthropic Data LLC · enthropicdata.com*
