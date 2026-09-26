import React from 'react'

interface GoseeitIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
  showBackground?: boolean
}

export function GoseeitIcon({
  size = 30,
  className = '',
  showBackground = true,
  ...props
}: GoseeitIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="refinedBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#161822" />
          <stop offset="100%" stopColor="#0a0b10" />
        </linearGradient>

        <linearGradient id="refinedChassis" x1="32" y1="17" x2="32" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#242c3e" />
          <stop offset="100%" stopColor="#121622" />
        </linearGradient>

        <filter id="refinedGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {showBackground && (
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill="url(#refinedBg)"
          stroke="#2f5bff"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
      )}

      {/* Rubber Mounting Feet */}
      <rect x="15" y="45" width="8" height="2.5" rx="1.2" fill="#101420" />
      <rect x="41" y="45" width="8" height="2.5" rx="1.2" fill="#101420" />

      {/* Precision Unibody Chassis */}
      <rect x="9" y="17" width="46" height="28" rx="6" fill="url(#refinedChassis)" stroke="#2f5bff" strokeWidth="2" />

      {/* Top Heat Ventilation Array (4 Symmetrical Micro-Slots) */}
      <g opacity="0.75">
        <rect x="21" y="20.5" width="4.5" height="1.8" rx="0.9" fill="#3b82f6" />
        <rect x="27.5" y="20.5" width="4.5" height="1.8" rx="0.9" fill="#3b82f6" />
        <rect x="34" y="20.5" width="4.5" height="1.8" rx="0.9" fill="#3b82f6" />
        <rect x="40.5" y="20.5" width="4.5" height="1.8" rx="0.9" fill="#3b82f6" />
      </g>

      {/* Inset Dark Glass Faceplate (Uniform 3px Margin All Around) */}
      <rect x="12" y="25" width="40" height="17" rx="3.5" fill="#090c14" stroke="#1d263a" strokeWidth="1" />

      {/* Telemetry Pulse Wave */}
      <g filter="url(#refinedGlow)">
        <path
          d="M15 33.5 L20.5 33.5 L23 28 L27 39 L29.5 33.5 L36 33.5"
          stroke="#00f5ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="36" cy="33.5" r="1.1" fill="#00f5ff" />
      </g>

      {/* Dual Status LEDs */}
      <g filter="url(#refinedGlow)">
        <circle cx="41.5" cy="33.5" r="1.3" fill="#10b981" />
        <circle cx="46" cy="33.5" r="2.8" fill="#00f5ff" />
        <circle cx="46" cy="33.5" r="1.2" fill="#ffffff" />
      </g>
    </svg>
  )
}
