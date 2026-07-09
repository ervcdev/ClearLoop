export default function AuditTable({ entries }) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "white",
      }}
    >
      <h3>Audit Log</h3>
      <p style={{ color: "#64748b", marginBottom: 12 }}>
        Registro público de eventos de compensación. Sin datos de partes.
      </p>

      {(!entries || entries.length === 0) ? (
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          No hay entradas de auditoría.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Cycle Hash</th>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={tdStyle}>{entry.id}</td>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                  {entry.cycleHash?.slice(0, 20)}...
                </td>
                <td style={tdStyle}>
                  {entry.timestamp
                    ? new Date(Number(entry.timestamp) * 1000).toLocaleString()
                    : "-"}
                </td>
                <td style={tdStyle}>{entry.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  color: "#64748b",
  fontWeight: 600,
};

const tdStyle = {
  padding: "8px 12px",
  color: "#334155",
};
