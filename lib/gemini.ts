const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
];

export async function callGemini(apiKey: string, prompt: string): Promise<string> {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });
    } catch (networkErr) {
      const msg = `Error de red al llamar a Gemini (${model}): ${String(networkErr)}`;
      console.error('[Gemini]', msg);
      throw new Error(msg);
    }

    const raw = await res.json();

    if (!res.ok) {
      const apiMsg = raw?.error?.message || JSON.stringify(raw);
      const status = raw?.error?.status || `HTTP ${res.status}`;
      console.error(`[Gemini] ${model} → ${status}: ${apiMsg}`);
      if (res.status === 429 || res.status === 503 || res.status === 404) continue;
      if (res.status === 400) throw new Error(`Gemini: solicitud inválida (400). ${apiMsg}`);
      if (res.status === 401 || res.status === 403) throw new Error(`Gemini: error de autenticación (${res.status}). API Key inválida o sin permisos. ${apiMsg}`);
      throw new Error(`Gemini ${model} error ${res.status} (${status}): ${apiMsg}`);
    }

    const text: string | undefined = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini respondió sin contenido. Intenta de nuevo.');
    console.info(`[Gemini] Respuesta de ${model} recibida correctamente.`);
    return text;
  }

  throw new Error('Todos los modelos de Gemini disponibles están sin cuota o no responden. Verifica tu plan en https://ai.google.dev');
}
