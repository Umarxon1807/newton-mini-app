// lib/importResults.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { MatchedRow } from './matcher';

export type Subject = 'matematika' | 'ingliz';

/** Teacher panel: preview tasdiqlangach, ballarni xavfsiz saqlaydi */
export async function saveResults(
  supabase: SupabaseClient,
  testId: string,
  subject: Subject,
  matched: MatchedRow[]
) {
  const { data, error } = await supabase.rpc('import_results', {
    p_test_id: testId,
    p_subject: subject,
    p_rows: matched.map(m => ({ student_id: m.student_id, score: m.score })),
  });

  if (error) throw new Error(error.message);
  return data as { ok: boolean; saved: number };
}
