// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import MovieSlot from './components/MovieSlot';
import Header from './components/Header';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const ROL_ESTILOS = {
  director: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
  df: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  guion: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  actor: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  produccion: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' }
};

const PAISES = [
  { code: '', label: 'Todos los países' },
  { code: 'AR', label: 'Argentina' },
  { code: 'ES', label: 'España' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'MX', label: 'México' },
  { code: 'FR', label: 'Francia' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'IT', label: 'Italia' },
  { code: 'JP', label: 'Japón' },
  { code: 'KR', label: 'Corea del Sur' },
  { code: 'DE', label: 'Alemania' },
  { code: 'BR', label: 'Brasil' }
];

const EXPLICACIONES_FILTROS = {
  pais: {
    titulo: 'Filtro por País de Origen',
    descripcion: 'Restringe el análisis para que el motor busque únicamente películas producidas o financiadas en el país seleccionado.'
  },
  gemaOculta: {
    titulo: 'Cine Oculto (Joyas de Culto)',
    descripcion: 'Filtra películas poco conocidas fuera del circuito comercial que cuentan con excelentes valoraciones de la crítica.'
  },
  pesoTecnico: {
    titulo: 'Sello de Autor (Equipo Creativo)',
    descripcion: 'Garantiza que el 100% de los resultados compartan al menos un integrante del equipo (Director/a, Guionista o Producción) con las películas elegidas.'
  },
  focoReparto: {
    titulo: 'Foco Reparto (Elenco)',
    descripcion: 'Garantiza que el 100% de los resultados compartan al menos un actor o actriz del reparto con las películas elegidas.'
  }
};

