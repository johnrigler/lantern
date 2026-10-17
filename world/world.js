import { publicProfile, normalizeAddress, buildIdentityUrl, shortId } from '../onboard/wallet.js';
import { drawAvatar } from '../onboard/artwork.js';
import { FileProxy, readSettings, saveSettings } from './file-proxy.js';
import { openIdentity, loadComments, saveComment } from './comments.js';

const $ = id => document.getElementById(id);
let settings = readSettings(), session = null, review = null, view = 'play', pendingComment = null;
let feedSequence = 0, feedBusy = false, known = null, unread = 0, broadcastBusy = false;
const cache = new Map();
const profileParams = new URLSearchParams(location.hash.slice(1));
let appearance = publicProfile({ name: profileParams.get('name'), avatar: profileParams.get('avatar') });
let watching = '';
try { if (new URL(location.href).searchParams.has('address')) watching = normalizeAddress(new URL(location.href).searchParams.get('address')); } catch { /* A public link never authenticates a wallet. */ }

function status(id, text, bad = false) { $(id).textContent = text; $(id).classList.toggle('bad', bad); }
function account() {
  const profile = session?.profile || appearance, address = session?.address || watching;
  $('accountName').textContent = profile.name || 'Wanderer';
  $('accountAddress').textContent = session ? address : address ? 'Public ID · ' + shortId(address) + ' · signed out' : 'Looking around · signed out';
  $('accountAddress').title = address;
  drawAvatar($('accountAvatar').getContext('2d'), 0, 0, 64, profile.avatar, true);
  $('loginOpen').hidden = Boolean(session); $('logout').hidden = !session;
  $('commentHint').textContent = session ? 'Public · signed with your ID' : 'Sign in to post.';
  $('postComment').textContent = session ? 'Sign & post' : 'Sign in';
  try { $('gameFrame').contentWindow.dispatchEvent(new Event('zorkmid-identity-changed')); } catch { /* External signing fallback may be open in the frame. */ }
}
// Same-origin game bridge exposes signing actions, never a recovery key.
window.zorkmidWorld = Object.freeze({
  getIdentity: () => session?.identity || '',
  signGameSave: payload => { if (!session) throw new Error('Sign in to Zorkmid first.'); return session.signGameSave(payload); },
});
function updateUnread() { $('unread').hidden = !unread; $('unread').textContent = String(unread); }
function setView(next) {
  view = next; document.body.dataset.view = next;
  $('playPanel').hidden = next !== 'play'; $('etchPanel').hidden = next !== 'etch'; $('settingsPanel').hidden = next !== 'settings';
  document.querySelectorAll('button[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
  if (next === 'activity') { unread = 0; updateUnread(); }
  // The iframe is mounted once. Hiding a panel does not reset its game session.
}
document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
const server = new URL(location.href).searchParams.get('server');
if (server) { const url = new URL($('gameFrame').src); url.searchParams.set('server', server); $('gameFrame').src = url.href; }

function loginOpen() {
  $('loginName').value = appearance.name; $('loginAvatar').value = appearance.avatar[0];
  status('loginStatus', ''); $('loginDialog').showModal(); $('loginWif').focus();
}
$('loginOpen').addEventListener('click', loginOpen);
$('loginCancel').addEventListener('click', () => $('loginDialog').close());
$('loginDialog').addEventListener('close', () => { $('loginWif').value = ''; });
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); $('loginSubmit').disabled = true; status('loginStatus', 'Checking your recovery key locally…');
  const wif = $('loginWif').value; $('loginWif').value = '';
  try {
    const profile = publicProfile({ name: $('loginName').value, avatar: $('loginAvatar').value + appearance.avatar.slice(1) });
    const next = await openIdentity(wif, profile);
    if (!$('loginDialog').open) { next.signOut(); return; }
    session?.signOut(); session = next; appearance = profile; watching = next.address;
    pendingComment = null; clearReview(); account(); $('loginDialog').close();
    status('etchStatus', 'Signed in. Prepare a note to review its exact fee before broadcasting.');
    status('nativeStatus', 'Ready to look up this public eCash address. Choose Refresh eCash.');
  } catch (error) { status('loginStatus', error.message, true); }
  finally { $('loginSubmit').disabled = false; }
});
$('logout').addEventListener('click', () => {
  session?.signOut(); session = null; pendingComment = null; clearReview(); account();
  $('nativeFeed').replaceChildren(); status('nativeStatus', 'Signed out. Your recovery key is no longer held by this session.');
  status('etchStatus', 'Sign in with your printed recovery key to use Chisel.');
});

