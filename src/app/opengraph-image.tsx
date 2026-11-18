import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = "Destified — get more from your points, cards and memberships";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #f6f1e7 0%, #ebe3d3 100%)",
          color: "#2b2622",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 600, letterSpacing: "-0.04em" }}>{SITE_NAME}</div>
        <div style={{ marginTop: 28, fontSize: 44, lineHeight: 1.3, color: "#5b4d42", maxWidth: 960 }}>
          Get more from the points, cards and memberships you already have.
        </div>
      </div>
    ),
    { ...size },
  );
}
