import Link from "next/link";

const LINKS = [
  { label: "Home",      href: "/"          },
  { label: "Organizer", href: "/organizer" },
  { label: "Sign in",   href: "/login"     },
];

export function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px 24px",
        minHeight: 58,
        padding: "0 28px",
        borderTop: "1px solid rgba(148,139,130,.1)",
      }}
    >
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--charcoal)",
          textDecoration: "none",
        }}
      >
        Dest<em style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>ified</em>
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--mocha)",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: 6,
              transition: "color 0.18s ease",
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Copyright */}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--mocha-soft)",
          letterSpacing: "0.01em",
        }}
      >
        © 2026 Destified
      </span>
    </footer>
  );
}
