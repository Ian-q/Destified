"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, CheckSquare2, Map, Sparkles, Plane } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { AppPreview } from "@/components/destified/app-preview";
import { Footer } from "@/components/destified/footer";

// Animation phases:
//   0 = city marquee
//   1 = tagline fades in (stacked)
//   2 = tagline flattens to a single horizontal row
//   3 = letters shuffle into the Destified wordmark
//   4 = nav + CTAs visible (final state)
type Phase = 0 | 1 | 2 | 3 | 4;

const DEST_CHARS = 'Destinations,'.split('');           // 13 chars (incl. comma)
const SIMP_CHARS = 'simplified'.split('');               // 10 chars
const DEST_SURVIVOR_INDICES = new Set([0, 1, 2, 3]);     // D, e, s, t
const SIMP_SURVIVOR_INDICES = new Set([5, 6, 7, 8, 9]);  // i, f, i, e, d

const CITIES = [
  {
    name: "Seattle", country: "USA", italic: false,
    img: "photo-1438401171849-74ac270044ee",
    fallback: "#0d1a2e",
  },
  {
    name: "Tokyo", country: "Japan", italic: false,
    img: "photo-1540959733332-eab4deabeeaf",
    fallback: "#1a1f2e",
  },
  {
    name: "Paris", country: "France", italic: true,
    img: "photo-1502602898657-3e91760cbb34",
    fallback: "#2e2416",
  },
  {
    name: "Bali", country: "Indonesia", italic: false,
    img: "photo-1537996194471-e657df975ab4",
    fallback: "#1a2e1e",
  },
  {
    name: "New York", country: "USA", italic: true,
    img: "photo-1496442226666-8d4d0e62e6e9",
    fallback: "#1a1a24",
  },
  {
    name: "Santorini", country: "Greece", italic: false,
    img: "photo-1570077188670-e3a8d69ac5ff",
    fallback: "#1a2535",
  },
];

const FLOWING_ROWS = [
  ["Kyoto", "Amsterdam", "Barcelona", "Sydney", "Lisbon", "Cape Town", "Dubai", "Prague", "Havana"],
  ["Rio de Janeiro", "Vienna", "Marrakech", "Singapore", "Istanbul", "Reykjavik", "Melbourne", "Tbilisi"],
  ["Buenos Aires", "Florence", "Nairobi", "Bangkok", "Edinburgh", "Cusco", "Oslo", "Taipei", "Bruges"],
  ["Mexico City", "Dubrovnik", "Hanoi", "Cartagena", "Zurich", "Casablanca", "Seville", "Chiang Mai"],
  ["Queenstown", "Bogotá", "Kraków", "Beirut", "Porto", "Athens", "Vancouver", "Medellín", "Valletta"],
];

const IMG_DURATION = 900; // ms each city is shown
const IMGS_END = IMG_DURATION * CITIES.length; // 4500ms

