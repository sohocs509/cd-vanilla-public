// Typst layout rules for docs/DEFENSIVE-DISCLOSURE.md
// Injected via `pandoc --include-in-header`; see docs/build-disclosure.sh.
//
// Why this file exists: pandoc's default Typst template wraps every table in
// `#figure(...)`, and a Typst figure block defaults to `breakable: false`.
// A table that does not fit the remaining space is therefore pushed whole to
// the next page, stranding whatever was above it. In the 12pt/letter build
// that left one page holding nothing but a section heading and two more
// barely a third full. The rules below let tables and long listings flow
// across page boundaries, which is the normal expectation for a technical
// report and removes the sparse pages.

// PDF document metadata, for registry indexing and searchability. Set here
// rather than via pandoc's `--metadata title`, because that variable also
// renders a title block — and the source markdown already opens with its own
// H1, so passing it produced the title twice on page 1.
#set document(
  title: "The .cell Format: A Browser-Native Zero-Knowledge Document Protocol — Specification and Design Rationale",
  author: "David Brown",
  keywords: (
    "defensive publication", "prior art", "zero-knowledge", "client-side encryption",
    "end-to-end encryption", "AES-GCM", "additional authenticated data", "AAD",
    "metadata binding", "ECDH P-256", "HKDF", "AES-KW", "Shamir secret sharing",
    "threshold cryptography", "canonical JSON serialization", "document format",
  ),
)

// Text block is 8.5in - 2x1in margin = 6.5in. Code at 9pt monospace fits the
// ~80-column listings the specification uses (80 x ~0.6em x 9pt = 6.0in,
// inside the 6.28in left after the 8pt block insets).
#let RAW-SIZE = 9pt
#let RAW-KEEP = 18 // listings up to this many lines stay on one page

// Tables and figures must be able to split across pages.
#show figure: set block(breakable: true)

// ...except the diagram figures below, which are `kind: image` and must not
// be cut in half. Each is comfortably under one page, so keeping them whole
// cannot strand a page the way unbreakable *tables* did.
#show figure.where(kind: image): set block(breakable: false)

// Narrow cells justify badly — rivers of whitespace through short lines.
#show table: set par(justify: false, leading: 0.5em)

// Give headings room to breathe and never strand one at the foot of a page.
// Note `show heading: set block(...)` does NOT do this — that sets spacing for
// blocks nested *inside* the heading. The heading itself has to be wrapped.
// 1.3/0.7 is tuned: more below-space pushes the document to 33 pages, less
// leaves a short final page. Re-check ./build-disclosure.sh output if changed.
#show heading: it => block(above: 1.3em, below: 0.7em, sticky: true, it)

// Pandoc emits a table's header as an ordinary first row, so once tables are
// breakable a page break can split the header off from its data. Promote the
// first row to a real `table.header`: Typst then keeps it with its rows and
// reprints it at the top of each continuation page.
#show table: it => {
  let kids = it.children
  if kids.any(k => k.func() == table.header) { return it } // already promoted
  let n = if type(it.columns) == int { it.columns } else { it.columns.len() }
  if kids.len() <= n { return it }
  // Pandoc emits every column as `auto`, which centres; left+top reads better
  // and keeps ragged cells from drifting away from their row.
  table(
    columns: it.columns,
    align: left + top,
    inset: it.inset,
    stroke: it.stroke,
    table.header(..kids.slice(0, n)),
    ..kids.slice(n),
  )
}

// Note: a `show table.cell` rule making rows individually unbreakable was
// tried, to stop a page break from ever splitting one row. It was reverted.
// Wrapping cell content in a block shrink-wraps it, which overrides the
// table's `align: left + top` and re-centres every cell; forcing width: 100%
// instead overflows the cell insets and reflowed the document back into
// sparse pages. A row split across a page break is the lesser defect — the
// repeated header above keeps it readable.

