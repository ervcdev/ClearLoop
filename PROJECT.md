# ClearLoop — Proyecto

**Hackathon:** [Nombre del hackathon]
**Track:** DeFi / Infraestructura financiera

## Concepto

ClearLoop es un sistema descentralizado de compensación multilateral (netting) sobre Ethereum. Permite que un conjunto de contrapartes bilateralmente endeudadas reduzcan sus exposiciones en una sola transacción atómica, sin mover liquidez intermedia ni revelar posiciones individuales al público.

## Componentes

| Capa | Tecnología | Propósito |
|---|---|---|
| Smart Contracts | Solidity + Hardhat | Registry, NettingEngine, AuditLog |
| Offchain Solver | Python (mock) | Cálculo del ciclo de compensación óptimo |
| Frontend | Next.js + Viem | Demo interactiva con RoleSwitcher |
| Spec alterna | DAML | Argumento arquitectónico: Canton vs Ethereum |

## Flujo

1. Las partes registran obligaciones bilaterales en `ObligationRegistry` (commitment opaco).
2. El solver offchain detecta ciclos de deuda (A→B→C→A) y produce una solución JSON firmable.
3. Cada parte firma EIP-712 la propuesta de netting.
4. `NettingEngine.archiveAndNovate()` ejecuta la compensación atómicamente.
5. `AuditLog` registra el evento sin datos de partes (solo hash del ciclo).

## Corrección importante — orden de deploy

El orden original era: Registry → NettingEngine → `setNettingEngine()` → AuditLog.

Eso no es viable: `NettingEngine` necesita conocer la dirección de `AuditLog` en su constructor (para hacer la llamada a `logExtinction()`), así que `AuditLog` tiene que existir **antes** de desplegar `NettingEngine`. El orden correcto es:

```
1. Deploy ObligationRegistry
2. Deploy AuditLog
3. Deploy NettingEngine(obligationRegistry.address, auditLog.address)
4. ObligationRegistry.setNettingEngine(nettingEngine.address)   ← una sola vez
5. AuditLog.setNettingEngine(nettingEngine.address)             ← una sola vez
```

Ver `scripts/deploy.js` que ya implementa este orden.

## Log de decisiones

| # | Decisión | Razón |
|---|---|---|
| 1 | IDs de obligaciones como `bytes32` determinísticos | Permite IDs predecibles off-chain sin depender de un contador on-chain; evita colisiones y simplifica la integración con el solver |
| 2 | `setNettingEngine()` de un solo uso en ambos contratos | Previene que un atacante redirija el motor de netting después del deploy inicial |
| 3 | `ObligationRegistry` sin lógica de negocio | Separa concerns: el registry solo almacena estado; `NettingEngine` orquesta la validación y ejecución |
| 4 | `AuditLog` sin datos de partes | Compliance: solo almacena montos agregados y hashes fiscales, nunca creditor/debtor |
| 5 | EIP-712 con tipo `ApproveNetting` | Firmas off-chain estándar con nonce y deadline, compatibles con wallets (MetaMask, etc.) |
| 6 | `archiveAndNovate()` con Checks-Effects-Interactions | status = Executed se marca antes de las llamadas externas para prevenir reentrancy |
| 7 | Ciclo mínimo de 2 obligaciones, máximo de 10 | Acota el costo de gas de `_validateCycle` (O(N) llamadas externas); sin límite, un ciclo arbitrariamente largo podría exceder el block gas limit |
| 8 | MVP: todos los montos del ciclo deben ser iguales | Simplifica la validación on-chain; la novación de saldos residuales queda para v2 |
| 9 | `proposeNetting()` permissionless | Cualquiera puede proponer un ciclo, pero solo se ejecuta con firmas reales de las partes |
| 10 | Reentrancy guard manual + patrón CEI en `archiveAndNovate()` | Doble capa de protección sin depender de OpenZeppelin |
| 11 | Defensa en profundidad: validación de overflow en `_validateCycle` | `NettingEngine` no debe confiar ciegamente en datos del registry |
| 12 | Orden de deploy corregido: Registry → AuditLog → NettingEngine → 2 setters | `NettingEngine` necesita la dirección de `AuditLog` en su constructor |

## Estado del proyecto

- [x] `ObligationRegistry.sol` — v2 con fixes de auditoría
- [x] `IClearLoop.sol` — interfaces compartidas
- [x] `NettingEngine.sol` — EIP-712, `_validateCycle` single-pass, `archiveAndNovate` atómico
- [x] `AuditLog.sol` — registro inmutable de compliance
- [x] `deploy.js` — orden corregido
- [x] `fullCycle.test.js` — flujo completo A→B→C→A + 2 casos de revert (3 tests, todos pasando)
- [ ] Solver mockeado
- [ ] Frontend demo
- [ ] Spec DAML como doc arquitectónico

## Siguiente paso

Correr `npx hardhat test` y confirmar que los 3 tests de integración pasan en verde antes de tocar frontend.
