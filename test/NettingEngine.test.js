const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NettingEngine", function () {
  let registry, netting, owner, alice, bob, carol;

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const ObligationRegistry = await ethers.getContractFactory("ObligationRegistry");
    registry = await ObligationRegistry.deploy();
    await registry.waitForDeployment();

    const NettingEngine = await ethers.getContractFactory("NettingEngine");
    netting = await NettingEngine.deploy(await registry.getAddress());
    await netting.waitForDeployment();

    // Register obligations: Alice->Bob 100, Bob->Carol 50, Carol->Alice 30
    await registry.registerObligation(alice.address, bob.address, 100, ethers.ZeroHash);
    await registry.registerObligation(bob.address, carol.address, 50, ethers.ZeroHash);
    await registry.registerObligation(carol.address, alice.address, 30, ethers.ZeroHash);
  });

  it("should propose a cycle", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const tx = await netting.proposeCycle([1, 2, 3], [-70, 50, 20], deadline);
    const receipt = await tx.wait();

    const cycle = await netting.getCycle(1);
    expect(cycle.deadline).to.equal(deadline);
    expect(cycle.executed).to.be.false;
  });

  it("should reject a cycle with mismatched arrays", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await expect(
      netting.proposeCycle([1, 2], [-70, 50, 20], deadline)
    ).to.be.revertedWith("Array length mismatch");
  });

  it("should allow parties to sign a cycle", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await netting.proposeCycle([1, 2, 3], [-70, 50, 20], deadline);

    const cycleHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256[]", "int256[]", "uint256"],
      [1, [1, 2, 3], [-70, 50, 20], deadline]
    );

    // Sign with alice, bob, carol
    for (const signer of [alice, bob, carol]) {
      const sig = await signer.signMessage(ethers.toBeArray(cycleHash));
      await netting.connect(signer).signCycle(1, sig);
    }

    // After all sign, archiveAndNovate
    await netting.archiveAndNovate(1);

    // Verify obligations are deactivated
    const ob1 = await registry.getObligation(1);
    const ob2 = await registry.getObligation(2);
    const ob3 = await registry.getObligation(3);
    expect(ob1.active).to.be.false;
    expect(ob2.active).to.be.false;
    expect(ob3.active).to.be.false;
  });

  it("should reject execution without all signatures", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    await netting.proposeCycle([1, 2, 3], [-70, 50, 20], deadline);

    await expect(
      netting.archiveAndNovate(1)
    ).to.be.revertedWith("Not all parties signed");
  });
});
