# Lantern as the Zorkmid entry point: ETHDenver plan

Status: proposal, not a deployed token or live reward service. [Central event plan](https://github.com/johnrigler/EthDenver/blob/main/docs/ethdenver-2027-showcase.md).

User journey: QR card -> browser playable Lantern -> game interaction without wallet -> optional explain-Zorkmid page -> wallet connection and consent -> claim an allocation if the Base contract and claim system are live. Nobody must buy a token to play.

Proposed Zorkmid (ZORK): Base ERC-20, supply 99,000,000,000, decimals 9. The mint, contract address, treasury, rewards, fees, and implementation are **not yet established**. Keep it separate from the Z-machine server's operation and from saved game integrity. Historical eligibility needs a reproducible block height and verification, not a current wallet balance.

Implementation gates:
1. Reliable public live Lantern URL, clear connection/down indicators, playable no-wallet experience.
2. A distinct optional token-info view with immutable official mint/network details only after confirmed deployment.
3. Opt-in claim flow with funded gas plan, anti-replay code, rate limiting, testnet rehearsal, explicit wallet permissions and transaction status.
4. If rewards become real, implement deterministic, auditable rules and prohibit duplicated claims; never promise yield or price.
5. SB Stats events: card scans, play started, challenge completed, opt-in wallet claim, return sessions; disclose bot actors and avoid invasive tracking.

Do not store user seed phrases/private keys, assume all Solana wallets support Base automatically, or claim the existing game server is decentralized when execution relies on a hosted dfrotz server.
