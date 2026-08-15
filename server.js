#!/usr/bin/env node
// Minimal static server for cd-vanilla — not required for offline use
// Serves HTTPS so WebAuthn (YubiKey PRF) works; falls back to HTTP if no cert found.
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT  = process.env.PORT  || 7801;
const HPORT = process.env.HPORT || 7800; // HTTP redirect port

// Point CERT/KEY at any certificate pair. WebCrypto needs a secure context,
// so HTTPS (or plain localhost) is required for the YubiKey/PRF paths.
const CERT = process.env.CERT || './certs/localhost.crt';
const KEY  = process.env.KEY  || './certs/localhost.key';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
};

function handler(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

try {
  const tlsOpts = {
    cert: fs.readFileSync(CERT),
    key:  fs.readFileSync(KEY),
  };
  https.createServer(tlsOpts, handler).listen(PORT, () => {
    console.log(`cd-vanilla → https://localhost:${PORT}`);
  });
  // Redirect HTTP → HTTPS
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://localhost:${PORT}${req.url}` });
    res.end();
  }).listen(HPORT, () => {
    console.log(`HTTP redirect  → http://localhost:${HPORT} (→ HTTPS)`);
  });
} catch {
  // No cert — plain HTTP fallback (WebAuthn won't work except on localhost)
  http.createServer(handler).listen(PORT, () => {
    console.log(`cd-vanilla → http://localhost:${PORT}  (no TLS — YubiKey PRF disabled)`);
  });
}
