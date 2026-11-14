# AIModelRegistry — Decentralized AI Asset & IP Registry (PoC)

A clean, modular Proof of Concept (PoC) smart contract architecture built on **ERC-1155** for registering, tokenizing, and verifying intellectual property (IP) ownership and licensing parameters for Artificial Intelligence models on EVM-compatible blockchains.

---

## Architecture Overview

Rather than storing heavy neural network weights on-chain, `AIModelRegistry.sol` acts as an **immutable cryptographic notary**, binding off-chain AI assets to verifiable on-chain metadata:

* **Asset Identity (`uint256` Token ID):** Unique deterministic identifier per registered model.
* **Provenance & Authorship:** Cryptographic binding between the creator's address/handle (e.g., `@VinciLabs`) and the model (`VisionForge Pro`).
* **Commercial Terms:** On-chain base pricing (`ETH`) and fractionalized token supply (`ERC-1155`) for multi-tier licensing or shared ownership.
* **Event-Driven Indexing:** Emits `ModelRegistered` events for real-time dApp and subgraph synchronization.

---

## Tech Stack

* **Smart Contracts:** Solidity (`^0.8.20`), OpenZeppelin ERC-1155
* **Development & EVM Environment:** Hardhat 3, Ethers.js v6
* **Testing & Verification:** Mocha, Chai

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
