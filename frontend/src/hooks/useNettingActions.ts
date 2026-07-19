import { useState } from "react";
import { Ledger } from "@c7-digital/ledger";
import { ContractId } from "@daml/types";
import {
  NettingProposal,
  NettingProposal_Approve,
  NettingProposal_Execute,
} from "../../generated/clearloop-daml-spec-0.1.0/lib/ClearLoop/Obligation";

export function useNettingActions(ledger: Ledger | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveProposal = async (
    contractId: ContractId<NettingProposal>,
    approver: string
  ): Promise<boolean> => {
    if (!ledger) return false;
    setLoading(true);
    try {
      await ledger.exercise(
        NettingProposal.NettingProposal_Approve,
        contractId,
        { approver } as NettingProposal_Approve
      );
      setError(null);
      return true;
    } catch (err) {
      setError(String(err));
      console.error("Error approving proposal:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const executeProposal = async (
    contractId: ContractId<NettingProposal>,
    fiscalHash: string
  ): Promise<boolean> => {
    if (!ledger) return false;
    setLoading(true);
    try {
      await ledger.exercise(
        NettingProposal.NettingProposal_Execute,
        contractId,
        { fiscalHash } as NettingProposal_Execute
      );
      setError(null);
      return true;
    } catch (err) {
      setError(String(err));
      console.error("Error executing proposal:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { approveProposal, executeProposal, loading, error };
}
