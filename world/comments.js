import cashaddr from '../onboard/vendor/ecashaddrjs-2.0.3.js';
import { restoreWallet, normalizeAddress, publicProfile } from '../onboard/wallet.js';
import { safePath } from './file-proxy.js';

export const COMMENT_TYPE = 'zorkmid.comment.v1';
const MAX_TEXT = 1000;
function commentText(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value)) throw new Error('Write a comment of 1–1000 characters.');
  return value;
}
export async function openIdentity(wif, profile = {}) {
  const { address, compressed } = await restoreWallet(wif), appearance = publicProfile(profile);
  let { privateKeyHex } = await CHISEL.wifToPrivateKey(wif.trim());
  const identity = CHISEL.identityFromPrivateKey(privateKeyHex);
  return Object.freeze({ address, identity, profile: appearance,
    async signComment(text) {
      if (!privateKeyHex) throw new Error('Sign in again before posting.');
      const nonce = crypto.getRandomValues(new Uint8Array(16));
      return CHISEL.signArtifact({ privateKeyHex, type: COMMENT_TYPE, payload: {
        world: 'zorkmid', network: 'ecash', address, compressed,
        ...appearance, text: commentText(text).trim(), createdAt: new Date().toISOString(), nonce: CHISEL.bytesToHex(nonce),
      } });
    },
    async prepareEtch(note, snapshot) {
      if (!privateKeyHex) throw new Error('Sign in again before preparing a transaction.');
      const { prepareEtch } = await import('./chisel.ecash.js');
      if (!privateKeyHex) throw new Error('Sign in again before preparing a transaction.');
      return prepareEtch({ privateKeyHex, compressed, address, note, snapshot });
    },
    async signGameSave(payload) {
      if (!privateKeyHex) throw new Error('Sign in again before saving.');
      if (!payload?.session || JSON.stringify(payload).length > 500000) throw new Error('Invalid or oversized game save.');
      return CHISEL.signArtifact({ privateKeyHex, type: 'lantern-save', payload });
    },
    signOut() { privateKeyHex = ''; },
  });
}
export async function verifyComment(envelope) {
  try {
    const p = envelope.payload;
    if (envelope.format !== 'chisel-signed-v1' || envelope.type !== COMMENT_TYPE || p.world !== 'zorkmid' || p.network !== 'ecash' ||
        typeof p.compressed !== 'boolean' || normalizeAddress(p.address) !== p.address || commentText(p.text) !== p.text ||
        !/^[a-f0-9]{32}$/.test(p.nonce) || !Number.isFinite(Date.parse(p.createdAt)) || new Date(p.createdAt).toISOString() !== p.createdAt) return false;
    const appearance = publicProfile(p);
    if (appearance.name !== p.name || appearance.avatar !== p.avatar || !(await CHISEL.verifyArtifact(envelope))) return false;
    const compressedKey = envelope.identity.slice('chisel:v1:'.length);
    const key = p.compressed ? compressedKey : new elliptic.ec('secp256k1').keyFromPublic(compressedKey, 'hex').getPublic(false, 'hex');
    const address = cashaddr.encodeCashAddress('ecash', 'p2pkh', await CHISEL.hash160Hex(key));
    return address === p.address;
  } catch { return false; }
}
export function commentPath(directory, envelope) {
  if (!/^[a-f0-9]{64}$/.test(envelope?.proof?.digest) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(envelope?.payload?.createdAt)) throw new Error('Invalid signed comment.');
  return safePath(directory) + '/' + envelope.payload.createdAt.replace(/\D/g, '') + '-' + envelope.proof.digest + '.comment.json';
}
export async function saveComment(proxy, directory, envelope) {
  if (!(await verifyComment(envelope))) throw new Error('The comment failed signature verification.');
  return proxy.save(commentPath(directory, envelope), JSON.stringify(envelope));
}
export async function loadComments(proxy, directory, cache = new Map()) {
  const items = (await proxy.list(directory)).filter(item => item.type === 'file' && /^\d{17}-[a-f0-9]{64}\.comment\.json$/.test(item.name) && (!item.size || item.size <= 32000))
    .sort((a, b) => b.name.localeCompare(a.name)).slice(0, 40);
  let rejected = 0, unavailable = 0, cursor = 0;
  const comments = [];
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++], path = safePath(directory) + '/' + item.name;
      const key = proxy.url + '/' + path, version = String(item.modified) + ':' + String(item.size);
      try {
        const cached = cache.get(key);
        const envelope = cached?.version === version ? cached.envelope : JSON.parse(await proxy.load(path));
        if ((!cached || cached.version !== version) && !(await verifyComment(envelope))) { rejected++; continue; }
        if (commentPath(directory, envelope) !== path) { rejected++; continue; }
        cache.set(key, { version, envelope }); comments.push(envelope);
      } catch { unavailable++; }
    }
  }));
  if (cache.size > 200) { const keep = new Set(items.map(i => proxy.url + '/' + safePath(directory) + '/' + i.name)); for (const key of cache.keys()) if (!keep.has(key)) cache.delete(key); }
  return { comments: comments.sort((a, b) => b.payload.createdAt.localeCompare(a.payload.createdAt)), rejected, unavailable };
}
