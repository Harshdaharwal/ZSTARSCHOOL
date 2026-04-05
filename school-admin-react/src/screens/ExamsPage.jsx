import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { formatDateIN, esc } from '../utils/format.js';

const TABS = [
  { id: 'ex', label: '📝 Exam Details' },
  { id: 'mk', label: '✏️ Marks' },
];

export default function ExamsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('ex');
  const [confirm, setConfirm] = useState(null);

  const loadE = useCallback(() => api.getAllExams(), [api]);
  const loadM = useCallback(() => api.getAllMarks(), [api]);
  const { data: exams, loading: le, refresh: re } = useAsyncResource(loadE);
  const { data: marks, loading: lm, refresh: rm } = useAsyncResource(loadM);

  const addExam = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addExam({
        examName: fd.get('nm'),
        cls: fd.get('cls'),
        subject: fd.get('sub'),
        date: formatDateIN(fd.get('dt') || ''),
        maxMarks: fd.get('mx'),
        passMarks: fd.get('ps'),
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        re();
      }
    },
    [api, re, showToast]
  );

  const addMark = useCallback(
    async (e) => {
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
      if (res.ok) {
        rm();
      }
    },
    [api, rm, showToast]
  );

  const delExam = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete exam?',
        message: `Remove exam ${id}?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const res = await api.deleteExam(id);
          showToast(res.msg, res.ok ? 'ok' : 'err');
          if (res.ok) re();
          setConfirm(null);
        },
      });
    },
    [api, re, showToast]
  );

  const delMark = useCallback(
    (id) => {
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
    },
    [api, rm, showToast]
  );

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
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />
      {tab === 'ex' && (
        <>
          <Card>
            <CardTitle>Add Exam</CardTitle>
            <form className="form-grid" onSubmit={addExam}>
              <div className="form-group">
                <label>Name *</label>
                <input name="nm" required />
              </div>
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
                <label>Subject *</label>
                <input name="sub" required />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input name="dt" type="date" />
              </div>
              <div className="form-group">
                <label>Max</label>
                <input name="mx" type="number" defaultValue={100} />
              </div>
              <div className="form-group">
                <label>Pass</label>
                <input name="ps" type="number" defaultValue={33} />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit">Add</Button>
              </div>
            </form>
          </Card>
          <Card>
            <SectionHeader title="Exams" actions={<Button onClick={() => re()}>🔄</Button>} />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(exams || []).map((x) => (
                    <tr key={x.Exam_ID}>
                      <td>{esc(x.Exam_ID)}</td>
                      <td>{esc(x.Exam_Name)}</td>
                      <td>{esc(x.Class)}</td>
                      <td>{esc(x.Subject)}</td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => delExam(x.Exam_ID)}>
                          Del
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
      {tab === 'mk' && (
        <>
          <Card>
            <CardTitle>Enter Marks</CardTitle>
            <form className="form-grid" onSubmit={addMark}>
              <div className="form-group">
                <label>Exam ID *</label>
                <input name="eid" required />
              </div>
              <div className="form-group">
                <label>Student ID *</label>
                <input name="sid" required />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input name="snm" />
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
                <label>Max</label>
                <input name="mx" type="number" defaultValue={100} />
              </div>
              <div className="form-group full btn-row">
                <Button type="submit" variant="accent">
                  Save Marks
                </Button>
              </div>
            </form>
          </Card>
          <Card>
            <SectionHeader title="All Marks" actions={<Button onClick={() => rm()}>🔄</Button>} />
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(marks || []).map((m) => (
                    <tr key={m.Mark_ID}>
                      <td>{esc(m.Mark_ID)}</td>
                      <td>{esc(m.Student_Name)}</td>
                      <td>{esc(m.Subject)}</td>
                      <td>
                        {esc(m.Marks_Obtained)}/{esc(m.Max_Marks)}
                      </td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => delMark(m.Mark_ID)}>
                          Del
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
    </>
  );
}
