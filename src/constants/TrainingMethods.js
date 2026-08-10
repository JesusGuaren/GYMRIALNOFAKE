// Fuente única de verdad sobre métodos/sistemas de entrenamiento conocidos por la app.
// La consume TrainingMethodsScreen (biblioteca de referencia completa) y AIRoutineGenerator
// (a través de generatorProfile, solo para los métodos que se pueden aplicar a UN ejercicio
// principal dentro de una rutina generada). El Coach IA NO importa este archivo (corre en una
// Edge Function Deno separada) — tiene su propio resumen corto en su system prompt.
//
// Solo `generatorProfile: null` en los métodos que son periodización semanal/diaria real
// (Búlgaro, Texas Method): forzarlos a "un ejercicio en una rutina" tergiversaría el método,
// así que quedan como referencia pura, explicables por el Coach pero no aplicables por la IA.

export const TRAINING_METHODS = [
  {
    id: 'bilbo',
    name: 'Método Bilbo',
    tagline: 'Una sola serie de activación explosiva sin cargas máximas, con progresión fija de +2 kg por sesión.',
    creator: 'Jesús Varela, apodado "Bilbo"',
    origin: 'Jesús Varela es fontanero de oficio y pressbanquista español (240 kg en press de banca). El método nació de su propia experimentación y se popularizó al compartirlo en foros de internet, donde otros usuarios lo empezaron a llamar "Método Bilbo".',
    howItWorks: [
      'La sesión arranca con la "Serie Bilbo": la primera serie del ejercicio principal, con el 40-70% del 1RM, dejando 1-3 repeticiones en reserva (RIR 1-3). Se ejecuta explosiva en la subida mientras se controla la bajada, entre 15 y 50 repeticiones.',
      'Después de esa serie de activación siguen 2-3 series complementarias de 8-15 repeticiones, sin superar las 9 series totales en el ejercicio principal.',
      'La progresión es lineal y simple: si la sesión anterior se completó bien, la próxima vez que entrenes ese ejercicio sumas ~2 kg (nivel avanzado) o 2.5 kg (principiante).'
    ],
    bestFor: 'Pensado sobre todo para el press de banca y movimientos de empuje similares.',
    cautions: 'En sentadilla o peso muerto pesado el propio Varela advierte que el ejercicio se vuelve más "aeróbico" por la fatiga acumulada en tantas repeticiones, perdiendo parte de su lógica original. Tampoco es ideal para quien todavía está aprendiendo la técnica del ejercicio principal.',
    sources: [
      { label: 'Infobae', url: 'https://www.infobae.com/tendencias/2025/07/12/metodo-bilbo-la-tecnica-que-fortalece-el-musculo-sin-recurrir-a-cargas-extremas/' },
      { label: 'Merca2 — entrevista a Jesús Varela', url: 'https://www.merca2.es/2025/09/25/jesus-varela-metodo-bilbo-press-banca-2234113/' },
      { label: 'FitGeneration — análisis del método', url: 'https://fitgeneration.es/metodo-bilbo/' }
    ],
    generatorProfile: {
      setsCount: 4,
      repsRange: '15-50 → 8-15',
      notes: '🔵 Serie Bilbo: 1ª serie explosiva al 40-70% de tu 1RM, RIR 1-3 (15-50 reps). Luego 2-3 series de 8-15 reps (máx. 9 series totales). Progresión: +2 kg sobre lo que levantaste la última vez en este ejercicio.'
    }
  },
  {
    id: '531',
    name: '5/3/1',
    tagline: 'Ondas de 4 semanas sobre un "Training Max" submáximo, con una última serie a repeticiones máximas cada semana.',
    creator: 'Jim Wendler',
    origin: 'Creado por el ex-powerlifter estadounidense Jim Wendler como una forma de progresar a largo plazo sin quemarse, después de años entrenando al límite con programas de fuerza más agresivos.',
    howItWorks: [
      'Se calcula un "Training Max" (TM) para cada uno de los 4 levantamientos principales (sentadilla, press banca, peso muerto, press militar): aproximadamente el 90% de tu 1RM real, para dejar margen de progreso.',
      'El programa avanza en ondas de 4 semanas sobre ese TM. Semana 1: 3x5 (65/75/85% del TM). Semana 2: 3x3 (70/80/90%). Semana 3 (la que le da nombre al método): 5/3/1 reps con 75/85/95% del TM. Semana 4: descarga suave.',
      'La última serie de cada semana (salvo la de descarga) se hace "AMRAP" (tantas repeticiones como sea posible), lo que sirve como referencia de progreso.',
      'Al terminar el ciclo de 4 semanas se sube el Training Max: +2.5 kg en press banca/militar, +5 kg en sentadilla/peso muerto, y se repite.'
    ],
    bestFor: 'Levantadores intermedios/avanzados que ya conocen sus 1RM y quieren progresar en fuerza de forma sostenible durante meses, sin depender de series al fallo cada semana.',
    cautions: 'La progresión es lenta a propósito — no es el método más rápido para ganar fuerza a corto plazo, y requiere calcular bien el Training Max (usa la calculadora de 1RM de la app) en vez de adivinarlo.',
    sources: [],
    generatorProfile: {
      setsCount: 3,
      repsRange: '5/3/1 (según semana)',
      notes: '🔵 5/3/1: calcula tu Training Max (≈90% de tu 1RM real) con la calculadora de la app. Semana 1: 65/75/85% a 3x5. Semana 2: 70/80/90% a 3x3. Semana 3: 75/85/95% a 5/3/1. Última serie de cada semana: AMRAP.'
    }
  },
  {
    id: 'gvt',
    name: 'German Volume Training (10x10)',
    tagline: '10 series de 10 repeticiones sobre un mismo ejercicio, con una carga moderada y descansos cortos.',
    creator: 'Popularizado por el entrenador Charles Poliquin (atribuido originalmente a levantadores de pesas alemanes)',
    origin: 'Se atribuye a los métodos de acumulación de volumen usados por levantadores de pesas alemanes en los años 70-80; Charles Poliquin lo popularizó en el mundo del culturismo y la preparación física occidental en los 90.',
    howItWorks: [
      'Se elige un único ejercicio compuesto por grupo muscular (ej. sentadilla para pierna, press banca para pecho) y se hacen 10 series de 10 repeticiones con el mismo peso, ~60% del 1RM.',
      'El descanso es corto y fijo: 60-90 segundos entre series, lo que hace que las últimas series sean mucho más duras que las primeras aunque el peso no cambie.',
      'Solo se sube el peso (incrementos pequeños) cuando se logran completar las 10x10 reps completas en una sesión.',
      'Se usa como bloque de especialización de 4-6 semanas, no como rutina permanente — es muy demandante para el sistema nervioso y articulaciones si se sostiene más tiempo.'
    ],
    bestFor: 'Bloques cortos de hipertrofia pura cuando el progreso de fuerza se estancó y se busca un choque de volumen.',
    cautions: 'Muy exigente para articulaciones y recuperación si se aplica a más de un ejercicio pesado por sesión, o por más de 4-6 semanas seguidas.',
    sources: [],
    generatorProfile: {
      setsCount: 10,
      repsRange: '10',
      notes: '🔵 German Volume Training: 10 series de 10 reps con el mismo peso (~60% de tu 1RM), descanso corto de 60-90s. Solo sube el peso cuando completes las 10x10 en una sesión. Máximo 4-6 semanas seguidas.'
    }
  },
  {
    id: '5x5',
    name: '5x5 Lineal',
    tagline: 'El clásico de fuerza para principiantes: 5 series de 5 repeticiones con progresión de peso en cada sesión.',
    creator: 'Sistema tradicional de halterofilia/powerlifting, popularizado en su forma moderna por programas como StrongLifts 5x5 y Starting Strength',
    origin: 'Es uno de los esquemas de series/repeticiones más antiguos y estudiados del entrenamiento de fuerza, base de innumerables programas para principiantes desde mediados del siglo XX.',
    howItWorks: [
      'Se entrenan 3 veces por semana (no consecutivas) alternando 2 rutinas de cuerpo completo con los levantamientos básicos: sentadilla, press banca, remo, press militar, peso muerto.',
      '5 series de 5 repeticiones en cada ejercicio principal (el peso muerto suele hacerse a 1x5 por la fatiga que genera).',
      'Progresión por sesión: si completas las 5x5 con buena técnica, sumas peso (típicamente 2.5 kg) la próxima vez que hagas ese ejercicio.',
      'Cuando ya no puedes progresar sesión a sesión (fallas 2-3 veces seguidas en el mismo peso), es la señal de pasar a un programa más avanzado con periodización.'
    ],
    bestFor: 'Principiantes que recién arrancan a levantar pesas y todavía tienen "ganancias de novato" disponibles — es el punto de entrada más simple y efectivo a la fuerza real.',
    cautions: 'Deja de funcionar (los estancamientos llegan rápido) una vez que el margen de progreso de principiante se agota, normalmente a los pocos meses.',
    sources: [],
    generatorProfile: {
      setsCount: 5,
      repsRange: '5',
      notes: '🔵 5x5 Lineal: 5 series de 5 reps. Si completas todas las repeticiones con buena técnica, sube ~2.5 kg la próxima vez que entrenes este ejercicio. Si fallas 2-3 veces seguidas al mismo peso, es momento de cambiar de programa.'
    }
  },
  {
    id: 'bulgarian',
    name: 'Método Búlgaro',
    tagline: 'Frecuencia altísima: intentos cercanos al máximo casi todos los días, con muy poco trabajo accesorio.',
    creator: 'Ivan Abadjiev, entrenador del equipo nacional de halterofilia de Bulgaria',
    origin: 'Sistema usado por el equipo nacional búlgaro de halterofilia entre los años 70 y 90, con resultados de elite mundial pero también un historial conocido de altísimo desgaste físico y mental en los atletas.',
    howItWorks: [
      'Se entrena el mismo levantamiento (típicamente los movimientos de halterofilia: arranque y envión, o sus variantes) prácticamente todos los días.',
      'La mayoría de las sesiones buscan un máximo del día (no un 1RM absoluto, sino "lo máximo que el cuerpo permite hoy"), en vez de trabajar a porcentajes fijos preestablecidos.',
      'Casi no hay trabajo accesorio ni de aislamiento: el volumen se concentra casi por completo en los levantamientos principales.',
      'Requiere una recuperación excepcional (sueño, nutrición, y en el caso de los atletas búlgaros originales, entrenar como actividad de tiempo completo) para no terminar sobreentrenado o lesionado.'
    ],
    bestFor: 'Atletas de halterofilia de nivel elite con años de experiencia y una capacidad de recuperación fuera de lo común. No es un método para el gimnasio recreativo.',
    cautions: 'Alto riesgo de lesión y sobreentrenamiento fuera de un contexto de atleta de elite con supervisión profesional constante. La app lo incluye como referencia cultural/histórica, no como algo recomendable de aplicar sin más.',
    sources: [],
    generatorProfile: null
  },
  {
    id: 'texas_method',
    name: 'Texas Method',
    tagline: 'Periodización semanal simple: un día de volumen, uno de recuperación y uno de intensidad máxima.',
    creator: 'Popularizado por Mark Rippetoe y Glenn Pendlay (libro "Practical Programming for Strength Training")',
    origin: 'Pensado como el siguiente paso natural después de que un programa lineal como el 5x5 deja de funcionar (cuando ya no se puede progresar sesión a sesión), moviendo la progresión a una escala semanal.',
    howItWorks: [
      'Lunes (Día de Volumen): 5 series de 5 repeticiones a una intensidad alta (~90% del peso del viernes anterior).',
      'Miércoles (Día de Recuperación): volumen ligero, 2 series de 5 repeticiones a ~80% del peso del lunes, para practicar técnica sin acumular fatiga extra.',
      'Viernes (Día de Intensidad): una sola serie de 5 repeticiones buscando un nuevo peso máximo respecto al viernes anterior.',
      'La progresión ya no es por sesión sino semanal: el objetivo es superar el peso del viernes anterior, no el de cada entrenamiento.'
    ],
    bestFor: 'Levantadores intermedios que ya agotaron la progresión lineal sesión a sesión de un programa tipo 5x5, pero todavía no necesitan una periodización tan compleja como 5/3/1.',
    cautions: 'El día de intensidad (viernes) es exigente mentalmente porque es, literalmente, un intento de récord semanal — requiere buena gestión del descanso entre semana.',
    sources: [],
    generatorProfile: null
  }
];

export const getTrainingMethodById = (id) => TRAINING_METHODS.find(m => m.id === id) || null;

// Métodos que el Creador IA puede aplicar al ejercicio principal de una rutina generada.
export const APPLICABLE_TRAINING_METHODS = TRAINING_METHODS.filter(m => !!m.generatorProfile);
