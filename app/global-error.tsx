"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] root render failed:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          margin: 0,
          background: "#fafaf7",
          color: "#171717",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "4rem 1.5rem",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#737373",
            }}
          >
            Error · 500
          </span>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              margin: "1rem 0 0",
            }}
          >
            The forge stuttered.
          </h1>
          <p
            style={{
              marginTop: "1rem",
              maxWidth: 420,
              fontSize: 16,
              lineHeight: 1.6,
              color: "#525252",
            }}
          >
            An unexpected error occurred. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              height: 48,
              padding: "0 1.5rem",
              borderRadius: 9999,
              border: 0,
              background: "#171717",
              color: "#fafaf7",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
