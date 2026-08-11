// lib/matcher.ts
import { ParsedRow } from './csvParser';

export interface StudentLite { id: string; full_name: string; }
export interface MatchedRow {
  student_id: string;
  student_name: string;
  row_name: string;
  score: number;
}

/** Kirill → Lotin + apostroflarni tozalash + pastki registr */
const CYR: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'j', з:'z', и:'i', й:'y',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sh', ъ:'', ы:'i', ь:'', э:'e', ю:'yu', я:'ya',
  ғ:'g', қ:'q', ҳ:'h', ӯ:'u', ҷ:'j', ӣ:'i',
};

export function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .split('')
    .map(ch => (CYR[ch] !== undefined ? CYR[ch] : ch))
    .join('')
    .replace(/[''`´]/g, '')          // o', g' apostroflari
    .replace(/[^a-z0-9]/g, '');      // faqat harf+raqam
}

/** Levenshtein asosida o'xshashlik (0..1) */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  if (a.length < b.length) [a, b] = [b, a];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const cur = [i + 1];
    for (let j = 0; j < b.length; j++) {
      cur.push(Math.min(prev[j] + (a[i] !== b[j] ? 1 : 0), cur[j] + 1, prev[j + 1] + 1));
    }
    prev = cur;
  }
  const dist = prev[b.length];
  return 1 - dist / Math.max(a.length, b.length);
}

/** CSV qatorlarini DB'dagi o'quvchilarga moslaydi */
export function matchRows(rows: ParsedRow[], students: StudentLite[]) {
  const matched: MatchedRow[] = [];
  const unmatched: ParsedRow[] = [];
  const errors: ParsedRow[] = [];
  const used = new Set<string>();

  for (const r of rows) {
    if (r.error || r.score === null) { errors.push(r); continue; }

    const rn = normalizeName(r.name);

    // 1) To'liq moslik
    let st = students.find(s => !used.has(s.id) && normalizeName(s.full_name) === rn);

    // 2) Fuzzy (>= 0.8)
    if (!st) {
      let best = 0;
      let bestS: StudentLite | undefined;
      for (const s of students) {
        if (used.has(s.id)) continue;
        const sim = similarity(rn, normalizeName(s.full_name));
        if (sim > best) { best = sim; bestS = s; }
      }
      if (bestS && best >= 0.8) st = bestS;
    }

    if (st) {
      used.add(st.id);
      matched.push({ student_id: st.id, student_name: st.full_name, row_name: r.name, score: r.score! });
    } else {
      unmatched.push(r);
    }
  }

  const avg = matched.length
    ? Math.round(matched.reduce((s, m) => s + m.score, 0) / matched.length)
    : 0;

  return { matched, unmatched, errors, avg };
           }