// Horizontal rules only, header row emphasised — technical-report table style.
#set table(
  inset: (x: 6pt, y: 4pt),
  stroke: (_, y) => (
    top: if y == 0 { 0.7pt + black } else if y == 1 { 0.5pt + black } else {
      0.25pt + luma(180)
    },
  ),
)
#show table.cell.where(y: 0): set text(weight: "bold")

// Code: short listings stay whole so a break cannot orphan a single line;
// long ones (the JSON envelope examples) are allowed to break.
#show raw.where(block: true): it => block(
  fill: luma(246),
  inset: 8pt,
  radius: 3pt,
  width: 100%,
  breakable: it.text.split("\n").len() > RAW-KEEP,
  text(size: RAW-SIZE, it),
)
#show raw.where(block: false): it => text(size: 0.92em, it)

// ─────────────────────────────────────────────────────────────────────────
// FIGURES
//
// Defined here rather than in a separate file because --include-in-header
// inlines this content into a temporary .typ, so a relative `#import` would
// not resolve.
//
// Every value shown is real, taken from cells independently verified against
// the specification text alone (docs/figure-data/, and §9).
//
// All field names and values are passed as STRINGS, never markup content
// blocks: `_` pairs would otherwise render as emphasis and a leading `=`
// as a heading. Print-safe greys only — no colour cost, legible in mono.
// ─────────────────────────────────────────────────────────────────────────

#let FIG-MONO = 7.5pt
#let f-open   = luma(244) // server-visible plaintext
#let f-bound  = luma(226) // readable, but authenticated as AAD
#let f-sealed = luma(200) // encrypted; server cannot read
#let f-integ  = luma(255) // integrity / authenticity values

#let fbox(fill: white, body) = block(
  fill: fill, stroke: 0.5pt + luma(120), inset: 5pt, radius: 2pt,
  width: 100%, body,
)
#let mono(s) = text(font: "DejaVu Sans Mono", size: FIG-MONO)[#s]
#let flab(s) = text(font: "DejaVu Sans Mono", size: FIG-MONO, weight: "bold")[#s]
#let fsm(s) = text(size: 7pt, fill: luma(60))[#s]
#let fnote(s) = text(size: 7.5pt, style: "italic", fill: luma(70))[#s]

#let frow(..cells) = grid(
  columns: (auto, 1fr), row-gutter: 2.6pt, column-gutter: 8pt,
  ..cells.pos(),
)

#let f-legend(..items) = block(above: 7pt, text(size: 7.5pt)[
  #grid(columns: items.pos().len(), column-gutter: 12pt,
    ..items.pos().map(p => [
      #box(width: 7pt, height: 7pt, baseline: 1pt, fill: p.at(0),
           stroke: 0.4pt + luma(120)) #h(3pt)#p.at(1)]))
])

