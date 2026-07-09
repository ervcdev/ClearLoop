import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { hardhat } from "viem/chains";

// ABI imports — in a real project these would come from Hardhat artifacts
const REGISTRY_ABI = [];
const NETTING_ENGINE_ABI = [];
const AUDIT_LOG_ABI = [];

const CONTRACT_ADDRESSES = {
  registry: "0x...",
  nettingEngine: "0x...",
  auditLog: "0x...",
};

export function useContract() {
  const [publicClient, setPublicClient] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const pc = createPublicClient({
          chain: hardhat,
          transport: http(),
        });
        const wc = createWalletClient({
          chain: hardhat,
          transport: custom(window.ethereum),
        });
        setPublicClient(pc);
        setWalletClient(wc);

        const [addr] = await wc.requestAddresses();
        setAccount(addr);
      }
    };
    init();
  }, []);

  const readRegistry = useCallback(
    async (functionName, args = []) => {
      if (!publicClient) return null;
      return publicClient.readContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName,
        args,
      });
    },
    [publicClient]
  );

  const writeRegistry = useCallback(
    async (functionName, args = []) => {
      if (!walletClient || !account) return null;
      return walletClient.writeContract({
        address: CONTRACT_ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName,
        args,
        account,
      });
    },
    [walletClient, account]
  );

  const readNetting = useCallback(
    async (functionName, args = []) => {
      if (!publicClient) return null;
      return publicClient.readContract({
        address: CONTRACT_ADDRESSES.nettingEngine,
        abi: NETTING_ENGINE_ABI,
        functionName,
        args,
      });
    },
    [publicClient]
  );

  const writeNetting = useCallback(
    async (functionName, args = []) => {
      if (!walletClient || !account) return null;
      return walletClient.writeContract({
        address: CONTRACT_ADDRESSES.nettingEngine,
        abi: NETTING_ENGINE_ABI,
        functionName,
        args,
        account,
      });
    },
    [walletClient, account]
  );

  const readAudit = useCallback(
    async (functionName, args = []) => {
      if (!publicClient) return null;
      return publicClient.readContract({
        address: CONTRACT_ADDRESSES.auditLog,
        abi: AUDIT_LOG_ABI,
        functionName,
        args,
      });
    },
    [publicClient]
  );

  return {
    account,
    publicClient,
    walletClient,
    readRegistry,
    writeRegistry,
    readNetting,
    writeNetting,
    readAudit,
  };
}
