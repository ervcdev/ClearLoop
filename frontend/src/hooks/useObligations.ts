import { useState, useEffect } from "react";
import { Ledger, CreateEvent } from "@c7-digital/ledger";
import { Obligation, ObligationProposal, NettingProposal } from "../../generated/clearloop-daml-spec-0.1.0/lib/ClearLoop/Obligation";

export function useObligations(ledger: Ledger | null, partyId: string) {
  const [obligations, setObligations] = useState<CreateEvent<Obligation>[]>([]);
  const [proposals, setProposals] = useState<CreateEvent<ObligationProposal>[]>([]);
  const [nettingProposals, setNettingProposals] = useState<CreateEvent<NettingProposal>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ledger || !partyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const obs = await ledger.query(Obligation);
        const props = await ledger.query(ObligationProposal);
        const netProps = await ledger.query(NettingProposal);

        setObligations(obs);
        setProposals(props);
        setNettingProposals(netProps);
        setError(null);
      } catch (err) {
        setError(String(err));
        console.error("Error fetching contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [ledger, partyId]);

  return { obligations, proposals, nettingProposals, loading, error };
}
