import { useCallback, useRef, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { IconDocument, IconChartBar, IconPrint } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../hooks/useToast.js';

const TABS = [
  { id: 'one', label: 'Single Report', Icon: IconDocument },
  { id: 'bulk', label: 'Bulk Reports', Icon: IconChartBar },
];

function str(v) {
  return v == null ? '' : String(v);
}

export default function ReportsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('one');
  const [single, setSingle] = useState(null);
  const [bulkReports, setBulkReports] = useState([]);
  const printRef = useRef(null);

  const genOne = useCallback(
    async (e) => {
      e.preventDefault();
      const q = e.target.q.value.trim();
      if (!q) return;
      const r = await api.getReportCard(q);
      if (!r.ok) {
        showToast(r.msg, 'err');
        setSingle(null);
        return;
      }
      setSingle(r);
    },
    [api, showToast]
  );

  const genBulk = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const r = await api.getBulkReportCards(fd.get('cls'), fd.get('sec'));
      if (!r.ok) {
        showToast(r.msg, 'err');
        return;
      }
      setBulkReports(r.reports || []);
    },
    [api, showToast]
  );

  const printBulk = useCallback(() => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const blob = new Blob(
      [`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulk Reports</title><style>body{font-family:sans-serif;padding:24px}.bulk-report-item{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px}.bulk-report-name{font-size:1.1rem;font-weight:700}.bulk-report-summary{color:#64748b;margin-top:8px}@media print{.bulk-report-item{page-break-inside:avoid}}</style></head><body>${html}</body></html>`],
      { type: 'text/html' }
    );
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.addEventListener('load', () => {
        w.print();
        URL.revokeObjectURL(url);
      });
    } else {
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <>
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />
      {tab === 'one' && (
        <Card>
          <CardTitle>Single Report Card</CardTitle>
          <form className="filter-bar" onSubmit={genOne}>
            <input name="q" placeholder="Student ID or name" style={{ flex: 1 }} required />
            <Button type="submit">Generate</Button>
          </form>
          {single && (
            <div className="report-container print-area" style={{ marginTop: 20 }}>
              <div className="report-header">
                <h1>Report Card</h1>
                <p>{str(single.student.Name)}</p>
              </div>
              <div className="report-info">
                <div>
                  <strong>ID</strong> {str(single.student.Student_ID)}
                </div>
                <div>
                  <strong>Class</strong> {str(single.student.Class)}-{str(single.student.Section)}
                </div>
              </div>
              <table className="marksheet-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Obtained</th>
                    <th>Max</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(single.marks || []).map((m) => (
                    <tr key={m.Mark_ID}>
                      <td>{str(m.Subject)}</td>
                      <td>{str(m.Marks_Obtained)}</td>
                      <td>{str(m.Max_Marks)}</td>
                      <td>{str(m.Grade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Overall: {str(single.overallPct)}% ({str(single.overallGrade)}) — Attendance:{' '}
                {str(single.attendance.pct)}%
              </p>
            </div>
          )}
        </Card>
      )}
      {tab === 'bulk' && (
        <Card>
          <CardTitle>Bulk Reports</CardTitle>
          <form className="filter-bar" onSubmit={genBulk}>
            <select name="cls" required style={{ flex: 1 }}>
              <option value="">Class</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select name="sec" required style={{ flex: 1 }}>
              <option value="">Section</option>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <Button type="submit">Generate All</Button>
            {bulkReports.length > 0 && (
              <Button variant="success" type="button" onClick={printBulk}>
                <IconPrint size={15} /> Print
              </Button>
            )}
          </form>
          {bulkReports.length > 0 && (
            <div ref={printRef}>
              {bulkReports.map((rep) => (
                <div key={rep.student.Student_ID} className="bulk-report-item print-area">
                  <div className="bulk-report-header">
                    <span className="bulk-report-name">{str(rep.student.Name)}</span>
                  </div>
                  <p className="bulk-report-summary">
                    ID: {str(rep.student.Student_ID)} &nbsp;|&nbsp; {str(rep.overallPct)}% (
                    {str(rep.overallGrade)}) &nbsp;|&nbsp; Att {str(rep.attendance.pct)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
