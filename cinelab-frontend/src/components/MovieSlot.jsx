// src/components/MovieSlot.jsx
import React from 'react';

export default function MovieSlot({ slotNumber, totalSlots = 3, movie, onSelect, onRemove }) {
  const isFilled = Boolean(movie);

  const handleCardClick = () => {
    if (onSelect) onSelect();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        group relative flex overflow-hidden rounded-md transition-all duration-300 h-[340px] w-full select-none cursor-pointer
        bg-celluloid border
        ${
          isFilled
            ? 'border-film hover:border-halogen/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]'
            : 'border-film/80 hover:border-halogen/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]'
        }
      `}
    >
      {/* Perforación izquierda de cinta 35mm */}
      <div className="w-4 bg-[#0a0b0e] border-r border-film/40 flex flex-col justify-around items-center py-3 shrink-0 z-10 pointer-events-none">
        {[...Array(7)].map((_, i) => (
          <div
            key={`left-${i}`}
            className="w-1.5 h-2.5 rounded-[1px] bg-obscura border border-film/30 group-hover:border-halogen/40 transition-colors"
          />
        ))}
      </div>

      {/* ÁREA CENTRAL DEL FOTOGRAMA */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-3 overflow-hidden bg-gradient-to-b from-obscura/40 via-transparent to-obscura/80">
        {/* Cabecera del Fotograma: Código Técnico Dinámico */}
        <div className="absolute top-2 left-3 right-3 flex justify-between items-center z-20 font-mono text-[10px] tracking-wider text-gray-400 pointer-events-none">
          <span>KODAK 35MM</span>
          <span className="text-halogen font-bold">
            [{String(slotNumber).padStart(2, '0')}/{String(totalSlots).padStart(2, '0')}]
          </span>
        </div>

        {isFilled ? (
          /* ESTADO LLENO: PÓSTER Y DATOS */
          <>
            <img
              src={
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : 'https://via.placeholder.com/500x750/111318/9CA3AF?text=Sin+Poster'
              }
              alt={movie.title || 'Película'}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/500x750/111318/9CA3AF?text=Sin+Poster';
              }}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-obscura via-obscura/30 to-transparent opacity-90 pointer-events-none" />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onRemove) onRemove();
              }}
              className="absolute top-2 right-2 z-30 w-7 h-7 rounded-full bg-obscura/90 border border-film text-gray-300 hover:text-crimson hover:border-crimson hover:bg-obscura transition-all flex items-center justify-center font-mono text-xs shadow-md"
              title="Quitar película"
            >
              ✕
            </button>

            <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
              <span className="font-mono text-[10px] text-halogen uppercase tracking-widest block mb-0.5">
                {movie.release_date ? movie.release_date.split('-')[0] : 'N/D'}
              </span>
              <h3 className="font-display font-bold text-sm text-gray-100 line-clamp-2 leading-tight uppercase tracking-wide drop-shadow-md">
                {movie.title}
              </h3>
            </div>
          </>
        ) : (
          /* ESTADO VACÍO: PROYECCIÓN Y ACCIÓN */
          <div className="flex flex-col items-center justify-center text-center z-10 px-2 pointer-events-none">
            <div className="w-12 h-12 rounded-full border border-film bg-obscura/60 flex items-center justify-center mb-3 text-gray-400 group-hover:border-halogen group-hover:text-halogen group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all duration-300 font-mono text-lg font-bold">
              +
            </div>
            
            <span className="font-sans font-medium text-xs text-gray-300 group-hover:text-white transition-colors mb-1">
              Seleccionar Película
            </span>
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
              FOTOGRAMA VACÍO
            </span>
          </div>
        )}
      </div>

      {/* Perforación derecha de cinta 35mm */}
      <div className="w-4 bg-[#0a0b0e] border-l border-film/40 flex flex-col justify-around items-center py-3 shrink-0 z-10 pointer-events-none">
        {[...Array(7)].map((_, i) => (
          <div
            key={`right-${i}`}
            className="w-1.5 h-2.5 rounded-[1px] bg-obscura border border-film/30 group-hover:border-halogen/40 transition-colors"
          />
        ))}
      </div>
    </div>
  );
}