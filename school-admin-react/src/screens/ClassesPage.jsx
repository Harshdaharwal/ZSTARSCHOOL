import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { IconClasses, IconTimetables, IconRefresh, IconSchool } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';

const TABS = [
  { id: 'list', label: 'Class List', Icon: IconClasses },
  { id: 'schedule', label: 'Schedule', Icon: IconTimetables },
];

export default function ClassesPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('list');
  const [confirm, setConfirm] = useState(null);

  const loadClasses = useCallback(() => api.getAllClasses(), [api]);
  const { data: classes, loading, refresh } = useAsyncResource(loadClasses);

  const addClass = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addClass({
        cls: fd.get('cls'),
        section: fd.get('section'),
        classTeacherId: fd.get('ctid') || '',
        roomNo: fd.get('room') || '',
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const del = useCallback((cls, sec) => {
    setConfirm({
      title: 'Delete class?',
      message: `Remove class ${cls} section ${sec}? This cannot be undone in the demo.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await api.deleteClass(cls, sec);
        showToast(res.msg, res.ok ? 'ok' : 'err');
        if (res.ok) refresh();
        setConfirm(null);
      },
    });
  }, [api, refresh, showToast]);

  const addSched = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addSchedule({
        cls: fd.get('cls'),
        section: fd.get('section'),
        day: fd.get('day'),
        period: fd.get('period'),
        subject: fd.get('subject'),
        teacherName: fd.get('tname') || '',
        room: fd.get('room') || '',
        timeSlot: fd.get('time') || '',
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) e.target.reset();
    },
    [api, showToast]
  );

  const [vCls, setVCls] = useState('');
  const [vSec, setVSec] = useState('');
  const loadSch = useCallback(() => {
    if (!vCls || !vSec) return Promise.resolve([]);
    return api.getSchedule(vCls, vSec);
  }, [api, vCls, vSec]);
  const { data: schedRows, refresh: refreshSch } = useAsyncResource(loadSch);

  if (loading && !classes) return <Spinner />;

  return (
    <>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />
      {tab === 'list' && (
        <>
          <Card>
            <CardTitle><IconSchool size={16} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />Add Class</CardTitle>
            <form className="form-grid" onSubmit={addClass}>
              <div className="form-group">
                <label>Class *</label>
                <select name="cls" required>
                  <option value="">--</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select name="section" required>
                  {['A', 'B', 'C', 'D'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Teacher ID</label>
                <input name="ctid" placeholder="TCH_xxx" />
              </div>
              <div className="form-group">
                <label>Room</label>
                <input name="room" />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit">Add Class</Button>
              </div>
            </form>
          </Card>
          <Card>
            <SectionHeader title="All Classes" actions={<Button onClick={() => refresh()} size="sm" variant="ghost"><IconRefresh size={14} /></Button>} />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Teacher ID</th>
                    <th>Room</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(classes || []).map((c) => (
                    <tr key={c.Class + c.Section}>
                      <td>{esc(c.Class)}</td>
                      <td>{esc(c.Section)}</td>
                      <td>{esc(c.Class_Teacher_ID)}</td>
                      <td>{esc(c.Room_No)}</td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => del(c.Class, c.Section)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      {tab === 'schedule' && (
        <>
          <Card>
            <CardTitle>Add Schedule</CardTitle>
            <form className="form-grid" onSubmit={addSched}>
              <div className="form-group">
                <label>Class *</label>
                <select name="cls" required>
                  <option value="">--</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select name="section" required>
                  {['A', 'B', 'C', 'D'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Day *</label>
                <select name="day" required>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Period *</label>
                <input name="period" required />
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input name="subject" required />
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <input name="tname" />
              </div>
              <div className="form-group">
                <label>Room</label>
                <input name="room" />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input name="time" placeholder="09:00-09:45" />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit">Add</Button>
              </div>
            </form>
          </Card>
          <Card>
            <CardTitle>View Schedule</CardTitle>
            <div className="filter-bar">
              <select value={vCls} onChange={(e) => setVCls(e.target.value)}>
                <option value="">Class</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
              <select value={vSec} onChange={(e) => setVSec(e.target.value)}>
                <option value="">Section</option>
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <Button
                onClick={() => {
                  refreshSch();
                }}
              >
                Load
              </Button>
            </div>
            <div className="schedule-grid">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                const rows = (schedRows || []).filter((r) => r.Day === day);
                if (!rows.length) return null;
                return (
                  <div key={day} className="schedule-day">
                    <div className="schedule-day-title">{day}</div>
                    {rows.map((p, i) => (
                      <div key={i} className="schedule-period">
                        <span>P{p.Period}</span>
                        <span>{esc(p.Subject)}</span>
                        <span>{esc(p.Teacher_Name)}</span>
                        <span>{esc(p.Room)}</span>
                        <span>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setConfirm({
                                title: 'Remove period?',
                                message: `${day} P${p.Period} — ${p.Subject}`,
                                confirmLabel: 'Remove',
                                danger: true,
                                onConfirm: async () => {
                                  const res = await api.deleteSchedule(vCls, vSec, day, p.Period);
                                  showToast(res.msg, res.ok ? 'ok' : 'err');
                                  if (res.ok) refreshSch();
                                  setConfirm(null);
                                },
                              })
                            }
                          >
                            Del
                          </Button>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
