# Lantern → Chisel: One Verifiable Story

*Protocol demonstration specification v0.2 · 10 October 2026 · proposed, not deployed*

## Claim

A player takes an action in a game. The game produces replayable evidence. The player can sign an authorization, obtain an independent issuer attestation, and publish a compact reference through Chisel. A third party can recover and verify the story without trusting Lantern's original web page. The native token, if any, may facilitate payment or access; its market value does not determine whether the evidence is valid.

## System boundary

```text
Player -> Lantern browser -> Lantern / dfrotz
                |                 |
                |                 +-- deterministic seed, story SHA-256, ordered moves
                v
        canonical evidence JSON -> SHA-256 -> optional IPFS CID
                |
        optional subject signature <--- player-controlled key
                |
        optional issuer attestation <--- dedicated Lantern issuer key
                |
        Chisel (explicit user consent, no server custody)
                |
        UTXO tx: publication reference + address-indexed marker
                |
Independent verifier -> chain transaction -> decoder -> evidence -> hashes/signatures/replay
```

Lantern may run via HTTP at a self-hosted endpoint; the client and exported artifact must not require a permanent Lantern-hosted web UI. Blockchain publishing is optional. No private spending key belongs on the ordinary game server.

## Browser verifier implemented (V1)

[story-verifier.html](story-verifier.html) accepts a Lantern session save, a restricted `lantern.story.v1` evidence object, or its `lantern.story-proof.v1` envelope; it calculates the SHA-256 of its canonicalized story data using the Web Crypto API. It checks the envelope's embedded digest and can compare a separately supplied expected digest. It exports an envelope containing only the five canonical fields and the hash. Its canonicalizer sorts object keys, supports strings, arrays and safe integers, and rejects unknown story fields. **This is a restricted JSON profile, not a complete implementation of RFC 8785.** The supported story fields are `type`, `game`, `storySha256`, `seed`, `moves`. A deterministic browser hash does not prove source authenticity, replay, independent attestation or ledger publication. Hosted page must be HTTPS or localhost for Web Crypto.

## Demonstration A: reproducible session (existing foundation)

The current server stores game ID, exact story filename, story SHA-256, seed and ordered moves. A repeatable Zork I egg walkthrough and `test_lantern.py` are documented in [LANTERN.md](LANTERN.md). That is the existing test harness. Claims of deployed Chisel signing, on-chain inscriptions or automated issuer attestations **are not** made here.

Proposed evidence object (example identifiers are illustrative; not real hashes):

```json
{
  "type": "lantern.story.v1",
  "game": "zork1",
  "storySha256": "<64-lowercase-hex>",
  "seed": 1,
  "moves": ["open mailbox", "read leaflet"],
  "interpreter": {"name": "dfrotz", "version": "<exact-version>"},
  "rules": "lantern-replay-v1"
}
```

Canonicalization needs to be fixed before any ID is stable. Proposed v1: strict UTF-8; JSON Canonicalization Scheme (RFC 8785) for supported JSON types; no timestamps, service URLs, session IDs or non-deterministic output in the hashed object. Hash = SHA-256 of canonical bytes. An IPFS CID can identify the content, but the hash and a retrievable evidence bundle are separate concerns. A digest proves byte identity, not whether gameplay really happened.

## Demonstration B: signed, indexable action (proposed integration)

1. The player exports the canonical evidence and `evidenceSha256`.
2. A subject signs a domain-separated challenge including the evidence hash and a nonce. The player key must remain client-side. Record signature scheme and public-key identifier explicitly.
3. If independent game achievement is asserted, a separate Lantern issuer validates the recorded event and signs an attestation. Player self-signature alone proves authorization, not achievement.
4. Chisel prepares a transaction using a **versioned and chain-specific** encoding, carrying a compact reference: record type, evidence digest/reference, issuer identifier, and an unspendable address marker when supported. Exact output construction and dust/fee rules are chain-specific.
5. The user reviews fees and signs/broadcasts the transaction.
6. A verifier looks up the transaction, decodes the marker, obtains the evidence (for example from IPFS), checks hashes and signatures, and optionally replays the moves against the exact story and interpreter build.
7. The verifier uses the same address as an index to enumerate related publications, subject to independently accessible explorer or node indexing. An address is an indexing convention, not a magical database query on every node.

