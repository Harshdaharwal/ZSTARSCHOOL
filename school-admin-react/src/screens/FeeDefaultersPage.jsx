import { useCallback, useMemo, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { SCHOOL_NAME } from '../config/schoolConfig.js';
import {
  IconFees, IconWhatsApp, IconSend, IconAlertCircle,
  IconRefresh, IconSearch, IconUsers,
} from '../components/common/Icons.jsx';
import whatsappService from '../services/whatsappService.js';

const PAGE_SIZE = 20;

function buildReminderMsg(student) {
  const name = esc(student.Student_Name || student.name || 'Student');
  const cls = esc(String(student.Class || student.class || ''));
  const amount = Number(student.Amount || 0).toLocaleString('en-IN');
  const due = esc(student.Due_Date || '—');
  return `Dear Parent of *${name}* (Class ${cls}),\n\nThis is a reminder that a fee of *₹${amount}* was due on *${due}*.\n\nKindly clear the outstanding amount at the earliest to avoid late charges.\n\nRegards,\n${SCHOOL_NAME} Administration`;
}

export default function FeeDefaultersPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(null); // student ID being sent to
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [sentIds, setSentIds] = useState(new Set());

  const load = useCallback(() => api.getAllFees(), [api]);
  const { data: fees, loading, refresh } = useAsyncResource(load);

  const defaulters = useMemo(() => {
    if (!fees) return [];
    return fees.filter((f) => f.Status === 'Pending' || f.status === 'Pending');
  }, [fees]);

  const classOptions = useMemo(() => {
    const s = new Set(defaulters.map((f) => String(f.Class || '')).filter(Boolean));
    return [...s].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [defaulters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = defaulters;
    if (filterClass) rows = rows.filter((f) => String(f.Class) === filterClass);
    if (q) rows = rows.filter((f) =>
      String(f.Student_Name || '').toLowerCase().includes(q) ||
      String(f.Student_ID || '').toLowerCase().includes(q)
    );
    return rows;
  }, [defaulters, search, filterClass]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPending = useMemo(
    () => defaulters.reduce((s, f) => s + Number(f.Amount || 0), 0),
    [defaulters]
  );

  async function sendReminder(student) {
    const phone = (student.Parent_WhatsApp || student.Phone || '').replace(/\D/g, '');
    if (!phone) { showToast('No phone number for ' + esc(student.Student_Name), 'err'); return; }
    setSending(student.Fee_ID || student.Student_ID);
    try {
      await whatsappService.sendTextMessage(phone, buildReminderMsg(student));
      setSentIds((prev) => new Set([...prev, student.Fee_ID || student.Student_ID]));
      showToast(`Reminder sent to ${esc(student.Student_Name)}`, 'ok');
    } catch (err) {
      showToast('Failed: ' + err.message, 'err');
    } finally {
      setSending(null);
    }
  }

  async function sendBulkReminders() {
    const targets = filtered.filter((f) => {
      const phone = (f.Parent_WhatsApp || f.Phone || '').replace(/\D/g, '');
      return phone.length >= 10;
    });
    if (!targets.length) { showToast('No phone numbers available', 'err'); return; }
    setBulkSending(true);
    setBulkProgress(0);
    let sent = 0;
    const newSent = new Set(sentIds);
    for (let i = 0; i < targets.length; i++) {
      const f = targets[i];
      const phone = (f.Parent_WhatsApp || f.Phone || '').replace(/\D/g, '');
      try {
        await whatsappService.sendTextMessage(phone, buildReminderMsg(f));
        newSent.add(f.Fee_ID || f.Student_ID);
        sent++;
      } catch { /* continue */ }
      setBulkProgress(Math.round(((i + 1) / targets.length) * 100));
    }
    setSentIds(newSent);
    setBulkSending(false);
    showToast(`Bulk reminders sent: ${sent}/${targets.length}`, 'ok');
  }

  if (loading && !fees) return <Spinner />;

  return (
    <div>
      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat s4">
          <div className="stat-icon-wrap"><IconAlertCircle size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Defaulters</div>
            <div className="stat-value">{defaulters.length}</div>
            <div className="stat-sub">Students with pending fees</div>
          </div>
        </div>
        <div className="stat s5">
          <div className="stat-icon-wrap"><IconFees size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Pending</div>
            <div className="stat-value">₹{totalPending.toLocaleString('en-IN')}</div>
            <div className="stat-sub">Across all classes</div>
          </div>
        </div>
        <div className="stat s1">
          <div className="stat-icon-wrap"><IconUsers size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Filtered</div>
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-sub">Matching current filters</div>
          </div>
        </div>
        <div className="stat s2">
          <div className="stat-icon-wrap"><IconWhatsApp size={22} /></div>
          <div className="stat-info">
            <div className="stat-label">Reminders Sent</div>
            <div className="stat-value">{sentIds.size}</div>
            <div className="stat-sub">This session</div>
          </div>
        </div>
      </div>

      <Card>
        {/* Filters + Actions */}
        <div className="sec-hdr" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                placeholder="Search student name or ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(1); }} style={{ minWidth: 130 }}>
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>Class {esc(c)}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={refresh}>
              <IconRefresh size={14} /> Refresh
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {bulkSending ? (
              <div className="wa-progress-wrap" style={{ minWidth: 200 }}>
                <div className="wa-progress-bar"><div className="wa-progress-fill" style={{ width: bulkProgress + '%' }} /></div>
                <p className="wa-progress-text">Sending... {bulkProgress}%</p>
              </div>
            ) : (
              <button className="btn btn-success btn-sm" onClick={sendBulkReminders} disabled={!filtered.length}>
                <IconWhatsApp size={15} /> Bulk Reminder ({filtered.length})
              </button>
            )}
          </div>
        </div>

        {/* Class Breakdown */}
        <ClassBreakdown defaulters={defaulters} />

        {/* Table */}
        <div className="tbl-wrap" style={{ marginTop: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Fee Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>WhatsApp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No defaulters found</td></tr>
              ) : paged.map((f) => {
                const id = f.Fee_ID || f.Student_ID;
                const isSent = sentIds.has(id);
                const isLoading = sending === id;
                const overdue = calcOverdue(f.Due_Date);
                const phone = (f.Parent_WhatsApp || f.Phone || '').replace(/\D/g, '');
                return (
                  <tr key={id} className={isSent ? 'row-sent' : ''}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{esc(f.Student_Name)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{esc(f.Student_ID)}</div>
                    </td>
                    <td><span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent)' }}>Class {esc(f.Class)}</span></td>
                    <td>{esc(f.Fee_Type)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--danger)' }}>₹{Number(f.Amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: '0.82rem' }}>{esc(f.Due_Date) || '—'}</td>
                    <td>
                      {overdue > 0 ? (
                        <span className="overdue-badge" style={{ '--days': Math.min(overdue, 90) }}>
                          {overdue}d overdue
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {phone ? (
                        <span style={{ fontSize: '0.78rem', color: '#25d366', fontWeight: 700 }}>
                          <IconWhatsApp size={12} /> {phone.slice(-10)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No number</span>
                      )}
                    </td>
                    <td>
                      {isSent ? (
                        <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 700 }}>✓ Sent</span>
                      ) : (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#25d366', color: '#fff', fontSize: '0.78rem' }}
                          onClick={() => sendReminder(f)}
                          disabled={isLoading || !phone}
                          title={phone ? 'Send WhatsApp reminder' : 'No phone number'}
                        >
                          {isLoading ? '...' : <><IconSend size={12} /> Remind</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  );
}

function ClassBreakdown({ defaulters }) {
  const byClass = useMemo(() => {
    const m = {};
    defaulters.forEach((f) => {
      const c = String(f.Class || '—');
      if (!m[c]) m[c] = { count: 0, amount: 0 };
      m[c].count++;
      m[c].amount += Number(f.Amount || 0);
    });
    return Object.entries(m).sort((a, b) => b[1].amount - a[1].amount);
  }, [defaulters]);

  if (!byClass.length) return null;
  const maxAmt = byClass[0]?.[1]?.amount || 1;

  return (
    <div className="defaulter-breakdown">
      <div className="wa-section-title" style={{ marginBottom: 12 }}>Pending by Class</div>
      <div className="breakdown-grid">
        {byClass.map(([cls, data]) => (
          <div key={cls} className="breakdown-item">
            <div className="breakdown-header">
              <span className="breakdown-class">Class {esc(cls)}</span>
              <span className="breakdown-count">{data.count} students</span>
            </div>
            <div className="breakdown-bar-bg">
              <div className="breakdown-bar-fill" style={{ width: `${(data.amount / maxAmt) * 100}%` }} />
            </div>
            <div className="breakdown-amount">₹{data.amount.toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function calcOverdue(dueDateStr) {
  if (!dueDateStr) return 0;
  const parts = String(dueDateStr).split('/');
  if (parts.length !== 3) return 0;
  const due = new Date(parts[2], parts[1] - 1, parts[0]);
  const diff = Math.floor((Date.now() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}
