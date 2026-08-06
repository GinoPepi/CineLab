import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.TMDB_API_KEY;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OMDB_API_KEY = process.env.OMDB_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('🚀 CineLab Backend activo y respondiendo');
});

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

const MAPA_GENEROS = {
  28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia', 80: 'Crimen',
  99: 'Documental', 18: 'Drama', 10751: 'Familia', 14: 'Fantasía', 36: 'Historia',
  27: 'Terror', 10402: 'Música', 9648: 'Misterio', 10749: 'Romance', 87: 'Ciencia ficción',
  10770: 'Película de TV', 53: 'Suspenso / Thriller', 10752: 'Bélica', 37: 'Western'
};

const STOP_KEYWORDS = new Set([
  'based on novel or novella', 'based on novel', 'duringcreditsstinger', 'aftercreditsstinger',
  'independent film', 'murder', 'friendship', 'violence', 'father son relationship',
  'mother daughter relationship', 'revenge', 'husband wife relationship', 'small town',
  'sequel', 'female protagonist', 'male protagonist', 'woman director', 'based on true story',
  'biography', 'cinema', 'movie', 'los angeles, california', 'new york city', 'death', 'relationship'
]);

async function obtenerNotaIMDb(imdbId) {
  if (!imdbId) return null;
  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.Response === "True" && data.imdbRating && data.imdbRating !== "N/A") {
      return parseFloat(data.imdbRating);
    }
  } catch (err) {
    console.error("⚠️ Error consultando OMDb:", err.message);
  }
  return null;
}

function obtenerClasificacionEdad(releaseDatesData) {
  if (!releaseDatesData?.results) return 'N/D';
  const usRelease = releaseDatesData.results.find(r => r.iso_3166_1 === 'US') || releaseDatesData.results[0];
  if (!usRelease) return 'N/D';
  const cert = usRelease.release_dates?.find(d => d.certification && d.certification.trim() !== '')?.certification;
  return cert || 'N/D';
}

function extraerKeywordsLimpias(keywordsData) {
  const listaRaw = keywordsData?.keywords || keywordsData?.results || [];
  return listaRaw
    .map(k => k.name.toLowerCase().trim())
    .filter(name => !STOP_KEYWORDS.has(name) && name.length > 2)
    .slice(0, 5);
}

function esSecuelaOSaga(candidata, peliculasInput) {
  if (!candidata || !peliculasInput || peliculasInput.length === 0) return false;
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'e', 'o', 'a', 'en', 'con', 'por', 'para', 'the', 'of', 'and', 'in', 'on', 'at', 'to', 'is', 'part', 'parte', 'vol', 'chapter']);

  const normalizar = (str) =>
    (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').trim();

  const extraerPalabrasClave = (str) =>
    normalizar(str).split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const candTitle = normalizar(candidata.title);
  const candOrig = normalizar(candidata.original_title);
  const kwCandTitle = extraerPalabrasClave(candidata.title);
  const kwCandOrig = extraerPalabrasClave(candidata.original_title);

  return peliculasInput.some(input => {
    if (candidata.belongs_to_collection?.id && input.belongs_to_collection?.id) {
      if (candidata.belongs_to_collection.id === input.belongs_to_collection.id) return true;
    }
    const inputTitle = normalizar(input.title);
    const inputOrig = normalizar(input.original_title);
    const kwInputTitle = extraerPalabrasClave(input.title);
    const kwInputOrig = extraerPalabrasClave(input.original_title);

    const coincidenPalabrasClave = (kw1, kw2) => {
      if (!kw1.length || !kw2.length) return false;
      const comunes = kw1.filter(w => kw2.includes(w));
      if (comunes.length >= 2) return true;
      if (comunes.length === 1 && comunes[0].length >= 5 && kw1.length <= 3 && kw2.length <= 3) return true;
      return false;
    };

    const coincideTextoDirecto = (a, b) => a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));

    return (
      coincideTextoDirecto(candTitle, inputTitle) ||
      coincideTextoDirecto(candOrig, inputOrig) ||
      coincidenPalabrasClave(kwCandTitle, kwInputTitle) ||
      coincidenPalabrasClave(kwCandOrig, kwInputOrig)
    );
  });
}

