# AIModelRegistry — On-Chain AI Model Registry & Licensing (PoC)

A Proof of Concept (PoC) smart contract built on **ERC-1155** that registers AI models on an EVM chain, sells licenses to them in ETH, and credits the revenue to the model's creator. Heavy assets (model weights) stay off-chain; the contract records who registered a model, a hash of its content, its commercial terms and who holds licenses.

> **Status:** PoC for learning and evaluation. Not audited and not deployed on a public network. Do not deploy with real funds.

---

## What the contract does

| Capability | How it works |
|---|---|
| **Register a model** | `registerModel()` stores the name, the creator **address** (`msg.sender`), a creator handle (free text), a **content hash** of the off-chain weights, the price per license and a maximum supply. Mints an optional initial supply to the creator. |
| **Content notarization** | Each content hash can be registered **once**. The chain records *who registered a hash first, and when*. It does not prove the registrant owns the weights (see limitations). |
| **Buy licenses** | `acquireLicense()` mints license units (ERC-1155 balances) to the buyer for `basePrice × quantity`. Reverts if the model is inactive, the payment is short, the quantity is zero or the **maximum supply** would be exceeded. |
| **Pull payments** | Payments are credited to `pendingWithdrawals` and collected with `withdraw()`. Overpayment is credited back to the buyer the same way. Credited funds can always be withdrawn by their owner, and direct ETH transfers to the contract are rejected (there is no `receive()` function). |
| **Model status** | `setModelActive()` lets the creator (or the contract owner) pause or resume sales of a model. |
| **Indexing** | Emits `ModelRegistered`, `LicenseAcquired`, `ModelStatusChanged` and `Withdrawn` for dApps and subgraphs. |

### Flow

    Creator ── registerModel(name, handle, contentHash, price, maxSupply, initialSupply) ──► Registry
                                                                                             │ token #N
    Buyer ──── acquireLicense(tokenId, quantity) + ETH ────────────────────────────────────► Registry
                                                                                             │ mints license units to buyer
                                                                                             │ credits ETH to creator (and any excess to buyer)
    Creator / Buyer ── withdraw() ◄── pendingWithdrawals ────────────────────────────────────┘

**On-chain:** model identity, creator address, content hash, price, supply, licenses, payments.
**Off-chain:** model weights, inference, analytics, metadata files.

---

## Contract API

| Function | Access | Description |
|---|---|---|
| `registerModel(name, creatorHandle, contentHash, price, maxSupply, initialSupply)` | Anyone | Registers a model and returns its token id. Name and handle must be 1–64 bytes, hash non-zero and unique, `maxSupply > 0`, `initialSupply <= maxSupply`. |
| `acquireLicense(tokenId, quantity)` | Anyone (payable) | Buys license units. |
| `withdraw()` | Anyone with a balance | Pulls credited ETH. |
| `setModelActive(tokenId, status)` | Creator or owner | Enables or disables sales. |
| `setURI(newUri)` | Owner | Changes the metadata base URI. |
| `modelRegistry(tokenId)` | View | Returns the stored model data. |
| `pendingWithdrawals(account)` | View | ETH credited to an account. |
| `totalSupply(tokenId)` | View | Units minted so far (use `registry["totalSupply(uint256)"]` in ethers). |

### Design decisions

* **ERC-1155** — one contract manages many models, and each model's licenses are fungible units of its token id.
* **`ERC1155Supply`** — tracks supply per token so `maxSupply` can be enforced.
* **Pull-payment withdrawals + `ReentrancyGuard`** — state is updated before minting and no ETH is pushed to arbitrary addresses during a purchase.
* **Sequential token ids** — simple and cheap; uniqueness of the *content* is guaranteed by the hash check, not by the id.

---

## Known limitations

This is a PoC. The following are deliberate simplifications:

* **Hash front-running:** a content hash that appears in the mempool can be registered first by someone else. A production version should use commit–reveal.
* **The registrant is not proven to own the weights.** The contract notarizes *first registration of a hash*, not authorship. Real provenance needs off-chain evidence or signatures.
* **`creatorHandle` is unverified text.** The creator's **address** is the real identity.
* **No license types, expirations or permissions.** Every unit is an equivalent license; personal / commercial / enterprise tiers are not modeled.
* **No secondary-sale royalties** (ERC-2981 is not implemented) and licenses are freely transferable.
* **Centralized metadata:** the base URI points to an off-chain server and the contract owner can change it.
* **Owner powers:** the contract owner can deactivate any model.
* **No global emergency stop:** the only switch is `setModelActive()`, per model.
* **Gas:** names and handles are stored on-chain as strings; hashing them would be cheaper.

