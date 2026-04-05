import { useMemo } from 'react';

/**
 * Memoized student list filtering — avoids recomputing when unrelated deps change.
 * @param {string} [academicYear] — matches row.Academic_Year when set
 * @param {string} [status] — Active / Inactive when set
 */
export function useFilteredList(items, query, classId, section, academicYear, status) {
  return useMemo(() => {
    if (!items?.length) return [];
    const q = (query || '').toLowerCase();
    return items.filter((row) => {
      let ok = true;
      if (q) {
        const name = String(row.Name || '').toLowerCase();
        const id = String(row.Student_ID || '').toLowerCase();
        ok = name.includes(q) || id.includes(q);
      }
      if (ok && classId && String(row.Class) !== String(classId)) ok = false;
      if (ok && section && row.Section !== section) ok = false;
      if (ok && academicYear && String(row.Academic_Year || '') !== String(academicYear)) ok = false;
      if (ok && status && row.Status !== status) ok = false;
      return ok;
    });
  }, [items, query, classId, section, academicYear, status]);
}
