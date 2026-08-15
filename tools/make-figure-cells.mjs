// Mint the demonstration cells used as figure source data in
// docs/DEFENSIVE-DISCLOSURE.md. Purpose-built for publication: no personal
// content, freshly generated keys, deterministic structure.
//
//   node tools/make-figure-cells.mjs  ->  docs/figure-data/*.cell + summary
//
// Produces:
//   fig-single.cell   signed 1-of-1, single ecdh-p256 recipient -> Figures 1, 2
//   fig-quorum.cell   2-of-3 Shamir quorum, heterogeneous access methods
//                     (2x ecdh-p256 + 1x pbkdf2), signed  -> Figure 3
//   fig-child.cell    successor of fig-quorum via prev_hash -> Figure 4 lineage
//
// Every value quoted in a figure must come from a cell committed here, so that
// a reader can recheck it. fig-single was previously missing: Figures 1 and 2
// quoted a cell that was never committed and could not be regenerated.
//
// Loads the real cell-crypto.js the same way tests/run.mjs does, so the bytes
// are produced by the reference implementation, not a reimplementation.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

globalThis.window = { location: { origin: 'test://x' }, CompressionStream };
globalThis.location = { hostname: 'localhost', origin: 'test://x' };
globalThis.navigator = { userAgent: 'node' };
globalThis.document = { addEventListener() {}, getElementById() { return null; } };
const _ls = {};
globalThis.localStorage = {
  getItem: k => (k in _ls ? _ls[k] : null),
  setItem: (k, v) => { _ls[k] = String(v); },
  removeItem: k => { delete _ls[k]; },
};
globalThis.indexedDB = {};

const indexJs = readFileSync(`${ROOT}/cell-crypto.js`, 'utf8');
const appExports =
  'return { toB64, fromB64, sha256, toHex, ulid, cellCreate, cellOpen, ' +
  'canonicalize, serializeHeader, crypto: globalThis.crypto };';
const w = new Function(indexJs + '\n;' + appExports)();

async function makeRecipient(label) {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const spki = w.toB64(new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey)));
  const pkcs8 = w.toB64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)));
  const fingerprint = w.toHex(await w.sha256(w.fromB64(spki))).slice(0, 16);
  return { label, method: 'ecdh-p256', spki, pkcs8, fingerprint };
}

const outDir = `${ROOT}/docs/figure-data`;
mkdirSync(outDir, { recursive: true });

// --- recipients: two public-key holders and one passphrase/escrow entry ---
const director = await makeRecipient('Director A');
const attorney = await makeRecipient('Attorney B');
const escrow = {
  label: 'Escrow passphrase', method: 'pbkdf2',
  passphrase: 'correct horse battery staple thirty seven',
};
const sender = await makeRecipient('Sender');

// --- Figure 3: 2-of-3 quorum, heterogeneous methods, signed ---
const body = new TextEncoder().encode(
  'Demonstration content for the .cell defensive disclosure figures.\n' +
  'This file contains no confidential material.\n');
const file = new File([body], 'board-packet.txt', { type: 'text/plain' });

// v1.3 lifetime, split by enforcer (§8). The figures must show the current
// shape, not the flat v1.0–1.2 one that normalizeLifetime would migrate.
const LIFETIME = {
  type: 'record',
  advisory: { retain_until: 1917000000, release_at: null,
              single_use: false, minimum_atl: 2 },
  disposal: { at: 1917000000, action: 'archive' },
};
const POLICY = { copy_protection: 'strict', watermark_mode: 'basic',
                 created_on_origin: 'https://example.invalid', origin_sig: null };

// --- Figures 1 & 2: signed 1-of-1, the simplest complete envelope ---
// Deliberately left on the defaults — permanent lifetime, standard policy, no
// origin — because Figures 1 and 2 exist to show the envelope's skeleton and
// the smallest possible AAD. The richer lifetime/policy values are exercised
// by the quorum and lineage cells below.
const single = await w.cellCreate(
  new File([body], 'engagement-letter.txt', { type: 'text/plain' }),
  [director],
  { senderRec: sender },
);
writeFileSync(`${outDir}/fig-single.cell`, JSON.stringify(single, null, 2));

const quorum = await w.cellCreate(file, [director, attorney, escrow], {
  threshold: 2,
  senderRec: sender,
  lifetime: LIFETIME,
  policy: POLICY,
});
writeFileSync(`${outDir}/fig-quorum.cell`, JSON.stringify(quorum, null, 2));

// --- Figure 4: a successor cell, chaining prev_hash to the parent ---
const child = await w.cellCreate(
  new File([body], 'board-packet.txt', { type: 'text/plain' }),
  [director, attorney, escrow],
  { threshold: 2, senderRec: sender, prevHash: quorum.header_hash,
    lifetime: LIFETIME, policy: POLICY },
);
writeFileSync(`${outDir}/fig-child.cell`, JSON.stringify(child, null, 2));

// --- report ---
const line = (c, n) => {
  const am = c.header.access_map;
  console.log(`${n}`);
  console.log(`  version=${c.version} doc_id=${c.doc_id}`);
  console.log(`  threshold=${c.header.threshold.required}/${c.header.threshold.of_total}`);
  console.log(`  prev_hash=${c.header.prev_hash ?? 'null'}`);
  console.log(`  header_hash=${c.header_hash}`);
  console.log(`  signed=${c.header_sig ? 'yes by ' + c.header_sig_by : 'no'}`);
  am.forEach(e => console.log(
    `    - ${String(e.method).padEnd(11)} share_index=${e.share_index ?? '(absent)'} ` +
    `fp=${e.fingerprint} label="${e.label}"`));
};
line(single, 'fig-single.cell');
line(quorum, 'fig-quorum.cell');
line(child, 'fig-child.cell');
console.log(`\nwrote fig-single.cell, fig-quorum.cell and fig-child.cell to ${outDir}`);
console.log('\nRe-check every value quoted in docs/disclosure-header.typ against the above.');
