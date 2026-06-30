"use client";

import Link from "next/link";
import { useState } from "react";
import type { Journey, PointCurrency } from "@/lib/deals/types";
import type { RankedOption, IncompleteOption } from "@/lib/deals/score";

// ─── tokens (matching board.html / cards-portals.html) ───────────────────────
const T = {
  cream: "#FBF6EC",
  cream2: "#F4EADA",
  ink: "#23211d",
  mocha2: "#8b8175",
  sage: "#4E7C6B",
  gold: "#C9A04A",
  line: "rgba(40,35,28,.12)",
  panel: "rgba(255,255,255,.06)",
};

const BG = "radial-gradient(120% 130% at 50% -10%, #27372f 0%, #21302a 40%, #141a17 100%)";

// ─── portal chip colour palette ───────────────────────────────────────────────
const PORTAL_PALETTE = [
  "#1d6f5c", // teal (aircanada-ish)
  "#3b6fb0", // blue (google flights-ish)
  "#d2792e", // orange (trip.com-ish)
  "#2f6d63", // deep teal (alaska-ish)
  "#7c4f9e", // purple
  "#b0483b", // red-brown
  "#4a7c59", // forest green
  "#6b5b3b", // warm brown
];

function portalColor(portal: string): string {
  let h = 0;
  for (let i = 0; i < portal.length; i++) {
    h = (h * 31 + portal.charCodeAt(i)) >>> 0;
  }
  return PORTAL_PALETTE[h % PORTAL_PALETTE.length];
}

// ─── formatters ──────────────────────────────────────────────────────────────
function fmtUsd(n: number): string {
  return "$" + Math.round(Math.abs(n)).toLocaleString();
}

function fmtPts(n: number): string {
  return n >= 10_000
    ? (n / 1000).toFixed(0) + "k"
    : n.toLocaleString();
}

function buildBreakdown(
  ro: RankedOption,
  currMap: Map<string, PointCurrency>,
): string {
  const { option, breakdown: bd } = ro;
  const parts: string[] = [];

  if (bd.pointsUsd > 0 && option.pointsAmount && option.pointsAmount > 0) {
    const curr = option.pointsCurrencyId
      ? currMap.get(option.pointsCurrencyId)
      : undefined;
    const code = curr?.code ?? "pts";
    parts.push(`${fmtPts(option.pointsAmount)} ${code}`);
  }

  if (bd.cashUsd > 0) {
    const prefix = parts.length > 0 ? "+" : "";
    parts.push(`${prefix}${fmtUsd(bd.cashUsd)} cash`);
  }

  if (bd.adjustmentsUsd !== 0) {
    const sign = bd.adjustmentsUsd > 0 ? "+" : "−";
    parts.push(`${sign}${fmtUsd(bd.adjustmentsUsd)} adj`);
  }

  return parts.join(" · ") || "cash only";
}

function routeText(option: RankedOption["option"]): string {
  if (option.viaText) return option.viaText;
  if (option.stops === 0) return "nonstop";
  if (option.stops != null)
    return `${option.stops} stop${option.stops > 1 ? "s" : ""}`;
  return "";
}

// ─── sub-components ───────────────────────────────────────────────────────────
// Note: the `board-shine` keyframe is defined in globals.css

function PortalChip({ portal }: { portal: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 7,
        background: portalColor(portal),
        color: "#fff",
        whiteSpace: "nowrap",
        maxWidth: 110,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "rgba(255,255,255,.8)",
          flexShrink: 0,
        }}
      />
      {portal}
    </span>
  );
}

