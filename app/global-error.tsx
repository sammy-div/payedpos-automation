"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <h2 style={{ fontWeight: 600, fontSize: "16px" }}>Something went wrong</h2>
          <p style={{ color: "#5B6270", fontSize: "14px", marginTop: "6px", maxWidth: "380px" }}>
            The application failed to load. This platform never writes to PayedPOS, so your data is unaffected.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "20px",
              background: "#0E7C86",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
