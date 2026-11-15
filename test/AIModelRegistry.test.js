import { expect } from "chai";
import hre from "hardhat";

describe("AIModelRegistry (NuvyraHub PoC)", function () {
  let ethers;
  let registry;
  let owner;
  let developer; // model creator
  let buyer;
  let stranger;

  const NAME = "VisionForge Pro";
  const HANDLE = "@VinciLabs";
  const MAX_SUPPLY = 1000;
  const INITIAL_SUPPLY = 100;
  let PRICE;
  let HASH;

  // Registers a model as `developer`, with optional overrides
  async function registerModel(overrides = {}) {
    const p = {
      name: NAME,
      handle: HANDLE,
      hash: HASH,
      price: PRICE,
      maxSupply: MAX_SUPPLY,
      initialSupply: INITIAL_SUPPLY,
      ...overrides,
    };
    return registry
      .connect(developer)
      .registerModel(p.name, p.handle, p.hash, p.price, p.maxSupply, p.initialSupply);
  }

  beforeEach(async function () {
    // network.create() is the current API; connect() is deprecated in this version
    const connection = await (hre.network.create
      ? hre.network.create()
      : hre.network.connect());
    ethers = connection.ethers;

    [owner, developer, buyer, stranger] = await ethers.getSigners();

    PRICE = ethers.parseEther("0.48");
    HASH = ethers.id("visionforge-pro-weights-v1"); // keccak256 -> bytes32

    const AIModelRegistry = await ethers.getContractFactory("AIModelRegistry");
    registry = await AIModelRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("registerModel", function () {
    it("registers a model and emits ModelRegistered", async function () {
      await expect(registerModel())
        .to.emit(registry, "ModelRegistered")
        .withArgs(0, developer.address, NAME, HASH, PRICE, MAX_SUPPLY);
    });

    it("stores the creator address, hash, price and supply on-chain", async function () {
      await registerModel();
      const m = await registry.modelRegistry(0);

      expect(m.modelName).to.equal(NAME);
      expect(m.creatorHandle).to.equal(HANDLE);
      expect(m.creator).to.equal(developer.address);
      expect(m.contentHash).to.equal(HASH);
      expect(m.basePrice).to.equal(PRICE);
      expect(m.maxSupply).to.equal(MAX_SUPPLY);
      expect(m.isActive).to.equal(true);
      expect(await registry.isHashRegistered(HASH)).to.equal(true);
    });

    it("mints the initial supply to the creator", async function () {
      await registerModel();
      expect(await registry.balanceOf(developer.address, 0)).to.equal(INITIAL_SUPPLY);
      expect(await registry["totalSupply(uint256)"](0)).to.equal(INITIAL_SUPPLY);
    });

    it("allows initialSupply = 0 and mints nothing", async function () {
      await registerModel({ initialSupply: 0 });
      expect(await registry["totalSupply(uint256)"](0)).to.equal(0);
    });

    it("increments the token id for each model", async function () {
      await registerModel();
      await registerModel({ hash: ethers.id("another-model") });
      expect(await registry.nextTokenId()).to.equal(2);
      expect((await registry.modelRegistry(1)).creator).to.equal(developer.address);
    });

    it("reverts on an empty name", async function () {
      await expect(registerModel({ name: "" })).to.be.revertedWith("Invalid name length");
    });

    it("reverts on a name longer than 64 bytes", async function () {
      await expect(registerModel({ name: "x".repeat(65) })).to.be.revertedWith(
        "Invalid name length"
      );
    });

    it("reverts on an empty handle", async function () {
      await expect(registerModel({ handle: "" })).to.be.revertedWith(
        "Invalid handle length"
      );
    });

    it("reverts on a zero content hash", async function () {
      await expect(registerModel({ hash: ethers.ZeroHash })).to.be.revertedWith(
        "Content hash is zero"
      );
    });

    it("reverts when the content hash is already registered", async function () {
      await registerModel();
      await expect(registerModel()).to.be.revertedWith("Content hash already registered");
    });

    it("reverts when maxSupply is zero", async function () {
      await expect(registerModel({ maxSupply: 0, initialSupply: 0 })).to.be.revertedWith(
        "Max supply is zero"
      );
    });

    it("reverts when initialSupply exceeds maxSupply", async function () {
      await expect(
        registerModel({ maxSupply: 10, initialSupply: 11 })
      ).to.be.revertedWith("Initial supply exceeds max supply");
    });
  });

  describe("acquireLicense", function () {
    beforeEach(async function () {
      await registerModel();
    });

    it("mints licenses to the buyer and emits LicenseAcquired", async function () {
      const cost = PRICE * 2n;
      await expect(registry.connect(buyer).acquireLicense(0, 2, { value: cost }))
        .to.emit(registry, "LicenseAcquired")
        .withArgs(0, buyer.address, 2, cost);

      expect(await registry.balanceOf(buyer.address, 0)).to.equal(2);
      expect(await registry["totalSupply(uint256)"](0)).to.equal(INITIAL_SUPPLY + 2);
    });

    it("credits the payment to the creator (not paid out yet)", async function () {
      const cost = PRICE * 3n;
      await registry.connect(buyer).acquireLicense(0, 3, { value: cost });

      expect(await registry.pendingWithdrawals(developer.address)).to.equal(cost);
      const registryAddress = await registry.getAddress();
      expect(await ethers.provider.getBalance(registryAddress)).to.equal(cost);
    });

    it("credits any excess ETH back to the buyer", async function () {
      const excess = ethers.parseEther("0.1");
      await registry.connect(buyer).acquireLicense(0, 1, { value: PRICE + excess });

      expect(await registry.pendingWithdrawals(developer.address)).to.equal(PRICE);
      expect(await registry.pendingWithdrawals(buyer.address)).to.equal(excess);
    });

    it("reverts when the ETH sent is not enough", async function () {
      await expect(
        registry.connect(buyer).acquireLicense(0, 2, { value: PRICE })
      ).to.be.revertedWith("Insufficient ETH sent for license");
    });

    it("reverts when quantity is zero", async function () {
      await expect(
        registry.connect(buyer).acquireLicense(0, 0, { value: 0 })
      ).to.be.revertedWith("Quantity is zero");
    });

    it("reverts for a model that does not exist", async function () {
      await expect(
        registry.connect(buyer).acquireLicense(99, 1, { value: PRICE })
      ).to.be.revertedWith("Model is not active");
    });

    it("reverts when the model is inactive", async function () {
      await registry.connect(developer).setModelActive(0, false);
      await expect(
        registry.connect(buyer).acquireLicense(0, 1, { value: PRICE })
      ).to.be.revertedWith("Model is not active");
    });

    it("enforces the maximum supply", async function () {
      await registerModel({
        hash: ethers.id("limited-model"),
        price: 0,
        maxSupply: 10,
        initialSupply: 8,
      });

      // 8 minted + 2 = 10 -> allowed
      await registry.connect(buyer).acquireLicense(1, 2);
      // 10 minted + 1 = 11 -> reverts
      await expect(registry.connect(buyer).acquireLicense(1, 1)).to.be.revertedWith(
        "Max supply reached"
      );
    });

    it("supports free models (price = 0)", async function () {
      await registerModel({ hash: ethers.id("free-model"), price: 0 });
      await registry.connect(buyer).acquireLicense(1, 5);
      expect(await registry.balanceOf(buyer.address, 1)).to.equal(5);
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await registerModel();
      await registry.connect(buyer).acquireLicense(0, 2, { value: PRICE * 2n });
    });

    it("pays the creator the accumulated sales", async function () {
      const cost = PRICE * 2n;
      const registryAddress = await registry.getAddress();

      await expect(registry.connect(developer).withdraw()).to.changeEtherBalances(
        ethers,
        [registryAddress, developer.address],
        [-cost, cost]
      );
      expect(await registry.pendingWithdrawals(developer.address)).to.equal(0);
    });

    it("emits Withdrawn", async function () {
      await expect(registry.connect(developer).withdraw())
        .to.emit(registry, "Withdrawn")
        .withArgs(developer.address, PRICE * 2n);
    });

    it("reverts when there is nothing to withdraw", async function () {
      await expect(registry.connect(stranger).withdraw()).to.be.revertedWith(
        "Nothing to withdraw"
      );
    });

    it("cannot be withdrawn twice", async function () {
      await registry.connect(developer).withdraw();
      await expect(registry.connect(developer).withdraw()).to.be.revertedWith(
        "Nothing to withdraw"
      );
    });

    it("leaves the contract balance at zero after all withdrawals", async function () {
      await registry.connect(developer).withdraw();
      const registryAddress = await registry.getAddress();
      expect(await ethers.provider.getBalance(registryAddress)).to.equal(0);
    });
  });

  describe("setModelActive", function () {
    beforeEach(async function () {
      await registerModel();
    });

    it("lets the creator deactivate and reactivate the model", async function () {
      await expect(registry.connect(developer).setModelActive(0, false))
        .to.emit(registry, "ModelStatusChanged")
        .withArgs(0, false);
      expect((await registry.modelRegistry(0)).isActive).to.equal(false);

      await registry.connect(developer).setModelActive(0, true);
      expect((await registry.modelRegistry(0)).isActive).to.equal(true);
    });

    it("lets the contract owner deactivate a model", async function () {
      await registry.connect(owner).setModelActive(0, false);
      expect((await registry.modelRegistry(0)).isActive).to.equal(false);
    });

    it("reverts for a stranger", async function () {
      await expect(registry.connect(stranger).setModelActive(0, false)).to.be.revertedWith(
        "Not creator or owner"
      );
    });

    it("reverts for a model that does not exist", async function () {
      await expect(registry.connect(owner).setModelActive(99, false)).to.be.revertedWith(
        "Model does not exist"
      );
    });
  });

  describe("setURI", function () {
    it("lets the owner change the metadata URI", async function () {
      await registry.connect(owner).setURI("https://example.org/{id}.json");
      expect(await registry.uri(0)).to.equal("https://example.org/{id}.json");
    });

    it("reverts for a non-owner", async function () {
      await expect(
        registry.connect(stranger).setURI("https://evil.example/{id}.json")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });
});