// ── Figure 1 — envelope anatomy (real 1-of-1 signed cell) ────────────────
#let fig-envelope() = figure(
  kind: image,
  caption: [Anatomy of a `.cell` envelope, taken from a real signed 1-of-1
    document. Shading marks what the storing server can and cannot read.
    Values are truncated for width; every one is reproducible from the cell
    listed in §9.],
  {
    set align(left)
    set par(justify: false, leading: 0.5em)
    fbox(fill: white)[
      #frow(
        flab("version"),    mono("\"1.2\""),
        flab("doc_id"),     mono("\"01KZM4TBG7N6P1TV8P3FD43PN8\"") + fsm("  ULID: 48-bit ms + 80-bit random"),
        flab("created_at"), mono("1786320197") + fsm("  = 2026-08-10T00:03:17Z — the ULID's millisecond timestamp, truncated to seconds"),
      )
      #v(5pt)
      #fbox(fill: f-bound)[
        #flab("header") #fnote[— plaintext, and readable before any decryption.
          The four fields marked ● are bound to the ciphertext as AES-GCM AAD.]
        #v(3.5pt)
        #frow(
          mono("● prev_hash"),    mono("null") + fsm("  no predecessor: this is an original cell"),
          mono("● threshold"),    mono("{\"required\":1,\"of_total\":1}"),
          mono("● lifetime"),     mono("{\"type\":\"permanent\", \"advisory\":{…}, \"disposal\":{…}}"),
          mono("● policy"),       mono("{\"copy_protection\":\"standard\", \"watermark_mode\":\"none\", …}"),
          mono("  access_map"),   mono("[ 1 entry ]  method=ecdh-p256  fingerprint=df55f0be5fdbf36a"),
          mono("  payload_hash"), mono("Ux33QrUoR2ouRrta6WZ4LCCVUuebhplQmhpzljJcVGo="),
        )
        #v(3.5pt)
        #fnote[access_map and payload_hash are deliberately *not* AAD-bound:
          neither exists yet at the moment the body is encrypted (§4.4).]
      ]
      #v(4pt)
      #fbox(fill: f-integ)[
        #frow(
          flab("header_hash"),   mono("PQYktm8aFjW7jWfOcOauSCOBNIBhb7Z/4lpn4xZA5jk="),
          flab("header_sig"),    mono("QqBGV3qmq9X2eE1CDryqCcHyMJKaxU…") + fsm("  ECDSA P-256, 64-byte P1363"),
          flab("header_sig_by"), mono("cd9e3a5d1ef4f18b") + fsm("  the first 8 bytes of SHA-256 over the signing SPKI"),
        )
      ]
      #v(4pt)
      #fbox(fill: f-sealed)[
        #flab("payload") #fnote[— AES-256-GCM. This is all the server holds.]
        #v(3.5pt)
        #frow(
          mono("  alg"),        mono("\"AES-256-GCM\"   encoding \"base64+gzip\""),
          mono("  iv"),         mono("ip3EgVSYuT3B5vYc") + fsm("  96 bits"),
          mono("  ciphertext"), mono("3j24tl44GcUDZmdYy54wg9fAO5Mvwv…") + fsm("  180 bytes"),
        )
        #v(3.5pt)
        #fnote[Encrypted within: a 4-byte length prefix, the manifest JSON,
          then the file bytes, gzipped as one buffer. Filename, MIME type and
          size are therefore invisible to the server (§5).]
      ]
      #f-legend(
        (f-bound,  [header — readable, tamper-evident]),
        (f-sealed, [payload — unreadable without a key]),
        (f-integ,  [integrity and authenticity]),
      )
    ]
  },
)

// ── Figure 2 — AAD binding, and the one-byte tamper test ─────────────────
#let f-arrow(s) = align(center, text(size: 9pt)[#s])