function renderComments(comments) {
  const fragment = document.createDocumentFragment();
  if (!comments.length) { const empty = document.createElement('p'); empty.className = 'empty-feed'; empty.textContent = 'A quiet place. Leave the first hello.'; fragment.append(empty); }
  for (const envelope of comments) {
    const p = envelope.payload, article = document.createElement('article'); article.className = 'comment';
    const heading = document.createElement('div'); heading.className = 'comment-header';
    const avatar = document.createElement('canvas'); avatar.width = avatar.height = 76; avatar.setAttribute('aria-hidden', 'true');
    drawAvatar(avatar.getContext('2d'), 0, 0, 76, p.avatar, true);
    const meta = document.createElement('div'), author = document.createElement('a'), time = document.createElement('time');
    author.href = buildIdentityUrl(p.address, p); author.textContent = p.name || 'Wanderer ' + shortId(p.address);
    author.title = 'Verified wallet signature · ' + p.address; time.dateTime = p.createdAt; time.textContent = new Date(p.createdAt).toLocaleString();
    meta.append(author, time); heading.append(avatar, meta);
    const text = document.createElement('p'); text.textContent = p.text;
    const address = document.createElement('div'); address.className = 'comment-address'; address.textContent = '✓ ' + p.address;
    article.append(heading, text, address); fragment.append(article);
  }
  $('commentFeed').replaceChildren(fragment);
}
async function refreshComments(force = false) {
  if (feedBusy && !force) return;
  const sequence = ++feedSequence, current = { ...settings }; feedBusy = true; $('refreshComments').disabled = true;
  status('feedStatus', 'Checking File Proxy…');
  try {
    const result = await loadComments(new FileProxy(current.proxy), current.directory, cache);
    if (sequence !== feedSequence) return;
    const next = new Set(result.comments.map(c => c.proof.digest));
    if (known && view !== 'activity') unread += [...next].filter(digest => !known.has(digest)).length;
    known = next; updateUnread(); renderComments(result.comments);
    const issues = [result.rejected ? result.rejected + ' invalid signatures hidden' : '', result.unavailable ? result.unavailable + ' files unavailable' : ''].filter(Boolean).join(' · ');
    status('feedStatus', (result.comments.length ? 'Connected · ' + result.comments.length + ' verified comments' : 'Connected · no comments yet') + (issues ? ' · ' + issues : ''), Boolean(issues));
  } catch (error) {
    if (sequence !== feedSequence) return;
    status('feedStatus', 'File Proxy unavailable: ' + error.message + ' · Your game stays open.', true);
  } finally { if (sequence === feedSequence) { feedBusy = false; $('refreshComments').disabled = false; } }
}
$('refreshComments').addEventListener('click', () => refreshComments());
$('commentText').addEventListener('input', () => { pendingComment = null; });
$('commentForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!session) { loginOpen(); return; }
  const currentSession = session, current = { ...settings }, text = $('commentText').value.trim();
  $('postComment').disabled = true; status('postStatus', 'Signing locally…');
  try {
    const destination = current.proxy + '/' + current.directory;
    if (!pendingComment || pendingComment.destination !== destination || pendingComment.text !== text) {
      pendingComment = { destination, text, envelope: await currentSession.signComment(text) };
    }
    if (session !== currentSession) throw new Error('Your sign-in changed. Please try again.');
    status('postStatus', 'Saving your signed public comment…');
    await saveComment(new FileProxy(current.proxy), current.directory, pendingComment.envelope);
    if ($('commentText').value.trim() === text) $('commentText').value = '';
    pendingComment = null; status('postStatus', 'Posted to ' + current.proxy + '/' + current.directory + '.');
    await refreshComments(true);
  } catch (error) { status('postStatus', 'Post not confirmed: ' + error.message + ' Retry unchanged text to reuse the same signed file.', true); }
  finally { $('postComment').disabled = false; }
});

function fillSettings() { $('proxyUrl').value = settings.proxy; $('proxyDirectory').value = settings.directory; $('chronikUrl').value = settings.chronik; }
$('settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (broadcastBusy) throw new Error('Wait for the current broadcast result before changing connections.');
    settings = saveSettings({ proxy: $('proxyUrl').value, directory: $('proxyDirectory').value, chronik: $('chronikUrl').value });
    fillSettings(); pendingComment = null; known = null; unread = 0; updateUnread(); clearReview(); $('nativeFeed').replaceChildren();
    $('commentFeed').replaceChildren(); status('settingsStatus', 'Connections saved on this device.');
    window.dispatchEvent(new CustomEvent('zorkmid-connections-changed'));
    refreshComments(true);
  } catch (error) { status('settingsStatus', error.message, true); }
});

