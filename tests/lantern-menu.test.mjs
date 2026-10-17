import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(process.env.ZORKMID_TEST_DEPS ? process.env.ZORKMID_TEST_DEPS + '/package.json' : import.meta.url);
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { /* Optional DOM tests. */ }
const root = new URL('../', import.meta.url);
const homepage = await readFile(new URL('index.html', root), 'utf8');
const client = await readFile(new URL('lantern.html', root), 'utf8');
async function until(predicate) {
  for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('Game client did not settle.');
}
function environment(search = '', fail = false) {
  const dom = new JSDOM(client, { url: 'https://johnrigler.github.io/lantern/lantern.html' + search, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, requests = [];
  w.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    requests.push({ path, options });
    if (path.endsWith('/health')) return { ok: true, json: async () => ({ games: { zork1: { present: true }, zork2: { present: true }, zork3: { present: true } } }) };
    assert(path.endsWith('/api/session'));
    if (fail) return { ok: false, status: 503, json: async () => ({ error: 'Fixture server unavailable' }) };
    const game = JSON.parse(options.body).game;
    return { ok: true, json: async () => ({ session: { id: 'fixture-' + game }, result: { stdout: 'Playing ' + game, moves: [], status: { location: game, score: 0, moves: 0 } } }) };
  };
  for (const [, script] of client.matchAll(/<script>([\s\S]*?)<\/script>/g)) w.eval(script);
  return { dom, w, requests, $: id => w.document.getElementById(id) };
}

test('homepage exposes every configured Zork game without a demonstration or an account gate', { skip: !JSDOM }, () => {
  const dom = new JSDOM(homepage, { url: 'https://johnrigler.github.io/lantern/' });
  const links = [...dom.window.document.querySelectorAll('.game-card')];
  assert.equal(links.length, 3);
  assert.deepEqual(links.map(link => new URL(link.href).searchParams.get('game')), ['zork1', 'zork2', 'zork3']);
  assert(links.every(link => new URL(link.href).searchParams.get('start') === '1'));
  assert.equal(dom.window.document.querySelector('#previewTranscript'), null);
  assert.equal(dom.window.document.querySelector('script'), null);
  assert(links.every(link => link.querySelector('strong').textContent && link.querySelector('.game-tagline').textContent));
  dom.window.close();
});

for (const game of ['zork1', 'zork2', 'zork3']) test('a direct ' + game + ' choice creates that real session once', { skip: !JSDOM }, async () => {
  const f = environment('?game=' + game + '&start=1');
  try {
    await until(() => f.w.document.body.classList.contains('playing'));
    const sessions = f.requests.filter(request => request.path.endsWith('/api/session'));
    assert.equal(sessions.length, 1);
    assert.equal(JSON.parse(sessions[0].options.body).game, game);
    assert.equal(f.$('screen').textContent, 'Playing ' + game);
    assert.equal(f.$('command').disabled, false);
  } finally { f.dom.window.close(); }
});

test('unsupported deep links stay at the visible chooser; clicking a game uses that choice', { skip: !JSDOM }, async () => {
  const f = environment('?game=unknown&start=1');
  try {
    await until(() => f.$('status').textContent.includes('Start a game'));
    assert.equal(f.requests.filter(request => request.path.endsWith('/api/session')).length, 0);
    assert.equal(f.w.document.querySelectorAll('button[data-game]').length, 3);
    f.w.document.querySelector('[data-game="zork2"]').click();
    await until(() => f.w.document.body.classList.contains('playing'));
    assert.equal(f.$('screen').textContent, 'Playing zork2');
    f.$('chooseGame').click();
    assert.equal(f.w.document.body.classList.contains('playing'), false);
  } finally { f.dom.window.close(); }
});

test('a failed launch leaves the game options available and reports the actual error', { skip: !JSDOM }, async () => {
  const f = environment('?game=zork3&start=1', true);
  try {
    await until(() => f.$('status').textContent.includes('Could not start game'));
    assert.match(f.$('status').textContent, /Fixture server unavailable/);
    assert.equal(f.w.document.body.classList.contains('playing'), false);
    assert([...f.w.document.querySelectorAll('button[data-game]')].every(button => !button.disabled));
  } finally { f.dom.window.close(); }
});
