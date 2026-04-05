import { useCallback, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, ChartCard } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { Button } from '../components/common/Button.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PERIOD_OPTS = [
  { id: 'monthly', label: '📅 Monthly' },
  { id: 'weekly', label: '📆 Weekly (this month)' },
  { id: 'yearly', label: '📊 Yearly' },
];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export default function SalaryPage() {
  const api = useApi();
  const { showToast } = useToast();

  const [period, setPeriod] = useState('monthly');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  const now = new Date();

  // For monthly filter — which month/year
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-indexed
  const [selYear, setSelYear] = useState(now.getFullYear());

  const load = useCallback(() => api.getAllSalaries(), [api]);
  const { data: salaries, loading, refresh } = useAsyncResource(load);

  // ── Filter helper ───────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (!salaries) return [];
    let list = [...salaries];

    // Period filter
    if (period === 'monthly') {
      const targetKey = `${String(selMonth + 1).padStart(2, '0')}/${selYear}`;
      list = list.filter((s) => s.Month_Key === targetKey);
    } else if (period === 'weekly') {
      // Show current month's records (weekly view groups by week)
      const mm = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      list = list.filter((s) => s.Month_Key === mm);
    } else if (period === 'yearly') {
      list = list.filter((s) => s.Year === String(selYear));
    }

    // Role filter
    if (roleFilter !== 'all') list = list.filter((s) => s.Role === roleFilter);

    // Status filter
    if (statusFilter !== 'all') list = list.filter((s) => s.Status === statusFilter);

    // Search
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(
        (s) =>
          String(s.Name).toLowerCase().includes(q) ||
          String(s.Designation).toLowerCase().includes(q) ||
          String(s.Staff_ID).toLowerCase().includes(q)
      );
    }

    return list;
  }, [salaries, period, selMonth, selYear, roleFilter, statusFilter, searchQ]);

  // ── Weekly grouping (divide month into 4 weeks) ─────────────────────
  const weeklyGrouped = useMemo(() => {
    if (period !== 'weekly') return null;
    const weeks = [[], [], [], []];
    filteredRecords.forEach((s, i) => {
      weeks[i % 4].push(s);
    });
    return weeks;
  }, [period, filteredRecords]);

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid = filteredRecords.filter((s) => s.Status === 'Paid');
    const pending = filteredRecords.filter((s) => s.Status === 'Pending');
    const teacherRecs = filteredRecords.filter((s) => s.Role === 'teacher');
    const staffRecs = filteredRecords.filter((s) => s.Role === 'staff');
    return {
      totalExpenditure: filteredRecords.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0),
      paidExpenditure: paid.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0),
      pendingExpenditure: pending.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0),
      teacherTotal: teacherRecs.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0),
      staffTotal: staffRecs.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0),
      paidCount: paid.length,
      pendingCount: pending.length,
    };
  }, [filteredRecords]);

  // ── Chart: Teacher vs Staff salary by month (yearly) or by week ──────
  const barChartData = useMemo(() => {
    if (!salaries) return null;

    if (period === 'yearly') {
      const months = MONTHS;
      const teacherByMonth = new Array(12).fill(0);
      const staffByMonth = new Array(12).fill(0);
      salaries
        .filter((s) => s.Year === String(selYear))
        .forEach((s) => {
          const mIdx = MONTHS.indexOf(s.Month);
          if (mIdx === -1) return;
          if (s.Role === 'teacher') teacherByMonth[mIdx] += Number(s.Amount) || 0;
          else staffByMonth[mIdx] += Number(s.Amount) || 0;
        });
      return {
        labels: months.map((m) => m.slice(0, 3)),
        datasets: [
          { label: '👨‍🏫 Teacher Salary', data: teacherByMonth, backgroundColor: '#6366f1' },
          { label: '🏢 Staff Salary', data: staffByMonth, backgroundColor: '#f59e0b' },
        ],
      };
    }

    if (period === 'weekly') {
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weeks = weeklyGrouped || [[], [], [], []];
      const teacherWeek = weeks.map((w) =>
        w.filter((s) => s.Role === 'teacher').reduce((sum, s) => sum + (Number(s.Amount) || 0), 0)
      );
      const staffWeek = weeks.map((w) =>
        w.filter((s) => s.Role === 'staff').reduce((sum, s) => sum + (Number(s.Amount) || 0), 0)
      );
      return {
        labels,
        datasets: [
          { label: '👨‍🏫 Teacher Salary', data: teacherWeek, backgroundColor: '#6366f1' },
          { label: '🏢 Staff Salary', data: staffWeek, backgroundColor: '#f59e0b' },
        ],
      };
    }

    // Monthly — show paid vs pending
    return {
      labels: ['Teachers', 'Staff'],
      datasets: [
        {
          label: '✅ Paid',
          data: [
            filteredRecords.filter((s) => s.Role === 'teacher' && s.Status === 'Paid').reduce((sum, s) => sum + Number(s.Amount || 0), 0),
            filteredRecords.filter((s) => s.Role === 'staff' && s.Status === 'Paid').reduce((sum, s) => sum + Number(s.Amount || 0), 0),
          ],
          backgroundColor: '#10b981',
        },
        {
          label: '⏳ Pending',
          data: [
            filteredRecords.filter((s) => s.Role === 'teacher' && s.Status === 'Pending').reduce((sum, s) => sum + Number(s.Amount || 0), 0),
            filteredRecords.filter((s) => s.Role === 'staff' && s.Status === 'Pending').reduce((sum, s) => sum + Number(s.Amount || 0), 0),
          ],
          backgroundColor: '#ef4444',
        },
      ],
    };
  }, [salaries, period, selYear, filteredRecords, weeklyGrouped]);

  // ── Actions ──────────────────────────────────────────────────────────
  const markPaid = useCallback(
    async (id) => {
      const res = await api.markSalaryPaid(id);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
    },
    [api, refresh, showToast]
  );

  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();
      setAdding(true);
      const fd = new FormData(e.target);
      const monthName = MONTHS[Number(fd.get('monthNum')) - 1] || '';
      const res = await api.addSalaryRecord({
        staffId: fd.get('staffId'),
        name: fd.get('name'),
        role: fd.get('role'),
        designation: fd.get('designation'),
        month: monthName,
        monthNum: fd.get('monthNum'),
        year: fd.get('year'),
        amount: fd.get('amount'),
        status: fd.get('status'),
        remarks: fd.get('remarks') || '',
      });
      setAdding(false);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        setShowAddForm(false);
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const deleteSalary = useCallback(
    async (id) => {
      const res = await api.deleteSalaryRecord(id);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
    },
    [api, refresh, showToast]
  );

  if (loading && !salaries) return <Spinner />;

  return (
    <>
      {/* ── Page Header ── */}
      <SectionHeader
        title="💼 Salary Management"
        actions={
          <div className="btn-row">
            <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? '✕ Cancel' : '＋ Add Record'}
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>
              🔄 Refresh
            </Button>
          </div>
        }
      />

      {/* ── Add Form ── */}
      {showAddForm && (
        <Card style={{ marginBottom: 24 }}>
          <div className="card-title">➕ Add Salary Record</div>
          <form className="form-grid" onSubmit={handleAdd}>
            <div className="form-group">
              <label>Staff ID</label>
              <input name="staffId" placeholder="TCH_001 / STF_001" />
            </div>
            <div className="form-group">
              <label>Name *</label>
              <input name="name" required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role">
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input name="designation" placeholder="e.g. Maths Teacher" />
            </div>
            <div className="form-group">
              <label>Month</label>
              <select name="monthNum" defaultValue={now.getMonth() + 1}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <input name="year" type="number" defaultValue={now.getFullYear()} min={2020} max={2099} />
            </div>
            <div className="form-group">
              <label>Amount (₹) *</label>
              <input name="amount" type="number" min={0} required />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status">
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div className="form-group full">
              <label>Remarks</label>
              <input name="remarks" placeholder="Optional" />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit" disabled={adding}>
                {adding ? 'Saving…' : 'Save Record'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Period + Role Filters ── */}
      <div className="filter-bar" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="btn-row" style={{ gap: 6 }}>
          {PERIOD_OPTS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={period === p.id ? undefined : 'ghost'}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Month/Year selector for monthly & yearly */}
        {(period === 'monthly' || period === 'yearly') && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {period === 'monthly' && (
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                style={{ fontSize: '0.85rem' }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            )}
            <select
              value={selYear}
              onChange={(e) => setSelYear(Number(e.target.value))}
              style={{ fontSize: '0.85rem' }}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <label className="filter-label-inline" style={{ gap: 6 }}>
          <span style={{ fontSize: '0.8rem' }}>Role</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ fontSize: '0.85rem' }}>
            <option value="all">All</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
          </select>
        </label>

        <label className="filter-label-inline" style={{ gap: 6 }}>
          <span style={{ fontSize: '0.8rem' }}>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: '0.85rem' }}>
            <option value="all">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </label>

        <input
          className="search-input"
          placeholder="🔍 Search name / ID…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          style={{ fontSize: '0.85rem', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-card))', color: 'inherit', minWidth: 180 }}
        />
      </div>

      {/* ── Stat Cards ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          variant="s1"
          icon="💼"
          label="Total Expenditure"
          value={fmtINR(stats.totalExpenditure)}
          sub={`${filteredRecords.length} records`}
        />
        <StatCard
          variant="s2"
          icon="✅"
          label="Paid Amount"
          value={fmtINR(stats.paidExpenditure)}
          sub={`${stats.paidCount} paid`}
        />
        <StatCard
          variant="s5"
          icon="⏳"
          label="Pending Amount"
          value={fmtINR(stats.pendingExpenditure)}
          sub={`${stats.pendingCount} pending`}
        />
        <StatCard
          variant="s3"
          icon="👨‍🏫"
          label="Teacher Salary"
          value={fmtINR(stats.teacherTotal)}
        />
        <StatCard
          variant="s4"
          icon="🏢"
          label="Staff Salary"
          value={fmtINR(stats.staffTotal)}
        />
      </div>

      {/* ── Chart ── */}
      {barChartData && (
        <ChartCard
          title={
            period === 'yearly'
              ? `📊 Monthly Salary Breakdown — ${selYear}`
              : period === 'weekly'
              ? `📆 Weekly Salary Distribution — ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
              : `📅 Salary Status — ${MONTHS[selMonth]} ${selYear}`
          }
          style={{ marginBottom: 24 }}
        >
          <div className="chart-container" style={{ height: 280 }}>
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </ChartCard>
      )}

      {/* ── Records Table ── */}
      <Card>
        <div className="card-title">
          📋 Salary Records
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
            {filteredRecords.length} result{filteredRecords.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <p className="empty" style={{ padding: 32 }}>No salary records found for the selected filters.</p>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Designation</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid On</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((s) => (
                  <tr key={s.Salary_ID}>
                    <td>
                      <strong>{esc(s.Name)}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{esc(s.Staff_ID)}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: s.Role === 'teacher' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                          color: s.Role === 'teacher' ? '#6366f1' : '#d97706',
                        }}
                      >
                        {s.Role === 'teacher' ? '👨‍🏫 Teacher' : '🏢 Staff'}
                      </span>
                    </td>
                    <td>{esc(s.Designation)}</td>
                    <td>
                      {esc(s.Month)} {esc(s.Year)}
                    </td>
                    <td>
                      <strong>{fmtINR(s.Amount)}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: s.Status === 'Paid' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                          color: s.Status === 'Paid' ? '#059669' : '#dc2626',
                        }}
                      >
                        {s.Status === 'Paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {s.Paid_Date || '—'}
                    </td>
                    <td>
                      <div className="btn-row" style={{ gap: 4 }}>
                        {s.Status === 'Pending' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => markPaid(s.Salary_ID)}
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteSalary(s.Salary_ID)}
                        >
                          ✕
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
