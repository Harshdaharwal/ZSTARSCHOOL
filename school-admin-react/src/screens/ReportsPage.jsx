import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';

const TABS = [
  { id: 'one', label: '📄 Single Report' },
  { id: 'bulk', label: '📊 Bulk Reports' },
];

export default function ReportsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [tab, setTab] = useState('one');
  const [single, setSingle] = useState(null);
  const [bulkHtml, setBulkHtml] = useState('');

  const genOne = useCallback(
    async (e) => {
      e.preventDefault();
      const q = e.target.q.value;
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
      const h = r.reports
        .map(
          (rep) =>
            `<div class="bulk-report-item print-area"><div class="bulk-report-header"><span class="bulk-report-name">${esc(rep.student.Name)}</span></div><p>ID: ${esc(rep.student.Student_ID)} | ${esc(rep.overallPct)}% (${esc(rep.overallGrade)}) | Att ${esc(rep.attendance.pct)}%</p></div>`
        )
        .join('');
      setBulkHtml(h);
    },
    [api, showToast]
  );

  const printBulk = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const end = '</script>';
    w.document.write('<html><body>' + bulkHtml + '<script>window.print();' + end + '</body></html>');
    w.document.close();
  }, [bulkHtml]);

  return (
    <>
      <FilterTabs tabs={TABS} activeId={tab} onChange={setTab} />
      {tab === 'one' && (
        <Card>
          <CardTitle>Single Report Card</CardTitle>
          <form className="filter-bar" onSubmit={genOne}>
            <input name="q" placeholder="Student ID or name" style={{ flex: 1 }} />
            <Button type="submit">Generate</Button>
          </form>
          {single && (
            <div className="report-container print-area" style={{ marginTop: 20 }}>
              <div className="report-header">
                <h1>Report Card</h1>
                <p>{esc(single.student.Name)}</p>
              </div>
              <div className="report-info">
                <div>
                  <strong>ID</strong> {esc(single.student.Student_ID)}
                </div>
                <div>
                  <strong>Class</strong> {esc(single.student.Class)}-{esc(single.student.Section)}
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
                      <td>{esc(m.Subject)}</td>
                      <td>{esc(m.Marks_Obtained)}</td>
                      <td>{esc(m.Max_Marks)}</td>
                      <td>{esc(m.Grade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Overall: {esc(single.overallPct)}% ({esc(single.overallGrade)}) — Attendance: {esc(single.attendance.pct)}%
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
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select name="sec" required style={{ flex: 1 }}>
              <option value="">Section</option>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <Button type="submit">Generate All</Button>
            {bulkHtml && (
              <Button variant="success" type="button" onClick={printBulk}>
                Print
              </Button>
            )}
          </form>
          {bulkHtml && <div dangerouslySetInnerHTML={{ __html: bulkHtml }} />}
        </Card>
      )}
    </>
  );
}
