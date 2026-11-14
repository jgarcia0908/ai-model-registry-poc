import hre from "hardhat";

async function main() {
	console.log("Iniciando despliegue de AIModelRegistry (NuvyraHub PoC)...");

	// Crear la conexión de red explícitamente (Requerido en Hardhat 3)
	const connection = await hre.network.create();
	const { ethers } = connection;

	// Obtener la fábrica del contrato inteligente
	const AIModelRegistry = await ethers.getContractFactory("AIModelRegistry");

	console.log("Desplegando contrato...");
	const registry = await AIModelRegistry.deploy();

	await registry.waitForDeployment();

	const address = await registry.getAddress();
	console.log("¡Contrato desplegado con éxito!");
	console.log(`Dirección del contrato: ${address}`);
}

main().catch((error) => {
	console.error("Error durante el despliegue:", error);
	process.exitCode = 1;
});
