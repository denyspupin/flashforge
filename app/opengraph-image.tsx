import { ImageResponse } from "next/og"

export const alt = "FlashForge — forge your fluency, one flash at a time"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const runtime = "edge"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #fafaf7 0%, #f1ede4 55%, #f9e6d2 100%)",
          color: "#171717",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            letterSpacing: "-0.02em",
            color: "#525252",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#171717",
              color: "#fafaf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            ⚒
          </div>
          <span style={{ fontWeight: 500 }}>FlashForge</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: "-0.05em",
              maxWidth: 1000,
            }}
          >
            Forge your fluency,
            <br />
            <span style={{ color: "#d97142" }}>one flash at a time.</span>
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: 28,
              color: "#525252",
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            A quiet workshop for vocabulary — build decks, study with focus,
            and stack the small wins.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#737373",
            letterSpacing: "0.04em",
          }}
        >
          <span style={{ textTransform: "uppercase" }}>
            flashforge.denyspupin.dev
          </span>
          <span style={{ textTransform: "uppercase" }}>MIT · Open source</span>
        </div>
      </div>
    ),
    size
  )
}
