# Zorkmid eCash ID / CTP500 onboarding

Open [`onboard/`](index.html) to create an eCash (XEC / Bitcoin ABC) mainnet
receiving identity, choose a detailed monochrome avatar, and print a folded card. The public
identity page is [`../id.html`](../id.html).

1. Choose an optional public name and avatar, then **Create eCash ID**. A new
   compressed secp256k1 key is generated using browser `crypto.getRandomValues`.
   **Restore an existing eCash WIF** also accepts valid compressed or
   uncompressed mainnet WIFs and preserves the corresponding receiving address.
2. Fund the displayed `ecash:` address with native **XEC**. This is not a Zorkmid
   token mint or a token sale. The page creates and restores receive/recovery
   wallets. Open **Enter Zorkmid** from the public ID page to use Chisel’s separate
   review-and-broadcast eCash note tool.
3. Connect **Teal Printer** over Bluetooth (or Serial on a compatible desktop).
   Close InstaPrint and other printer connections first.
4. **Print ID card**, keep the page open while transmitting, and check the paper.
   Fold the private half behind the public ID. The connection is reused for the
   next person.

## What gets printed

- **Private fold:** mainnet WIF QR and text, clearly labelled eCash/XEC.
- **Public fold:** a Zorkmid public ID URL QR, Zorkmid emblem, receiving address, and
  project host/path. Opening the ID URL displays a wallet-scannable receiving QR.
- **Save public card** exports only the public panel. **Save folded wallet
  (private)** exports the whole receipt, including its recovery key.

The public fold uses the original stone Z emblem, optimized in
`../assets/zorkmid-symbol.webp` and rendered at 240 dots wide, the same size as
the public QR code beside it. It rotates with
the whole card so it is upright on the folded ID. Personal avatars still appear
in the on-screen profile and public ID page. QR modules retain integer pixel
edges and their existing sizes and quiet zones.

The artwork uses the same 384 × 1280 dot sideways/folded layout as Chisel's
current key printer. Printer modules are copied unchanged from Chisel's
`print4` / `ble3` baseline; fast mode uses short raster bands, 20-byte packets,
and the verified 25 ms minimum write-start interval when unacknowledged writes
are available. No automatic retry is attempted after a partial transfer.
Wake lock and a leave prompt help keep an active tab available; they do not
provide background printing after the tab closes.

## Public identity links and the repo rename

The public page is `id.html?address=ecash%3A…#avatar=000`, with an optional
`name` in the fragment. Its builder explicitly selects public fields; it never
serializes a wallet object. The public page does not load Chisel's key/signing
code. Avatar codes represent character, headwear, and a monochrome mark (sun, moon, star, compass). Appearance in a
link is not a signed profile or proof of identity control.

All application resources and navigation are relative. When opened on GitHub
Pages, the default public ID URL uses the current project path. This keeps
cards reachable while the old `/lantern/` host is still active and automatically
uses `/zorkmid/` when opened at the renamed site. **Printer settings and public
link** allows an explicit HTTPS identity-page URL. The source link always points
to `https://github.com/johnrigler/zorkmid`.

From a local `file:` copy, the proposed canonical default is
`https://johnrigler.github.io/zorkmid/id.html`. From an IPFS HTTPS gateway, links
stay inside that deployment's CID. No GitHub CDN or other runtime dependency is
required for key creation, validation, artwork, or printing.

## Key handling

Keys remain only in the page's memory and generated private image. There is no
localStorage, sessionStorage, analytics, server key submission, or automatic
funding. The WIF is revealed only in an explicit private section or the full
print preview. Preserve it before navigating away. JavaScript garbage
collection does not offer guaranteed erasure of strings or downloaded images.

WIF's `0x80` prefix is shared by several chains and does not uniquely identify
eCash. This tool explicitly selects eCash mainnet, validates the scalar and
checksum, and derives `ecash:` P2PKH addresses using Bitcoin ABC's CashAddr
implementation. Do not infer interchangeable balances from a key that can also
derive addresses on other chains. Recovery software must support eCash mainnet
and WIF import/sweep; a mnemonic-only import screen is a different format.

## Dependencies and verification

- Chisel `chisel.js`, `chisel.sign.js`, QRCode.js, and printer modules are copied
  from `johnrigler/chisel` commit
  `79c541da82c9590240ac4bfb1c44fa09444acffc`.
- CashAddr: official `ecashaddrjs@2.0.3`, bundled for a browser with
  `esbuild@0.25.10`; MIT licence in `licenses/`.
- Third-party licences and source provenance: [THIRD_PARTY.md](THIRD_PARTY.md).
- Node is used only by development checks. The delivered app is vanilla browser
  JavaScript and needs no installation or build step.

Run `node --test tests/zorkmid-wallet.test.mjs` from the repo root for key and
public-link checks. Optional artwork/DOM/QR checks are described in the test
file and use development dependencies; none are loaded by the application.

## World and ledger integration

The onboarding page creates and prints IDs. The surrounding [Zorkmid world](../world.html)
now keeps Lantern open beside verified File Proxy comments and provides a Chisel
eCash note/IPFS-URI tool with an explicit transaction review and broadcast action.
See [world/README.md](../world/README.md). It does not yet etch avatars, resolve a
latest-release pointer, or deliver background announcements. Chisel's existing
image encoder uses a Base57 palette; no new “Base53” protocol is introduced.
The shared Zorkmid view can then merge recognised deployments on other chains,
with each asset and network labelled explicitly.
