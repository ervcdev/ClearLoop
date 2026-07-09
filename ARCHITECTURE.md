# Arquitectura: Ethereum vs Canton vs DB Privada

## Enfoque elegido: Ethereum + Solidity

| Dimensión | ClearLoop (Ethereum) | Canton (DAML) | DB Privada Centralizada |
|---|---|---|---|
| Finalidad | On-chain, inmutable | Acuerdo bilateral, finalidad diferida | Reversible por admin |
| Privacidad | Compromisos opacos (hash + sal), revelación solo en netting | Privacidad nativa por contrato DAML | Total, pero sin transparencia |
| Costo | Gas por operación | Sin gas, pero requiere operadores de nodo | Infraestructura propia |
| Confianza | Trustless (Ethereum) | Confianza en operadores Canton | Confianza total en operador |
| Auditabilidad | AuditLog público sin datos de partes | Auditabilidad entre partes solamente | Auditabilidad controlada |

## Por qué Ethereum

1. **Finalidad inmediata**: archiveAndNovate() es un paso atómico que no requiere acuerdo posterior.
2. **Auditabilidad pública**: El AuditLog prueba que el netting ocurrió sin revelar posiciones.
3. **Composabilidad DeFi**: Las obligaciones pueden integrarse con otros protocolos on-chain.
4. **EIP-712**: Firmas legibles por el usuario para autorizar la compensación.

## Por qué no Canton

Canton ofrece privacidad superior, pero requiere infraestructura de operadores y la finalidad no es inmediata. Para un hackathon, Ethereum es más accesible y demostrable. El spec DAML en `daml-spec/` documenta cómo sería la alternativa.

## Por qué no DB centralizada

No hay diferenciación técnica. El valor del proyecto está en la compensación trustless.
