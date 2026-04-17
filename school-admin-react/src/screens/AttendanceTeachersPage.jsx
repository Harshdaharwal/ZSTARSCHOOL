import { Fragment, useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { IconAttendanceTeachers, IconEdit } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { formatDateIN, esc } from '../utils/format.js';
import { downloadAttendancePdf } from '../utils/attendancePdf.js';

const TABS = [
  { id: 'mark', label: 'Mark Attendance', Icon: IconAttendanceTeachers },
  { id: 'edit', label: 'Edit Attendance', Icon: IconEdit },
];

export default function AttendanceTeachersPage() {
  const api = useApi();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const load = useCallback(() => api.getAllTeachers(), [api]);
  const { data: teachers } = useAsyncResource(load);

  const [tab, setTab] = useState('mark');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [att, setAtt] = useState({});

  useEffect(() => {
    if (!teachers?.length) return;
    let cancelled = false;
    (async () => {
      const dateStr = formatDateIN(attDate);
      if (typeof api.getTeacherAttendanceForDay !== 'function') return;
      const saved = await api.getTeacherAttendanceForDay(dateStr);
      if (cancelled) return;
      const next = {};
      teachers.forEach((t) => {
        const code = saved[t.Teacher_ID];
        next[t.Teacher_ID] = code === 'P' || code === 'A' || code === 'L' ? code : 'P';
      });
      setAtt(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [api, attDate, teachers]);

  const reloadSaved = useCallback(async () => {
    if (!teachers?.length) return;
    const dateStr = formatDateIN(attDate);
    const saved = await api.getTeacherAttendanceForDay(dateStr);
    const next = {};
    teachers.forEach((t) => {
      const code = saved[t.Teacher_ID];
      next[t.Teacher_ID] = code === 'P' || code === 'A' || code === 'L' ? code : 'P';
    });
    setAtt(next);
    const hasSaved = Object.keys(saved).length > 0;
    if (tab === 'edit' && !hasSaved) {
      showToast('No saved attendance for this date yet.', 'info');
    } else {
      showToast(hasSaved ? 'Reloaded saved attendance for this date.' : 'Defaults applied (Present).', 'ok');
    }
  }, [api, attDate, teachers, tab, showToast]);

  const save = useCallback(async () => {
    const dateStr = formatDateIN(attDate);
    const records = (teachers || []).map((t) => ({
      teacherId: t.Teacher_ID,
      name: t.Name,
      status: { P: 'Present', A: 'Absent', L: 'Leave' }[att[t.Teacher_ID] || 'P'] || 'Absent',
      remarks: '',
    }));
    const res = await api.markTeacherAttendance(records, dateStr);
    showToast(res.msg, res.ok ? 'ok' : 'err');
  }, [api, att, teachers, attDate, showToast]);

  const [sum, setSum] = useState(null);

  const loadSum = useCallback(
    async (e) => {
      e.preventDefault();
      const id = e.target.tid.value;
      const s = await api.getTeacherAttSummary(id);
      setSum(s);
    },
    [api]
  );

  const downloadTeachersAttendancePdf = useCallback(() => {
    if (!teachers?.length) {
      showToast('No teacher attendance data to download.', 'err');
      return;
    }
    const dateStr = formatDateIN(attDate);
    const body = teachers.map((t) => {
      const code = att[t.Teacher_ID] || 'P';
      const status = code === 'P' ? 'Present' : code === 'A' ? 'Absent' : 'Leave';
      return [t.Teacher_ID, t.Name, t.Subject || '', status];
    });
    const total = body.length;
    const present = body.filter((r) => r[3] === 'Present').length;
    const absent = body.filter((r) => r[3] === 'Absent').length;
    const leave = body.filter((r) => r[3] === 'Leave').length;
    const pct = total ? ((present / total) * 100).toFixed(1) : '0.0';
    downloadAttendancePdf({
      title: 'Teacher Daily Attendance',
      subtitle: `Date: ${dateStr}`,
      head: ['Teacher ID', 'Name', 'Subject', 'Status'],
      body,
      summaryLines: [
        `Total: ${total}`,
        `Present: ${present}`,
        `Absent: ${absent}`,
        `Leave: ${leave}`,
        `Attendance: ${pct}%`,
      ],
      filename: `teacher-attendance-${dateStr.replace(/\//g, '-')}.pdf`,
    });
    showToast('Teacher attendance PDF downloaded.', 'ok');
  }, [att, attDate, showToast, teachers]);

  return (
    <>
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />

      <Card>
        <CardTitle>{tab === 'edit' ? 'Edit teacher attendance' : 'Teacher attendance'}</CardTitle>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
          {tab === 'edit'
            ? 'Choose the date, reload saved marks if needed, change P/A/L, then save to update the day.'
            : 'Pick a date — saved attendance for that day loads automatically. Adjust and Save.'}
        </p>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label htmlFor="tatt-dt">Date *</label>
            <input
              id="tatt-dt"
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
            />
          </div>
          <div className="form-group btn-row" style={{ alignSelf: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={reloadSaved}>
              Reload saved for this date
            </Button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>P / A / L</th>
              </tr>
            </thead>
            <tbody>
              {(teachers || []).map((t) => (
                <tr key={t.Teacher_ID}>
                  <td>{esc(t.Name)}</td>
                  <td>
                    <div className="att-segment">
                      {['P', 'A', 'L'].map((code) => {
                        const id = `${t.Teacher_ID}-${code}`;
                        return (
                          <Fragment key={code}>
                            <input
                              type="radio"
                              name={`tatt-${t.Teacher_ID}`}
                              id={id}
                              value={code}
                              checked={(att[t.Teacher_ID] || 'P') === code}
                              onChange={() => setAtt((prev) => ({ ...prev, [t.Teacher_ID]: code }))}
                            />
                            <label htmlFor={id}>{code}</label>
                          </Fragment>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <Button variant="success" onClick={save}>
            Save {tab === 'edit' ? 'changes' : 'attendance'}
          </Button>
          {isAdmin && (
            <Button type="button" variant="ghost" onClick={downloadTeachersAttendancePdf}>
              Download PDF
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Summary</CardTitle>
        <form className="filter-bar" onSubmit={loadSum}>
          <input name="tid" placeholder="Teacher ID" style={{ flex: 1 }} />
          <Button type="submit" variant="teal">
            View
          </Button>
        </form>
        {sum && (
          <div className="card" style={{ marginTop: 12 }}>
            <p>
              Total {sum.total} | Present {sum.present} | Absent {sum.absent} | Leave {sum.leave} — <b>{sum.pct}%</b>
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
