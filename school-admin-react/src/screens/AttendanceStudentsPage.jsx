import { Fragment, useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
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
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markDate, setMarkDate] = useState('');
  const [markCls,  setMarkCls]  = useState('');
  const [markSec,  setMarkSec]  = useState('');

  /* ── Summary state ── */
  const [sumQuery, setSumQuery] = useState('');
  const [sum, setSum]           = useState(null);
  const [sumLoading, setSumLoading] = useState(false);

  /* ── View Attendance state ── */
  const [viewCls, setViewCls]   = useState('');
  const [viewSec, setViewSec]   = useState('A');
  const [viewData, setViewData] = useState(null);   // { rows, dates }
  const [viewLoading, setViewLoading] = useState(false);
  // Date range — default: last 30 days
  const todayISO = new Date().toISOString().slice(0, 10);
  const thirtyAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [viewFrom, setViewFrom] = useState(thirtyAgoISO);
  const [viewTo,   setViewTo]   = useState(todayISO);

  /* ── Save success modal ── */
  const [saveResult, setSaveResult] = useState(null); // { date, present, absent, late, total }

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
      setMarkDate(dateStr);
      setMarkCls(cls);
      setMarkSec(sec);
      const init = {};
      list.forEach((s) => {
        const code = saved[s.Student_ID];
        init[s.Student_ID] = code === 'P' || code === 'A' || code === 'L' ? code : 'P';
      });
      setAtt(init);
      const hasSaved = Object.keys(saved).length > 0;
      if (tab === 'edit' && !hasSaved) showToast('No saved attendance for this date. Set values and save.', 'info');
      else if (hasSaved) showToast('Loaded saved attendance — adjust and save.', 'ok');
      if (list.length > 0) setMarkModalOpen(true);
      else showToast('No students found for this class/section.', 'info');
    },
    [api, showToast, tab]
  );

  const save = useCallback(async () => {
    const records = rows.map((s) => ({
      studentId: s.Student_ID,
      name:      s.Name,
      cls:       s.Class,
      section:   s.Section,
      status:    { P: 'Present', A: 'Absent', L: 'Late' }[att[s.Student_ID] || 'P'] || 'Absent',
      remarks:   '',
    }));
    const res = await api.markStudentAttendance(records, markDate);
    if (res.ok) {
      const present = records.filter((r) => r.status === 'Present').length;
      const absent  = records.filter((r) => r.status === 'Absent').length;
      const late    = records.filter((r) => r.status === 'Late').length;
      setMarkModalOpen(false);
      setSaveResult({ date: markDate, total: records.length, present, absent, late });
    } else {
      showToast(res.msg, 'err');
    }
  }, [api, att, markDate, rows, showToast]);

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
  const toIN = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const loadViewAttendance = useCallback(async () => {
    if (!viewCls) { showToast('Select class to view.', 'err'); return; }
    if (typeof api.getClassAttendanceSummary !== 'function') {
      showToast('View attendance not available.', 'err'); return;
    }
    setViewLoading(true);
    const data = await api.getClassAttendanceSummary(
      viewCls, viewSec,
      viewFrom ? toIN(viewFrom) : undefined,
      viewTo   ? toIN(viewTo)   : undefined
    );
    setViewLoading(false);
    if (!data || !data.rows) { showToast('No data returned.', 'err'); return; }
    setViewData(data);
    if (data.rows.length === 0) showToast('No records found for selected range.', 'info');
  }, [api, viewCls, viewSec, viewFrom, viewTo, showToast]);

  const downloadDailyPdf = useCallback(() => {
    if (!rows.length) {
      showToast('Load attendance first, then download PDF.', 'err');
      return;
    }
    const dateStr = markDate || formatDateIN(new Date().toISOString().slice(0, 10));
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
  }, [att, markDate, rows, showToast]);

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

      {/* ══════════════ Attendance Saved Success Modal ══════════════ */}
      <Modal
        open={!!saveResult}
        title="Attendance Saved!"
        onClose={() => setSaveResult(null)}
      >
        {saveResult && (
          <div style={{ textAlign: 'center' }}>
            {/* green checkmark */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#059669,#34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(5,150,105,0.35)',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Date</p>
            <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 20 }}>{saveResult.date}</p>

            {/* stat strip */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { label: 'Total',   value: saveResult.total,   color: 'var(--text)' },
                { label: 'Present', value: saveResult.present, color: 'var(--success,#059669)' },
                { label: 'Absent',  value: saveResult.absent,  color: 'var(--danger,#e11d48)' },
                { label: 'Late',    value: saveResult.late,    color: '#d97706' },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, minWidth: 72, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* % bar */}
            {saveResult.total > 0 && (() => {
              const pct = ((saveResult.present / saveResult.total) * 100).toFixed(1);
              const color = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#e11d48';
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Attendance Rate</span>
                    <span style={{ color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--border)' }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${color},${color}aa)`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setSaveResult(null)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#34d399)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* ══════════════ Mark / Edit tab ══════════════ */}
      {(tab === 'mark' || tab === 'edit') && (
        <>
          {/* Filter card — stays on page */}
          <Card>
            <CardTitle>{tab === 'edit' ? 'Edit student attendance' : 'Mark student attendance'}</CardTitle>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
              {tab === 'edit'
                ? 'Pick the date, class, and section. Click Load to open the attendance form.'
                : 'Choose date and class, then click Fetch Students to open the attendance form.'}
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
              <div className="form-group full btn-row" style={{ display: 'flex', gap: 10 }}>
                <Button type="submit">
                  {tab === 'edit' ? 'Load class & saved attendance' : 'Fetch Students'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Student Attendance Marking Modal */}
          <Modal
            open={markModalOpen}
            title={`${tab === 'edit' ? 'Edit' : 'Mark'} Attendance — Class ${markCls}-${markSec} · ${markDate}`}
            onClose={() => setMarkModalOpen(false)}
            className="modal-wide"
          >
            {/* Quick stat bar */}
            {rows.length > 0 && (() => {
              const present = rows.filter((s) => (att[s.Student_ID] || 'P') === 'P').length;
              const absent  = rows.filter((s) => att[s.Student_ID] === 'A').length;
              const late    = rows.filter((s) => att[s.Student_ID] === 'L').length;
              return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total',   value: rows.length, color: 'var(--text)' },
                    { label: 'Present', value: present, color: 'var(--success,#059669)' },
                    { label: 'Absent',  value: absent,  color: 'var(--danger,#e11d48)' },
                    { label: 'Late',    value: late,    color: '#d97706' },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, minWidth: 72, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="tbl-wrap">
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

            <div className="btn-row" style={{ marginTop: 16 }}>
              <Button variant="success" onClick={save}>
                Save {tab === 'edit' ? 'changes' : 'attendance'}
              </Button>
              <Button type="button" variant="ghost" onClick={downloadDailyPdf}>
                Download PDF
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMarkModalOpen(false)} style={{ marginLeft: 'auto' }}>
                Cancel
              </Button>
            </div>
          </Modal>

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
              {sum && (
                <Button type="button" variant="ghost" onClick={() => { setSum(null); setSumQuery(''); }}>
                  Clear
                </Button>
              )}
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
            <div className="form-group" style={{ margin: 0 }}>
              <label>From Date</label>
              <input type="date" value={viewFrom} onChange={(e) => { setViewFrom(e.target.value); setViewData(null); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>To Date</label>
              <input type="date" value={viewTo} onChange={(e) => { setViewTo(e.target.value); setViewData(null); }} />
            </div>
            <Button onClick={loadViewAttendance} disabled={viewLoading || !viewCls} style={{ alignSelf: 'flex-end' }}>
              {viewLoading ? 'Loading…' : 'Load Report'}
            </Button>
            {(viewCls || viewData) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setViewCls(''); setViewSec('A'); setViewData(null); }}
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
              >
                Clear
              </Button>
            )}
          </div>

          {viewLoading && <Spinner />}
        </Card>
      )}

      {/* ══════════════ View Attendance Result Modal ══════════════ */}
      <Modal
        open={!!(viewData && !viewLoading)}
        title={`Class ${viewCls}-${viewSec} — ${viewFrom} to ${viewTo}`}
        onClose={() => setViewData(null)}
        className="modal-wide"
      >
        {viewData && (() => {
          const allRows = viewData.rows || [];
          const totP = allRows.reduce((s, r) => s + r.present, 0);
          const totA = allRows.reduce((s, r) => s + r.absent, 0);
          const totL = allRows.reduce((s, r) => s + r.late, 0);
          const totAll = totP + totA + totL;
          const avgPct = totAll ? ((totP / totAll) * 100).toFixed(1) : '0.0';
          return (
            <>
              {/* Download button inside modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="button" variant="ghost" size="sm" onClick={downloadSummaryPdf}>
                  Download PDF
                </Button>
              </div>

              {/* Stat strip */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                {[
                  { label: 'Students', value: allRows.length },
                  { label: 'Days in Range', value: viewData.dates?.length ?? 0 },
                  { label: 'Avg Attendance', value: `${avgPct}%`, color: 'var(--success,#16a34a)' },
                  { label: 'Total Present', value: totP, color: 'var(--success,#16a34a)' },
                  { label: 'Total Absent',  value: totA, color: 'var(--danger,#e53935)' },
                  { label: 'Total Late',    value: totL, color: '#d97706' },
                ].map((t) => (
                  <div key={t.label} style={{ flex: 1, minWidth: 90, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: t.color || 'var(--text)' }}>{t.value}</div>
                  </div>
                ))}
              </div>

              {allRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>
                  No attendance records found for Class {viewCls}-{viewSec} in selected range.
                </p>
              ) : (
                <>
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
                          {(viewData.dates || []).slice(-7).map((d) => (
                            <th key={d} style={{ fontSize: '0.7rem', fontWeight: 500, minWidth: 52, textAlign: 'center' }}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allRows.map((r) => {
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
                                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: 3 }}>
                                  <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 2, background: pctColor }} />
                                </div>
                              </td>
                              {(viewData.dates || []).slice(-7).map((d) => {
                                const code = r.dayMap?.[d];
                                return (
                                  <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                                    {code ? (
                                      <span style={{ display: 'inline-block', width: 24, height: 24, lineHeight: '24px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, background: STATUS_BG[code] || '#f5f5f5', color: STATUS_COLOR[code] || 'var(--text)' }}>
                                        {code}
                                      </span>
                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>}
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
            </>
          );
        })()}
      </Modal>
    </>
  );
}
