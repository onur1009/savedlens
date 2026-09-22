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

  const allRows: T[] = []
  let from = 0

  while (allRows.length < maxTotal) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('bookmarks')
      .select(selectQuery)
      .eq('user_id', userId)
      .order(orderBy, { ascending })
      .range(from, to)

    if (error) {
      console.error(`[fetchAllUserBookmarks] Query error at range [${from}, ${to}]:`, error)
      break
    }

    if (!data || data.length === 0) {
      break
    }

    allRows.push(...(data as unknown as T[]))

    if (data.length < pageSize) {
      break
    }

    from += pageSize
  }

  return allRows
}