// 🕸️ RED DE CONEXIONES AMPLIA (Top 25 actores + equipo técnico clave)
function obtenerConexionesReparto(peliculas) {
  const mapaPersonas = {};

  peliculas.forEach(peli => {
    if (!peli || !peli.credits) return;

    const reparto = (peli.credits.cast || []).slice(0, 25).map(c => ({
      ...c,
      tipoRol: 'actor',
      rolEtiqueta: c.character ? `Actuación (${c.character})` : 'Actuación'
    }));

    const trabajosClave = {
      'Director': { tipo: 'director', etiqueta: 'Dirección' },
      'Director of Photography': { tipo: 'df', etiqueta: 'Dir. de Fotografía (DF)' },
      'Writer': { tipo: 'guion', etiqueta: 'Guionista' },
      'Screenplay': { tipo: 'guion', etiqueta: 'Guionista' },
      'Producer': { tipo: 'produccion', etiqueta: 'Producción' },
      'Executive Producer': { tipo: 'produccion', etiqueta: 'Producción Exec.' }
    };

    const equipoClave = (peli.credits.crew || [])
      .filter(c => trabajosClave[c.job])
      .map(c => ({
        ...c,
        tipoRol: trabajosClave[c.job].tipo,
        rolEtiqueta: trabajosClave[c.job].etiqueta
      }));

    [...reparto, ...equipoClave].forEach(persona => {
      if (!mapaPersonas[persona.id]) {
        mapaPersonas[persona.id] = {
          id: persona.id,
          nombre: persona.name,
          foto: persona.profile_path ? `https://image.tmdb.org/t/p/w185${persona.profile_path}` : null,
          peliculasMap: {}
        };
      }

      if (!mapaPersonas[persona.id].peliculasMap[peli.id]) {
        mapaPersonas[persona.id].peliculasMap[peli.id] = {
          peliculaId: peli.id,
          tituloPelicula: peli.title,
          roles: []
        };
      }

      const rolesExistentes = mapaPersonas[persona.id].peliculasMap[peli.id].roles;
      if (!rolesExistentes.some(r => r.tipoRol === persona.tipoRol)) {
        rolesExistentes.push({ tipoRol: persona.tipoRol, rolEtiqueta: persona.rolEtiqueta });
      }
    });
  });

  return Object.values(mapaPersonas)
    .map(p => ({
      id: p.id,
      nombre: p.nombre,
      foto: p.foto,
      peliculas: Object.values(p.peliculasMap)
    }))
    .filter(p => p.peliculas.length >= 2);
}

