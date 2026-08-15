// SPDX-FileCopyrightText: 2026 Enthropic Data LLC
// SPDX-License-Identifier: LicenseRef-Enthropic-Proprietary
//
// Cell Format crypto library — reusable across Enthropic projects.
// Requires: WebCrypto API, CompressionStream/DecompressionStream, IndexedDB, localStorage.
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function toB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str);
}
function fromB64(b64) {
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
function parsePemKey(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return fromB64(b64);
}
function toHex(buf) {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data)
              : data instanceof Uint8Array ? data : new Uint8Array(data);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}
async function fp(spkiB64) {
  return toHex(await sha256(fromB64(spkiB64))).slice(0, 16);
}
function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n/1024).toFixed(1) + ' KB';
  return (n/1048576).toFixed(1) + ' MB';
}
function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleString('en-US',
    { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// Escape for a single-quoted JS string embedded in a double-quoted HTML attribute (e.g. onclick="fn('${jsq(x)}')").
// JS-string escaping first, then HTML-attribute escaping, so neither layer can be broken out of.
function jsq(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Sanitise attacker-supplied identifiers from imported .cdkey/.cdpub files so
// they can never carry HTML/JS into the DOM. keyId → safe charset (else fresh
// UUID); fingerprint → lowercase hex (else dropped and recomputed from SPKI).
function safeKeyId(id) {
  return (typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)) ? id : crypto.randomUUID();
}
function safeFingerprint(fpr) {
  return (typeof fpr === 'string' && /^[0-9a-f]{1,64}$/.test(fpr)) ? fpr : null;
}
async function assertValidSpki(spkiB64) {
  try {
    await crypto.subtle.importKey('spki', fromB64(spkiB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  } catch { throw new Error('Invalid SPKI public key'); }
}
function ulid() {
  const E = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now(), s = new Array(26);
  for (let i = 9; i >= 0; i--) { s[i] = E[t & 31]; t = Math.floor(t / 32); }
  const r = crypto.getRandomValues(new Uint8Array(10));
  let bits = 0, avail = 0, ri = 0;
  for (let i = 10; i < 26; i++) {
    if (avail < 5) { bits = (bits << 8) | r[ri++]; avail += 8; }
    avail -= 5; s[i] = E[(bits >> avail) & 31];
  }
  return s.join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPRESSION / DECOMPRESSION
// ═══════════════════════════════════════════════════════════════════════════

async function gzip(bytes) {
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter(); w.write(bytes); w.close();
  return collectStream(cs.readable);
}
async function gunzip(bytes) {
  const ds = new DecompressionStream('gzip');
  const w = ds.writable.getWriter(); w.write(bytes); w.close();
  return collectStream(ds.readable);
}
// Guard against gzip bombs: a few KB can decompress to many GB and OOM the tab.
const MAX_DECOMPRESSED = 2 * 1024 * 1024 * 1024; // 2 GiB
async function collectStream(readable, maxBytes = MAX_DECOMPRESSED) {
  const chunks = []; const r = readable.getReader(); let total = 0;
  for (;;) {
    const {done, value} = await r.read(); if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { try { await r.cancel(); } catch {} throw new Error('Decompressed size exceeds safety limit'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total); let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — CEK (Content Encryption Key, 256-bit AES-GCM)
// ═══════════════════════════════════════════════════════════════════════════

async function cekGenerate() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
async function cekExportRaw(cek) {
  return new Uint8Array(await crypto.subtle.exportKey('raw', cek));
}
async function cekEncrypt(cek, plainBytes, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const params = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = aad;
  const ct = await crypto.subtle.encrypt(params, cek, plainBytes);
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}
async function cekDecrypt(cekRaw, ivB64, ctB64, aad) {
  const cek = await crypto.subtle.importKey('raw', cekRaw, 'AES-GCM', false, ['decrypt']);
  const params = { name: 'AES-GCM', iv: fromB64(ivB64) };
  if (aad) params.additionalData = aad;
  return new Uint8Array(await crypto.subtle.decrypt(params, cek, fromB64(ctB64)));
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — ECDH P-256 KEY WRAP / UNWRAP
// Per spec §4.1: ECDH shared secret → HKDF-SHA256 → AES-KW (not raw ECDH).
// hkdf_salt is 32 random bytes stored alongside the wrapped CEK.
// ═══════════════════════════════════════════════════════════════════════════

// Format version constants — checked on open to give clear errors on unknown versions
const CELL_FORMAT_VERSION = '1.2';
const SUPPORTED_VERSIONS  = new Set(['1.0', '1.1', '1.2']);

const HKDF_INFO = new TextEncoder().encode('cellular-defense-cek-wrap-v1');

async function _hkdfWrapKey(sharedBits, salt, usage) {
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: HKDF_INFO },
    hkdfKey,
    { name: 'AES-KW', length: 256 },
    false,
    [usage]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — SHAMIR SECRET SHARING OVER GF(256) (spec §5.2 threshold/quorum)
// ═══════════════════════════════════════════════════════════════════════════

function gfMul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}
function gfInv(x) {
  let r = 1, base = x, e = 254;
  while (e) { if (e & 1) r = gfMul(r, base); base = gfMul(base, base); e >>= 1; }
  return r;
}
function shamirSplit(secret, n, k) {
  const shares = Array.from({length: n}, (_, i) => ({ x: i + 1, data: new Uint8Array(secret.length) }));
  for (let bi = 0; bi < secret.length; bi++) {
    const c = new Uint8Array(k);
    c[0] = secret[bi];
    crypto.getRandomValues(c.subarray(1));
    for (const {x, data} of shares) {
      let y = c[k - 1];
      for (let i = k - 2; i >= 0; i--) y = gfMul(y, x) ^ c[i];
      data[bi] = y;
    }
  }
  return shares;
}
function shamirCombine(shares) {
  if (!shares.length) throw new Error('No shares to combine');
  const xs = shares.map(s => s.x);
  if (xs.some(x => !Number.isInteger(x) || x < 1 || x > 255))
    throw new Error('Invalid share index — must be 1..255');
  if (new Set(xs).size !== xs.length)
    throw new Error('Duplicate share indices — cannot reconstruct secret');
  const out = new Uint8Array(shares[0].data.length);
  for (let bi = 0; bi < out.length; bi++) {
    let s = 0;
    for (let i = 0; i < shares.length; i++) {
      let num = 1, den = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        num = gfMul(num, shares[j].x);
        den = gfMul(den, shares[i].x ^ shares[j].x);
      }
      s ^= gfMul(shares[i].data[bi], gfMul(num, gfInv(den)));
    }
    out[bi] = s;
  }
  return out;
}

async function ecdhWrapCek(cekRaw, recipientSpkiB64) {
  const recipPub = await crypto.subtle.importKey(
    'spki', fromB64(recipientSpkiB64),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const eph = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipPub }, eph.privateKey, 256
  );
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const wrapKey = await _hkdfWrapKey(sharedBits, salt, 'wrapKey');
  const cekKey = await crypto.subtle.importKey('raw', cekRaw, 'AES-GCM', true, ['encrypt']);
  const wrapped = await crypto.subtle.wrapKey('raw', cekKey, wrapKey, 'AES-KW');
  const ephSpki = await crypto.subtle.exportKey('spki', eph.publicKey);
  return {
    eph_spki:  toB64(new Uint8Array(ephSpki)),
    hkdf_salt: toB64(salt),
    ct:        toB64(new Uint8Array(wrapped)),
  };
}

async function ecdhUnwrapCek(wrappedCek, privateKey) {
  const ephPub = await crypto.subtle.importKey(
    'spki', fromB64(wrappedCek.eph_spki),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: ephPub }, privateKey, 256
  );
  let wrapKey;
  if (wrappedCek.hkdf_salt) {
    // v1.0 / v2.1+: ECDH → HKDF-SHA256 → AES-KW  (spec §4.1)
    wrapKey = await _hkdfWrapKey(sharedBits, fromB64(wrappedCek.hkdf_salt), 'unwrapKey');
  } else {
    // legacy v2.0: ECDH shared bits used directly as AES-KW key (pre-spec)
    wrapKey = await crypto.subtle.importKey(
      'raw', new Uint8Array(sharedBits).slice(0, 32), 'AES-KW', false, ['unwrapKey']
    );
  }
  const cekKey = await crypto.subtle.unwrapKey(
    'raw', fromB64(wrappedCek.ct), wrapKey, 'AES-KW',
    { name: 'AES-GCM' }, true, ['decrypt']
  );
  return new Uint8Array(await crypto.subtle.exportKey('raw', cekKey));
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — PBKDF2 KEY WRAP / UNWRAP
// ═══════════════════════════════════════════════════════════════════════════

async function pbkdf2WrapCek(cekRaw, passphrase, saltIn) {
  const salt = saltIn || crypto.getRandomValues(new Uint8Array(32));
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const wrap = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    base, { name: 'AES-KW', length: 256 }, false, ['wrapKey']
  );
  const cekKey = await crypto.subtle.importKey('raw', cekRaw, 'AES-GCM', true, ['encrypt']);
  const wrapped = await crypto.subtle.wrapKey('raw', cekKey, wrap, 'AES-KW');
  return { salt: toB64(salt), iterations: 600000, ct: toB64(new Uint8Array(wrapped)) };
}

async function pbkdf2UnwrapCek(wrappedCek, passphrase) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const wrap = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(wrappedCek.salt), iterations: wrappedCek.iterations || 600000, hash: 'SHA-256' },
    base, { name: 'AES-KW', length: 256 }, false, ['unwrapKey']
  );
  const cekKey = await crypto.subtle.unwrapKey(
    'raw', fromB64(wrappedCek.ct), wrap, 'AES-KW', { name: 'AES-GCM' }, true, ['decrypt']
  );
  return new Uint8Array(await crypto.subtle.exportKey('raw', cekKey));
}

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO — YUBIKEY PRF WRAP / UNWRAP
// PRF output is 32 bytes → used directly as AES-KW wrapping key.
// Only works over HTTPS or localhost (WebAuthn requirement).
// ═══════════════════════════════════════════════════════════════════════════

async function prfGet(credentialIdB64, prfSaltB64) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      userVerification: 'required',
      allowCredentials: [{ id: fromB64(credentialIdB64), type: 'public-key' }],
      extensions: { prf: { eval: { first: fromB64(prfSaltB64) } } },
    }
  });
  const extResults = assertion.getClientExtensionResults();
  console.debug('[PRF get] extension results:', JSON.stringify(extResults));
  const prf = extResults?.prf?.results?.first;
  if (!prf) {
    console.warn('[PRF get] prf.results.first is missing. Full ext:', extResults);
    const err = new Error('PRF output not returned by this authenticator.');
    err.extResults = extResults;
    throw err;
  }
  return new Uint8Array(prf);
}