const prefersReducedMotionAtMount = (): boolean =>
  typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function LandingPage() {
  // Mount directly at phase 4 when the user prefers reduced motion, so we never
  // schedule any animation timers and avoid a synchronous setState-in-effect.
  const [phase, setPhase] = useState<Phase>(() => (prefersReducedMotionAtMount() ? 4 : 0));
  const [imgIdx, setImgIdx]     = useState(0);
  const [imgVisible, setImgVisible] = useState(() => !prefersReducedMotionAtMount());

  useEffect(() => {
    document.body.style.overflow = phase < 4 ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  const skipFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (prefersReducedMotionAtMount()) {
      // Already at phase 4 from the initial state; no timers or listeners to register.
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Cycle through city images
    CITIES.forEach((_, i) => {
      timers.push(setTimeout(() => setImgIdx(i), i * IMG_DURATION));
    });

    // Fade out images, reveal cream background
    timers.push(setTimeout(() => setImgVisible(false), IMGS_END + 200));

    // Main animation phases
    timers.push(setTimeout(() => setPhase(1), IMGS_END + 900));
    timers.push(setTimeout(() => setPhase(2), IMGS_END + 3200));
    timers.push(setTimeout(() => setPhase(3), IMGS_END + 3900));
    timers.push(setTimeout(() => setPhase(4), IMGS_END + 5000));

    const skip = () => {
      timers.forEach(clearTimeout);
      setImgVisible(false);
      setPhase(4);
    };
    skipFnRef.current = skip;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') skip();
    };

    window.addEventListener('keydown', onKey);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes scroll-bob {
          0%, 100% { transform: translateY(0);   opacity: 0.45; }
          50%       { transform: translateY(7px); opacity: 0.7;  }
        }
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* ── Floating nav (appears after animation) ───────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 58,
          background: "rgba(253,251,247,.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(148,139,130,.1)",
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
          pointerEvents: phase >= 4 ? "auto" : "none",
        }}
      >
        <div style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--charcoal)",
        }}>
          Dest<em style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>ified</em>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/login"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--mocha)",
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 999,
              letterSpacing: "-0.01em",
              transition: "color 0.2s ease",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)",
              color: "var(--cream)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              padding: "8px 18px",
              borderRadius: 999,
              textDecoration: "none",
              letterSpacing: "-0.01em",
              boxShadow: "0 2px 12px rgba(45,90,123,.18)",
            }}
          >
            Sign up
            <ArrowRight size={12} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100svh",
          overflow: "hidden",
          background:
            "radial-gradient(900px 500px at 72% 15%, rgba(184,168,216,.11), transparent 60%)," +
            "radial-gradient(600px 400px at 12% 72%, rgba(192,120,86,.08), transparent 60%)," +
            "var(--cream-warm)",
        }}
      >
        {/* ── City photo slideshow ─────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: imgVisible ? 1 : 0,
            transition: "opacity 0.95s ease",
            pointerEvents: "none",
          }}
        >
          {/* City background images */}
          {CITIES.map((city, i) => (
            <div
              key={city.name}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(https://images.unsplash.com/${city.img}?w=1920&q=80&auto=format&fit=crop)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: city.fallback,
                opacity: imgIdx === i ? 1 : 0,
                transition: "opacity 0.75s ease",
              }}
            />
          ))}

          {/* Dark gradient overlay — lighter top, heavier bottom */}
          <div style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,.18) 0%, rgba(0,0,0,.15) 45%, rgba(0,0,0,.62) 100%)",
          }} />

          {/* City name + country labels */}
          {CITIES.map((city, i) => (
            <div
              key={city.name + "_label"}
              style={{
                position: "absolute",
                bottom: "18%",
                left: 0,
                right: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                opacity: imgIdx === i ? 1 : 0,
                transform: imgIdx === i ? "translateY(0)" : "translateY(18px)",
                transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
              }}
            >
              <div style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(48px, 7.5vw, 106px)",
                fontWeight: 500,
                letterSpacing: "-0.032em",
                lineHeight: 1,
                color: "white",
                fontStyle: city.italic ? "italic" : "normal",
                textShadow: "0 2px 24px rgba(0,0,0,.28)",
                whiteSpace: "nowrap",
              }}>
                {city.name}
              </div>
              <div style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "rgba(255,255,255,.52)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}>
                {city.country}
              </div>
            </div>
          ))}
        </div>

        {/* ── Flowing city names background ────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0,
            opacity: phase >= 3 ? 0.07 : 0,
            transition: "opacity 2s ease",
            pointerEvents: "none",
          }}
        >
          {FLOWING_ROWS.map((row, rowIdx) => {
            const doubled = [...row, ...row];
            const duration = 28 + rowIdx * 5;
            const dir = rowIdx % 2 === 0 ? "marquee-left" : "marquee-right";
            return (
              <div key={rowIdx} style={{ overflow: "hidden", padding: "10px 0" }}>
                <div style={{ display: "inline-block", whiteSpace: "nowrap", animation: `${dir} ${duration}s linear infinite` }}>
                  {doubled.map((city, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "var(--font-serif), Georgia, serif",
                        fontSize: "clamp(20px, 2.8vw, 38px)",
                        fontWeight: 500,
                        letterSpacing: "-0.025em",
                        color: "var(--charcoal)",
                        marginRight: "2.5em",
                      }}
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Animation stage */}
        <div
          onClick={() => skipFnRef.current?.()}
          style={{
            position: 'absolute',
            top: phase >= 4 ? '34%' : '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'top 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 2,
            width: '100%',
            maxWidth: 960,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: phase < 4 ? 'pointer' : 'default',
          }}
        >
          {phase >= 1 && phase < 4 ? (
            <LayoutGroup>
              <motion.div
                layout
                style={{
                  display: 'flex',
                  flexDirection: phase < 2 ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: phase < 2 ? '0.12em' : 0,
                }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* "Destinations," word */}
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <AnimatePresence>
                    {DEST_CHARS.map((ch, i) => {
                      if (phase >= 3 && !DEST_SURVIVOR_INDICES.has(i)) return null;
                      return (
                        <motion.span
                          key={`dest-${i}`}
                          layout
                          initial={{ opacity: 0, y: -22 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                          style={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-serif), Georgia, serif',
                            fontSize: 'clamp(38px, 6.8vw, 94px)',
                            fontWeight: 500,
                            letterSpacing: '-0.035em',
                            lineHeight: 1,
                            color: 'var(--charcoal)',
                          }}
                        >
                          {ch === ' ' ? ' ' : ch}
                        </motion.span>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* "simplified" word */}
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <AnimatePresence>
                    {SIMP_CHARS.map((ch, i) => {
                      if (phase >= 3 && !SIMP_SURVIVOR_INDICES.has(i)) return null;
                      return (
                        <motion.span
                          key={`simp-${i}`}
                          layout
                          initial={{ opacity: 0, y: 22 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            color: SIMP_SURVIVOR_INDICES.has(i) && phase >= 3
                              ? 'var(--sage-deep)'
                              : 'var(--terracotta)',
                          }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                          style={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-serif), Georgia, serif',
                            fontSize: 'clamp(38px, 6.8vw, 94px)',
                            fontWeight: 500,
                            letterSpacing: '-0.035em',
                            lineHeight: 1,
                            fontStyle: 'italic',
                          }}
                        >
                          {ch === ' ' ? ' ' : ch}
                        </motion.span>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            </LayoutGroup>
          ) : phase >= 4 ? (
            /* Static wordmark at phase 4 — matches nav style, scaled up */
            <div
              style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 'clamp(52px, 8.5vw, 116px)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1,
                color: 'var(--charcoal)',
              }}
            >
              Dest<em style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>ified</em>
            </div>
          ) : null}
        </div>

        {/* Tagline + CTA — phase 4 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.75rem",
            marginTop: "2.25rem",
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.3vw, 18px)",
              color: "var(--mocha)",
              textAlign: "center",
              maxWidth: 440,
              lineHeight: 1.7,
              padding: "0 1.5rem",
            }}
          >
            Your itinerary, your route, your checklists —<br />
            all in one quietly beautiful place.
          </p>

          <Link
            href="/organizer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)",
              color: "var(--cream)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 500,
              padding: "12px 26px",
              borderRadius: 999,
              textDecoration: "none",
              letterSpacing: "-0.01em",
              boxShadow:
                "0 4px 24px rgba(45,90,123,.2), 0 1px 4px rgba(0,0,0,.05)",
            }}
          >
            Start planning
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            opacity: phase >= 4 ? 1 : 0,
            transition: "opacity 1s ease 0.8s",
            pointerEvents: "none",
            animation: phase >= 4 ? "scroll-bob 2.4s ease-in-out infinite" : "none",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--mocha-soft)",
            }}
          >
            scroll
          </span>
          <div
            style={{
              width: 1,
              height: 32,
              background:
                "linear-gradient(180deg, var(--mocha-soft) 0%, transparent 100%)",
            }}
          />
        </div>
      </section>

      {/* ── Features — Vintage Atlas ──────────────────────────────────── */}
      <section style={{ position: "relative", padding: "108px 24px 96px", overflow: "hidden" }}>
        {/* Lat/lon grid watermark */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(148,139,130,.055) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(148,139,130,.055) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />

        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            {/* Coordinate strip */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              fontFamily: "var(--font-mono), monospace", fontSize: 10,
              color: "var(--mocha-soft)", letterSpacing: "0.15em",
              textTransform: "uppercase", marginBottom: 18, opacity: 0.75,
            }}>
              <span>35°41′N 139°41′E</span>
              <span style={{ opacity: 0.35 }}>—</span>
              <span>48°51′N 2°21′E</span>
              <span style={{ opacity: 0.35 }}>—</span>
              <span>40°42′N 74°00′W</span>
            </div>
            <h2 style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 500,
              letterSpacing: "-0.03em", color: "var(--charcoal)", marginBottom: 14,
            }}>
              Everything your trip{" "}
              <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>needs</em>
            </h2>
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--mocha)",
              maxWidth: 400, margin: "0 auto", lineHeight: 1.65,
            }}>
              Three tools. One organizer. Zero spreadsheets.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            <FeatureCard icon={<Clock3 size={18} />} accent="var(--sage)" stamp="Tokyo · 35°N" title="Interactive Timeline" body="See every stop, flight, and experience laid out day-by-day. Drag to reorder. Toggle detail on the fly." />
            <FeatureCard icon={<Map size={18} />} accent="var(--ocean)" stamp="Paris · 48°N" title="Live Route Map" body="Your journey traced on an interactive map — pins, paths, and distances updating as you build your itinerary." />
            <FeatureCard icon={<CheckSquare2 size={18} />} accent="var(--terracotta)" stamp="New York · 40°N" title="Smart Checklists" body="Decision-tree guided prep that adapts to your specific trip. Visas, vaccines, packing — nothing slips through." />
          </div>
        </div>
      </section>

      {/* ── Product preview — Organizer mockup ────────────────────────── */}
      <AppPreview />

      {/* ── How it works — Flight Route ───────────────────────────────── */}
      <section style={{ padding: "80px 24px 104px" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          {/* Header with plane decoration */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "color-mix(in srgb, var(--ocean) 8%, var(--cream))",
              border: "1px solid rgba(45,90,123,.12)",
              borderRadius: 99, padding: "6px 16px", marginBottom: 20,
            }}>
              <Plane size={12} style={{ color: "var(--ocean)", transform: "rotate(45deg)" }} />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "var(--ocean)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Route Overview
              </span>
            </div>
            <h2 style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 500,
              letterSpacing: "-0.03em", color: "var(--charcoal)",
            }}>
              Planning,{" "}
              <em style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>simplified</em>
            </h2>
          </div>

          {/* Steps with route line */}
          <div style={{ position: "relative" }}>
            {/* Dashed vertical route line */}
            <div style={{
              position: "absolute", left: 13, top: 32, bottom: 32,
              borderLeft: "1.5px dashed rgba(110,128,104,.28)",
              pointerEvents: "none",
            }} />
            <StepRow n="01" title="Add your destinations" body="Drop in where you're going. Destified plots your route and calculates distances automatically." />
            <StepRow n="02" title="Build your itinerary" body="Add activities, hotels, and transit legs to a timeline that updates your map in real time." />
            <StepRow n="03" title="Follow the checklist" body="The guided flow walks you through everything you need to prepare — tailored to your specific journey." last />
          </div>
        </div>
      </section>

      {/* ── Final CTA — Flight Network ────────────────────────────────── */}
      <section style={{
        position: "relative", padding: "100px 24px 120px",
        textAlign: "center", borderTop: "1px solid rgba(148,139,130,.1)",
        overflow: "hidden",
      }}>
        {/* Global flight network watermark */}
        <div style={{
          position: "absolute", inset: 0,
          opacity: 0.06, pointerEvents: "none", color: "var(--charcoal)",
        }}>
          <FlightNetwork />
        </div>

        {/* Corner coordinates */}
        {([
          { pos: { top: 20, left: 28 },    text: "48°51′N · 2°21′E" },
          { pos: { top: 20, right: 28 },   text: "35°41′N · 139°41′E" },
          { pos: { bottom: 20, left: 28 }, text: "40°42′N · 74°00′W" },
          { pos: { bottom: 20, right: 28 },text: "1°17′S · 36°49′E" },
        ] as const).map(({ pos, text }, i) => (
          <span key={i} style={{
            position: "absolute", ...pos,
            fontFamily: "var(--font-mono), monospace", fontSize: 9,
            color: "var(--mocha-soft)", letterSpacing: "0.1em",
            opacity: 0.45, pointerEvents: "none",
          }}>{text}</span>
        ))}

        <div style={{ position: "relative" }}>
          {/* Boarding-pass style badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--sand)", border: "1px solid rgba(148,139,130,.18)",
            borderRadius: 4, padding: "6px 14px", marginBottom: 28,
          }}>
            <Plane size={10} style={{ color: "var(--mocha)", transform: "rotate(45deg)" }} />
            <span style={{
              fontFamily: "var(--font-mono), monospace", fontSize: 10,
              color: "var(--mocha)", letterSpacing: "0.14em", textTransform: "uppercase",
            }}>DST · 001 · Open to all</span>
            <span style={{
              display: "inline-block", width: 1, height: 12,
              background: "rgba(148,139,130,.3)", margin: "0 2px",
            }}/>
            <Sparkles size={10} style={{ color: "var(--mocha)" }} />
          </div>

          <h2 style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: "clamp(30px, 4.5vw, 58px)", fontWeight: 500,
            letterSpacing: "-0.03em", color: "var(--charcoal)",
            marginBottom: 18, lineHeight: 1.1,
          }}>
            Ready for your next{" "}
            <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>adventure?</em>
          </h2>

          <p style={{
            fontFamily: "var(--font-sans)", fontSize: 15,
            color: "var(--mocha)", marginBottom: 40, lineHeight: 1.6,
          }}>
            Open the organizer and start shaping your trip.
          </p>

          <Link href="/organizer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)",
            color: "var(--cream)", fontFamily: "var(--font-sans)",
            fontSize: 15, fontWeight: 500, padding: "14px 30px",
            borderRadius: 999, textDecoration: "none", letterSpacing: "-0.01em",
            boxShadow: "0 4px 28px rgba(45,90,123,.22), 0 1px 4px rgba(0,0,0,.05)",
          }}>
            Open my organizer
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <Footer />
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function FeatureCard({
  icon, accent, stamp, title, body,
}: {
  icon: React.ReactNode;
  accent: string;
  stamp: string;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [city, coord] = stamp.split(" · ");

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        background: "var(--cream)",
        border: "1px solid rgba(148,139,130,.11)",
        borderRadius: 16,
        padding: "26px 26px 30px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        boxShadow: "0 1px 3px rgba(44,48,51,.03), 0 6px 20px rgba(44,48,51,.03)",
        overflow: "hidden",
      }}
    >
      {/* Postmark stamp */}
      <div style={{
        position: "absolute", top: 18, right: 18,
        width: 54, height: 54, borderRadius: "50%",
        border: "1.5px solid rgba(148,139,130,.2)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
        opacity: 0.55,
      }}>
        <div style={{ height: 1, width: 34, background: "rgba(148,139,130,.5)" }} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "var(--mocha-soft)", letterSpacing: "0.06em", textAlign: "center" }}>{city}</span>
        <div style={{ height: 1, width: 34, background: "rgba(148,139,130,.5)" }} />
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "var(--mocha-soft)", letterSpacing: "0.05em" }}>{coord}</span>
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 38, borderRadius: 10,
        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        color: accent, marginBottom: 18,
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "var(--font-serif), Georgia, serif",
        fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.02em", color: "var(--charcoal)", marginBottom: 8,
      }}>
        {title}
      </h3>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--mocha)", lineHeight: 1.7 }}>
        {body}
      </p>
    </div>
  );
}

