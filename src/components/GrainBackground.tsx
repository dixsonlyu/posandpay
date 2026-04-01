import React from "react";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const blobs = [
  { color: "#b0bec5", size: 420, top: "-8%", left: "-6%", blur: 100, opacity: 0.8, anim: "blobA 18s ease-in-out infinite alternate" },
  { color: "#90a4ae", size: 360, top: "60%", right: "-5%", blur: 90, opacity: 0.75, anim: "blobB 24s ease-in-out infinite alternate" },
  { color: "#cfd8dc", size: 500, top: "30%", left: "35%", blur: 120, opacity: 0.7, anim: "blobC 30s ease-in-out infinite alternate" },
  { color: "#78909c", size: 320, bottom: "-10%", left: "10%", blur: 80, opacity: 0.85, anim: "blobD 22s ease-in-out infinite alternate" },
  { color: "#eceff1", size: 380, top: "10%", right: "20%", blur: 110, opacity: 0.7, anim: "blobE 26s ease-in-out infinite alternate" },
];

const GrainBackground: React.FC = () => (
  <div
    className="fixed inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
    style={{ pointerEvents: "none" }}
  >
    {blobs.map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: b.size,
          height: b.size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
          filter: `blur(${b.blur}px)`,
          opacity: b.opacity,
          top: b.top,
          left: b.left,
          right: (b as any).right,
          bottom: (b as any).bottom,
          animation: b.anim,
          willChange: "transform",
        }}
      />
    ))}

    {/* Grain noise overlay */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: NOISE_SVG,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        opacity: 0.4,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  </div>
);

export default GrainBackground;
