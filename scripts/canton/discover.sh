#!/bin/bash
set -euo pipefail
source .env
TOKEN=$(bash scripts/canton/get-token.sh)

echo "== Versión del ledger =="
curl -s "$CANTON_LEDGER_REST/v2/version" -H "Authorization: Bearer $TOKEN" | jq

echo "== Ledger end (offset actual) =="
curl -s "$CANTON_LEDGER_REST/v2/state/ledger-end" -H "Authorization: Bearer $TOKEN" | jq

echo "== Parties ya existentes visibles para este client =="
curl -s "$CANTON_LEDGER_REST/v2/parties" -H "Authorization: Bearer $TOKEN" | jq

echo "== Usuarios (puede fallar si el client no tiene permiso admin) =="
curl -s "$CANTON_LEDGER_REST/v2/users" -H "Authorization: Bearer $TOKEN" | jq
