import { useState } from "react";

const ROLES = [
  { id: "alice", label: "Alice", color: "#3b82f6" },
  { id: "bob", label: "Bob", color: "#22c55e" },
  { id: "carol", label: "Carol", color: "#f59e0b" },
  { id: "auditor", label: "Auditor", color: "#8b5cf6" },
];

export default function RoleSwitcher({ currentRole, onRoleChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 16,
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
      }}
    >
      <span style={{ fontWeight: 600, marginRight: 8, alignSelf: "center" }}>
        Actuando como:
      </span>
      {ROLES.map((role) => (
        <button
          key={role.id}
          onClick={() => onRoleChange(role.id)}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: currentRole === role.id
              ? `2px solid ${role.color}`
              : "1px solid #cbd5e1",
            background: currentRole === role.id ? role.color : "white",
            color: currentRole === role.id ? "white" : "#334155",
            fontWeight: currentRole === role.id ? 700 : 400,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
