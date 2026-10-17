import assert from 'node:assert/strict';
import { createECDH, createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import cashaddr from '../onboard/vendor/ecashaddrjs-2.0.3.js';

globalThis.window = globalThis;
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
for (const file of ['chisel.js', 'chisel.sign.js', 'noble-secp256k1-3.2.0.browser.js', 'chisel.secp256k1.js', 'chisel.secp256k1.noble.js', 'chisel.sign.backend.js']) {
  vm.runInThisContext(await readFile(new URL('../onboard/vendor/' + file, import.meta.url), 'utf8'));
}
const wallet = await import('../onboard/wallet.js');
const ONE = '1'.padStart(64, '0');
const ORDER = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';
const ADDRESS_ONE = 'ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq';
const WIF_ONE = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const hash = (algorithm, bytes) => createHash(algorithm).update(bytes).digest();

function decodeWifIndependently(wif) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n;
  for (const letter of wif) value = value * 58n + BigInt(alphabet.indexOf(letter));
  let hex = value.toString(16); if (hex.length % 2) hex = '0' + hex;
  const bytes = Buffer.from(hex, 'hex'), payload = bytes.subarray(0, -4);
  assert.deepEqual(bytes.subarray(-4), hash('sha256', hash('sha256', payload)).subarray(0, 4));
  assert.equal(payload[0], 0x80);
  return { privateKey: payload.subarray(1, 33), compressed: payload.length === 34 };
}

test('known scalar-one compressed mainnet WIF and CashAddr match', async () => {
  const result = await wallet.fromPrivateHex(ONE);
  assert.equal(result.wif, WIF_ONE); assert.equal(result.address, ADDRESS_ONE);
  assert.equal(result.network, 'ecash'); assert.equal(result.compressed, true);
  assert.deepEqual(Object.keys(result).sort(), ['address', 'compressed', 'network', 'wif']);
});

test('public keys/hashes and WIF checksums agree with independent Node crypto', async () => {
  for (const scalar of [ONE, '02'.padStart(64, '0'), '12345678'.padStart(64, '0'), (BigInt('0x' + ORDER) - 1n).toString(16)]) {
    for (const compressed of [true, false]) {
      const result = await wallet.fromPrivateHex(scalar, compressed);
      const decoded = decodeWifIndependently(result.wif);
      assert.equal(decoded.privateKey.toString('hex'), scalar); assert.equal(decoded.compressed, compressed);
      const ec = createECDH('secp256k1'); ec.setPrivateKey(Buffer.from(scalar, 'hex'));
      const pub = ec.getPublicKey(null, compressed ? 'compressed' : 'uncompressed');
      const expectedHash = hash('ripemd160', hash('sha256', pub)).toString('hex');
      assert.equal(cashaddr.decodeCashAddress(result.address).hash, expectedHash);
    }
  }
});

test('compressed and uncompressed WIF restore the same receiving identities', async () => {
  for (const compressed of [true, false]) {
    const original = await wallet.fromPrivateHex(ONE, compressed);
    assert.deepEqual(await wallet.restoreWallet(original.wif), original);
  }
  assert.notEqual((await wallet.fromPrivateHex(ONE, false)).address, ADDRESS_ONE);
});

test('invalid scalars, damaged WIFs, and other network prefixes are rejected', async () => {
  for (const scalar of ['0'.repeat(64), ORDER, 'f'.repeat(64), '1', 'g'.repeat(64)]) {
    assert.equal(wallet.validPrivateHex(scalar), false);
    await assert.rejects(wallet.fromPrivateHex(scalar), /private key/);
  }
  await assert.rejects(wallet.restoreWallet(WIF_ONE.slice(0, -1) + '1'), /checksum/);
  await assert.rejects(wallet.restoreWallet(ONE), /WIF/);
  for (const prefix of [0xef, 0xb0]) {
    const payload = new Uint8Array(34); payload[0] = prefix; payload[32] = 1; payload[33] = 1;
    const wif = await CHISEL.base58CheckEncode(payload);
    await assert.rejects(wallet.restoreWallet(wif), /mainnet/);
  }
});

