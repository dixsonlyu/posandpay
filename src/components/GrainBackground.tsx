import React from "react";

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const blobs = [
  { color: "#90a4ae", size: 480, top: "-10%", left: "-8%", blur: 80, opacity: 0.9, anim: "blobA 12s ease-in-out infinite alternate" },
  { color: "#78909c", size: 400, top: "55%", right: "-8%", blur: 70, opacity: 0.85, anim: "blobB 16s ease-in-out infinite alternate" },
  { color: "#b0bec5", size: 550, top: "25%", left: "30%", blur: 100, opacity: 0.8, anim: "blobC 20s ease-in-out infinite alternate" },
  { color: "#607d8b", size: 360, bottom: "-12%", left: "8%", blur: 65, opacity: 0.9, anim: "blobD 14s ease-in-out infinite alternate" },
  { color: "#cfd8dc", size: 420, top: "5%", right: "15%", blur: 90, opacity: 0.85, anim: "blobE 18s ease-in-out infinite alternate" },
];

const GrainBackground: React.FC = () => (
  <div
    className="absolute inset-0 -z-10 overflow-hidden"
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
          top: (b as any).top,
          left: (b as any).left,
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
