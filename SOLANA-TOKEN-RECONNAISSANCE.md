# Solana token reconnaissance and Zorkmid historical readability

Date: 2026-10-11. Source: user-collected `solana-data.tar` containing October 10 and October 11 snapshots for Get Money and Purple Squirrel. These are snapshots, not transaction histories.

## Why this matters

Zorkmid uses token transfers for participation and economic value, while Chisel can interpret the *exact amount integers* as Advanced Satoshi Code artifacts. A drop can reward participants, encode picture cells, and later be joined to neighboring transactions to reconstruct longer compositions. Transfers, true burns, and computational hash achievements are distinct verifiable events. The social/game interpretation should remain recoverable even if Lantern is offline; a third-party parser needs chain references, explicit decoding rules, and content-addressed artifacts. Never conflate an account with a unique human player.

A future investigator examining *historical transfer amounts* (not only current balances) may identify recognizable players, coordinated drops, message patterns, tips, burn spectacles, chronology and recurring interactions. Patterns are evidence, not proof of intent.

## Observations from the pulls

| Field | Get Money | Purple Squirrel |
| --- | --- | --- |
| Mint | `7Y8shnrkN9sKySNmUFCVG8FwQk9829ncozJ2AjaEnREV` | `6z9oBZ84zSx2uPvPofyaAABmBaWUk1BmDkMQryiYorzk` |
| Program | Token-2022 | SPL Token |
| Supply at October 11 | 999,962,765.204317459 | 994,112,889.931622313 |
| Decimals | 9 | 9 |
| Mint and freeze authorities | null | null |
| Top 3 token accounts / supply | ~84.33% | ~83.00% |
| Top 20 token accounts / supply | ~96.23% | ~98.20% |
| DEX pairs returned | 2 | 0 |
| RPC errors in latest capture | 0 | 0 |

The observed supply differences from *hypothetical* one-billion initial issuance are 37,234.795682541 and 5,887,110.068377687 respectively. **Do not call these burns until mint creation, mint-to and burn histories have been verified.**

Get Money includes Token-2022 metadata and an IPFS pointer, an important example for content-addressed discovery. Two returned Meteora pools showed roughly $193.78 combined liquidity and $0.37 24-hour volume *in those two pools only*. Pair discovery is incomplete, and zero returned pairs does not prove zero market activity.

The snapshot contains individual top token-account addresses and exact integer balances, but it does **not** identify their owner wallets or whether accounts represent liquidity, treasury, custody, programs, or people. A striking Purple Squirrel balance is exactly 52,000,000 tokens; unlike irregular balances that may result from ordinary trading, rounded numbers are potential clues, not decoded messages.

Most importantly, the RPC returns `amount` (decimal string) and often `uiAmountString`, but `uiAmount` is a floating-point value with lost low-order digits. Chisel and the collector must preserve raw amount strings, process them with BigInt, and keep the exact mint decimals. Never use binary floating point to infer Advanced Satoshi Codes.

## Zorkmid working economics, not finalized

Candidate: 10 billion tokens, 9 decimal places, 10,000-token initial reward denomination. Solana SPL amounts and mint supply use a u64 atomic-unit limit. 10 billion times 10^9 = 10^19 atomic units, below 2^64-1. A 100-billion-token mint would need at most 8 decimals; 10 billion with 9 preserves more fractional display positions. Decimals do not add bits of actual information to a transfer amount. Keep these choices changeable pending a distribution/UX test.

Normal expressive token transfers are not burns: recipients retain the tokens. A genuine Solana burn decreases mint supply; sending to a presumed inaccessible address does not. Burns may themselves carry encoded numerical patterns. Decreased supply does not guarantee a price increase. On Solana, a multi-recipient picture may require multiple transactions, so ordering and assembly rules must be unambiguous.

## Second-pull priorities

