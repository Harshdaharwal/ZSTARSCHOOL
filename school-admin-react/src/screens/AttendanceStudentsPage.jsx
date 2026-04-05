import { Fragment, useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../hooks/useToast.js';
import { esc, formatDateIN } from '../utils/format.js';

const TABS = [
  { id: 'mark', label: '✅ Mark attendance' },
  { id: 'edit', label: '✏️ Edit attendance' },
];

export default function AttendanceStudentsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('mark');
  const [rows, setRows] = useState([]);
  const [att, setAtt] = useState({});
  const [sum, setSum] = useState(null);

  const fetchList = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const cls = fd.get('cls');
      const sec = fd.get('sec');
      const dt = fd.get('dt');
      if (!cls) {
        showToast('Select class', 'err');
        return;
      }
      const dateStr = formatDateIN(dt);
      const list = await api.getStudentsByClass(cls, sec);
      const saved =
        typeof api.getStudentAttendanceForDay === 'function'
          ? await api.getStudentAttendanceForDay(cls, sec, dateStr)
          : {};
      setRows(list);
      const init = {};
      list.forEach((s) => {
        const code = saved[s.Student_ID];
        init[s.Student_ID] = code === 'P' || code === 'A' || code === 'L' ? code : 'P';
      });
      setAtt(init);
      const hasSaved = Object.keys(saved).length > 0;
      if (tab === 'edit' && !hasSaved) {
        showToast('No saved attendance for this date and class yet. You can set values and save.', 'info');
      } else if (hasSaved) {
        showToast('Loaded saved attendance — change as needed and save.', 'ok');
      }
    },
    [api, showToast, tab]
  );

  const save = useCallback(async () => {
    const dt = document.getElementById('att-dt')?.value;
    const dateStr = formatDateIN(dt);
    const records = rows.map((s) => ({
      studentId: s.Student_ID,
      name: s.Name,
      cls: s.Class,
      section: s.Section,
      status: { P: 'Present', A: 'Absent', L: 'Late' }[att[s.Student_ID] || 'P'] || 'Absent',
      remarks: '',
    }));
    const res = await api.markStudentAttendance(records, dateStr);
    showToast(res.msg, res.ok ? 'ok' : 'err');
  }, [api, att, rows, showToast]);

  const summary = useCallback(
    async (e) => {
      e.preventDefault();
      const id = e.target.sid.value;
      const s = await api.getStudentAttendanceSummary(id);
      setSum(s);
    },
    [api]
  );

  return (
    <>
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />

      <Card>
        <CardTitle>{tab === 'edit' ? 'Edit student attendance' : 'Mark student attendance'}</CardTitle>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
          {tab === 'edit'
            ? 'Pick the date, class, and section for the day you want to change. Load the class — saved P/A/L appears — adjust and Save to update.'
            : 'Choose date and class, fetch the list. If attendance was already saved for that day, it loads automatically; otherwise everyone defaults to Present.'}
        </p>
        <form className="form-grid" onSubmit={fetchList}>
          <div className="form-group">
            <label>Date *</label>
            <input id="att-dt" name="dt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="form-group">
            <label>Class *</label>
            <select id="att-cls" name="cls" required>
              <option value="">--</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section *</label>
            <select id="att-sec" name="sec" required>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="form-group full btn-row">
            <Button type="submit">{tab === 'edit' ? 'Load class & saved attendance' : 'Fetch students'}</Button>
          </div>
        </form>
        {rows.length > 0 && (
          <div className="tbl-wrap" style={{ marginTop: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.Student_ID}>
                    <td>{esc(s.Name)}</td>
                    <td>
                      <div className="att-segment">
                        {['P', 'A', 'L'].map((code) => {
                          const rid = `att-${s.Student_ID}-${code}`;
                          return (
                            <Fragment key={code}>
                              <input
                                type="radio"
                                name={`att-${s.Student_ID}`}
                                id={rid}
                                value={code}
                                checked={(att[s.Student_ID] || 'P') === code}
                                onChange={() => setAtt((prev) => ({ ...prev, [s.Student_ID]: code }))}
                              />
                              <label htmlFor={rid}>{code}</label>
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
        )}
        {rows.length > 0 && (
          <div className="btn-row">
            <Button variant="success" onClick={save}>
              Save {tab === 'edit' ? 'changes' : 'attendance'}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Summary</CardTitle>
        <form className="filter-bar" onSubmit={summary}>
          <input name="sid" placeholder="Student ID" style={{ flex: 1 }} />
          <Button type="submit" variant="teal">
            View
          </Button>
        </form>
        {sum && (
          <div className="card" style={{ marginTop: 12 }}>
            <p>
              Total {sum.total} | Present {sum.present} | Absent {sum.absent} | Late {sum.late} — <b>{sum.pct}%</b>
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
