import { createWallet, restoreWallet, publicProfile, shortId, defaultIdPage, buildIdentityUrl } from './wallet.js';
import { drawAvatar, makeQrCanvas, createIdentityArtwork } from './artwork.js';
import { ctp500ConnectPrinter, ctp500PreparePrint, ctp500BeginPrintSession } from './printer/ctp500-print.js';

const $ = id => document.getElementById(id);
const fields = ['displayName', 'avatarKind', 'avatarHat', 'avatarAccent', 'idPage'];
let wallet = null, printer = null, job = null, publicUrl = '', busy = false, printing = false, backedUp = false;
$('idPage').value = defaultIdPage();

function profile() {
  return publicProfile({ name: $('displayName').value, avatar: $('avatarKind').value + $('avatarHat').value + $('avatarAccent').value });
}
function status(id, text = '', bad = false) {
  $(id).textContent = text; $(id).classList.toggle('bad', bad);
}
function controls() {
  document.querySelectorAll('input,select,button').forEach(node => { node.disabled = busy; });
  const connected = !!printer?.connected;
  const ble = !!(globalThis.isSecureContext && navigator.bluetooth);
  const serial = !!(globalThis.isSecureContext && navigator.serial);
  $('connectPrinter').hidden = !ble || connected;
  $('connectSerial').hidden = !serial || connected;
  $('disconnectPrinter').hidden = !connected;
  $('printCard').disabled = busy || !connected || !job;
  $('printCard').textContent = printing ? 'Sending card…' : 'Print ID card';
  $('createId').textContent = wallet ? 'Next person — new ID' : 'Create eCash ID';
  $('backupKept').checked = backedUp;
  if (connected) status('connectionStatus', 'Connected to ' + printer.label + '. Ready for this card and the next person.');
  else if (!ble && !serial) status('connectionStatus', 'Save the card as an image, or open this page in a browser with Bluetooth or Serial support on HTTPS.');
  else status('connectionStatus', ble ? 'Choose Teal Printer. The connection is reused for the next person.' : 'Pair the printer in system Bluetooth settings, then choose Serial.');
}
async function run(action, statusId = 'walletStatus') {
  if (busy) return;
  busy = true; controls();
  try { await action(); }
  catch (error) { status(statusId, error.message || 'The operation failed.', true); }
  finally { busy = false; controls(); }
}
function clearArtwork() {
  job = null; publicUrl = '';
  for (const id of ['savePublic', 'saveWallet', 'identityLink']) { $(id).removeAttribute('href'); }
  $('receiptPreview').removeAttribute('src');
  $('identityLink').textContent = '';
  status('printDetails');
  controls();
}
function refreshCard() {
  const appearance = profile();
  const avatar = $('avatarPreview');
  drawAvatar(avatar.getContext('2d'), 0, 0, avatar.width, appearance.avatar);
  if (!wallet) return;
  clearArtwork();
  $('identitySection').hidden = false;
  $('printSection').hidden = false;
  $('recoveryWif').textContent = wallet.wif;
  $('publicName').textContent = appearance.name || 'WANDERER ' + shortId(wallet.address);
  $('receiveAddress').textContent = wallet.address;
  const receive = $('receiveQr');
  receive.getContext('2d').drawImage(makeQrCanvas(wallet.address, receive.width), 0, 0);
  const link = buildIdentityUrl(wallet.address, appearance, $('idPage').value.trim());
  const artwork = createIdentityArtwork(wallet, appearance, link);
  job = ctp500PreparePrint(artwork.receipt, { mode: $('printMode').value });
  publicUrl = link;
  $('identityLink').href = link; $('identityLink').textContent = link;
  $('receiptPreview').src = job.canvas.toDataURL('image/png');
  $('saveWallet').href = $('receiptPreview').src;
  $('savePublic').href = artwork.publicCard.toDataURL('image/png');
  status('printDetails', '384 × ' + job.canvas.height + ' dots · ' + job.bytes.length.toLocaleString() + ' bytes'
    + (job.mode === 'fast' ? ' · estimated BLE transfer ' + Math.ceil(job.bytes.length / 800) + ' seconds; actual time varies.' : '.'));
  controls();
}
function canReplace() {
  return !wallet || backedUp || window.confirm('This replaces the current recovery key in this tab. Have you printed or saved it?');
}
async function installWallet(next) {
  wallet = next; backedUp = false;
  $('restoreWif').value = '';
  $('recoveryDetails').open = false; $('previewDetails').open = false;
  $('printProgress').hidden = true; $('printProgress').value = 0;
  status('printStatus'); status('copyStatus');
  // Retain access to the recovery key even if an overly long link prevents artwork generation.
  refreshCard();
  status('walletStatus', 'ID created locally. Print or save the recovery key before leaving this tab.');
  $('identitySection').scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

$('createId').addEventListener('click', () => run(async () => {
  if (!canReplace()) return;
  await installWallet(await createWallet());
}));
$('restoreId').addEventListener('click', () => run(async () => {
  if (!canReplace()) return;
  await installWallet(await restoreWallet($('restoreWif').value));
  status('walletStatus', 'eCash ID restored. Compare its address with your backup before funding it.');
}));
for (const id of fields) $(id).addEventListener(id === 'displayName' || id === 'idPage' ? 'input' : 'change', () => {
  if (busy) return;
  try { refreshCard(); status('walletStatus'); }
  catch (error) { status('walletStatus', error.message, true); }
});
$('printMode').addEventListener('change', () => {
  try { refreshCard(); status('printStatus'); }
  catch (error) { status('printStatus', error.message, true); }
});
$('backupKept').addEventListener('change', () => { backedUp = $('backupKept').checked; });
$('saveWallet').addEventListener('click', event => {
  if (!job) { event.preventDefault(); return; }
  backedUp = true; controls();
  status('walletStatus', 'Check that the private wallet image was saved before starting the next person.');
});
$('savePublic').addEventListener('click', event => { if (!job) event.preventDefault(); });

async function copy(text, message) {
  if (!text) throw new Error('Create an ID first.');
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable. Select the displayed text and copy it.');
  await navigator.clipboard.writeText(text);
  status('copyStatus', message);
}
$('copyAddress').addEventListener('click', () => run(() => copy(wallet?.address, 'eCash receiving address copied.'), 'copyStatus'));
$('copyId').addEventListener('click', () => run(() => copy(publicUrl, 'Public ID link copied. It contains no recovery key.'), 'copyStatus'));
$('copyWif').addEventListener('click', () => run(() => copy(wallet?.wif, 'Private WIF copied. Keep it private.'), 'copyStatus'));

async function connect(transport) {
  if (printer) await printer.disconnect();
  printer = null;
  const connection = await ctp500ConnectPrinter({ transport });
  printer = connection;
  connection.device?.addEventListener('gattserverdisconnected', () => {
    if (printer === connection) {
      controls();
      if (!printing) status('printStatus', 'Printer disconnected. Reconnect to print another card.');
    }
  });
  status('printStatus'); controls();
}
$('connectPrinter').addEventListener('click', () => run(() => connect('ble'), 'printStatus'));
$('connectSerial').addEventListener('click', () => run(() => connect('serial'), 'printStatus'));
$('disconnectPrinter').addEventListener('click', () => run(async () => {
  await printer?.disconnect(); printer = null; status('printStatus', 'Printer disconnected.');
}, 'printStatus'));
$('printCard').addEventListener('click', () => run(async () => {
  if (!job || !printer?.connected) throw new Error('Create an ID and connect the printer first.');
  const activeJob = job, activePrinter = printer;
  printing = true; controls();
  const finish = ctp500BeginPrintSession();
  $('printProgress').value = 0; $('printProgress').hidden = false;
  status('printStatus', 'Sending card. Keep this tab open until sending finishes.');
  let lastUpdate = -Infinity;
  try {
    const result = await activePrinter.write(activeJob.bytes, (sent, total) => {
      const now = performance.now();
      if (now - lastUpdate < 350 && sent !== total) return;
      lastUpdate = now;
      $('printProgress').value = sent / total * 100;
      status('printStatus', 'Sending card: ' + Math.round(sent / total * 100) + '%. Keep this tab open.');
    }, { mode: activeJob.mode });
    backedUp = true; $('printProgress').value = 100;
    status('printStatus', 'Sent in ' + (result.elapsedMs / 1000).toFixed(1) + ' seconds. Check the paper, fold the private side, then create the next ID.');
  } catch (error) {
    status('printStatus', 'Transfer stopped after ' + (error.transferStats?.bytes || 0) + ' bytes. Check the paper and reconnect before trying again. ' + error.message, true);
    try { await activePrinter.disconnect(); } catch {}
    if (printer === activePrinter) printer = null;
  } finally { printing = false; await finish(); }
}, 'printStatus'));

window.addEventListener('beforeunload', event => {
  if (wallet && !backedUp) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', () => { Promise.resolve(printer?.disconnect()).catch(() => {}); });
refreshCard(); controls();
