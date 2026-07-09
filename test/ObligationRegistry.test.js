const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ObligationRegistry", function () {
  let registry, owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const ObligationRegistry = await ethers.getContractFactory("ObligationRegistry");
    registry = await ObligationRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("should register an obligation", async function () {
    const commitment = ethers.keccak256(ethers.toUtf8Bytes("secret"));
    const tx = await registry.registerObligation(alice.address, bob.address, 100, commitment);
    const receipt = await tx.wait();

    const ob = await registry.getObligation(1);
    expect(ob.creditor).to.equal(alice.address);
    expect(ob.debtor).to.equal(bob.address);
    expect(ob.amount).to.equal(100);
    expect(ob.commitment).to.equal(commitment);
    expect(ob.active).to.be.true;
  });

  it("should reject self-obligation", async function () {
    await expect(
      registry.registerObligation(alice.address, alice.address, 100, ethers.ZeroHash)
    ).to.be.revertedWith("Self-obligation not allowed");
  });

  it("should reject zero amount", async function () {
    await expect(
      registry.registerObligation(alice.address, bob.address, 0, ethers.ZeroHash)
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("should deactivate an obligation", async function () {
    await registry.registerObligation(alice.address, bob.address, 100, ethers.ZeroHash);
    await registry.connect(alice).deactivateObligation(1);
    const ob = await registry.getObligation(1);
    expect(ob.active).to.be.false;
  });

  it("should return active obligations for a party", async function () {
    await registry.registerObligation(alice.address, bob.address, 100, ethers.ZeroHash);
    await registry.registerObligation(bob.address, alice.address, 50, ethers.ZeroHash);

    const aliceActive = await registry.getActiveObligations(alice.address);
    expect(aliceActive.length).to.equal(2);
  });

  it("should track obligation count", async function () {
    expect(await registry.obligationCount()).to.equal(0);
    await registry.registerObligation(alice.address, bob.address, 100, ethers.ZeroHash);
    expect(await registry.obligationCount()).to.equal(1);
  });
});
