import { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { IconExams, IconMarks, IconResults, IconEdit, IconRefresh, IconTrash } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../hooks/useAuth.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { formatDateIN, esc } from '../utils/format.js';
import MarksResultsPage from './MarksResultsPage.jsx';

const EXAM_TYPES = ['Exam', 'Test', 'Quiz', 'Unit Test', 'Half Yearly', 'Annual', 'Pre-Board'];
const PAGE_SIZE = 15;

const TABS = [
  { id: 'tests', label: 'Tests', Icon: IconExams },
  { id: 'marks', label: 'Enter Marks', Icon: IconMarks },
  { id: 'results', label: 'View Results', Icon: IconResults },
];

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

export default function TeacherPortalPage() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/exams" replace />;
  if (user?.role !== 'teacher') return <Navigate to="/" replace />;
  return <TeacherPortalInner />;
}

function TeacherPortalInner() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('tests');

  const loadData = useCallback(() => api.getMarksTeacherData(), [api]);
  const { data, loading, error, refresh } = useAsyncResource(loadData);

  const meta = data?.meta;
  const teacherClass = meta?.class ? String(meta.class) : '';
  const teacherSection = meta?.section ? String(meta.section) : '';
  const teacherName = meta?.teacherName || '';

  const classExams = useMemo(() => {
    if (!data?.exams) return [];
    return data.exams.filter((e) => String(e.Class) === teacherClass);
  }, [data, teacherClass]);

  const classStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s) =>
      String(s.Class) === teacherClass && String(s.Section) === teacherSection
    );
  }, [data, teacherClass, teacherSection]);

  // ── Tests tab state ────────────────────────────────────────────────────────
  const [editExam, setEditExam] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [addTestModalOpen, setAddTestModalOpen] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [examPage, setExamPage] = useState(1);

  const filteredExams = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return classExams;
    return classExams.filter((x) =>
      String(x.Exam_Name || '').toLowerCase().includes(q) ||
      String(x.Subject || '').toLowerCase().includes(q) ||
      String(x.Exam_Type || '').toLowerCase().includes(q)
    );
  }, [classExams, examSearch]);

  const pagedExams = useMemo(() => {
    const start = (examPage - 1) * PAGE_SIZE;
    return filteredExams.slice(start, start + PAGE_SIZE);
  }, [filteredExams, examPage]);

  const addExam = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.addExam({
      examName: fd.get('nm'),
      examType: fd.get('type'),
      cls: teacherClass,
      subject: fd.get('sub'),
      date: formatDateIN(fd.get('dt') || ''),
      examTime: fd.get('time'),
      maxMarks: fd.get('mx'),
      passMarks: fd.get('ps'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { e.target.reset(); setAddTestModalOpen(false); refresh(); setExamPage(1); }
  }, [api, refresh, showToast, teacherClass]);

  const saveEditExam = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.updateExam(editExam.Exam_ID, {
      examName: fd.get('nm'),
      examType: fd.get('type'),
      cls: teacherClass,
      subject: fd.get('sub'),
      date: formatDateIN(fd.get('dt') || ''),
      examTime: fd.get('time'),
      maxMarks: fd.get('mx'),
      passMarks: fd.get('ps'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { setEditExam(null); refresh(); }
  }, [api, editExam, refresh, showToast, teacherClass]);

  const delExam = useCallback((id) => {
    setConfirm({
      title: 'Delete test?',
      message: 'Remove this test? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await api.deleteExam(id);
        showToast(res.msg, res.ok ? 'ok' : 'err');
        if (res.ok) refresh();
        setConfirm(null);
      },
    });
  }, [api, refresh, showToast]);

  // ── Marks tab state ────────────────────────────────────────────────────────
  const [selectedExamId, setSelectedExamId] = useState('');
  const [editMark, setEditMark] = useState(null);

  const selectedExam = useMemo(() =>
    classExams.find((e) => e.Exam_ID === selectedExamId),
    [classExams, selectedExamId]
  );

  const examMarks = useMemo(() => {
    if (!data?.marks || !selectedExamId) return [];
    return data.marks.filter((m) => m.Exam_ID === selectedExamId);
  }, [data, selectedExamId]);

  const addMark = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sid = fd.get('sid');
    const student = classStudents.find((s) => String(s.Student_ID) === sid);
    const res = await api.addMarks({
      examId: selectedExamId,
      studentId: sid,
      studentName: student?.Name || '',
      cls: teacherClass,
      subject: fd.get('sub'),
      marksObtained: fd.get('obt'),
      maxMarks: selectedExam?.Max_Marks || 100,
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { e.target.reset(); refresh(); }
  }, [api, refresh, showToast, selectedExamId, selectedExam, classStudents, teacherClass]);

  const saveEditMark = useCallback(async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const res = await api.updateMarks(editMark.Mark_ID, {
      marksObtained: fd.get('obt'),
      maxMarks: fd.get('mx'),
    });
    showToast(res.msg, res.ok ? 'ok' : 'err');
    if (res.ok) { setEditMark(null); refresh(); }
  }, [api, editMark, refresh, showToast]);

  const delMark = useCallback((id) => {
    setConfirm({
      title: 'Delete marks entry?',
      message: 'Remove this marks entry?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        const res = await api.deleteMark(id);
        showToast(res.msg, res.ok ? 'ok' : 'err');
        if (res.ok) refresh();
        setConfirm(null);
      },
    });
  }, [api, refresh, showToast]);

  if (loading && !data) return <div style={{ padding: 48 }}><Spinner /></div>;
  if (error) return <Card><CardTitle>Error</CardTitle><p>{String(error.message)}</p><Button onClick={refresh}>Retry</Button></Card>;
  if (meta?.noProfile) return <Card><CardTitle>Teacher Portal</CardTitle><p>Your account is not linked to a teacher profile. Contact the administrator.</p></Card>;

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

      {/* Edit exam modal */}
      <Modal open={!!editExam} title="Edit Test" onClose={() => setEditExam(null)}>
        {editExam && (
          <form className="form-grid" onSubmit={saveEditExam}>
            <div className="form-group"><label>Exam Name *</label><input name="nm" required defaultValue={editExam.Exam_Name} /></div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" defaultValue={editExam.Exam_Type || 'Exam'}>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Subject *</label><input name="sub" required defaultValue={editExam.Subject} /></div>
            <div className="form-group"><label>Date</label><input name="dt" type="date" defaultValue={editExam.Exam_Date} /></div>
            <div className="form-group"><label>Time</label><input name="time" type="time" defaultValue={editExam.Exam_Time} /></div>
            <div className="form-group"><label>Max Marks</label><input name="mx" type="number" defaultValue={editExam.Max_Marks ?? 100} /></div>
            <div className="form-group"><label>Pass Marks</label><input name="ps" type="number" defaultValue={editExam.Pass_Marks ?? 33} /></div>
            <div className="form-group full btn-row">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditExam(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit marks modal */}
      <Modal open={!!editMark} title="Update Marks" onClose={() => setEditMark(null)}>
        {editMark && (
          <form className="form-grid" onSubmit={saveEditMark}>
            <div style={{ gridColumn: '1 / -1', marginBottom: 8, fontSize: '0.88rem' }}>
              <strong>{esc(editMark.Student_Name)}</strong> — {esc(editMark.Subject)}
            </div>
            <div className="form-group">
              <label>Marks Obtained *</label>
              <input name="obt" type="number" min={0} required defaultValue={editMark.Marks_Obtained} />
            </div>
            <div className="form-group">
              <label>Max Marks</label>
              <input name="mx" type="number" defaultValue={editMark.Max_Marks} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Update Marks</Button>
              <Button type="button" variant="ghost" onClick={() => setEditMark(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Teacher info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe',
        marginBottom: 16, fontSize: '0.88rem', color: '#1e40af', fontWeight: 600,
      }}>
        <span>Teacher Portal</span>
        {teacherName && <span style={{ fontWeight: 400, color: '#3b82f6' }}>— {teacherName}</span>}
        {teacherClass && (
          <span style={{ marginLeft: 'auto', background: '#dbeafe', padding: '2px 10px', borderRadius: 20 }}>
            Class {teacherClass}{teacherSection ? ` – ${teacherSection}` : ''}
          </span>
        )}
      </div>

      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />

      {/* ════════════════ TESTS TAB ════════════════ */}
      {tab === 'tests' && (

        <>
          <Card>
            <SectionHeader
              title={`Tests — Class ${teacherClass}`}
              actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button onClick={() => setAddTestModalOpen(true)} size="sm" variant="primary">Add Test</Button>
                  <input
                    placeholder="Search tests…"
                    value={examSearch}
                    onChange={(e) => { setExamSearch(e.target.value); setExamPage(1); }}
                    style={{ fontSize: '0.85rem', minWidth: 180 }}
                  />
                  <Button onClick={refresh} size="sm" variant="ghost"><IconRefresh size={14} /></Button>
                </div>
              }
            />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Max</th>
                    <th>Pass</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagedExams.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No tests found for your class.</td></tr>
                  ) : pagedExams.map((x) => (
                    <tr key={x.Exam_ID}>
                      <td style={{ fontWeight: 600 }}>{esc(x.Exam_Name)}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'var(--accent)22', color: 'var(--accent)' }}>
                          {esc(x.Exam_Type || 'Exam')}
                        </span>
                      </td>
                      <td>{esc(x.Subject)}</td>
                      <td style={{ fontSize: '0.82rem' }}>{esc(x.Exam_Date) || '—'}</td>
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

          <Modal open={addTestModalOpen} title="Add Test / Exam" onClose={() => setAddTestModalOpen(false)}>
            <form className="form-grid" onSubmit={addExam}>
              <div className="form-group"><label>Exam Name *</label><input name="nm" required placeholder="e.g. Unit Test 1" /></div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" defaultValue="Test">
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Subject *</label><input name="sub" required placeholder="e.g. Mathematics" /></div>
              <div className="form-group"><label>Date</label><input name="dt" type="date" /></div>
              <div className="form-group"><label>Time</label><input name="time" type="time" /></div>
              <div className="form-group"><label>Max Marks</label><input name="mx" type="number" defaultValue={100} /></div>
              <div className="form-group"><label>Pass Marks</label><input name="ps" type="number" defaultValue={33} /></div>
              <div className="form-group full" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Class {teacherClass} will be assigned automatically.
              </div>
              <div className="form-group full btn-row"><Button type="submit">Add Test</Button></div>
            </form>
          </Modal>
        </>
      )}

      {/* ════════════════ MARKS TAB ════════════════ */}
      {tab === 'marks' && (
        <Card>
          <CardTitle>Enter / Update Marks</CardTitle>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Select Test / Exam *</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">— Select an exam —</option>
              {classExams.map((e) => (
                <option key={e.Exam_ID} value={e.Exam_ID}>
                  {e.Exam_Name} ({e.Subject}){e.Exam_Date ? ` — ${e.Exam_Date}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedExamId ? (
            <>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>Add New Entry</div>
                <form className="form-grid" onSubmit={addMark}>
                  <div className="form-group">
                    <label>Student *</label>
                    <select name="sid" required>
                      <option value="">— Select student —</option>
                      {classStudents.map((s) => (
                        <option key={s.Student_ID} value={s.Student_ID}>
                          {s.Name} (Roll {s.Roll_No ?? '?'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Subject *</label>
                    <input name="sub" required defaultValue={selectedExam?.Subject || ''} placeholder="Subject" />
                  </div>
                  <div className="form-group">
                    <label>Marks Obtained * (max {selectedExam?.Max_Marks ?? 100})</label>
                    <input name="obt" type="number" min={0} max={selectedExam?.Max_Marks || 1000} required />
                  </div>
                  <div className="form-group full btn-row">
                    <Button type="submit" variant="accent">Save Marks</Button>
                  </div>
                </form>
              </div>

              <div style={{ marginTop: 20 }}>
                <SectionHeader
                  title={`Entries — ${esc(selectedExam?.Exam_Name || '')}`}
                  actions={
                    <Button onClick={refresh} size="sm" variant="ghost"><IconRefresh size={14} /></Button>
                  }
                />
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>Result</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {examMarks.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No marks entered yet for this exam.</td></tr>
                      ) : examMarks.map((m) => (
                        <tr key={m.Mark_ID}>
                          <td style={{ fontWeight: 600 }}>{esc(m.Student_Name)}</td>
                          <td>{esc(m.Subject)}</td>
                          <td><strong>{m.Marks_Obtained}</strong>/{m.Max_Marks}</td>
                          <td><GradeBadge grade={m.Grade} /></td>
                          <td style={{ fontWeight: 700, color: m.Result === 'Pass' ? '#16a34a' : '#dc2626' }}>{m.Result}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditMark(m)} title="Edit marks">
                                <IconEdit size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => delMark(m.Mark_ID)} style={{ color: 'var(--err)' }} title="Delete">
                                <IconTrash size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Select a test above to enter or update marks.
            </p>
          )}
        </Card>
      )}

      {/* ════════════════ RESULTS TAB ════════════════ */}
      {tab === 'results' && <MarksResultsPage teacherAccess />}
    </>
  );
}