// 🛡️ CAPA 1: RECOMENDACIONES Y SIMILITUD PRIMERO -> LUEGO FILTROS Y VETOS
async function ejecutarCapa1FiltradoYScoring(peliculasOrigen, excludeIds, movieIds, gemaOculta = false, pesoTecnico = false, focoReparto = false, pais = '') {
  console.log(`\n====================================================`);
  console.log(`🛡️ --- INICIANDO CAPA 1: BÚSQUEDA PRIMARIA POR RECOMENDACIONES Y SIMILITUD ---`);
  console.log(`MODO: ${gemaOculta ? '💎 [GEMA OCULTA]' : '🎬 [NORMAL]'} | TÉCNICO: ${pesoTecnico ? 'ACTIVADO 🎥' : 'DESACTIVADO'} | REPARTO: ${focoReparto ? 'ACTIVADO 🎭' : 'DESACTIVADO'} | PAÍS: ${pais ? `🌐 [${pais}]` : 'TODOS'}`);

  const generosOrigenSet = new Set(peliculasOrigen.flatMap(p => p.genres ? p.genres.map(g => g.id) : []));
  const conteoGenerosOrigen = {};
  peliculasOrigen.forEach(p => {
    (p.genres || []).forEach(g => {
      conteoGenerosOrigen[g.id] = (conteoGenerosOrigen[g.id] || 0) + 1;
    });
  });

  // Géneros que están presentes en 2 o más películas elegidas
  const generosDominantes = Object.keys(conteoGenerosOrigen)
    .map(Number)
    .filter(gId => conteoGenerosOrigen[gId] >= 2);

  if (generosDominantes.length > 0) {
    console.log(`📌 GÉNEROS DOMINANTES DETECTADOS:`, generosDominantes.map(g => MAPA_GENEROS[g] || g).join(', '));
  }

  const repartoOrigenObj = peliculasOrigen.flatMap(p => (p.credits?.cast || []).slice(0, 10));
  const repartoOrigenIds = new Set(repartoOrigenObj.map(c => c.id));
  const repartoNombresMap = new Map(repartoOrigenObj.map(c => [c.id, c.name]));

  const equipoOrigenObj = peliculasOrigen.flatMap(p => 
    (p.credits?.crew || []).filter(c => ['Director', 'Writer', 'Screenplay', 'Producer'].includes(c.job))
  );
  const equipoOrigenIds = new Set(equipoOrigenObj.map(c => c.id));

  const aniosOrigen = peliculasOrigen
    .map(p => p.release_date ? parseInt(p.release_date.split('-')[0]) : null)
    .filter(Boolean);

  let esClusterApretado = false;
  let anioPromedioCluster = null;

  if (aniosOrigen.length > 0) {
    const minAnio = Math.min(...aniosOrigen);
    const maxAnio = Math.max(...aniosOrigen);
    const dispersion = maxAnio - minAnio;

    if (dispersion <= 8) {
      esClusterApretado = true;
      anioPromedioCluster = Math.round(aniosOrigen.reduce((a, b) => a + b, 0) / aniosOrigen.length);
      console.log(`📅 ÉPOCA UNIFICADA DETECTADA: ~${anioPromedioCluster} (Dispersión: ${dispersion} años)`);
    } else {
      console.log(`📅 ÉPOCAS DIVERSAS: De ${minAnio} a ${maxAnio} (Dispersión: ${dispersion} años)`);
    }
  }

  const keywordsOrigenLimpias = new Set(
    peliculasOrigen.flatMap(p => extraerKeywordsLimpias(p.keywords))
  );

  const queryPais = pais ? `&with_origin_country=${pais}` : '';
  const generosOrigenIds = [...generosOrigenSet];
  const generosQueryOr = generosOrigenIds.slice(0, 3).join('|');

  // 📡 PASO 1: OBTENER CANDIDATOS PRIMERO DESDE SIMILITUD Y RECOMENDACIONES
  const peticionesBase = [];

  for (const p of peliculasOrigen) {
    peticionesBase.push(
      fetch(`https://api.themoviedb.org/3/movie/${p.id}/recommendations?api_key=${API_KEY}&language=es-ES`).then(r => r.json())
    );
    peticionesBase.push(
      fetch(`https://api.themoviedb.org/3/movie/${p.id}/similar?api_key=${API_KEY}&language=es-ES`).then(r => r.json())
    );
  }

  // Descubrimiento adicional solo si hay modo gema o si los interruptores técnicos están activos
  if (gemaOculta) {
    const generosEspecificos = generosOrigenIds.filter(id => id !== 18 && id !== 35);
    const generosAUsar = generosEspecificos.length > 0 ? generosEspecificos : generosOrigenIds;
    const gQueryAnd = generosAUsar.slice(0, 2).join(',');
    const paginaRandom = Math.floor(Math.random() * 3) + 1;
    const urlGema = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=es-ES&with_genres=${gQueryAnd}${queryPais}&sort_by=vote_average.desc&vote_count.gte=80&vote_count.lte=1500&popularity.lte=25&page=${paginaRandom}`;
    peticionesBase.push(fetch(urlGema).then(r => r.json()));
  }

  if (pesoTecnico && equipoOrigenIds.size > 0) {
    const crewQuery = [...equipoOrigenIds].join('|');
    const urlCrew = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=es-ES&with_crew=${crewQuery}${queryPais}&sort_by=popularity.desc&page=1`;
    peticionesBase.push(fetch(urlCrew).then(r => r.json()));
  }

  if (focoReparto && repartoOrigenIds.size > 0) {
    const castQuery = [...repartoOrigenIds].join('|');
    const urlCast = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=es-ES&with_cast=${castQuery}${queryPais}&sort_by=popularity.desc&page=1`;
    peticionesBase.push(fetch(urlCast).then(r => r.json()));
  }

  const respuestas = await Promise.all(peticionesBase);
  const mapaCandidatosBrutos = new Map();

  respuestas.forEach(res => {
    if (!res || !res.results) return;
    res.results.forEach(cand => {
      if (!mapaCandidatosBrutos.has(cand.id)) {
        mapaCandidatosBrutos.set(cand.id, { ...cand, frecuenciasAparicion: 1 });
      } else {
        mapaCandidatosBrutos.get(cand.id).frecuenciasAparicion += 1;
      }
    });
  });

  let candidatosRaw = Array.from(mapaCandidatosBrutos.values());
  console.log(`📦 CANDIDATOS REUNIDOS EN POOL INICIAL: ${candidatosRaw.length}`);

  // 📡 PASO 2: OBTENER DETALLES COMPLETOS DE LAS PELÍCULAS SIMILARES
  const promesasDetalles = candidatosRaw.slice(0, 60).map(cand =>
    fetch(`https://api.themoviedb.org/3/movie/${cand.id}?api_key=${API_KEY}&append_to_response=keywords,release_dates,credits&language=es-ES`).then(r => r.json())
  );

  const detallesCandidatas = await Promise.all(promesasDetalles);
  const candidatosProcesados = [];
  const seenIds = new Set();

  console.log(`\n🔍 --- PASO 3: APLICANDO VETOS Y FILTROS SOBRE LAS RECOMENDACIONES ---`);

  for (const cand of detallesCandidatas) {
    if (!cand || !cand.id || seenIds.has(cand.id)) continue;

    const anioCand = cand.release_date ? cand.release_date.split('-')[0] : 'N/D';

    if (movieIds.includes(cand.id)) {
      console.log(`❌ VETO ORIGEN: "${cand.title}" [${anioCand}]`);
      continue;
    }
    if (excludeIds.includes(cand.id)) {
      console.log(`❌ VETO EXCLUSIÓN: "${cand.title}" [${anioCand}]`);
      continue;
    }
    if (esSecuelaOSaga(cand, peliculasOrigen)) {
      console.log(`❌ VETO SAGA: "${cand.title}" [${anioCand}]`);
      continue;
    }

    if (!gemaOculta && cand.vote_count >= 40 && cand.vote_average < 6.0) {
      console.log(`❌ VETO CALIDAD: "${cand.title}" [${anioCand}] -> Nota baja (${cand.vote_average.toFixed(1)})`);
      continue;
    }

    if (pais) {
      const paisesOrigenCand = cand.origin_country || [];
      const paisesProducCand = (cand.production_countries || []).map(pc => pc.iso_3166_1);
      const coincidePais = paisesOrigenCand.includes(pais) || paisesProducCand.includes(pais);
      if (!coincidePais) {
        console.log(`❌ VETO PAÍS: "${cand.title}" [${anioCand}]`);
        continue;
      }
    }

    const generosCand = cand.genres ? cand.genres.map(g => g.id) : [];

    // Veto de Géneros Dominantes
    if (generosDominantes.length > 0) {
      const comparteGeneroDominante = generosCand.some(gId => generosDominantes.includes(gId));
      if (!comparteGeneroDominante) {
        console.log(`❌ VETO GÉNERO DOMINANTE: "${cand.title}" [${anioCand}] -> No comparte géneros principales (${generosDominantes.map(g => MAPA_GENEROS[g] || g).join(', ')})`);
        continue;
      }
    }

    // Veto de Foco Reparto sobre las recomendadas
    if (focoReparto) {
      const repartoCandIds = (cand.credits?.cast || []).slice(0, 15).map(c => c.id);
      const actorCoincidente = repartoCandIds.find(id => repartoOrigenIds.has(id));
      if (!actorCoincidente) {
        console.log(`❌ VETO REPARTO: "${cand.title}" [${anioCand}] -> Recomendación descartada por no compartir actores de origen.`);
        continue;
      } else {
        const nombreActor = repartoNombresMap.get(actorCoincidente);
        console.log(`🎯 COINCIDENCIA REPARTO EN RECOMENDADA: "${cand.title}" [${anioCand}] -> Actor: ${nombreActor}`);
      }
    }

    // Veto de Sello de Autor sobre las recomendadas
    if (pesoTecnico) {
      const equipoCandIds = (cand.credits?.crew || [])
        .filter(c => ['Director', 'Writer', 'Screenplay', 'Producer'].includes(c.job))
        .map(c => c.id);

      const tieneCoincidenciaEquipo = equipoCandIds.some(id => equipoOrigenIds.has(id));
      if (!tieneCoincidenciaEquipo) {
        console.log(`❌ VETO TÉCNICO: "${cand.title}" [${anioCand}] -> Recomendación descartada por no compartir equipo de origen.`);
        continue;
      }
    }

    seenIds.add(cand.id);

    // 📊 PASO 4: SCORING Y PUNTUACIÓN DE SOBREVIVIENTES
    let score = 0;
    const desgloses = [];

    // 📅 SCORING Y PENALIZACIÓN TEMPORAL DINÁMICA
    if (cand.release_date) {
      const aNum = parseInt(anioCand);
      if (!isNaN(aNum) && esClusterApretado && anioPromedioCluster) {
        const dif = Math.abs(aNum - anioPromedioCluster);
        
        if (dif <= 3) {
          score += 50;
          desgloses.push(`+50 pts 📅 (Época idéntica ~${aNum})`);
        } else if (dif <= 6) {
          score += 25;
          desgloses.push(`+25 pts 📅 (Época muy cercana ~${aNum})`);
        } else if (dif > 8) {
          // ⏳ Penalización proporcional por alejarse del bloque temporal objetivo
          const penalizacion = Math.min((dif - 8) * 6, 90);
          score -= penalizacion;
          desgloses.push(`-${penalizacion} pts ⏳ (Diferencia de ${dif} años vs época ~${anioPromedioCluster})`);
        }
      }
    }

    const rawData = mapaCandidatosBrutos.get(cand.id);
    if (rawData && rawData.frecuenciasAparicion > 1) {
      const bonusNet = rawData.frecuenciasAparicion * 12;
      score += bonusNet;
      desgloses.push(`+${bonusNet} pts 🔄 (Aparece en recomendaciones de varias de las elegidas)`);
    }

    generosCand.forEach(genreId => {
      const freq = conteoGenerosOrigen[genreId] || 0;
      const nombreG = MAPA_GENEROS[genreId] || `ID ${genreId}`;
      if (freq >= 3) { score += 25; desgloses.push(`+25 pts (Género "${nombreG}" en 3 originales)`); }
      else if (freq === 2) { score += 15; desgloses.push(`+15 pts (Género "${nombreG}" en 2 originales)`); }
    });

    const kwCand = extraerKeywordsLimpias(cand.keywords);
    kwCand.forEach(kw => {
      if (keywordsOrigenLimpias.has(kw)) {
        score += 15;
        desgloses.push(`+15 pts (Temática: "${kw}")`);
      }
    });

    if (cand.credits) {
      const directoresCand = (cand.credits.crew || []).filter(c => c.job === 'Director');
      const guionistasCand = (cand.credits.crew || []).filter(c => ['Writer', 'Screenplay'].includes(c.job));
      const repartoCand = (cand.credits.cast || []).slice(0, 8);

      directoresCand.forEach(c => {
        if (equipoOrigenIds.has(c.id)) { score += 120; desgloses.push(`+120 pts 🎬 (Mismo Director: ${c.name})`); }
      });
      guionistasCand.forEach(c => {
        if (equipoOrigenIds.has(c.id)) { score += 90; desgloses.push(`+90 pts ✍️ (Mismo Guionista: ${c.name})`); }
      });
      repartoCand.forEach(c => {
        if (repartoOrigenIds.has(c.id)) { score += 50; desgloses.push(`+50 pts 🎭 (Mismo Actor/Actriz: ${c.name})`); }
      });
    }

    if (!gemaOculta && cand.vote_average >= 6.8 && cand.vote_count >= 150) {
      score += 20;
      desgloses.push(`+20 pts ⭐ (Buena calificación: ${cand.vote_average.toFixed(1)})`);
    }

    candidatosProcesados.push({
      ...cand,
      score,
      desgloses,
      clasificacionEdad: obtenerClasificacionEdad(cand.release_dates),
      keywordsLimpias: kwCand
    });
  }

  candidatosProcesados.sort((a, b) => b.score - a.score);

  const topFinal = candidatosProcesados.slice(0, 15);

  console.log(`\n✅ CAPA 1 COMPLETADA: ${topFinal.length} candidatas aprobadas para enviar a Groq.`);
  console.log(`\n🏆 TOP 5 CANDIDATAS QUE LLEGARON A LA IA:`);
  topFinal.slice(0, 5).forEach((c, idx) => {
    console.log(`\n ${idx + 1}. "${c.title}" [${c.release_date ? c.release_date.split('-')[0] : 'N/D'}] -> SCORE TOTAL: ${c.score} pts`);
    c.desgloses.forEach(d => console.log(`         * ${d}`));
  });
  console.log(`====================================================\n`);

  return topFinal;
}

