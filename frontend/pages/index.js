import { useState } from "react";
import RoleSwitcher from "../components/RoleSwitcher";
import ObligationGraph from "../components/ObligationGraph";
import NettingModal from "../components/NettingModal";
import AuditTable from "../components/AuditTable";

export default function Home() {
  const [currentRole, setCurrentRole] = useState("alice");
  const [obligations, setObligations] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>ClearLoop</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Compensación multilateral descentralizada
      </p>

      <RoleSwitcher currentRole={currentRole} onRoleChange={setCurrentRole} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
        <ObligationGraph obligations={obligations} role={currentRole} />
        <NettingModal
          obligations={obligations}
          cycles={cycles}
          role={currentRole}
          onCycleExecuted={() => {}}
        />
      </div>

      <AuditTable entries={auditEntries} />
    </div>
  );
}
