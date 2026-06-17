import { useCallback, useMemo, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { SCHOOL_NAME } from '../config/schoolConfig.js';
import {
  IconWhatsApp, IconSend, IconTemplate, IconUsers, IconCheck,
  IconAlertCircle, IconRefresh, IconBell, IconClose,
} from '../components/common/Icons.jsx';
import whatsappService from '../services/whatsappService.js';

// ── Message Templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'fee_reminder',
    label: 'Fee Reminder',
    category: 'Finance',
    color: '#f59e0b',
    icon: '💰',
    subject: 'Fee Payment Reminder',
    body: `Dear Parent of *{name}* (Class {class}),

This is a gentle reminder that a fee of *₹{amount}* is due on *{due_date}*.

Please make the payment at the earliest to avoid any inconvenience.

Regards,
${SCHOOL_NAME} Administration`,
    variables: ['name', 'class', 'amount', 'due_date'],
  },
  {
    id: 'absent_alert',
    label: 'Absent Alert',
    category: 'Attendance',
    color: '#ef4444',
    icon: '📋',
    subject: 'Attendance Alert',
    body: `Dear Parent,

We wish to inform you that your ward *{name}* (Class {class}, Roll No. {roll}) was *absent* on *{date}*.

If this was due to illness or emergency, kindly inform the school.

Regards,
${SCHOOL_NAME}`,
    variables: ['name', 'class', 'roll', 'date'],
  },
  {
    id: 'result_published',
    label: 'Result Published',
    category: 'Academics',
    color: '#8b5cf6',
    icon: '🎓',
    subject: 'Exam Result Published',
    body: `Dear Parent of *{name}*,

Results for *{exam}* have been published.

Your ward scored *{marks}/{total}* — Grade *{grade}*.

Please log in to the parent portal to view the detailed report card.

Regards,
${SCHOOL_NAME}`,
    variables: ['name', 'exam', 'marks', 'total', 'grade'],
  },
  {
    id: 'general_notice',
    label: 'General Notice',
    category: 'Announcement',
    color: '#0284c7',
    icon: '📢',
    subject: 'Important Notice',
    body: `Dear Parent,

*{title}*

{message}

Date: {date}

Regards,
${SCHOOL_NAME} Management`,
    variables: ['title', 'message', 'date'],
  },
  {
    id: 'salary_credited',
    label: 'Salary Credited',
    category: 'Payroll',
    color: '#059669',
    icon: '💳',
    subject: 'Salary Credited',
    body: `Dear *{name}*,

Your salary of *₹{amount}* for the month of *{month}* has been credited to your account.

Thank you for your dedicated service.

Regards,
${SCHOOL_NAME} HR`,
    variables: ['name', 'amount', 'month'],
  },
  {
    id: 'exam_schedule',
    label: 'Exam Schedule',
    category: 'Academics',
    color: '#7c3aed',
    icon: '📅',
    subject: 'Upcoming Exam Schedule',
    body: `Dear Parent of *{name}* (Class {class}),

This is to inform you that *{exam}* exams are scheduled from *{start_date}* to *{end_date}*.

Please ensure your ward is well-prepared.

Best wishes,
${SCHOOL_NAME}`,
    variables: ['name', 'class', 'exam', 'start_date', 'end_date'],
  },
];

// ── Sent Log (in-memory for this session) ─────────────────────────────────────
const sentLog = [];

