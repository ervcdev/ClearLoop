const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. ObligationRegistry
  const ObligationRegistry = await hre.ethers.getContractFactory("ObligationRegistry");
  const registry = await ObligationRegistry.deploy();
  await registry.waitForDeployment();
  console.log("ObligationRegistry:", await registry.getAddress());

  // 2. AuditLog
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy();
  await auditLog.waitForDeployment();
  console.log("AuditLog:", await auditLog.getAddress());

  // 3. NettingEngine (necesita las dos direcciones anteriores en el constructor)
  const NettingEngine = await hre.ethers.getContractFactory("NettingEngine");
  const nettingEngine = await NettingEngine.deploy(
    await registry.getAddress(),
    await auditLog.getAddress()
  );
  await nettingEngine.waitForDeployment();
  console.log("NettingEngine:", await nettingEngine.getAddress());

  // 4. Autorizar NettingEngine en ObligationRegistry — una sola vez
  const tx1 = await registry.setNettingEngine(await nettingEngine.getAddress());
  await tx1.wait();
  console.log("ObligationRegistry.setNettingEngine() OK");

  // 5. Autorizar NettingEngine en AuditLog — una sola vez
  const tx2 = await auditLog.setNettingEngine(await nettingEngine.getAddress());
  await tx2.wait();
  console.log("AuditLog.setNettingEngine() OK");

  console.log("\nDeploy completo. Direcciones para .env / frontend:");
  console.log({
    OBLIGATION_REGISTRY: await registry.getAddress(),
    AUDIT_LOG: await auditLog.getAddress(),
    NETTING_ENGINE: await nettingEngine.getAddress(),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