function clearReview() { review = null; $('etchReview').hidden = true; $('etchExplorer').hidden = true; $('broadcastEtch').textContent = 'Broadcast on eCash mainnet'; }
function noteCount() { const bytes = new TextEncoder().encode($('etchNote').value.trim()).length; $('noteBytes').textContent = bytes + ' / 180 UTF-8 bytes'; $('noteBytes').style.color = bytes > 180 ? '#ffb5a5' : ''; }
$('etchNote').addEventListener('input', () => { if (!broadcastBusy) clearReview(); noteCount(); });
$('cancelEtch').addEventListener('click', () => { clearReview(); status('etchStatus', 'Reviewed transaction discarded.'); });
$('etchForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!session) { loginOpen(); return; }
  if (broadcastBusy) return;
  const currentSession = session, endpoint = settings.chronik, note = $('etchNote').value.trim();
  $('prepareEtch').disabled = true; clearReview(); status('etchStatus', 'Loading eCash tools and checking native funds…');
  try {
    const { chronikClient, formatXec } = await import('./chisel.ecash.js');
    const snapshot = await chronikClient(endpoint).address(currentSession.address).utxos();
    const prepared = await currentSession.prepareEtch(note, snapshot);
    if (session !== currentSession || endpoint !== settings.chronik || $('etchNote').value.trim() !== note) throw new Error('The account, note, or connection changed. Prepare again.');
    review = { prepared, endpoint };
    $('reviewNote').textContent = prepared.note; $('reviewAddress').textContent = prepared.address; $('reviewTxid').textContent = prepared.txid;
    $('reviewFee').textContent = formatXec(prepared.feeSats) + ' XEC'; $('reviewChange').textContent = formatXec(prepared.changeSats) + ' XEC';
    $('etchReview').hidden = false; status('etchStatus', 'Signed locally. Review the public text, address, and fee below.');
  } catch (error) { status('etchStatus', error.message, true); }
  finally { $('prepareEtch').disabled = false; }
});
$('broadcastEtch').addEventListener('click', async () => {
  if (!session || !review || broadcastBusy) return;
  const current = review; broadcastBusy = true;
  $('broadcastEtch').disabled = $('cancelEtch').disabled = $('prepareEtch').disabled = $('etchNote').disabled = true;
  status('etchStatus', 'Rechecking funds and broadcasting the reviewed transaction…');
  $('etchExplorer').href = 'https://explorer.e.cash/tx/' + current.prepared.txid; $('etchExplorer').hidden = false;
  try {
    const { chronikClient, broadcastEtch } = await import('./chisel.ecash.js');
    await broadcastEtch(chronikClient(current.endpoint), current.prepared);
    review = null; $('etchReview').hidden = true;
    status('etchStatus', 'Broadcast accepted. It is awaiting network confirmation. Transaction: ' + current.prepared.txid);
    refreshNative();
  } catch (error) {
    status('etchStatus', 'Broadcast not confirmed: ' + error.message + ' Check the transaction link before retrying. A retry sends these same bytes.', true);
    $('broadcastEtch').textContent = 'Retry this same transaction';
  } finally {
    broadcastBusy = false; $('broadcastEtch').disabled = $('cancelEtch').disabled = $('prepareEtch').disabled = $('etchNote').disabled = false;
  }
});
async function refreshNative() {
  if (!session) { loginOpen(); return; }
  const current = session, endpoint = settings.chronik;
  $('refreshNative').disabled = true; status('nativeStatus', 'Reading this address from eCash…');
  try {
    const { chronikClient, nativeActivity, formatXec } = await import('./chisel.ecash.js');
    const result = await nativeActivity(chronikClient(endpoint), current.address);
    if (current !== session || endpoint !== settings.chronik) return;
    status('nativeStatus', formatXec(result.spendableSats) + ' XEC in non-token, non-coinbase funds.');
    const fragment = document.createDocumentFragment();
    result.txs.forEach(tx => {
      const item = document.createElement('div'); item.className = 'native-item';
      const link = document.createElement('a'); link.href = 'https://explorer.e.cash/tx/' + tx.txid; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = tx.txid;
      const info = document.createElement('span'); info.textContent = (tx.confirmed ? 'Confirmed' : 'Awaiting confirmation') + (tx.timestamp ? ' · ' + new Date(tx.timestamp * 1000).toLocaleString() : '');
      item.append(link, info); fragment.append(item);
    }); $('nativeFeed').replaceChildren(fragment);
  } catch (error) { if (current === session) status('nativeStatus', 'eCash unavailable: ' + error.message, true); }
  finally { $('refreshNative').disabled = false; }
}
$('refreshNative').addEventListener('click', refreshNative);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshComments(); });
setInterval(() => { if (!document.hidden) refreshComments(); }, 30000);
fillSettings(); account(); noteCount();
if (['play', 'activity', 'etch', 'settings'].includes(profileParams.get('view'))) setView(profileParams.get('view'));
refreshComments();
