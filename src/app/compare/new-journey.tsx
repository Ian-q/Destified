"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJourneyAction } from "@/lib/deals/journey-actions";

export function NewJourney() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLabel.trim() || !toLabel.trim()) {
      setError("From and To are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createJourneyAction({
          fromLabel: fromLabel.trim(),
          toLabel: toLabel.trim(),
          departDate: departDate || null,
          returnDate: returnDate || null,
          notes: null,
        });
        router.push(`/compare/${id}`);
      } catch {
        setError("Could not create journey — please retry.");
      }
    });
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, marginBottom: 18, fontWeight: 500 }}>
        New journey
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>From</label>
            <input
              type="text"
              value={fromLabel}
              onChange={(e) => setFromLabel(e.target.value)}
              placeholder="e.g. JFK"
              style={inputStyle}
              required
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>To</label>
            <input
              type="text"
              value={toLabel}
              onChange={(e) => setToLabel(e.target.value)}
              placeholder="e.g. NRT"
              style={inputStyle}
              required
            />
          </div>
        </div>
        <div style={rowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Depart (optional)</label>
            <input
              type="date"
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return (optional)</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>{error}</div>
        )}
        <button type="submit" disabled={pending} style={primaryBtnStyle}>
          {pending ? "Creating…" : "Create journey"}
        </button>
      </form>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  padding: 28,
  marginBottom: 24,
  boxShadow: "0 2px 12px rgba(0,0,0,.04)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  marginBottom: 14,
  flexWrap: "wrap",
};

const fieldStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 160,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 500,
  color: "var(--mocha)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(253,251,247,.7)",
  border: "1.5px solid rgba(148,139,130,.18)",
  borderRadius: 10,
  padding: "11px 14px",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--charcoal)",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 26px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)",
  color: "var(--cream)",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};
