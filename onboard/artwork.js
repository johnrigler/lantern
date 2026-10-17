/* Pixel-aligned QR codes, small code-drawn avatars, and a folded CTP500 wallet. */
import { publicProfile, shortId } from './wallet.js';

export const ACCENTS = ['#e6b45d', '#8ed1a2', '#85bfee', '#c0a2e8'];
export function browserCanvas(width, height) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas;
}

export function makeQrCanvas(text, size = 240, createCanvas = browserCanvas) {
  if (!globalThis.QRCode) throw new Error('QR code library did not load. Reload the page.');
  const holder = document.createElement('div');
  const qr = new QRCode(holder, { text: String(text), width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
  const matrix = qr._oQRCode, count = matrix.getModuleCount();
  const dots = Math.floor(size / (count + 8));
  if (dots < 3) throw new Error('The identity link is too long to print reliably. Shorten the public name or ID page URL.');
  const canvas = createCanvas(size, size), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#000';
  const origin = Math.floor((size - count * dots) / 2);
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
    if (matrix.isDark(row, col)) ctx.fillRect(origin + col * dots, origin + row * dots, dots, dots);
  }
  return canvas;
}

export function drawAvatar(ctx, x, y, size, avatar = '000', monochrome = false) {
  const code = publicProfile({ avatar }).avatar;
  const [kind, hat, accent] = Array.from(code, Number);
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 16, size / 16); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = monochrome ? '#fff' : '#172322'; ctx.fillRect(0, 0, 16, 16);
  const ink = monochrome ? '#000' : ACCENTS[accent];
  ctx.fillStyle = ink;
  // Explorer, mage, robot, or raven. Each appearance is represented by three public digits.
  if (kind === 3) {
    ctx.fillRect(5, 3, 7, 7); ctx.fillRect(11, 6, 4, 2); ctx.fillRect(3, 9, 8, 5);
    ctx.fillRect(1, 11, 3, 2); ctx.fillRect(5, 14, 1, 2); ctx.fillRect(9, 14, 1, 2);
  } else {
    ctx.fillRect(4, 4, 8, 7); ctx.fillRect(3, 11, 10, 4); ctx.fillRect(2, 12, 1, 3); ctx.fillRect(13, 12, 1, 3);
    if (kind === 1) { ctx.fillRect(6, 0, 4, 2); ctx.fillRect(5, 2, 6, 2); ctx.fillRect(2, 4, 12, 1); }
    if (kind === 2) { ctx.fillRect(2, 5, 2, 4); ctx.fillRect(12, 5, 2, 4); ctx.fillRect(7, 1, 2, 3); }
  }
  if (hat === 1) { ctx.fillRect(3, 2, 9, 2); ctx.fillRect(2, 4, 12, 1); }
  if (hat === 2) { ctx.fillRect(3, 2, 2, 9); ctx.fillRect(11, 2, 2, 9); ctx.fillRect(4, 1, 8, 2); }
  ctx.fillStyle = monochrome ? '#fff' : '#14201e';
  if (kind === 3) ctx.fillRect(9, 5, 1, 1);
  else { ctx.fillRect(6, 6, 1, 2); ctx.fillRect(9, 6, 1, 2); ctx.fillRect(7, 9, 2, 1); }
  ctx.restore();
}

function fitText(ctx, text, x, y, startSize, maxWidth, bold = false) {
  let size = startSize;
  do { ctx.font = (bold ? 'bold ' : '') + size + 'px monospace'; }
  while (ctx.measureText(text).width > maxWidth && --size >= 13);
  if (ctx.measureText(text).width > maxWidth) throw new Error('Text does not fit on this receipt. Shorten the name or public ID URL.');
  ctx.fillText(text, x, y);
}

export function createIdentityArtwork(wallet, profile, identityUrl, {
  createCanvas = browserCanvas, makeQr = makeQrCanvas,
} = {}) {
  if (!wallet?.wif || !wallet?.address) throw new Error('Create an eCash ID first.');
  const appearance = publicProfile(profile), name = appearance.name || 'WANDERER ' + shortId(wallet.address);
  const publicCard = createCanvas(640, 384), pub = publicCard.getContext('2d');
  pub.fillStyle = '#fff'; pub.fillRect(0, 0, 640, 384); pub.fillStyle = '#000';
  pub.textAlign = 'center'; pub.textBaseline = 'top'; pub.imageSmoothingEnabled = false;
  pub.font = 'bold 28px sans-serif'; pub.fillText('ZORKMID // YOUR ID', 320, 12);
  fitText(pub, name, 320, 49, 19, 592, true);
  pub.drawImage(makeQr(identityUrl, 240, createCanvas), 200, 72);
  drawAvatar(pub, 60, 135, 80, appearance.avatar, true);
  pub.font = 'bold 15px sans-serif'; pub.fillText('OPEN YOUR ID / RECEIVE XEC', 320, 307);
  fitText(pub, wallet.address, 320, 331, 19, 596);
  const url = new URL(identityUrl);
  fitText(pub, url.host + url.pathname, 320, 360, 14, 592);

  const landscape = createCanvas(1280, 384), ctx = landscape.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1280, 384); ctx.fillStyle = '#000';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.imageSmoothingEnabled = false;
  ctx.font = 'bold 26px sans-serif'; ctx.fillText('PRIVATE RECOVERY KEY', 320, 12);
  ctx.font = '18px sans-serif'; ctx.fillText('ZORKMID / eCash (XEC) / mainnet', 320, 49);
  ctx.drawImage(makeQr(wallet.wif, 224, createCanvas), 208, 80);
  fitText(ctx, wallet.wif, 320, 323, 21, 592);
  ctx.font = 'bold 15px sans-serif'; ctx.fillText('KEEP FOLDED / DO NOT SHARE', 320, 361);
  ctx.drawImage(publicCard, 640, 0);
  ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(640, 0); ctx.lineTo(640, 384); ctx.stroke(); ctx.setLineDash([]);
  ctx.save(); ctx.translate(640, 192); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(-65, -11, 130, 22); ctx.fillStyle = '#000'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px sans-serif'; ctx.fillText('FOLD HERE', 0, 0); ctx.restore();

  const receipt = createCanvas(384, 1280), output = receipt.getContext('2d');
  output.imageSmoothingEnabled = false; output.translate(384, 0); output.rotate(Math.PI / 2); output.drawImage(landscape, 0, 0);
  return { receipt, publicCard };
}
