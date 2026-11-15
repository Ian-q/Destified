"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, MapPin } from "lucide-react";
import { toast } from "@/components/destified/toast";
import { signInDemoAction } from "@/lib/auth-actions";

type Mode = "signin" | "signup";

const DESTINATIONS = [
  { text: "Kyoto", x: 14, y: 20, size: 11, r: -8, o: 0.22, dur: "7s" },
  { text: "Patagonia", x: 60, y: 13, size: 10, r: 4, o: 0.18, dur: "9s" },
  { text: "Santorini", x: 7, y: 46, size: 9.5, r: -4, o: 0.16, dur: "11s" },
  { text: "Marrakech", x: 68, y: 34, size: 10.5, r: 6, o: 0.20, dur: "8s" },
  { text: "Reykjavik", x: 24, y: 70, size: 9, r: -6, o: 0.14, dur: "12s" },
  { text: "Bali", x: 76, y: 60, size: 12, r: 3, o: 0.22, dur: "7.5s" },
  { text: "Amalfi", x: 40, y: 54, size: 10, r: -3, o: 0.17, dur: "10s" },
  { text: "Dubrovnik", x: 53, y: 80, size: 9, r: 5, o: 0.13, dur: "13s" },
  { text: "Queenstown", x: 10, y: 86, size: 8.5, r: -5, o: 0.12, dur: "9.5s" },
  { text: "Lisbon", x: 80, y: 86, size: 11, r: 2, o: 0.18, dur: "8s" },
  { text: "Cappadocia", x: 44, y: 30, size: 9, r: -2, o: 0.15, dur: "11.5s" },
  { text: "Havana", x: 30, y: 8, size: 10.5, r: 3, o: 0.16, dur: "8.5s" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);

  const bypassLogin = async () => {
    try {
      await signInDemoAction();
      router.push("/organizer");
    } catch (err) {
      console.error('[bypassLogin] signInDemoAction failed:', err);
    }
  };

  return (
    <>
      <style>{`
        @keyframes dest-drift {
          0%, 100% { transform: translateY(0) rotate(var(--dr)); opacity: var(--do); }
          50%       { transform: translateY(-9px) rotate(var(--dr)); opacity: calc(var(--do) * 1.45); }
        }
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes form-swap {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .dest-word { animation: dest-drift var(--dur) ease-in-out infinite; }
        .form-appear { animation: panel-in 0.55s ease both; }
        .field-appear { animation: form-swap 0.28s ease both; }

        .input-field {
          width: 100%;
          background: rgba(253,251,247,.7);
          border: 1.5px solid rgba(148,139,130,.18);
          border-radius: 10px;
          padding: 11px 14px;
          font-family: var(--font-sans);
          font-size: 14px;
          color: var(--charcoal);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .input-field::placeholder { color: var(--mocha-soft); }
        .input-field:focus {
          border-color: var(--ocean);
          background: white;
          box-shadow: 0 0 0 3.5px rgba(45,90,123,.09);
        }
        .btn-main {
          width: 100%;
          padding: 12.5px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%);
          color: var(--cream);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(45,90,123,.22);
          transition: opacity 0.18s, transform 0.14s, box-shadow 0.18s;
        }
        .btn-main:hover {
          opacity: 0.91;
          transform: translateY(-1px);
          box-shadow: 0 6px 26px rgba(45,90,123,.28);
        }
        .btn-main:active { transform: translateY(0); opacity: 1; }

        .btn-google {
          width: 100%;
          padding: 11px;
          border-radius: 999px;
          background: white;
          color: var(--charcoal);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          border: 1.5px solid rgba(148,139,130,.22);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .btn-google:hover {
          border-color: rgba(148,139,130,.38);
          box-shadow: 0 2px 14px rgba(0,0,0,.06);
        }

        .tab-btn {
          flex: 1;
          padding: 9px 0;
          font-family: var(--font-sans);
          font-size: 13.5px;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .link-inline {
          background: none;
          border: none;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--ocean);
          font-weight: 500;
          padding: 0;
          text-decoration: none;
        }
        .link-inline:hover { text-decoration: underline; }
        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--mocha);
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--charcoal); }

        @media (max-width: 1023px) {
          .brand-panel { display: none !important; }
          .mobile-logo { display: block !important; }
        }
        .mobile-logo { display: none; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100svh" }}>

        {/* ── Brand panel ─────────────────────────────────────────── */}
        <div
          className="brand-panel"
          style={{
            flex: "0 0 44%",
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(150deg, #1e2730 0%, #18222c 45%, #1a2f3f 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "44px 52px 48px",
          }}
        >
          {/* Atmospheric glows */}
          <div style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 45% at 28% 38%, rgba(139,157,131,.11) 0%, transparent 55%)," +
              "radial-gradient(ellipse 55% 40% at 75% 70%, rgba(192,120,86,.09) 0%, transparent 55%)," +
              "radial-gradient(ellipse 50% 35% at 55% 8%, rgba(184,168,216,.07) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />

          {/* Subtle grid pattern */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            pointerEvents: "none",
          }} />

          {/* Floating destination names */}
          {DESTINATIONS.map((d) => (
            <div
              key={d.text}
              className="dest-word"
              style={{
                position: "absolute",
                left: `${d.x}%`,
                top: `${d.y}%`,
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: d.size,
                color: "white",
                letterSpacing: "0.05em",
                fontStyle: "italic",
                opacity: d.o,
                ["--dr" as string]: `${d.r}deg`,
                ["--do" as string]: d.o,
                ["--dur" as string]: d.dur,
                transform: `rotate(${d.r}deg)`,
                userSelect: "none",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {d.text}
            </div>
          ))}

          {/* Logo */}
          <Link href="/" style={{ display: "flex", lineHeight: 0, position: "relative", zIndex: 1 }}>
            <img src="/logo.png" alt="Destified" style={{ width: 32, height: 32, borderRadius: 9 }} />
          </Link>

          {/* Central quote */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              width: 32,
              height: 2,
              background: "var(--terracotta)",
              borderRadius: 2,
              marginBottom: 22,
              opacity: 0.65,
            }} />
            <p style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(20px, 2.2vw, 30px)",
              fontWeight: 400,
              color: "rgba(253,251,247,.86)",
              lineHeight: 1.42,
              letterSpacing: "-0.022em",
              maxWidth: 340,
            }}>
              Every great journey begins with a single
              <em style={{ fontStyle: "italic", color: "#E8B89C" }}> plan.</em>
            </p>
          </div>

          {/* Testimonial */}
          <div style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "flex-start",
            gap: 13,
            padding: "18px 20px",
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 14,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--sage) 0%, var(--terracotta) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <MapPin size={14} color="white" />
            </div>
            <div>
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "rgba(253,251,247,.58)",
                lineHeight: 1.55,
                margin: 0,
              }}>
                &ldquo;Planning our honeymoon used to feel overwhelming — Destified made it feel like the adventure itself.&rdquo;
              </p>
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                color: "rgba(253,251,247,.3)",
                marginTop: 6,
              }}>
                — Maya & David, SE Asia
              </p>
            </div>
          </div>
        </div>

        {/* ── Form panel ──────────────────────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "var(--cream-warm)",
          position: "relative",
          overflowY: "auto",
          minHeight: "100svh",
        }}>
          {/* Back link */}
          <Link href="/" className="back-link" style={{ position: "absolute", top: 24, left: 28 }}>
            <ArrowLeft size={13} />
            Home
          </Link>

          {/* Mobile logo */}
          <div className="mobile-logo" style={{ marginBottom: 32, textAlign: "center" }}>
            <span style={{
              fontFamily: "var(--font-sans), Inter, sans-serif",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "var(--charcoal)",
            }}>
              Dest<span style={{ color: "var(--sage-deep)" }}>ified</span>
            </span>
          </div>

          <div className="form-appear" style={{ width: "100%", maxWidth: 400 }}>

            {/* Mode toggle */}
            <div style={{
              display: "flex",
              gap: 2,
              background: "rgba(148,139,130,.1)",
              borderRadius: 11,
              padding: 3,
              marginBottom: 30,
            }}>
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="tab-btn"
                  style={{
                    color: mode === m ? "var(--charcoal)" : "var(--mocha)",
                    background: mode === m ? "white" : "transparent",
                    boxShadow: mode === m ? "0 1px 5px rgba(0,0,0,.09)" : "none",
                  }}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 26 }}>
              <h1 style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontSize: "clamp(22px, 2.8vw, 30px)",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                color: "var(--charcoal)",
                marginBottom: 7,
                lineHeight: 1.2,
              }}>
                {mode === "signin" ? "Welcome back" : "Start your journey"}
              </h1>
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: 13.5,
                color: "var(--mocha)",
                lineHeight: 1.55,
              }}>
                {mode === "signin"
                  ? "Sign in to pick up where you left off."
                  : "Create your free account — no credit card needed."}
              </p>
            </div>

            {/* Social auth buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <button type="button" className="btn-google" onClick={bypassLogin}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <button type="button" className="btn-google" onClick={bypassLogin}>
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.18.8 1.22-.26 2.38-1.01 3.7-.9 1.58.13 2.77.79 3.55 1.99-3.23 1.94-2.47 5.89.54 7.02-.65 1.58-1.49 3.14-3.0 3.97zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(148,139,130,.16)" }} />
              <span style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--mocha-soft)",
                letterSpacing: "0.04em",
              }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(148,139,130,.16)" }} />
            </div>

            {/* Fields */}
            <form
              onSubmit={(e) => {
                // TODO: real auth — for the prototype any submit goes to /organizer via bypassLogin (issue #6)
                e.preventDefault();
                bypassLogin();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >

              {mode === "signup" && (
                <div className="field-appear">
                  <FieldLabel>Full name</FieldLabel>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Jane Smith"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6,
                }}>
                  <FieldLabel style={{ margin: 0 }}>Password</FieldLabel>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => toast("Password reset — coming soon")}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        color: "var(--ocean)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        opacity: 0.82,
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    className="input-field"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--mocha-soft)",
                      display: "flex",
                      alignItems: "center",
                      padding: 2,
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-main" style={{ marginTop: 2 }}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>

              <button
                type="button"
                onClick={bypassLogin}
                style={{
                  marginTop: 6,
                  width: "100%",
                  padding: "10px",
                  background: "transparent",
                  border: "1.5px dashed rgba(148,139,130,.32)",
                  borderRadius: 999,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--mocha)",
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  transition: "border-color 0.18s, color 0.18s",
                }}
              >
                Skip — try the demo
              </button>
            </form>

            {mode === "signup" && (
              <p style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--mocha-soft)",
                textAlign: "center",
                marginTop: 18,
                lineHeight: 1.6,
              }}>
                By creating an account you agree to our{" "}
                <button
                  type="button"
                  onClick={() => toast("Terms — coming soon")}
                  className="link-inline"
                  style={{ color: "var(--mocha)", textDecoration: "underline", fontSize: 11.5 }}
                >
                  Terms
                </button>
                {" "}and{" "}
                <button
                  type="button"
                  onClick={() => toast("Privacy policy — coming soon")}
                  className="link-inline"
                  style={{ color: "var(--mocha)", textDecoration: "underline", fontSize: 11.5 }}
                >
                  Privacy Policy
                </button>
                .
              </p>
            )}

            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--mocha)",
              textAlign: "center",
              marginTop: 26,
            }}>
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="link-inline"
              >
                {mode === "signin" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function FieldLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      fontFamily: "var(--font-sans)",
      fontSize: 11.5,
      fontWeight: 500,
      color: "var(--mocha)",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 6,
      ...style,
    }}>
      {children}
    </div>
  );
}
