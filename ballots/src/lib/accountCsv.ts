import type { Role } from '../types.ts';

export interface CsvParseResult {
  issues: { line: number; reason: string }[];
  rows: { email: string; name: string; role?: Role; line: number }[];
}

function isRole(value: string): value is Role {
  return value === 'admin' || value === 'student' || value === 'parent';
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseRole(value: string | undefined): Role | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return isRole(normalized) ? normalized : undefined;
}

/** Align name/email when a row clearly has them swapped. */
function resolveNameAndEmail(
  rawName: string,
  rawEmail: string,
): { name: string; email: string } | { reason: string } {
  const name = rawName.trim();
  const email = rawEmail.trim();
  if (!name || !email) {
    return { reason: 'Each row needs a name and an email' };
  }

  const nameIsEmail = looksLikeEmail(name);
  const emailIsEmail = looksLikeEmail(email);

  if (nameIsEmail && !emailIsEmail) {
    return { name: email, email: name };
  }
  if (!emailIsEmail) {
    return { reason: `"${email}" is not a valid email` };
  }
  return { name, email };
}

/** Parse a CSV of name,email[,role]. A header row is optional. */
export function parseAccountCsv(text: string, defaultRole: Role): CsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows: CsvParseResult['rows'] = [];
  const issues: CsvParseResult['issues'] = [];
  if (lines.length === 0) return { rows, issues };

  let start = 0;
  const first = splitCsvLine(lines[0] ?? '');
  const headerLooksLikeLabels =
    first.some((cell) => /^name$/i.test(cell)) && first.some((cell) => /^e-?mail$/i.test(cell));
  let nameIdx = 0;
  let emailIdx = 1;
  let roleIdx = first.length >= 3 ? 2 : -1;

  if (headerLooksLikeLabels) {
    nameIdx = first.findIndex((cell) => /^name$/i.test(cell));
    emailIdx = first.findIndex((cell) => /^e-?mail$/i.test(cell));
    roleIdx = first.findIndex((cell) => /^role$/i.test(cell));
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cells = splitCsvLine(lines[i] ?? '');
    const rawName = cells[nameIdx] ?? '';
    const rawEmail = cells[emailIdx] ?? '';
    const roleCell = roleIdx >= 0 ? cells[roleIdx] : undefined;

    if (!rawName && !rawEmail) continue;

    const resolved = resolveNameAndEmail(rawName, rawEmail);
    if ('reason' in resolved) {
      issues.push({ line: lineNumber, reason: resolved.reason });
      continue;
    }

    let role: Role = defaultRole;
    if (roleCell) {
      const parsed = parseRole(roleCell);
      if (!parsed) {
        issues.push({
          line: lineNumber,
          reason: `Unknown role "${roleCell}" (use student, parent, or admin)`,
        });
        continue;
      }
      role = parsed;
    }

    rows.push({
      name: resolved.name,
      email: resolved.email,
      role,
      line: lineNumber,
    });
  }

  return { rows, issues };
}
