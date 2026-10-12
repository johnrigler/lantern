# Zorkmid cross-chain lobby and the no-token commons

Status: architecture proposal, 12 October 2026. No deployment or working cross-chain index is claimed.

## Core distinction

**Mogwai / the “no-ken” commons:** people may publish signed, interpretable records using ordinary transactions without purchasing Zorkmid. On DigiByte, Litecoin, Dogecoin and other supported UTXO chains, a recognizable Zorkmid ThunderWord/address and a published record format identify an activity stream. Participation and independent reading are not conditional on a proprietary site or token.

**Zorkmid's economic layer:** an optional officially recognized experience may sell or require access to specific services, visibility, ranking, verification, or status. A Base/Polygon ERC-20 implementation could retain normal wallet-compatible token transfers while adding Solidity entry points for messages, game events and badge attestations. A Solana implementation could use a native Solana token and program, but token supply, bridging and equivalence across chains are not defined.

These models coexist. The token neither creates nor owns the cross-chain lobby. An official client may curate or rank information, but excluded records remain independently retrievable wherever the underlying ledger retains them and a suitable reader/index is available.

## The lobby is also a game

The lobby is a persistent social world, not merely a menu. People enter, talk, discover one another through records of shared interests, advertise accomplishments, share artifacts, and find doors to other games. Begin with three doors to Zork I/II/III; other Z-machine games (for example, Planetfall, subject to rights and availability), independent games and experiences may join later.

A client can merge streams from many chain-specific Zorkmid addresses into one interpreted environment. A participant may publish in a Litecoin lobby without possessing an EVM token. Cross-chain account linking requires proofs of control of each address; names alone do not establish shared identity. Events across unrelated chains have no canonical global order.

Game execution, scores and chat may occur off-chain or in replaceable services. Selected interactions, announcements, signed artifacts and game results can be anchored on-chain. The ledger proves publication of data, not automatically that an asserted achievement is true.

## Recognition and paid verification

Anyone may announce completion or issue an informal badge on a supported ledger. Official badges are attestations from an identifiable, authorized verifier, not a monopoly on the idea of a badge.

A possible paid flow:
1. Play without a token and retain a portable session or signed evidence.
2. Opt into official verification; a service checks gameplay evidence and confirms any required payment, holding threshold, or stake at a specified chain state.
3. An authorized issuer signs an attestation or submits a contract call that emits an event containing a schema version, game/achievement ID, subject, evidence hash or content reference, verifier and issuance reference.
4. The Graph or another indexer discovers the event; Chisel and independent clients verify the original transaction plus the issuer and evidence according to public rules.
5. A holder who later transfers tokens retains the historical badge; new gated actions may require a new eligibility check.

Payment is not proof of success. An honest badge needs a defensible verifier and anti-replay rules. An ERC-20 contract can emit badge events without minting an NFT, although a separate credential standard may eventually help interoperability.

## Indexing, recoverability and The Graph

Polygon/Base and prospective Solana records can be indexed with chain-appropriate infrastructure. A conventional EVM subgraph readily indexes explicit contract events; arbitrary transaction input and transfers that emit no suitable event may require a different pipeline, such as Substreams or a purpose-built transaction indexer. The Graph support for a particular chain and indexing pipeline must be verified before committing to it. UTXO records require their own history retrieval mechanism or independent indexer; do not assume The Graph automatically indexes those chains.

**Authoritative source:** on-chain transaction history, contract code, published schemas, decoding logic and any retained external content. **Derived service:** Graph queries or an explorer endpoint. **Interpreter:** Chisel/Mogwai or another conforming client.

Acceptance test: publish a versioned record; query the derived index; disable it; replay available chain history with a separately implemented reader; confirm equivalent decoded identifiers, authorship and content. State which historical RPC/indexer capabilities and IPFS blocks or reconstruction parameters are required. If M64 stores enough complete source material and deterministic encoding rules, an artifact may be regenerated; an IPFS CID additionally depends on exact bytes and UnixFS/IPLD construction settings. Rebuilding derived state requires access to historical data, not merely a current wallet balance.

## Commercial and ETHDenver demonstration

The technical presentation compares (a) permissionless publication across UTXO and EVM systems, (b) opt-in token-governed privileges, and (c) an optional hybrid in which open expression coexists with paid verification or curation. These are proposals, not existing deployed services.

Demonstrate one guest entering the lobby without tokens, one chain-native inscription, one explicit EVM contract event, one query through an indexer, one direct ledger reconstruction, and one badge from a clearly identified issuer. Keep scope small enough to actually work before adding Solana, cross-chain identity aggregation or multiple games.

Commercial hypothesis: people may pay for credible verification, service, presentation and prestige, rather than for permission to speak. Validate demand and actual service costs before relying on token sales for income. Token issuance, distribution, promotion and sales require legal analysis; neither technical utility nor scarcity guarantees price appreciation.

Related: [Zorkmid white paper](../ZORKMID-WHITEPAPER.md), [Lantern proof of one verifiable story](../STORY-PROOF.md), [ETHDenver Zorkmid plan](zorkmid-ethdenver-experience.md).