async function prfWrapCek(cekRaw, credentialIdB64, prfSaltB64) {
  const prfOut = await prfGet(credentialIdB64, prfSaltB64);
  const wrap = await crypto.subtle.importKey('raw', prfOut, 'AES-KW', false, ['wrapKey']);
  const cekKey = await crypto.subtle.importKey('raw', cekRaw, 'AES-GCM', true, ['encrypt']);
  const wrapped = await crypto.subtle.wrapKey('raw', cekKey, wrap, 'AES-KW');
  return { credential_id: credentialIdB64, prf_salt: prfSaltB64, ct: toB64(new Uint8Array(wrapped)) };
}

async function prfUnwrapCek(wrappedCek) {
  const prfOut = await prfGet(wrappedCek.credential_id, wrappedCek.prf_salt);
  const wrap = await crypto.subtle.importKey('raw', prfOut, 'AES-KW', false, ['unwrapKey']);
  const cekKey = await crypto.subtle.unwrapKey(
    'raw', fromB64(wrappedCek.ct), wrap, 'AES-KW', { name: 'AES-GCM' }, true, ['decrypt']
  );
  return new Uint8Array(await crypto.subtle.exportKey('raw', cekKey));
}

async function registerYubiKey(label) {
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Cell Format', id: location.hostname || 'localhost' },
      user: { id: userId, name: label, displayName: label },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'cross-platform' },
      extensions: { prf: { eval: { first: prfSalt } } },
    }
  });
  const ext = cred.getClientExtensionResults();
  console.debug('[PRF register] extension results:', JSON.stringify(ext));
  // prf.enabled = true  → CTAP 2.1 PRF or hmac-secret translation confirmed
  // prf.results.first   → some browsers return the first eval inline during create
  if (!ext?.prf?.enabled && !ext?.prf?.results?.first) {
    console.warn('[PRF register] ext.prf:', ext?.prf);
    throw new Error(
      'This authenticator does not support the PRF extension.\n\n' +
      'Required: YubiKey 5 series (firmware 5.2+) or another FIDO2 key with hmac-secret.\n' +
      'The Yubico Security Key (blue, ~$25) does NOT support PRF — you need the YubiKey 5 series.'
    );
  }
  const credId = toB64(new Uint8Array(cred.rawId));
  const prfSaltB64 = toB64(prfSalt);
  // Verify PRF actually works before storing — some browser/key combos report
  // prf.enabled:true during create() but fail to return output during get().
  // If prf.results.first was returned inline we already know it works; otherwise test now.
  if (!ext?.prf?.results?.first) {
    try {
      await prfGet(credId, prfSaltB64);
    } catch (e) {
      const isFirefoxLinux = /Firefox/.test(navigator.userAgent) && /Linux/.test(navigator.userAgent);
      throw new Error(
        'PRF registration succeeded but PRF output was not returned on first use.\n\n' +
        (isFirefoxLinux
          ? '⚠️ Firefox on Linux does not support YubiKey PRF — use Chrome or Chromium instead.\n\n'
          : 'This may be a browser or firmware issue. Try Chrome/Chromium if you are not already using it.\n\n') +
        'Diagnostic:\n' +
        'browser: ' + navigator.userAgent + '\n' +
        'create() ext: ' + JSON.stringify(ext) + '\n' +
        'get() ext: ' + JSON.stringify(e.extResults ?? null)
      );
    }
  }
  return {
    keyId: crypto.randomUUID(), label, method: 'yubikey-prf',
    fingerprint: toHex(await sha256(fromB64(credId))).slice(0, 16),
    credential_id: credId, prf_salt: prfSaltB64,
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC KEY CONTACTS — localStorage  (public metadata only, no private keys)
// Safe to store: no secrets, survives IDB clears, shareable fingerprints.
// ═══════════════════════════════════════════════════════════════════════════

const LS_PUB = 'cd-vanilla-pubkeys';

function lsPubAll() {
  try { return JSON.parse(localStorage.getItem(LS_PUB) || '[]'); } catch { return []; }
}
function lsPubSave(rec) {
  const pub = {
    keyId: rec.keyId, label: rec.label, method: rec.method,
    fingerprint: rec.fingerprint || null,
    spki: rec.spki || null,
    credential_id: rec.credential_id || null,
    prf_salt: rec.prf_salt || null,
    saved_at: Math.floor(Date.now() / 1000),
  };
  const rest = lsPubAll().filter(r => r.keyId !== pub.keyId);
  localStorage.setItem(LS_PUB, JSON.stringify([...rest, pub]));
}
function lsPubDel(keyId) {
  localStorage.setItem(LS_PUB, JSON.stringify(lsPubAll().filter(r => r.keyId !== keyId)));
}
// Returns localStorage entries that are NOT already in IDB (contacts only).
function lsPubContacts(idbKeys) {
  const idbIds = new Set(idbKeys.map(k => k.keyId));
  return lsPubAll().filter(r => !idbIds.has(r.keyId));
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYCHAIN — IndexedDB  (stores key metadata + private keys for this device)
// ═══════════════════════════════════════════════════════════════════════════

const KC = { DB: 'cd-vanilla', VER: 1, STORE: 'keys' };

function kcOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(KC.DB, KC.VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(KC.STORE, { keyPath: 'keyId' });
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function kcAll() {
  const db = await kcOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(KC.STORE).objectStore(KC.STORE).getAll();
    req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error);
  });
}
async function kcGet(id) {
  const db = await kcOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(KC.STORE).objectStore(KC.STORE).get(id);
    req.onsuccess = e => res(e.target.result); req.onerror = e => rej(e.target.error);
  });
}
async function kcSave(rec) {
  const db = await kcOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(KC.STORE, 'readwrite');
    tx.objectStore(KC.STORE).put(rec);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  });
  // Mirror public fields to localStorage — no secrets stored there.
  if (rec.spki || rec.credential_id) lsPubSave(rec);
}
async function kcDel(id) {
  const db = await kcOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(KC.STORE, 'readwrite');
    tx.objectStore(KC.STORE).delete(id);
    tx.oncomplete = res; tx.onerror = e => rej(e.target.error);
  });
  lsPubDel(id);
}

