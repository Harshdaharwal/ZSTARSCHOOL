import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc, formatDateIN } from '../utils/format.js';

export default function FeesPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [mode, setMode] = useState('all');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    if (mode === 'pending') return api.getPendingFees();
    if (mode === 'paid') return api.getPaidFees();
    return api.getAllFees();
  }, [api, mode]);

  const { data: fees, loading, refresh } = useAsyncResource(load);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const status = fd.get('status');
      const res = await api.addFeeRecord({
        studentId: fd.get('sid'),
        studentName: fd.get('snm'),
        cls: fd.get('cls') || '',
        feeType: fd.get('ftype'),
        amount: fd.get('amt'),
        dueDate: formatDateIN(fd.get('due') || ''),
        paidDate: status === 'Paid' ? formatDateIN(new Date().toISOString().slice(0, 10)) : '',
        status,
        remarks: '',
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const del = useCallback(
    async (id) => {
      const res = await api.deleteFeeRecord(id);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
    },
    [api, refresh, showToast]
  );

  if (loading && !fees) return <Spinner />;

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
      <Card>
        <CardTitle>💰 Add Fee</CardTitle>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label>Student ID *</label>
            <input name="sid" required />
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input name="snm" required />
          </div>
          <div className="form-group">
            <label>Class</label>
            <input name="cls" />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="ftype">
              <option>Monthly Fee</option>
              <option>Annual Fee</option>
              <option>Exam Fee</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount *</label>
            <input name="amt" type="number" min={0} required />
          </div>
          <div className="form-group">
            <label>Due</label>
            <input name="due" type="date" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status">
              <option>Pending</option>
              <option>Paid</option>
            </select>
          </div>
          <div className="form-group full btn-row">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader title="📋 Fee Records" actions={<Button onClick={() => refresh()}>🔄</Button>} />
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <Button variant="ghost" size="sm" onClick={() => setMode('all')}>
            All
          </Button>
          <Button variant="danger" size="sm" onClick={() => setMode('pending')}>
            Pending
          </Button>
          <Button variant="success" size="sm" onClick={() => setMode('paid')}>
            Paid
          </Button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(fees || []).map((f) => (
                <tr key={f.Fee_ID}>
                  <td>{esc(f.Fee_ID)}</td>
                  <td>{esc(f.Student_Name)}</td>
                  <td>₹{esc(f.Amount)}</td>
                  <td>{esc(f.Status)}</td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => del(f.Fee_ID)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