function FlightNetwork() {
  const cities: Array<{ name: string; x: number; y: number }> = [
    { name: "Seattle",       x: 82,  y: 108 },
    { name: "New York",      x: 190, y: 138 },
    { name: "Los Angeles",   x: 90,  y: 160 },
    { name: "Mexico City",   x: 142, y: 200 },
    { name: "São Paulo",     x: 236, y: 288 },
    { name: "Buenos Aires",  x: 228, y: 324 },
    { name: "London",        x: 382, y: 94  },
    { name: "Amsterdam",     x: 396, y: 86  },
    { name: "Istanbul",      x: 488, y: 120 },
    { name: "Cairo",         x: 468, y: 168 },
    { name: "Nairobi",       x: 488, y: 238 },
    { name: "Cape Town",     x: 432, y: 334 },
    { name: "Dubai",         x: 524, y: 160 },
    { name: "Mumbai",        x: 562, y: 180 },
    { name: "Singapore",     x: 642, y: 220 },
    { name: "Bangkok",       x: 630, y: 196 },
    { name: "Tokyo",         x: 678, y: 122 },
    { name: "Sydney",        x: 704, y: 306 },
    { name: "Johannesburg",  x: 468, y: 312 },
  ];

  const routes: [string, string][] = [
    ["New York",     "London"],
    ["New York",     "Amsterdam"],
    ["New York",     "São Paulo"],
    ["New York",     "Mexico City"],
    ["Los Angeles",  "New York"],
    ["Los Angeles",  "Tokyo"],
    ["Seattle",      "Tokyo"],
    ["Seattle",      "New York"],
    ["São Paulo",    "Buenos Aires"],
    ["São Paulo",    "London"],
    ["London",       "Dubai"],
    ["London",       "Istanbul"],
    ["London",       "Nairobi"],
    ["Amsterdam",    "Cairo"],
    ["Istanbul",     "Dubai"],
    ["Istanbul",     "Mumbai"],
    ["Cairo",        "Nairobi"],
    ["Nairobi",      "Johannesburg"],
    ["Johannesburg", "Cape Town"],
    ["Nairobi",      "Dubai"],
    ["Dubai",        "Mumbai"],
    ["Dubai",        "Singapore"],
    ["Dubai",        "Tokyo"],
    ["Mumbai",       "Singapore"],
    ["Mumbai",       "Bangkok"],
    ["Bangkok",      "Singapore"],
    ["Singapore",    "Tokyo"],
    ["Singapore",    "Sydney"],
    ["Tokyo",        "Sydney"],
    ["Mexico City",  "São Paulo"],
  ];

  const cityMap = Object.fromEntries(cities.map(c => [c.name, c]));

  return (
    <svg viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Route arcs */}
      {routes.map(([from, to], i) => {
        const a = cityMap[from], b = cityMap[to];
        if (!a || !b) return null;
        const mx = ((a.x + b.x) / 2).toFixed(3);
        const my = (a.y + b.y) / 2;
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const lift = Math.min(dist * 0.22, 55);
        const cy = (my - lift).toFixed(3);
        return (
          <path key={i} d={`M ${a.x} ${a.y} Q ${mx} ${cy} ${b.x} ${b.y}`}
            stroke="currentColor" strokeWidth="0.6" strokeDasharray="2.5 3.5" fill="none" />
        );
      })}
      {/* City dots + labels */}
      {cities.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="2.8" fill="currentColor" />
          <circle cx={c.x} cy={c.y} r="5"   stroke="currentColor" strokeWidth="0.5" fill="none" />
          <text x={c.x + 7} y={c.y + 1} fontSize="6.5" fill="currentColor" fontFamily="monospace" dominantBaseline="middle">{c.name}</text>
        </g>
      ))}
    </svg>
  );
}

function StepRow({
  n,
  title,
  body,
  last,
}: {
  n: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: "flex", gap: 24, alignItems: "flex-start",
        marginBottom: last ? 0 : 48,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-18px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {/* Map pin marker */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "color-mix(in srgb, var(--sage) 14%, var(--cream-warm))",
          border: "1.5px solid rgba(110,128,104,.32)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono), monospace", fontSize: 10,
          color: "var(--sage-deep)", letterSpacing: "0.04em",
          position: "relative", zIndex: 1,
          boxShadow: "0 0 0 3px var(--cream-warm)",
        }}>
          {n}
        </div>
      </div>
      <div style={{ flex: 1, paddingBottom: last ? 0 : 0 }}>
        <h3 style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "clamp(18px, 2vw, 24px)", fontWeight: 500,
          letterSpacing: "-0.02em", color: "var(--charcoal)", marginBottom: 7,
        }}>
          {title}
        </h3>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--mocha)", lineHeight: 1.7 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