function DesgloseCard({ comp }) {
  const [expanded, setExpanded] = useState(false);
  const esLargo = comp.sinopsis && comp.sinopsis.length > 100;

  return (
    <div className="bg-celluloid border border-film p-3.5 rounded-md flex flex-col justify-between h-full shadow-lg hover:border-halogen/40 transition-colors">
      <div className="space-y-3">
        {comp.poster ? (
          <img
            src={comp.poster}
            alt={comp.titulo}
            className="w-full aspect-[2/3] object-cover rounded-sm shadow-md border border-film/50"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/500x750/111318/9CA3AF?text=Sin+Poster';
            }}
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-obscura border border-film/50 rounded-sm flex items-center justify-center text-[10px] font-mono text-gray-500 tracking-wider uppercase">
            SIN FOTOGRAMA
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-display font-bold text-sm text-gray-100 leading-tight uppercase tracking-wide">
            {comp.titulo}
          </h4>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            {comp.puntuacion && (
              <span className="text-halogen bg-halogen/10 px-2 py-0.5 rounded border border-halogen/30 font-bold">
                {comp.origenPuntuacion || 'IMDb'}: {comp.puntuacion.toFixed(1)}
              </span>
            )}
            {comp.clasificacionEdad && comp.clasificacionEdad !== 'N/D' && (
              <span className="text-crimson bg-crimson/10 px-2 py-0.5 rounded border border-crimson/30 font-bold">
                {comp.clasificacionEdad}
              </span>
            )}
          </div>

          {comp.keywords && comp.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 font-mono text-[9px]">
              {comp.keywords.slice(0, 3).map((kw, idx) => (
                <span key={idx} className="bg-obscura text-gray-400 px-1.5 py-0.5 rounded border border-film truncate max-w-[110px]">
                  {kw}
                </span>
              ))}
            </div>
          )}

          <p className={`font-sans text-xs text-gray-300 leading-relaxed pt-1 ${expanded ? '' : 'line-clamp-3'}`}>
            {comp.sinopsis || 'Sin descripción disponible.'}
          </p>

          {esLargo && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[10px] text-halogen hover:underline tracking-wider uppercase"
            >
              {expanded ? '▲ MOSTRAR MENOS' : '▼ LEER BÚSQUEDA COMPLETA'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('sintesis');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [gemaOculta, setGemaOculta] = useState(false);
  const [pesoTecnico, setPesoTecnico] = useState(false);
  const [focoReparto, setFocoReparto] = useState(false);
  const [pais, setPais] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [excludedIds, setExcludedIds] = useState([]);
  const [grainEnabled, setGrainEnabled] = useState(true);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [modalExplicacion, setModalExplicacion] = useState(null);
  const modalInputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/buscar?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.slice(0, 6) || []);
      } catch (err) {
        console.error('Error al buscar:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const cambiarTab = (nuevaTab) => {
    setActiveTab(nuevaTab);
    setSelectedMovies([]);
    setResult(null);
    setError(null);
    setExcludedIds([]);
  };

  const manejarExplicacionPrimerUso = (claveFiltro) => {
    const yaVisto = localStorage.getItem(`cinelab_seen_${claveFiltro}`);
    if (!yaVisto) {
      setModalExplicacion(EXPLICACIONES_FILTROS[claveFiltro]);
      localStorage.setItem(`cinelab_seen_${claveFiltro}`, 'true');
    }
  };

  const addMovie = (movie) => {
    const max = activeTab === 'descomposicion' ? 1 : 3;

    if (result || selectedMovies.length >= max) {
      setSelectedMovies([movie]);
      setResult(null);
      setError(null);
      setExcludedIds([]);
      setIsSearchOpen(false);
      return;
    }

    if (selectedMovies.some((m) => m.id === movie.id)) return;

    setError(null);
    setSelectedMovies([...selectedMovies, movie]);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const removeMovie = (id) => {
    setSelectedMovies(selectedMovies.filter((m) => m.id !== id));
    setResult(null);
    setExcludedIds([]);
  };

  const runTool = async (isRetry = false) => {
    setLoading(true);
    setError(null);

    let currentExcluded = isRetry ? [...excludedIds] : [];

    if (isRetry && result) {
      if (result.type === 'caldero' && result.data?.resultado?.id) {
        currentExcluded.push(result.data.resultado.id);
      } else if (result.type === 'adn' && result.data?.adn) {
        result.data.adn.forEach((comp) => currentExcluded.push(comp.id));
      }
    }

    setExcludedIds(currentExcluded);

    try {
      if (activeTab === 'sintesis') {
        const ids = selectedMovies.map((m) => m.id);
        const res = await fetch(`${BACKEND_URL}/caldero`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieIds: ids, gemaOculta, pesoTecnico, focoReparto, pais, excludeIds: currentExcluded }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult({ type: 'caldero', data });
      } else if (activeTab === 'descomposicion') {
        const id = selectedMovies[0].id;
        const excludeQuery = currentExcluded.length > 0 ? `&excludeIds=${currentExcluded.join(',')}` : '';
        const res = await fetch(`${BACKEND_URL}/adn?movieId=${id}&pesoTecnico=${pesoTecnico}&focoReparto=${focoReparto}&pais=${pais}${excludeQuery}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult({ type: 'adn', data });
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const maxSlots = activeTab === 'descomposicion' ? 1 : 3;

  return (
    <div className="min-h-screen bg-obscura text-gray-100 font-sans p-3 sm:p-6 md:p-8 relative overflow-x-hidden">
      {grainEnabled && <div className="film-grain" />}
      
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 relative z-10">
        
        {/* Encabezado Principal */}
        <Header activeTab={activeTab} onTabChange={cambiarTab} />

        {/* Sección de Selección de Películas */}
        <div className="space-y-3">
          
          {/* BARRA DE PARÁMETROS DE PROYECCIÓN & FILTROS */}
          <div className="bg-celluloid border border-film rounded-lg p-3 sm:p-4 space-y-3 font-mono shadow-lg">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-film/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-halogen animate-pulse" />
                <h2 className="text-xs uppercase tracking-widest font-bold text-gray-300">
                  MESA DE CORTE <span className="text-halogen">[{selectedMovies.length}/{maxSlots}]</span>
                </h2>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                {/* Botón de control de Grano de Película */}
                <button
                  type="button"
                  onClick={() => setGrainEnabled(!grainEnabled)}
                  className={`px-2 py-1 rounded border text-[10px] uppercase font-mono tracking-wider transition-all ${
                    grainEnabled
                      ? 'bg-halogen/10 border-halogen/60 text-halogen shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                      : 'bg-obscura border-film/80 text-gray-500 hover:text-gray-300'
                  }`}
                  title="Activar o desactivar textura analógica"
                >
                  GRANO [{grainEnabled ? 'ON' : 'OFF'}]
                </button>

                {(selectedMovies.length > 0 || result) && (
                  <button
                    type="button"
                    onClick={() => { setSelectedMovies([]); setResult(null); setError(null); setExcludedIds([]); }}
                    className="text-[11px] uppercase tracking-wider text-gray-400 hover:text-crimson transition-colors flex items-center gap-1"
                  >
                    <span className="text-xs">✕</span> LIMPIAR MESA
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
              
              {/* Selector de País */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">REGION:</span>
                <select
                  value={pais}
                  onChange={(e) => {
                    setPais(e.target.value);
                    if (e.target.value) manejarExplicacionPrimerUso('pais');
                  }}
                  className="bg-obscura border border-film/80 text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-halogen cursor-pointer font-mono tracking-wide"
                >
                  {PAISES.map((p) => (
                    <option key={p.code} value={p.code} className="bg-obscura text-gray-200">
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badges Conmutadores de Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Filtro: Cine Oculto (Solo Síntesis) */}
                {activeTab === 'sintesis' && (
                  <label className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] cursor-pointer select-none transition-all
                    ${
                      gemaOculta
                        ? 'bg-halogen/10 border-halogen text-halogen shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-obscura border-film/80 text-gray-400 hover:text-gray-200 hover:border-film'
                    }
                  `}>
                    <input
                      type="checkbox"
                      checked={gemaOculta}
                      onChange={(e) => {
                        setGemaOculta(e.target.checked);
                        if (e.target.checked) manejarExplicacionPrimerUso('gemaOculta');
                      }}
                      className="hidden"
                    />
                    <span className="uppercase tracking-wider">CINE OCULTO</span>
                  </label>
                )}

                {/* Filtro: Sello de Autor */}
                <label className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] cursor-pointer select-none transition-all
                  ${
                    pesoTecnico
                      ? 'bg-purple-500/15 border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                      : 'bg-obscura border-film/80 text-gray-400 hover:text-gray-200 hover:border-film'
                  }
                `}>
                  <input
                    type="checkbox"
                    checked={pesoTecnico}
                    onChange={(e) => {
                      setPesoTecnico(e.target.checked);
                      if (e.target.checked) manejarExplicacionPrimerUso('pesoTecnico');
                    }}
                    className="hidden"
                  />
                  <span className="uppercase tracking-wider">SELLO DE AUTOR</span>
                </label>

                {/* Filtro: Foco Reparto */}
                <label className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] cursor-pointer select-none transition-all
                  ${
                    focoReparto
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'bg-obscura border-film/80 text-gray-400 hover:text-gray-200 hover:border-film'
                  }
                `}>
                  <input
                    type="checkbox"
                    checked={focoReparto}
                    onChange={(e) => {
                      setFocoReparto(e.target.checked);
                      if (e.target.checked) manejarExplicacionPrimerUso('focoReparto');
                    }}
                    className="hidden"
                  />
                  <span className="uppercase tracking-wider">FOCO REPARTO</span>
                </label>

              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: maxSlots }).map((_, index) => {
              const movie = selectedMovies[index];
              return (
                <MovieSlot
                  key={movie?.id || index}
                  slotNumber={index + 1}
                  totalSlots={maxSlots}
                  movie={movie}
                  onSelect={() => setIsSearchOpen(true)}
                  onRemove={() => movie && removeMovie(movie.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Botón de Ejecución Principal */}
        {selectedMovies.length === maxSlots && (
          <button
            type="button"
            onClick={() => runTool(false)}
            disabled={loading}
            className="group relative w-full py-4 px-6 rounded-md font-display font-bold text-sm sm:text-base uppercase tracking-widest text-white bg-crimson transition-all duration-300 shadow-[0_0_20px_rgba(229,9,20,0.35)] hover:shadow-[0_0_35px_rgba(229,9,20,0.65)] hover:bg-[#f00a16] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden select-none border border-red-500/30 my-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            {loading ? (
              <div className="flex items-center justify-center gap-3 font-mono text-xs sm:text-sm tracking-wider text-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-halogen animate-ping" />
                <span>PROYECTANDO ANÁLISIS EN MESA...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>
                  {activeTab === 'sintesis' ? 'INICIAR SÍNTESIS CINEMÁTICA' : 'EJECUTAR DESCOMPOSICIÓN DE ADN'}
                </span>
                <span className="font-mono text-xs text-amber-200/90 tracking-widest ml-1">
                  [{activeTab === 'sintesis' ? '3→1' : '1→3'}]
                </span>
              </div>
            )}
          </button>
        )}

        {error && (
          <div className="p-3.5 bg-red-950/50 border border-red-800/50 text-red-300 rounded-md font-mono text-xs sm:text-sm text-center">
            {error}
          </div>
        )}

        {/* PANEL UNIFICADO DE RESULTADOS */}
        {result && (
          <div className="bg-celluloid border border-film rounded-lg p-4 sm:p-6 space-y-6 shadow-2xl my-6">
            
            {/* VISTA 1: SÍNTESIS RESULTANTE */}
            {result.type === 'caldero' && (
              <div className="space-y-5">
                
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-film pb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap font-mono text-[10px] sm:text-xs">
                    <span className="px-2.5 py-1 bg-crimson/15 border border-crimson/40 text-crimson rounded font-bold uppercase tracking-wider">
                      SÍNTESIS RESULTANTE
                    </span>
                    {result.data.modoPais && (
                      <span className="px-2.5 py-1 bg-obscura border border-film text-cyan-300 rounded tracking-wider">
                        {PAISES.find((p) => p.code === result.data.modoPais)?.label}
                      </span>
                    )}
                    {result.data.modoGemaOculta && (
                      <span className="px-2.5 py-1 bg-halogen/10 border border-halogen/40 text-halogen rounded font-bold tracking-wider">
                        CINE OCULTO
                      </span>
                    )}
                    {result.data.modoPesoTecnico && (
                      <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/40 text-purple-300 rounded tracking-wider">
                        SELLO DE AUTOR
                      </span>
                    )}
                    {result.data.modoFocoReparto && (
                      <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 rounded tracking-wider">
                        FOCO REPARTO
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => runTool(true)}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-1.5 bg-obscura hover:bg-film border border-film text-halogen font-mono text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? 'PROYECTANDO...' : 'PROBAR OTRA VARIANTE'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start text-left">
                  {result.data.resultado.poster && (
                    <img
                      src={result.data.resultado.poster}
                      alt={result.data.resultado.titulo}
                      className="w-28 sm:w-40 aspect-[2/3] rounded-sm shadow-xl object-cover border border-film flex-shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/500x750/111318/9CA3AF?text=Sin+Poster';
                      }}
                    />
                  )}

                  <div className="space-y-3 flex-1 min-w-0">
                    <h3 className="font-display font-bold text-xl sm:text-3xl text-gray-100 uppercase tracking-wide leading-tight">
                      {result.data.resultado.titulo}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="text-halogen bg-halogen/10 px-2.5 py-1 rounded border border-halogen/30 font-bold">
                        {result.data.resultado.origenPuntuacion || 'IMDb'}: {result.data.resultado.puntuacion?.toFixed(1)} / 10
                      </span>
                      {result.data.resultado.clasificacionEdad && result.data.resultado.clasificacionEdad !== 'N/D' && (
                        <span className="text-crimson bg-crimson/10 px-2.5 py-1 rounded border border-crimson/30 font-bold">
                          CLASIFICACIÓN: {result.data.resultado.clasificacionEdad}
                        </span>
                      )}
                    </div>

                    {result.data.resultado.keywords && result.data.resultado.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        {result.data.resultado.keywords.map((kw, idx) => (
                          <span key={idx} className="bg-obscura text-gray-400 px-2 py-0.5 rounded border border-film truncate max-w-[140px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="font-sans text-gray-300 text-xs sm:text-sm leading-relaxed">
                      {result.data.resultado.sinopsis || 'Sin descripción disponible.'}
                    </p>
                  </div>
                </div>

                {result.data.argumentoIA && (
                  <div className="bg-obscura/80 border-l-4 border-l-crimson border-y border-r border-film p-4 rounded-r-md space-y-1.5 shadow-md mt-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-halogen font-bold">
                      BITÁCORA DE SÍNTESIS (LLAMA 3.1)
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-gray-200 leading-relaxed italic">
                      "{result.data.argumentoIA}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2: DESCOMPOSICIÓN TEMÁTICA (ADN) */}
            {result.type === 'adn' && (
              <div className="space-y-5">
                
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-film pb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap font-mono text-[10px] sm:text-xs">
                    <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/40 text-purple-300 rounded font-bold uppercase tracking-wider">
                      ADN: {result.data.pelicula}
                    </span>
                    {result.data.modoPais && (
                      <span className="px-2.5 py-1 bg-obscura border border-film text-cyan-300 rounded tracking-wider">
                        {PAISES.find((p) => p.code === result.data.modoPais)?.label}
                      </span>
                    )}
                    {result.data.modoPesoTecnico && (
                      <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/40 text-purple-300 rounded tracking-wider">
                        SELLO DE AUTOR
                      </span>
                    )}
                    {result.data.modoFocoReparto && (
                      <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 rounded tracking-wider">
                        FOCO REPARTO
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => runTool(true)}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-1.5 bg-obscura hover:bg-film border border-film text-halogen font-mono text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? 'ANALIZANDO...' : 'PROBAR OTRA VARIANTE'}
                  </button>
                </div>

                {result.data.argumentoADN && (
                  <div className="bg-obscura/80 border-l-4 border-l-halogen border-y border-r border-film p-4 rounded-r-md space-y-1.5 shadow-md">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-halogen font-bold">
                      BITÁCORA DE DESCOMPOSICIÓN TEMÁTICA
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-gray-200 leading-relaxed italic">
                      "{result.data.argumentoADN}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                  {result.data.adn.map((comp) => (
                    <DesgloseCard key={comp.id} comp={comp} />
                  ))}
                </div>
              </div>
            )}

            {/* RED DE CONEXIONES DEL EQUIPO */}
            <div className="border-t border-film pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-sm tracking-widest uppercase text-gray-200">
                  RED DE CONEXIONES DEL EQUIPO
                </h4>
                <span className="font-mono text-xs text-halogen font-bold bg-obscura px-2.5 py-1 rounded border border-film">
                  {result.data.conexiones?.length || 0} NODOS
                </span>
              </div>

              {!result.data.conexiones || result.data.conexiones.length === 0 ? (
                <p className="font-sans text-xs text-gray-500 italic">
                  No se registraron integrantes del equipo técnico o reparto con coincidencia directa en estas películas.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {result.data.conexiones.map((persona) => (
                    <div key={persona.id} className="bg-obscura border border-film p-3.5 rounded-md flex items-start gap-3.5 shadow-md hover:border-halogen/40 transition-colors">
                      {persona.foto ? (
                        <img
                          src={persona.foto}
                          alt={persona.nombre}
                          className="w-11 h-11 object-cover rounded-full border border-film flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-11 h-11 bg-celluloid border border-film rounded-full flex items-center justify-center text-[9px] font-mono text-gray-500 flex-shrink-0">
                          S/F
                        </div>
                      )}

                      <div className="flex-1 space-y-2 min-w-0">
                        <p className="font-display font-bold text-xs sm:text-sm text-gray-100 uppercase tracking-wide truncate">
                          {persona.nombre}
                        </p>

                        <div className="space-y-1.5">
                          {persona.peliculas.map((p, idx) => (
                            <div key={idx} className="space-y-1">
                              <span className="font-sans text-gray-300 text-xs font-medium block truncate">
                                {p.tituloPelicula}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {p.roles.map((r, rIdx) => {
                                  const estilo = ROL_ESTILOS[r.tipoRol] || ROL_ESTILOS.actor;
                                  return (
                                    <span
                                      key={rIdx}
                                      className={`px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-wider ${estilo.bg} ${estilo.text} ${estilo.border}`}
                                    >
                                      {r.rolEtiqueta}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Modal de Búsqueda */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-obscura/90 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-celluloid border border-film w-full max-w-2xl rounded-lg p-4 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] mt-4 sm:mt-12">
            
            <div className="flex items-center justify-between pb-3 border-b border-film">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-halogen animate-pulse" />
                <h3 className="font-display font-bold text-xs sm:text-sm text-gray-100 uppercase tracking-widest">
                  ARCHIVAL SEARCH // {activeTab === 'sintesis' ? 'SÍNTESIS (3→1)' : 'DESCOMPOSICIÓN (1→3)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="font-mono text-gray-400 hover:text-crimson text-sm font-bold p-1 transition-colors"
                title="Cerrar visor"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <input
                ref={modalInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ingresá título para consultar el catálogo TMDB..."
                className="w-full bg-obscura border border-film/80 rounded px-4 py-3 font-mono text-xs sm:text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-halogen focus:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all"
              />
              <span className="absolute right-3 top-3.5 font-mono text-[10px] text-gray-600 pointer-events-none hidden sm:block">
                [TMDB_CATALOG]
              </span>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <p className="font-mono text-xs text-gray-500 text-center py-8 tracking-wider">
                  NO SE ENCONTRARON REGISTROS FILMOGRÁFICOS COINCIDENTES.
                </p>
              )}

              {searchResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addMovie(m)}
                  className="w-full flex items-center justify-between gap-3 p-2.5 bg-obscura hover:bg-celluloid border border-film/60 hover:border-halogen/60 rounded transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {m.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                        alt={m.title}
                        className="w-10 aspect-[2/3] object-cover rounded-sm border border-film/80 flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 aspect-[2/3] bg-celluloid border border-film rounded-sm flex items-center justify-center font-mono text-[9px] text-gray-500 flex-shrink-0">
                        NO POSTER
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-display font-bold text-gray-100 text-xs sm:text-sm uppercase tracking-wide truncate group-hover:text-halogen transition-colors">
                        {m.title}
                      </div>
                      <div className="font-mono text-[10px] text-halogen/80 mt-0.5">
                        {m.release_date ? m.release_date.split('-')[0] : 'AÑO N/D'}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-halogen opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">
                    <span>CARGAR FOTOGRAMA</span> <span>+</span>
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Modal Explicativo */}
      {modalExplicacion && (
        <div className="fixed inset-0 z-50 bg-obscura/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-celluloid border border-film max-w-md w-full rounded-lg p-6 space-y-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center relative overflow-hidden">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-obscura border border-film text-[10px] font-mono tracking-widest text-halogen uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-halogen animate-pulse" />
              TECHNICAL NOTE // PARAMETER INFO
            </div>

            <h3 className="font-display font-bold text-base sm:text-lg text-gray-100 uppercase tracking-wide">
              {modalExplicacion.titulo}
            </h3>

            <p className="font-sans text-xs text-gray-300 leading-relaxed bg-obscura/60 border border-film/60 p-3.5 rounded text-left">
              {modalExplicacion.descripcion}
            </p>

            <button
              type="button"
              onClick={() => setModalExplicacion(null)}
              className="w-full py-3 bg-crimson hover:bg-[#f00a16] text-white font-display font-bold text-xs uppercase tracking-widest rounded transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] hover:shadow-[0_0_25px_rgba(229,9,20,0.5)]"
            >
              COMPRENDIDO // CONTINUAR
            </button>

          </div>
        </div>
      )}

    </div>
  );
}