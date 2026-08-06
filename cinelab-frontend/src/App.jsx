import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

const ROL_ESTILOS = {
  director: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30', icon: '🎬' },
  df: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30', icon: '📷' },
  guion: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', icon: '✍️' },
  actor: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', icon: '🎭' },
  produccion: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30', icon: '⚙️' }
};

const PAISES = [
  { code: '', label: '🌐 Todos los países' },
  { code: 'AR', label: '🇦🇷 Argentina' },
  { code: 'ES', label: '🇪🇸 España' },
  { code: 'US', label: '🇺🇸 Estados Unidos' },
  { code: 'MX', label: '🇲🇽 México' },
  { code: 'FR', label: '🇫🇷 Francia' },
  { code: 'GB', label: '🇬🇧 Reino Unido' },
  { code: 'IT', label: '🇮🇹 Italia' },
  { code: 'JP', label: '🇯🇵 Japón' },
  { code: 'KR', label: '🇰🇷 Corea del Sur' },
  { code: 'DE', label: '🇩🇪 Alemania' },
  { code: 'BR', label: '🇧🇷 Brasil' }
];

const EXPLICACIONES_FILTROS = {
  pais: {
    titulo: '🌐 Filtro por País de Origen',
    icono: '🌐',
    descripcion: 'Restringe el análisis para que el motor busque únicamente películas producidas o financiadas en el país seleccionado.'
  },
  gemaOculta: {
    titulo: '💎 Cine Oculto (Joyas de Culto)',
    icono: '💎',
    descripcion: 'Filtra películas poco conocidas fuera del circuito comercial que cuentan con excelentes valoraciones de la crítica.'
  },
  pesoTecnico: {
    titulo: '🎥 Sello de Autor (Equipo Creativo)',
    icono: '🎥',
    descripcion: 'Garantiza que el 100% de los resultados compartan al menos un integrante del equipo (Director/a, Guionista o Producción) con las películas elegidas.'
  },
  focoReparto: {
    titulo: '🎭 Foco Reparto (Elenco)',
    icono: '🎭',
    descripcion: 'Garantiza que el 100% de los resultados compartan al menos un actor o actriz del reparto con las películas elegidas.'
  }
};

