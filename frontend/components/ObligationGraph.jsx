export default function ObligationGraph({ obligations, role }) {
  if (!obligations || obligations.length === 0) {
    return (
      <div style={cardStyle}>
        <h3>Grafo de Obligaciones</h3>
        <p style={{ color: "#94a3b8" }}>
          No hay obligaciones registradas.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3>Grafo de Obligaciones</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {obligations.map((ob, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              opacity: ob.active ? 1 : 0.5,
            }}
          >
            <strong>{ob.creditor}</strong>
            <span style={{ margin: "0 8px" }}>→</span>
            <strong>{ob.debtor}</strong>
            <span style={{ marginLeft: 12, color: "#64748b" }}>
              {ob.amount} USDC
            </span>
            {!ob.active && (
              <span style={{ marginLeft: 8, color: "#22c55e", fontSize: 12 }}>
                ✓ Compensada
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "white",
};
