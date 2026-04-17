import { useState, useCallback, useRef } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { useAuth } from '../hooks/useAuth.js';

/* ── Default config ─────────────────────────────────────────────────── */
const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DEFAULT_SLOTS = [
  '09:00', '09:40', '10:20', '11:00 (Break)',
  '11:15', '11:55', '12:35', '13:15 (Lunch)',
  '14:00', '14:40', '15:20',
];

const FIELD_TYPES = [
  { value: 'text',   label: 'Text Input' },
  { value: 'select', label: 'Dropdown' },
];

const DEFAULT_FIELDS = [
  { id: 'subject', label: 'Subject', type: 'text',   required: true,  options: '' },
  { id: 'teacher', label: 'Teacher', type: 'text',   required: false, options: '' },
  { id: 'room',    label: 'Room',    type: 'text',   required: false, options: '' },
];

/* ── Utility ────────────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function isBreak(slot) {
  return slot.toLowerCase().includes('break') || slot.toLowerCase().includes('lunch');
}

function buildEmptyGrid(days, slots) {
  const g = {};
  slots.forEach((slot) => {
    g[slot] = {};
    days.forEach((day) => {
      g[slot][day] = {};
    });
  });
  return g;
}

/* ── Cell display component ─────────────────────────────────────────── */
function CellContent({ data, fields }) {
  if (!data || Object.keys(data).filter(k => data[k]).length === 0) {
    return <span className="tt-cell-empty">—</span>;
  }
  return (
    <div className="tt-cell-filled">
      {fields.map((f) =>
        data[f.id] ? (
          <span key={f.id} className={`tt-cell-part tt-part-${f.id}`}>
            {data[f.id]}
          </span>
        ) : null
      )}
    </div>
  );
}

