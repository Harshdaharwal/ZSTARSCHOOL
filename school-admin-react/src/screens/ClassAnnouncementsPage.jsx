import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { IconClassNotices, IconRefresh, IconDocument, IconSchool, IconBell, IconCalendar, IconWarning } from '../components/common/Icons.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

function formatPosted(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export default function ClassAnnouncementsPage() {
  const api = useApi();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Load teacher profile to auto-populate class (for teacher role)
  const loadTeachers = useCallback(() => api.getAllTeachers(), [api]);
  const { data: teachers } = useAsyncResource(loadTeachers);

  const loadClasses = useCallback(() => api.getAllClasses(), [api]);
  const { data: classes } = useAsyncResource(loadClasses);

  // Determine teacher's own class/section
  const teacherProfile = useMemo(() => {
    if (isAdmin || !user?.teacherId || !teachers) return null;
    return teachers.find((t) => String(t.Teacher_ID) === String(user.teacherId)) || null;
  }, [isAdmin, user, teachers]);

  // Available class options for admin; teacher is locked to their class
  const classOptions = useMemo(() => {
    if (!classes) return [];
    return [...classes].sort((a, b) => Number(a.Class) - Number(b.Class) || a.Section.localeCompare(b.Section));
  }, [classes]);

  // Form state
  const [selClass, setSelClass] = useState('');
  const [selSection, setSelSection] = useState('');
  const [posting, setPosting] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Pre-fill class for teacher on load
  useEffect(() => {
    if (teacherProfile) {
      setSelClass(String(teacherProfile.Class_Assigned || ''));
      setSelSection(String(teacherProfile.Section_Assigned || ''));
    } else if (isAdmin && classOptions.length && !selClass) {
      setSelClass(String(classOptions[0].Class));
      setSelSection(String(classOptions[0].Section));
    }
  }, [teacherProfile, classOptions, isAdmin, selClass]);

  // Load existing announcements
  const load = useCallback(() => api.getClassAnnouncements(), [api]);
  const { data: items, loading, refresh } = useAsyncResource(load);

  // Handle admin class select  
  const handleClassChange = (e) => {
    const val = e.target.value; // "cls|section"
    const [c, s] = val.split('|');
    setSelClass(c);
    setSelSection(s);
  };

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selClass || !selSection) {
        showToast('Please select a class first.', 'err');
        return;
      }
      setPosting(true);
      const fd = new FormData(e.target);
      const res = await api.addClassAnnouncement({
        title: fd.get('title'),
        body: fd.get('body'),
        priority: fd.get('priority'),
        cls: selClass,
        section: selSection,
        teacherId: user?.teacherId || '',
        teacherName: teacherProfile?.Name || (isAdmin ? 'Admin' : ''),
      });
      setPosting(false);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, selClass, selSection, user, teacherProfile, isAdmin, refresh, showToast]
  );

  const remove = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete Class Notice',
        message: 'Are you sure you want to delete this class notice? This will remove it for both staff and parents.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const res = await api.deleteClassAnnouncement(id);
          showToast(res.msg, res.ok ? 'ok' : 'err');
          if (res.ok) refresh();
          setConfirm(null);
        },
      });
    },
    [api, refresh, showToast]
  );

  if (loading && !items) return <Spinner />;

  return (
    <>
      <SectionHeader
        title="Class Announcements"
        actions={
          <Button variant="ghost" size="sm" onClick={refresh}>
            <IconRefresh size={14} /> Refresh
          </Button>
        }
      />

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 600 }}>
        Post a class-specific notice. Parents of students in that class will be notified via WhatsApp.
      </p>

      {/* ── Post Form ── */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle><IconDocument size={16} strokeWidth={2} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Class Announcement</CardTitle>

        <div className="form-group" style={{ marginBottom: 16, maxWidth: 320 }}>
          <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, display: 'block' }}>
            Target Class *
          </label>
          <select
            value={selClass && selSection ? `${selClass}|${selSection}` : ''}
            onChange={handleClassChange}
            style={{ width: '100%' }}
          >
            <option value="">— Select class —</option>
            {classOptions.map((c) => (
              <option key={`${c.Class}|${c.Section}`} value={`${c.Class}|${c.Section}`}>
                Class {c.Class}-{c.Section}
              </option>
            ))}
          </select>
          {!isAdmin && teacherProfile && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              (Default: Your assigned class {teacherProfile.Class_Assigned}-{teacherProfile.Section_Assigned})
            </p>
          )}
        </div>

        <form className="form-grid" onSubmit={submit}>
          <div className="form-group full">
            <label>Title *</label>
            <input name="title" required placeholder="Short headline…" />
          </div>
          <div className="form-group full">
            <label>Message *</label>
            <textarea name="body" required rows={4} placeholder="Full details for parents and students…" />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select name="priority" defaultValue="Normal">
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="form-group full btn-row">
            <Button type="submit" disabled={posting || (!selClass && !selSection)}>
              {posting ? 'Posting…' : <><IconBell size={15} style={{ marginRight: 4 }} />Post &amp; Notify Parents</>}
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Announcements List ── */}
      <Card>
        <SectionHeader
          title="Posted Notices"
          actions={<Button size="sm" variant="ghost" onClick={refresh}>Refresh</Button>}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          {!items?.length ? (
            <p className="empty" style={{ padding: 24 }}>
              No class announcements posted yet.
            </p>
          ) : (
            items.map((a) => (
              <article
                key={a.Announcement_ID}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 18px',
                  background: 'var(--card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Class tag + teacher */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(16,185,129,0.12)',
                          color: '#059669',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <IconSchool size={11} strokeWidth={2} />Class {esc(a.Class)}-{esc(a.Section)}
                      </span>
                      {a.Teacher_Name && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          by {esc(a.Teacher_Name)}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>{esc(a.Title)}</h3>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', marginBottom: 8, fontSize: '0.9rem' }}>
                      {esc(a.Body)}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconCalendar size={11} strokeWidth={2} />{formatPosted(a.Posted_At)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <Badge kind={a.Priority === 'High' ? 'danger' : 'success'}>{a.Priority}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(a.Announcement_ID)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
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
