// lib/csvParser.ts
export interface ParsedRow {
  line: number;
  id?: string;
  name: string;
  score: number | null;
  error?: string;
}

const NAME_KEYS  = ['ism', 'name', 'fio', 'f.i.o', 'student', "o'quvchi", 'full name', 'имя', 'фамилия'];
const ID_KEYS    = ['id', 'student id', 'kod', '№', 'no', 'studentid'];
const SCORE_KEYS = ['score', 'ball', '%', 'percent', 'foiz', 'natija', 'result', 'total', 'jami', 'балл', 'процент'];

/** CSV qatorini qo'shtirnoqlarni hisobga olib bo'ladi */
function splitCsvLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { res.push(cur); cur = ''; continue; }
    cur += ch;
  }
  res.push(cur);
  return res.map(s => s.trim());
}

/** ZipGrade CSV matnini qatorlarga ajratadi va ustunlarni aniqlaydi */
export function parseZipgradeCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());

  let nameIdx  = header.findIndex(h => NAME_KEYS.some(k => h.includes(k)));
  let idIdx    = header.findIndex(h => ID_KEYS.some(k => h.includes(k)));
  let scoreIdx = header.findIndex(h => SCORE_KEYS.some(k => h.includes(k)));

  // Fallback: sarlavha topilmasa — ism 2-ustun, ball oxirgi ustun
  if (nameIdx < 0)  nameIdx  = 1;
  if (scoreIdx < 0) scoreIdx = header.length - 1;

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i]);
    const name = (c[nameIdx] || '').trim();

    if (!name) {
      rows.push({ line: i + 1, name: '', score: null, error: 'Ism bo\'sh qator' });
      continue;
    }

    const raw = (c[scoreIdx] || '').replace('%', '').replace(',', '.').trim();
    const num = raw === '' ? NaN : Number(raw);

    rows.push({
      line: i + 1,
      id: idIdx >= 0 ? (c[idIdx] || '').trim() : undefined,
      name,
      score: !isNaN(num) ? Math.min(100, Math.max(0, Math.round(num))) : null,
      error: isNaN(num) ? `Noto'g'ri ball: "${c[scoreIdx] || ''}"` : undefined,
    });
  }
  return rows;
}
