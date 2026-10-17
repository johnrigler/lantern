# Sources and licences

This onboarding application is distributed with the repository's Apache-2.0
licence, subject to the following bundled third-party notices.

| Files | Source / pinned version | Licence |
| --- | --- | --- |
| `vendor/chisel.js`, `vendor/chisel.sign.js` | John Rigler's `johnrigler/chisel` at `79c541da82c9590240ac4bfb1c44fa09444acffc` | Reused for his Zorkmid application; embedded elliptic MIT notice applies |
| `printer/ctp500*.js` | Same Chisel commit; print4 / ble3 | Reused Chisel code; original source comments retained |
| elliptic embedded in `vendor/chisel.js` | `indutny/elliptic` 6.6.1 | [MIT](licenses/elliptic-MIT.txt) |
| `vendor/qrcode.min.js` | `davidshimjs/qrcodejs`, vendored by Chisel | [MIT](licenses/qrcodejs-MIT.txt) |
| `vendor/ecashaddrjs-2.0.3.js` | Bitcoin ABC `modules/ecashaddrjs`, npm `ecashaddrjs@2.0.3` | [MIT](licenses/ecashaddrjs-MIT.txt) |

CashAddr npm tarball SHA-1 (package shasum):
`6618b0ab74587d1172c1c6a3db1c90aa664c069e`.

To reproduce the browser CashAddr bundle, obtain the pinned npm tarball and run:

```sh
esbuild package/dist/cashaddr.js --bundle --platform=browser --format=esm --target=es2020 --outfile=onboard/vendor/ecashaddrjs-2.0.3.js
```

Build tool: esbuild 0.25.10. The distributed files need no runtime CDN or npm.
