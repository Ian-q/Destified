import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/session";
import { listJourneysAction } from "@/lib/deals/journey-actions";
import { NewJourney } from "./new-journey";

export default async function ComparePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const journeys = await listJourneysAction();

  return (
    <div style={{ minHeight: "100svh", background: "var(--cream-warm)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/organizer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--mocha)",
            textDecoration: "none",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          ← Back to organizer
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            fontWeight: 500,
            marginBottom: 28,
            color: "var(--charcoal)",
          }}
        >
          Compare
        </h1>

        <NewJourney />

        {journeys.length > 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 28,
              boxShadow: "0 2px 12px rgba(0,0,0,.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 20,
                fontWeight: 500,
                marginBottom: 16,
              }}
            >
              Your journeys
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {journeys.map((j) => (
                <li
                  key={j.id}
                  style={{
                    borderBottom: "1px solid rgba(148,139,130,.12)",
                    padding: "12px 0",
                  }}
                >
                  <Link
                    href={`/compare/${j.id}`}
                    style={{
                      color: "var(--charcoal)",
                      textDecoration: "none",
                      fontSize: 15,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>
                      {j.fromLabel} → {j.toLabel}
                    </span>
                    {(j.departDate ?? j.returnDate) && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--mocha)",
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {j.departDate ?? ""}
                        {j.departDate && j.returnDate ? " – " : ""}
                        {j.returnDate ?? ""}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {journeys.length === 0 && (
          <p
            style={{
              fontSize: 14,
              color: "var(--mocha)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            No journeys yet — create one above to start comparing deals.
          </p>
        )}
      </div>
    </div>
  );
}
