// src/components/Header.jsx
import React from 'react';

export default function Header({ activeTab, onTabChange }) {
  return (
    <header className="space-y-6 text-center select-none">
      {/* Badge Superior */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-celluloid border border-film text-[10px] font-mono tracking-widest text-halogen uppercase shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-halogen animate-pulse" />
        PROJECTION ROOM 01 — ANALYTICS ENGINE
      </div>

      {/* Título Principal */}
      <div className="space-y-2">
        <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl tracking-widest text-gray-100 uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          Cine<span className="text-crimson">Lab</span>
        </h1>
        <p className="font-sans text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
          Laboratorio cinemático para la síntesis de tono y la descomposición de ejes temáticos en celuloide.
        </p>
      </div>

      {/* Control de Pestañas */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex bg-obscura p-1 rounded-lg border border-film shadow-inner">
          <button
            type="button"
            onClick={() => onTabChange('sintesis')}
            className={`flex-1 py-2 px-4 rounded-md font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'sintesis'
                ? 'bg-crimson text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-celluloid/50'
            }`}
          >
            Síntesis (3→1)
          </button>
          
          <button
            type="button"
            onClick={() => onTabChange('descomposicion')}
            className={`flex-1 py-2 px-4 rounded-md font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'descomposicion'
                ? 'bg-crimson text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-celluloid/50'
            }`}
          >
            Descomposición (1→3)
          </button>
        </div>

        {/* Explicación Dinámica de Pestaña */}
        <div className="bg-celluloid/60 border border-film/60 rounded-md p-2.5 text-center">
          <p className="font-sans text-xs text-gray-300 leading-relaxed">
            {activeTab === 'sintesis' ? (
              <>
                <strong className="text-halogen font-mono text-[11px] uppercase tracking-wider">SÍNTESIS:</strong> Elegí <span className="text-white font-semibold">3 películas</span> para descubrir la obra que conecta su tono y atmósfera.
              </>
            ) : (
              <>
                <strong className="text-halogen font-mono text-[11px] uppercase tracking-wider">DESCOMPOSICIÓN:</strong> Elegí <span className="text-white font-semibold">1 película</span> para desglosar su ADN temático en 3 obras afines.
              </>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}