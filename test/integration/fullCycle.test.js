const { expect } = require("chai");
const hre = require("hardhat");

describe("ClearLoop — flujo completo A→B→C→A", function () {
  let registry, auditLog, nettingEngine;
  let alice, bob, carol;
  let chainId;

  const AMOUNT = hre.ethers.parseEther("100");

  beforeEach(async function () {
    [, alice, bob, carol] = await hre.ethers.getSigners();

    const ObligationRegistry = await hre.ethers.getContractFactory("ObligationRegistry");
    registry = await ObligationRegistry.deploy();
    await registry.waitForDeployment();

    const AuditLog = await hre.ethers.getContractFactory("AuditLog");
    auditLog = await AuditLog.deploy();
    await auditLog.waitForDeployment();

    const NettingEngine = await hre.ethers.getContractFactory("NettingEngine");
    nettingEngine = await NettingEngine.deploy(
      await registry.getAddress(),
      await auditLog.getAddress()
    );
    await nettingEngine.waitForDeployment();

    await registry.setNettingEngine(await nettingEngine.getAddress());
    await auditLog.setNettingEngine(await nettingEngine.getAddress());

    chainId = (await hre.ethers.provider.getNetwork()).chainId;
  });

  async function signApproval(signer, proposalId) {
    const nonce = await nettingEngine.nonces(signer.address);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const domain = {
      name: "ClearLoop NettingEngine",
      version: "1",
      chainId,
      verifyingContract: await nettingEngine.getAddress(),
    };

    const types = {
      ApproveNetting: [
        { name: "proposalId", type: "uint256" },
        { name: "signer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const value = { proposalId, signer: signer.address, nonce, deadline };
    const signature = await signer.signTypedData(domain, types, value);
    const sig = hre.ethers.Signature.from(signature);

    return { nonce, deadline, v: sig.v, r: sig.r, s: sig.s };
  }

  it("ejecuta el ciclo completo: submit → propose → 3 firmas → archiveAndNovate", async function () {
    const salt1 = hre.ethers.randomBytes(32);
    const salt2 = hre.ethers.randomBytes(32);
    const salt3 = hre.ethers.randomBytes(32);

    // Paso 1 — cada empresa registra su obligación
    const tx1 = await registry.connect(alice).submitObligation(bob.address, AMOUNT, salt1);
    const id1 = (await tx1.wait()).logs[0].args.obligationId;

    const tx2 = await registry.connect(bob).submitObligation(carol.address, AMOUNT, salt2);
    const id2 = (await tx2.wait()).logs[0].args.obligationId;

    const tx3 = await registry.connect(carol).submitObligation(alice.address, AMOUNT, salt3);
    const id3 = (await tx3.wait()).logs[0].args.obligationId;

    // Paso 2 — proponer el ciclo (permissionless)
    const proposeTx = await nettingEngine.proposeNetting([id1, id2, id3]);
    const proposeReceipt = await proposeTx.wait();
    const proposalId = proposeReceipt.logs.find((l) => l.fragment?.name === "NettingProposed").args
      .proposalId;

    // Paso 3 — las 3 partes firman off-chain (EIP-712) y aprueban on-chain
    for (const signer of [alice, bob, carol]) {
      const { nonce, deadline, v, r, s } = await signApproval(signer, proposalId);
      await nettingEngine.approveProposal(proposalId, signer.address, nonce, deadline, v, r, s);
    }

    const proposal = await nettingEngine.getProposal(proposalId);
    expect(proposal.approvalCount).to.equal(3);

    // Paso 4 — ejecución atómica
    await expect(nettingEngine.archiveAndNovate(proposalId))
      .to.emit(nettingEngine, "NettingExecuted");

    // Paso 5 — verificar que las 3 obligaciones quedaron liquidadas
    const ob1 = await registry.getObligation(id1);
    const ob2 = await registry.getObligation(id2);
    const ob3 = await registry.getObligation(id3);
    expect(ob1.settled).to.be.true;
    expect(ob2.settled).to.be.true;
    expect(ob3.settled).to.be.true;

    // Paso 6 — el AuditLog debe tener exactamente 1 entrada
    expect(await auditLog.getAuditTrailLength()).to.equal(1);
  });

  it("revierte archiveAndNovate si falta al menos una firma", async function () {
    const salt1 = hre.ethers.randomBytes(32);
    const salt2 = hre.ethers.randomBytes(32);

    const tx1 = await registry.connect(alice).submitObligation(bob.address, AMOUNT, salt1);
    const id1 = (await tx1.wait()).logs[0].args.obligationId;
    const tx2 = await registry.connect(bob).submitObligation(alice.address, AMOUNT, salt2);
    const id2 = (await tx2.wait()).logs[0].args.obligationId;

    const proposeTx = await nettingEngine.proposeNetting([id1, id2]);
    const proposeReceipt = await proposeTx.wait();
    const proposalId = proposeReceipt.logs.find((l) => l.fragment?.name === "NettingProposed").args
      .proposalId;

    // Solo Alice firma — Bob no
    const { nonce, deadline, v, r, s } = await signApproval(alice, proposalId);
    await nettingEngine.approveProposal(proposalId, alice.address, nonce, deadline, v, r, s);

    await expect(nettingEngine.archiveAndNovate(proposalId)).to.be.revertedWith(
      "NettingEngine: missing approvals"
    );
  });

  it("revierte proposeNetting si el ciclo no balancea (Sigma-Delta != 0)", async function () {
    const salt1 = hre.ethers.randomBytes(32);
    const salt2 = hre.ethers.randomBytes(32);

    const tx1 = await registry.connect(alice).submitObligation(bob.address, AMOUNT, salt1);
    const id1 = (await tx1.wait()).logs[0].args.obligationId;
    const tx2 = await registry
      .connect(bob)
      .submitObligation(alice.address, hre.ethers.parseEther("50"), salt2);
    const id2 = (await tx2.wait()).logs[0].args.obligationId;

    await expect(nettingEngine.proposeNetting([id1, id2])).to.be.revertedWith(
      "NettingEngine: amounts must match in MVP"
    );
  });
});
