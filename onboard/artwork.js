/* Pixel-aligned QR codes, profile avatars, and a folded CTP500 wallet. */
import { publicProfile, shortId } from './wallet.js';

export const ACCENTS = ['#e6b45d', '#8ed1a2', '#85bfee', '#c0a2e8'];
let symbolPromise;
export function loadZorkmidSymbol() {
  if (!symbolPromise) symbolPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      symbolPromise = null;
      reject(new Error('The Zorkmid print symbol did not load. Reload the page and try again.'));
    };
    image.src = new URL('../assets/zorkmid-symbol.webp', import.meta.url).href;
  });
  return symbolPromise;
}
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

// Draw curves at the output resolution: thermal artwork is not a scaled pixel sprite.
export function drawAvatar(ctx, x, y, size, avatar = '000', monochrome = false) {
  const [kind, hat, mark] = Array.from(publicProfile({ avatar }).avatar, Number);
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 128, size / 128);
  ctx.fillStyle = monochrome ? '#fff' : '#f4f0df'; ctx.fillRect(0, 0, 128, 128);
  const paper = ctx.fillStyle; ctx.strokeStyle = '#000'; ctx.fillStyle = '#000';
  ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (draw, fill = false) => { ctx.beginPath(); draw(); if (fill) ctx.fill(); else ctx.stroke(); };
  const line = (x1, y1, x2, y2) => path(() => { ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); });
  const oval = (cx,cy,rx,ry,fill=false) => path(() => ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2),fill);
  // A thin seal leaves the interior open so fine detail survives the printer's threshold.
  ctx.lineWidth = 1.8; path(() => ctx.arc(64,61,55,Math.PI*.72,Math.PI*2.28)); ctx.lineWidth = 2.6;
  if (kind === 3) {
    path(() => { ctx.moveTo(29,96); ctx.bezierCurveTo(38,79,32,64,48,50); ctx.bezierCurveTo(46,29,68,20,82,33); ctx.quadraticCurveTo(92,38,90,49); ctx.lineTo(108,54); ctx.lineTo(89,60); ctx.bezierCurveTo(85,83,78,98,57,102); ctx.lineTo(23,111); ctx.lineTo(36,97); });
    path(() => { ctx.moveTo(48,55); ctx.bezierCurveTo(33,86,45,102,71,91); ctx.bezierCurveTo(84,82,80,68,69,65); });
    ctx.lineWidth=1.8;
    for(let i=0;i<4;i++) path(() => { ctx.moveTo(50+i*6,67+i); ctx.quadraticCurveTo(42+i*6,83,48+i*5,91); });
    path(() => { ctx.moveTo(58,53); ctx.quadraticCurveTo(67,57,77,56); });
    line(52,103,49,116); line(68,101,70,115); line(44,117,55,117); line(65,116,77,116);
    ctx.lineWidth=2.6; oval(77,43,3,3,true); line(92,53,100,54);
  } else {
    // Shoulders, lapels, and a face use the full print head resolution.
    path(() => { ctx.moveTo(22,113); ctx.bezierCurveTo(24,89,37,85,51,83); ctx.lineTo(64,94); ctx.lineTo(77,83); ctx.bezierCurveTo(95,85,104,94,106,113); });
    path(() => { ctx.moveTo(40,113); ctx.lineTo(43,94); ctx.lineTo(55,105); ctx.lineTo(64,95); ctx.lineTo(74,106); ctx.lineTo(84,94); ctx.lineTo(88,113); });
    if(kind===2) {
      path(() => { ctx.moveTo(45,34); ctx.lineTo(82,34); ctx.quadraticCurveTo(89,34,89,43); ctx.lineTo(89,70); ctx.quadraticCurveTo(89,80,80,80); ctx.lineTo(47,80); ctx.quadraticCurveTo(38,80,38,70); ctx.lineTo(38,43); ctx.quadraticCurveTo(38,34,45,34); });
      line(64,33,64,24); oval(64,21,3,3); line(32,49,32,67); line(95,49,95,67);
      oval(52,53,5,6); oval(75,53,5,6); line(52,71,76,71);
      for(let i=0;i<4;i++) line(56+i*5,68,56+i*5,74);
      line(54,81,54,86); line(74,81,74,86);
    } else {
      oval(64,56,23,29);
      path(() => { ctx.moveTo(42,51); ctx.quadraticCurveTo(45,29,61,30); ctx.quadraticCurveTo(76,42,86,45); });
      path(() => { ctx.moveTo(48,51); ctx.quadraticCurveTo(52,48,57,51); ctx.moveTo(71,51); ctx.quadraticCurveTo(76,48,80,51); });
      oval(53,56,1.8,2.7,true); oval(76,56,1.8,2.7,true);
      path(() => { ctx.moveTo(64,57); ctx.lineTo(61,66); ctx.lineTo(66,66); });
      path(() => { ctx.moveTo(56,73); ctx.quadraticCurveTo(64,78,72,73); });
      if(kind===1) {
        ctx.fillStyle=paper; path(() => { ctx.moveTo(32,42); ctx.lineTo(63,7); ctx.lineTo(83,39); ctx.quadraticCurveTo(67,49,32,42); },true); ctx.fillStyle='#000';
        path(() => { ctx.moveTo(32,42); ctx.lineTo(63,7); ctx.lineTo(83,39); ctx.quadraticCurveTo(67,49,32,42); });
        path(() => { ctx.moveTo(48,79); ctx.lineTo(62,96); ctx.lineTo(79,79); });
        ctx.lineWidth=1.5; line(62,18,62,27); line(58,23,66,23); ctx.lineWidth=2.6;
      }
    }
  }
  if (hat === 1) {
    ctx.fillStyle=paper; path(() => { ctx.moveTo(37,37); ctx.quadraticCurveTo(56,9,82,29); ctx.lineTo(92,38); ctx.closePath(); },true); ctx.fillStyle='#000';
    path(() => { ctx.moveTo(37,37); ctx.quadraticCurveTo(56,9,82,29); ctx.lineTo(96,39); ctx.quadraticCurveTo(65,48,35,39); });
    path(() => { ctx.moveTo(57,25); ctx.quadraticCurveTo(57,31,59,36); });
  } else if (hat === 2) {
    path(() => { ctx.moveTo(34,81); ctx.bezierCurveTo(24,38,36,16,64,15); ctx.bezierCurveTo(92,17,102,42,94,81); ctx.lineTo(84,87); });
    path(() => { ctx.moveTo(40,79); ctx.quadraticCurveTo(31,43,49,29); ctx.moveTo(79,28); ctx.quadraticCurveTo(96,48,86,77); });
  }
  // The third digit is a monochrome mark, so every option prints distinctly.
  ctx.fillStyle=paper; oval(103,105,15,15,true); ctx.fillStyle='#000'; ctx.lineWidth=1.8; oval(103,105,13,13);
  if(mark===0) { oval(103,105,4,4); for(let i=0;i<8;i++){const a=i*Math.PI/4;line(103+Math.cos(a)*7,105+Math.sin(a)*7,103+Math.cos(a)*10,105+Math.sin(a)*10);} }
  else if(mark===1) { path(() => { ctx.arc(103,105,8,-Math.PI/2,Math.PI/2); ctx.quadraticCurveTo(96,105,103,97); },true); }
  else if(mark===2) { path(() => { for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?4:9;const px=103+Math.cos(a)*r,py=105+Math.sin(a)*r;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);} ctx.closePath(); }); }
  else { path(() => { ctx.moveTo(103,95); ctx.lineTo(108,110); ctx.lineTo(103,107); ctx.lineTo(98,110); ctx.closePath(); }); line(103,107,103,115); }
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
  createCanvas = browserCanvas, makeQr = makeQrCanvas, zorkmidSymbol,
} = {}) {
  if (!wallet?.wif || !wallet?.address) throw new Error('Create an eCash ID first.');
  if (!zorkmidSymbol) throw new Error('Load the Zorkmid print symbol before creating the card.');
  const appearance = publicProfile(profile), name = appearance.name || 'WANDERER ' + shortId(wallet.address);
  const publicCard = createCanvas(640, 384), pub = publicCard.getContext('2d');
  pub.fillStyle = '#fff'; pub.fillRect(0, 0, 640, 384); pub.fillStyle = '#000';
  pub.textAlign = 'center'; pub.textBaseline = 'top'; pub.imageSmoothingEnabled = false;
  pub.font = 'bold 28px sans-serif'; pub.fillText('ZORKMID // YOUR ID', 320, 12);
  fitText(pub, name, 320, 49, 19, 592, true);
  pub.drawImage(makeQr(identityUrl, 240, createCanvas), 200, 72);
  // The emblem follows the card's rotation; profile avatars remain on screen.
  pub.save(); pub.imageSmoothingEnabled = true; pub.imageSmoothingQuality = 'high';
  pub.drawImage(zorkmidSymbol, 42, 125, 112, 112); pub.restore();
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
