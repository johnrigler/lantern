/* eCash receive/recovery identities, built on Chisel and Bitcoin ABC CashAddr. */
import cashaddr from './vendor/ecashaddrjs-2.0.3.js';

export const NETWORK = 'ecash';
export const DEFAULT_AVATAR = '000';
export const CANONICAL_ID_PAGE = 'https://johnrigler.github.io/zorkmid/id.html';
const ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const { encodeCashAddress, decodeCashAddress, isValidCashAddress } = cashaddr;

function keys() {
  const chisel = globalThis.CHISEL;
  if (!chisel?.hash160Hex || !chisel?.privateKeyHexToPublicKeyHex) {
    throw new Error('Wallet code did not load. Reload this page before creating an ID.');
  }
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
    throw new Error('Secure browser cryptography is unavailable. Open this page on HTTPS or localhost.');
  }
  return chisel;
}

export function validPrivateHex(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hex)) return false;
  const scalar = BigInt('0x' + hex);
  return scalar > 0n && scalar < ORDER;
}

export function normalizeAddress(input) {
  const address = String(input || '').trim();
  if (!/^ecash:/i.test(address) || !isValidCashAddress(address, 'ecash')) {
    throw new Error('Enter a complete eCash mainnet address beginning ecash:.');
  }
  const decoded = decodeCashAddress(address);
  if (decoded.prefix !== 'ecash' || decoded.type !== 'p2pkh' || decoded.hash.length !== 40) {
    throw new Error('This ID page requires an eCash mainnet P2PKH address.');
  }
  return encodeCashAddress('ecash', 'p2pkh', decoded.hash);
}

export function publicProfile(profile = {}) {
  const name = Array.from(String(profile.name || '').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 24).join('');
  const avatar = /^[0-3][0-2][0-3]$/.test(String(profile.avatar)) ? String(profile.avatar) : DEFAULT_AVATAR;
  return { name, avatar };
}

export function shortId(address) {
  return normalizeAddress(address).slice(-8).toUpperCase();
}

export function defaultIdPage(moduleUrl = import.meta.url) {
  const url = new URL('../id.html', moduleUrl);
  return /^https?:$/.test(url.protocol) ? url.href : CANONICAL_ID_PAGE;
}

export function buildIdentityUrl(address, profile = {}, idPage = defaultIdPage()) {
  const url = new URL(idPage);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password) {
    throw new Error('The public ID page must use HTTPS (or localhost for testing).');
  }
  // Rebuild the public fields explicitly. Never copy a wallet object or its URL parameters.
  url.search = ''; url.hash = '';
  url.searchParams.set('address', normalizeAddress(address));
  const appearance = publicProfile(profile);
  const fragment = new URLSearchParams();
  if (appearance.name) fragment.set('name', appearance.name);
  fragment.set('avatar', appearance.avatar);
  url.hash = fragment.toString();
  return url.href;
}

export function readIdentityUrl(input) {
  const url = new URL(input);
  const appearance = new URLSearchParams(url.hash.slice(1));
  return { address: normalizeAddress(url.searchParams.get('address')), ...publicProfile({
    name: appearance.get('name'), avatar: appearance.get('avatar'),
  }) };
}

export async function fromPrivateHex(privateHex, compressed = true) {
  if (!validPrivateHex(privateHex)) throw new Error('Invalid secp256k1 private key.');
  const chisel = keys();
  const hex = privateHex.toLowerCase();
  const publicKey = chisel.privateKeyHexToPublicKeyHex(hex, compressed);
  const hash = await chisel.hash160Hex(publicKey);
  const address = encodeCashAddress('ecash', 'p2pkh', hash);
  const keyBytes = chisel.hexToUint8Array(hex);
  const payload = new Uint8Array(compressed ? 34 : 33);
  payload[0] = 0x80; payload.set(keyBytes, 1);
  if (compressed) payload[33] = 1;
  try {
    const wif = await chisel.base58CheckEncode(payload);
    // The UI needs only these values. Do not retain the scalar or public key in a packet.
    return { address, wif, compressed, network: NETWORK };
  } finally { keyBytes.fill(0); payload.fill(0); }
}

export async function createWallet(randomSource = globalThis.crypto) {
  const chisel = keys();
  if (typeof randomSource?.getRandomValues !== 'function') throw new Error('Secure random generation is unavailable.');
  const bytes = new Uint8Array(32);
  try {
    // Rejection sampling: never reduce a random scalar modulo the curve order.
    for (let attempt = 0; attempt < 128; attempt++) {
      randomSource.getRandomValues(bytes);
      const hex = chisel.bytesToHex(bytes);
      if (validPrivateHex(hex)) return await fromPrivateHex(hex, true);
    }
    throw new Error('Secure random generation failed. No wallet was created.');
  } finally { bytes.fill(0); }
}

export async function restoreWallet(input) {
  const wif = String(input || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{51,52}$/.test(wif)) throw new Error('Enter a valid mainnet WIF recovery key.');
  const chisel = keys();
  const decoded = await chisel.wifToPrivateKey(wif);
  if (decoded.version !== 0x80) throw new Error('This recovery key is not a supported eCash mainnet WIF.');
  if (!validPrivateHex(decoded.privateKeyHex)) throw new Error('Invalid secp256k1 private key.');
  return fromPrivateHex(decoded.privateKeyHex, decoded.compressed);
}
