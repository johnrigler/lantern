# Shared Chisel signing files

These files are copied from johnrigler/chisel's W42 technical review fixes. The normal wallet and world sign-in use pinned local Noble 3.2.0 through Chisel's secp256k1 boundary. The retained legacy elliptic code is not selected for normal signing.

`chisel-checksums.json` records the local copies. Noble's MIT license is in `NOBLE-SECP256K1-LICENSE.txt`. Signed comment proofs remain compatible; high-S variants and non-JSON signed payloads are rejected. Native eCash transaction signing continues through the existing Bitcoin ABC SDK.

Source commit: [johnrigler/chisel c3797e2](https://github.com/johnrigler/chisel/commit/c3797e20c6b307227d3b92015232ec0fe760f9ff).
