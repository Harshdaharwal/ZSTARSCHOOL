import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { IconPlus, IconDocument } from '../components/common/Icons.jsx';

const TYPES = ['Class', 'Test', 'Exam', 'Other'];
const TABS = [
  { id: 'add', label: 'Add Entry', Icon: IconPlus },
  { id: 'view', label: 'View Timetable', Icon: IconDocument },
];

export default function TimetablesPage() {
  const api = useApi();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { showToast } = useToast();
  const load = useCallback(() => api.getTimetables(), [api]);
  const { data: rows, loading, refresh } = useAsyncResource(load);
  const [confirm, setConfirm] = useState(null);
  const [tab, setTab] = useState('view');
  const [viewFilter, setViewFilter] = useState('mine');
  const [editing, setEditing] = useState(null);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addTimetable({
        type: fd.get('type'),
        title: fd.get('title'),
        cls: fd.get('cls'),
        section: fd.get('section'),
        day: fd.get('day'),
        eventDate: fd.get('eventDate'),
        timeSlot: fd.get('timeSlot'),
        room: fd.get('room'),
        subject: fd.get('subject'),
        notes: fd.get('notes'),
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const remove = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete Timetable Entry',
        message: 'Are you sure you want to remove this timetable entry? This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const res = await api.deleteTimetable(id);
          showToast(res.msg, res.ok ? 'ok' : 'err');
          if (res.ok) refresh();
          setConfirm(null);
        },
      });
    },
    [api, refresh, showToast]
  );

  const saveEdit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!editing) return;
      const fd = new FormData(e.target);
      const res = await api.updateTimetable(editing.Entry_ID, {
        type: fd.get('type'),
        title: fd.get('title'),
        cls: fd.get('cls'),
        section: fd.get('section'),
        day: fd.get('day'),
        eventDate: fd.get('eventDate'),
        timeSlot: fd.get('timeSlot'),
        room: fd.get('room'),
        subject: fd.get('subject'),
        notes: fd.get('notes'),
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setEditing(null);
        refresh();
      }
    },
    [api, editing, refresh, showToast]
  );

  if (loading && !rows) return <Spinner />;

  const visibleRows = (rows || []).filter((r) => {
    if (!isAdmin || viewFilter === 'all') return true;
    const createdByUid = String(r.Created_By_UID || '');
    return createdByUid && createdByUid === String(user?.uid || '');
  });

  return (
    <>
      <SectionHeader title="Timetables" />
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
        Manage class routines, tests, exams, and other scheduled events (demo / local backend).
      </p>

      {isAdmin && (
        <>
          <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />
          {tab === 'view' && (
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <Button size="sm" variant={viewFilter === 'mine' ? 'primary' : 'ghost'} onClick={() => setViewFilter('mine')}>
                My Created
              </Button>
              <Button size="sm" variant={viewFilter === 'all' ? 'primary' : 'ghost'} onClick={() => setViewFilter('all')}>
                All Entries
              </Button>
            </div>
          )}
        </>
      )}

      {isAdmin && tab === 'add' && (
        <Card>
          <CardTitle>Add timetable entry</CardTitle>
          <form className="form-grid" onSubmit={submit}>
            <div className="form-group">
              <label>Type *</label>
              <select name="type" required defaultValue="Class">
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input name="title" required placeholder="e.g. Mid-term Science" />
            </div>
            <div className="form-group">
              <label>Class</label>
              <select name="cls">
                <option value="">—</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <select name="section">
                <option value="">—</option>
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Day (weekly)</label>
              <select name="day">
                <option value="">—</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Event date (tests/exams)</label>
              <input name="eventDate" placeholder="dd/mm/yyyy" />
            </div>
            <div className="form-group">
              <label>Time slot</label>
              <input name="timeSlot" placeholder="09:00–10:00" />
            </div>
            <div className="form-group">
              <label>Room</label>
              <input name="room" />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input name="subject" />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea name="notes" rows={2} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Save entry</Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ marginTop: 24 }}>
        <SectionHeader
          title={isAdmin ? (viewFilter === 'mine' ? 'My created entries' : 'All entries') : 'All entries'}
          actions={<Button onClick={() => refresh()}>Refresh</Button>}
        />
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Class</th>
                <th>Sec</th>
                <th>When</th>
                <th>Time</th>
                <th>Room</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!visibleRows.length ? (
                <tr>
                  <td colSpan={8} className="empty" style={{ padding: 24 }}>
                    {isAdmin && viewFilter === 'mine'
                      ? 'No timetable entries created by you yet.'
                      : 'No entries yet.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.Entry_ID}>
                    <td>{esc(r.Type)}</td>
                    <td>{esc(r.Title)}</td>
                    <td>{esc(r.Class)}</td>
                    <td>{esc(r.Section)}</td>
                    <td>{esc(r.Event_Date || r.Day || '—')}</td>
                    <td>{esc(r.Time_Slot)}</td>
                    <td>{esc(r.Room)}</td>
                    <td>
                      {isAdmin && (
                        <>
                          <Button type="button" variant="ghost" size="sm" style={{ marginRight: 4 }} onClick={() => setEditing(r)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(r.Entry_ID)}>
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      <Modal open={!!editing} title="Edit timetable entry" onClose={() => setEditing(null)}>
        {editing && (
          <form className="form-grid" onSubmit={saveEdit}>
            <div className="form-group">
              <label>Type *</label>
              <select name="type" required defaultValue={editing.Type || 'Class'}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input name="title" required defaultValue={editing.Title || ''} />
            </div>
            <div className="form-group">
              <label>Class</label>
              <select name="cls" defaultValue={editing.Class || ''}>
                <option value="">—</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <select name="section" defaultValue={editing.Section || ''}>
                <option value="">—</option>
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Day (weekly)</label>
              <select name="day" defaultValue={editing.Day || ''}>
                <option value="">—</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Event date (tests/exams)</label>
              <input name="eventDate" defaultValue={editing.Event_Date || ''} />
            </div>
            <div className="form-group">
              <label>Time slot</label>
              <input name="timeSlot" defaultValue={editing.Time_Slot || ''} />
            </div>
            <div className="form-group">
              <label>Room</label>
              <input name="room" defaultValue={editing.Room || ''} />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input name="subject" defaultValue={editing.Subject || ''} />
            </div>
            <div className="form-group full">
              <label>Notes</label>
              <textarea name="notes" rows={2} defaultValue={editing.Notes || ''} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
