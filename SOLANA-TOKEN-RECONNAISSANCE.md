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
