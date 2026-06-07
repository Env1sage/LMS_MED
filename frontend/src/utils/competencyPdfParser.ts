import * as pdfjsLib from 'pdfjs-dist';
import type { PageCompetencyEntry } from '../services/learning-unit.service';

export type { PageCompetencyEntry };

// Matches page ranges like "1-6", "98–101", or single pages like "42"
const PAGE_RANGE_RE = /^(\d{1,4})\s*[-–]\s*(\d{1,4})$|^(\d{1,4})$/;

function parsePageRange(raw: string): { pageStart: number; pageEnd: number } | null {
  const m = raw.trim().match(/^(\d{1,4})\s*[-–]\s*(\d{1,4})$|^(\d{1,4})$/);
  if (!m) return null;
  if (m[1] && m[2]) return { pageStart: parseInt(m[1], 10), pageEnd: parseInt(m[2], 10) };
  if (m[3]) { const n = parseInt(m[3], 10); return { pageStart: n, pageEnd: n }; }
  return null;
}

export async function parseMciCompetencyPdf(file: File): Promise<PageCompetencyEntry[]> {
  const arrayBuffer = await file.arrayBuffer();

  // Reuse the worker that EpubReaderAnnotated already sets up; fall back if not set
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }

  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const results: PageCompetencyEntry[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items by approximate Y position to reconstruct table rows
    const items = textContent.items as Array<{ str: string; transform: number[] }>;

    // Sort by descending Y (top to bottom), then ascending X (left to right)
    const sorted = [...items]
      .filter(i => i.str.trim())
      .sort((a, b) => {
        const dy = b.transform[5] - a.transform[5];
        if (Math.abs(dy) > 3) return dy;
        return a.transform[4] - b.transform[4];
      });

    // Cluster items into rows by Y position (±4 pts tolerance)
    const rows: Array<Array<{ str: string; x: number; y: number }>> = [];
    for (const item of sorted) {
      const y = item.transform[5];
      const x = item.transform[4];
      const existing = rows.find(r => Math.abs(r[0].y - y) <= 4);
      if (existing) existing.push({ str: item.str, x, y });
      else rows.push([{ str: item.str, x, y }]);
    }

    // Sort each row by X (left to right)
    for (const row of rows) row.sort((a, b) => a.x - b.x);

    // Find the min X of items that contain a page-range-like token — that's the "Pages" column
    // Find the min X of items that contain a competency code — that's the "Code" column
    // The description is everything after the code in that row (or next cols)
    let pageColMaxX = Infinity;
    for (const row of rows) {
      if (PAGE_RANGE_RE.test(row[0]?.str?.trim())) {
        pageColMaxX = Math.min(pageColMaxX, row[0].x + 80);
      }
    }
    if (pageColMaxX === Infinity) pageColMaxX = 100; // fallback

    for (const row of rows) {
      const rowText = row.map(i => i.str.trim()).join(' ');

      // Look for a competency code anywhere in the row
      const codeMatch = rowText.match(/([A-Z]{2,5}\d+\.\d+)/);
      if (!codeMatch) continue;

      const competencyCode = codeMatch[1];

      // Page range: leftmost column (smallest X) that looks like a page range
      const pageItem = row.find(i => PAGE_RANGE_RE.test(i.str.trim()));
      if (!pageItem) continue;

      const pages = parsePageRange(pageItem.str.trim());
      if (!pages) continue;

      // Description: everything after the code in the row text
      const codeIdx = rowText.indexOf(competencyCode);
      const rawDesc = rowText.slice(codeIdx + competencyCode.length).trim();
      // Strip trailing domain/level/method columns — description ends at first occurrence of
      // patterns like " K " " KH " " S " " SH " " P " or Roman numerals or vertical-bar tokens
      const descClean = rawDesc.replace(/\s+(K|KH|SH?|P|PA?H?|Recall|Reason)\s*$/, '').trim();

      results.push({
        competencyCode,
        competencyDescription: descClean,
        pageStart: pages.pageStart,
        pageEnd: pages.pageEnd,
      });
    }
  }

  // Deduplicate: same code + pageStart + pageEnd
  const seen = new Set<string>();
  return results.filter(e => {
    const key = `${e.competencyCode}|${e.pageStart}|${e.pageEnd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
