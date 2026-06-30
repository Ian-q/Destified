"use client";

import { useState, useTransition } from "react";
import { upsertCurrencyAction, deleteCurrencyAction } from "@/lib/deals/journey-actions";
import { toast } from "@/components/destified/toast";
import type { PointCurrency } from "@/lib/deals/types";

export function CurrencyEditor({ initial }: { initial: PointCurrency[] }) {
  const [rows, setRows] = useState<PointCurrency[]>(initial);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [cpp, setCpp] = useState("");
  const [pending, start] = useTransition();

  const add = () => {
    const cppNum = Number(cpp);
    if (!code.trim() || !name.trim() || !(cppNum > 0)) {
      toast("Enter a code, a name, and a positive cents-per-point.");
      return;
    }
    start(async () => {
      try {
        const saved = await upsertCurrencyAction({ code: code.trim().toUpperCase(), name: name.trim(), defaultCpp: cppNum });
        toast("Currency saved");
        setRows((r) => {
          const next = r.filter((x) => x.code !== saved.code);
          next.push(saved);
          return next.sort((a, b) => a.code.localeCompare(b.code));
        });
        setCode(""); setName(""); setCpp("");
      } catch {
        toast("Couldn't save — please retry");
      }
    });
  };

  const remove = (cur: PointCurrency) => start(async () => {
    try {
      await deleteCurrencyAction(cur.id);
      setRows((r) => r.filter((x) => x.id !== cur.id));
    } catch {
      toast("Couldn't delete — please retry");
    }
  });

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {rows.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <strong style={{ minWidth: 110 }}>{c.code}</strong>
            <span style={{ flex: 1, color: "var(--mocha)" }}>{c.name}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{c.defaultCpp}¢/pt</span>
            <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c.code}`} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--mocha)" }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE (AMEX_MR)" style={miniInput} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={miniInput} />
        <input value={cpp} onChange={(e) => setCpp(e.target.value)} inputMode="decimal" placeholder="¢/pt" style={{ ...miniInput, maxWidth: 90 }} />
        <button type="button" onClick={add} disabled={pending} style={addBtn}>Add</button>
      </div>
    </div>
  );
}

const miniInput: React.CSSProperties = { flex: 1, minWidth: 120, background: "rgba(253,251,247,.7)", border: "1.5px solid rgba(148,139,130,.18)", borderRadius: 10, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" };
const addBtn: React.CSSProperties = { padding: "9px 18px", borderRadius: 999, border: "none", background: "var(--charcoal)", color: "var(--cream)", fontSize: 13, cursor: "pointer" };
