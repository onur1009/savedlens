import 'server-only'

/**
 * Generates a 1536-dimensional vector embedding using OpenAI text-embedding-3-small.
 * Used for semantic search and RAG knowledge retrieval in SavedLens.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const isRealApiKey = apiKey && !apiKey.includes('your-openai') && apiKey.startsWith('sk-')

  if (!isRealApiKey || !text || !text.trim()) {
    return null
  }

  // Clean and truncate text if overly long (limit ~8000 tokens)
  const cleanInput = text.slice(0, 8000).replace(/\s+/g, ' ').trim()

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: cleanInput,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn('[Embedding API] Request failed:', errText)
      return null
    }

    const data = await res.json()
    const embedding = data.data?.[0]?.embedding

    if (Array.isArray(embedding) && embedding.length === 1536) {
      return embedding
    }

    return null
  } catch (err) {
    console.warn('[Embedding API] Error:', err instanceof Error ? err.message : String(err))
    return null
  }
}
