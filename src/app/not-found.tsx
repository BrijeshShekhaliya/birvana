export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "min(540px, 100%)",
          border: "1px solid var(--line)",
          borderRadius: "2rem",
          padding: "1.5rem",
          background: "rgba(255, 250, 241, 0.88)",
          boxShadow: "var(--shadow)",
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.22em" }}>
          Not found
        </p>
        <h1
          style={{
            margin: "0.75rem 0 0",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(2rem, 7vw, 3rem)",
            letterSpacing: "-0.06em",
          }}
        >
          This page does not exist.
        </h1>
      </div>
    </main>
  );
}
