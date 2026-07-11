#!/bin/bash
set -euo pipefail
source .env

curl -s -X POST "$CANTON_AUTH_URL" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=client_credentials' \
  --data "client_id=$CANTON_CLIENT_ID" \
  --data "client_secret=$CANTON_CLIENT_SECRET" \
  --data 'audience=validator-devnet-m2m' \
  --data 'scope=daml_ledger_api' | jq -r '.access_token'
