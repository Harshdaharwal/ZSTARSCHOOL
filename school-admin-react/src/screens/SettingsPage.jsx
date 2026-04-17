import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { SCHOOL_NAME, ACADEMIC_YEAR, WHATSAPP_DELIVERY_MODE } from '../config/schoolConfig.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

export default function SettingsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [holTitle, setHolTitle] = useState('');
  const [holStart, setHolStart] = useState('');
  const [holEnd, setHolEnd] = useState('');
  const [waBusy, setWaBusy] = useState(false);
  const [waClassFilter, setWaClassFilter] = useState('');
  const [waPage, setWaPage] = useState(1);
  const [waSchedSaving, setWaSchedSaving] = useState(false);
  const [waSched, setWaSched] = useState({
    enabled: false,
    time: '',
    message: '',
    to: '',
    lastSent: '',
  });
  const [confirm, setConfirm] = useState(null);

  const waSupported = typeof api.getWhatsAppLog === 'function';

  const loadAudit = useCallback(() => {
    if (typeof api.getAuditLog !== 'function') return Promise.resolve([]);
    return api.getAuditLog(120);
  }, [api]);
  const { data: auditRows, loading, refresh } = useAsyncResource(loadAudit);

  const loadHolidays = useCallback(
    () => (typeof api.getHolidays === 'function' ? api.getHolidays() : Promise.resolve([])),
    [api]
  );
  const { data: holidays, loading: holidaysLoading, refresh: refreshHolidays } = useAsyncResource(loadHolidays);

  const loadWaLog = useCallback(
    () => (typeof api.getWhatsAppLog === 'function' ? api.getWhatsAppLog(300) : Promise.resolve([])),
    [api]
  );
  const { data: waLog, loading: waLogLoading, refresh: refreshWaLog } = useAsyncResource(loadWaLog);

  const loadClasses = useCallback(
    () => (typeof api.getAllClasses === 'function' ? api.getAllClasses() : Promise.resolve([])),
    [api]
  );
  const { data: classes } = useAsyncResource(loadClasses);

  const loadWaSchedule = useCallback(
    () => (typeof api.getWhatsAppSchedule === 'function' ? api.getWhatsAppSchedule() : Promise.resolve(null)),
    [api]
  );
  const { data: waSchedule, refresh: refreshWaSchedule } = useAsyncResource(loadWaSchedule);

  useEffect(() => {
    if (waSchedule) {
      setWaSched({
        enabled: Boolean(waSchedule.enabled),
        time: waSchedule.time || '',
        message:
          waSchedule.message ||
          `[${SCHOOL_NAME}] Reminder: School fee/payment update. Please settle any pending dues. Reach out to the office for help.`,
        to: waSchedule.to || '',
        lastSent: waSchedule.lastSent || '',
      });
    }
  }, [waSchedule]);

  const loadWaInfo = useCallback(
    () =>
      typeof api.getWhatsAppIntegrationInfo === 'function'
        ? api.getWhatsAppIntegrationInfo()
        : Promise.resolve(null),
    [api]
  );
  const { data: waInfo } = useAsyncResource(loadWaInfo);

  const waClassOptions = useMemo(() => {
    const set = new Set();
    (classes || []).forEach((c) => {
      if (c?.Class != null && String(c.Class).trim()) set.add(String(c.Class).trim());
    });
    (waLog || []).forEach((row) => {
      if (row?.Class != null && String(row.Class).trim()) set.add(String(row.Class).trim());
    });
    return [...set].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [classes, waLog]);

  const filteredWaLog = useMemo(() => {
    const rows = waLog || [];
    if (!waClassFilter) return rows;
    return rows.filter((row) => String(row.Class || '') === String(waClassFilter));
  }, [waLog, waClassFilter]);

  const WA_PAGE_SIZE = 30;
  const waTotalPages = Math.max(1, Math.ceil(filteredWaLog.length / WA_PAGE_SIZE));
  const waCurrentPage = Math.min(waPage, waTotalPages);
  const pagedWaLog = filteredWaLog.slice((waCurrentPage - 1) * WA_PAGE_SIZE, waCurrentPage * WA_PAGE_SIZE);

  useEffect(() => {
    setWaPage(1);
  }, [waClassFilter, waLog]);

  const saveHoliday = useCallback(async () => {
    if (!holTitle.trim() || !holStart || !holEnd) {
      showToast('Enter title, start date, and end date.', 'err');
      return;
    }
    if (typeof api.addHoliday !== 'function') return;
    const r = await api.addHoliday({ title: holTitle.trim(), startDate: holStart, endDate: holEnd });
    showToast(r.msg, r.ok ? 'ok' : 'err');
    if (r.ok) {
      setHolTitle('');
      setHolStart('');
      setHolEnd('');
      refreshHolidays();
      refreshWaLog();
    }
  }, [api, holTitle, holStart, holEnd, showToast, refreshHolidays, refreshWaLog]);

  const removeHoliday = useCallback(
    (id) => {
      if (typeof api.deleteHoliday !== 'function') return;
      setConfirm({
        title: 'Remove Holiday',
        message: 'Are you sure you want to remove this holiday? This will also resume automated notifications for those days.',
        confirmLabel: 'Remove',
        danger: true,
        onConfirm: async () => {
          const r = await api.deleteHoliday(id);
          showToast(r.msg, r.ok ? 'ok' : 'err');
          if (r.ok) refreshHolidays();
          setConfirm(null);
        },
      });
    },
    [api, showToast, refreshHolidays]
  );

  const runReminders = useCallback(async () => {
    if (typeof api.runScheduledParentNotifications !== 'function') return;
    setWaBusy(true);
    try {
      const r = await api.runScheduledParentNotifications();
      showToast(r.msg, r.ok ? 'ok' : 'err');
      if (r.ok) refreshWaLog();
    } finally {
      setWaBusy(false);
    }
  }, [api, showToast, refreshWaLog]);

  const runWeekly = useCallback(async () => {
    if (typeof api.simulateWeeklyWhatsAppDigests !== 'function') return;
    setWaBusy(true);
    try {
      const r = await api.simulateWeeklyWhatsAppDigests();
      showToast(r.msg, r.skipped ? 'ok' : r.ok ? 'ok' : 'err');
      if (r.ok) refreshWaLog();
    } finally {
      setWaBusy(false);
    }
  }, [api, showToast, refreshWaLog]);

  const runMonthly = useCallback(async () => {
    if (typeof api.simulateMonthlyWhatsAppReports !== 'function') return;
    setWaBusy(true);
    try {
      const r = await api.simulateMonthlyWhatsAppReports();
      showToast(r.msg, r.skipped ? 'ok' : r.ok ? 'ok' : 'err');
      if (r.ok) refreshWaLog();
    } finally {
      setWaBusy(false);
    }
  }, [api, showToast, refreshWaLog]);

  const saveWaSchedule = useCallback(async () => {
    if (typeof api.saveWhatsAppSchedule !== 'function') return;
    if (!waSched.time) {
      showToast('Pick a time (HH:MM).', 'err');
      return;
    }
    if (!waSched.to) {
      showToast('Enter destination number.', 'err');
      return;
    }
    setWaSchedSaving(true);
    try {
      const r = await api.saveWhatsAppSchedule(waSched);
      showToast(r.msg, r.ok ? 'ok' : 'err');
      refreshWaSchedule();
    } finally {
      setWaSchedSaving(false);
    }
  }, [api, waSched, showToast, refreshWaSchedule]);

  const toggleWaSchedule = useCallback(
    async (enabled) => {
      if (typeof api.toggleWhatsAppSchedule !== 'function') return;
      setWaSched((s) => ({ ...s, enabled }));
      const r = await api.toggleWhatsAppSchedule(enabled);
      showToast(r.msg, r.ok ? 'ok' : 'err');
      refreshWaSchedule();
    },
    [api, showToast, refreshWaSchedule]
  );

  const runWaScheduleOnce = useCallback(async () => {
    if (typeof api.runWhatsAppScheduleOnce !== 'function') return;
    setWaBusy(true);
    try {
      const r = await api.runWhatsAppScheduleOnce();
      showToast(r.msg, r.ok ? 'ok' : 'err');
      if (r.lastSent) setWaSched((s) => ({ ...s, lastSent: r.lastSent }));
      refreshWaLog();
    } finally {
      setWaBusy(false);
    }
  }, [api, showToast, refreshWaLog]);

  const exportJson = useCallback(async () => {
    if (typeof api.exportSchoolSnapshot !== 'function') {
      showToast('Export not available in this environment.', 'err');
      return;
    }
    setExporting(true);
    try {
      const snap = await api.exportSchoolSnapshot();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `school-snapshot-${ACADEMIC_YEAR.replace(/\//g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Snapshot downloaded — keep this file secure.', 'ok');
    } catch (e) {
      showToast(String(e?.message || e), 'err');
    } finally {
      setExporting(false);
    }
  }, [api, showToast]);

  return (
    <>
      <SectionHeader title={`${t('nav.settings')} — ${SCHOOL_NAME}`} />
      <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 20 }}>
        Academic year {ACADEMIC_YEAR}. JSON export is for offline backup in demo mode; with Firebase, also enable
        scheduled backups in the Google Cloud console.
      </p>

      <Card>
        <CardTitle>Parent WhatsApp alerts (demo)</CardTitle>
        {!waSupported ? (
          <p style={{ color: 'var(--text-muted)' }}>WhatsApp queue is not available in this environment.</p>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
              Mode: <strong>{WHATSAPP_DELIVERY_MODE}</strong> — {waInfo?.message || 'Messages are not sent over the network; they are stored below for review.'}{' '}
              Parent numbers use each student&apos;s <em>Parent WhatsApp</em> field if set, otherwise <em>Phone</em>.
            </p>
            <ul style={{ margin: '0 0 16px 1.1rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              <li>
                <strong>Absent:</strong> when attendance is saved, parents get a WhatsApp-style message for each absent student — skipped if that calendar day falls inside a configured holiday.
              </li>
              <li>
                <strong>Announcements &amp; exams:</strong> broadcast when you post an announcement or add an exam — skipped while <em>today</em> is during a holiday.
              </li>
              <li>
                <strong>Weekly digest:</strong> homework (7 days), marks on file, and weekly announcements; if there are no tests/homework, the text focuses on announcements only. Not sent on holiday days.
              </li>
              <li>
                <strong>Monthly report:</strong> summary with registered mobile, attendance counts, pending fees, and marks. Not sent on holiday days.
              </li>
              <li>
                <strong>Holidays:</strong> saving a holiday notifies all parents with start and end dates. Routine alerts pause during holidays. Use the button below for the &quot;2 days before holidays end&quot; reopening reminder (run daily in production via your backend cron).
              </li>
            </ul>

            <div className="card-title" style={{ fontSize: '1rem', marginBottom: 8 }}>
              Scheduled WhatsApp alert (demo)
            </div>
            <div className="form-grid" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 12 }}>
              <div className="form-group">
                <label>Time (HH:MM, 24h)</label>
                <input type="time" value={waSched.time} onChange={(e) => setWaSched((s) => ({ ...s, time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Send to (WhatsApp number)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={waSched.to}
                  onChange={(e) => setWaSched((s) => ({ ...s, to: e.target.value.replace(/[^0-9+]/g, '') }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Message</label>
                <textarea
                  rows={3}
                  value={waSched.message}
                  onChange={(e) => setWaSched((s) => ({ ...s, message: e.target.value }))}
                  placeholder="[School] Reminder text"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={waSched.enabled}
                    onChange={(e) => toggleWaSchedule(e.target.checked)}
                  />
                  <span>Enable schedule</span>
                </label>
                <Button type="button" size="sm" onClick={saveWaSchedule} disabled={waSchedSaving}>
                  {waSchedSaving ? 'Saving…' : 'Save schedule'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={runWaScheduleOnce} disabled={waBusy}>
                  Send test now
                </Button>
              </div>
              {waSched.lastSent ? (
                <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', margin: 0 }}>
                  Last sent: {waSched.lastSent}
                </p>
              ) : null}
            </div>

            <div className="card-title" style={{ fontSize: '1rem', marginBottom: 8 }}>
              School holidays
            </div>
            <div className="form-grid" style={{ display: 'grid', gap: 12, maxWidth: 520, marginBottom: 16 }}>
              <div className="form-group">
                <label>Title</label>
                <input value={holTitle} onChange={(e) => setHolTitle(e.target.value)} placeholder="e.g. Diwali break" />
              </div>
              <div className="form-group">
                <label>Start (yyyy-mm-dd)</label>
                <input type="date" value={holStart} onChange={(e) => setHolStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End (yyyy-mm-dd)</label>
                <input type="date" value={holEnd} onChange={(e) => setHolEnd(e.target.value)} />
              </div>
              <Button type="button" onClick={saveHoliday}>
                Save holiday &amp; notify parents (mock)
              </Button>
            </div>
            {holidaysLoading && !holidays ? (
              <Spinner />
            ) : (
              <div className="tbl-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Start</th>
                      <th>End</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {!holidays?.length ? (
                      <tr>
                        <td colSpan={4} className="empty" style={{ padding: 12 }}>
                          No holidays configured.
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h) => (
                        <tr key={h.Holiday_ID}>
                          <td>{esc(h.Title)}</td>
                          <td>{esc(h.Start_Date)}</td>
                          <td>{esc(h.End_Date)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeHoliday(h.Holiday_ID)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              <Button type="button" onClick={runReminders} disabled={waBusy}>
                Run holiday reminders (2 days before end)
              </Button>
              <Button type="button" variant="ghost" onClick={runWeekly} disabled={waBusy}>
                Send weekly digests (all parents)
              </Button>
              <Button type="button" variant="ghost" onClick={runMonthly} disabled={waBusy}>
                Send monthly reports (all parents)
              </Button>
              <Button type="button" variant="ghost" onClick={() => refreshWaLog()} disabled={waBusy}>
                Refresh message log
              </Button>
            </div>

            <div className="card-title" style={{ fontSize: '1rem', marginBottom: 8 }}>
              Outgoing message queue (latest)
            </div>
            <div className="filter-bar" style={{ marginBottom: 10 }}>
              <label className="filter-label-inline">
                <span>Class</span>
                <select value={waClassFilter} onChange={(e) => setWaClassFilter(e.target.value)}>
                  <option value="">All</option>
                  {waClassOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </label>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                Showing {pagedWaLog.length ? (waCurrentPage - 1) * WA_PAGE_SIZE + 1 : 0}-
                {Math.min(waCurrentPage * WA_PAGE_SIZE, filteredWaLog.length)} of {filteredWaLog.length}
              </span>
            </div>
            {waLogLoading && !waLog ? (
              <Spinner />
            ) : (
              <div className="tbl-wrap tbl-sticky-first" style={{ maxHeight: 360, overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Time (UTC)</th>
                      <th>To</th>
                      <th>Class</th>
                      <th>Kind</th>
                      <th>Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!pagedWaLog.length ? (
                      <tr>
                        <td colSpan={5} className="empty" style={{ padding: 16 }}>
                          {waLog?.length
                            ? 'No queued messages match this class filter.'
                            : 'No queued messages yet. Mark attendance, post an announcement, or use the buttons above.'}
                        </td>
                      </tr>
                    ) : (
                      pagedWaLog.map((row) => (
                        <tr key={row.Log_ID}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{esc(row.at)}</td>
                          <td>{esc(row.to)}</td>
                          <td>{row.Class ? `Class ${esc(row.Class)}${row.Section ? `-${esc(row.Section)}` : ''}` : '—'}</td>
                          <td>{esc(row.kind)}</td>
                          <td style={{ maxWidth: 280, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.body}>
                            {esc(row.body)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {filteredWaLog.length > WA_PAGE_SIZE ? (
              <div className="btn-row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWaPage((p) => Math.max(1, p - 1))}
                  disabled={waCurrentPage <= 1}
                >
                  Previous
                </Button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                  Page {waCurrentPage} of {waTotalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWaPage((p) => Math.min(waTotalPages, p + 1))}
                  disabled={waCurrentPage >= waTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>Data snapshot (admin)</CardTitle>
        <p style={{ marginBottom: 16 }}>
          Download a single JSON file with students, staff, marks, attendance, fees, and recent audit events. Treat
          it as confidential.
        </p>
        <Button type="button" onClick={exportJson} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download JSON snapshot'}
        </Button>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div className="sec-hdr">
          <CardTitle>Audit log (recent)</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </div>
        {loading && !auditRows ? (
          <Spinner />
        ) : (
          <div className="tbl-wrap tbl-sticky-first audit-table">
            <table>
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {(auditRows || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty" style={{ padding: 24 }}>
                      No audited actions yet. Actions like attendance saves and mark changes appear here in demo
                      mode.
                    </td>
                  </tr>
                ) : (
                  (auditRows || []).map((row, i) => (
                    <tr key={i}>
                      <td>{esc(row.at)}</td>
                      <td>{esc(row.actorEmail)}</td>
                      <td>{esc(row.actorRole)}</td>
                      <td>{esc(row.action)}</td>
                      <td style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.detail}>
                        {esc(row.detail)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
