import { expect } from "chai";
import hre from "hardhat";

describe("AIModelRegistry (NuvyraHub PoC)", function () {
  let registry;
  let owner;
  let developer;

  beforeEach(async function () {
    const connection = await hre.network.create();
    const { ethers } = connection;
    
    [owner, developer] = await ethers.getSigners();

    const AIModelRegistry = await ethers.getContractFactory("AIModelRegistry");
    registry = await AIModelRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("Debe registrar un nuevo modelo de IA correctamente y emitir el evento ModelRegistered", async function () {
    const connection = await hre.network.create();
    const { ethers } = connection;

    const modelName = "VisionForge Pro";
    const creatorHandle = "@VinciLabs";
    const basePrice = ethers.parseEther("0.48");
    const initialSupply = 1000;

    // Verificar que la transacción se ejecute con éxito y emita el evento con los argumentos exactos
    await expect(
      registry.connect(developer).registerModel(modelName, creatorHandle, basePrice, initialSupply)
    )
      .to.emit(registry, "ModelRegistered")
      .withArgs(0, modelName, developer.address, basePrice);
  });
});