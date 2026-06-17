import { useCallback, useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { IconExams, IconMarks, IconRefresh, IconEdit } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { formatDateIN, esc } from '../utils/format.js';

const TABS = [
  { id: 'ex', label: 'Exam Details', Icon: IconExams },
  { id: 'mk', label: 'Marks', Icon: IconMarks },
];

const EXAM_TYPES = ['Exam', 'Test', 'Quiz', 'Unit Test', 'Half Yearly', 'Annual', 'Pre-Board'];
const PAGE_SIZE = 15;

export default function ExamsPage() {
  const api = useApi();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const { showToast } = useToast();
  const [tab, setTab] = useState('ex');
  const [confirm, setConfirm] = useState(null);
  const [editExam, setEditExam] = useState(null);
  const [addExamModalOpen, setAddExamModalOpen] = useState(false);
  const [addMarkModalOpen, setAddMarkModalOpen] = useState(false);

  // Load teacher's assigned class so we can pre-fill the form
  const loadMeta = useCallback(() => isTeacher ? api.getMarksTeacherData() : Promise.resolve(null), [api, isTeacher]);
  const { data: teacherMeta } = useAsyncResource(loadMeta);
  const teacherClass = teacherMeta?.meta?.class ? String(teacherMeta.meta.class) : '';
  const teacherName = teacherMeta?.meta?.teacherName || '';

  // Pagination
  const [examPage, setExamPage] = useState(1);
  const [markPage, setMarkPage] = useState(1);

  // Search
  const [examSearch, setExamSearch] = useState('');
  const [markSearch, setMarkSearch] = useState('');

  const loadE = useCallback(() => api.getAllExams(), [api]);
  const loadM = useCallback(() => api.getAllMarks(), [api]);
  const { data: exams, loading: le, refresh: re } = useAsyncResource(loadE);
  const { data: marks, loading: lm, refresh: rm } = useAsyncResource(loadM);

  // ── Filtered + paged exams ─────────────────────────────────────────────
  const filteredExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return exams || [];
    return (exams || []).filter((x) =>
      String(x.Exam_Name || '').toLowerCase().includes(q) ||
      String(x.Subject || '').toLowerCase().includes(q) ||
      String(x.Exam_Type || '').toLowerCase().includes(q) ||
      String(x.Class || '').toLowerCase().includes(q)
    );
  }, [exams, examSearch]);

  const pagedExams = useMemo(() => {
    const start = (examPage - 1) * PAGE_SIZE;
    return filteredExams.slice(start, start + PAGE_SIZE);
  }, [filteredExams, examPage]);

  // ── Filtered + paged marks ─────────────────────────────────────────────
  const filteredMarks = useMemo(() => {
    const q = markSearch.trim().toLowerCase();
    if (!q) return marks || [];
    return (marks || []).filter((m) =>
      String(m.Student_ID || '').toLowerCase().includes(q) ||
      String(m.Student_Name || '').toLowerCase().includes(q) ||
      String(m.Roll_No ?? '').toLowerCase().includes(q) ||
      String(m.Exam_Name || '').toLowerCase().includes(q) ||
      String(m.Subject || '').toLowerCase().includes(q)
    );
  }, [marks, markSearch]);

  const pagedMarks = useMemo(() => {
    const start = (markPage - 1) * PAGE_SIZE;
    return filteredMarks.slice(start, start + PAGE_SIZE);
  }, [filteredMarks, markPage]);

  // ── Add exam ───────────────────────────────────────────────────────────
  const addExam = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.addExam({
      examName: fd.get('nm'),
      examType: fd.get('type'),
      cls: fd.get('cls'),
      subject: fd.get('sub'),
      date: formatDateIN(fd.get('dt') || ''),
      examTime: fd.get('time'),
      maxMarks: fd.get('mx'),
      passMarks: fd.get('ps'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { e.target.reset(); re(); setExamPage(1); setAddExamModalOpen(false); }
  }, [api, re, showToast]);

  // ── Update exam ────────────────────────────────────────────────────────
  const saveEditExam = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.updateExam(editExam.Exam_ID, {
      examName: fd.get('nm'),
      examType: fd.get('type'),
      cls: fd.get('cls'),
      subject: fd.get('sub'),
      date: formatDateIN(fd.get('dt') || ''),
      examTime: fd.get('time'),
      maxMarks: fd.get('mx'),
      passMarks: fd.get('ps'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { setEditExam(null); re(); }
  }, [api, editExam, re, showToast]);

  // ── Add mark ───────────────────────────────────────────────────────────
  const addMark = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.addMarks({
      examId: fd.get('eid'),
      studentId: fd.get('sid'),
      studentName: fd.get('snm') || '',
      cls: '',
      subject: fd.get('sub'),
      marksObtained: fd.get('obt'),
      maxMarks: fd.get('mx'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { rm(); setMarkPage(1); setAddMarkModalOpen(false); }
  }, [api, rm, showToast]);

  // ── Delete exam ────────────────────────────────────────────────────────
  const delExam = useCallback((id) => {
    setConfirm({
      title: 'Delete exam?',
      message: `Remove exam ${id}? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await api.deleteExam(id);
        showToast(res.msg, res.ok ? 'ok' : 'err');
        if (res.ok) re();
        setConfirm(null);
      },
    });
  }, [api, re, showToast]);

  // ── Delete mark ────────────────────────────────────────────────────────
  const delMark = useCallback((id) => {
    setConfirm({
      title: 'Delete marks entry?',
      message: `Remove mark record ${id}?`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await api.deleteMark(id);
        showToast(res.msg, res.ok ? 'ok' : 'err');
        if (res.ok) rm();
        setConfirm(null);
      },
    });
  }, [api, rm, showToast]);

  if ((le && !exams) || (lm && !marks)) return <Spinner />;

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

      {/* ── Edit exam modal ─────────────────────────────────────────────── */}
      <Modal open={!!editExam} title="Edit Exam" onClose={() => setEditExam(null)}>
        {editExam && (
          <form className="form-grid" onSubmit={saveEditExam}>
            <div className="form-group">
              <label>Exam Name *</label>
              <input name="nm" required defaultValue={editExam.Exam_Name} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" defaultValue={editExam.Exam_Type || 'Exam'}>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Class *</label>
              <select name="cls" required defaultValue={editExam.Class}>
                <option value="">--</option>
                {[...Array(12)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <input name="sub" required defaultValue={editExam.Subject} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input name="dt" type="date" defaultValue={editExam.Exam_Date} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input name="time" type="time" defaultValue={editExam.Exam_Time} />
            </div>
            <div className="form-group">
              <label>Max Marks</label>
              <input name="mx" type="number" defaultValue={editExam.Max_Marks ?? 100} />
            </div>
            <div className="form-group">
              <label>Pass Marks</label>
              <input name="ps" type="number" defaultValue={editExam.Pass_Marks ?? 33} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditExam(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Teacher info banner */}
      {isTeacher && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe',
          marginBottom: 16, fontSize: '0.88rem', color: '#1e40af', fontWeight: 600,
        }}>
          <span>Teacher Mode</span>
          {teacherName && <span style={{ fontWeight: 400, color: '#3b82f6' }}>— {teacherName}</span>}
          {teacherClass && <span style={{ marginLeft: 'auto', background: '#dbeafe', padding: '2px 10px', borderRadius: 20 }}>Class {teacherClass}</span>}
        </div>
      )}

      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />

      {/* ════════════════ EXAM DETAILS TAB ════════════════ */}
      {tab === 'ex' && (
        <>

          <Card>
            <SectionHeader
              title="Exam Records"
              actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button onClick={() => setAddExamModalOpen(true)} size="sm" variant="primary">Add Exam</Button>
                  <input
                    placeholder="Search exams…"
                    value={examSearch}
                    onChange={(e) => { setExamSearch(e.target.value); setExamPage(1); }}
                    style={{ fontSize: '0.85rem', minWidth: 180 }}
                  />
                  <Button onClick={() => re()} size="sm" variant="ghost"><IconRefresh size={14} /></Button>
                </div>
              }
            />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Exam Name</th>
                    <th>Type</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Max</th>
                    <th>Pass</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagedExams.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No exams found.</td></tr>
                  ) : pagedExams.map((x) => (
                    <tr key={x.Exam_ID}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{esc(x.Exam_ID)}</td>
                      <td style={{ fontWeight: 600 }}>{esc(x.Exam_Name)}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent)22', color: 'var(--accent)' }}>
                          {esc(x.Exam_Type || 'Exam')}
                        </span>
                      </td>
                      <td>{esc(x.Class)}</td>
                      <td>{esc(x.Subject)}</td>
                      <td style={{ fontSize: '0.82rem' }}>{esc(x.Exam_Date) || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{esc(x.Exam_Time) || '—'}</td>
                      <td>{esc(x.Max_Marks)}</td>
                      <td>{esc(x.Pass_Marks)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditExam(x)} title="Edit">
                            <IconEdit size={14} />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => delExam(x.Exam_ID)}>Del</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          <PaginationBar page={examPage} pageSize={PAGE_SIZE} total={filteredExams.length} onPageChange={setExamPage} />
          </Card>
          <Modal open={addExamModalOpen} title="Add Exam" onClose={() => setAddExamModalOpen(false)}>
            <form className="form-grid" onSubmit={addExam}>
              <div className="form-group">
                <label>Exam Name *</label>
                <input name="nm" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" defaultValue="Exam">
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Class *</label>
                <select name="cls" required defaultValue={teacherClass}>
                  <option value="">--</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input name="sub" required />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input name="dt" type="date" />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input name="time" type="time" />
              </div>
              <div className="form-group">
                <label>Max Marks</label>
                <input name="mx" type="number" defaultValue={100} />
              </div>
              <div className="form-group">
                <label>Pass Marks</label>
                <input name="ps" type="number" defaultValue={33} />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit">Add Exam</Button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* ════════════════ MARKS TAB ════════════════ */}
      {tab === 'mk' && (
        <>

          <Card>
            <SectionHeader
              title="All Marks"
              actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button onClick={() => setAddMarkModalOpen(true)} size="sm" variant="primary">Enter Marks</Button>
                  <input
                    placeholder="Search by student, roll no, exam…"
                    value={markSearch}
                    onChange={(e) => { setMarkSearch(e.target.value); setMarkPage(1); }}
                    style={{ fontSize: '0.85rem', minWidth: 220 }}
                  />
                  <Button onClick={() => rm()} size="sm" variant="ghost"><IconRefresh size={14} /></Button>
                </div>
              }
            />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mark ID</th>
                    <th>Exam Name</th>
                    <th>Roll</th>
                    <th>Student ID</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Grade</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagedMarks.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No marks found.</td></tr>
                  ) : pagedMarks.map((m) => (
                    <tr key={m.Mark_ID}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc(m.Mark_ID)}</td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{esc(m.Exam_Name) || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{m.Roll_No ?? '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc(m.Student_ID)}</td>
                      <td style={{ fontWeight: 600 }}>{esc(m.Student_Name)}</td>
                      <td>{esc(m.Subject)}</td>
                      <td><strong>{esc(m.Marks_Obtained)}</strong>/{esc(m.Max_Marks)}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                          background: m.Grade === 'A' ? '#dcfce7' : m.Grade === 'B' ? '#dbeafe' : m.Grade === 'F' ? '#fee2e2' : '#fef9c3',
                          color: m.Grade === 'A' ? '#16a34a' : m.Grade === 'B' ? '#2563eb' : m.Grade === 'F' ? '#dc2626' : '#a16207',
                        }}>
                          {esc(m.Grade)}
                        </span>
                      </td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => delMark(m.Mark_ID)}>Del</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          <PaginationBar page={markPage} pageSize={PAGE_SIZE} total={filteredMarks.length} onPageChange={setMarkPage} />
          </Card>
          <Modal open={addMarkModalOpen} title="Enter Marks" onClose={() => setAddMarkModalOpen(false)}>
            <form className="form-grid" onSubmit={addMark}>
              <div className="form-group">
                <label>Exam ID *</label>
                <input name="eid" required placeholder="e.g. EXM_12345678" />
              </div>
              <div className="form-group">
                <label>Student ID *</label>
                <input name="sid" required placeholder="e.g. STU_1001" />
              </div>
              <div className="form-group">
                <label>Student Name</label>
                <input name="snm" placeholder="Optional" />
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <input name="sub" required />
              </div>
              <div className="form-group">
                <label>Obtained *</label>
                <input name="obt" type="number" min={0} required />
              </div>
              <div className="form-group">
                <label>Max Marks</label>
                <input name="mx" type="number" defaultValue={100} />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit" variant="accent">Save Marks</Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </>
  );
}