function HandCard({
  ro,
  isBest,
  currMap,
}: {
  ro: RankedOption;
  isBest: boolean;
  currMap: Map<string, PointCurrency>;
}) {
  const { option, effectiveUsd, breakdown, qualityRank } = ro;
  const hasPoints = breakdown.pointsUsd > 0;
  const route = routeText(option);


  return (
    <div
      style={{
        position: "relative",
        width: 176,
        flexShrink: 0,
        borderRadius: 16,
        background: `linear-gradient(168deg, ${T.cream}, ${T.cream2})`,
        border: "1px solid rgba(255,255,255,.5)",
        boxShadow:
          "0 16px 36px -16px rgba(0,0,0,.6), 0 2px 0 rgba(255,255,255,.5) inset",
        padding: "14px 13px 13px",
        transition: "transform .16s ease, box-shadow .16s ease",
        outline: isBest ? `3px solid ${T.gold}` : "none",
        outlineOffset: isBest ? 3 : 0,
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-8px)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.transform = "")
      }
    >
      {/* shimmer overlay for award cards */}
      {hasPoints && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            pointerEvents: "none",
            mixBlendMode: "overlay",
            opacity: 0.45,
            background:
              "linear-gradient(115deg,transparent 32%,rgba(255,0,170,.5),rgba(0,200,255,.5),rgba(255,210,0,.5),transparent 68%)",
            backgroundSize: "300% 300%",
            animation: "board-shine 5.5s linear infinite",
          }}
          aria-hidden
        />
      )}
      {/* top row: rank + portal chip */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 800,
            fontSize: 24,
            lineHeight: 1,
            color: T.ink,
          }}
        >
          {qualityRank}
          <span
            style={{
              display: "block",
              fontSize: 8,
              fontWeight: 600,
              color: T.mocha2,
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            quality
          </span>
        </div>
        <PortalChip portal={option.portal} />
      </div>

      {/* label */}
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 600,
          fontSize: 13.5,
          color: T.ink,
          marginTop: 10,
          lineHeight: 1.2,
        }}
      >
        {option.label}
      </div>

      {/* route */}
      {route && (
        <div
          style={{ fontSize: 11, color: T.mocha2, marginTop: 2 }}
        >
          {route}
        </div>
      )}

      {/* effective $ hero */}
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 800,
          fontSize: 26,
          color: T.ink,
          marginTop: 9,
          letterSpacing: "-.02em",
        }}
      >
        {fmtUsd(Math.round(effectiveUsd))}
      </div>
      <div style={{ fontSize: 10, color: T.mocha2, marginTop: -1 }}>
        effective cost{isBest ? " · cheapest" : ""}
      </div>

      {/* breakdown */}
      <div
        style={{
          fontFamily: '"SF Mono", ui-monospace, monospace',
          fontSize: 10,
          color: "#6a6052",
          marginTop: 7,
          lineHeight: 1.4,
          minHeight: 26,
        }}
      >
        {buildBreakdown(ro, currMap)}
      </div>

      {/* award shimmer badge */}
      {hasPoints && (
        <div
          style={{
            position: "absolute",
            bottom: 11,
            right: 12,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#9a7a2f",
          }}
        >
          ◆ award
        </div>
      )}
    </div>
  );
}

function ListRow({
  ro,
  isBest,
  currMap,
}: {
  ro: RankedOption;
  isBest: boolean;
  currMap: Map<string, PointCurrency>;
}) {
  const { option, effectiveUsd, qualityRank } = ro;
  const route = routeText(option);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: `linear-gradient(168deg, ${T.cream}, ${T.cream2})`,
        borderRadius: 11,
        padding: "9px 13px",
        border: "1px solid rgba(255,255,255,.5)",
        boxShadow: "0 6px 16px -10px rgba(0,0,0,.5)",
        outline: isBest ? `2px solid ${T.gold}` : "none",
        outlineOffset: isBest ? 2 : 0,
        cursor: "pointer",
        transition: "transform .12s ease",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.transform = "translateX(2px)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.transform = "")
      }
    >
      {/* rank */}
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 800,
          fontSize: 15,
          width: 24,
          textAlign: "center",
          color: T.ink,
          flexShrink: 0,
        }}
      >
        {qualityRank}
      </span>

      {/* label + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <b
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 13,
              color: T.ink,
            }}
          >
            {option.label}
          </b>
          <PortalChip portal={option.portal} />
        </div>
        <div
          style={{
            fontFamily: '"SF Mono", ui-monospace, monospace',
            fontSize: 10.5,
            color: T.mocha2,
            marginTop: 2,
          }}
        >
          {[route, buildBreakdown(ro, currMap)].filter(Boolean).join(" · ")}
        </div>
      </div>

      {/* effective $ */}
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 800,
          fontSize: 18,
          color: T.ink,
          flexShrink: 0,
        }}
      >
        {fmtUsd(Math.round(effectiveUsd))}
      </span>
    </div>
  );
}

function BankRail({ currencies }: { currencies: PointCurrency[] }) {
  return (
    <aside
      style={{
        background: T.panel,
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 14,
        padding: 14,
        color: "#e7efeb",
        position: "sticky",
        top: 16,
      }}
    >
      <h3
        style={{
          margin: "0 0 3px",
          fontFamily: "Georgia, serif",
          fontWeight: 600,
          fontSize: 14,
          color: "#fff",
        }}
      >
        The bank
      </h3>
      <div style={{ fontSize: 10.5, color: "#9fb6ad", marginBottom: 11 }}>
        your point currencies
      </div>

      {currencies.length === 0 && (
        <p style={{ fontSize: 12, color: "#9fb6ad", margin: 0 }}>
          No currencies yet.{" "}
          <Link href="/profile" style={{ color: "#C9A04A" }}>
            Add one →
          </Link>
        </p>
      )}

      {currencies.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "7px 0",
            borderBottom: "1px solid rgba(255,255,255,.08)",
            fontSize: 12,
          }}
        >
          <span style={{ color: "#dbe6e1" }}>
            {c.name}
            <small
              style={{
                display: "block",
                color: "#8fa49c",
                fontSize: 9.5,
              }}
            >
              {c.code}
            </small>
          </span>
          <span
            style={{
              fontFamily: '"SF Mono", ui-monospace, monospace',
              color: "#fff",
            }}
          >
            {c.defaultCpp}¢
          </span>
        </div>
      ))}
    </aside>
  );
}

