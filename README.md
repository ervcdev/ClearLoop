# ClearLoop

Compensación multilateral descentralizada sobre Ethereum.

## Deploy

```bash
npm install
npx hardhat compile
node scripts/deploy.js
```

## Test

```bash
npx hardhat test
npx hardhat test test/integration/fullCycle.test.js
```

## Stack

- Solidity + Hardhat
- Viem (frontend)
- Python (solver mock)
- DAML spec (arquitectura alternativa)

## Licencia

MIT
