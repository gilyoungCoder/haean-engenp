"use client"

export function AmbientBackground() {
  return (
    <div className="landing-mesh-bg" aria-hidden="true">
      {/* Orb 1 - Large purple */}
      <div
        className="absolute animate-float-1 rounded-full opacity-30 blur-3xl"
        style={{
          width: "600px",
          height: "600px",
          top: "-10%",
          left: "-5%",
          background:
            "radial-gradient(circle, oklch(0.5 0.2 280 / 0.6), transparent 70%)",
        }}
      />
      {/* Orb 2 - Medium indigo */}
      <div
        className="absolute animate-float-2 rounded-full opacity-25 blur-3xl"
        style={{
          width: "500px",
          height: "500px",
          top: "40%",
          right: "-8%",
          background:
            "radial-gradient(circle, oklch(0.45 0.18 260 / 0.5), transparent 70%)",
        }}
      />
      {/* Orb 3 - Small violet */}
      <div
        className="absolute animate-float-1 rounded-full opacity-20 blur-3xl"
        style={{
          width: "400px",
          height: "400px",
          bottom: "-5%",
          left: "30%",
          background:
            "radial-gradient(circle, oklch(0.55 0.22 290 / 0.4), transparent 70%)",
          animationDelay: "2s",
        }}
      />
    </div>
  )
}
