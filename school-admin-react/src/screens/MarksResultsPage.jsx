import { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { buildStudentMarksReports } from '../services/marksReportBuilder.js';
import { createResultPdfBlob, downloadBlob } from '../utils/resultPdf.js';
import { downloadClassResultsZip } from '../utils/classResultsZip.js';
import { esc } from '../utils/format.js';
import { IconEdit, IconTrash } from '../components/common/Icons.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

const PERIOD_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '1m', label: 'Last 1 month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last 1 year' },
];

const EXAM_TYPES = ['Exam', 'Test', 'Quiz', 'Unit Test', 'Half Yearly', 'Annual', 'Pre-Board'];

// ── Grade badge ────────────────────────────────────────────────────────────────
function GradeBadge({ grade }) {
  const color = { A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#ea580c', F: '#dc2626' }[
    String(grade).charAt(0).toUpperCase()
  ] || '#64748b';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: '0.75rem', fontWeight: 700, background: color + '22', color,
    }}>
      {grade}
    </span>
  );
}

// ── Homework section (teacher only) ────────────────────────────────────────────
function TeacherHomeworkSection({ api, classLabel, cls, sec }) {
  const { showToast } = useToast();
  const load = useCallback(() => api.getHomeworkForTeacher(), [api]);
  const { data: list, loading, refresh } = useAsyncResource(load);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.addHomework({ subject: fd.get('subject'), title: fd.get('title'), dueDate: fd.get('dueDate'), description: fd.get('description'), cls, section: sec });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { e.target.reset(); refresh(); }
  }, [api, refresh, showToast, cls, sec]);

  const update = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.updateHomework(editing.Homework_ID, { subject: fd.get('subject'), title: fd.get('title'), dueDate: fd.get('dueDate'), description: fd.get('description'), cls, section: sec });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { setEditing(null); refresh(); }
  }, [api, editing, refresh, showToast, cls, sec]);

  const remove = useCallback((id) => {
    setConfirm({ title: 'Delete Homework', message: 'Delete this homework assignment?', confirmLabel: 'Delete', danger: true,
      onConfirm: async () => { const res = await api.deleteHomework(id); showToast(res.msg, res.ok ? 'ok' : 'err'); if (res.ok) refresh(); setConfirm(null); } });
  }, [api, refresh, showToast]);

  return (
    <>
      <Card style={{ marginTop: 16 }}>
        <CardTitle>Homework ({esc(classLabel)})</CardTitle>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group"><label>Subject *</label><input name="subject" required placeholder="e.g. Mathematics" /></div>
          <div className="form-group"><label>Title *</label><input name="title" required placeholder="Short title" /></div>
          <div className="form-group"><label>Due date</label><input name="dueDate" type="date" /></div>
          <div className="form-group full"><label>Instructions *</label><textarea name="description" required rows={3} placeholder="What students should complete…" /></div>
          <div className="form-group full btn-row"><Button type="submit">Post homework</Button></div>
        </form>
        {loading && !list ? <Spinner /> : (
          <div className="tbl-wrap" style={{ marginTop: 20 }}>
            <table>
              <thead><tr><th>Subject</th><th>Title</th><th>Due</th><th>Actions</th></tr></thead>
              <tbody>
                {!list?.length ? (
                  <tr><td colSpan={4} className="empty" style={{ padding: 16 }}>No homework posted yet.</td></tr>
                ) : list.map((h) => (
                  <tr key={h.Homework_ID}>
                    <td>{esc(h.Subject)}</td><td>{esc(h.Title)}</td><td>{esc(h.Due_Date || '—')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(h)}><IconEdit size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(h.Homework_ID)} style={{ color: 'var(--err)' }}><IconTrash size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={!!editing} title="Edit Homework" onClose={() => setEditing(null)}>
        {editing && (
          <form className="form-grid" onSubmit={update}>
            <div className="form-group"><label>Subject *</label><input name="subject" required defaultValue={editing.Subject} /></div>
            <div className="form-group"><label>Title *</label><input name="title" required defaultValue={editing.Title} /></div>
            <div className="form-group"><label>Due date</label><input name="dueDate" type="date" defaultValue={editing.Due_Date} /></div>
            <div className="form-group full"><label>Instructions *</label><textarea name="description" required rows={5} defaultValue={editing.Description} /></div>
            <div className="form-group full btn-row">
              <Button type="submit">Update homework</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.confirmLabel} danger={confirm?.danger} onConfirm={confirm?.onConfirm} onCancel={() => setConfirm(null)} />
    </>
  );
}

function csvEscape(v) { return `"${String(v).replace(/"/g, '""')}"`; }

export default function MarksResultsPage({ teacherAccess = false }) {
  const { t } = useTranslation();
  const api = useApi();
  const { showToast } = useToast();

  // Filters
  const [cls, setCls] = useState('');
  const [sec, setSec] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');
  const [examType, setExamType] = useState('');
  const [view, setView] = useState(null);

  const load = useCallback(
    () => (teacherAccess ? api.getMarksTeacherData() : api.getMarksAdminData()),
    [api, teacherAccess]
  );
  const { data, loading, error, refresh } = useAsyncResource(load);

  const initialDefaults = useMemo(() => {
    if (!teacherAccess || !data?.meta || data.meta.noProfile) return null;
    return { cls: String(data.meta.class ?? ''), sec: String(data.meta.section ?? '') };
  }, [teacherAccess, data]);

  useEffect(() => {
    if (initialDefaults && !cls) { setCls(initialDefaults.cls); setSec(initialDefaults.sec); }
  }, [initialDefaults, cls]);

  const classOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.students.map((s) => String(s.Class)));
    return [...set].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
  }, [data]);

  const sectionOptions = useMemo(() => {
    if (!data || !cls) return [];
    const set = new Set(data.students.filter((s) => String(s.Class) === String(cls)).map((s) => s.Section));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data, cls]);

  // Exam types actually present in data
  const examTypeOptions = useMemo(() => {
    if (!data?.marks) return EXAM_TYPES;
    const types = new Set(data.marks.map((m) => m.Exam_Type).filter(Boolean));
    return EXAM_TYPES.filter((t) => types.has(t));
  }, [data]);

  const reports = useMemo(() => {
    if (!data) return [];
    return buildStudentMarksReports(data.students, data.marks, {
      class: cls || undefined,
      section: sec || undefined,
      period,
      examType,
      search,
    });
  }, [data, cls, sec, period, examType, search]);

  const subjectColumns = useMemo(() => {
    const colSet = new Set();
    reports.forEach((r) => r.subjects.forEach((s) => colSet.add(s.subject)));
    return [...colSet].sort((a, b) => a.localeCompare(b));
  }, [reports]);

  const subjectCell = (report, subj) => {
    const m = report.subjects.find((x) => x.subject === subj);
    if (!m) return '—';
    return `${m.obtained}/${m.max}`;
  };

  const zipReady = Boolean(cls && sec);

  const handleZip = useCallback(async () => {
    if (!zipReady || reports.length === 0) { showToast('Select class and section, and ensure there are students.', 'err'); return; }
    try {
      await downloadClassResultsZip(reports, `Class-${cls}-${sec}-Results`);
      showToast(`ZIP downloaded (${reports.length} PDFs).`, 'ok');
    } catch (e) { showToast(String(e?.message || e), 'err'); }
  }, [zipReady, cls, sec, reports, showToast]);

  const handleOnePdf = useCallback((report) => {
    if (!report) return;
    const blob = createResultPdfBlob(report);
    downloadBlob(blob, `result-${report.rollNo ?? report.studentId}.pdf`);
    showToast('PDF downloaded.', 'ok');
  }, [showToast]);

  const downloadCsv = useCallback(() => {
    if (reports.length === 0) return;
    const head = ['Roll', 'Student ID', 'Name', 'Class', ...subjectColumns, 'Total', 'Percentage', 'Grade', 'Result'];
    const lines = [head.join(',')];
    for (const r of reports) {
      const row = [r.rollNo ?? '—', r.studentId, r.name, r.classLabel];
      for (const col of subjectColumns) {
        const m = r.subjects.find((x) => x.subject === col);
        row.push(m ? `${m.obtained}/${m.max}` : '');
      }
      row.push(`${r.totalObtained}/${r.totalMax}`, r.percentage, r.overallGrade, r.overallResult);
      lines.push(row.map((v) => csvEscape(v)).join(','));
    }
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `marks-${cls || 'all'}-${sec || 'all'}.csv`);
    showToast('CSV downloaded.', 'ok');
  }, [reports, subjectColumns, cls, sec, showToast]);

  const colCount = 8 + subjectColumns.length;

  if (loading) return <div style={{ padding: 48 }}><Spinner /></div>;
  if (error) return <Card><CardTitle>Error</CardTitle><p>{String(error.message)}</p><Button onClick={refresh}>Retry</Button></Card>;
  if (teacherAccess && data?.meta?.noProfile) return (
    <Card><CardTitle>{t('nav.results')}</CardTitle><p>Your account is not linked to a teacher profile. Contact the administrator.</p></Card>
  );

  return (
    <>
      <SectionHeader title={teacherAccess ? t('nav.results') : 'Marks & Results'} />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card>
        <CardTitle>Filters</CardTitle>
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
          {/* Search */}
          <input
            placeholder="Search by name, roll no, student ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 220 }}
          />
          {/* Class */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
            Class
            <select value={cls} onChange={(e) => { setCls(e.target.value); setSec(''); }}>
              <option value="">All classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {/* Section */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
            Section
            <select value={sec} onChange={(e) => setSec(e.target.value)} disabled={!cls}>
              <option value="">All sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          {/* Period */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {/* Exam type */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
            Exam Type
            <select value={examType} onChange={(e) => setExamType(e.target.value)}>
              <option value="">All types</option>
              {examTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Button type="button" variant="ghost" onClick={refresh} style={{ alignSelf: 'flex-end' }}>Refresh</Button>
        </div>
      </Card>

      {teacherAccess && typeof api.getHomeworkForTeacher === 'function' && (
        <TeacherHomeworkSection api={api} classLabel={`${cls || 'All'}–${sec || 'All'}`} cls={cls} sec={sec} />
      )}

      {/* ── Marks matrix ────────────────────────────────────────────────── */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <CardTitle>Subject Marks ({reports.length} students)</CardTitle>
          {!teacherAccess && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="button" variant="ghost" onClick={downloadCsv} disabled={reports.length === 0}>Download CSV</Button>
              <Button type="button" onClick={handleZip} disabled={!zipReady || reports.length === 0}>Download ZIP (PDFs)</Button>
            </div>
          )}
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
                {subjectColumns.map((c) => <th key={c}>{esc(c)}</th>)}
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr><td colSpan={colCount} className="empty" style={{ padding: 24 }}>No students found for this filter.</td></tr>
              ) : reports.map((r) => (
                <tr key={r.studentId}>
                  <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{r.rollNo ?? '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{esc(r.studentId)}</td>
                  <td style={{ fontWeight: 600 }}>{esc(r.name)}</td>
                  <td>{esc(r.classLabel)}</td>
                  {subjectColumns.map((c) => <td key={c}>{subjectCell(r, c)}</td>)}
                  <td><strong>{r.totalObtained}/{r.totalMax}</strong></td>
                  <td>{r.percentage}%</td>
                  <td><GradeBadge grade={r.overallGrade} /></td>
                  <td>
                    <span style={{ fontWeight: 700, color: r.overallResult === 'PASS' ? '#16a34a' : r.overallResult === 'FAIL' ? '#dc2626' : '#64748b' }}>
                      {r.overallResult}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setView(r)}>View</Button>
                      <Button type="button" size="sm" onClick={() => handleOnePdf(r)}>PDF</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Result detail modal ──────────────────────────────────────────── */}
      <Modal open={!!view} title={view ? `Result — ${esc(view.name)}` : ''} onClose={() => setView(null)}>
        {view && (
          <div>
            {/* Student info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginBottom: 16, fontSize: '0.88rem' }}>
              <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Roll No</span><br /><strong>{view.rollNo ?? '—'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Student ID</span><br /><strong>{view.studentId}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Class</span><br /><strong>{view.classLabel}</strong></div>
              <div><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Father</span><br /><strong>{view.fatherName || '—'}</strong></div>
            </div>

            {/* Marks table */}
            <div className="tbl-wrap">
              <table className="marksheet-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam Name</th>
                    <th>Type</th>
                    <th>Obtained</th>
                    <th>Max</th>
                    <th>Grade</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {view.subjects.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>No marks for selected filters.</td></tr>
                  ) : view.subjects.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{esc(s.subject)}</strong></td>
                      <td style={{ fontSize: '0.82rem' }}>{esc(s.examName) || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{esc(s.examType) || '—'}</td>
                      <td>{s.obtained}</td>
                      <td>{s.max}</td>
                      <td><GradeBadge grade={s.grade} /></td>
                      <td style={{ fontWeight: 700, color: s.result === 'Pass' ? '#16a34a' : '#dc2626' }}>{s.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary strip */}
            <div style={{
              marginTop: 16, padding: '12px 18px', borderRadius: 10,
              background: view.overallResult === 'PASS' ? '#dcfce7' : view.overallResult === 'FAIL' ? '#fee2e2' : 'var(--surface)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ fontSize: '0.9rem' }}>
                <strong>Total:</strong> {view.totalObtained} / {view.totalMax} &nbsp;·&nbsp;
                <strong>{view.percentage}%</strong> &nbsp;·&nbsp;
                Grade <GradeBadge grade={view.overallGrade} />
              </div>
              <span style={{
                fontWeight: 800, fontSize: '1rem',
                color: view.overallResult === 'PASS' ? '#15803d' : view.overallResult === 'FAIL' ? '#dc2626' : '#64748b',
              }}>
                {view.overallResult}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <Button type="button" onClick={() => handleOnePdf(view)}>Download PDF</Button>
              <Button type="button" variant="ghost" onClick={() => setView(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