test('random generation rejects zero/out-of-range samples without modulo reduction', async () => {
  let calls = 0;
  const samples = ['0'.repeat(64), ORDER, ONE];
  const generated = await wallet.createWallet({ getRandomValues(bytes) { bytes.set(Buffer.from(samples[calls++], 'hex')); return bytes; } });
  assert.equal(calls, 3); assert.equal(generated.address, ADDRESS_ONE);
  await assert.rejects(wallet.createWallet({ getRandomValues(bytes) { bytes.fill(0); return bytes; } }), /random generation failed/);
});

test('random wallets round-trip their address and key without collisions', async () => {
  const seen = new Set();
  for (let i = 0; i < 24; i++) {
    const next = await wallet.createWallet();
    assert.equal(seen.has(next.address), false); seen.add(next.address);
    const decoded = decodeWifIndependently(next.wif);
    const ec = createECDH('secp256k1'); ec.setPrivateKey(decoded.privateKey);
    const pub = ec.getPublicKey(null, 'compressed');
    assert.equal(cashaddr.decodeCashAddress(next.address).hash, hash('ripemd160', hash('sha256', pub)).toString('hex'));
    assert.equal((await wallet.restoreWallet(next.wif)).address, next.address);
  }
});

test('official Bitcoin ABC CashAddr example validates; wrong/mixed case addresses fail', () => {
  const example = 'ecash:qpadrekpz6gjd8w0zfedmtqyld0r2j4qmuthccqd8d';
  assert.equal(wallet.normalizeAddress(example), example);
  assert.equal(wallet.normalizeAddress(ADDRESS_ONE.toUpperCase()), ADDRESS_ONE);
  for (const invalid of [ADDRESS_ONE.replace('ecash:', 'bitcoincash:'), ADDRESS_ONE.replace('ecash:', ''), ADDRESS_ONE.replace('qp63', 'Qp63'), ADDRESS_ONE.slice(0, -1) + 'x']) {
    assert.throws(() => wallet.normalizeAddress(invalid));
  }
});

test('public URL construction whitelists fields and strips old secrets from a base URL', async () => {
  const full = { ...await wallet.fromPrivateHex(ONE), name: 'John', avatar: '312', privateKeyHex: ONE };
  const url = wallet.buildIdentityUrl(full.address, full, 'https://johnrigler.github.io/zorkmid/id.html?wif=' + WIF_ONE + '#privateKeyHex=' + ONE);
  assert(!url.includes(WIF_ONE)); assert(!url.includes(ONE)); assert(!/wif|privateKey/i.test(url));
  assert.deepEqual(Array.from(new URL(url).searchParams.keys()), ['address']);
  assert.deepEqual(wallet.readIdentityUrl(url), { address: ADDRESS_ONE, name: 'John', avatar: '312' });
  for (const base of ['javascript:alert(1)', 'http://example.com/id.html', 'https://user:password@example.com/id.html']) {
    assert.throws(() => wallet.buildIdentityUrl(ADDRESS_ONE, {}, base));
  }
});

test('relative public links follow both GitHub names and an IPFS deployment', () => {
  for (const base of ['https://johnrigler.github.io/lantern/', 'https://johnrigler.github.io/zorkmid/', 'https://bafyexample.ipfs.dweb.link/']) {
    assert.equal(wallet.defaultIdPage(base + 'onboard/wallet.js'), base + 'id.html');
  }
  assert.equal(wallet.defaultIdPage('https://ipfs.io/ipfs/QmExample/onboard/wallet.js'), 'https://ipfs.io/ipfs/QmExample/id.html');
  assert.equal(wallet.defaultIdPage('file:///tmp/zorkmid/onboard/wallet.js'), wallet.CANONICAL_ID_PAGE);
});

test('public page has no private/signing scripts and all local application assets exist', async () => {
  const html = await readFile(new URL('../id.html', import.meta.url), 'utf8');
  assert(!/vendor\/chisel|chisel\.sign|recoveryWif/.test(html));
  for (const page of ['id.html', 'onboard/index.html']) {
    const source = await readFile(new URL('../' + page, import.meta.url), 'utf8');
    const ids = Array.from(source.matchAll(/\bid="([^"]+)"/g), m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    for (const match of source.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?(?:#[^"]*)?"/g)) {
      if (/^(https?:|#)/.test(match[1])) continue;
      if (match[1].endsWith('/')) continue;
      await readFile(new URL('../' + page.slice(0, page.lastIndexOf('/') + 1) + match[1], import.meta.url));
    }
  }
});
