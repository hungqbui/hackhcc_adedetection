import React from 'react';
import SoftAurora from './SoftAurora';

interface LandingPageProps {
  onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Background Aurora */}
      <div className="absolute inset-0 z-0">
        <SoftAurora
          color1="#ffffff"
          color2="#3b82f6"
          speed={0.5}
          brightness={1.0}
        />
      </div>

      {/* Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-24 bg-slate-900/40 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-xl">M</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">MedEase</span>
        </div>
        <div>
          <button 
            onClick={onLoginClick}
            className="px-5 py-2 bg-white text-slate-900 rounded-full font-medium hover:bg-slate-100 transition-colors shadow-sm"
          >
            Sign up
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center pb-20">
        {/* Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm mb-8">
          <span className="px-2 py-0.5 rounded-full bg-white text-slate-900 text-xs font-bold uppercase tracking-wider">
            NEW
          </span>
          <span className="text-sm text-slate-300 font-medium pr-2">
            Just shipped v2.0
          </span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto drop-shadow-lg text-white" style={{ lineHeight: 1.1 }}>
          Your personal<br />medication assistant
        </h1>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onLoginClick}
            className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-semibold hover:bg-slate-100 transition-colors shadow-lg hover:shadow-xl"
          >
            Get started
          </button>
          <button 
            className="px-6 py-3 bg-slate-800/50 text-white border border-slate-700/50 rounded-2xl font-semibold hover:bg-slate-700 transition-colors backdrop-blur-sm"
          >
            Learn more
          </button>
        </div>
      </main>
    </div>
  );
}
