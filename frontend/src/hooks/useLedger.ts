import { Ledger } from "@c7-digital/ledger";
import { useState, useEffect, useCallback } from "react";

const LEDGER_ENDPOINT =
  process.env.NEXT_PUBLIC_LEDGER_ENDPOINT ||
  "https://ledger-api.validator.devnet.sandbox.fivenorth.io";

const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_URL ||
  "https://auth.sandbox.fivenorth.io/application/o/token/";

const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || "validator-devnet-m2m";
const CLIENT_SECRET = process.env.NEXT_PUBLIC_CLIENT_SECRET || "";

async function fetchJWT(): Promise<string> {
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: "validator-devnet-m2m",
      scope: "daml_ledger_api",
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

export function useLedger() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initLedger = useCallback(async () => {
    try {
      setLoading(true);
      const jwt = await fetchJWT();
      setToken(jwt);

      const l = new Ledger({
        token: jwt,
        httpBaseUrl: LEDGER_ENDPOINT,
      });

      setLedger(l);
      setError(null);
    } catch (err) {
      setError(String(err));
      console.error("Ledger init failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initLedger();
    const interval = setInterval(initLedger, 7 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [initLedger]);

  return { ledger, token, loading, error, refresh: initLedger };
}
