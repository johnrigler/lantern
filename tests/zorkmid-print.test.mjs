// Optional development dependencies: jsdom@26.1.0, esbuild@0.25.10,
// jsqr@1.4.0, and @napi-rs/canvas. No browser automation or server is used.
// Set ZORKMID_TEST_DEPS to a directory with node_modules, and optionally
// ZORKMID_CANVAS_MODULE to an installed @napi-rs/canvas entrypoint.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const require = createRequire(process.env.ZORKMID_TEST_DEPS ? process.env.ZORKMID_TEST_DEPS + '/package.json' : import.meta.url);
let JSDOM, esbuild, jsQR, canvas;
try {
  ({ JSDOM } = require('jsdom')); esbuild = require('esbuild'); jsQR = require('jsqr');
  canvas = process.env.ZORKMID_CANVAS_MODULE ? require(process.env.ZORKMID_CANVAS_MODULE) : require('@napi-rs/canvas');
} catch { /* Unit checks remain runnable without optional artwork dependencies. */ }
const available = !!(JSDOM && esbuild && jsQR && canvas);
const options = { skip: !available };
const ONE_ADDRESS = 'ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq';
const ONE_WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const backing = new WeakMap();
let patchedCanvas = false;

async function environment(page = 'onboard/index.html', href = 'https://johnrigler.github.io/zorkmid/onboard/') {
  const dom = new JSDOM(await readFile(new URL(page, root), 'utf8'), { url: href, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto });
  Object.defineProperty(w, 'isSecureContext', { value: true });
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: false });
  Object.defineProperty(w.navigator, 'clipboard', { value: { async writeText(text) { w.copiedText = text; } } });
  w.HTMLCanvasElement.prototype.getContext = function (type) {
    if (type !== '2d') return null;
    let image = backing.get(this);
    if (!image || image.width !== this.width || image.height !== this.height) {
      image = canvas.createCanvas(this.width, this.height); backing.set(this, image);
    }
    return image.getContext('2d');
  };
  w.HTMLCanvasElement.prototype.toDataURL = function () { this.getContext('2d'); return backing.get(this).toDataURL('image/png'); };
  const ctx = canvas.createCanvas(1, 1).getContext('2d');
  if (!patchedCanvas) {
    const prototype = Object.getPrototypeOf(ctx), draw = prototype.drawImage;
    prototype.drawImage = function (image, ...args) { return draw.call(this, backing.get(image) || image, ...args); };
    patchedCanvas = true;
  }
  w.CanvasRenderingContext2D = ctx.constructor;
  w.fetch = () => { throw new Error('Unexpected network request during identity creation.'); };
  w.eval(await readFile(new URL('onboard/vendor/qrcode.min.js', root), 'utf8'));
  if (page.startsWith('onboard/')) for (const name of ['chisel.js', 'chisel.sign.js']) {
    w.eval(await readFile(new URL('onboard/vendor/' + name, root), 'utf8'));
  }
  return { dom, w, $: id => w.document.getElementById(id) };
}

async function bundle(entry, href, suffix = '') {
  const moduleUrl = new URL('wallet.js', href).href;
  const result = await esbuild.build({ entryPoints: [fileURLToPath(new URL(entry, root))], bundle: true, write: false,
    format: 'iife', platform: 'browser', target: 'es2020', define: { 'import.meta.url': JSON.stringify(moduleUrl) },
    ...(suffix ? { stdin: { contents: suffix, resolveDir: fileURLToPath(root), sourcefile: 'qa-entry.js' }, entryPoints: undefined } : {}),
  });
  return result.outputFiles[0].text;
}

async function settleUntil(predicate) {
  for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('UI did not settle.');
}
function scan(image) {
  const ctx = image.getContext('2d'), data = ctx.getImageData(0, 0, image.width, image.height);
  return jsQR(new Uint8ClampedArray(data.data), image.width, image.height)?.data;
}
function crop(image, x, y, width, height) {
  const result = canvas.createCanvas(width, height);
  result.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height); return result;
}
function decodedRaster(bytes, expectedHeight) {
  const image = canvas.createCanvas(384, expectedHeight), ctx = image.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 384, expectedHeight); ctx.fillStyle = '#000';
  let offset = 15, y = 0;
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0x1d, 0x67, 0x39]);
  while (offset < bytes.length && bytes[offset] === 0x1d && bytes[offset + 1] === 0x76) {
    assert.deepEqual(Array.from(bytes.slice(offset, offset + 4)), [0x1d, 0x76, 0x30, 0]);
    const cols = bytes[offset + 4] + bytes[offset + 5] * 256;
    const rows = bytes[offset + 6] + bytes[offset + 7] * 256; offset += 8;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols * 8; col++) {
      if (bytes[offset + row * cols + (col >> 3)] & (0x80 >> (col & 7))) ctx.fillRect(col, y + row, 1, 1);
    }
    offset += rows * cols; y += rows;
  }
  assert.equal(y, expectedHeight); assert(bytes.subarray(offset).every(value => value === 10));
  return image;
}