### Compact publication envelope (not actual transaction bytes)

```json
{
  "type": "chisel.story-reference.v1",
  "chain": "<chain-id>",
  "recordType": "lantern-session",
  "evidenceSha256": "<64-lowercase-hex>",
  "evidenceUri": "ipfs://<CID>",
  "subjectKeyId": "<public-key-id>",
  "issuerKeyId": "<issuer-key-id-or-null>",
  "indexAddress": "<versioned-unspendable-address>"
}
```

This JSON illustrates semantics, not guaranteed fit inside a transaction. Chisel must publish a binary/compact schema with chain-specific byte limits and reproducible test vectors. Never put private keys, personal details, or a complete transcript into an immutable public transaction by default.

## Independent verification checklist

- Verify the transaction exists on the stated chain at the stated block/confirmation state.
- Decode its record version and index marker without calling the project's own server.
- Retrieve evidence from an independently chosen source and match `evidenceSha256`.
- Recompute the canonical digest from the evidence.
- Verify subject authorization and, where asserted, issuer signature and historical issuer public key.
- Replay with the exact story image and interpreter, or report an explicit **not replayed** status.
- Show which assertions were checked and which remain unverified. Timestamp/order and cryptographic signatures do not automatically prove real-world truth.
- Repeat discovery from an independently operated explorer/node to check indexing portability.

## Five acceptance tests

| Test | Pass criterion |
| --- | --- |
| Replay | Same story bytes, interpreter and moves yield the expected result |
| Hash | Independent canonicalizer produces identical digest |
| Signature | Altering evidence or signer invalidates the verification |
| Ledger | Explorer-independent decoder retrieves the intended typed reference |
| Index | Two published stories with the same convention can be enumerated by the index address |

Until actual transactions and verifiers exist, these are **planned acceptance tests**, not benchmark results.

## Performance and tokenomics measurements

For Bitcoin, DigiByte, Litecoin, and Dogecoin, document chain-specific: target block interval, observed inclusion time distribution, fee per record, encoding capacity, dust constraints, indexing API availability, security assumptions, and multi-confirmation reorganization exposure. Test actual confirmation times; faster blocks do not guarantee equivalent security.

For Zorkmid, separately document: selected host chain and token standard, supply and issuance, minimum unit/decimals, transfer authority, allocation and vesting, custody, trading liquidity, whether a utility action needs tokens, and alternatives for users who hold none. **Network utility does not imply token appreciation.** An entry token might be useful even if its market price remains near zero.

## A critic's chapter

A critic can publish a signed counterclaim to the same indexed history. The resulting sequence is a story of claim, evidence, response and verification rather than a promotional slogan. This is the proposed bridge between conventional product diligence and crypto token narratives. It is not an instruction to threaten critics, manipulate markets, or promise investment returns.

## Browser verifier implementation status

The standalone [verify.html](verify.html) implements a first-stage canonical SHA-256 verifier for `lantern.story.v1` evidence. It checks a restricted JSON subset, detects duplicate keys, validates the envelope, and compares an optional expected digest. It deliberately does not claim to validate gameplay, issuer signatures, or on-chain references. Cross-language test vectors and exact RFC 8785 interoperability still require testing.

## Implementation order

1. Export a deterministic Lantern story bundle with canonicalization and fixture tests.
2. Build a static, browser-native verifier using Web Crypto, no Node.js runtime required.
3. Add Chisel's chain-specific, versioned publication encoder with offline test vectors.
4. Let the player review and publish a compact reference.
5. Implement address-based discovery using interchangeable index providers.
6. Publish a real, independently replayable example with transaction ID, chain, costs, and failures.

**Status:** architecture and test plan only. No claim of deployed Zorkmid currency, implemented cross-chain publication, or verified live demonstration.
