import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches all bookmarks matching the filter without being truncated
 * by Supabase PostgREST's default 1000 max_rows cap.
 * Ensures the user's library has NO 1000-item limit.
 */
export async function fetchAllUserBookmarks<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  selectQuery: string,
  options?: {
    orderBy?: string
    ascending?: boolean
    pageSize?: number
    maxTotal?: number
  }
): Promise<T[]> {
  const pageSize = options?.pageSize || 1000
  const orderBy = options?.orderBy || 'created_at'
  const ascending = options?.ascending ?? false
  const maxTotal = options?.maxTotal || 200000

  // 1. Fetch first chunk along with total count
  const { data: firstChunk, count, error: firstError } = await supabase
    .from('bookmarks')
    .select(selectQuery, { count: 'exact' })
    .eq('user_id', userId)
    .order(orderBy, { ascending })
    .range(0, pageSize - 1)

  if (firstError) {
    console.error(`[fetchAllUserBookmarks] First chunk query error:`, firstError)
    return []
  }

  const allRows: T[] = (firstChunk as unknown as T[]) || []

  // If no more items or count not available, return first chunk
  const totalCount = Math.min(count || allRows.length, maxTotal)
  if (totalCount <= pageSize || allRows.length < pageSize) {
    return allRows
  }

  // 2. Prepare remaining ranges for parallel fetching
  const chunkPromises: Promise<T[]>[] = []
  for (let from = pageSize; from < totalCount; from += pageSize) {
    const to = Math.min(from + pageSize - 1, totalCount - 1)
    const chunkPromise = (async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(selectQuery)
        .eq('user_id', userId)
        .order(orderBy, { ascending })
        .range(from, to)

      if (error) {
        console.error(`[fetchAllUserBookmarks] Error fetching range [${from}, ${to}]:`, error)
        return [] as T[]
      }
      return (data as unknown as T[]) || []
    })()

    chunkPromises.push(chunkPromise)
  }

  // 3. Execute all remaining chunk queries in parallel
  const remainingChunks = await Promise.all(chunkPromises)
  for (const chunk of remainingChunks) {
    allRows.push(...chunk)
  }

  return allRows
}