// 🤖 CAPA 2 SÍNTESIS
async function analizarYRecomendarConIA(origen, candidatasCapa1) {
  const origenTexto = origen.map(p => {
    const cert = obtenerClasificacionEdad(p.release_dates);
    const kw = extraerKeywordsLimpias(p.keywords).join(', ');
    return `- "${p.title}" [Clasificación: ${cert}] | Temáticas: [${kw}] | Sinopsis: ${p.overview || 'Sin descripción'}`;
  }).join('\n');

  const candidatasTexto = candidatasCapa1.map(c => {
    return `- ID ${c.id}: "${c.title}" [Clasificación: ${c.clasificacionEdad}] | Temáticas: [${c.keywordsLimpias.join(', ')}] | Sinopsis: ${c.overview || 'Sin sinopsis'}`;
  }).join('\n');

  const prompt = `Eres un crítico de cine experto de CineLab especializado en estética, tono narrativo y coherencia conceptual.

Películas seleccionadas por el usuario:
${origenTexto}

Candidatas pre-filtradas (Aprobadas por la Capa 1):
${candidatasTexto}

TAREA:
Selecciona LA MEJOR película de la lista pre-filtrada que complete conceptual y estéticamente la trilogía del usuario.

Responde ÚNICAMENTE un objeto JSON con esta estructura exacta:
{"idElegida": NUMERO_DE_ID, "argumentoIA": "Explicación breve de 2 frases en español justificando la coincidencia de tono y concepto."}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content;
    return JSON.parse(raw);
  } catch (err) {
    return {
      idElegida: candidatasCapa1[0].id,
      argumentoIA: "Recomendación basada en la mayor coincidencia temática y estética aprobada por el motor."
    };
  }
}

// 🤖 CAPA 2 DESCOMPOSICIÓN CON DEDUPLICACIÓN GARANTIZADA
async function seleccionarYAnalizarADNConIA(peliculaTarget, candidatasCapa1) {
  const candidatosTexto = candidatasCapa1
    .map(c => `- ID ${c.id}: "${c.title}" [Clasificación: ${c.clasificacionEdad}] | Temáticas: [${c.keywordsLimpias.join(', ')}] | Sinopsis: ${c.overview || 'Sin descripción'}`)
    .join('\n');

  const prompt = `Eres un analista cinematográfico experto de CineLab.
Película a analizar: "${peliculaTarget.title}" (${peliculaTarget.overview || 'Sin descripción'}).

Candidatas pre-filtradas:
${candidatosTexto}

TAREA:
1. Descompón los ejes temáticos, tono y propuesta narrativa de "${peliculaTarget.title}".
2. Selecciona EXACTAMENTE 3 películas DISTINTAS de la lista que exploren o desarrollen esos mismos temas con MAYOR PROFUNDIDAD.
3. Redacta un análisis de 3 frases en español explicando qué dimensión temática de "${peliculaTarget.title}" profundiza cada una.

Responde ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{"idsElegidos": [ID_NUMERO_1, ID_NUMERO_2, ID_NUMERO_3], "argumentoADN": "Tu análisis de 3 frases justificando cómo profundizan los temas de la película analizada."}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 500,
    });

    const raw = response.choices[0]?.message?.content;
    return JSON.parse(raw);
  } catch (err) {
    return {
      idsElegidos: candidatasCapa1.slice(0, 3).map(c => c.id),
      argumentoADN: `Obras seleccionadas por su alta coincidencia en el desarrollo profundo de los temas centrales de "${peliculaTarget.title}".`
    };
  }
}

