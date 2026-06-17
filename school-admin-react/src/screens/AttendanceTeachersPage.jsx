import { Fragment, useCallback, useEffect, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { IconAttendanceTeachers, IconEdit, IconChartBar } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { formatDateIN, esc } from '../utils/format.js';
import { downloadAttendancePdf } from '../utils/attendancePdf.js';

const TABS = [
  { id: 'mark', label: 'Mark Attendance', Icon: IconAttendanceTeachers },
  { id: 'edit', label: 'Edit Attendance', Icon: IconEdit },
  { id: 'view', label: 'View Attendance', Icon: IconChartBar },
];

const STATUS_COLOR = { P: 'var(--success,#16a34a)', A: 'var(--danger,#e53935)', L: '#d97706' };
const STATUS_BG    = { P: '#f0fdf4', A: '#fff1f2', L: '#fffbeb' };

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
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markDateLabel, setMarkDateLabel] = useState('');

  /* ── View Attendance state ── */
  const [viewData, setViewData] = useState(null); // { rows, dates }
  const [viewLoading, setViewLoading] = useState(false);
  // Date range — default: last 30 days
  const todayISO      = new Date().toISOString().slice(0, 10);
  const thirtyAgoISO  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [viewFrom, setViewFrom] = useState(thirtyAgoISO);
  const [viewTo,   setViewTo]   = useState(todayISO);

  /* ── Save success modal ── */
  const [saveResult, setSaveResult] = useState(null); // { date, present, absent, leave, total }

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

  /* Load saved attendance and open modal */
  const loadAndOpen = useCallback(async () => {
    if (!teachers?.length) { showToast('No teachers loaded yet.', 'info'); return; }
    const dateStr = formatDateIN(attDate);
    const saved =
      typeof api.getTeacherAttendanceForDay === 'function'
        ? await api.getTeacherAttendanceForDay(dateStr)
        : {};
    const next = {};
    teachers.forEach((t) => {
      const code = saved[t.Teacher_ID];
      next[t.Teacher_ID] = code === 'P' || code === 'A' || code === 'L' ? code : 'P';
    });
    setAtt(next);
    setMarkDateLabel(dateStr);
    const hasSaved = Object.keys(saved).length > 0;
    if (tab === 'edit' && !hasSaved) showToast('No saved attendance for this date. Defaults applied.', 'info');
    else if (hasSaved) showToast('Saved attendance loaded — adjust and save.', 'ok');
    setMarkModalOpen(true);
  }, [api, attDate, teachers, tab, showToast]);

  const save = useCallback(async () => {
    const records = (teachers || []).map((t) => ({
      teacherId: t.Teacher_ID,
      name: t.Name,
      status: { P: 'Present', A: 'Absent', L: 'Leave' }[att[t.Teacher_ID] || 'P'] || 'Absent',
      remarks: '',
    }));
    const res = await api.markTeacherAttendance(records, markDateLabel);
    if (res.ok) {
      const present = records.filter((r) => r.status === 'Present').length;
      const absent  = records.filter((r) => r.status === 'Absent').length;
      const leave   = records.filter((r) => r.status === 'Leave').length;
      setMarkModalOpen(false);
      setSaveResult({ date: markDateLabel, total: records.length, present, absent, leave });
    } else {
      showToast(res.msg, 'err');
    }
  }, [api, att, markDateLabel, teachers, showToast]);

  const [sum, setSum] = useState(null);
  const [sumQuery, setSumQuery] = useState('');

  const loadSum = useCallback(
    async (e) => {
      e.preventDefault();
      const id = sumQuery.trim();
      if (!id) { showToast('Enter teacher ID', 'err'); return; }
      const s = await api.getTeacherAttSummary(id);
      setSum(s);
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
    if (typeof api.getTeachersAttendanceReport !== 'function') {
      showToast('Report not available.', 'err'); return;
    }
    setViewLoading(true);
    const data = await api.getTeachersAttendanceReport(
      viewFrom ? toIN(viewFrom) : undefined,
      viewTo   ? toIN(viewTo)   : undefined
    );
    setViewLoading(false);
    if (!data || !data.rows) { showToast('No data returned.', 'err'); return; }
    setViewData(data);
    if (data.rows.length === 0) showToast('No records found for selected range.', 'info');
  }, [api, viewFrom, viewTo, showToast]);

  const downloadReportPdf = useCallback(() => {
    if (!viewData || !viewData.rows?.length) {
      showToast('Load report first.', 'err'); return;
    }
    const body = viewData.rows.map((r) => [
      r.teacherId,
      r.name,
      r.subject || '',
      String(r.present),
      String(r.absent),
      String(r.leave),
      String(r.total),
      `${r.pct}%`,
    ]);
    const totP = viewData.rows.reduce((s, r) => s + r.present, 0);
    const totA = viewData.rows.reduce((s, r) => s + r.absent, 0);
    const totL = viewData.rows.reduce((s, r) => s + r.leave, 0);
    const totAll = totP + totA + totL;
    const avgPct = totAll ? ((totP / totAll) * 100).toFixed(1) : '0.0';

    downloadAttendancePdf({
      title: 'Teacher Attendance Report',
      subtitle: `Full Summary`,
      head: ['ID', 'Name', 'Subject', 'Present', 'Absent', 'Leave', 'Total', 'Attendance %'],
      body,
      summaryLines: [
        `Teachers: ${viewData.rows.length}`,
        `Recorded Days: ${viewData.dates?.length ?? 0}`,
        `Total Present: ${totP}`,
        `Total Absent: ${totA}`,
        `Total Leave: ${totL}`,
        `Average Attendance: ${avgPct}%`,
      ],
      filename: `teachers-attendance-report.pdf`,
    });
    showToast('Report downloaded.', 'ok');
  }, [showToast, viewData]);

  const downloadDailyPdf = useCallback(() => {
    if (!teachers?.length) {
      showToast('No teacher attendance data to download.', 'err');
      return;
    }
    const dateStr = markDateLabel || formatDateIN(attDate);
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
      <FilterTabs tabs={TABS} activeId={tab} onChange={(id) => { setTab(id); setViewData(null); setSum(null); }} />

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
                { label: 'Leave',   value: saveResult.leave,   color: '#d97706' },
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

      {(tab === 'mark' || tab === 'edit') && (
        <>
          {/* Filter card — stays on page */}
          <Card>
            <CardTitle>{tab === 'edit' ? 'Edit teacher attendance' : 'Mark teacher attendance'}</CardTitle>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
              {tab === 'edit'
                ? 'Pick a date, click Load to open saved attendance and adjust marks.'
                : 'Pick a date, then click Load Attendance to open the marking form.'}
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
                <Button type="button" onClick={loadAndOpen}>
                  {tab === 'edit' ? 'Load & Edit Attendance' : 'Load Attendance'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Teacher Attendance Marking Modal */}
          <Modal
            open={markModalOpen}
            title={`${tab === 'edit' ? 'Edit' : 'Mark'} Attendance — ${markDateLabel}`}
            onClose={() => setMarkModalOpen(false)}
            className="modal-wide"
          >
            {/* Live stat strip */}
            {(teachers || []).length > 0 && (() => {
              const list = teachers || [];
              const present = list.filter((t) => (att[t.Teacher_ID] || 'P') === 'P').length;
              const absent  = list.filter((t) => att[t.Teacher_ID] === 'A').length;
              const leave   = list.filter((t) => att[t.Teacher_ID] === 'L').length;
              return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total',   value: list.length, color: 'var(--text)' },
                    { label: 'Present', value: present,     color: 'var(--success,#059669)' },
                    { label: 'Absent',  value: absent,      color: 'var(--danger,#e11d48)' },
                    { label: 'Leave',   value: leave,       color: '#d97706' },
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
                    <th>ID</th>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>P / A / L</th>
                  </tr>
                </thead>
                <tbody>
                  {(teachers || []).map((t) => (
                    <tr key={t.Teacher_ID}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.Teacher_ID}</td>
                      <td style={{ fontWeight: 600 }}>{esc(t.Name)}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{esc(t.Subject || '—')}</td>
                      <td>
                        <div className="att-segment">
                          {['P', 'A', 'L'].map((code) => {
                            const rid = `${t.Teacher_ID}-${code}`;
                            return (
                              <Fragment key={code}>
                                <input
                                  type="radio"
                                  name={`tatt-${t.Teacher_ID}`}
                                  id={rid}
                                  value={code}
                                  checked={(att[t.Teacher_ID] || 'P') === code}
                                  onChange={() => setAtt((prev) => ({ ...prev, [t.Teacher_ID]: code }))}
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
              {isAdmin && (
                <Button type="button" variant="ghost" onClick={downloadDailyPdf}>
                  Download PDF
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setMarkModalOpen(false)} style={{ marginLeft: 'auto' }}>
                Cancel
              </Button>
            </div>
          </Modal>
        </>
      )}

      {tab === 'view' && (
        <Card>
          <CardTitle>Teacher Attendance Report</CardTitle>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Select a date range to see attendance summary for all teachers.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>From Date</label>
              <input type="date" value={viewFrom} onChange={(e) => { setViewFrom(e.target.value); setViewData(null); }} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>To Date</label>
              <input type="date" value={viewTo} onChange={(e) => { setViewTo(e.target.value); setViewData(null); }} />
            </div>
            <Button onClick={loadViewAttendance} disabled={viewLoading} style={{ alignSelf: 'flex-end' }}>
              {viewLoading ? 'Loading…' : 'Load Report'}
            </Button>
            {viewData && (
              <Button type="button" variant="ghost" onClick={() => setViewData(null)} style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                Clear
              </Button>
            )}
          </div>
          {viewLoading && <Spinner />}
        </Card>
      )}

      {/* ══════════════ Teacher Attendance Result Modal ══════════════ */}
      <Modal
        open={!!(viewData && !viewLoading)}
        title={`Teacher Attendance — ${viewFrom} to ${viewTo}`}
        onClose={() => setViewData(null)}
        className="modal-wide"
      >
        {viewData && (() => {
          const allRows = viewData.rows || [];
          const totP = allRows.reduce((s, r) => s + r.present, 0);
          const totA = allRows.reduce((s, r) => s + r.absent, 0);
          const totL = allRows.reduce((s, r) => s + r.leave, 0);
          const totAll = totP + totA + totL;
          const avgPct = totAll ? ((totP / totAll) * 100).toFixed(1) : '0.0';
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="button" variant="ghost" size="sm" onClick={downloadReportPdf}>
                  Download PDF
                </Button>
              </div>

              {/* Stat strip */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                {[
                  { label: 'Teachers', value: allRows.length },
                  { label: 'Days in Range', value: viewData.dates?.length ?? 0 },
                  { label: 'Avg Attendance', value: `${avgPct}%`, color: 'var(--success,#16a34a)' },
                  { label: 'Total Present', value: totP, color: 'var(--success,#16a34a)' },
                  { label: 'Total Absent',  value: totA, color: 'var(--danger,#e53935)' },
                  { label: 'Total Leave',   value: totL, color: '#d97706' },
                ].map((t) => (
                  <div key={t.label} style={{ flex: 1, minWidth: 90, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: t.color || 'var(--text)' }}>{t.value}</div>
                  </div>
                ))}
              </div>

              {allRows.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>No records in this date range.</p>
              ) : (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Teacher</th>
                        <th>Subject</th>
                        <th style={{ color: 'var(--success,#16a34a)' }}>Present</th>
                        <th style={{ color: 'var(--danger,#e53935)' }}>Absent</th>
                        <th style={{ color: '#d97706' }}>Leave</th>
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
                        const pctColor = pct >= 90 ? 'var(--success,#16a34a)' : pct >= 75 ? '#d97706' : 'var(--danger,#e53935)';
                        return (
                          <tr key={r.teacherId}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{esc(r.teacherId)}</td>
                            <td style={{ fontWeight: 600 }}>{esc(r.name)}</td>
                            <td style={{ fontSize: '0.85rem' }}>{esc(r.subject || '—')}</td>
                            <td style={{ textAlign: 'center', color: 'var(--success,#16a34a)', fontWeight: 600 }}>{r.present}</td>
                            <td style={{ textAlign: 'center', color: 'var(--danger,#e53935)', fontWeight: 600 }}>{r.absent}</td>
                            <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 600 }}>{r.leave}</td>
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
              )}
            </>
          );
        })()}
      </Modal>

      {(tab === 'mark' || tab === 'edit') && (
        <Card>
          <CardTitle>Individual Summary</CardTitle>
          <form className="filter-bar" onSubmit={loadSum}>
            <input 
              placeholder="Teacher ID (e.g. TCH_001)" 
              style={{ flex: 1 }} 
              value={sumQuery}
              onChange={(e) => setSumQuery(e.target.value)}
            />
            <Button type="submit" variant="teal">View</Button>
            {sum && (
              <Button type="button" variant="ghost" onClick={() => { setSum(null); setSumQuery(''); }}>
                Clear
              </Button>
            )}
          </form>
          {sum && (
            <div style={{ marginTop: 14, background: 'var(--sidebar-bg,#f0f4ff)', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.9rem' }}>
                <span>Total: <strong>{sum.total}</strong></span>
                <span style={{ color: 'var(--success,#16a34a)' }}>Present: <strong>{sum.present}</strong></span>
                <span style={{ color: 'var(--danger,#e53935)' }}>Absent: <strong>{sum.absent}</strong></span>
                <span style={{ color: '#d97706' }}>Leave: <strong>{sum.leave}</strong></span>
                <span>Attendance: <strong>{sum.pct}%</strong></span>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
