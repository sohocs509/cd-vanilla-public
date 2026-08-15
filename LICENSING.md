# Licensing

Cellular Defense is deliberately split in two. The **format** is given away
permanently; the **code** is licensed. Read the distinction carefully before
assuming either half constrains the other.

---

## 1. The `.cell` format specification — free, forever, to everyone

`docs/SPEC.md` and every cryptographic construction and technical mechanism it
describes are published as a **defensive disclosure**. No patent is sought or
asserted over them. They are contributed to the public prior art and are
**freely implementable by anyone, for any purpose, commercial or otherwise,
without license, royalty, or permission.**

This is not a courtesy; it is the point. A format whose security claims rest on
being inspectable cannot also be a secret. If you write your own implementation
of `.cell` from the specification — a clean-room implementation that copies no
code from this repository — **you owe Enthropic Data nothing**, and nothing in
this document or the `LICENSE` file changes that.

The specification is therefore **not** licensed under the AGPL. The AGPL applies
to source code in this repository, not to the ideas the specification describes.

## 2. The reference implementation — AGPL-3.0, or a commercial license

The source code in this repository (`cell-crypto.js`, the client, the CLI, the
tooling — everything that is not the specification) is licensed under the
**GNU Affero General Public License, version 3**. The full text is in
[`LICENSE`](LICENSE).

**Personal, educational, research, and non-profit use is free** under the AGPL.
So is commercial use, *provided you comply with the AGPL* — which for most
commercial deployments is the sticking point, because the AGPL requires that:

- if you convey the software, you provide **complete corresponding source** to
  your recipients, under the AGPL (§4–§6); and
- if you let users interact with a **modified** version **over a network**, you
  must offer those users the modified source (§13) — the "Affero clause," which
  closes the hosted-service loophole in the ordinary GPL.

If you cannot or will not publish your modifications under those terms — the
usual case for a proprietary product or a closed hosted service — you need a
**commercial license**.

## 3. Commercial licensing

A commercial license removes the AGPL's source-disclosure obligations for your
product, on negotiated terms.

**Contact:** dbrown@enthropicdata.com — Enthropic Data LLC, Weddington, NC.

As sole copyright holder, Enthropic Data can license the same code under other
terms; the AGPL grant here does not restrict that.

## 4. Improvements

The intent of this project is that improvements to the reference implementation
come back to it, so that everyone relying on the format benefits from review of
the same code.

Be aware of what the license does and does not compel, because the difference
matters:

- The AGPL **requires** you to offer corresponding source **to the users of your
  modified version**. It does **not**, by itself, require you to send patches
  upstream to this repository. A user who complies fully with the AGPL and never
  contacts us has done nothing wrong.
- Contributions to *this* repository are accepted under the same AGPL terms,
  and by opening a pull request you license your contribution accordingly.

If upstream contribution is to be a hard requirement rather than an expectation,
that belongs in a commercial agreement or a contributor license agreement, not
in the AGPL. **No CLA is in force today.**

## 5. Related repositories

`cd-cert-broker` and the server-backed `cellular-defense` application are
separate works under separate terms; neither carries a license file at the time
of writing, which under copyright default means all rights reserved. The cert
broker is operated as a hosted service and its implementation is not
open-sourced. Consult each repository — do not assume this file governs them.

---

*This file describes licensing intent in plain language. Where it and the
`LICENSE` text disagree, `LICENSE` governs. It is not legal advice, and the
arrangement above — particularly the spec/code split and the dual-licensing
posture — is worth review by counsel before it is relied on commercially.*