async function kcGenEcdh(label) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const spki  = toB64(new Uint8Array(await crypto.subtle.exportKey('spki',  pair.publicKey)));
  const pkcs8 = toB64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey)));
  const rec = { keyId: crypto.randomUUID(), label, method: 'ecdh-p256',
    fingerprint: await fp(spki), spki, pkcs8, created_at: Math.floor(Date.now()/1000) };
  await kcSave(rec);
  return rec;
}

async function kcLoadPrivKey(rec) {
  if (!rec.pkcs8) throw new Error('No private key stored for this record');
  return crypto.subtle.importKey('pkcs8', fromB64(rec.pkcs8),
    { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
}

// ═══════════════════════════════════════════════════════════════════════════
// CELL FORMAT — CREATE  (spec v1.2)
// options: { threshold, lifetime, policy, senderRec }
// ═══════════════════════════════════════════════════════════════════════════

// Deterministic JSON serialization (recursively sorted keys, no insignificant
// whitespace) so that header_hash / header_sig / AAD depend only on the *values*,
// not on how the .cell JSON happens to be formatted. A tool that re-orders keys
// or pretty-prints the file no longer causes a false "tampered/forged" failure.
// Mirrors JSON.stringify's primitive/escape handling; undefined is dropped from
// objects and becomes null in arrays, as JSON.stringify does.
function canonicalize(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => canonicalize(x === undefined ? null : x)).join(',') + ']';
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
}
// Bytes that header_hash and header_sig are computed over. v1.2+ uses the
// canonical form; v1.0/v1.1 keep the legacy JSON.stringify form for compat.
function serializeHeader(header, version) {
  return new TextEncoder().encode(version === '1.2' ? canonicalize(header) : JSON.stringify(header));
}

// Additional authenticated data (v1.1+): binds the advisory metadata that is
// decided before encryption (prev_hash/threshold/lifetime/policy) to the
// AES-GCM ciphertext. Any post-hoc edit to these header fields makes the GCM
// tag fail on open — not strippable and not downgradeable (decrypting without
// the AAD also fails the tag). v1.2 canonicalizes so reformatting the JSON does
// not break the binding; v1.1 keeps its original array-of-JSON.stringify form.
function cellAad(header, version) {
  const meta = [
    header.prev_hash ?? null,
    header.threshold ?? null,
    header.lifetime  ?? null,
    header.policy    ?? null,
  ];
  return new TextEncoder().encode(version === '1.1' ? JSON.stringify(meta) : canonicalize(meta));
}

async function _wrapEntry(r, keyMat, shareIdx) {
  const base = { label: r.label, method: r.method, fingerprint: r.fingerprint };
  if (shareIdx !== null) base.share_index = shareIdx;
  if (r.method === 'ecdh-p256') {
    return { ...base, wrapped_cek: await ecdhWrapCek(keyMat, r.spki) };
  } else if (r.method === 'pbkdf2') {
    const wk = await pbkdf2WrapCek(keyMat, r.passphrase);
    return { ...base, fingerprint: toHex(await sha256(fromB64(wk.salt))).slice(0, 16),
             label: r.label || 'Passphrase', wrapped_cek: wk };
  } else if (r.method === 'yubikey-prf') {
    return { ...base, wrapped_cek: await prfWrapCek(keyMat, r.credential_id, r.prf_salt) };
  }
  return null;
}

async function cellCreate(file, recipients, options = {}) {
  const threshold = Math.max(1, Math.min(options.threshold || 1, Math.max(recipients.length, 1)));
  const raw  = new Uint8Array(await file.arrayBuffer());

  // Manifest encrypted inside the payload — filename/type/size invisible to observers (spec §3.3).
  // options.meta: optional sender-defined object (note, case number, reply
  // instructions, …) carried INSIDE the ciphertext — metadata the server and
  // any observer never see. Additive and ignored by older readers.
  const manifest = { filename: file.name, content_type: file.type || 'application/octet-stream', size: raw.byteLength };
  if (options.meta && typeof options.meta === 'object') manifest.meta = options.meta;
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const lenBuf = new Uint8Array(4);
  new DataView(lenBuf.buffer).setUint32(0, manifestBytes.length, true);
  const plaintext = new Uint8Array(4 + manifestBytes.length + raw.byteLength);
  plaintext.set(lenBuf); plaintext.set(manifestBytes, 4); plaintext.set(raw, 4 + manifestBytes.length);

  const body = await gzip(plaintext);
  const cek    = await cekGenerate();
  const cekRaw = await cekExportRaw(cek);

  // Advisory metadata is fixed before encryption so it can be authenticated as
  // AES-GCM AAD (spec v1.2). These exact values are reused in the header below.
  const meta = {
    prev_hash: options.prevHash || null,
    threshold: { required: threshold, of_total: recipients.length },
    lifetime:  options.lifetime || { type: 'permanent', expires_at: null, on_expiry: 'none', single_use: false, minimum_atl: 1 },
    policy:    options.policy   || { copy_protection: 'standard', watermark_mode: 'none', created_on_origin: null, origin_sig: null },
  };
  const enc = await cekEncrypt(cek, body, cellAad(meta, CELL_FORMAT_VERSION));

  let accessMap;
  if (threshold > 1) {
    const rawShares = shamirSplit(cekRaw, recipients.length, threshold);
    accessMap = (await Promise.all(recipients.map((r, i) => _wrapEntry(r, rawShares[i].data, i + 1)))).filter(Boolean);
  } else {
    accessMap = (await Promise.all(recipients.map(r => _wrapEntry(r, cekRaw, null)))).filter(Boolean);
  }
  cekRaw.fill(0);

  // payload_hash binds ciphertext into the header — tamper-evident commitment
  const payloadHash = toB64(await sha256(fromB64(enc.ct)));

  // Same metadata that was bound as AAD, plus the post-encryption fields.
  const header = { ...meta, access_map: accessMap, payload_hash: payloadHash };
  const headerBytes = serializeHeader(header, CELL_FORMAT_VERSION);
  const header_hash = toB64(await sha256(headerBytes));

  // ECDSA signature — re-import same P-256 key material with 'sign' usage
  let header_sig = null, header_sig_by = null, header_sig_key = null;
  const sr = options.senderRec;
  if (sr?.pkcs8 && sr?.spki) {
    const ecdsaKey = await crypto.subtle.importKey(
      'pkcs8', fromB64(sr.pkcs8),
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, ecdsaKey, headerBytes);
    header_sig     = toB64(new Uint8Array(sig));
    header_sig_by  = sr.fingerprint;
    header_sig_key = sr.spki;
  }

  return {
    version:    CELL_FORMAT_VERSION,
    doc_id:     ulid(),
    created_at: Math.floor(Date.now() / 1000),
    header,
    header_hash,
    header_sig,
    header_sig_by,
    header_sig_key,
    payload: { alg: 'AES-256-GCM', encoding: 'base64+gzip', iv: enc.iv, ciphertext: enc.ct },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CELL FORMAT — OPEN  (supports v1.0 and legacy v2.x)
// tryDecryptFn: (entry) => Promise<Uint8Array|null>  (null = not my key)
// ═══════════════════════════════════════════════════════════════════════════

async function cellOpen(cell, tryDecryptFn) {
  // Version gate — warn on unknown versions rather than silently misbehaving
  const fmtVersion = cell.version ?? cell.cd_version ?? 'unknown';
  const isLegacy   = !cell.version && cell.cd_version;
  if (!isLegacy && !SUPPORTED_VERSIONS.has(fmtVersion))
    throw new Error(`Unsupported cell format version "${fmtVersion}" — update the app to open this cell`);

  // Lifetime enforcement (spec §6) — checked before any crypto work
  const lt  = cell.header?.lifetime;
  const now = Math.floor(Date.now() / 1000);
  if (lt) {
    if (lt.type === 'timed_release' && lt.release_at && lt.release_at > now)
      throw new Error(`Timed release — unlocks ${fmtDate(lt.release_at)}`);
    if (lt.expires_at && lt.expires_at < now)
      throw new Error(`Cell expired ${fmtDate(lt.expires_at)}`);
  }

  // Normalise field names — support v1.0 and legacy v2.x
  const accessMap   = cell.header?.access_map ?? cell.recipients ?? [];
  const payloadInfo = cell.payload ?? cell.encrypted_body ?? {};
  const ivField     = payloadInfo.iv;
  const ctField     = payloadInfo.ciphertext ?? payloadInfo.ct;
  const threshold   = cell.header?.threshold?.required ?? 1;

  let cekRaw = null, usedRecipient = null;

  if (threshold > 1) {
    const shares = [];
    for (const r of accessMap) {
      try {
        const share = await tryDecryptFn(r);
        if (share) {
          shares.push({ x: r.share_index ?? (accessMap.indexOf(r) + 1), data: share });
          if (shares.length >= threshold) break;
        }
      } catch { /* try next */ }
    }
    if (shares.length < threshold)
      throw new Error(`Quorum not met — need ${threshold}, unlocked ${shares.length}`);
    cekRaw = shamirCombine(shares);
    for (const s of shares) s.data.fill(0); // wipe individual share material
    usedRecipient = { label: `${shares.length}-of-${accessMap.length} quorum` };
  } else {
    for (const r of accessMap) {
      try {
        const result = await tryDecryptFn(r);
        if (result) { cekRaw = result; usedRecipient = r; break; }
      } catch { /* try next */ }
    }
  }
  if (!cekRaw) throw new Error('No matching key — check your key method and try again');

  // Tamper detection + authenticity
  let sigVerified = null; // null = unsigned, string = verified fp, throws on invalid
  if (cell.header && cell.header_hash) {
    const headerBytes = serializeHeader(cell.header, fmtVersion);
    const computed = toB64(await sha256(headerBytes));
    if (computed !== cell.header_hash)
      throw new Error('Integrity check failed — header may be tampered');
    if (cell.header.payload_hash) {
      const ctHash = toB64(await sha256(fromB64(ctField)));
      if (ctHash !== cell.header.payload_hash)
        throw new Error('Integrity check failed — ciphertext may be tampered');
    }
    if (cell.header_sig && cell.header_sig_key) {
      const ecdsaPub = await crypto.subtle.importKey(
        'spki', fromB64(cell.header_sig_key),
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
      );
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' }, ecdsaPub, fromB64(cell.header_sig), headerBytes
      );
      if (!valid) throw new Error('Header signature invalid — cell may be forged');
      sigVerified = cell.header_sig_by || '(unknown)';
    }
  }

  // v1.1+ binds metadata as AAD; tampering with threshold/lifetime/policy/prev_hash
  // (or stripping the AAD by downgrading the version) fails the GCM tag here.
  const aad = (fmtVersion === '1.1' || fmtVersion === '1.2') ? cellAad(cell.header, fmtVersion) : undefined;
  const compressed = await cekDecrypt(cekRaw, ivField, ctField, aad);
  cekRaw.fill(0);
  const plain = await gunzip(compressed);

  // Manifest-prefixed payload (v1.0) vs legacy cells that had plaintext metadata
  let filename, contentType, fileBytes, meta = null;
  if (cell.original_filename !== undefined) {
    filename    = cell.original_filename ?? cell.doc_id ?? 'decrypted';
    contentType = cell.content_type ?? 'application/octet-stream';
    fileBytes   = plain;
  } else {
    const manifestLen = new DataView(plain.buffer, plain.byteOffset, 4).getUint32(0, true);
    const mf = JSON.parse(new TextDecoder().decode(plain.slice(4, 4 + manifestLen)));
    filename    = mf.filename     ?? cell.doc_id ?? 'decrypted';
    contentType = mf.content_type ?? 'application/octet-stream';
    meta        = mf.meta         ?? null;
    fileBytes   = plain.slice(4 + manifestLen);
  }
  return { bytes: fileBytes, filename, contentType, meta, usedRecipient, sigVerified, sigKey: cell.header_sig_key || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE I/O
// ═══════════════════════════════════════════════════════════════════════════

function dlBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 15000);
}

async function dlCell(cell, baseName, format) {
  const json = JSON.stringify(cell, null, 2);
  if (format === 'celz') {
    const compressed = await gzip(new TextEncoder().encode(json));
    dlBlob(new Blob([compressed], { type: 'application/octet-stream' }), baseName + '.celz');
  } else {
    dlBlob(new Blob([json], { type: 'application/json' }), baseName + '.cell');
  }
}

function dlBytes(bytes, filename, type) {
  dlBlob(new Blob([bytes], { type: type || 'application/octet-stream' }), filename);
}

function dlText(text, filename) {
  dlBlob(new Blob([text], { type: 'text/plain' }), filename);
}

// Parse a .cell or .celz file
async function parseCell(file) {
  if (file.name.endsWith('.celz')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const json = new TextDecoder().decode(await gunzip(bytes));
    return JSON.parse(json);
  }
  return JSON.parse(await file.text());
}
