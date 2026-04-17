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

function TeacherHomeworkSection({ api, classLabel, cls, sec }) {
  const { showToast } = useToast();
  const load = useCallback(() => api.getHomeworkForTeacher(), [api]);
  const { data: list, loading, refresh } = useAsyncResource(load);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addHomework({
        subject: fd.get('subject'),
        title: fd.get('title'),
        dueDate: fd.get('dueDate'),
        description: fd.get('description'),
        cls,
        section: sec,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, refresh, showToast, cls, sec]
  );

  const update = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.updateHomework(editing.Homework_ID, {
        subject: fd.get('subject'),
        title: fd.get('title'),
        dueDate: fd.get('dueDate'),
        description: fd.get('description'),
        cls,
        section: sec,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setEditing(null);
        refresh();
      }
    },
    [api, editing, refresh, showToast, cls, sec]
  );

  const remove = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete Homework',
        message: 'Are you sure you want to delete this homework assignment?',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const res = await api.deleteHomework(id);
          showToast(res.msg, res.ok ? 'ok' : 'err');
          if (res.ok) refresh();
          setConfirm(null);
        },
      });
    },
    [api, refresh, showToast]
  );

  return (
    <>
      <Card style={{ marginTop: 16 }}>
        <CardTitle>Homework ({esc(classLabel)})</CardTitle>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 16 }}>
          Assign homework for your class. Parents can be informed via WhatsApp digests (Settings) when you enable the integration.
        </p>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">

            <label>Subject *</label>
            <input name="subject" required placeholder="e.g. Mathematics" />
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input name="title" required placeholder="Short title" />
          </div>

          <div className="form-group">
            <label>Due date</label>
            <input name="dueDate" type="date" />
          </div>

          <div className="form-group full">
            <label>Instructions *</label>
            <textarea name="description" required rows={3} placeholder="What students should complete…" />
          </div>

          <div className="form-group full btn-row">
            <Button type="submit">Post homework</Button>
          </div>

        </form>

        {loading && !list ? (
          <Spinner />
        ) : (
          <div className="tbl-wrap" style={{ marginTop: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Title</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!list?.length ? (
                  <tr>
                    <td colSpan={4} className="empty" style={{ padding: 16 }}>
                      No homework posted yet.
                    </td>
                  </tr>
                ) : (
                  list.map((h) => (
                    <tr key={h.Homework_ID}>
                      <td>{esc(h.Subject)}</td>
                      <td>{esc(h.Title)}</td>
                      <td>{esc(h.Due_Date || '—')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(h)}>
                            <IconEdit size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(h.Homework_ID)} style={{ color: 'var(--err)' }}>
                            <IconTrash size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!editing} title="Edit Homework" onClose={() => setEditing(null)}>
        {editing && (
          <form className="form-grid" onSubmit={update}>
            <div className="form-group">
              <label>Subject *</label>
              <input name="subject" required defaultValue={editing.Subject} />
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input name="title" required defaultValue={editing.Title} />
            </div>
            <div className="form-group">
              <label>Due date</label>
              <input name="dueDate" type="date" defaultValue={editing.Due_Date} />
            </div>
            <div className="form-group full">
              <label>Instructions *</label>
              <textarea name="description" required rows={5} defaultValue={editing.Description} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Update homework</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function csvEscape(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export default function MarksResultsPage({ teacherAccess = false }) {
  const { t } = useTranslation();
  const api = useApi();
  const { showToast } = useToast();
  const [cls, setCls] = useState('');
  const [sec, setSec] = useState('');
  const [view, setView] = useState(null);

  const load = useCallback(
    () => (teacherAccess ? api.getMarksTeacherData() : api.getMarksAdminData()),
    [api, teacherAccess]
  );
  const { data, loading, error, refresh } = useAsyncResource(load);

  const initialDefaults = useMemo(() => {
    if (!teacherAccess || !data?.meta || data.meta.noProfile) return null;
    return {
      cls: String(data.meta.class ?? ''),
      sec: String(data.meta.section ?? ''),
    };
  }, [teacherAccess, data]);

  // Set initial filters once data loads
  useEffect(() => {
    if (initialDefaults && !cls) {
      setCls(initialDefaults.cls);
      setSec(initialDefaults.sec);
    }
  }, [initialDefaults, cls]);

  const classOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.students.map((s) => String(s.Class)));
    return [...set].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
  }, [data]);

  const sectionOptions = useMemo(() => {
    if (!data) return [];
    const c = cls;
    if (!c) return [];
    const set = new Set(
      data.students.filter((s) => String(s.Class) === String(c)).map((s) => s.Section)
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data, cls]);

  const filterClass = cls;
  const filterSection = sec;

  const reports = useMemo(() => {
    if (!data) return [];
    return buildStudentMarksReports(data.students, data.marks, {
      class: filterClass || undefined,
      section: filterSection || undefined,
    });
  }, [data, filterClass, filterSection]);

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

  const zipReady = Boolean(filterClass && filterSection);

  const handleZip = useCallback(async () => {
    if (!zipReady || reports.length === 0) {
      showToast('Select class and section, and ensure there are students.', 'err');
      return;
    }
    try {
      await downloadClassResultsZip(reports, `Class-${filterClass}-${filterSection}-Results`);
      showToast(`ZIP downloaded (${reports.length} PDFs).`, 'ok');
    } catch (e) {
      showToast(String(e?.message || e), 'err');
    }
  }, [zipReady, filterClass, filterSection, reports, showToast]);

  const handleOnePdf = useCallback(
    (report) => {
      if (!report) return;
      const blob = createResultPdfBlob(report);
      downloadBlob(blob, `result-${report.rollNo}.pdf`);
      showToast('PDF downloaded.', 'ok');
    },
    [showToast]
  );

  const downloadCsv = useCallback(() => {
    if (reports.length === 0) return;
    const sep = ',';
    const head = ['Roll', 'Name', 'Class', ...subjectColumns, 'Total', 'Percentage', 'Grade'];
    const lines = [head.join(sep)];
    for (const r of reports) {
      const row = [r.rollNo, r.name, r.classLabel];
      for (const col of subjectColumns) {
        const m = r.subjects.find((x) => x.subject === col);
        row.push(m ? `${m.obtained}/${m.max}` : '');
      }
      row.push(`${r.totalObtained}/${r.totalMax}`, r.percentage, r.overallGrade);
      lines.push(row.map((v) => csvEscape(v)).join(sep));
    }
    const blob = new Blob(['\ufeff', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `marks-${filterClass || 'all'}-${filterSection || 'all'}.csv`);
    showToast('CSV downloaded.', 'ok');
  }, [reports, subjectColumns, filterClass, filterSection, showToast]);

  const colCount = 7 + subjectColumns.length;

  if (loading) {
    return (
      <div style={{ padding: 48 }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>Error</CardTitle>
        <p>{String(error.message)}</p>
        <Button type="button" onClick={refresh}>
          Retry
        </Button>
      </Card>
    );
  }

  if (teacherAccess && data?.meta?.noProfile) {
    return (
      <Card>
        <CardTitle>{t('nav.results')}</CardTitle>
        <p>Your account is not linked to a teacher profile (missing teacher ID). Please contact the administrator.</p>
      </Card>
    );
  }

  return (
    <>
      <SectionHeader title={teacherAccess ? t('nav.results') : 'Marks & results'} />
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
        {teacherAccess
          ? `View marks for your assigned class. Open a student’s result or download a single PDF.${
              data?.meta?.teacherName ? ` (${data.meta.teacherName})` : ''
            }`
          : 'Filter by class and section (e.g. class 12 + section A → “12A”). View the matrix, open a student’s result in the modal, or export CSV / single PDF / class ZIP (ZIP uses roll number as each PDF file name).'}
      </p>

      <Card>
        <CardTitle>Filters</CardTitle>
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <label>
            Class
            <select
              value={cls}
              onChange={(e) => {
                setCls(e.target.value);
                setSec('');
              }}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              value={sec}
              onChange={(e) => setSec(e.target.value)}
              disabled={!cls}
            >
              <option value="">All sections</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="ghost" onClick={refresh}>
            Refresh data
          </Button>
        </div>
        {!teacherAccess && (
          <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {zipReady
              ? `ZIP: ${reports.length} PDF(s), each named {roll no}.pdf (e.g. ${reports[0]?.rollNo ?? '101'}.pdf).`
              : 'Select both class and section to enable “Download class ZIP”.'}
          </p>
        )}
      </Card>

      {teacherAccess && typeof api.getHomeworkForTeacher === 'function' && (
        <TeacherHomeworkSection api={api} classLabel={`${filterClass || 'All'}–${filterSection || 'All'}`} cls={filterClass} sec={filterSection} />
      )}

      <Card style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <CardTitle>Subject marks ({reports.length} students)</CardTitle>
          {!teacherAccess && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="button" variant="ghost" onClick={downloadCsv} disabled={reports.length === 0}>
                Download CSV
              </Button>
              <Button type="button" onClick={handleZip} disabled={!zipReady || reports.length === 0}>
                Download class ZIP (PDFs)
              </Button>
            </div>
          )}
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Name</th>
                <th>Class</th>
                {subjectColumns.map((c) => (
                  <th key={c}>{esc(c)}</th>
                ))}
                <th>Total</th>
                <th>%</th>
                <th>Grade</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="empty" style={{ padding: 24 }}>
                    No students for this filter.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.studentId}>
                    <td>{r.rollNo}</td>
                    <td>{esc(r.name)}</td>
                    <td>{esc(r.classLabel)}</td>
                    {subjectColumns.map((c) => (
                      <td key={c}>{subjectCell(r, c)}</td>
                    ))}
                    <td>
                      {r.totalObtained}/{r.totalMax}
                    </td>
                    <td>{r.percentage}%</td>
                    <td>{r.overallGrade}</td>
                    <td>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setView(r)}>
                        View
                      </Button>{' '}
                      <Button type="button" size="sm" onClick={() => handleOnePdf(r)}>
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!view} title={view ? `Result — ${esc(view.name)}` : ''} onClose={() => setView(null)}>
        {view && (
          <div>
            <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              Roll {view.rollNo} · Class {esc(view.classLabel)}
            </p>
            <table className="marksheet-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Obtained</th>
                  <th>Max</th>
                  <th>Grade</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {view.subjects.map((s) => (
                  <tr key={s.subject}>
                    <td>{esc(s.subject)}</td>
                    <td>{s.obtained}</td>
                    <td>{s.max}</td>
                    <td>{esc(s.grade)}</td>
                    <td>{esc(s.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16 }}>
              <strong>Total:</strong> {view.totalObtained} / {view.totalMax} · <strong>{view.percentage}%</strong>{' '}
              · Grade <strong>{view.overallGrade}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <Button type="button" onClick={() => handleOnePdf(view)}>
                Download PDF
              </Button>
              <Button type="button" variant="ghost" onClick={() => setView(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
