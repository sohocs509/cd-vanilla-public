# Design note: extension profiles — how to add cryptography the browser lacks

**Status as of 2026-08-09.** Proposed; nothing implemented. Second note in
`docs/design/`. Companion to `temporal-enforcement.md`, whose open
recommendation 4 (`timed_release`) is the first case this mechanism would serve.

Two questions prompted this. First: enforced timed release needs pairing
curves, which the Web Crypto API does not provide, so adopting it breaks the
project's "download nothing" rule — should it therefore ship separately?
Second: what does the browser already provide that the format is not yet using?

The answers turn out to be connected. The second question has a larger answer
than expected, and it changes the case for the first.

---

## 1. What the platform already provides and the format does not use

Probed against Node 20's Web Crypto on 2026-08-09. Node is not a browser and
the version floors differ, so **confirm against a real support matrix before
committing to any of these**; the point here is that the gap list is shorter
than the specification assumes.

| Available, unused | What it would buy |
|---|---|
| **X25519 / Ed25519** | The curve family much of the field prefers, natively. See §2 — this one has already invalidated a claim in print. |
| **RSA-OAEP** | Wrapping a CEK to an **existing** corporate, PIV or S/MIME certificate. |
| **P-384 / P-521** | Deployments carrying a CNSA or Suite-B style policy floor. |
| **RSA-PSS** | Signing with an existing enterprise key. |
| **HMAC** | Little here that the AAD binding does not already do. |

Still absent, and therefore still genuine costs: **Argon2id**, **pairing
curves** (so timelock encryption really does need a dependency), and
**post-quantum KEM/signature** primitives.

### 1.1 Three of these are worth building

**X25519 and Ed25519** as additional access-map and signature methods. No
dependency, and it retires a limitation the book states in print.

**RSA-OAEP** as an access-map method, for a reason that is about adoption
rather than cryptography. Organisations already hold RSA certificates in their
directory and PKI. An `rsa-oaep` entry lets a sender wrap a CEK to a
counterparty's *existing* corporate certificate — no enrollment ceremony, no
new credential, nothing for the recipient to install. That is the Part VI
enrollment problem solved outright for the enterprise case, using a primitive
the browser has always had.

**Chunked AES-GCM**, which is a functional gap rather than an enhancement. The
format encrypts the payload as a single buffer, so the maximum document size is
bounded by memory on both sides. A segmented mode — per-chunk GCM with the
chunk index and total count bound into each chunk's AAD, so a chunk cannot be
reordered, duplicated or truncated away — needs no primitive the format does
not already use, and composes with the `CompressionStream` already in the
encode path.

One further item that is not a Web Crypto change at all: the **WebAuthn PRF**
access method already exists but is documented against YubiKeys. Platform
passkey providers now support the PRF extension, so the same method can reach
users who have a passkey and no hardware token. That is a reach change, not a
mechanism change, and costs a paragraph of documentation.

---

## 2. A claim in the companion book has already expired

The companion book's chapter on honest cryptography stated that the Web Crypto API offers
"P-256, not the Curve25519 family that much of the modern cryptographic
community prefers," and presented that as a permanent cost accepted honestly.

Secure Curves has since shipped. X25519 and Ed25519 generate, sign, verify and
derive natively. The claim was true when written and is now false, and it sat
in the chapter that argues for stating limits accurately — the worst possible
place for a stale fact.

Corrected 2026-08-09. The correction was written as an argument rather than a
deletion, because the way the cost expired supports the rule that incurred it:
a dependency taken on to obtain a primitive early is permanent, while a
primitive declined for want of platform support is a temporary gap the platform
may close. The Argon2id half of the original trade stands unchanged.

**This should be treated as a standing maintenance obligation, not a one-off.**
Any claim of the form "the platform does not provide X" decays. The
specification and the book contain several. They need re-testing on a schedule,
not on discovery.

---

## 3. The core / extension split

For the primitives that remain genuinely absent — pairings today,
post-quantum tomorrow — the recommendation is a profile boundary rather than a
judgement call taken case by case.

**Core `.cell`.** Web Crypto only. The "download nothing" claim stays literally
true and unqualified. Everything in §1 is core-eligible, because none of it
adds a dependency.

**Extension profiles.** Separately specified, separately implemented,
separately disclosed. Each names exactly the dependency it introduces and what
that costs the deployment. Core reserves the method identifier and states that
a conforming core implementation MAY reject it — which is the existing
unknown-version discipline of §12 applied one level down, to methods.

The boundary is worth drawing once and properly, because timelock is not the
only case in the queue. Post-quantum wrapping faces the identical decision, and
if the profile mechanism exists it inherits it rather than reopening the
argument.

---

## 4. Timelock belongs in the access map, not in `lifetime`

This is the substantive design recommendation, and it is a better shape than
extending the lifetime object.

The access map is already the format's designed extension point: a list of
heterogeneous entries, each identified by `method`, each holding a wrapped copy
of the CEK or of a Shamir share. A beacon-gated entry is simply an entry whose
unwrap key arrives from a future drand round rather than from a private key. No
change to the envelope, no change to the AAD construction, no new top-level
field.

```
access_map: [
  { method: "ecdh-p256",  share_index: 1, ... },   // the recipient's own key
  { method: "tlock-drand", share_index: 2,
    wrapped_cek: { round: <n>, chain: "<hash>", ct: "<...>" } }
]
threshold: { required: 2, of_total: 2 }
```

Under a 2-of-2 like this, **the recipient cannot open the document before the
round even though they hold their own key**, because the second share does not
exist in recoverable form until the beacon publishes. That is enforcement, not
instruction.

The reason this shape is right is that it moves timed release from *conduct* to
*capability* — the distinction the format already draws for quorum (below the
threshold the key does not exist) and for `minimum_atl` (below the floor no
wrapped key is ever issued). A `release_at` field asks a client not to open
early. A missing share makes early opening impossible. The format's own
philosophy already prefers the second, everywhere else.

It also disposes of the awkward status of `timed_release` cleanly. The lifetime
type and `advisory.release_at` stay exactly what they are — advisory, and
labelled so under the v1.3 split — with the specification adding one pointer:
*for enforced timed release, do not rely on this field; add a beacon-gated
access entry.* No field has to claim more than it delivers.

---

## 5. Recommendation

1. **Adopt X25519/Ed25519, RSA-OAEP and chunked AES-GCM into core** when
   convenient. None adds a dependency; the first retires a stated limitation
   and the second removes the enrollment barrier for enterprise recipients.
2. **Draw the core/extension profile boundary now**, before timelock, so that
   post-quantum inherits it.
3. **Specify timelock as an access-map method in an extension profile**, not as
   a lifetime field, and let quorum supply the enforcement.
4. **Re-test "the platform lacks X" claims on a schedule.** §2 is one instance
   of a class.

## 6. Open decisions

- Does an extension profile ship as a separate repository, or as an optional
  module in this one with a build that excludes it by default? The "download
  nothing" claim is easier to audit if the dependency is not in the tree at all.
- Does each profile get its own defensive disclosure and timestamp anchor? On
  the argument of the publishing guide it should — an unpublished mechanism is
  not prior art.
- Which drand chain, and what happens to a sealed cell if that chain is retired
  before its round arrives? A beacon-gated entry has an availability dependency
  no other access method has, and it should be graded as *operational* rather
  than *guaranteed* for that reason.