function DesgloseCard({ comp }) {
  const [expanded, setExpanded] = useState(false);
  const esLargo = comp.sinopsis && comp.sinopsis.length > 100;

  return (
    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between h-full">
      <div className="space-y-3">
        {comp.poster ? (
          <img
            src={comp.poster}
            alt={comp.titulo}
            className="w-full aspect-[2/3] object-cover rounded-lg shadow-md"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-slate-900 rounded-lg flex items-center justify-center text-xs">
            🎬
          </div>
        )}

        <div className="space-y-1.5">
          <h4 className="font-bold text-sm text-slate-100 leading-snug">{comp.titulo}</h4>

          <div className="flex flex-wrap items-center gap-1.5">
            {comp.puntuacion && (
              <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ⭐ {comp.origenPuntuacion || 'IMDb'}: {comp.puntuacion.toFixed(1)}
              </span>
            )}
            {comp.clasificacionEdad && comp.clasificacionEdad !== 'N/D' && (
              <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                🔞 {comp.clasificacionEdad}
              </span>
            )}
          </div>

          {comp.keywords && comp.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {comp.keywords.slice(0, 3).map((kw, idx) => (
                <span key={idx} className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[110px]">
                  🏷️ {kw}
                </span>
              ))}
            </div>
          )}

          <p className={`text-xs text-slate-300 leading-relaxed pt-1 ${expanded ? '' : 'line-clamp-3'}`}>
            {comp.sinopsis || 'Sin descripción disponible.'}
          </p>

          {esLargo && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {expanded ? '▲ Mostrar menos' : '▼ Leer más'}
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
        result.data.adn.forEach(comp => currentExcluded.push(comp.id));
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-mono mb-1">
            🔬 LABORATORIO DE ANÁLISIS CINEMATOGRÁFICO
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-indigo-500">
            CINELAB
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
            Herramienta experimental para sintetizar coincidencias estéticas y descomponer películas en sus temáticas profundas.
          </p>
        </header>

        {/* Pestañas de Navegación Únicas */}
        <div className="space-y-3">
          <div className="flex justify-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 max-w-lg mx-auto">
            <button
              onClick={() => cambiarTab('sintesis')}
              className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sintesis' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧪 Síntesis (3→1)
            </button>
            <button
              onClick={() => cambiarTab('descomposicion')}
              className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'descomposicion' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔬 Descomposición (1→3)
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-center max-w-lg mx-auto">
            {activeTab === 'sintesis' ? (
              <p className="text-xs text-slate-300">
                <strong className="text-indigo-400">Síntesis:</strong> Seleccioná <span className="text-white font-bold">3 películas</span>. CineLab analiza su tono y estética para recomendarte la <span className="text-white font-bold">obra que las conecta</span>.
              </p>
            ) : (
              <p className="text-xs text-slate-300">
                <strong className="text-purple-400">Descomposición:</strong> Seleccioná <span className="text-white font-bold">1 película</span>. El laboratorio desglosa sus ejes temáticos y busca <span className="text-white font-bold">3 obras que los exploran a mayor profundidad</span>.
              </p>
            )}
          </div>
        </div>

        {/* Sección de Selección de Películas */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/50 pb-2 sm:border-none sm:pb-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Películas en Mesa ({selectedMovies.length}/{maxSlots})
            </h2>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
              {(selectedMovies.length > 0 || result) && (
                <button
                  onClick={() => { setSelectedMovies([]); setResult(null); setError(null); setExcludedIds([]); }}
                  className="text-xs font-semibold text-slate-400 hover:text-red-400 transition-all flex items-center gap-1"
                >
                  🗑️ Limpiar
                </button>
              )}

              <select
                value={pais}
                onChange={(e) => {
                  setPais(e.target.value);
                  if (e.target.value) manejarExplicacionPrimerUso('pais');
                }}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {PAISES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>

              {activeTab === 'sintesis' && (
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-amber-400 hover:text-amber-300 transition-all select-none">
                  <input
                    type="checkbox"
                    checked={gemaOculta}
                    onChange={(e) => {
                      setGemaOculta(e.target.checked);
                      if (e.target.checked) manejarExplicacionPrimerUso('gemaOculta');
                    }}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20"
                  />
                  💎 Cine Oculto
                </label>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-purple-400 hover:text-purple-300 transition-all select-none">
                <input
                  type="checkbox"
                  checked={pesoTecnico}
                  onChange={(e) => {
                    setPesoTecnico(e.target.checked);
                    if (e.target.checked) manejarExplicacionPrimerUso('pesoTecnico');
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-purple-500/20"
                />
                🎥 Sello de Autor
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-all select-none">
                <input
                  type="checkbox"
                  checked={focoReparto}
                  onChange={(e) => {
                    setFocoReparto(e.target.checked);
                    if (e.target.checked) manejarExplicacionPrimerUso('focoReparto');
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500/20"
                />
                🎭 Foco Reparto
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {selectedMovies.map((movie) => (
              <div key={movie.id} className="relative bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex items-center gap-3 shadow-md">
                {movie.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} className="w-10 sm:w-12 aspect-[2/3] object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-10 sm:w-12 aspect-[2/3] bg-slate-800 rounded-md flex items-center justify-center flex-shrink-0 text-xs">🎬</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm truncate">{movie.title}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400">{movie.release_date?.split('-')[0]}</p>
                </div>
                <button
                  onClick={() => removeMovie(movie.id)}
                  className="text-slate-500 hover:text-red-400 p-1 text-sm font-bold focus:outline-none"
                >
                  ✕
                </button>
              </div>
            ))}

            {Array.from({ length: maxSlots - selectedMovies.length }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIsSearchOpen(true)}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900/60 rounded-xl p-3 sm:p-4 flex items-center justify-center text-slate-500 hover:text-indigo-300 text-xs font-semibold h-16 sm:h-20 transition-all cursor-pointer group"
              >
                <span className="group-hover:scale-105 transition-transform">🔍 + Buscar y agregar película</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Ejecución */}
        {selectedMovies.length === maxSlots && (
          <button
            onClick={() => runTool(false)}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50"
          >
            {loading
              ? 'Procesando en el laboratorio...'
              : activeTab === 'sintesis'
              ? '🧪 Iniciar Síntesis 🚀'
              : '🔬 Ejecutar Descomposición 🚀'}
          </button>
        )}

        {error && (
          <div className="p-3.5 bg-red-950/50 border border-red-800/50 text-red-300 rounded-xl text-xs sm:text-sm text-center">
            {error}
          </div>
        )}

        {/* Panel Unificado de Resultados */}
        {result && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 sm:space-y-8 shadow-2xl">
            
            {result.type === 'caldero' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[11px] sm:text-xs font-semibold">
                      🧪 Síntesis Resultante
                    </span>
                    {result.data.modoPais && (
                      <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full text-[11px] sm:text-xs font-semibold">
                        {PAISES.find(p => p.code === result.data.modoPais)?.label}
                      </span>
                    )}
                    {result.data.modoGemaOculta && (
                      <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-[11px] sm:text-xs font-semibold">
                        💎 Cine Oculto
                      </span>
                    )}
                    {result.data.modoPesoTecnico && (
                      <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-[11px] sm:text-xs font-semibold">
                        🎥 Sello de Autor
                      </span>
                    )}
                    {result.data.modoFocoReparto && (
                      <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[11px] sm:text-xs font-semibold">
                        🎭 Foco Reparto
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => runTool(true)}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? '⏳ Procesando...' : '🔄 Probar otra variante'}
                  </button>
                </div>

                <div className="flex flex-row gap-3.5 sm:gap-6 items-start text-left">
                  {result.data.resultado.poster && (
                    <img
                      src={result.data.resultado.poster}
                      alt={result.data.resultado.titulo}
                      className="w-24 sm:w-36 aspect-[2/3] rounded-xl shadow-md object-cover flex-shrink-0"
                    />
                  )}

                  <div className="space-y-2 sm:space-y-2.5 flex-1 min-w-0">
                    <h3 className="text-base sm:text-2xl font-bold leading-snug">{result.data.resultado.titulo}</h3>
                    
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-amber-500/20">
                        ⭐ {result.data.resultado.origenPuntuacion || 'IMDb'}: {result.data.resultado.puntuacion?.toFixed(1)} / 10
                      </span>
                      {result.data.resultado.clasificacionEdad && result.data.resultado.clasificacionEdad !== 'N/D' && (
                        <span className="text-[10px] sm:text-xs font-semibold text-rose-300 bg-rose-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-rose-500/20">
                          🔞 Clasificación: {result.data.resultado.clasificacionEdad}
                        </span>
                      )}
                    </div>

                    {result.data.resultado.keywords && result.data.resultado.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-0.5">
                        {result.data.resultado.keywords.map((kw, idx) => (
                          <span key={idx} className="text-[9px] sm:text-[10px] font-medium bg-slate-800 text-slate-300 px-1.5 sm:px-2 py-0.5 rounded-full border border-slate-700/60 truncate max-w-[130px]">
                            🏷️ {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pt-0.5">{result.data.resultado.sinopsis || 'Sin descripción disponible.'}</p>
                  </div>
                </div>

                {result.data.argumentoIA && (
                  <div className="p-3.5 sm:p-4 bg-purple-950/40 border border-purple-500/30 rounded-xl space-y-1 shadow-inner mt-4">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      🧠 Dictamen de Síntesis (Llama 3.1)
                    </p>
                    <p className="text-xs text-purple-100/90 leading-relaxed italic">
                      "{result.data.argumentoIA}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {result.type === 'adn' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-[11px] sm:text-xs font-semibold inline-block">
                      🔬 Descomposición de {result.data.pelicula}
                    </span>
                    {result.data.modoPais && (
                      <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full text-[11px] sm:text-xs font-semibold inline-block">
                        {PAISES.find(p => p.code === result.data.modoPais)?.label}
                      </span>
                    )}
                    {result.data.modoPesoTecnico && (
                      <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-[11px] sm:text-xs font-semibold inline-block">
                        🎥 Sello de Autor
                      </span>
                    )}
                    {result.data.modoFocoReparto && (
                      <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-full text-[11px] sm:text-xs font-semibold inline-block">
                        🎭 Foco Reparto
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => runTool(true)}
                    disabled={loading}
                    className="w-full sm:w-auto px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? '⏳ Analizando...' : '🔄 Analizar otras variantes'}
                  </button>
                </div>

                {result.data.argumentoADN && (
                  <div className="p-3.5 sm:p-4 bg-cyan-950/40 border border-cyan-500/30 rounded-xl space-y-1 shadow-inner">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      🔬 Dictamen de Profundización Temática (Llama 3.1)
                    </p>
                    <p className="text-xs text-cyan-100/90 leading-relaxed italic">
                      "{result.data.argumentoADN}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                  {result.data.adn.map((comp) => (
                    <DesgloseCard key={comp.id} comp={comp} />
                  ))}
                </div>
              </div>
            )}

            {/* Red de Conexiones */}
            <div className="border-t border-slate-800 pt-5 sm:pt-6 space-y-4">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                🕸️ Red de Conexiones del Equipo ({result.data.conexiones?.length || 0})
              </h4>

              {!result.data.conexiones || result.data.conexiones.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No se encontraron integrantes en común que hayan participado en 2 o más de estas obras.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {result.data.conexiones.map((persona) => (
                    <div key={persona.id} className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-start gap-3">
                      {persona.foto ? (
                        <img src={persona.foto} alt={persona.nombre} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-full mt-0.5 border border-slate-700 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 rounded-full flex items-center justify-center text-xs mt-0.5 flex-shrink-0">👤</div>
                      )}

                      <div className="flex-1 space-y-1.5 min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-slate-100 truncate">{persona.nombre}</p>

                        <div className="space-y-1.5">
                          {persona.peliculas.map((p, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className="text-slate-300 text-[11px] sm:text-xs font-medium block truncate">
                                🎬 {p.tituloPelicula}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {p.roles.map((r, rIdx) => {
                                  const estilo = ROL_ESTILOS[r.tipoRol] || ROL_ESTILOS.actor;
                                  return (
                                    <span key={rIdx} className={`px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                                      <span>{estilo.icon}</span>
                                      <span>{r.rolEtiqueta}</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl mt-4 sm:mt-12">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                🔍 Buscar Película para {activeTab === 'sintesis' ? 'Síntesis' : 'Descomposición'}
              </h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <input
              ref={modalInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribí el título de una película (ej: El secreto de sus ojos, Matrix)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-all text-slate-100 placeholder:text-slate-500"
            />

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <p className="text-xs text-slate-500 text-center py-6">No se encontraron películas con ese título.</p>
              )}

              {searchResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMovie(m)}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-800/80 rounded-xl transition-all text-left border border-slate-800/50 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {m.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="w-10 aspect-[2/3] object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-10 aspect-[2/3] bg-slate-800 rounded-lg flex items-center justify-center text-xs flex-shrink-0">🎬</div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 text-xs sm:text-sm truncate group-hover:text-indigo-300">{m.title}</div>
                      <div className="text-[11px] text-slate-400">{m.release_date ? m.release_date.split('-')[0] : 'Año N/D'}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Seleccionar +
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Explicativo */}
      {modalExplicacion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/30 max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl text-center">
            <div className="text-3xl">{modalExplicacion.icono}</div>
            <h3 className="text-base font-bold text-slate-100">{modalExplicacion.titulo}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{modalExplicacion.descripcion}</p>
            <button
              onClick={() => setModalExplicacion(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              ¡Entendido! 👍
            </button>
          </div>
        </div>
      )}

    </div>
  );
}