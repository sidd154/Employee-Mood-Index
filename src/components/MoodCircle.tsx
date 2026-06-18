import React from 'react';

interface MoodCircleProps {
  score: 1 | 2 | 3 | 4 | 5;
  active?: boolean;
  onClick?: () => void;
  size?: number;
  label?: string;
  showLabel?: boolean;
}

export const MoodCircle: React.FC<MoodCircleProps> = ({
  score,
  active = false,
  onClick,
  size = 64,
  label,
  showLabel = true,
}) => {
  // Configs for each score
  const configs = {
    5: {
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
      activeColor: 'bg-emerald-600 text-white border-emerald-500 ring-4 ring-emerald-500/30',
      name: 'Great',
      // SVG paths for face elements inside a 100x100 viewBox
      face: (
        <>
          {/* Laughing eyes */}
          <path d="M 30,42 Q 35,35 40,42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 60,42 Q 65,35 70,42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Big happy mouth */}
          <path d="M 32,58 Q 50,78 68,58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 32,58 Q 50,70 68,58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="currentColor" />
        </>
      ),
    },
    4: {
      color: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
      activeColor: 'bg-green-500 text-white border-green-500 ring-4 ring-green-500/30',
      name: 'Good',
      face: (
        <>
          {/* Smiling eyes */}
          <circle cx="35" cy="40" r="5" fill="currentColor" />
          <circle cx="65" cy="40" r="5" fill="currentColor" />
          {/* Smile */}
          <path d="M 35,58 Q 50,72 65,58" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ),
    },
    3: {
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20',
      activeColor: 'bg-yellow-500 text-slate-900 border-yellow-500 ring-4 ring-yellow-500/30',
      name: 'Okay',
      face: (
        <>
          {/* Dot eyes */}
          <circle cx="35" cy="40" r="5" fill="currentColor" />
          <circle cx="65" cy="40" r="5" fill="currentColor" />
          {/* Straight line mouth */}
          <line x1="32" y1="60" x2="68" y2="60" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </>
      ),
    },
    2: {
      color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20',
      activeColor: 'bg-orange-500 text-white border-orange-500 ring-4 ring-orange-500/30',
      name: 'Bad',
      face: (
        <>
          {/* Sad eyes */}
          <circle cx="35" cy="42" r="5" fill="currentColor" />
          <circle cx="65" cy="42" r="5" fill="currentColor" />
          {/* Sad frown */}
          <path d="M 35,65 Q 50,52 65,65" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ),
    },
    1: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
      activeColor: 'bg-red-500 text-white border-red-500 ring-4 ring-red-500/30',
      name: 'Awful',
      face: (
        <>
          {/* Angry eyes/eyebrows */}
          <line x1="28" y1="33" x2="40" y2="38" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <line x1="72" y1="33" x2="60" y2="38" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <circle cx="35" cy="45" r="5" fill="currentColor" />
          <circle cx="65" cy="45" r="5" fill="currentColor" />
          {/* Angry mouth */}
          <path d="M 33,68 Q 50,48 67,68" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ),
    },
  };

  const config = configs[score];
  const colorClass = active ? config.activeColor : config.color;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-center justify-center transition-all duration-300 focus:outline-none ${
        onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'
      }`}
    >
      <div
        className={`rounded-full border flex items-center justify-center transition-all duration-300 ${colorClass}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full p-2 transition-transform duration-500 ${active ? 'scale-110' : 'scale-100 hover:scale-105'}`}
          aria-hidden="true"
        >
          {config.face}
        </svg>
      </div>
      {showLabel && (
        <span
          className={`mt-2.5 text-xs font-semibold tracking-wide transition-colors duration-300 ${
            active ? 'text-white' : 'text-slate-400'
          }`}
        >
          {label || config.name}
        </span>
      )}
    </button>
  );
};