test('printed raster retains both decodable QRs; the public panel is independent of WIF', options, async () => {
  const f = await environment();
  const entry = `import {createIdentityArtwork} from './onboard/artwork.js';\nimport {buildIdentityUrl} from './onboard/wallet.js';\nimport {ctp500PreparePrint} from './onboard/printer/ctp500-print.js';\nwindow.qa={createIdentityArtwork,buildIdentityUrl,ctp500PreparePrint};`;
  f.w.eval(await bundle('onboard/artwork.js', f.w.location.href, entry));
  const qa = f.w.qa;
  const publicUrl = qa.buildIdentityUrl(ONE_ADDRESS, { name: 'Sample Wanderer', avatar: '312' }, 'https://johnrigler.github.io/zorkmid/id.html');
  const artwork = qa.createIdentityArtwork({ address: ONE_ADDRESS, wif: ONE_WIF }, { name: 'Sample Wanderer', avatar: '312' }, publicUrl);
  const altered = qa.createIdentityArtwork({ address: ONE_ADDRESS, wif: ONE_WIF.slice(0, -1) + 'x' }, { name: 'Sample Wanderer', avatar: '312' }, publicUrl);
  assert.equal(artwork.publicCard.toDataURL(), altered.publicCard.toDataURL());
  assert.equal(artwork.receipt.width, 384); assert.equal(artwork.receipt.height, 1280);
  const job = qa.ctp500PreparePrint(artwork.receipt, { mode: 'fast' });
  const raster = decodedRaster(job.bytes, 1280);
  const landscape = canvas.createCanvas(1280, 384), ctx = landscape.getContext('2d');
  ctx.translate(0, 384); ctx.rotate(-Math.PI / 2); ctx.drawImage(raster, 0, 0);
  assert.equal(scan(crop(landscape, 208, 80, 224, 224)), ONE_WIF);
  assert.equal(scan(crop(landscape, 840, 72, 240, 240)), publicUrl);
  assert.equal(scan(crop(backing.get(artwork.publicCard), 200, 72, 240, 240)), publicUrl);
  if (process.env.ZORKMID_QA_OUTPUT) {
    await mkdir(process.env.ZORKMID_QA_OUTPUT, { recursive: true });
    await writeFile(process.env.ZORKMID_QA_OUTPUT + '/sample-public-card.png', backing.get(artwork.publicCard).toBuffer('image/png'));
    await writeFile(process.env.ZORKMID_QA_OUTPUT + '/sample-folded-wallet.png', landscape.toBuffer('image/png'));
  }
  console.log('CTP500 sample:', job.bytes.length, 'bytes; 384 × 1280; both QRs decode after raster encoding.');
  f.dom.window.close();
});