---

## Tech stack

* **Smart contracts:** Solidity `^0.8.20`, OpenZeppelin v5 (`ERC1155`, `ERC1155Supply`, `Ownable`, `ReentrancyGuard`)
* **Environment:** Hardhat 3, Ethers.js v6, Hardhat Ignition
* **Testing:** Mocha, Chai (32 tests)
* **Presentation viewer:** standalone HTML5 / CSS3 / vanilla JS (`visor-demo.html`)

---

## Quick start (Windows PowerShell)

**Prerequisites:** Node.js 22 or later (required by Hardhat 3, check with `node -v`; tested with v26.13.1), npm and Git.

    git clone https://github.com/jgarcia0908/ai-model-registry-poc.git
    cd ai-model-registry-poc
    npm install

If PowerShell blocks scripts, allow them for the current session only:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

### Compile and test

    npx hardhat compile
    npx hardhat test

The suite covers registration and its validations, license purchases (payment, excess, supply cap, inactive and unknown models), withdrawals, access control and the metadata URI.

### Deploy

    npx hardhat run scripts/deploy.js
    npx hardhat ignition deploy ignition/modules/AIModelRegistry.ts

Both run against an in-process Hardhat network, so the result is discarded when the command ends. Use `--network <name>` with a network configured in `hardhat.config.ts` to deploy elsewhere.

### Run the full demo

    npx hardhat run scripts/interact.js

Deploys a fresh registry and walks through the whole lifecycle. Example output (trimmed):

    2. Model registered as token #0
       name:        VisionForge Pro
       price:       0.48 ETH per license
       maxSupply:   1000
    3. Duplicate hash rejected: ... 'Content hash already registered'
    4. Buyer acquired 2 licenses (sent 0.98 ETH)
       credited to creator:    0.96 ETH
       credited back to buyer: 0.02 ETH
    5. Withdrawals done
       contract balance:       0.0 ETH
    6. Model deactivated, purchase rejected: ... 'Model is not active'

---

## Demo viewer — simulated replay (`visor-demo.html`)

A standalone, zero-dependency HTML page that **replays** the contract lifecycle as two terminals: a chain-events log and a client/auditor. The terminal text is taken from a real run of `scripts/interact.js` and of the test suite, but the page is a visual walkthrough for presentations: it does **not** connect to a node or execute the contract. Double-click the file to open it in any modern browser, or use the hosted copy: https://jgarcia0908.github.io/ai-model-registry-poc/visor-demo.html

---

## Repository structure

    ai-model-registry-poc/
    ├── contracts/
    │   └── AIModelRegistry.sol       # ERC-1155 registry, licensing and pull payments
    ├── ignition/
    │   └── modules/
    │       └── AIModelRegistry.ts    # Hardhat Ignition deployment module
    ├── scripts/
    │   ├── deploy.js                 # Deployment script
    │   └── interact.js               # Full lifecycle demo
    ├── test/
    │   └── AIModelRegistry.test.js   # Mocha/Chai unit tests (32)
    ├── .gitignore                    # Excludes dependencies, build output and local files
    ├── hardhat.config.ts             # Hardhat network and compiler configuration
    ├── LICENSE                       # MIT license
    ├── package.json                  # Dependencies and ESM configuration
    ├── package-lock.json             # Exact dependency versions for reproducible installs
    ├── README.md                     # This file
    ├── tsconfig.json                 # TypeScript configuration used by Hardhat
    └── visor-demo.html               # Simulated two-terminal viewer

Generated folders (`node_modules`, `artifacts`, `cache`, `types`) are created by `npm install` and `npx hardhat compile`, and are not committed.

---

## Roadmap

* Deploy and verify on a public testnet (Sepolia or Base Sepolia)
* License types, expirations and permissions
* ERC-2981 royalties and a configurable revenue split
* Commit–reveal registration to prevent hash front-running
* Test coverage report and a CI workflow

---

## AI-assisted development

This project was developed with the assistance of AI tools (Gemini and Claude) for code review, drafting of tests and scripts, and documentation. The design decisions, the contract changes and the validation (compilation, the 32-test suite and the demo run) were reviewed and verified by the author.

---

## License

Released under the MIT License. See the [LICENSE](LICENSE) file.
