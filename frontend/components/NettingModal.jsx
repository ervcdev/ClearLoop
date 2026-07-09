import { useState } from "react";

export default function NettingModal({ obligations, cycles, role, onCycleExecuted }) {
  const [proposal, setProposal] = useState(null);
  const [stage, setStage] = useState("idle"); // idle | proposed | signing | executing | done

  const handlePropose = () => {
    setProposal({
      ids: [1, 2, 3],
      deltas: [-70, 50, 20],
      description: "Ciclo A→B→C→A (demo)",
    });
    setStage("proposed");
  };

  const handleSign = () => {
    setStage("signing");
    setTimeout(() => setStage("executing"), 800);
  };

  const handleExecute = () => {
    setStage("done");
    if (onCycleExecuted) onCycleExecuted();
  };

  return (
    <div style={cardStyle}>
      <h3>Compensación (Netting)</h3>

      {stage === "idle" && (
        <div>
          <p style={{ color: "#64748b", marginBottom: 12 }}>
            Propón un ciclo de compensación para reducir las obligaciones
            multilaterales.
          </p>
          <button onClick={handlePropose} style={btnStyle}>
            Proponer Ciclo (Mock)
          </button>
        </div>
      )}

      {proposal && stage !== "idle" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <strong>Propuesta de ciclo</strong>
            <p style={{ fontSize: 14, marginTop: 4 }}>{proposal.description}</p>
            <pre style={{ fontSize: 12, background: "#f8fafc", padding: 8, borderRadius: 4 }}>
              {JSON.stringify({ ids: proposal.ids, deltas: proposal.deltas }, null, 2)}
            </pre>
          </div>

          {stage === "proposed" && (
            <button onClick={handleSign} style={btnStyle}>
              Firmar como {role.toUpperCase()}
            </button>
          )}

          {stage === "signing" && (
            <div>
              <p style={{ color: "#f59e0b" }}>⏳ Firmando...</p>
              <button onClick={handleExecute} style={btnStyle}>
                Ejecutar archiveAndNovate()
              </button>
            </div>
          )}

          {stage === "executing" && (
            <div>
              <p style={{ color: "#f59e0b" }}>⏳ Ejecutando compensación...</p>
              <button onClick={handleExecute} style={btnStyle}>
                Confirmar
              </button>
            </div>
          )}

          {stage === "done" && (
            <div style={{ color: "#22c55e", fontWeight: 600 }}>
              ✓ Ciclo compensado exitosamente
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
};

const btnStyle = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
