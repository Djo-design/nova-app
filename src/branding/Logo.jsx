// src/branding/Logo.jsx
export function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Hexagone extérieur */}
      <polygon points="24,2 44,13 44,35 24,46 4,35 4,13" stroke="#00FF87" strokeWidth="1.5" fill="none" filter="url(#glow)" />
      {/* Triangle intérieur */}
      <polygon points="24,10 38,32 10,32" stroke="#7B2FBE" strokeWidth="1.5" fill="none" filter="url(#glow)" />
      {/* Point central */}
      <circle cx="24" cy="24" r="3" fill="#00FF87" filter="url(#glow)" />
    </svg>
  )
}
