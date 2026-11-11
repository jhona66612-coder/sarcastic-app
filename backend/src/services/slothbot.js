const { HttpError } = require('../utils/helpers');

const FALLBACKS = [
  'Wow, otra tarea pendiente. Qué sorpresa. Empieza por la más pequeña y avanza.',
  'Puedo moverme más rápido que tú con esa lista... y soy un perezoso. Elige una tarea y hazla.',
  'Respira, abre tu lista y completa una sola cosa. Después hablamos.',
];

// Responde como SlothBot. Si no hay ANTHROPIC_API_KEY, responde en "modo sin IA".
async function askSlothBot(message, sarcasmLevel, tasks) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const line = FALLBACKS[message.length % FALLBACKS.length];
    return `[SlothBot, modo sin IA, sarcasmo ${sarcasmLevel}/10] ${line}`;
  }

  const system =
    'Eres SlothBot, un asistente de productividad con forma de perezoso. ' +
    `Nivel de sarcasmo: ${sarcasmLevel} de 10 (0 = amable, 10 = muy sarcástico pero nunca ofensivo). ` +
    'Responde en español, en máximo 4 oraciones, y ayuda de verdad con la productividad. ' +
    `Tareas abiertas del usuario: ${JSON.stringify(tasks)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'claude-sonnet-5-5',
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) {
    console.error('Error del servicio de IA:', await response.text());
    throw new HttpError(502, 'El servicio de IA no respondió correctamente');
  }
  const data = await response.json();
  return data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

module.exports = { askSlothBot };
