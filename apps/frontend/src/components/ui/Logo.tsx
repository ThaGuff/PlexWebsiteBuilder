interface LogoProps {
  size?: number
  className?: string
  animate?: boolean
  showText?: boolean
}

export function Logo({ size = 36, className = '', animate = false, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Frog Logo */}
      <div className={animate ? 'logo-hop' : ''} style={{ width: size, height: size, flexShrink: 0 }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" width={size} height={size}>
          {/* Web circles */}
          <circle cx="24" cy="24" r="22" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          <circle cx="24" cy="24" r="14" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          <circle cx="24" cy="24" r="7" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          {/* Web radial lines */}
          <line x1="24" y1="2" x2="24" y2="46" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          <line x1="2" y1="24" x2="46" y2="24" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          <line x1="7.51" y1="7.51" x2="40.49" y2="40.49" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>
          <line x1="40.49" y1="7.51" x2="7.51" y2="40.49" stroke="#C8E20A" strokeWidth="0.6" strokeOpacity="0.25"/>

          {/* Frog body */}
          <ellipse cx="24" cy="28" rx="9" ry="8" fill="#C8E20A"/>
          {/* Frog head */}
          <ellipse cx="24" cy="20.5" rx="7.5" ry="6.5" fill="#C8E20A"/>
          
          {/* Left eye socket */}
          <circle cx="20" cy="16.5" r="3.8" fill="#1A1A1A" stroke="#C8E20A" strokeWidth="1"/>
          {/* Right eye socket */}
          <circle cx="28" cy="16.5" r="3.8" fill="#1A1A1A" stroke="#C8E20A" strokeWidth="1"/>
          {/* Eye shines */}
          <circle cx="21.3" cy="15.2" r="1.3" fill="white"/>
          <circle cx="29.3" cy="15.2" r="1.3" fill="white"/>
          {/* Pupils */}
          <circle cx="20.6" cy="17" r="1.6" fill="#050505"/>
          <circle cx="28.6" cy="17" r="1.6" fill="#050505"/>
          
          {/* Smile */}
          <path d="M20 22 Q24 25.5 28 22" stroke="#1A1A1A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          
          {/* Nostrils */}
          <circle cx="22.5" cy="20.5" r="0.9" fill="#A8BF08"/>
          <circle cx="25.5" cy="20.5" r="0.9" fill="#A8BF08"/>
          
          {/* Front feet */}
          <path d="M15 29 Q10 31 9.5 35 Q11.5 35.5 13.5 33" fill="#C8E20A"/>
          <path d="M33 29 Q38 31 38.5 35 Q36.5 35.5 34.5 33" fill="#C8E20A"/>
          
          {/* Back legs */}
          <path d="M17 34.5 Q12 38 11 42 Q14.5 43 17 39.5 Q18 37 20 36" fill="#A8BF08"/>
          <path d="M31 34.5 Q36 38 37 42 Q33.5 43 31 39.5 Q30 37 28 36" fill="#A8BF08"/>
          
          {/* Belly highlight */}
          <ellipse cx="24" cy="28.5" rx="5" ry="4.5" fill="#D8EE33" fillOpacity="0.45"/>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-display font-bold tracking-tight text-white"
            style={{ fontSize: size * 0.56, letterSpacing: '-0.02em' }}
          >
            Web<span className="text-lime">Hop</span>
          </span>
          {size >= 32 && (
            <span
              className="text-white/40 font-sans tracking-widest uppercase"
              style={{ fontSize: size * 0.22 }}
            >
              AI Builder
            </span>
          )}
        </div>
      )}
    </div>
  )
}