#let fig-aad() = figure(
  kind: image,
  caption: [Binding advisory metadata to the ciphertext as AES-GCM additional
    authenticated data (§4.4), with the real 278-byte AAD of the cell in
    Figure 1. Below: altering the quorum requirement from 1 to 2 changes a
    single byte of that AAD and no other, and the authentication tag fails —
    the metadata is readable by anyone yet forgeable by no one.],
  {
    set align(left)
    set par(justify: false, leading: 0.5em)
    fbox(fill: white)[
      #fbox(fill: f-bound)[
        #flab("the four fields fixed before encryption")
        #v(2.5pt)
        #mono("meta = [ header.prev_hash, header.threshold, header.lifetime, header.policy ]")
      ]
      #f-arrow[↓ #text(size: 7.5pt)[canonicalize(): recursive lexicographic key sort, no insignificant whitespace (§4.1.1)]]
      #fbox(fill: f-open)[
        #flab("AAD = UTF-8 bytes, 278 in this cell")
        #v(2.5pt)
        #mono("[null,{\"of_total\":1,\"required\":1},{\"advisory\":{\"minimum_atl\":1,")
        #linebreak()
        #mono("\"release_at\":null,\"retain_until\":null,\"single_use\":false},")
        #linebreak()
        #mono("\"disposal\":{\"action\":\"none\",\"at\":null},\"type\":\"permanent\"},")
        #linebreak()
        #mono("{\"copy_protection\":\"standard\",\"created_on_origin\":null,")
        #linebreak()
        #mono("\"origin_sig\":null,\"watermark_mode\":\"none\"}]")
      ]
      #f-arrow[↓ #text(size: 7.5pt)[supplied as associated data — authenticated, not encrypted]]
      #fbox(fill: f-sealed)[
        #mono("AES-256-GCM( key = CEK, iv = dAtdT0Q1xCuFwuP7, aad = the bytes above )")
        #linebreak()
        #mono("        → ciphertext ‖ 128-bit authentication tag")
      ]
      #v(6pt)
      #line(length: 100%, stroke: 0.4pt + luma(150))
      #v(5pt)
      #flab("The tamper test") #fnote[— a custodian edits the quorum requirement and recomputes header_hash]
      #v(3.5pt)
      #frow(
        mono("sealed with"),  mono("…tal\":1,\"required\":1},{\"advisory\":{\"minim…"),
        mono("presented as"), mono("…tal\":1,\"required\":2},{\"advisory\":{\"minim…"),
      )
      #v(3.5pt)
      #fnote[One byte differs, at offset 31 of 278; the length is unchanged and
        the unkeyed header_hash can be recomputed freely. But the recipient
        derives the AAD from the header *as it now stands*, so the bytes handed
        to GCM no longer match the bytes sealed with, and decryption returns
        nothing at all rather than altered plaintext. There is no field to
        strip: the AAD is never stored, only derived.]
    ]
  },
)

// ── Figure 3 — access-map fan-out and quorum ─────────────────────────────
#let fig-fanout() = figure(
  kind: image,
  caption: [One ciphertext, one content key, N independently wrapped copies
    (§6). Upper: the real 2-of-3 quorum cell, where the CEK is Shamir-split
    before wrapping so no single holder can decrypt. Lower: the same machinery
    admitting heterogeneous access methods in one document.],
  {
    set align(left)
    set par(justify: false, leading: 0.5em)
    fbox(fill: white)[
      #fbox(fill: f-sealed)[
        #mono("CEK — one random AES-256 key, encrypts the body exactly once")
      ]
      #f-arrow[↓ #text(size: 7.5pt)[threshold.required = 2 → Shamir split over GF(2⁸), poly 0x11b (§7)]]
      #grid(columns: (1fr, 1fr), column-gutter: 8pt,
        fbox(fill: f-open)[
          #flab("share_index 1") #linebreak()
          #mono("ephemeral ECDH P-256") #linebreak()
          #mono("→ HKDF-SHA256") #linebreak()
          #mono("→ AES-KW") #linebreak()
          #v(2pt)
          #mono("method  ecdh-p256") #linebreak()
          #mono("label   \"email display test\"") #linebreak()
          #mono("fp      5fb4691647bec054")
        ],
        fbox(fill: f-open)[
          #flab("share_index 2") #linebreak()
          #mono("ephemeral ECDH P-256") #linebreak()
          #mono("→ HKDF-SHA256") #linebreak()
          #mono("→ AES-KW") #linebreak()
          #v(2pt)
          #mono("method  ecdh-p256") #linebreak()
          #mono("label   \"my key\"") #linebreak()
          #mono("fp      70ccd7604eca87a9")
        ],
      )
      #v(4pt)
      #fnote[Each entry carries a fresh ephemeral sender keypair and its own
        32-byte HKDF salt, so the wraps are independent. Either share alone
        reveals nothing about the CEK — information-theoretically, not merely
        computationally (§6.2). Fingerprint 70ccd7604eca87a9 resolves against
        the published certificate of the same name, whose SHA-256(SPKI)\[:16\]
        reproduces it exactly (§13.3).]
      #v(6pt)
      #line(length: 100%, stroke: 0.4pt + luma(150))
      #v(5pt)
      #flab("Heterogeneous access in a single cell") #fnote[— the same 2-of-3 cell, all three entries]
      #v(3.5pt)
      #frow(
        mono("share 1  ecdh-p256"), mono("wrapped to a published public key"),
        mono("share 2  ecdh-p256"), mono("wrapped to a second public key"),
        mono("share 3  pbkdf2"),    mono("wrapped under PBKDF2-SHA256, 600,000 iterations — an escrow passphrase"),
      )
      #v(3.5pt)
      #fnote[The access map is access policy expressed as cryptography rather
        than as server configuration: a hardware token, a published key and a
        passphrase in a safe can each open the same document, and a party below
        the threshold holds nothing a server could be persuaded to honour.]
    ]
  },
)

