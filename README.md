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
* **Interactive Presentation Viewer:** Standalone HTML5 / CSS3 / Vanilla JS (`visor-demo.html`)

---

## Interactive Dual-Terminal Viewer (`visor-demo.html`)

This repository includes a zero-dependency, standalone HTML5 presentation dashboard (**`visor-demo.html`**) designed to visually demonstrate the smart contract lifecycle and cryptographic audit flow without requiring an active RPC server:

* **Executive Overview Cards:** Displays real-time metadata for the digital notary contract (`AIModelRegistry.sol`), the registered AI asset (`VisionForge Pro` by `@VinciLabs`, Token ID `#0`), commercial parameters (`0.48 ETH`, `1,000` fractional units), and verification status (`Keccak-256 + Mocha/Chai`).
* **Terminal A (Local Hardhat EVM Node — Port 8545):** Simulates the local JSON-RPC server receiving Keccak-256 signed transactions, mining Block `#2`, and updating the EVM state root.
* **Terminal B (Client Deployment & Auditor):** Simulates contract deployment, execution of the `registerModel()` transaction, `ModelRegistered` event emission, and the automated Mocha/Chai test suite validation.
* **Interactive Playback Controls:** Allows stepping individually through node initialization, asset registration, and automated testing, or running the full synchronized sequence.

---

## User Guide: Local Setup & Execution (Windows)

### Prerequisites
* **Node.js** (v18 or higher) and **npm** installed on Windows.
* **Git** for version control.

### 1. Clone & Install Dependencies
Open PowerShell in your workspace folder and run:

    git clone https://github.com/jgarcia0908/ai-model-registry-poc.git
    cd ai-model-registry-poc
    npm install

### 2. Enable PowerShell Script Execution (Windows Only)
If Windows PowerShell restricts local `.ps1` scripts, allow execution for your current terminal session:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

### 3. Compile & Run Automated Tests
Compile the ERC-1155 smart contract and execute the Mocha/Chai validation suite:

    npx hardhat compile
    npx hardhat test

### 4. Launch the Interactive HTML Viewer
1. Navigate to the project root folder in Windows File Explorer.
2. Double-click **visor-demo.html** to open it directly in any modern web browser (Chrome, Edge, Brave).
3. Use the top control bar to run the full live demo or step through each stage.

---

## Repository Structure

    ai-model-registry-poc/
    ├── contracts/
    │   └── AIModelRegistry.sol       # Core ERC-1155 AI Model Registry smart contract
    ├── scripts/
    │   ├── deploy.js                 # Deployment script for local EVM nodes
    │   └── interact.js               # Live interaction script simulating model registration
    ├── test/
    │   └── AIModelRegistry.test.js   # Automated Mocha/Chai unit tests
    ├── visor-demo.html               # Interactive HTML5 Dual-Terminal & Validation Viewer
    ├── hardhat.config.ts             # Hardhat network and compiler configuration
    ├── package.json                  # Project dependencies and ESM configuration
    ├── .gitignore                    # Excludes node_modules, cache, and build artifacts
    └── README.md                     # Project architecture, viewer guide, and Windows setup