app.get('/api/buscar', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Debes enviar un término de búsqueda.' });

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    res.json(datos.results || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con TMDb' });
  }
});

app.post('/api/caldero', async (req, res) => {
  try {
    const { movieIds, gemaOculta = false, pesoTecnico = false, focoReparto = false, pais = '', excludeIds = [] } = req.body;

    if (!movieIds || !Array.isArray(movieIds) || movieIds.length !== 3) {
      return res.status(400).json({ error: 'Debes enviar exactamente 3 IDs.' });
    }

    const peticiones = movieIds.map(id =>
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&append_to_response=credits,keywords,release_dates&language=es-ES`).then(r => r.json())
    );
    const peliculasElegidas = await Promise.all(peticiones);

    const candidatosCapa1 = await ejecutarCapa1FiltradoYScoring(peliculasElegidas, excludeIds, movieIds, gemaOculta, pesoTecnico, focoReparto, pais);

    if (candidatosCapa1.length === 0) {
      return res.status(404).json({ error: 'No encontramos recomendaciones para el filtro y nivel de coincidencia requerido.' });
    }

    const decisionIA = await analizarYRecomendarConIA(peliculasElegidas, candidatosCapa1);
    const seleccionadaBase = candidatosCapa1.find(c => c.id === decisionIA.idElegida) || candidatosCapa1[0];

    const resRecomendada = await fetch(`https://api.themoviedb.org/3/movie/${seleccionadaBase.id}?api_key=${API_KEY}&append_to_response=credits,keywords,release_dates&language=es-ES`);
    const recomendadaConCreditos = await resRecomendada.json();

    const notaIMDb = await obtenerNotaIMDb(recomendadaConCreditos.imdb_id);
    const puntuacionFinal = notaIMDb || recomendadaConCreditos.vote_average;
    const origenNota = notaIMDb ? 'IMDb' : 'TMDb';

    const conexionesReparto = obtenerConexionesReparto([...peliculasElegidas, recomendadaConCreditos]);

    res.json({
      ingredientes: peliculasElegidas.map(p => p.title),
      modoGemaOculta: gemaOculta,
      modoPesoTecnico: pesoTecnico,
      modoFocoReparto: focoReparto,
      modoPais: pais,
      argumentoIA: decisionIA.argumentoIA,
      resultado: {
        id: recomendadaConCreditos.id,
        titulo: recomendadaConCreditos.title,
        sinopsis: recomendadaConCreditos.overview,
        poster: recomendadaConCreditos.poster_path ? `https://image.tmdb.org/t/p/w500${recomendadaConCreditos.poster_path}` : null,
        puntuacion: puntuacionFinal,
        origenPuntuacion: origenNota,
        clasificacionEdad: obtenerClasificacionEdad(recomendadaConCreditos.release_dates),
        keywords: extraerKeywordsLimpias(recomendadaConCreditos.keywords),
        fechaEstreno: recomendadaConCreditos.release_date
      },
      conexiones: conexionesReparto
    });

  } catch (error) {
    console.error('❌ Error en Síntesis:', error);
    res.status(500).json({ error: 'Error al procesar la mezcla.' });
  }
});

// 🔬 RUTA DESCOMPOSICIÓN CON DEDUPLICACIÓN DE CANDIDATOS
app.get('/api/adn', async (req, res) => {
  try {
    const { movieId, excludeIds = '', pesoTecnico = 'false', focoReparto = 'false', pais = '' } = req.query;
    if (!movieId) return res.status(400).json({ error: 'Debes enviar un ID de película.' });

    const excludedList = excludeIds ? excludeIds.split(',').map(Number) : [];
    const esPesoTecnico = pesoTecnico === 'true';
    const esFocoReparto = focoReparto === 'true';

    const resPeli = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,keywords,release_dates&language=es-ES`);
    const peliculaOriginal = await resPeli.json();

    if (!peliculaOriginal || !peliculaOriginal.genres) {
      return res.status(404).json({ error: 'No se encontró la película especificada.' });
    }

    const candidatosCapa1 = await ejecutarCapa1FiltradoYScoring([peliculaOriginal], excludedList, [parseInt(movieId)], false, esPesoTecnico, esFocoReparto, pais);

    if (candidatosCapa1.length < 3) {
      return res.status(404).json({ error: 'No se encontraron suficientes componentes inéditos con los filtros aplicados.' });
    }

    const resultadoIA = await seleccionarYAnalizarADNConIA(peliculaOriginal, candidatosCapa1);

    // 🔒 GARANTÍA DE DEDUPLICACIÓN EN DESCOMPOSICIÓN
    let componentesElegidos = [];
    const idsUnicos = [...new Set(resultadoIA.idsElegidos || [])];

    idsUnicos.forEach(id => {
      const hallada = candidatosCapa1.find(c => c.id === id);
      if (hallada && !componentesElegidos.some(item => item.id === hallada.id)) {
        componentesElegidos.push(hallada);
      }
    });

    candidatosCapa1.forEach(c => {
      if (componentesElegidos.length < 3 && !componentesElegidos.some(item => item.id === c.id)) {
        componentesElegidos.push(c);
      }
    });

    const peticionesComponentes = [movieId, ...componentesElegidos.map(c => c.id)].map(id =>
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&append_to_response=credits,keywords,release_dates&language=es-ES`).then(r => r.json())
    );
    const conjuntoPeliculas = await Promise.all(peticionesComponentes);

    const componentesFormatted = await Promise.all(
      conjuntoPeliculas.slice(1).map(async (p) => {
        const notaIMDb = await obtenerNotaIMDb(p.imdb_id);
        return {
          id: p.id,
          titulo: p.title,
          sinopsis: p.overview,
          poster: p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null,
          puntuacion: notaIMDb || p.vote_average,
          origenPuntuacion: notaIMDb ? 'IMDb' : 'TMDb',
          clasificacionEdad: obtenerClasificacionEdad(p.release_dates),
          keywords: extraerKeywordsLimpias(p.keywords)
        };
      })
    );

    const conexionesReparto = obtenerConexionesReparto(conjuntoPeliculas);

    res.json({
      pelicula: peliculaOriginal.title,
      argumentoADN: resultadoIA.argumentoADN,
      modoPesoTecnico: esPesoTecnico,
      modoFocoReparto: esFocoReparto,
      modoPais: pais,
      adn: componentesFormatted,
      conexiones: conexionesReparto
    });

  } catch (error) {
    console.error('❌ Error en Descomposición:', error);
    res.status(500).json({ error: 'Error al desglosar la película.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CineLab Backend activo en http://localhost:${PORT}`);
});