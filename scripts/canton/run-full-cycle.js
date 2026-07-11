// scripts/canton/run-full-cycle.js
// Requiere Node 18+ (fetch nativo). Correr con:
//   node scripts/canton/run-full-cycle.js

require("dotenv").config();

const {
  CANTON_LEDGER_REST,
  CANTON_AUTH_URL,
  CANTON_CLIENT_ID,
  CANTON_CLIENT_SECRET,
} = process.env;

// El PACKAGE_ID se obtiene del resultado de upload-dar.sh — pegalo acá
// una vez que subas el DAR (aparece en el campo "mainPackageId" de la
// respuesta de POST /v2/packages).
const PACKAGE_ID = "REEMPLAZAR_CON_EL_PACKAGE_ID_REAL";

// Completar con los party IDs reales que te devuelva discover.sh
const PARTIES = {
  alice: "REEMPLAZAR",
  bob: "REEMPLAZAR",
  carol: "REEMPLAZAR",
  nettingEngine: "REEMPLAZAR",
  regulator: "REEMPLAZAR",
};

let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(CANTON_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CANTON_CLIENT_ID,
      client_secret: CANTON_CLIENT_SECRET,
      audience: "validator-devnet-m2m",
      scope: "daml_ledger_api",
    }),
  });

  if (!res.ok) throw new Error(`Auth falló: ${res.status} ${await res.text()}`);

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 28800) * 1000 - 5 * 60 * 1000;
  return cachedToken;
}

async function ledgerFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${CANTON_LEDGER_REST}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function templateId(entityName) {
  return `${PACKAGE_ID}:Obligation:${entityName}`;
}

async function submitCreate(templateName, createArguments, actAs, commandId) {
  return ledgerFetch("/v2/commands/submit-and-wait", {
    method: "POST",
    body: JSON.stringify({
      commands: [
        {
          CreateCommand: {
            templateId: templateId(templateName),
            createArguments,
          },
        },
      ],
      commandId,
      actAs: [actAs],
      readAs: [],
      userId: "clearloop-solver",
      deduplicationPeriod: { Empty: {} },
    }),
  });
}

async function submitExercise(templateName, contractId, choiceName, choiceArgument, actAs, commandId) {
  return ledgerFetch("/v2/commands/submit-and-wait", {
    method: "POST",
    body: JSON.stringify({
      commands: [
        {
          ExerciseCommand: {
            templateId: templateId(templateName),
            contractId,
            choice: choiceName,
            choiceArgument,
          },
        },
      ],
      commandId,
      actAs: Array.isArray(actAs) ? actAs : [actAs],
      readAs: [],
      userId: "clearloop-solver",
      deduplicationPeriod: { Empty: {} },
    }),
  });
}

async function main() {
  console.log("== Paso 1: crear y aceptar las 3 ObligationProposal ==");

  const proposalAB = await submitCreate(
    "ObligationProposal",
    {
      creditor: PARTIES.alice,
      debtor: PARTIES.bob,
      nettingEngine: PARTIES.nettingEngine,
      amount: "100000.0",
      obligationId: "obligation-A-B",
    },
    PARTIES.alice,
    `create-ab-${Date.now()}`
  );
  console.log("ObligationProposal A->B creada:", proposalAB);

  console.log(
    "\n>>> Corré esto hasta acá primero, pegame la respuesta completa de " +
      "submit-and-wait, y te completo el resto del script (Accept, " +
      "NettingProposal, Approve x3, Execute) con la forma exacta de " +
      "extraer el contractId que tu validador está devolviendo."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
