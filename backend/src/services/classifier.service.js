const OpenAI = require("openai");

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function clasificarPQR(texto) {
  const prompt = `Eres un sistema experto en gestión de PQR para instituciones educativas colombianas.
Analiza el siguiente mensaje y responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código, sin explicaciones.

Mensaje: "${texto}"

Responde con este JSON exacto:
{
  "tipo": "Petición" o "Queja" o "Reclamo",
  "categoria": "Académico" o "Financiero" o "Administrativo" o "Convivencia" o "Tecnológico" o "Disciplinario",
  "prioridad": "Alta" o "Media" o "Baja",
  "sentimiento": "Urgente" o "Negativo" o "Neutral" o "Positivo",
  "area_responsable": "Coordinación académica" o "Tesorería" o "Registro y control" o "Bienestar" o "Soporte TI" o "Dirección",
  "resumen": "Una sola frase corta que describe el problema",
  "confianza": número entre 0 y 1
}

Criterios de prioridad:
- Alta: palabras como urgente, hoy, acoso, matrícula vencida, bloqueo, suspensión, no puedo pagar
- Media: problemas que afectan el proceso académico pero tienen margen de tiempo
- Baja: consultas generales, solicitudes de información, sugerencias`;

  const completion = await client.chat.completions.create({
    model: "openrouter/auto",
    messages: [{ role: "user", content: prompt }],
  });

  const respuesta = completion.choices[0].message.content.trim();
  const limpio = respuesta.replace(/```json|```/g, "").trim();
  return JSON.parse(limpio);
}

module.exports = { clasificarPQR };
