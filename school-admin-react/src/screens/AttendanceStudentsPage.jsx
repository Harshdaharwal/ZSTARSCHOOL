import { Fragment, useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { IconAttendanceStudents, IconEdit, IconChartBar } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../hooks/useToast.js';
import { esc, formatDateIN } from '../utils/format.js';
import { downloadAttendancePdf } from '../utils/attendancePdf.js';

const TABS = [
  { id: 'mark',  label: 'Mark Attendance', Icon: IconAttendanceStudents },
  { id: 'edit',  label: 'Edit Attendance',  Icon: IconEdit },
  { id: 'view',  label: 'View Attendance',  Icon: IconChartBar },
];

const STATUS_COLOR = { P: 'var(--success,#16a34a)', A: 'var(--danger,#e53935)', L: '#d97706' };
const STATUS_BG    = { P: '#f0fdf4', A: '#fff1f2', L: '#fffbeb' };

export default function AttendanceStudentsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('mark');

  /* ── Mark / Edit state ── */
  const [rows, setRows]   = useState([]);
  const [att, setAtt]     = useState({});

  /* ── Summary state ── */
  const [sumQuery, setSumQuery] = useState('');
  const [sum, setSum]           = useState(null);
  const [sumLoading, setSumLoading] = useState(false);

  /* ── View Attendance state ── */
  const [viewCls, setViewCls]   = useState('');
  const [viewSec, setViewSec]   = useState('A');
  const [viewData, setViewData] = useState(null);   // { rows, dates }
  const [viewLoading, setViewLoading] = useState(false);

  /* ────────────────────────────────────── Mark / Edit handlers ── */
  const fetchList = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const cls = fd.get('cls');
      const sec = fd.get('sec');
      const dt  = fd.get('dt');
      if (!cls) { showToast('Select class', 'err'); return; }
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
      if (tab === 'edit' && !hasSaved) showToast('No saved attendance for this date. Set values and save.', 'info');
      else if (hasSaved) showToast('Loaded saved attendance — adjust and save.', 'ok');
    },
    [api, showToast, tab]
  );

  const save = useCallback(async () => {
    const dt = document.getElementById('att-dt')?.value;
    const dateStr = formatDateIN(dt);
    const records = rows.map((s) => ({
      studentId: s.Student_ID,
      name:      s.Name,
      cls:       s.Class,
      section:   s.Section,
      status:    { P: 'Present', A: 'Absent', L: 'Late' }[att[s.Student_ID] || 'P'] || 'Absent',
      remarks:   '',
    }));
    const res = await api.markStudentAttendance(records, dateStr);
    showToast(res.msg, res.ok ? 'ok' : 'err');
  }, [api, att, rows, showToast]);

  /* ────────────────────────────────────── Summary handler ── */
  const handleSummary = useCallback(
    async (e) => {
      e.preventDefault();
      const q = sumQuery.trim();
      if (!q) { showToast('Enter student name, ID, or roll number.', 'err'); return; }
      setSumLoading(true);
      const s = await api.getStudentAttendanceSummary(q);
      setSumLoading(false);
      setSum(s);
      if (s.total === 0) showToast('No attendance records found for this student.', 'err');
    },
    [api, sumQuery, showToast]
  );

  /* ────────────────────────────────────── View Attendance handler ── */
  const loadViewAttendance = useCallback(async () => {
    if (!viewCls) { showToast('Select class to view.', 'err'); return; }
    if (typeof api.getClassAttendanceSummary !== 'function') {
      showToast('View attendance not available.', 'err'); return;
    }
    setViewLoading(true);
    const data = await api.getClassAttendanceSummary(viewCls, viewSec);
    setViewLoading(false);
    setViewData(data);
  }, [api, viewCls, viewSec, showToast]);

  const downloadDailyPdf = useCallback(() => {
    if (!rows.length) {
      showToast('Load attendance first, then download PDF.', 'err');
      return;
    }
    const dt = document.getElementById('att-dt')?.value;
    const dateStr = formatDateIN(dt);
    const body = rows.map((s) => {
      const code = att[s.Student_ID] || 'P';
      const status = code === 'P' ? 'Present' : code === 'A' ? 'Absent' : 'Late';
      return [String(s.Roll_No ?? ''), s.Student_ID, s.Name, String(s.Class), String(s.Section), status];
    });
    const total = body.length;
    const present = body.filter((r) => r[5] === 'Present').length;
    const absent = body.filter((r) => r[5] === 'Absent').length;
    const late = body.filter((r) => r[5] === 'Late').length;
    const pct = total ? ((present / total) * 100).toFixed(1) : '0.0';
    downloadAttendancePdf({
      title: 'Student Daily Attendance',
      subtitle: `Date: ${dateStr}`,
      head: ['Roll', 'Student ID', 'Name', 'Class', 'Section', 'Status'],
      body,
      summaryLines: [
        `Total: ${total}`,
        `Present: ${present}`,
        `Absent: ${absent}`,
        `Late: ${late}`,
        `Attendance: ${pct}%`,
      ],
      filename: `student-attendance-${dateStr.replace(/\//g, '-')}.pdf`,
    });
    showToast('Student attendance PDF downloaded.', 'ok');
  }, [att, rows, showToast]);

  const downloadSummaryPdf = useCallback(() => {
    if (!viewData || !viewData.rows?.length) {
      showToast('Load class attendance report first.', 'err');
      return;
    }
    const body = viewData.rows.map((r) => [
      String(r.rollNo ?? ''),
      r.studentId,
      r.name,
      String(r.present),
      String(r.absent),
      String(r.late),
      String(r.total),
      `${r.pct}%`,
    ]);
    const totP = viewData.rows.reduce((s, r) => s + r.present, 0);
    const totA = viewData.rows.reduce((s, r) => s + r.absent, 0);
    const totL = viewData.rows.reduce((s, r) => s + r.late, 0);
    const totAll = totP + totA + totL;
    const avgPct = totAll ? ((totP / totAll) * 100).toFixed(1) : '0.0';
    downloadAttendancePdf({
      title: 'Class Attendance Summary',
      subtitle: `Class ${viewCls}-${viewSec}`,
      head: ['Roll', 'Student ID', 'Name', 'Present', 'Absent', 'Late', 'Total', 'Attendance %'],
      body,
      summaryLines: [
        `Students: ${viewData.rows.length}`,
        `Recorded Days: ${viewData.dates?.length ?? 0}`,
        `Total Present: ${totP}`,
        `Total Absent: ${totA}`,
        `Total Late: ${totL}`,
        `Average Attendance: ${avgPct}%`,
      ],
      filename: `class-attendance-${viewCls}-${viewSec}.pdf`,
    });
    showToast('Class attendance PDF downloaded.', 'ok');
  }, [showToast, viewCls, viewData, viewSec]);

  /* ────────────────────────────────────── Render ── */
  return (
    <>
      <FilterTabs tabs={TABS} activeId={tab} onChange={(id) => { setTab(id); setRows([]); setViewData(null); setSum(null); }} />

      {/* ══════════════ Mark / Edit tab ══════════════ */}
      {(tab === 'mark' || tab === 'edit') && (
        <>
          <Card>
            <CardTitle>{tab === 'edit' ? 'Edit student attendance' : 'Mark student attendance'}</CardTitle>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
              {tab === 'edit'
                ? 'Pick the date, class, and section. Load — saved P/A/L appears — adjust and Save.'
                : 'Choose date and class, fetch the list. Defaults to Present if not yet saved.'}
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
                  {[...Array(12)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <select id="att-sec" name="sec" required>
                  {['A', 'B', 'C', 'D'].map((x) => <option key={x}>{x}</option>)}
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
                      <th>Roll</th>
                      <th>Student</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.Student_ID}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.Roll_No || '—'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{esc(s.Name)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc(s.Student_ID)}</div>
                        </td>
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
              <div className="btn-row" style={{ marginTop: 12 }}>
                <Button variant="success" onClick={save}>
                  Save {tab === 'edit' ? 'changes' : 'attendance'}
                </Button>
                <Button type="button" variant="ghost" onClick={downloadDailyPdf}>
                  Download PDF
                </Button>
              </div>
            )}
          </Card>

          {/* ── Summary lookup ── */}
          <Card>
            <CardTitle>Student Summary</CardTitle>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Search by Student ID, Name, or Roll Number
            </p>
            <form className="filter-bar" onSubmit={handleSummary}>
              <input
                placeholder="e.g. STU_1001 / Aarav Sharma / Roll 3"
                style={{ flex: 1 }}
                value={sumQuery}
                onChange={(e) => setSumQuery(e.target.value)}
              />
              <Button type="submit" variant="teal" disabled={sumLoading}>
                {sumLoading ? '…' : 'View'}
              </Button>
            </form>
            {sum && sum.total > 0 && (
              <div
                style={{
                  marginTop: 14,
                  background: 'var(--sidebar-bg,#f0f4ff)',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                {sum.studentName && (
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {sum.studentName}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: 8 }}>
                      {sum.studentId} · Class {sum.class}-{sum.section}
                      {sum.rollNo ? ` · Roll ${sum.rollNo}` : ''}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.9rem' }}>
                  <span>Total: <strong>{sum.total}</strong></span>
                  <span style={{ color: 'var(--success,#16a34a)' }}>Present: <strong>{sum.present}</strong></span>
                  <span style={{ color: 'var(--danger,#e53935)' }}>Absent: <strong>{sum.absent}</strong></span>
                  <span style={{ color: '#d97706' }}>Late: <strong>{sum.late}</strong></span>
                  <span>Attendance: <strong>{sum.pct}%</strong></span>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ══════════════ View Attendance tab ══════════════ */}
      {tab === 'view' && (
        <Card>
          <CardTitle>Class Attendance Report</CardTitle>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Select class and section to see full attendance summary for all students.
          </p>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Class *</label>
              <select value={viewCls} onChange={(e) => { setViewCls(e.target.value); setViewData(null); }}>
                <option value="">-- Select --</option>
                {[...Array(12)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Section</label>
              <select value={viewSec} onChange={(e) => { setViewSec(e.target.value); setViewData(null); }}>
                {['A', 'B', 'C', 'D'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <Button onClick={loadViewAttendance} disabled={viewLoading || !viewCls}>
              {viewLoading ? 'Loading…' : 'Load Report'}
            </Button>
            {viewData?.rows?.length > 0 && (
              <Button type="button" variant="ghost" onClick={downloadSummaryPdf}>
                Download PDF
              </Button>
            )}
          </div>

          {viewLoading && <Spinner />}

          {viewData && !viewLoading && (
            <>
              {/* ── Class-level stat strip ── */}
              {(() => {
                const allRows = viewData.rows || [];
                const totP = allRows.reduce((s, r) => s + r.present, 0);
                const totA = allRows.reduce((s, r) => s + r.absent, 0);
                const totL = allRows.reduce((s, r) => s + r.late, 0);
                const totAll = totP + totA + totL;
                const avgPct = totAll ? ((totP / totAll) * 100).toFixed(1) : '0.0';
                return (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                    {[
                      { label: 'Students', value: allRows.length },
                      { label: 'Total Days Recorded', value: viewData.dates?.length ?? 0 },
                      { label: 'Avg Attendance', value: `${avgPct}%`, color: 'var(--success,#16a34a)' },
                      { label: 'Total Present', value: totP, color: 'var(--success,#16a34a)' },
                      { label: 'Total Absent', value: totA, color: 'var(--danger,#e53935)' },
                      { label: 'Total Late',   value: totL, color: '#d97706' },
                    ].map((t) => (
                      <div key={t.label} style={{ flex: 1, minWidth: 100, background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: t.color || 'var(--text)' }}>{t.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Per-student summary table ── */}
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>
                      <th style={{ color: 'var(--success,#16a34a)' }}>Present</th>
                      <th style={{ color: 'var(--danger,#e53935)' }}>Absent</th>
                      <th style={{ color: '#d97706' }}>Late</th>
                      <th>Total</th>
                      <th>Attendance %</th>
                      {/* Recent days column headers */}
                      {(viewData.dates || []).slice(-7).map((d) => (
                        <th key={d} style={{ fontSize: '0.7rem', fontWeight: 500, minWidth: 52, textAlign: 'center' }}>
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(viewData.rows || []).map((r) => {
                      const pct = parseFloat(r.pct);
                      const pctColor = pct >= 75 ? 'var(--success,#16a34a)' : pct >= 50 ? '#d97706' : 'var(--danger,#e53935)';
                      return (
                        <tr key={r.studentId}>
                          <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{r.rollNo ?? '—'}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{esc(r.name)}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{esc(r.studentId)}</div>
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--success,#16a34a)', fontWeight: 600 }}>{r.present}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger,#e53935)', fontWeight: 600 }}>{r.absent}</td>
                          <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{r.late}</td>
                          <td style={{ textAlign: 'center' }}>{r.total}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: pctColor }}>{r.pct}%</span>
                            {/* mini bar */}
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--border,#e5e7eb)', marginTop: 3 }}>
                              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 2, background: pctColor }} />
                            </div>
                          </td>
                          {/* Last 7 days cells */}
                          {(viewData.dates || []).slice(-7).map((d) => {
                            const code = r.dayMap?.[d];
                            return (
                              <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                                {code ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: 24,
                                      height: 24,
                                      lineHeight: '24px',
                                      borderRadius: 4,
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: STATUS_BG[code] || '#f5f5f5',
                                      color: STATUS_COLOR[code] || 'var(--text)',
                                    }}
                                  >
                                    {code}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Last 7 recorded school days shown. % ≥75 green · 50–74 orange · &lt;50 red.
              </p>
            </>
          )}

          {viewData && !viewLoading && (viewData.rows || []).length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
              No attendance records found for Class {viewCls}-{viewSec}.
            </p>
          )}
        </Card>
      )}
    </>
  );
}
