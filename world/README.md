# Zorkmid world frame

Open [world.html](../world.html) to keep Lantern mounted while moving between the
game, the signed conversation, Chisel's eCash etching tool, and connection settings.
On a wide display, the activity pane stays beside the current workspace. On a
phone, use **Outside** to read and post; the badge counts newly loaded comments.
The page polls while visible every 30 seconds. These are in-page updates; there
is no push subscription or notification delivery after the page closes.

Sign in with the WIF inside a printed Zorkmid ID. WIF/private-key material remains
in tab memory and is never stored in browser storage, a URL, or File Proxy. Public
ID links are watch-only until the corresponding recovery key is entered. Sign
out drops the session reference; JavaScript strings cannot be securely erased.

Comments use the existing `chisel-signed-v1` envelope with type
`zorkmid.comment.v1`. Its payload identifies the world, native eCash address,
compressed-key flag, public name/avatar, text, UTC timestamp, and random nonce.
The reader verifies both the signature and its public-key-to-address mapping.
Names are self-selected; a wallet signature is not a verified human identity.
Public text is rendered using DOM text nodes. Invalid entries are hidden.

**Connections** selects an HTTPS Chisel-compatible File Proxy and a relative
comment directory. Localhost HTTP is allowed for development. The public settings
alone persist under `zorkmid.services.v1`. The default is
`https://rigler.org/fileproxy`, directory `zorkmid/comments`. Transport contract:

- `GET /list?path=directory` → `{ok:true, items:[{name,type,size,modified}]}`
- `GET /load?path=file` → `{ok:true, text:"..."}`
- `POST /save` with `{path, text}` → `{ok:true, ...}`

Signed filenames contain the UTC timestamp and payload digest. Retrying an
unchanged comment reuses the signed file, including after an uncertain save.
The most recent 40 recognized files are loaded with bounded parallelism and
signature caching. Service failures preserve the last loaded conversation.
File Proxy is a public transport, not a ledger or an availability guarantee. Use
a writable compatible endpoint; authenticated `/v1` File Proxy APIs are a
different contract. No write token or signing key is sent to this legacy API.

Lantern saves also use the selected File Proxy. When signed in to the surrounding
world, **Sign & save** signs through a same-origin action bridge without passing a
private key into the iframe or navigating away. Lantern's external Chisel identity
flow remains available when used independently. Game state is still served by
the selected Frotz backend; this frame does not migrate it into IPFS.

## Native eCash notes

The Chisel view loads `chisel.ecash.js` and the official SDK only when requested.
It prepares native XEC `OP_RETURN` notes/IPFS URIs for review before an explicit
mainnet broadcast. It excludes token/coinbase UTXOs, keeps change at the same
address, and rechecks funds before broadcasting. See Chisel's
[ECASH.md](https://github.com/johnrigler/chisel/blob/main/ECASH.md) for the protocol,
fee limits, pinned packages, and rebuild instructions. `vendor/` contains the same
SDK and MIT notice as Chisel. All runtime code is vendored for static hosting.

**Refresh eCash** reads address UTXOs and recent history through the configured
Chronik endpoint, default `https://chronik.e.cash`. It does not poll or spend
automatically. On-chain notes and File Proxy comments are separate actions. This
release does not mint a Zorkmid token, write avatars to the ledger, resolve a
latest-version pointer, or implement cross-chain balances.

## Verification

`node --test tests/zorkmid-wallet.test.mjs tests/zorkmid-comments.test.mjs tests/zorkmid-ecash.test.mjs`
checks keys, signatures, storage/transport boundaries, and fixture transactions.
The optional `zorkmid-world.test.mjs` and `zorkmid-print.test.mjs` use jsdom, esbuild,
jsQR, and a native canvas for DOM flow and one-bit print/QR checks. Their files
describe dependency environment variables. Tests use mock transports and public
fixture keys, never real comment writes or blockchain broadcasts.
