"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Option, PointCurrency } from "@/lib/deals/types";
import {
  addOptionAction,
  updateOptionAction,
} from "@/lib/deals/journey-actions";
import { toast } from "@/components/destified/toast";

// ─── tokens (match compare-board) ────────────────────────────────────────────
const T = {
  cream: "#FBF6EC",
  ink: "#23211d",
  sage: "#4E7C6B",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type AdjRow = { label: string; deltaUsd: string };

export interface OptionFormProps {
  journeyId: string;
  currencies: PointCurrency[];
  /** Provide to enter edit mode; omit for add mode. */
  initial?: Option;
  onClose: () => void;
}

// ─── Shared style fragments ───────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 8,
  color: T.cream,
  padding: "7px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#9fb6ad",
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  marginBottom: 4,
};

const fieldStyle: React.CSSProperties = { marginBottom: 14 };

// ─── Component ────────────────────────────────────────────────────────────────
export function OptionForm({
  journeyId,
  currencies,
  initial,
  onClose,
}: OptionFormProps) {
  const router = useRouter();
  const editing = !!initial;

  // ── form state ──
  const [label, setLabel] = useState(initial?.label ?? "");
  const [portal, setPortal] = useState(initial?.portal ?? "");
  const [carrier, setCarrier] = useState(initial?.carrier ?? "");
  const [stops, setStops] = useState(
    initial?.stops != null ? String(initial.stops) : ""
  );
  const [durationMins, setDurationMins] = useState(
    initial?.durationMins != null ? String(initial.durationMins) : ""
  );
  const [cabin, setCabin] = useState(initial?.cabin ?? "");
  const [viaText, setViaText] = useState(initial?.viaText ?? "");
  const [cashUsd, setCashUsd] = useState(
    initial?.cashUsd ? String(initial.cashUsd) : ""
  );
  const [pointsCurrencyId, setPointsCurrencyId] = useState(
    initial?.pointsCurrencyId ?? ""
  );
  const [pointsAmount, setPointsAmount] = useState(
    initial?.pointsAmount != null ? String(initial.pointsAmount) : ""
  );
  const [cppOverride, setCppOverride] = useState(
    initial?.cppOverride != null ? String(initial.cppOverride) : ""
  );
  const [adjustments, setAdjustments] = useState<AdjRow[]>(
    initial?.adjustments.map((a) => ({
      label: a.label,
      deltaUsd: String(a.deltaUsd),
    })) ?? []
  );
  const [submitting, setSubmitting] = useState(false);

  // ── adjustment helpers ──
  function addAdjRow() {
    setAdjustments((prev) => [...prev, { label: "", deltaUsd: "" }]);
  }
  function removeAdjRow(i: number) {
    setAdjustments((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateAdjRow(i: number, field: keyof AdjRow, value: string) {
    setAdjustments((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
  }

  // ── submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cashNum = cashUsd !== "" ? parseFloat(cashUsd) : 0;
    const pointsNum = pointsAmount !== "" ? parseInt(pointsAmount, 10) : 0;

    if (!(cashNum > 0) && !(pointsNum > 0)) {
      toast("An option must have a cash price or points.");
      return;
    }

    const input = {
      label: label.trim(),
      portal: portal.trim(),
      carrier: carrier.trim() || null,
      stops: stops !== "" ? parseInt(stops, 10) : null,
      durationMins: durationMins !== "" ? parseInt(durationMins, 10) : null,
      cabin: cabin
        ? (cabin as "economy" | "premium" | "business" | "first")
        : null,
      viaText: viaText.trim() || null,
      cashUsd: cashNum,
      pointsCurrencyId: pointsCurrencyId || null,
      pointsAmount: pointsNum > 0 ? pointsNum : null,
      cppOverride: cppOverride !== "" ? parseFloat(cppOverride) : null,
      adjustments: adjustments
        .filter((a) => a.label.trim() && a.deltaUsd !== "")
        .map((a) => ({
          label: a.label.trim(),
          deltaUsd: parseFloat(a.deltaUsd),
        })),
      notes: null,
    };

    setSubmitting(true);
    try {
      if (editing && initial) {
        await updateOptionAction(initial.id, input);
      } else {
        await addOptionAction(journeyId, input);
      }
      router.refresh();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────────
  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          background:
            "linear-gradient(160deg, #27372f 0%, #1a2820 100%)",
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 20,
          padding: "24px 26px",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          color: T.cream,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxShadow: "0 32px 80px -20px rgba(0,0,0,.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "Georgia, serif",
              fontWeight: 600,
              fontSize: 18,
              color: T.cream,
            }}
          >
            {editing ? "Edit option" : "Add option"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#9fb6ad",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Required */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Label *</label>
            <input
              style={inputStyle}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g. Alaska cash"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Portal *</label>
            <input
              style={inputStyle}
              value={portal}
              onChange={(e) => setPortal(e.target.value)}
              required
              placeholder="e.g. alaska.com"
            />
          </div>

          {/* Flight details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Carrier</label>
              <input
                style={inputStyle}
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. AS"
              />
            </div>
            <div>
              <label style={labelStyle}>Stops</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={stops}
                onChange={(e) => setStops(e.target.value)}
                placeholder="0 = nonstop"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Duration (mins)</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                placeholder="e.g. 540"
              />
            </div>
            <div>
              <label style={labelStyle}>Cabin</label>
              <select
                style={{ ...inputStyle }}
                value={cabin}
                onChange={(e) => setCabin(e.target.value)}
              >
                <option value="">—</option>
                <option value="economy">Economy</option>
                <option value="premium">Premium</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Via / Route note</label>
            <input
              style={inputStyle}
              value={viaText}
              onChange={(e) => setViaText(e.target.value)}
              placeholder="e.g. via YVR"
            />
          </div>

          {/* Cash */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Cash USD</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step="0.01"
              value={cashUsd}
              onChange={(e) => setCashUsd(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Points group */}
          <div
            style={{
              background: "rgba(255,255,255,.04)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 14,
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9fb6ad",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Points (optional)
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Currency</label>
              <select
                style={{ ...inputStyle }}
                value={pointsCurrencyId}
                onChange={(e) => setPointsCurrencyId(e.target.value)}
              >
                <option value="">— none —</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Points amount</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="57000"
                />
              </div>
              <div>
                <label style={labelStyle}>CPP override (¢)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  step="0.01"
                  value={cppOverride}
                  onChange={(e) => setCppOverride(e.target.value)}
                  placeholder="1.50"
                />
              </div>
            </div>
          </div>

          {/* Adjustments */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ ...labelStyle, margin: 0 }}>Adjustments</span>
              <button
                type="button"
                onClick={addAdjRow}
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "none",
                  color: T.cream,
                  fontSize: 12,
                  borderRadius: 6,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                + add row
              </button>
            </div>
            {adjustments.map((adj, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 30px",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <input
                  style={inputStyle}
                  placeholder="e.g. Lounge credit"
                  value={adj.label}
                  onChange={(e) => updateAdjRow(i, "label", e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="−40"
                  value={adj.deltaUsd}
                  onChange={(e) => updateAdjRow(i, "deltaUsd", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeAdjRow(i)}
                  aria-label="Remove adjustment"
                  style={{
                    background: "rgba(255,80,80,.15)",
                    border: "none",
                    color: "#ff8080",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                background: T.sage,
                border: "none",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "11px 0",
                borderRadius: 10,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Add option"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,.08)",
                border: "none",
                color: T.cream,
                fontSize: 14,
                padding: "11px 20px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
