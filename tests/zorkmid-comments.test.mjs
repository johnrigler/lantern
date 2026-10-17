import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { FileProxy, safePath, readSettings, saveSettings } from '../world/file-proxy.js';
import { openIdentity, verifyComment, saveComment, loadComments, commentPath, COMMENT_TYPE } from '../world/comments.js';
import { fromPrivateHex } from '../onboard/wallet.js';

globalThis.window = globalThis;
for (const file of ['chisel.js', 'chisel.sign.js', 'chisel.identity.js']) vm.runInThisContext(await readFile(new URL('../onboard/vendor/' + file, import.meta.url), 'utf8'));
const KEY = '1'.padStart(64, '0'); // Public test fixture only.
const WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('signed comments prove control of both compressed and uncompressed eCash addresses', async () => {
  for (const compressed of [true, false]) {
    const wallet = await fromPrivateHex(KEY, compressed), identity = await openIdentity(wallet.wif, { name: 'Wanderer', avatar: '321' });
    const envelope = await identity.signComment('Hello from the fixture.');
    assert(await verifyComment(envelope)); assert.equal(envelope.payload.address, wallet.address);
    assert.equal(envelope.payload.compressed, compressed);
    assert(!JSON.stringify(envelope).includes(wallet.wif)); assert(!JSON.stringify(envelope).includes(KEY));
    const tampered = structuredClone(envelope); tampered.payload.text += ' changed';
    assert.equal(await verifyComment(tampered), false);
    const other = await fromPrivateHex('2'.padStart(64, '0'));
    const falseClaim = await CHISEL.signArtifact({ privateKeyHex: KEY, type: COMMENT_TYPE, payload: { ...envelope.payload, address: other.address } });
    assert.equal(await verifyComment(falseClaim), false);
    identity.signOut(); await assert.rejects(identity.signComment('later'), /Sign in again/);
  }
});
test('File Proxy uses GET list/load and POST save with path/text and no credentials', async () => {
  const calls = [], files = new Map();
  const proxy = new FileProxy('https://files.example/transport', async (input, options) => {
    const url = new URL(input); calls.push({ url, options });
    assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
    if (url.pathname.endsWith('/save')) { const body = JSON.parse(options.body); assert.deepEqual(Object.keys(body).sort(), ['path', 'text']); files.set(body.path, body.text); return response({ ok: true, path: body.path }); }
    if (url.pathname.endsWith('/list')) return response({ ok: true, items: [...files].map(([path, text]) => ({ name: path.split('/').pop(), type: 'file', modified: 1, size: text.length })) });
    if (url.pathname.endsWith('/load')) return response({ ok: true, text: files.get(url.searchParams.get('path')) });
    throw new Error('Unexpected route');
  });
  const identity = await openIdentity(WIF), signed = await identity.signComment('Public fixture comment');
  await saveComment(proxy, 'zorkmid/comments', signed);
  await saveComment(proxy, 'zorkmid/comments', signed); assert.equal(files.size, 1); // Same signed retry is idempotent.
  const result = await loadComments(proxy, 'zorkmid/comments'); assert.equal(result.comments.length, 1); assert.equal(result.rejected, 0);
  assert.deepEqual(calls.map(c => c.options.method), ['POST', 'POST', 'GET', 'GET']);
  for (const call of calls) { assert(!JSON.stringify(call).includes(WIF)); assert(!JSON.stringify(call).includes(KEY)); }
  identity.signOut();
});
test('forged feed files are hidden, cached signed files remain verified, and missing directories are empty', async () => {
  const identity = await openIdentity(WIF), good = await identity.signComment('<img src=x onerror=alert(1)>');
  const bad = structuredClone(good); bad.proof.signature = '00'.repeat(64); bad.proof.digest = '12'.repeat(32);
  const files = new Map([[commentPath('comments', good), JSON.stringify(good)], [commentPath('comments', bad), JSON.stringify(bad)]]);
  let loads = 0;
  const proxy = { url: 'https://test.example', list: async () => [...files].map(([path, text]) => ({ name: path.split('/').pop(), type: 'file', size: text.length, modified: 1 })), load: async path => { loads++; return files.get(path); } };
  const cache = new Map(), first = await loadComments(proxy, 'comments', cache);
  assert.equal(first.comments.length, 1); assert.equal(first.rejected, 1); assert.equal(first.comments[0].payload.text, '<img src=x onerror=alert(1)>');
  await loadComments(proxy, 'comments', cache); assert.equal(loads, 3); // Verified entry cached, rejected one rechecked.
  const missing = new FileProxy('https://test.example', async () => response({ ok: false, error: 'Path does not exist' }, 404));
  assert.deepEqual(await missing.list('comments'), []);
  const offline = new FileProxy('https://test.example', async () => response({ error: 'Wrong route' }, 404));
  await assert.rejects(offline.list('comments'), /Wrong route/);
  identity.signOut();
});
test('only public service settings persist and paths cannot escape the selected root', () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const clean = saveSettings({ proxy: 'https://files.example/', directory: 'world/comments', chronik: 'https://chronik.e.cash', wif: WIF }, storage);
  assert.deepEqual(readSettings(storage), clean); assert(![...data.values()].join('').includes(WIF));
  for (const path of ['../outside', '/absolute', 'a/../b', 'a//b', 'a\\b', '%2e%2e/x']) assert.throws(() => safePath(path));
  assert.throws(() => saveSettings({ ...clean, proxy: 'https://password@files.example' }, storage));
});
