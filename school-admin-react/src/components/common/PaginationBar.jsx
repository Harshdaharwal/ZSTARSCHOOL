/** @param {{ page: number; pageSize: number; total: number; onPageChange: (p: number) => void }} props */
export function PaginationBar({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (p - 1) * pageSize + 1;
  const to = Math.min(p * pageSize, total);

  return (
    <div
      className="pagination-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        color: 'var(--text-muted)',
        fontWeight: 600,
        fontSize: '0.85rem',
      }}
    >
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={p <= 1}
          onClick={() => onPageChange(p - 1)}
        >
          Previous
        </button>
        <span>
          Page {p} / {pages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={p >= pages}
          onClick={() => onPageChange(p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