export default function WhatsAppPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('compose');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [targetType, setTargetType] = useState('all_parents'); // all_parents | by_class | custom
  const [customNumbers, setCustomNumbers] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([...sentLog]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadStudents = useCallback(() => api.getStudents(), [api]);
  const { data: students, loading: studentsLoading } = useAsyncResource(loadStudents);

  const classOptions = useMemo(() => {
    const s = new Set((students || []).map((st) => String(st.Class || st.class || '')).filter(Boolean));
    return [...s].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [students]);

  const targetStudents = useMemo(() => {
    if (!students) return [];
    if (targetType === 'by_class' && targetClass)
      return students.filter((s) => String(s.Class || s.class) === targetClass);
    if (targetType === 'all_parents') return students;
    return [];
  }, [students, targetType, targetClass]);

  const phones = useMemo(() => {
    if (targetType === 'custom') {
      return customNumbers.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean);
    }
    return targetStudents
      .map((s) => s.Parent_WhatsApp || s.Phone || s.parent_phone || '')
      .filter(Boolean)
      .map((p) => String(p).replace(/\D/g, ''))
      .filter((p) => p.length >= 10);
  }, [targetType, customNumbers, targetStudents]);

  const messageBody = selectedTemplate ? selectedTemplate.body : customMessage;

  async function handleSend() {
    if (!messageBody.trim()) { showToast('Please write or select a message template', 'err'); return; }
    if (!phones.length) { showToast('No phone numbers found for the selected target', 'err'); return; }
    setSending(true);
    setProgress(0);
    let sent = 0, failed = 0;
    const results = [];
    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      try {
        await whatsappService.sendTextMessage(phone, messageBody);
        results.push({ phone, status: 'sent', time: new Date().toLocaleTimeString() });
        sent++;
      } catch {
        results.push({ phone, status: 'failed', time: new Date().toLocaleTimeString() });
        failed++;
      }
      setProgress(Math.round(((i + 1) / phones.length) * 100));
    }
    const entry = {
      id: Date.now(),
      template: selectedTemplate?.label || 'Custom',
      target: targetType === 'by_class' ? `Class ${targetClass}` : targetType === 'custom' ? 'Custom numbers' : 'All Parents',
      total: phones.length, sent, failed,
      time: new Date().toLocaleString(),
      results,
    };
    sentLog.unshift(entry);
    setLog([...sentLog]);
    setSending(false);
    showToast(`Sent: ${sent} ✓  Failed: ${failed} ✗`, sent > 0 ? 'ok' : 'err');
    setActiveTab('log');
  }

  return (
    <div className="wa-page">
      {/* Header */}
      <div className="wa-header">
        <div className="wa-header-icon">
          <IconWhatsApp size={28} style={{ color: '#25d366' }} />
        </div>
        <div>
          <h1 className="wa-header-title">WhatsApp Notification Center</h1>
          <p className="wa-header-sub">Send automated messages to parents, teachers, and staff</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <StatusChip />
        </div>
      </div>

      {/* Tabs */}
      <div className="wa-tabs">
        {[['compose', 'Compose', <IconTemplate size={15} />], ['log', 'Sent Log', <IconBell size={15} />]].map(([id, label, icon]) => (
          <button key={id} className={`wa-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
            {icon} {label}
            {id === 'log' && log.length > 0 && <span className="wa-tab-badge">{log.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'compose' && (
        <div className="wa-compose-grid">
          {/* Left: Templates */}
          <div>
            <div className="wa-section-title">Message Templates</div>
            <div className="wa-template-grid">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`wa-template-card${selectedTemplate?.id === t.id ? ' selected' : ''}`}
                  onClick={() => { setSelectedTemplate(t); setCustomMessage(''); }}
                  style={{ '--t-color': t.color }}
                >
                  <span className="wa-t-emoji">{t.icon}</span>
                  <div>
                    <div className="wa-t-label">{t.label}</div>
                    <div className="wa-t-cat">{t.category}</div>
                  </div>
                  {selectedTemplate?.id === t.id && <IconCheck size={14} style={{ marginLeft: 'auto', color: t.color }} />}
                </button>
              ))}
              <button
                className={`wa-template-card${!selectedTemplate ? ' selected' : ''}`}
                onClick={() => setSelectedTemplate(null)}
                style={{ '--t-color': '#64748b' }}
              >
                <span className="wa-t-emoji">✏️</span>
                <div>
                  <div className="wa-t-label">Custom</div>
                  <div className="wa-t-cat">Write your own</div>
                </div>
                {!selectedTemplate && <IconCheck size={14} style={{ marginLeft: 'auto', color: '#64748b' }} />}
              </button>
            </div>
          </div>

          {/* Right: Compose Panel */}
          <div className="wa-compose-panel">
            <Card style={{ marginBottom: 20 }}>
              <div className="wa-section-title" style={{ marginBottom: 16 }}>
                {selectedTemplate ? `Template: ${selectedTemplate.label}` : 'Custom Message'}
              </div>

              {/* Message Editor */}
              {selectedTemplate ? (
                <div className="wa-preview-bubble">
                  <pre className="wa-preview-text">{selectedTemplate.body}</pre>
                  <div className="wa-vars-row">
                    {selectedTemplate.variables.map((v) => (
                      <span key={v} className="wa-var-chip">{'{' + v + '}'}</span>
                    ))}
                  </div>
                  <p className="wa-vars-hint">Variables will be filled per-student when sent via bulk.</p>
                </div>
              ) : (
                <textarea
                  className="wa-textarea"
                  placeholder="Type your message here... Use *bold*, _italic_ for WhatsApp formatting."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={8}
                />
              )}
            </Card>

            {/* Recipients */}
            <Card style={{ marginBottom: 20 }}>
              <div className="wa-section-title" style={{ marginBottom: 16 }}>
                <IconUsers size={16} /> Recipients
              </div>
              <div className="wa-recipient-opts">
                {[
                  ['all_parents', 'All Parents', '👨‍👩‍👧'],
                  ['by_class', 'By Class', '🏫'],
                  ['custom', 'Custom Numbers', '✏️'],
                ].map(([val, label, emoji]) => (
                  <label key={val} className={`wa-radio-card${targetType === val ? ' selected' : ''}`}>
                    <input type="radio" name="target" value={val} checked={targetType === val} onChange={() => setTargetType(val)} />
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {targetType === 'by_class' && (
                <select value={targetClass} onChange={(e) => setTargetClass(e.target.value)} style={{ marginTop: 12, width: '100%' }}>
                  <option value="">— Select Class —</option>
                  {classOptions.map((c) => <option key={c} value={c}>Class {esc(c)}</option>)}
                </select>
              )}
              {targetType === 'custom' && (
                <textarea
                  style={{ marginTop: 12, width: '100%', minHeight: 80 }}
                  placeholder="Enter phone numbers (one per line or comma-separated), e.g. 919876543210"
                  value={customNumbers}
                  onChange={(e) => setCustomNumbers(e.target.value)}
                />
              )}

              {studentsLoading ? <Spinner /> : (
                <div className="wa-recipient-count">
                  <IconUsers size={14} />
                  <strong>{phones.length}</strong> recipient{phones.length !== 1 ? 's' : ''} will receive this message
                </div>
              )}
            </Card>

            {/* Send Button */}
            {sending ? (
              <div className="wa-progress-wrap">
                <div className="wa-progress-bar"><div className="wa-progress-fill" style={{ width: progress + '%' }} /></div>
                <p className="wa-progress-text">Sending... {progress}%</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSend} disabled={!phones.length}>
                  <IconSend size={16} /> Send to {phones.length} recipient{phones.length !== 1 ? 's' : ''}
                </button>
                <button className="btn btn-ghost" onClick={() => setPreviewOpen(true)} disabled={!messageBody.trim()}>
                  Preview
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'log' && (
        <div>
          {log.length === 0 ? (
            <div className="empty">No messages sent yet in this session.</div>
          ) : (
            log.map((entry) => <LogEntry key={entry.id} entry={entry} />)
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="modal-bg open" onClick={() => setPreviewOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewOpen(false)}><IconClose size={14} /></button>
            <h3>Message Preview</h3>
            <div className="wa-preview-bubble">
              <pre className="wa-preview-text">{messageBody}</pre>
            </div>
            <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Recipients: <strong>{phones.length}</strong> | Target: <strong>{targetType === 'by_class' ? `Class ${targetClass}` : targetType === 'custom' ? 'Custom' : 'All Parents'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip() {
  const [status, setStatus] = useState('unknown');
  const check = useCallback(async () => {
    try {
      await whatsappService.getPhoneStatus();
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  }, []);
  return (
    <button className={`wa-status-chip wa-status-${status}`} onClick={check} title="Click to check connection">
      <span className="wa-status-dot" />
      {status === 'connected' ? 'Connected' : status === 'error' ? 'Disconnected' : 'Check Status'}
      <IconRefresh size={12} />
    </button>
  );
}

function LogEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((entry.sent / entry.total) * 100);
  return (
    <div className="wa-log-entry">
      <div className="wa-log-header" onClick={() => setOpen(!open)}>
        <div>
          <span className="wa-log-template">{entry.template}</span>
          <span className="wa-log-target">→ {entry.target}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="wa-log-stats">
            <span style={{ color: 'var(--success)' }}>✓ {entry.sent}</span>
            {entry.failed > 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>✗ {entry.failed}</span>}
          </span>
          <span className="wa-log-time">{entry.time}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      <div className="wa-log-progress-bar">
        <div className="wa-log-progress-fill" style={{ width: pct + '%' }} />
      </div>
      {open && (
        <div className="wa-log-detail">
          {entry.results.map((r, i) => (
            <div key={i} className={`wa-log-row ${r.status}`}>
              <span>{r.phone}</span>
              <span>{r.status === 'sent' ? '✓ Sent' : '✗ Failed'}</span>
              <span>{r.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
