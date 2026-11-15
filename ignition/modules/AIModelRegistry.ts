import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Declarative deployment of the AIModelRegistry contract.
// The constructor takes no arguments: the deployer becomes the contract owner.
export default buildModule("AIModelRegistryModule", (m) => {
  const registry = m.contract("AIModelRegistry");

  return { registry };
});