1. **Resolve top 20 token accounts:** for each, call `getParsedAccountInfo` or `getMultipleAccounts` and record token-account owner, mint, program owner, balance, initialization state. Classify known pool/treasury/program accounts only with evidence. This is the cheapest high-value improvement.
2. **Collect transaction samples for top accounts:** `getSignaturesForAddress` with pagination (start with 20–100 signatures per account), then `getTransaction` for selected signatures, with `maxSupportedTransactionVersion: 0`, `encoding: jsonParsed`. Preserve inner instructions, pre/post token balances, logs, fee payer, slot, block time, and errors. Token mint address alone will not enumerate all token transfers.
3. **Look for issuance and burns:** collect early mint-account signatures and transaction instructions; when provider retention or history limits intervene, record explicit partial coverage. Reconstruct only supported supply deltas; do not assume all changes are burns.
4. **Capture exact transfer vectors:** token mint, program, source/destination token accounts and *wallet owners when resolved*, raw `amount`, decimals, signature, instruction indices, parent/batch ordering. Detect numerical prefixes/suffixes, powers of ten, recurring patterns, sequential strips, and unusual synchronized drops. Distinguish pattern detection from attribution.
5. **Keep complete DEX discovery and metadata separate:** pool addresses, token reserves, timestamps, quote pairs and liquidity; retrieve legacy Metaplex metadata for Purple Squirrel and Token-2022 extensions plus metadata URI contents for Get Money. Save IPFS CIDs and content hashes. DEX aggregators may return partial coverage.
6. **Snapshot deltas:** re-run at different times and compare supplies, largest balances, discovered pools and transfer patterns. Label comparisons as changes between captures, not comprehensive histories.

### Collector behavior

Keep original raw responses alongside a normalized JSONL historical event stream. Record capture time, RPC endpoint name (do not save the API key), slot, pagination cursor/limits, selected address set, error details, 429 retries/backoff, and whether history is partial. The free API may impose rate and archival constraints. Include a small machine-readable manifest documenting which data was requested and which calls succeeded.

Preferred command-line interface: `python3 solana_token_dump.py --rpc 'https://mainnet.helius-rpc.com/?api-key=...' --pages 1 --history-limit 50 --resolve-owners`. This is a proposed interface, **not** an existing command; the script must implement these flags first. Do not require environment variables.

## Durable discovery protocol

A third party needs: chain + mint/transaction identifiers, a declared event or campaign identifier, sequence/row/column ordering when a composition spans transactions, amount decoding/palette rules, character/identity attestations (not assumed from wallet clustering), and stable artifact references. Signed and content-addressed manifest(s) should let new decoders reproduce the original result. An IPFS URI authenticates content but does not guarantee continued availability. The data format should support activity on chains other than Solana and distinguish game claims from verified economic actions.

## Two-snapshot comparison

Supply stayed exactly unchanged in atomic units between October 10 and October 11 for both mints: Get Money 999962765204317459, Purple Squirrel 994112889931622313. That establishes zero *net* change, not absence of all mint/burn activity. Both October 10 `getTokenLargestAccounts` requests against the public Solana endpoint failed with HTTP 429 after four attempts, while both October 11 pulls returned 20 accounts with zero errors. Supply outside the top 20 as of October 11: Get Money 37,662,190.217808384 and Purple Squirrel 17,857,965.372958760 tokens. Those are aggregate balances, not holder counts.

## Ecosystem discovery and airdrop candidate list

Get Money and Purple Squirrel define an initial *social orbit*, not a claim that their wallet owners are known or that holdings imply consent to receive airdrops. Extend the collector to other related community tokens, with an explicit, reproducible relevance/quality rubric (verified mint, activity over time, unique active owner estimates, liquidity depth, concentration after pool/treasury classification, retention). Do not equate token price or volume with community health.

Produce a deduplicated **candidate** recipient table with source mint(s), observed owner wallet, evidence transaction IDs, first/last activity, behavior types (hold, receive, transfer, LP if verified), confidence/classification, last-check slot, exclusion reasons, and opt-in state. Exclude program/LP/treasury/exchange/custodial addresses until properly identified; a token-account address is not automatically a wallet to airdrop to. Public observations may identify wallet addresses, not people. Never label addresses as particular real-world people based only on ledger behavior.

Build campaigns that can be inspected before sending. Prefer an opt-in claim or clearly disclosed invitation over unsolicited transfers; support decline/ignore and avoid creating recipient-associated token accounts without considering SOL rent costs and dust/spam effects. Capture payout transaction signatures and exact integer amounts so each drop doubles as a reconstructable visual/story event. Candidate identification, verified eligibility, consent, actual recipient list, and successful on-chain payout must remain separate states.

## IPFS-first token and service economy

Solana token metadata can publish a URI containing an `ipfs://` CID (wallet/indexer support varies; HTTP gateways are compatibility paths, not canonical identity). Put token metadata, Zorkmid protocol specifications, manifests, decoders, stories, imagery, and frontend bundles on IPFS; anchor important immutable CIDs and version pointers in verifiable ledger records. Pin/replicate content, because IPFS addresses content but does not itself ensure persistence.

Service functionality (e.g. game sessions, searches, indexing, gateways, pinning) may require live hosts: use a signed, replaceable service registry with provider identity/key, advertised capabilities, endpoint(s), price and accepted asset, content/protocol versions, availability evidence, receipt format and reputation methodology. Hosting rewards are payments for verifiable delivery, not mere self-reported availability. Clients independently select providers based on observed uptime, latency, payment receipts and auditable results. Avoid making any single Lantern server or gateway mandatory.

