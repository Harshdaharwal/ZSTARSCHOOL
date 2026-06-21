import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { IconRefresh, IconMoney } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc, formatDateIN } from '../utils/format.js';
import { downloadAttendancePdf } from '../utils/attendancePdf.js';

const PAGE_SIZE = 15;
const FEE_TYPE_OPTIONS = ['Monthly Fee', 'Annual Fee', 'Sports Fee', 'Lab Fee', 'Exam Fee', 'Other'];

function isPresetFeeType(type) {
  return FEE_TYPE_OPTIONS.includes(type) && type !== 'Other';
}

function isoDateFromStored(v) {
  if (!v || typeof v !== 'string') return '';
  const p = v.split('/');
  if (p.length === 3) {
    const [d, m, y] = p;
    if (y && m && d) return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return '';
}

/** Small summary tile */
function SummaryTile({ label, value, color }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 120,
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 8,
        padding: '10px 14px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

/** Payment success notification banner */
function PaymentBanner({ info, onClose }) {
  if (!info) return null;
  return (
    <div
      style={{
        background: 'var(--success-bg, #f0fdf4)',
        border: '1.5px solid var(--success, #16a34a)',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>✅</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: 'var(--success, #16a34a)', marginBottom: 2 }}>
          Fee Payment Recorded
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
          <strong>{info.studentName}</strong> ({info.studentId}) — ₹{info.amount}{' '}
          <em>{info.feeType}</em> marked as <strong>Paid</strong>.
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Receipt: <strong>{info.receipt}</strong> &nbsp;|&nbsp; Date: {info.paidDate}
          {info.waPhone && (
            <span style={{ marginLeft: 8, color: 'var(--success, #16a34a)' }}>
              📱 WhatsApp receipt sent to {info.waPhone}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          color: 'var(--text-muted)',
          padding: 0,
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default function FeesPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mode, setMode] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentBanner, setPaymentBanner] = useState(null); // {studentName, studentId, amount, feeType, receipt, paidDate, waPhone}
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [editFeeTypeSelected, setEditFeeTypeSelected] = useState('Monthly Fee');
  const [editCustomFeeType, setEditCustomFeeType] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Class fee structure add/edit modal
  const [classFeeModal, setClassFeeModal] = useState(false);
  const [classFeeForm, setClassFeeForm] = useState({ Class: '', Amount: '', Fee_Type: 'Monthly Fee', Note: '' });
  const [classFeeCustomType, setClassFeeCustomType] = useState('');
  const [classFeeLoading, setClassFeeLoading] = useState(false);

  // Student auto-lookup state
  const [studentInfo, setStudentInfo] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupTimer = useRef(null);

  // Controlled form fields that get auto-filled
  const [autoName, setAutoName] = useState('');
  const [autoCls, setAutoCls] = useState('');
  const [autoAmt, setAutoAmt] = useState('');
  const [feeTypeSelected, setFeeTypeSelected] = useState('Monthly Fee');
  const [customFeeType, setCustomFeeType] = useState('');
  const [customFeeDetail, setCustomFeeDetail] = useState('');

  const loadClassFeeStructure = useCallback(
    () => (typeof api.getClassFeeSettings === 'function' ? api.getClassFeeSettings() : []),
    [api]
  );
  const { data: classFeeStructure, refresh: refreshClassFee } = useAsyncResource(loadClassFeeStructure);

  const load = useCallback(() => {
    if (mode === 'pending') return api.getPendingFees();
    if (mode === 'paid') return api.getPaidFees();
    return api.getAllFees();
  }, [api, mode]);

  const { data: fees, loading, refresh } = useAsyncResource(load);

  // Reset to page 1 when mode or search changes
  useEffect(() => { setPage(1); }, [mode, search]);

  // Filter + paginate
  const filtered = useMemo(() => {
    if (!fees?.length) return [];
    const q = search.toLowerCase().trim();
    if (!q) return fees;
    return fees.filter(
      (f) =>
        String(f.Student_ID).toLowerCase().includes(q) ||
        String(f.Student_Name).toLowerCase().includes(q) ||
        String(f.Fee_Type).toLowerCase().includes(q) ||
        String(f.Class).toLowerCase().includes(q)
    );
  }, [fees, search]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Summary stats
  const summary = useMemo(() => {
    const all = fees || [];
    const paid = all.filter((f) => f.Status === 'Paid');
    const pending = all.filter((f) => f.Status === 'Pending');
    const totalAmt = all.reduce((s, f) => s + (Number(f.Amount) || 0), 0);
    const paidAmt = paid.reduce((s, f) => s + (Number(f.Amount) || 0), 0);
    const pendingAmt = pending.reduce((s, f) => s + (Number(f.Amount) || 0), 0);
    return { total: all.length, paid: paid.length, pending: pending.length, totalAmt, paidAmt, pendingAmt };
  }, [fees]);

  // Auto-lookup student when Student ID is typed
  const handleStudentIdChange = useCallback(
    (e) => {
      const id = e.target.value.trim();
      setStudentInfo(null);
      setAutoName('');
      setAutoCls('');
      setAutoAmt('');
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
      if (!id) return;
      lookupTimer.current = setTimeout(async () => {
        if (typeof api.getStudentById !== 'function') return;
        setLookupLoading(true);
        const st = await api.getStudentById(id);
        setLookupLoading(false);
        if (st) {
          setStudentInfo(st);
          setAutoName(st.Name || '');
          setAutoCls(st.Class || '');
          if (typeof api.getClassFeeSettings === 'function') {
            const settings = await api.getClassFeeSettings();
            const s = (settings || []).find((x) => String(x.Class) === String(st.Class));
            if (s) {
              setAutoAmt(String(s.Amount || ''));
              const savedType = String(s.Fee_Type || '').trim();
              if (savedType && FEE_TYPE_OPTIONS.includes(savedType) && savedType !== 'Other') {
                setFeeTypeSelected(savedType);
                setCustomFeeType('');
              } else if (savedType) {
                setFeeTypeSelected('Other');
                setCustomFeeType(savedType);
              }
            }
          }
        } else {
          showToast('Student not found for this ID.', 'err');
        }
      }, 500);
    },
    [api, showToast]
  );

  const resetForm = useCallback((formEl) => {
    formEl?.reset();
    setStudentInfo(null);
    setAutoName('');
    setAutoCls('');
    setAutoAmt('');
  }, []);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const status = fd.get('status');
      const chosenFeeType =
        feeTypeSelected === 'Other' ? String(customFeeType || '').trim() : String(feeTypeSelected || '').trim();
      if (!chosenFeeType) {
        showToast('Please enter a fee label for "Other".', 'err');
        return;
      }
      const feeDetail = feeTypeSelected === 'Other' ? String(customFeeDetail || '').trim() : '';
      const res = await api.addFeeRecord({
        studentId: fd.get('sid'),
        studentName: fd.get('snm'),
        cls: fd.get('cls') || '',
        feeType: chosenFeeType,
        amount: fd.get('amt'),
        dueDate: formatDateIN(fd.get('due') || ''),
        paidDate: status === 'Paid' ? formatDateIN(new Date().toISOString().slice(0, 10)) : '',
        status,
        remarks: feeDetail,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        resetForm(e.target);
        setFeeTypeSelected('Monthly Fee');
        setCustomFeeType('');
        setCustomFeeDetail('');
        setAddModalOpen(false);
        refresh();
      }
    },
    [api, customFeeDetail, customFeeType, feeTypeSelected, refresh, showToast, resetForm]
  );

  // Mark fee as paid — shows banner + sends WhatsApp
  const markPaid = useCallback(
    async (fee) => {
      if (typeof api.markFeePaid !== 'function') {
        showToast('Mark as paid is not available.', 'err');
        return;
      }
      const res = await api.markFeePaid(fee.Fee_ID);
      if (res.ok) {
        // Determine parent phone from student info if possible
        let waPhone = '';
        if (typeof api.getStudentById === 'function') {
          const st = await api.getStudentById(fee.Student_ID);
          waPhone = st?.Parent_WhatsApp || st?.Phone || '';
        }
        setPaymentBanner({
          studentName: fee.Student_Name,
          studentId: fee.Student_ID,
          amount: fee.Amount,
          feeType: fee.Fee_Type,
          receipt: res.receipt || '—',
          paidDate: res.paidDate || '—',
          waPhone,
        });
        refresh();
      }
      showToast(res.msg, res.ok ? 'ok' : 'err');
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

  const sendReminder = useCallback(
    async (fee) => {
      if (typeof api.sendFeeReminder !== 'function') {
        showToast('Send reminder is not available.', 'err');
        return;
      }
      const res = await api.sendFeeReminder(fee.Fee_ID);
      showToast(res.msg, res.ok ? 'ok' : 'err');
    },
    [api, showToast]
  );

  const openEditFee = useCallback((fee) => {
    setEditingFee({ ...fee });
    if (fee?.Fee_Type && isPresetFeeType(String(fee.Fee_Type))) {
      setEditFeeTypeSelected(String(fee.Fee_Type));
      setEditCustomFeeType('');
    } else {
      setEditFeeTypeSelected('Other');
      setEditCustomFeeType(String(fee?.Fee_Type || ''));
    }
    setEditRemarks(String(fee?.Remarks || ''));
  }, []);

  const saveEditedFee = useCallback(
    async (e) => {
      e.preventDefault();
      if (!editingFee) return;
      if (typeof api.updateFeeRecord !== 'function') {
        showToast('Edit fee is not available in this environment.', 'err');
        return;
      }
      const chosenFeeType =
        editFeeTypeSelected === 'Other'
          ? String(editCustomFeeType || '').trim()
          : String(editFeeTypeSelected || '').trim();
      if (!chosenFeeType) {
        showToast('Please enter a fee label.', 'err');
        return;
      }
      const dueRaw = editingFee._dueInput || '';
      const paidRaw = editingFee._paidInput || '';
      const payload = {
        studentName: editingFee.Student_Name,
        cls: editingFee.Class,
        feeType: chosenFeeType,
        amount: editingFee.Amount,
        dueDate: dueRaw ? formatDateIN(dueRaw) : '',
        status: editingFee.Status,
        paidDate: editingFee.Status === 'Paid' && paidRaw ? formatDateIN(paidRaw) : '',
        remarks: editRemarks,
      };
      const res = await api.updateFeeRecord(editingFee.Fee_ID, payload);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setEditingFee(null);
        refresh();
      }
    },
    [api, editCustomFeeType, editFeeTypeSelected, editRemarks, editingFee, refresh, showToast]
  );

  /* ── Class Fee Structure handlers ── */
  const saveClassFee = useCallback(async (e) => {
    e.preventDefault();
    if (!classFeeForm.Class) { showToast('Select a class.', 'err'); return; }
    const chosenType = classFeeForm.Fee_Type === 'Other'
      ? classFeeCustomType.trim()
      : classFeeForm.Fee_Type;
    if (!chosenType) { showToast('Enter a fee type label.', 'err'); return; }
    setClassFeeLoading(true);
    // Backend expects lowercase field names: cls, amount, feeType, note
    const res = await api.saveClassFeeSetting({
      cls:     classFeeForm.Class,
      amount:  classFeeForm.Amount,
      feeType: chosenType,
      note:    classFeeForm.Note,
    });
    setClassFeeLoading(false);
    showToast(res?.msg || (res?.ok ? 'Saved!' : 'Error saving.'), res?.ok ? 'ok' : 'err');
    if (res?.ok) {
      setClassFeeModal(false);
      setClassFeeForm({ Class: '', Amount: '', Fee_Type: 'Monthly Fee', Note: '' });
      setClassFeeCustomType('');
      refreshClassFee();
    }
  }, [api, classFeeCustomType, classFeeForm, refreshClassFee, showToast]);

  const downloadClassFeePdf = useCallback(() => {
    const rows = classFeeStructure || [];
    if (!rows.length) { showToast('No class fee structure to export.', 'err'); return; }
    const body = rows.map((r) => [
      `Class ${r.Class}`,
      r.Amount === '' || r.Amount == null ? '—' : `Rs.${Number(r.Amount).toLocaleString('en-IN')}`,
      r.Fee_Type || '—',
      r.Note || '—',
    ]);
    downloadAttendancePdf({
      title:    'Class-wise Fee Structure',
      subtitle: `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      head:     ['Class', 'Amount', 'Fee Label', 'Note'],
      body,
      filename: 'class-fee-structure.pdf',
    });
    showToast('Class fee structure PDF downloaded.', 'ok');
  }, [classFeeStructure, showToast]);

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


      {/* ══════════════ Two-column layout ══════════════ */}
      <div className="fees-two-col">

        {/* ── LEFT: Class-wise Fee Structure ── */}
        <Card style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <CardTitle style={{ margin: 0, padding: 0, border: 'none', fontSize: '1rem' }}>Class-wise Fee Structure</CardTitle>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setClassFeeForm({ Class: '', Amount: '', Fee_Type: 'Monthly Fee', Note: '' });
                  setClassFeeCustomType('');
                  setClassFeeModal(true);
                }}
              >
                + Add / Update
              </Button>
              <Button size="sm" variant="ghost" onClick={downloadClassFeePdf}>
                Download PDF
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/class-fees')}
                title="Open full Class Fees Settings page"
              >
                Full Page →
              </Button>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Configure fee amount and label for each class.
          </p>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Fee Label</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(classFeeStructure || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty" style={{ padding: 20 }}>
                      No class fee structure saved yet.
                    </td>
                  </tr>
                ) : (
                  (classFeeStructure || []).map((r) => (
                    <tr
                      key={r.Class}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const ft = FEE_TYPE_OPTIONS.includes(r.Fee_Type) ? r.Fee_Type : 'Other';
                        setClassFeeForm({
                          Class: r.Class,
                          Amount: r.Amount === '' || r.Amount == null ? '' : String(r.Amount),
                          Fee_Type: ft,
                          Note: r.Note || '',
                        });
                        setClassFeeCustomType(ft === 'Other' ? r.Fee_Type : '');
                        setClassFeeModal(true);
                      }}
                      title="Click to edit this class fee"
                    >
                      <td style={{ fontWeight: 600 }}>Class {esc(r.Class)}</td>
                      <td style={{ color: 'var(--success,#059669)', fontWeight: 700 }}>
                        {r.Amount === '' || r.Amount == null ? '—' : `₹${Number(r.Amount).toLocaleString('en-IN')}`}
                      </td>
                      <td>{esc(r.Fee_Type || '—')}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{esc(r.Note || '—')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── RIGHT: Fee Records ── */}
        <Card style={{ marginBottom: 0 }}>
          <SectionHeader
            title="Fee Records"
            actions={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button onClick={() => setAddModalOpen(true)} size="sm" variant="primary">+ Add Fee</Button>
                <Button onClick={() => refresh()} size="sm" variant="ghost">
                  <IconRefresh size={14} /> Refresh
                </Button>
              </div>
            }
          />

          {/* Payment success banner */}
          <PaymentBanner info={paymentBanner} onClose={() => setPaymentBanner(null)} />

          {/* Summary tiles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <SummaryTile label="Total Records" value={summary.total} />
            <SummaryTile label="Paid" value={`${summary.paid} (₹${summary.paidAmt.toLocaleString('en-IN')})`} color="var(--success, #16a34a)" />
            <SummaryTile label="Pending" value={`${summary.pending} (₹${summary.pendingAmt.toLocaleString('en-IN')})`} color="var(--danger, #e53935)" />
            <SummaryTile label="Total Amt" value={`₹${summary.totalAmt.toLocaleString('en-IN')}`} />
          </div>

          {/* Filter tabs + search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="btn-row" style={{ margin: 0 }}>
              <Button variant={mode === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('all')}>All</Button>
              <Button variant={mode === 'pending' ? 'danger' : 'ghost'} size="sm" onClick={() => setMode('pending')}>Pending</Button>
              <Button variant={mode === 'paid' ? 'success' : 'ghost'} size="sm" onClick={() => setMode('paid')}>Paid</Button>
            </div>
            <input
              placeholder="Search student, ID, type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            />
            {(search || mode !== 'all') && (
              <Button variant="ghost" onClick={() => { setSearch(''); setMode('all'); }} size="sm">
                Clear
              </Button>
            )}
          </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student</th>
                <th>Class</th>
                <th>Fee Type</th>
                <th>Detail</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Receipt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="empty" style={{ padding: 24 }}>
                    {search ? 'No records match your search.' : 'No fee records found.'}
                  </td>
                </tr>
              ) : (
                pagedRows.map((f) => (
                  <tr key={f.Fee_ID}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{esc(f.Student_ID)}</td>
                    <td>{esc(f.Student_Name)}</td>
                    <td>{esc(f.Class || '—')}</td>
                    <td>{esc(f.Fee_Type || '—')}</td>
                    <td style={{ maxWidth: 200, whiteSpace: 'normal' }}>{esc(f.Remarks || '—')}</td>
                    <td>₹{Number(f.Amount).toLocaleString('en-IN')}</td>
                    <td>{esc(f.Due_Date || '—')}</td>
                    <td>{esc(f.Paid_Date || '—')}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: f.Status === 'Paid' ? 'var(--success, #16a34a)' : 'var(--danger, #e53935)',
                        }}
                      >
                        {esc(f.Status)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {esc(f.Receipt_No || '—')}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{ marginRight: 4 }}
                        onClick={() => openEditFee(f)}
                      >
                        Edit
                      </Button>
                      {f.Status === 'Pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            style={{ marginRight: 4 }}
                            title="Mark as paid and send WhatsApp receipt"
                            onClick={() =>
                              setConfirm({
                                title: 'Mark as Paid?',
                                message: `Mark ₹${f.Amount} ${f.Fee_Type} for ${f.Student_Name} (${f.Student_ID}) as paid? A WhatsApp receipt will be sent to the parent.`,
                                confirmLabel: 'Mark Paid',
                                danger: false,
                                onConfirm: () => { setConfirm(null); markPaid(f); },
                              })
                            }
                          >
                            Mark Paid
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ marginRight: 4 }}
                            title="Send WhatsApp fee reminder"
                            onClick={() =>
                              setConfirm({
                                title: 'Send Fee Reminder?',
                                message: `Send a WhatsApp reminder to the parent of ${f.Student_Name} for ₹${f.Amount} ${f.Fee_Type}?`,
                                confirmLabel: 'Send',
                                danger: false,
                                onConfirm: () => { setConfirm(null); sendReminder(f); },
                              })
                            }
                          >
                            Remind
                          </Button>
                        </>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          setConfirm({
                            title: 'Delete fee record?',
                            message: `Permanently delete the fee record for ${f.Student_Name}?`,
                            confirmLabel: 'Delete',
                            danger: true,
                            onConfirm: () => { setConfirm(null); del(f.Fee_ID); },
                          })
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </Card>
      </div>{/* end two-column grid */}

      {/* ── Class Fee Structure Add/Edit Modal ── */}
      <Modal
        open={classFeeModal}
        title="Add / Update Class Fee"
        onClose={() => setClassFeeModal(false)}
      >
        <form className="form-grid" onSubmit={saveClassFee}>
          <div className="form-group">
            <label>Class *</label>
            <select
              value={classFeeForm.Class}
              onChange={(e) => setClassFeeForm((p) => ({ ...p, Class: e.target.value }))}
              required
            >
              <option value="">-- Select Class --</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>Class {i + 1}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Fee Amount (₹) *</label>
            <input
              type="number"
              min={0}
              required
              value={classFeeForm.Amount}
              onChange={(e) => setClassFeeForm((p) => ({ ...p, Amount: e.target.value }))}
              placeholder="e.g. 1500"
            />
          </div>
          <div className="form-group">
            <label>Fee Type</label>
            <select
              value={classFeeForm.Fee_Type}
              onChange={(e) => setClassFeeForm((p) => ({ ...p, Fee_Type: e.target.value }))}
            >
              {FEE_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {classFeeForm.Fee_Type === 'Other' && (
              <input
                style={{ marginTop: 8 }}
                value={classFeeCustomType}
                onChange={(e) => setClassFeeCustomType(e.target.value)}
                placeholder="Enter custom fee label"
              />
            )}
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input
              value={classFeeForm.Note}
              onChange={(e) => setClassFeeForm((p) => ({ ...p, Note: e.target.value }))}
              placeholder="e.g. includes transport"
            />
          </div>
          <div className="form-group full btn-row">
            <Button type="submit" disabled={classFeeLoading}>
              {classFeeLoading ? 'Saving…' : 'Save Class Fee'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setClassFeeModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addModalOpen} title="Add Fee Record" onClose={() => setAddModalOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group">
            <label>Student ID *</label>
            <input name="sid" required onChange={handleStudentIdChange} placeholder="e.g. STU_1001" />
            {lookupLoading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Looking up…</span>
            )}
            {studentInfo && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success, #16a34a)', marginTop: 2, display: 'block' }}>
                ✓ Found: {studentInfo.Name} — Roll {studentInfo.Roll_No ?? '—'} · Class {studentInfo.Class}-{studentInfo.Section}
                {studentInfo.Phone ? ` · Ph: ${studentInfo.Phone}` : ''}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input name="snm" required value={autoName} onChange={(e) => setAutoName(e.target.value)} placeholder="Auto-filled from Student ID" />
          </div>

          <div className="form-group">
            <label>Class</label>
            <input name="cls" value={autoCls} onChange={(e) => setAutoCls(e.target.value)} placeholder="Auto-filled" />
          </div>

          <div className="form-group">
            <label>Fee Type</label>
            <select value={feeTypeSelected} onChange={(e) => setFeeTypeSelected(e.target.value)}>
              {FEE_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {feeTypeSelected === 'Other' && (
              <>
                <input
                  style={{ marginTop: 8 }}
                  value={customFeeType}
                  onChange={(e) => setCustomFeeType(e.target.value)}
                  placeholder="Enter custom fee label"
                />
                <textarea
                  style={{ marginTop: 8 }}
                  rows={2}
                  value={customFeeDetail}
                  onChange={(e) => setCustomFeeDetail(e.target.value)}
                  placeholder="Add detail/description (saved to Firestore)"
                />
              </>
            )}
          </div>

          <div className="form-group">
            <label>Amount *</label>
            <input name="amt" type="number" min={0} required value={autoAmt} onChange={(e) => setAutoAmt(e.target.value)} placeholder="Auto-filled from class settings" />
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input name="due" type="date" />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status">
              <option>Pending</option>
              <option>Paid</option>
            </select>
          </div>

          {studentInfo && (
            <div
              className="form-group full"
              style={{
                background: 'var(--sidebar-bg, #f0f4ff)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <strong>Roll No:</strong> {studentInfo.Roll_No ?? '—'} &nbsp;|&nbsp;
              <strong>Student:</strong> {studentInfo.Name} &nbsp;|&nbsp;
              <strong>Class:</strong> {studentInfo.Class}-{studentInfo.Section} &nbsp;|&nbsp;
              <strong>Father:</strong> {studentInfo.Father_Name || '—'} &nbsp;|&nbsp;
              <strong>Phone:</strong> {studentInfo.Parent_WhatsApp || studentInfo.Phone || '—'}
              <br />
              <span style={{ color: 'var(--success, #16a34a)', marginTop: 4, display: 'inline-block' }}>
                📱 A WhatsApp message will be sent to the parent automatically after saving.
              </span>
            </div>
          )}

          <div className="form-group full btn-row">
            <Button type="submit">Save &amp; Notify</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingFee} title="Edit Fee Record" onClose={() => setEditingFee(null)}>
        {editingFee && (
          <form className="form-grid" onSubmit={saveEditedFee}>
            <div className="form-group">
              <label>Student ID</label>
              <input value={editingFee.Student_ID || ''} readOnly />
            </div>
            <div className="form-group">
              <label>Student Name</label>
              <input
                value={editingFee.Student_Name || ''}
                onChange={(e) => setEditingFee((p) => ({ ...p, Student_Name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Class</label>
              <input
                value={editingFee.Class || ''}
                onChange={(e) => setEditingFee((p) => ({ ...p, Class: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Fee Type</label>
              <select value={editFeeTypeSelected} onChange={(e) => setEditFeeTypeSelected(e.target.value)}>
                {FEE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {editFeeTypeSelected === 'Other' && (
                <input
                  style={{ marginTop: 8 }}
                  value={editCustomFeeType}
                  onChange={(e) => setEditCustomFeeType(e.target.value)}
                  placeholder="Enter custom fee label"
                />
              )}
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                min={0}
                value={editingFee.Amount ?? 0}
                onChange={(e) => setEditingFee((p) => ({ ...p, Amount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={editingFee._dueInput ?? isoDateFromStored(editingFee.Due_Date)}
                onChange={(e) => setEditingFee((p) => ({ ...p, _dueInput: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={editingFee.Status || 'Pending'}
                onChange={(e) => setEditingFee((p) => ({ ...p, Status: e.target.value }))}
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            {editingFee.Status === 'Paid' && (
              <div className="form-group">
                <label>Paid Date</label>
                <input
                  type="date"
                  value={editingFee._paidInput ?? isoDateFromStored(editingFee.Paid_Date)}
                  onChange={(e) => setEditingFee((p) => ({ ...p, _paidInput: e.target.value }))}
                />
              </div>
            )}
            <div className="form-group full">
              <label>Detail / Remarks</label>
              <textarea rows={3} value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingFee(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