test('onboarding creates/restores locally, protects links, and reuses BLE across people', options, async () => {
  const f = await environment('onboard/index.html', 'https://johnrigler.github.io/lantern/onboard/');
  let clock = 0, picks = 0, writes = 0;
  Object.defineProperty(f.w.performance, 'now', { value: () => clock });
  const characteristic = { properties: { write: true, writeWithoutResponse: true },
    async writeValueWithoutResponse(bytes) { assert(bytes.length <= 20); writes++; clock += 30; },
    async writeValueWithResponse() { throw new Error('Fast mode should use available unacknowledged writes.'); },
  };
  const device = new f.w.EventTarget(); device.name = 'Teal Printer';
  device.gatt = { connected: false, async connect() { this.connected = true; return this; },
    async getPrimaryService() { return { getCharacteristic: async () => characteristic }; },
    disconnect() { this.connected = false; device.dispatchEvent(new f.w.Event('gattserverdisconnected')); },
  };
  Object.defineProperty(f.w.navigator, 'bluetooth', { value: { async requestDevice() { picks++; return device; } } });
  f.w.eval(await bundle('onboard/onboard.js', f.w.location.href));
  f.$('displayName').value = 'John'; f.$('createId').click();
  await settleUntil(() => !f.$('createId').disabled && !f.$('identitySection').hidden);
  const firstAddress = f.$('receiveAddress').textContent, firstWif = f.$('recoveryWif').textContent;
  assert.match(firstAddress, /^ecash:q/); assert(firstWif.length >= 51);
  assert.equal(f.w.localStorage.length, 0); assert.equal(f.w.sessionStorage.length, 0);
  const identityLink = f.$('identityLink').href;
  assert(identityLink.startsWith('https://johnrigler.github.io/lantern/id.html?address='));
  assert(!identityLink.includes(firstWif)); assert.equal(f.$('recoveryDetails').open, false);
  f.$('copyId').click(); await settleUntil(() => !f.$('createId').disabled);
  assert.equal(f.w.copiedText, identityLink);
  f.$('idPage').value = 'javascript:alert(1)'; f.$('idPage').dispatchEvent(new f.w.Event('input'));
  assert(f.$('printCard').disabled); assert(!f.$('saveWallet').hasAttribute('href'));
  assert.equal(f.$('recoveryWif').textContent, firstWif);
  f.$('idPage').value = 'https://johnrigler.github.io/zorkmid/id.html'; f.$('idPage').dispatchEvent(new f.w.Event('input'));
  f.$('connectPrinter').click(); await settleUntil(() => !f.$('printCard').disabled);
  assert.equal(picks, 1);
  f.$('printCard').click(); await settleUntil(() => f.$('printStatus').textContent.startsWith('Sent in'));
  assert(writes > 100); assert(f.$('backupKept').checked);
  f.$('createId').click(); await settleUntil(() => !f.$('createId').disabled && f.$('receiveAddress').textContent !== firstAddress);
  assert.equal(picks, 1); assert.equal(f.$('printCard').disabled, false);
  assert.equal(f.$('backupKept').checked, false); assert.equal(f.$('recoveryDetails').open, false);
  f.$('restoreWif').value = ONE_WIF; f.$('restoreId').click();
  await settleUntil(() => !f.$('restoreId').disabled && f.$('receiveAddress').textContent === ONE_ADDRESS);
  assert.equal(f.$('restoreWif').value, ''); assert.equal(f.$('recoveryWif').textContent, ONE_WIF);
  f.dom.window.close();
});

test('public identity renders untrusted names as text, validates addresses, and copies public fields only', options, async () => {
  const href = 'https://johnrigler.github.io/zorkmid/id.html?address=' + encodeURIComponent(ONE_ADDRESS) + '&wif=SHOULD_NOT_BE_SHARED#name=' + encodeURIComponent('<img src=x onerror=x>') + '&avatar=311&private=NO';
  const f = await environment('id.html', href);
  f.w.eval(await bundle('onboard/identity.js', 'https://johnrigler.github.io/zorkmid/onboard/'));
  assert.equal(f.$('identityCard').hidden, false); assert.equal(f.$('identityAddress').textContent, ONE_ADDRESS);
  assert.equal(f.$('identityName').querySelector('img'), null); assert(f.$('identityName').textContent.startsWith('<img'));
  assert(!f.w.location.href.includes('SHOULD_NOT_BE_SHARED')); assert(!f.w.location.href.includes('private=NO'));
  assert.equal(scan(backing.get(f.$('identityQr'))), ONE_ADDRESS);
  f.$('publicCopyLink').click(); await settleUntil(() => f.$('publicStatus').textContent === 'Public ID link copied.');
  assert(!f.w.copiedText.includes('SHOULD_NOT_BE_SHARED')); assert(!f.w.CHISEL);
  f.dom.window.close();
  const invalid = await environment('id.html', 'https://johnrigler.github.io/zorkmid/id.html?address=ecash:broken');
  invalid.w.eval(await bundle('onboard/identity.js', 'https://johnrigler.github.io/zorkmid/onboard/'));
  assert(invalid.$('identityCard').hidden); assert(!invalid.$('addressFormSection').hidden); assert(invalid.$('publicStatus').textContent.length > 0);
  invalid.dom.window.close();
});
