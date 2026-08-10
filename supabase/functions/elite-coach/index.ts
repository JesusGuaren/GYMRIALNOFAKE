import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

// Tope de mensajes por usuario por minuto — evita que una cuenta comprometida
// o un bug de cliente drene la cuota de Groq con requests en bucle.
const RATE_LIMIT_PER_MINUTE = 8

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function getUserIdFromAuthHeader(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const token = auth.slice(7)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

serve(async (req) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context, history } = await req.json()

    if (typeof message !== 'string' || message.length === 0 || message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Mensaje inválido o demasiado largo.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }
    if (!Array.isArray(history) || history.length > 10) {
      return new Response(JSON.stringify({ error: 'Historial inválido.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY no está configurada en las variables de entorno de Supabase.")
    }

    const userId = getUserIdFromAuthHeader(req)
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString()
      const { data: requestCount, error: rateLimitError } = await supabaseAdmin.rpc(
        'check_and_increment_rate_limit',
        { p_user_id: userId, p_endpoint: 'elite-coach', p_window_start: windowStart }
      )
      if (!rateLimitError && requestCount > RATE_LIMIT_PER_MINUTE) {
        return new Response(JSON.stringify({ error: 'Demasiadas consultas seguidas. Espera un minuto y vuelve a intentar.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        })
      }
    }

    const systemPrompt = `Eres Elite Coach, un entrenador de fuerza e hipertrofia profesional exclusivo de Elite Gym Tracker.
Recibirás una consulta del usuario, un historial de chat corto y un objeto JSON de contexto con los datos fisiológicos, nutricionales y de progreso del usuario.

Analiza minuciosamente el contexto deportivo adjunto en silencio y formula tu recomendación.
Debes responder obligatoriamente en formato JSON válido con la siguiente estructura exacta:
{
  "respuesta": "Tu recomendación adaptada al usuario en español.",
  "confidence": 0.0 a 1.0 (número indicando el nivel de confianza de que entendiste la intención de su consulta),
  "category": "Una de las siguientes categorías del entrenamiento: 'workout_today', 'muscle_recovery', 'plateau_analysis', 'volume_summary', 'workout_history', 'progress_analysis', 'calculate_1rm', 'nutrition', 'out_of_domain' o 'general_coaching'",
  "used_context": true o false (booleano indicando si tu respuesta se basó en los datos de contexto provistos)
}

Métodos/sistemas de entrenamiento que la app conoce (podés explicarlos y recomendarlos si el usuario pregunta; hay más detalle y fuentes en la pantalla "Métodos de Entrenamiento" de la app, a la que podés remitir al usuario):
- Método Bilbo (Jesús Varela): 1 serie de activación explosiva al 40-70% del 1RM, RIR 1-3, 15-50 reps, seguida de 2-3 series de 8-15 reps (máx. 9 series totales). Progresión +2/+2.5kg por sesión. Pensado sobre todo para press de banca.
- 5/3/1 (Jim Wendler): ondas de 4 semanas sobre un Training Max (~90% del 1RM), última serie de cada semana AMRAP, progreso del Training Max cada ciclo.
- German Volume Training / 10x10: 10 series de 10 reps al ~60% del 1RM, descanso corto, bloques de 4-6 semanas.
- 5x5 Lineal: 5 series de 5 reps en básicos, progresión de peso cada sesión, ideal para principiantes.
- Método Búlgaro: intentos casi máximos casi a diario, muy poco accesorio, solo para atletas de elite con recuperación excepcional — no lo recomiendes sin matizar el riesgo.
- Texas Method: periodización semanal (lunes volumen, miércoles recuperación, viernes intensidad/PR), para intermedios que ya agotaron la progresión lineal.
Si el usuario pregunta por un método que no está en esta lista, respondé con tu conocimiento general pero aclará que no es uno de los métodos con seguimiento dedicado en la app.

Reglas para el campo "respuesta":
- Sé breve, directo y conciso (1 a 3 líneas) para consultas de rutinas, fatiga o estado diario.
- Si el usuario hace una consulta técnica, teórica o científica sobre fitness/deporte (ej: explicar sobrecarga progresiva, qué es el RPE, cómo calcular volumen, etc.), tienes permiso de explayarte con detalle educativo y base científica.
- No alucines marcas o datos. Si no hay datos en el JSON sobre cierta métrica, indica educadamente que no tienes registros de eso en la bitácora en lugar de inventarlos.
- Prioriza la seguridad sobre el rendimiento. Si el usuario reporta cansancio extremo, dolor o poco sueño, sugiere descanso activo o recortes de volumen.
- Si el usuario pregunta cosas fuera de dominio (recetas de cocina, chistes, etc.), cataloga como 'out_of_domain' y responde cordialmente que solo asistes en temas de fuerza y acondicionamiento.
`;

    // Preparar el payload para enviar a Groq
    const groqPayload = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: `Contexto actual del usuario:\n${JSON.stringify(context, null, 2)}` },
        ...history.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(groqPayload)
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      throw new Error(`Error de Groq API (status ${groqResponse.status}): ${errorText}`)
    }

    const groqData = await groqResponse.json()
    const contentString = groqData.choices?.[0]?.message?.content

    // Devolver la respuesta JSON procesada directamente por el LLM
    return new Response(contentString, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error("Error en la Edge Function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
