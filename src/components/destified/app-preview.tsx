"use client";

import { useRef, useState, useEffect } from "react";
import { Plane, Building2, MapPin, CheckSquare2, Sparkles, Check, User } from "lucide-react";

/* ── Mockup sub-components ────────────────────────────────────────────── */

function OrgTopBar() {
  return (
    <div style={{
      height: 50,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 16px",
      background: "rgba(253,251,247,.92)",
      borderBottom: "1px solid rgba(148,139,130,.1)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: "linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={10} color="white" />
        </div>
        <span style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--charcoal)",
        }}>
          Dest<em style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>ified</em>
        </span>
      </div>

      <nav style={{ display: "flex", gap: 1, marginLeft: 6 }}>
        {["My trips", "Plan a trip", "Documents"].map((item, i) => (
          <span key={item} style={{
            fontSize: 11.5, padding: "3px 9px", borderRadius: 5,
            fontFamily: "var(--font-sans)",
            color: i === 0 ? "var(--charcoal)" : "var(--mocha)",
            background: i === 0 ? "var(--sand)" : "transparent",
          }}>
            {item}
          </span>
        ))}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 10.5, fontFamily: "var(--font-sans)", color: "var(--mocha-soft)",
          background: "var(--sand)", border: "1px solid rgba(148,139,130,.1)",
          borderRadius: 99, padding: "3px 9px",
        }}>
          Auto-saved · just now
        </span>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--terracotta), var(--lavender))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
        }}>
          <User size={13} color="white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function OrgTimeline() {
  const items: Array<
    | { kind: "day"; label: string; date: string }
    | { kind: "item"; icon: React.ReactNode; title: string; sub: string; accent: string }
  > = [
    { kind: "day",  label: "Day 1 · Bangkok",   date: "Jun 12, Thu" },
    { kind: "item", icon: <Plane size={10} />,    title: "SEA → BKK",              sub: "11h 40m · TG 612",       accent: "rgba(45,90,123,.85)"   },
    { kind: "item", icon: <Building2 size={10} />, title: "Capella Bangkok",        sub: "3 nights · Riverside",   accent: "rgba(110,128,104,.85)" },
    { kind: "day",  label: "Day 4 · Singapore",  date: "Jun 15, Sun" },
    { kind: "item", icon: <MapPin size={10} />,   title: "Gardens by the Bay",      sub: "9:00 AM · Booked",       accent: "rgba(192,120,86,.85)"  },
    { kind: "item", icon: <Plane size={10} />,    title: "SIN → DPS",              sub: "2h 35m · SQ 945",        accent: "rgba(45,90,123,.85)"   },
    { kind: "day",  label: "Day 6 · Bali",       date: "Jun 17, Tue" },
    { kind: "item", icon: <Building2 size={10} />, title: "Four Seasons Jimbaran", sub: "4 nights · Beachfront",  accent: "rgba(110,128,104,.85)" },
  ];

  return (
    <div style={{
      background: "var(--cream)", borderRadius: 10,
      border: "1px solid rgba(148,139,130,.1)", overflow: "hidden", height: "100%",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 13px", borderBottom: "1px solid rgba(148,139,130,.08)",
      }}>
        <CheckSquare2 size={12} color="var(--mocha-soft)" />
        <span style={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 500, color: "var(--charcoal)" }}>
          Itinerary
        </span>
      </div>

      <div style={{ padding: "6px 0", position: "relative" }}>
        <div style={{
          position: "absolute", left: 21, top: 6, bottom: 0, width: 1,
          background: "linear-gradient(180deg, rgba(148,139,130,.25) 0%, transparent 100%)",
        }} />
        {items.map((item, i) => {
          if (item.kind === "day") {
            return (
              <div key={i} style={{ padding: "7px 13px 3px", fontFamily: "var(--font-sans)" }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--charcoal)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 9, color: "var(--mocha-soft)", marginTop: 1 }}>{item.date}</div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "4px 13px" }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: item.accent.replace("85", "12"),
                border: `1px solid ${item.accent.replace("85", "22")}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: item.accent, zIndex: 1,
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, color: "var(--charcoal)", lineHeight: 1.3 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 10, fontFamily: "var(--font-sans)", color: "var(--mocha-soft)", marginTop: 1 }}>
                  {item.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrgMapPanel() {
  const cities = [
    { name: "Bangkok",   x: 73,  y: 62  },
    { name: "Singapore", x: 104, y: 144 },
    { name: "Bali",      x: 214, y: 185 },
  ];

  return (
    <div style={{
      background: "var(--cream)", borderRadius: 10,
      border: "1px solid rgba(148,139,130,.1)", overflow: "hidden", height: "100%",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 13px", borderBottom: "1px solid rgba(148,139,130,.08)", flexShrink: 0,
      }}>
        <MapPin size={12} color="var(--mocha-soft)" />
        <span style={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 500, color: "var(--charcoal)" }}>
          Route Map
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, fontFamily: "var(--font-mono), monospace", color: "var(--mocha-soft)", letterSpacing: "0.04em" }}>
          SE Asia · 3 stops
        </span>
      </div>

      <div style={{ flex: 1, background: "#EDF4F8", position: "relative", overflow: "hidden" }}>
        <svg viewBox="0 0 280 240" style={{ width: "100%", height: "100%" }} fill="none">
          {/* Grid */}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 34} x2="280" y2={i * 34} stroke="rgba(45,90,123,.07)" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`v${i}`} x1={i * 31} y1="0" x2={i * 31} y2="240" stroke="rgba(45,90,123,.07)" strokeWidth="0.5" />
          ))}

          {/* Route arcs */}
          <path d="M 73 62 Q 74 103 104 144"  stroke="var(--ocean)" strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.6" />
          <path d="M 104 144 Q 162 151 214 185" stroke="var(--ocean)" strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.6" />

          {/* City markers */}
          {cities.map((city, i) => (
            <g key={i}>
              <circle cx={city.x} cy={city.y} r="11" fill="rgba(45,90,123,.07)" />
              <circle cx={city.x} cy={city.y} r="5.5" fill="var(--ocean)" opacity="0.75" />
              <circle cx={city.x} cy={city.y} r="2.5" fill="white" />
              <text x={city.x + 13} y={city.y + 1} fontSize="8.5" fill="var(--charcoal)" fontFamily="sans-serif" dominantBaseline="middle" fontWeight="500">{city.name}</text>
            </g>
          ))}

          {/* Distance labels */}
          <text x="55" y="108" fontSize="7.5" fill="var(--ocean)" fontFamily="monospace" opacity="0.6">~1,450 km</text>
          <text x="148" y="160" fontSize="7.5" fill="var(--ocean)" fontFamily="monospace" opacity="0.6">~1,620 km</text>
        </svg>
      </div>
    </div>
  );
}

function OrgChecklist() {
  const items = [
    { label: "Passport valid (6+ mo.)", done: true  },
    { label: "Thailand e-visa",          done: true  },
    { label: "Travel insurance",         done: false },
    { label: "Hotel confirmations",      done: true  },
    { label: "Thai Baht exchanged",      done: false },
    { label: "Airport transfer booked",  done: true  },
    { label: "Vaccinations up to date",  done: false },
  ];
  const doneCount = items.filter(i => i.done).length;

  return (
    <div style={{
      background: "var(--cream)", borderRadius: 10,
      border: "1px solid rgba(148,139,130,.1)", overflow: "hidden", height: "100%",
    }}>
      <div style={{ padding: "9px 13px", borderBottom: "1px solid rgba(148,139,130,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <CheckSquare2 size={12} color="var(--mocha-soft)" />
          <span style={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 500, color: "var(--charcoal)" }}>
            Pre-departure
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--mocha-soft)", fontFamily: "var(--font-sans)" }}>
            {doneCount}/{items.length}
          </span>
        </div>
        <div style={{ height: 3, background: "rgba(148,139,130,.15)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${(doneCount / items.length) * 100}%`,
            background: "linear-gradient(90deg, var(--sage), var(--ocean))",
            borderRadius: 2, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      <div style={{ padding: "4px 0" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 13px" }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              background: item.done ? "var(--sage)" : "transparent",
              border: `1.5px solid ${item.done ? "var(--sage)" : "rgba(148,139,130,.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {item.done && <Check size={8} color="white" strokeWidth={3} />}
            </div>
            <span style={{
              fontSize: 11, fontFamily: "var(--font-sans)",
              color: item.done ? "var(--mocha-soft)" : "var(--charcoal)",
              textDecoration: item.done ? "line-through" : "none",
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Public export ────────────────────────────────────────────────────── */

export function AppPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      style={{
        padding: "80px 24px 100px",
        maxWidth: 1080,
        margin: "0 auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.85s ease, transform 0.85s ease",
      }}
    >
      {/* Heading */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        {/* Mono eyebrow — echoes the coordinate strip on the Features section */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          fontFamily: "var(--font-mono), monospace", fontSize: 10,
          color: "var(--mocha-soft)", letterSpacing: "0.15em",
          textTransform: "uppercase", marginBottom: 18, opacity: 0.75,
        }}>
          <span>Live preview</span>
          <span style={{ opacity: 0.35 }}>—</span>
          <span>The organizer</span>
        </div>
        <h2 style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 500,
          letterSpacing: "-0.03em", color: "var(--charcoal)", marginBottom: 12,
        }}>
          See it all in one{" "}
          <em style={{ fontStyle: "italic", color: "var(--ocean)" }}>view</em>
        </h2>
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--mocha)",
          maxWidth: 380, margin: "0 auto", lineHeight: 1.65,
        }}>
          Timeline, map, and checklist — all updating together as you build your trip.
        </p>
      </div>

      {/* Browser frame */}
      <div style={{
        borderRadius: 14, overflow: "hidden",
        boxShadow:
          "0 4px 6px rgba(44,48,51,.04)," +
          "0 24px 80px rgba(44,48,51,.11)," +
          "0 0 0 1px rgba(148,139,130,.14)",
      }}>
        {/* Chrome bar */}
        <div style={{
          height: 36, background: "var(--sand)",
          borderBottom: "1px solid rgba(148,139,130,.14)",
          display: "flex", alignItems: "center", gap: 12, padding: "0 14px",
        }}>
          <div style={{ display: "flex", gap: 5.5 }}>
            {(["#FF5F57", "#FFBD2E", "#28C840"] as const).map(color => (
              <div key={color} style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            ))}
          </div>
          <div style={{
            flex: 1, maxWidth: 260, margin: "0 auto", height: 21,
            background: "rgba(148,139,130,.12)", borderRadius: 5,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono), monospace", fontSize: 10,
            color: "var(--mocha)", letterSpacing: "0.01em",
          }}>
            destified.app/organizer
          </div>
        </div>

        {/* App content */}
        <div style={{ background: "var(--cream-warm)" }}>
          <OrgTopBar />
          <div style={{
            display: "grid",
            gridTemplateColumns: "250px 1fr 230px",
            gap: 10,
            padding: "10px 14px 14px",
            height: 398,
            overflow: "hidden",
          }}>
            <OrgTimeline />
            <OrgMapPanel />
            <OrgChecklist />
          </div>
        </div>
      </div>
    </section>
  );
}
