import { ethers } from "ethers";
import fs from "fs";

async function main() {
  console.log("Conectando con el nodo local de [NuvyraHub](http://nuvyrahub.org/)...");

  // Proveedor JSON-RPC del nodo local de Hardhat
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Usar la clave privada de la Account #0 de Hardhat
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Usando la cuenta de despliegue/interacción: ${wallet.address}`);

  // Dirección del contrato desplegado
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Cargar el artefacto (ABI) compilado del contrato
  const artifactPath = "./artifacts/contracts/AIModelRegistry.sol/AIModelRegistry.json";
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`No se encontró el artefacto en ${artifactPath}. Asegúrate de compilar primero.`);
  }
  
  const artifactJson = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const registry = new ethers.Contract(contractAddress, artifactJson.abi, wallet);

  console.log("Registrando el modelo 'VisionForge Pro' de @VinciLabs...");

  // Parámetros del modelo
  const modelName = "VisionForge Pro";
  const creatorHandle = "@VinciLabs";
  const basePrice = ethers.parseEther("0.48");
  const initialSupply = 1000;

  // Ejecutar la transacción de registro en la blockchain local
  const tx = await registry.registerModel(modelName, creatorHandle, basePrice, initialSupply);
  console.log(`Transacción enviada con hash: ${tx.hash}`);

  // Esperar confirmación
  const receipt = await tx.wait();
  console.log(`¡Transacción confirmada en el bloque #${receipt.blockNumber}!`);

  // Parsear el evento emitido (ModelRegistered)
  const eventLog = receipt.logs
    .map((log) => {
      try {
        return registry.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "ModelRegistered");

  if (eventLog) {
    const tokenId = eventLog.args.tokenId;
    console.log("\n--- DETALLES DEL MODELO REGISTRADO ---");
    console.log(` Token ID emitido : ${tokenId.toString()}`);
    console.log(` Nombre del Modelo: ${eventLog.args.modelName}`);
    console.log(` Creador          : ${eventLog.args.creator}`);
    console.log(` Precio Base      : ${ethers.formatEther(eventLog.args.basePrice)} ETH`);
    console.log("----------------------------------------\n");
  } else {
    console.log("Aviso: Transacción exitosa, pero no se pudo parsear el evento.");
  }
}

main().catch((error) => {
  console.error("Error durante la interacción:", error);
  process.exitCode = 1;
});