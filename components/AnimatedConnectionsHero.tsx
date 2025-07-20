import React from 'react';
import Image from 'next/image';

const AnimatedConnectionsHero = () => {
  // File types with app-style icons
  const connections = [
    { 
      id: 1, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Images',
      angle: 0, 
      delay: 0,
      bgColor: 'bg-blue-500'
    },
    { 
      id: 2, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Videos',
      angle: 72, 
      delay: 0.3,
      bgColor: 'bg-red-500'
    },
    { 
      id: 3, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'Documents',
      angle: 144, 
      delay: 0.6,
      bgColor: 'bg-green-500'
    },
    { 
      id: 4, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      label: 'Audio',
      angle: 216, 
      delay: 0.9,
      bgColor: 'bg-purple-500'
    },
    { 
      id: 5, 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      label: 'Code',
      angle: 288, 
      delay: 1.2,
      bgColor: 'bg-orange-500'
    },
  ];

  const radius = 160;

  return (
    <div className="relative w-full h-96 flex items-center justify-center">
      
      {/* Clean connection lines */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0)' }} />
            <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.3)' }} />
            <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0)' }} />
          </linearGradient>
        </defs>
        
        {connections.map((connection) => {
          const x1 = 50;
          const y1 = 50;
          const x2 = 50 + (radius / 384) * 100 * Math.cos((connection.angle * Math.PI) / 180);
          const y2 = 50 + (radius / 384) * 100 * Math.sin((connection.angle * Math.PI) / 180);
          
          return (
            <g key={connection.id}>
              {/* Static connection line */}
              <line
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              
              {/* Subtle animated pulse */}
              <line
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="url(#lineGradient)"
                strokeWidth="1"
                style={{
                  strokeDasharray: '2 10',
                  strokeDashoffset: '12',
                  animation: `pulse-flow 3s ease-in-out infinite`,
                  animationDelay: `${connection.delay}s`,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Large central ThirdStorage icon - like the purple checkmark in reference */}
      <div className="relative z-20">
        <div className="relative group">
          {/* Main large hub */}
          <div className="w-32 h-32 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 group-hover:scale-105 transition-transform duration-300">
            <div className="relative">
              <Image 
                src="/white.svg" 
                alt="ThirdStorage" 
                width={40} 
                height={40} 
                className="filter invert opacity-95" 
              />
            </div>
          </div>
          
          {/* Subtle outer glow */}
          <div className="absolute inset-0 rounded-3xl bg-indigo-400/20 blur-xl animate-pulse"></div>
        </div>
      </div>

      {/* Small app-style file type icons around the center */}
      {connections.map((connection) => {
        const x = 50 + (radius / 384) * 100 * Math.cos((connection.angle * Math.PI) / 180);
        const y = 50 + (radius / 384) * 100 * Math.sin((connection.angle * Math.PI) / 180);
        
        return (
          <div
            key={connection.id}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 group"
            style={{ 
              left: `${x}%`, 
              top: `${y}%`,
              animation: `gentle-float 4s ease-in-out infinite`,
              animationDelay: `${connection.delay}s`
            }}
          >
            {/* Small app-style icon */}
            <div className={`w-12 h-12 ${connection.bgColor} rounded-2xl flex items-center justify-center shadow-lg border border-white/10 group-hover:scale-110 transition-all duration-300`}>
              <div className="text-white">
                {connection.icon}
              </div>
            </div>
            
            {/* Small activity dot */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border border-white/20 animate-pulse"></div>
            
            {/* Hover label */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white whitespace-nowrap">
                {connection.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Minimal floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${30 + Math.random() * 40}%`,
              top: `${30 + Math.random() * 40}%`,
              animation: `drift 8s linear infinite`,
              animationDelay: `${i * 2.5}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse-flow {
          0%, 100% {
            stroke-dashoffset: 12;
            opacity: 0.2;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 0.6;
          }
        }
        
        @keyframes gentle-float {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-2px);
          }
        }
        
        @keyframes drift {
          0% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          50% {
            transform: translateY(-15px) translateX(8px);
            opacity: 0.4;
          }
          100% {
            transform: translateY(-30px) translateX(15px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedConnectionsHero; 