// ── Figure 4 — verification order and lineage ────────────────────────────
#let fig-verify() = figure(
  kind: image,
  caption: [The verification chain (§10) and lineage (§11), with real values
    from a two-link chain. Each layer commits to the next, so one optional
    signature at the top transitively vouches for everything beneath it.],
  {
    set align(left)
    set par(justify: false, leading: 0.5em)
    fbox(fill: white)[
      #fbox(fill: f-sealed)[
        #mono("file bytes  →  gzip( [4-byte len][manifest][content] )  →  AES-256-GCM + AAD")
      ]
      #f-arrow[↓]
      #fbox(fill: f-open)[
        #mono("payload_hash = SHA-256(raw ciphertext bytes)") #linebreak()
        #mono("               committed INSIDE the header, so the hash below covers it")
      ]
      #f-arrow[↓]
      #fbox(fill: f-open)[
        #mono("header_hash  = SHA-256(canonicalize(header))") #linebreak()
        #mono("               7Im5Inh0l074Ee3fZUfg8agqz5kOiAvs2psEXwBrEsk=")
      ]
      #f-arrow[↓]
      #fbox(fill: f-integ)[
        #mono("header_sig   = ECDSA-SHA256(canonicalize(header), sender key)  [optional]")
      ]
      #v(6pt)
      #flab("Order of checks on open, and what each one catches")
      #v(3.5pt)
      #frow(
        mono("1  header_hash"),  mono("accidental corruption; tolerant of benign reformatting"),
        mono("2  payload_hash"), mono("a ciphertext swapped beneath an intact header"),
        mono("3  header_sig"),   mono("sender authenticity, when present"),
        mono("4  GCM tag"),      mono("any edit to the AAD-bound metadata — intrinsic to decryption"),
      )
      #v(3.5pt)
      #fnote[Steps 1–3 run before any decryption is attempted; step 4 is not a
        separate check that software might skip but arithmetic inside the
        decryption itself. Note that steps 1–3 are unkeyed or optional: an
        adversary editing the header can recompute header_hash and strip the
        signature. Step 4 is the one that cannot be evaded without the CEK.]
      #v(6pt)
      #line(length: 100%, stroke: 0.4pt + luma(150))
      #v(5pt)
      #flab("Lineage — a successor commits to its parent")
      #v(3.5pt)
      #frow(
        mono("parent  header_hash"), mono("7Im5Inh0l074Ee3fZUfg8agqz5kOiAvs2psEXwBrEsk="),
        mono("child   prev_hash"),   mono("7Im5Inh0l074Ee3fZUfg8agqz5kOiAvs2psEXwBrEsk=  ← identical"),
        mono("child   header_hash"), mono("sONkT1oXcT/DdTyixZB71N0/eOfLeNYjdXdNQlhpa3A="),
      )
      #v(3.5pt)
      #fnote[prev_hash sits in the header, so it is covered by header_hash, by
        the signature, and — since v1.1 — bound as AAD. Severing a cell from
        its history is therefore exactly as infeasible as forging its expiry.]
    ]
  },
)