function IncompleteBucket({ incomplete }: { incomplete: IncompleteOption[] }) {
  if (incomplete.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 24,
        background: "rgba(255,255,255,.04)",
        border: "1.5px dashed rgba(255,255,255,.16)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontFamily: '"SF Mono", ui-monospace, monospace',
          fontSize: 10.5,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "#8fb2a3",
          marginBottom: 10,
        }}
      >
        Options needing attention
      </div>
      {incomplete.map((item) => (
        <div
          key={item.option.id}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,.07)",
            fontSize: 12.5,
            color: "#dbe6e1",
          }}
        >
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 600,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {item.option.label}
          </span>
          <span style={{ color: "#9fb6ad", flex: 1 }}>{item.reason}</span>
          <Link
            href="/profile"
            style={{
              fontSize: 11,
              color: T.gold,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Set CPP →
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── View toggle (fixed bottom-right, matching board.html) ────────────────────
function ViewToggle({
  view,
  onSet,
}: {
  view: "hand" | "list";
  onSet: (v: "hand" | "list") => void;
}) {
  const btnBase: React.CSSProperties = {
    border: 0,
    background: "transparent",
    color: "#bccfc8",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "7px 16px",
    borderRadius: 999,
    cursor: "pointer",
    display: "flex",
    gap: 6,
    alignItems: "center",
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        display: "flex",
        background: "rgba(20,26,23,.9)",
        border: "1px solid rgba(255,255,255,.18)",
        borderRadius: 999,
        padding: 4,
        backdropFilter: "blur(6px)",
        boxShadow: "0 10px 30px -8px rgba(0,0,0,.7)",
        zIndex: 20,
      }}
    >
      <button
        style={{
          ...btnBase,
          ...(view === "hand"
            ? { background: T.cream, color: T.ink }
            : {}),
        }}
        onClick={() => onSet("hand")}
      >
        ▦ Hand
      </button>
      <button
        style={{
          ...btnBase,
          ...(view === "list"
            ? { background: T.cream, color: T.ink }
            : {}),
        }}
        onClick={() => onSet("list")}
      >
        ≣ List
      </button>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function CompareBoard({
  journey,
  ranked,
  incomplete,
  currencies,
}: {
  journey: Journey;
  ranked: RankedOption[];
  incomplete: IncompleteOption[];
  currencies: PointCurrency[];
}) {
  const [view, setView] = useState<"hand" | "list">("hand");

  const currMap = new Map(currencies.map((c) => [c.id, c]));

  return (
    <div
      style={{
        minHeight: "100svh",
        background: BG,
        color: T.cream,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 22px 90px" }}>
        {/* back link */}
        <Link
          href="/compare"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            color: "#9fb6ad",
            textDecoration: "none",
            fontSize: 12,
            fontFamily: '"SF Mono", ui-monospace, monospace',
            letterSpacing: ".12em",
            marginBottom: 10,
          }}
        >
          ← All journeys
        </Link>

        {/* eyebrow */}
        <div
          style={{
            fontFamily: '"SF Mono", ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "#9fc4b4",
            marginBottom: 4,
          }}
        >
          Journey board
        </div>

        {/* header */}
        <h1
          style={{
            fontFamily: "Georgia, serif",
            color: T.cream,
            fontWeight: 500,
            fontSize: 24,
            margin: "4px 0 20px",
          }}
        >
          {journey.fromLabel} → {journey.toLabel}
          {(journey.departDate ?? journey.returnDate) && (
            <small
              style={{
                color: "#9bb3aa",
                fontSize: 14,
                fontWeight: 400,
                marginLeft: 12,
              }}
            >
              {journey.departDate ?? ""}
              {journey.departDate && journey.returnDate ? " – " : ""}
              {journey.returnDate ?? ""}
            </small>
          )}
        </h1>

        {/* main grid: cards + bank rail */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: currencies.length > 0 ? "1fr 268px" : "1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* left column: hand or list */}
          <div>
            {ranked.length === 0 ? (
              <p style={{ color: "#9fb6ad", fontSize: 14 }}>
                No ranked options yet. Add options to this journey to see them
                compared here.
              </p>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: '"SF Mono", ui-monospace, monospace',
                    fontSize: 10.5,
                    letterSpacing: ".16em",
                    textTransform: "uppercase",
                    color: "#8fb2a3",
                    margin: "2px 0 10px",
                  }}
                >
                  {view === "hand"
                    ? `Your hand · ${ranked.length} option${ranked.length !== 1 ? "s" : ""}`
                    : `Ranked · ${ranked.length} option${ranked.length !== 1 ? "s" : ""}`}
                </div>

                {/* hand view */}
                {view === "hand" && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
                    {ranked.map((ro, i) => (
                      <HandCard
                        key={ro.option.id}
                        ro={ro}
                        isBest={i === 0}
                        currMap={currMap}
                      />
                    ))}
                  </div>
                )}

                {/* list view */}
                {view === "list" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                      maxWidth: 560,
                    }}
                  >
                    {ranked.map((ro, i) => (
                      <ListRow
                        key={ro.option.id}
                        ro={ro}
                        isBest={i === 0}
                        currMap={currMap}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <IncompleteBucket incomplete={incomplete} />
          </div>

          {/* right column: bank rail */}
          {currencies.length > 0 && <BankRail currencies={currencies} />}
        </div>
      </div>

      <ViewToggle view={view} onSet={setView} />
    </div>
  );
}