Payments are also expressive artifacts: preserve exact atomic transfer amounts and link signed service receipts to transactions so Chisel can render numerical patterns without sacrificing auditability. A payment receipt establishes a transaction, not by itself service quality or a human identity. Make cross-chain proof references possible; Solana is the default economic venue, not the exclusive protocol.

### Next collector output

- `token_orbit.json`: observed mint metadata and evidence-based comparison measurements.
- `candidate_wallets.jsonl`: deduplicated owner-wallet candidates and reasons/evidence, **not** an automatic send list.
- `transfers.jsonl`: full precision atomic amounts, transaction signatures, direction, timestamps, and source token accounts.
- `coverage.json`: cursors, RPC limitations, classification confidence, and unobserved portions of history.


## Licensed game unlocks and commercial access

Lantern is protocol-open and can support both freely distributable games and rights-restricted licensed games. A Planetfall milestone is a potential rights-acquisition project, not a promise that licensing is available. A paid license must explicitly authorize server-hosted execution, commercial/token-gated access, game copies/backup, and the chosen number and identity of hosts. Do not place the commercial story file on public IPFS unless redistribution is permitted. IPFS can still serve frontend, metadata, descriptions and discoverability.

Potential access flow: connect wallet, sign a server-issued expiring challenge, verify signature and current Zorkmid token ownership and balance on-chain, then issue a short-lived session credential; periodically recheck on renewal. A holding threshold is **not staking** and requires no on-chain action merely to authenticate. Someone can buy, play, sell, then lose eligibility on the next check. Token trades alone are not Lantern revenue; budget licensing against *realized* treasury receipts rather than quoted market capitalization or illiquid token holdings.

Unlock announcements are verifiable events: establish actual licensing and availability before claiming a game is unlocked. Publish a canonical signed event with IPFS CID, ledger evidence, playable host directory and explicit terms; relay to X, Telegram and other platforms. Separate milestones for number of players, independently hosted services, and purchased game licenses. A larger community may help licensing negotiations but creates no right to someone else's intellectual property.


## Second pull: October 11, 2026 (pull2.tar)

Observed output: 40 top-account rows; 327 signature-record rows; 123 transaction-detail rows, of which 121 contain a transaction response and 2 are null due to version errors. Coverage reports 164 RPC calls, all 40 token-account owners resolved, and only 2 RPC errors. **This is a sampled account-history dataset, not complete mint history or a participant roster.**

| Result | Get Money | Purple Squirrel |
| --- | ---: | ---: |
| Top token accounts / distinct owner addresses | 20 / 17 | 20 / 20 |
| Signature-record rows / distinct signatures | 139 / 118 | 188 / 188 |
| Transaction-detail rows / non-null responses | 57 / 55 | 66 / 66 |
| Original top-account balances changed by pull | 0 | 0 |
| Sampled earliest transaction timestamp | 2025-09-09 | 2022-05-05 |
| Sampled latest timestamp | 2026-10-11 | 2026-10-09 |

Four of Get Money's top token accounts resolve to owner address `HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC`. Purple Squirrel's top 20 accounts each resolve to distinct addresses. Do not treat these addresses as known humans or assume they are ordinary wallets. All 40 account classifications remain **unclassified**.

A historical sample from a token account can include unrelated SPL assets, swaps, pool operations, ATA creation and other activity. Filter the transaction's pre/post token balances and decoded instructions *by target mint* before categorizing any record as a Get Money or Purple Squirrel transfer. The signature `err` field indicates transaction failure when non-null; do not treat failed transactions as completed payments. Repeated signatures across accounts must be deduplicated before aggregate transaction counts.

### Collector bug found

Two Get Money `getTransaction` results failed with JSON-RPC code -32015: transaction version 1 requires `maxSupportedTransactionVersion: 1` instead of 0. Update the call and retry those signatures. Preserve original response and retry status. For future pulls, extract only relevant mint balance deltas with raw atomic integer strings, plus from/to token accounts and owner addresses when demonstrable.

### Next analytic milestone

Construct *target-mint-specific* historical transfer edges from the transactions actually downloaded, excluding failed transactions and classifying pool/program wallets before generating any airdrop candidates. Cross-reference signatures against an independent explorer for a few samples. Count active wallet owner addresses and distinct days in this **sample only**, never claim they measure all token holders or full historical activity. Extend to non-top-20 accounts to find community participants, since top account holders are poor proxies for ordinary players.
