#!/bin/bash
set -euo pipefail
source .env
TOKEN=$(bash scripts/canton/get-token.sh)

DAR_PATH="daml-spec/.daml/dist/clearloop-daml-spec-0.1.0.dar"

if [ ! -f "$DAR_PATH" ]; then
  echo "No se encontró el DAR en $DAR_PATH — corré 'daml build' desde daml-spec/ primero."
  exit 1
fi

curl -s -X POST "$CANTON_LEDGER_REST/v2/packages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$DAR_PATH" | jq
