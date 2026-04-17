import { useCallback, useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { ADMIN_CLASS_FEE_TYPE } from '../services/parentNotifications.js';
import { esc } from '../utils/format.js';

const FEE_LABEL_OPTIONS = [
  ADMIN_CLASS_FEE_TYPE,
  'Annual tuition',
  'Term fee',
  'Development fee',
  'Composite annual fee',
  'Other',
];

const emptyRow = () => ({
  amount: '',
  feeType: ADMIN_CLASS_FEE_TYPE,
  note: '',
});

function isPresetFeeLabel(label) {
  if (!label) return false;
  return FEE_LABEL_OPTIONS.includes(label) && label !== 'Other';
}

export default function ClassFeeSettingsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const load = useCallback(() => api.getClassFeeSettings(), [api]);
  const { data: rows, loading, refresh } = useAsyncResource(load);

  const serverMap = useMemo(() => {
    const d = {};
    for (const r of rows || []) {
      d[r.Class] = {
        amount: r.Amount === '' || r.Amount == null ? '' : String(r.Amount),
        feeType: r.Fee_Type || ADMIN_CLASS_FEE_TYPE,
        note: r.Note || '',
      };
    }
    return d;
  }, [rows]);

  const [patch, setPatch] = useState({});

  const merged = useMemo(() => {
    const out = {};
    for (const cls of Object.keys(serverMap)) {
      out[cls] = { ...emptyRow(), ...serverMap[cls], ...(patch[cls] || {}) };
    }
    return out;
  }, [serverMap, patch]);

  const updateField = useCallback((cls, field, value) => {
    setPatch((p) => ({
      ...p,
      [cls]: { ...(serverMap[cls] || emptyRow()), ...(p[cls] || {}), [field]: value },
    }));
  }, [serverMap]);

  const saveRow = useCallback(
    async (cls) => {
      const row = merged[cls];
      if (!row) return;
      const res = await api.saveClassFeeSetting({
        cls,
        amount: row.amount,
        feeType: row.feeType,
        note: row.note,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setPatch((p) => {
          const n = { ...p };
          delete n[cls];
          return n;
        });
        refresh();
      }
    },
    [api, merged, refresh, showToast]
  );

  if (loading && !rows) return <Spinner />;

  return (
    <>
      <SectionHeader title="Class fee structure" />
      <Card>
        <CardTitle>Set fee by class</CardTitle>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Set the standard fee amount for each class (e.g. ₹50,000 for Class 10). Saving updates the master amount and
          syncs a matching <strong>pending</strong> fee row for every active student in that class (same fee label).
          Weekly and monthly WhatsApp-style digests use these amounts when reminding parents.
        </p>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Amount (₹)</th>
                <th>Fee label</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => {
                const cls = r.Class;
                const row = merged[cls] || emptyRow();
                return (
                  <tr key={cls}>
                    <td>
                      <strong>Class {esc(cls)}</strong>
                      {r.Updated_At ? (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Last saved: {new Date(r.Updated_At).toLocaleString('en-IN')}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        style={{ width: 120, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                        value={row.amount}
                        onChange={(e) => updateField(cls, 'amount', e.target.value)}
                        placeholder="e.g. 50000"
                      />
                    </td>
                    <td>
                      {(() => {
                        const selectValue = isPresetFeeLabel(row.feeType) ? row.feeType : 'Other';
                        return (
                          <>
                      <select
                        value={selectValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'Other') {
                            updateField(cls, 'feeType', isPresetFeeLabel(row.feeType) ? '' : row.feeType);
                          } else {
                            updateField(cls, 'feeType', value);
                          }
                        }}
                      >
                        {FEE_LABEL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {selectValue === 'Other' && (
                        <input
                          type="text"
                          style={{ marginTop: 8, minWidth: 140, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                          value={row.feeType}
                          onChange={(e) => updateField(cls, 'feeType', e.target.value)}
                          placeholder="Enter custom fee label"
                        />
                      )}
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      <input
                        type="text"
                        style={{ minWidth: 140, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)' }}
                        value={row.note}
                        onChange={(e) => updateField(cls, 'note', e.target.value)}
                        placeholder="Optional"
                      />
                    </td>
                    <td>
                      <Button type="button" size="sm" onClick={() => saveRow(cls)}>
                        Save &amp; sync students
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(rows || []).length === 0 ? (
          <p className="empty" style={{ padding: 20 }}>
            No classes found. Add classes under Classes first.
          </p>
        ) : null}
      </Card>
    </>
  );
}