/* ── Cell Edit Modal ────────────────────────────────────────────────── */
function CellEditModal({ open, onClose, onSave, fields, initialData, slot, day }) {
  const [form, setForm] = useState(initialData || {});

  const handleChange = (fid, val) => setForm((prev) => ({ ...prev, [fid]: val }));
  const handleClear = () => setForm({});

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-bg open" onClick={onClose}>
      <div className="modal tt-cell-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3 className="tt-modal-title">
          <span className="tt-modal-day">{day}</span>
          <span className="tt-modal-sep">·</span>
          <span className="tt-modal-slot">{slot}</span>
        </h3>

        <div className="tt-cell-form">
          {fields.map((f) => (
            <div key={f.id} className="form-group">
              <label>{f.label}{f.required && ' *'}</label>
              {f.type === 'select' && f.options ? (
                <select
                  value={form[f.id] || ''}
                  onChange={(e) => handleChange(f.id, e.target.value)}
                >
                  <option value="">— Select —</option>
                  {f.options.split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form[f.id] || ''}
                  placeholder={`Enter ${f.label.toLowerCase()}...`}
                  onChange={(e) => handleChange(f.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="btn-row" style={{ marginTop: 20 }}>
          <Button onClick={handleSave}>Save Cell</Button>
          <Button variant="ghost" onClick={handleClear}>Clear</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Field Manager Panel ────────────────────────────────────────────── */
function FieldManager({ fields, onChange }) {
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false, options: '' });
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState(null);

  const addField = () => {
    if (!newField.label.trim()) return;
    onChange([
      ...fields,
      { id: uid(), label: newField.label.trim(), type: newField.type, required: newField.required, options: newField.options },
    ]);
    setNewField({ label: '', type: 'text', required: false, options: '' });
  };

  const removeField = (id) => onChange(fields.filter((f) => f.id !== id));

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditVal({ ...fields[idx] });
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    const updated = [...fields];
    updated[editIdx] = editVal;
    onChange(updated);
    setEditIdx(null);
    setEditVal(null);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...fields];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
  };

  const moveDown = (idx) => {
    if (idx === fields.length - 1) return;
    const arr = [...fields];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    onChange(arr);
  };

  return (
    <div className="tt-field-manager">
      <div className="tt-fm-header">
        <h4>📋 Timetable Fields</h4>
        <p className="tt-fm-desc">Define what information appears in each timetable cell.</p>
      </div>

      {/* Field list */}
      <div className="tt-field-list">
        {fields.map((f, idx) => (
          <div key={f.id} className="tt-field-item">
            {editIdx === idx ? (
              <div className="tt-field-edit-row">
                <input
                  className="tt-inline-input"
                  value={editVal.label}
                  onChange={(e) => setEditVal({ ...editVal, label: e.target.value })}
                  placeholder="Field label"
                />
                <select
                  className="tt-inline-select"
                  value={editVal.type}
                  onChange={(e) => setEditVal({ ...editVal, type: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {editVal.type === 'select' && (
                  <input
                    className="tt-inline-input"
                    value={editVal.options}
                    onChange={(e) => setEditVal({ ...editVal, options: e.target.value })}
                    placeholder="Option1, Option2, ..."
                    style={{ flex: 2 }}
                  />
                )}
                <label className="tt-inline-check">
                  <input type="checkbox" checked={editVal.required}
                    onChange={(e) => setEditVal({ ...editVal, required: e.target.checked })} />
                  Required
                </label>
                <button className="tt-chip-btn tt-save-btn" onClick={saveEdit}>✓ Save</button>
                <button className="tt-chip-btn tt-cancel-btn" onClick={() => setEditIdx(null)}>✕</button>
              </div>
            ) : (
              <div className="tt-field-display">
                <div className="tt-field-info">
                  <span className="tt-field-badge">{f.type === 'select' ? '☰' : 'T'}</span>
                  <span className="tt-field-label">{f.label}</span>
                  {f.required && <span className="tt-field-req">Required</span>}
                  {f.type === 'select' && f.options && (
                    <span className="tt-field-opts">Options: {f.options}</span>
                  )}
                </div>
                <div className="tt-field-actions">
                  <button className="tt-icon-btn" title="Move up" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                  <button className="tt-icon-btn" title="Move down" onClick={() => moveDown(idx)} disabled={idx === fields.length - 1}>↓</button>
                  <button className="tt-chip-btn tt-edit-btn" onClick={() => startEdit(idx)}>Edit</button>
                  <button className="tt-chip-btn tt-del-btn" onClick={() => removeField(f.id)}>Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <div className="tt-no-fields">No fields defined. Add fields below.</div>
        )}
      </div>

      {/* Add new field */}
      <div className="tt-add-field">
        <h5>➕ Add New Field</h5>
        <div className="tt-add-row">
          <input
            className="tt-inline-input"
            placeholder="Field label (e.g. Subject)"
            value={newField.label}
            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addField()}
          />
          <select
            className="tt-inline-select"
            value={newField.type}
            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {newField.type === 'select' && (
            <input
              className="tt-inline-input"
              placeholder="Option1, Option2, ..."
              value={newField.options}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })}
              style={{ flex: 2 }}
            />
          )}
          <label className="tt-inline-check">
            <input type="checkbox" checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })} />
            Required
          </label>
          <Button size="sm" onClick={addField}>Add Field</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Timetable Settings Panel ────────────────────────────────────────── */
function TimetableSettings({ days, slots, onChange }) {
  const [newDay, setNewDay] = useState('');
  const [newSlot, setNewSlot] = useState('');

  const addDay = () => {
    if (!newDay.trim() || days.includes(newDay.trim())) return;
    onChange({ days: [...days, newDay.trim()], slots });
    setNewDay('');
  };

  const removeDay = (d) => onChange({ days: days.filter((x) => x !== d), slots });

  const addSlot = () => {
    if (!newSlot.trim() || slots.includes(newSlot.trim())) return;
    onChange({ days, slots: [...slots, newSlot.trim()] });
    setNewSlot('');
  };

  const removeSlot = (s) => onChange({ days, slots: slots.filter((x) => x !== s) });

  return (
    <div className="tt-settings-grid">
      {/* Days */}
      <div className="tt-settings-col">
        <h5>📅 Days of Week</h5>
        <div className="tt-tag-list">
          {days.map((d) => (
            <span key={d} className="tt-tag">
              {d}
              <button className="tt-tag-rm" onClick={() => removeDay(d)} title="Remove">✕</button>
            </span>
          ))}
        </div>
        <div className="tt-add-tag-row">
          <input
            className="tt-inline-input"
            placeholder="e.g. Saturday"
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDay()}
          />
          <Button size="sm" onClick={addDay}>Add</Button>
        </div>
      </div>

      {/* Time slots */}
      <div className="tt-settings-col">
        <h5>🕐 Time Slots</h5>
        <div className="tt-tag-list">
          {slots.map((s) => (
            <span key={s} className={`tt-tag ${isBreak(s) ? 'tt-tag-break' : ''}`}>
              {s}
              <button className="tt-tag-rm" onClick={() => removeSlot(s)} title="Remove">✕</button>
            </span>
          ))}
        </div>
        <div className="tt-add-tag-row">
          <input
            className="tt-inline-input"
            placeholder='e.g. 09:00 or 11:00 (Break)'
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSlot()}
          />
          <Button size="sm" onClick={addSlot}>Add</Button>
        </div>
        <p className="tt-hint">Add "(Break)" or "(Lunch)" to the slot name to mark it as a break row.</p>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function TimetableBuilderPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeSec, setActiveSec] = useState('builder'); // 'builder' | 'fields' | 'settings'

  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);

  const [grid, setGrid] = useState(() => buildEmptyGrid(DEFAULT_DAYS, DEFAULT_SLOTS));
  const [cellModal, setCellModal] = useState(null); // { slot, day }
  const [ttTitle, setTtTitle] = useState('Class Timetable');
  const [ttClass, setTtClass] = useState('Class 1 · Section A');

  const printRef = useRef(null);

  /* Sync grid when days/slots change */
  const handleStructureChange = useCallback(({ days: d, slots: s }) => {
    setDays(d);
    setSlots(s);
    setGrid((prev) => {
      const fresh = buildEmptyGrid(d, s);
      // Transfer existing data
      s.forEach((slot) => {
        d.forEach((day) => {
          fresh[slot][day] = prev[slot]?.[day] || {};
        });
      });
      return fresh;
    });
  }, []);

  const openCell = useCallback((slot, day) => {
    if (!isAdmin) return;
    if (isBreak(slot)) return;
    setCellModal({ slot, day });
  }, [isAdmin]);

  const saveCell = useCallback((data) => {
    if (!cellModal) return;
    const { slot, day } = cellModal;
    setGrid((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], [day]: data },
    }));
  }, [cellModal]);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <title>${ttTitle}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: Inter, sans-serif; }
            body { background: #fff; }
            h1 { text-align: center; font-size: 1.4rem; margin: 16px 0 4px; }
            .sub { text-align: center; font-size: 0.9rem; color: #64748b; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
            th, td { border: 1px solid #c7d2fe; padding: 8px 10px; text-align: center; vertical-align: middle; }
            thead th { background: #4f46e5; color: #fff; font-weight: 700; }
            .tt-time { background: #eef2ff; font-weight: 700; color: #3730a3; white-space: nowrap; }
            .break-row td { background: #e0e7ff; color: #3730a3; font-weight: 700; font-style: italic; }
            .cell-inner { display: flex; flex-direction: column; gap: 2px; }
            .part { font-size: 0.75rem; }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.print();
  };

  const clearAll = () => {
    if (window.confirm('Clear all timetable data?')) {
      setGrid(buildEmptyGrid(days, slots));
    }
  };

  const sections = [
    { id: 'builder',  label: '🗓 Timetable Grid' },
    ...(isAdmin ? [
      { id: 'fields',   label: '📋 Manage Fields' },
      { id: 'settings', label: '⚙ Structure' },
    ] : []),
  ];

  return (
    <>
      <SectionHeader title="Timetable Builder" />
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 600 }}>
        Visually build school timetables. {isAdmin ? 'Click any cell to add or edit a class.' : 'View the current timetable.'}
      </p>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 24 }}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={`filter-tab ${activeSec === s.id ? 'active' : ''}`}
            onClick={() => setActiveSec(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── TIMETABLE GRID ─────────────────────────────────────────────── */}
      {activeSec === 'builder' && (
        <Card noPadding>
          {/* Header meta */}
          <div className="tt-meta-bar">
            <div className="tt-meta-left">
              {isAdmin ? (
                <>
                  <input
                    className="tt-title-input"
                    value={ttTitle}
                    onChange={(e) => setTtTitle(e.target.value)}
                    placeholder="Timetable title"
                  />
                  <input
                    className="tt-sub-input"
                    value={ttClass}
                    onChange={(e) => setTtClass(e.target.value)}
                    placeholder="Class / Section"
                  />
                </>
              ) : (
                <>
                  <h2 className="tt-title-display">{ttTitle}</h2>
                  <span className="tt-sub-display">{ttClass}</span>
                </>
              )}
            </div>
            <div className="btn-row" style={{ margin: 0 }}>
              <Button size="sm" variant="ghost" onClick={handlePrint}>🖨 Print</Button>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={clearAll}>🗑 Clear All</Button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="tt-grid-wrap" ref={printRef}>
            <h1 style={{ display: 'none' }}>{ttTitle}</h1>
            <p className="sub" style={{ display: 'none' }}>{ttClass}</p>

            <div className="tt-table-outer">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th className="tt-th-time">Time</th>
                    {days.map((d) => (
                      <th key={d} className="tt-th-day">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => {
                    const brk = isBreak(slot);
                    return (
                      <tr key={slot} className={brk ? 'tt-break-row' : 'tt-period-row'}>
                        <td className="tt-time-cell">{slot}</td>
                        {days.map((day) => (
                          brk ? (
                            <td key={day} className="tt-break-cell">
                              {slot.replace(/\(.*\)/, '').trim()}
                            </td>
                          ) : (
                            <td
                              key={day}
                              className={`tt-data-cell ${isAdmin ? 'tt-editable' : ''}`}
                              onClick={() => openCell(slot, day)}
                              title={isAdmin ? 'Click to edit' : undefined}
                            >
                              <CellContent
                                data={grid[slot]?.[day]}
                                fields={fields}
                              />
                            </td>
                          )
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          {fields.length > 0 && (
            <div className="tt-legend">
              <span className="tt-legend-label">Fields shown in cells:</span>
              {fields.map((f) => (
                <span key={f.id} className="tt-legend-chip">
                  <span className={`tt-legend-dot tt-dot-${f.id}`} />
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── FIELDS MANAGER ─────────────────────────────────────────────── */}
      {activeSec === 'fields' && isAdmin && (
        <Card>
          <CardTitle>Manage Timetable Cell Fields</CardTitle>
          <p className="tt-section-desc">
            These fields appear inside each timetable cell. Add, edit, reorder, or remove fields to match your school's needs.
          </p>
          <FieldManager fields={fields} onChange={setFields} />
        </Card>
      )}

      {/* ── STRUCTURE SETTINGS ─────────────────────────────────────────── */}
      {activeSec === 'settings' && isAdmin && (
        <Card>
          <CardTitle>Timetable Structure</CardTitle>
          <p className="tt-section-desc">
            Configure which days and time slots appear in the timetable. Changes rebuild the grid (existing data is preserved where possible).
          </p>
          <TimetableSettings
            days={days}
            slots={slots}
            onChange={handleStructureChange}
          />
        </Card>
      )}

      {/* ── CELL EDIT MODAL ─────────────────────────────────────────────── */}
      <CellEditModal
        open={!!cellModal}
        onClose={() => setCellModal(null)}
        onSave={saveCell}
        fields={fields}
        initialData={cellModal ? (grid[cellModal.slot]?.[cellModal.day] || {}) : {}}
        slot={cellModal?.slot}
        day={cellModal?.day}
      />
    </>
  );
}
