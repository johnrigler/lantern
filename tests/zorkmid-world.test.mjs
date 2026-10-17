import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const require = createRequire(process.env.ZORKMID_TEST_DEPS ? process.env.ZORKMID_TEST_DEPS + '/package.json' : import.meta.url);
let JSDOM, esbuild, canvas;
try { ({ JSDOM } = require('jsdom')); esbuild = require('esbuild'); canvas = require(process.env.ZORKMID_CANVAS_MODULE || '@napi-rs/canvas'); } catch { /* Optional DOM checks. */ }
const root = new URL('../', import.meta.url);
const WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn'; // Public fixture only.
async function until(predicate) { for (let i = 0; i < 250; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); } assert.fail('UI did not settle'); }

test('world keeps its game mounted, signs comments locally, switches File Proxy, and renders text safely', { skip: !(JSDOM && esbuild && canvas) }, async () => {
  const dom = new JSDOM(await readFile(new URL('world.html', root), 'utf8'), { url: 'https://johnrigler.github.io/lantern/world.html?game=zork3&start=1', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, $ = id => w.document.getElementById(id), stores = new Map(), writes = [];
  try {
    Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.TextEncoder = class { encode(text) { return new w.Uint8Array(new TextEncoder().encode(text)); } }; w.TextDecoder = TextDecoder; w.AbortSignal = AbortSignal;
    const images = new WeakMap();
    w.HTMLCanvasElement.prototype.getContext = function () { if (!images.has(this)) images.set(this, canvas.createCanvas(this.width, this.height)); return images.get(this).getContext('2d'); };
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
    let offline = false;
    w.fetch = async (input, options) => {
      if (offline) throw new Error('Fixture offline');
      const url = new URL(input), origin = url.origin;
      if (!stores.has(origin)) stores.set(origin, new Map()); const files = stores.get(origin);
      let result;
      if (url.pathname.endsWith('/list')) {
        result = { ok: true, items: [...files].map(([path, text]) => ({ name: path.split('/').pop(), type: 'file', size: text.length, modified: 1 })) };
      } else if (url.pathname.endsWith('/save')) {
        const body = JSON.parse(options.body); files.set(body.path, body.text); writes.push({ origin, body }); result = { ok: true };
      } else if (url.pathname.endsWith('/load')) result = { ok: true, text: files.get(url.searchParams.get('path')) };
      else throw new Error('Unexpected network request: ' + input);
      return new Response(JSON.stringify(result));
    };
    for (const name of ['chisel.js', 'chisel.sign.js', 'noble-secp256k1-3.2.0.browser.js', 'chisel.secp256k1.js', 'chisel.secp256k1.noble.js', 'chisel.sign.backend.js', 'chisel.identity.js']) w.eval(await readFile(new URL('onboard/vendor/' + name, root), 'utf8'));
    const build = await esbuild.build({ entryPoints: [fileURLToPath(new URL('world/world.js', root))], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020', define: { 'import.meta.url': JSON.stringify('https://johnrigler.github.io/lantern/onboard/wallet.js') } });
    w.eval(build.outputFiles[0].text);
    await until(() => $('feedStatus').textContent.startsWith('Connected'));
    const frame = $('gameFrame'), frameWindow = frame.contentWindow; frameWindow.gameFixture = { sessionId: 'still-playing', moves: 19 };
    assert.equal(new URL(frame.src).searchParams.get('game'), 'zork3');
    assert.equal(new URL(frame.src).searchParams.get('start'), '1');
    assert.equal($('loginAvatar'), null);
    assert.equal($('accountSymbol').getAttribute('src'), 'assets/zorkmid-symbol.webp');

    for (const view of ['activity', 'etch', 'settings', 'play']) {
      w.document.querySelector('button[data-view="' + view + '"]').click();
      assert.equal(w.document.body.dataset.view, view); assert.equal($('gameFrame'), frame); assert.equal(frame.contentWindow, frameWindow);
      assert.equal(frameWindow.gameFixture.moves, 19);
    }
    $('loginOpen').click(); $('loginWif').value = WIF; $('loginName').value = '<Explorer>'; $('loginForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await until(() => !$('logout').hidden);
    assert.equal($('loginWif').value, ''); assert.equal($('accountName').textContent, '<Explorer>');
    assert(w.zorkmidWorld.getIdentity().startsWith('chisel:v1:'));
    const signedSave = await w.zorkmidWorld.signGameSave({ savedAt: new Date().toISOString(), session: { game: 'zork1', moves: ['look'] } });
    assert.equal(signedSave.type, 'lantern-save'); assert(await w.CHISEL.verifyArtifact(signedSave));
    const message = '<img src=x onerror="window.pwned=true">';
    $('commentText').value = message; $('commentForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await until(() => $('commentFeed').querySelector('.comment'));
    assert.equal($('commentFeed').querySelector('.comment p').textContent, message); assert.equal($('commentFeed').querySelector('img'), null); assert.equal(w.pwned, undefined);
    assert.equal(writes.length, 1); assert(!JSON.stringify(writes).includes(WIF));
    offline = true; $('refreshComments').click(); await until(() => $('feedStatus').textContent.includes('unavailable'));
    assert.equal($('commentFeed').querySelector('.comment p').textContent, message); offline = false;
    $('proxyUrl').value = 'https://own-files.example/proxy'; $('proxyDirectory').value = 'my-world/comments'; $('settingsForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await until(() => $('feedStatus').textContent.includes('no comments yet'));
    $('commentText').value = 'Using my own service'; $('commentForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await until(() => writes.length === 2 && !$('postComment').disabled);
    assert.equal(writes[1].origin, 'https://own-files.example'); assert(writes[1].body.path.startsWith('my-world/comments/'));
    assert.equal(frameWindow.gameFixture.sessionId, 'still-playing');
    for (let i = 0; i < w.localStorage.length; i++) assert(!w.localStorage.getItem(w.localStorage.key(i)).includes(WIF));
    assert(!w.location.href.includes(WIF)); assert.equal(w.sessionStorage.length, 0);
    $('logout').click(); assert.equal(w.zorkmidWorld.getIdentity(), '');
    assert.throws(() => w.zorkmidWorld.signGameSave({ session: {} }), /Sign in/);
    assert.equal($('etchReview').hidden, true);
    // Exercise the WASM SDK in a browser global environment, not only Node's path.
    const nativeBuild = await esbuild.build({ stdin: { contents: "export {prepareEtch} from './world/chisel.ecash.js';export {Script,toHex} from './world/vendor/ecash-sdk-4.14.4.js';", resolveDir: fileURLToPath(root) }, bundle: true, write: false, format: 'iife', globalName: 'nativeFixture', platform: 'browser', target: 'es2020', define: { 'import.meta.url': JSON.stringify('https://johnrigler.github.io/lantern/world/chisel.ecash.js') } });
    w.eval(nativeBuild.outputFiles[0].text);
    const address = 'ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq', native = w.nativeFixture;
    const prepared = native.prepareEtch({ privateKeyHex: '1'.padStart(64, '0'), address, note: 'Browser fixture only', snapshot: { outputScript: native.toHex(native.Script.fromAddress(address).bytecode), utxos: [{ outpoint: { txid: '0123456789abcdef'.repeat(4), outIdx: 0 }, sats: 10000n }] } });
    assert.equal(prepared.network, 'ecash'); assert(BigInt(prepared.changeSats) >= 546n);
    assert.equal(writes.length, 2); // Preparing the transaction made no network request.
  } finally { w.close(); }
});

test('world and game scripts parse and local route references resolve', async () => {
  const html = await readFile(new URL('lantern.html', root), 'utf8');
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(match[1]));
  const world = await readFile(new URL('world.html', root), 'utf8');
  for (const match of world.matchAll(/(?:src|href)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
    if (!/^https?:/.test(match[1]) && match[1] !== './') await readFile(new URL(match[1].endsWith('/') ? match[1] + 'index.html' : match[1], root));
  }
});
