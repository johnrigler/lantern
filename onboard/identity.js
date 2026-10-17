import { normalizeAddress, readIdentityUrl, buildIdentityUrl, shortId } from './wallet.js';
import { drawAvatar, makeQrCanvas } from './artwork.js';

const $ = id => document.getElementById(id);
let identity = null, publicLink = '';
function status(text, bad = false) { $('publicStatus').textContent = text; $('publicStatus').classList.toggle('bad', bad); }
function show(input) {
  const next = readIdentityUrl(input);
  const cleanLink = buildIdentityUrl(next.address, next, new URL('id.html', location.href).href);
  $('identityAddress').textContent = next.address;
  $('identityName').textContent = next.name || 'Wanderer';
  $('identityShort').textContent = 'ID ' + shortId(next.address);
  drawAvatar($('identityAvatar').getContext('2d'), 0, 0, 96, next.avatar);
  const qr = $('identityQr'); qr.getContext('2d').drawImage(makeQrCanvas(next.address, qr.width), 0, 0);
  $('identityCard').hidden = false; $('addressFormSection').hidden = true;
  document.title = (next.name || 'ID ' + shortId(next.address)) + ' · Zorkmid';
  // Discard unrelated query/fragment parameters instead of sharing them onward.
  history.replaceState(null, '', cleanLink);
  identity = next; publicLink = cleanLink;
  const world = new URL('world.html', location.href); world.searchParams.set('address', next.address); world.hash = new URL(cleanLink).hash;
  $('enterWorld').href = world.href; status('');
}
try {
  if (new URL(location.href).searchParams.has('address')) show(location.href);
} catch (error) { status(error.message, true); }
$('addressForm').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const address = normalizeAddress($('addressInput').value);
    show(buildIdentityUrl(address, {}, new URL('id.html', location.href).href));
  } catch (error) { status(error.message, true); }
});
async function copy(text, message) {
  try {
    if (!identity || !navigator.clipboard?.writeText) throw new Error('Select and copy the displayed address; clipboard access is unavailable.');
    await navigator.clipboard.writeText(text); status(message);
  } catch (error) { status(error.message, true); }
}
$('publicCopyAddress').addEventListener('click', () => copy(identity?.address, 'eCash address copied.'));
$('publicCopyLink').addEventListener('click', () => copy(publicLink, 'Public ID link copied.'));
