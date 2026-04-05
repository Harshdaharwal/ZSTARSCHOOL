import { useCallback, useMemo, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, ChartCard } from '../components/common/Card.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { FilterTabs } from '../components/common/FilterTabs.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDashboardStatItems } from '../hooks/useDashboardStats.js';
import { esc } from '../utils/format.js';

const ALL_DASH_TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'students', label: '🎒 Students Analytics' },
  { id: 'attendance', label: '✅ Attendance Trends' },
  { id: 'fees', label: '💰 Fee Collection', adminOnly: true },
];



const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};

export default function DashboardPage() {
  const api = useApi();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const DASH_TABS = useMemo(
    () => ALL_DASH_TABS.filter((t) => !(t.adminOnly && isTeacher)),
    [isTeacher]
  );
  const [tab, setTab] = useState('overview');
  const [overviewClass, setOverviewClass] = useState('');

  const load = useCallback(() => api.getDashboardStats(), [api]);
  const { data, loading, error, refresh } = useAsyncResource(load);

  const allStatItems = useDashboardStatItems(data);
  const statItems = isTeacher
    ? allStatItems.filter((s) => s.label !== 'Pending Fees' && s.label !== 'Month Collection')
    : allStatItems;

  const byClassTrend = useMemo(
    () => data?.chartData?.attendanceTrendByClass || {},
    [data]
  );
  const overviewClassKeys = useMemo(
    () =>
      Object.keys(byClassTrend).sort(
        (a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b))
      ),
    [byClassTrend]
  );

  const { lineData, barClassData, groupedSide } = useMemo(() => {
    const allTrend = data?.chartData?.attendanceTrend || [];
    const tr =
      overviewClass && (byClassTrend[overviewClass]?.length ?? 0) > 0
        ? byClassTrend[overviewClass]
        : allTrend;
    const cm = data?.chartData?.classDistribution || {};
    const sr = data?.sidePanelStudents || [];
    const keys = Object.keys(cm).sort((a, b) => Number(a) - Number(b));
    const by = {};
    sr.forEach((r) => {
      if (!by[r.cls]) by[r.cls] = [];
      by[r.cls].push(r);
    });
    return {
      lineData: {
        labels: tr.map((t) => t.date),
        datasets: [
          {
            label: 'Present',
            data: tr.map((t) => t.present),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Absent',
            data: tr.map((t) => t.absent),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.05)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      barClassData: {
        labels: keys,
        datasets: [{ label: 'Students', data: keys.map((k) => cm[k]), backgroundColor: '#3b82f6' }],
      },
      groupedSide: by,
    };
  }, [data, overviewClass, byClassTrend]);

  if (loading && !data) return <Spinner />;
  if (error) return <div className="empty">Failed to load dashboard</div>;

  return (
    <>
      <FilterTabs tabs={DASH_TABS} activeId={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="stats-grid">
            {statItems.map((s) => (
              <StatCard key={s.label} variant={s.variant} icon={s.icon} label={s.label} value={s.value} sub={s.sub} />
            ))}
          </div>
          <TeacherTodaySchedule api={api} />
          <div className="filter-bar" style={{ marginBottom: 20 }}>
            <label className="filter-label-inline">
              <span>Attendance focus (class)</span>
              <select value={overviewClass} onChange={(e) => setOverviewClass(e.target.value)}>
                <option value="">All classes (school-wide trend)</option>
                {overviewClassKeys.map((c) => (
                  <option key={c} value={c}>
                    Class {esc(c)} only
                  </option>
                ))}
              </select>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 200 }}>
              Filters the line chart and the detailed attendance list on the right to one class. Enrollment chart stays
              school-wide.
            </p>
          </div>
          <div className="dashboard-layout">
            <div className="dash-charts">
              <ChartCard
                title={
                  overviewClass
                    ? `📈 Attendance trend — Class ${esc(overviewClass)} (last 7 days)`
                    : '📈 Overall attendance trend (last 7 days)'
                }
              >
                <div className="chart-container">
                  <Line data={lineData} options={chartOptions} />
                </div>
              </ChartCard>
              <ChartCard title="🎒 Students Enrolled per Class">
                <div className="chart-container">
                  <Bar
                    data={barClassData}
                    options={{ ...chartOptions, plugins: { legend: { display: false } } }}
                  />
                </div>
              </ChartCard>
            </div>
            <div className="dash-side-panel">
              <div className="card-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                🧑‍🎓 Detailed Attendance
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 16px' }}>
                Sample students per class (mock data)
              </p>
              {(overviewClass ? [overviewClass] : Object.keys(groupedSide).sort((a, b) => Number(a) - Number(b)))
                .filter((c) => groupedSide[c]?.length)
                .map((c) => (
                  <div key={c}>
                    <div className="class-group-header">Class {esc(c)}</div>
                    {groupedSide[c].map((s) => {
                      const pct = s.pct || 0;
                      const barCls = pct >= 75 ? '' : pct >= 50 ? 'warn' : 'danger';
                      const badgeCls = pct >= 75 ? 'pct-good' : pct >= 50 ? 'pct-warn' : 'pct-bad';
                      return (
                        <div key={s.id} className="student-att-item">
                          <div>
                            <strong>{esc(s.name)}</strong>
                            <div className="att-bar-bg">
                              <div className={'att-bar-fill ' + barCls} style={{ width: pct + '%' }} />
                            </div>
                          </div>
                          <span className={'pct-badge ' + badgeCls}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {tab === 'students' && <StudentsAnalyticsPanel api={api} />}
      {tab === 'attendance' && <AttendanceTrendsPanel chartData={data?.chartData} />}
      {tab === 'fees' && !isTeacher && <FeesPanel api={api} />}

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => refresh()}>
          🔄 Refresh dashboard
        </button>
      </div>
    </>
  );
}

function TeacherTodaySchedule({ api }) {
  const { user } = useAuth();
  const weekday = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long' }),
    []
  );

  const load = useCallback(() => {
    if (user?.role !== 'teacher' || !user?.teacherId) return Promise.resolve([]);
    if (typeof api.getScheduleForTeacherDay !== 'function') return Promise.resolve([]);
    return api.getScheduleForTeacherDay(user.teacherId, weekday);
  }, [api, user, weekday]);

  const { data: periods, loading } = useAsyncResource(load);

  if (user?.role !== 'teacher' || !user?.teacherId) return null;

  return (
    <Card style={{ marginBottom: 24 }}>
      <div className="card-title">🗓️ Today&apos;s timetable ({esc(weekday)})</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Your assigned class sections — periods for this weekday (India calendar).
      </p>
      {loading && !periods ? (
        <Spinner />
      ) : !periods?.length ? (
        <p className="empty" style={{ padding: 20 }}>
          No periods in the schedule for today. Admins can add rows under Classes → Schedule.
        </p>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>P</th>
                <th>Subject</th>
                <th>Room</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr key={i}>
                  <td>{esc(String(p.Period))}</td>
                  <td>{esc(p.Subject)}</td>
                  <td>{esc(p.Room)}</td>
                  <td>{esc(p.Time_Slot)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StudentsAnalyticsPanel({ api }) {
  const [filterClass, setFilterClass] = useState('');
  const load = useCallback(() => api.getStudentStats(filterClass || undefined), [api, filterClass]);
  const { data: stats, loading } = useAsyncResource(load);

  const { barBySection, doughnutData, strengthData } = useMemo(() => {
    const byC = stats?.byClass || {};
    const keys = Object.keys(byC).sort();
    const g = stats?.byGender || { Male: 0, Female: 0, Other: 0 };
    const clsOnly = {};
    keys.forEach((k) => {
      const p = k.split('-');
      const c = p[0];
      clsOnly[c] = (clsOnly[c] || 0) + byC[k];
    });
    const ck = Object.keys(clsOnly).sort((a, b) => Number(a) - Number(b));
    return {
      barBySection: {
        labels: keys,
        datasets: [{ label: 'Students', data: keys.map((k) => byC[k]), backgroundColor: '#8b5cf6' }],
      },
      doughnutData: {
        labels: ['Male', 'Female', 'Other'],
        datasets: [
          {
            data: [g.Male || 0, g.Female || 0, g.Other || 0],
            backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'],
          },
        ],
      },
      strengthData: {
        labels: ck.map((x) => 'Cls ' + x),
        datasets: [{ label: 'Strength', data: ck.map((k) => clsOnly[k]), backgroundColor: '#14b8a6' }],
      },
    };
  }, [stats]);

  const classOptions = useMemo(() => {
    if (stats?.allClasses?.length) return stats.allClasses;
    const s = new Set();
    Object.keys(stats?.byClass || {}).forEach((k) => s.add(String(k).split('-')[0]));
    return [...s].sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
  }, [stats]);

  if (loading && !stats) return <Spinner />;

  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <label className="filter-label-inline">
          <span>Class filter</span>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Class {esc(c)}
              </option>
            ))}
          </select>
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 180 }}>
          {filterClass
            ? `Showing students in class ${esc(filterClass)} only (sections, gender, strength).`
            : 'School-wide distribution. Pick a class to drill down.'}
        </p>
      </div>
      <Card>
        <div className="card-title">
          🎒 Student distribution {filterClass ? `(class ${esc(filterClass)})` : '(class–section)'}
        </div>
        <div className="chart-container">
          {Object.keys(stats?.byClass || {}).length === 0 ? (
            <p className="empty" style={{ padding: 24 }}>
              No students for this filter.
            </p>
          ) : (
            <Bar data={barBySection} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
          )}
        </div>
      </Card>
      <div className="chart-row">
        <Card>
          <div className="card-title">👥 Gender distribution</div>
          <div className="chart-container" style={{ height: 250 }}>
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </Card>
        <Card>
          <div className="card-title">
            {filterClass ? `📊 Sections in class ${esc(filterClass)}` : '📊 Class-wise strength'}
          </div>
          <div className="chart-container" style={{ height: 250 }}>
            <Bar data={strengthData} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
          </div>
        </Card>
      </div>
    </>
  );
}

function AttendanceTrendsPanel({ chartData }) {
  const [cls, setCls] = useState('');
  const byClass = useMemo(() => chartData?.attendanceTrendByClass || {}, [chartData]);
  const allTrend = useMemo(() => chartData?.attendanceTrend || [], [chartData]);
  const classKeys = useMemo(
    () => Object.keys(byClass).sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b))),
    [byClass]
  );
  const lineData = useMemo(() => {
    const tr = cls ? (byClass[cls] || []) : allTrend;
    return {
      labels: tr.map((t) => t.date),
      datasets: [
        {
          label: 'Present',
          data: tr.map((t) => t.present),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Absent',
          data: tr.map((t) => t.absent),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.05)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [cls, byClass, allTrend]);

  const classCompareBar = useMemo(() => {
    const keys = classKeys;
    const present = keys.map((c) => (byClass[c] || []).reduce((s, t) => s + (t.present || 0), 0));
    const absent = keys.map((c) => (byClass[c] || []).reduce((s, t) => s + (t.absent || 0), 0));
    return {
      labels: keys.map((c) => `Class ${c}`),
      datasets: [
        { label: 'Present (7d total)', data: present, backgroundColor: '#10b981' },
        { label: 'Absent (7d total)', data: absent, backgroundColor: '#f87171' },
      ],
    };
  }, [byClass, classKeys]);

  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <label className="filter-label-inline">
          <span>Trend chart — class</span>
          <select value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="">All classes (combined trend)</option>
            {classKeys.map((c) => (
              <option key={c} value={c}>
                Class {esc(c)}
              </option>
            ))}
          </select>
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 200 }}>
          Line chart uses the last 7 days of student attendance. Below, bars compare present vs absent totals per class
          over that window.
        </p>
      </div>
      <Card>
        <div className="card-title">
          {cls ? `✅ Daily trend — class ${esc(cls)}` : '✅ Daily trend — all classes'}
        </div>
        <div className="chart-container">
          <Line data={lineData} options={chartOptions} />
        </div>
      </Card>
      <Card style={{ marginTop: 24 }}>
        <div className="card-title">📊 Class-wise attendance (present vs absent, last 7 days)</div>
        <div className="chart-container">
          {classKeys.length === 0 ? (
            <p className="empty" style={{ padding: 24 }}>No attendance breakdown by class.</p>
          ) : (
            <Bar data={classCompareBar} options={chartOptions} />
          )}
        </div>
      </Card>
    </>
  );
}

function FeesPanel({ api }) {
  const [feeClass, setFeeClass] = useState('');
  const load = useCallback(() => api.getAllFees(), [api]);
  const { data: fees } = useAsyncResource(load);

  const classOptions = useMemo(() => {
    const s = new Set((fees || []).map((f) => String(f.Class || '')).filter(Boolean));
    return [...s].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [fees]);

  const { revenueByClassBar, pendingByClassBar, feesTrendLine } = useMemo(() => {
    const allFees = fees || [];
    const feeClassKeys = [...new Set(allFees.map((f) => String(f.Class)).filter(Boolean))].sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b)
    );
    const paidByCls = {};
    const pendByCls = {};
    allFees.forEach((f) => {
      const c = String(f.Class);
      if (!c) return;
      if (f.Status === 'Paid') paidByCls[c] = (paidByCls[c] || 0) + (Number(f.Amount) || 0);
      if (f.Status === 'Pending') pendByCls[c] = (pendByCls[c] || 0) + (Number(f.Amount) || 0);
    });

    let list = allFees;
    if (feeClass) list = list.filter((f) => String(f.Class) === String(feeClass));
    const byMonth = {};
    list
      .filter((f) => f.Status === 'Paid' && f.Paid_Date)
      .forEach((f) => {
        const p = String(f.Paid_Date).split('/');
        if (p.length === 3) {
          const m = p[1] + '/' + p[2];
          byMonth[m] = (byMonth[m] || 0) + (Number(f.Amount) || 0);
        }
      });
    const pendByMonth = {};
    list
      .filter((f) => f.Status === 'Pending' && f.Due_Date)
      .forEach((f) => {
        const p = String(f.Due_Date).split('/');
        if (p.length === 3) {
          const m = p[1] + '/' + p[2];
          pendByMonth[m] = (pendByMonth[m] || 0) + (Number(f.Amount) || 0);
        }
      });
    const monthKeys = [...new Set([...Object.keys(byMonth), ...Object.keys(pendByMonth)])].sort();
    return {
      revenueByClassBar: {
        labels: feeClassKeys.map((c) => `Class ${c}`),
        datasets: [
          {
            label: '₹ Collected (paid)',
            data: feeClassKeys.map((c) => paidByCls[c] || 0),
            backgroundColor: '#f59e0b',
          },
        ],
      },
      pendingByClassBar: {
        labels: feeClassKeys.map((c) => `Class ${c}`),
        datasets: [
          {
            label: '₹ Pending',
            data: feeClassKeys.map((c) => pendByCls[c] || 0),
            backgroundColor: '#dc2626',
          },
        ],
      },
      feesTrendLine: {
        labels: monthKeys,
        datasets: [
          {
            label: '₹ Collected (by paid month)',
            data: monthKeys.map((k) => byMonth[k] || 0),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.12)',
            fill: true,
            tension: 0.3,
          },
          {
            label: '₹ Pending (by due month)',
            data: monthKeys.map((k) => pendByMonth[k] || 0),
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234,88,12,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
    };
  }, [fees, feeClass]);

  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <label className="filter-label-inline">
          <span>Monthly charts — class</span>
          <select value={feeClass} onChange={(e) => setFeeClass(e.target.value)}>
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Class {esc(c)}
              </option>
            ))}
          </select>
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: 200 }}>
          Class-wise bars are school-wide. The dropdown filters the combined monthly trend (green = collected by paid month,
          orange = pending by due month).
        </p>
      </div>
      <div className="chart-row">
        <ChartCard title="💰 Paid revenue by class">
          <div className="chart-container">
            <Bar
              data={revenueByClassBar}
              options={{ ...chartOptions, plugins: { legend: { display: false } } }}
            />
          </div>
        </ChartCard>
        <ChartCard title="⏳ Pending fees by class">
          <div className="chart-container">
            <Bar
              data={pendingByClassBar}
              options={{ ...chartOptions, plugins: { legend: { display: false } } }}
            />
          </div>
        </ChartCard>
      </div>
      <Card style={{ marginTop: 24 }}>
        <div className="card-title">
          📈 Collected vs pending by month
          {feeClass ? ` (class ${esc(feeClass)})` : ' (all classes)'}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
          Green: fees collected, grouped by paid month (mm/yyyy). Orange: outstanding fees, grouped by due month
          (mm/yyyy).
        </p>
        <div className="chart-container">
          <Line data={feesTrendLine} options={chartOptions} />
        </div>
      </Card>
    </>
  );
}
