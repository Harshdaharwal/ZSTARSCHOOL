import { useCallback, useState, useMemo } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../hooks/useAuth.js';
import { esc } from '../utils/format.js';
import { IconPaperclip, IconUpload, IconEdit, IconTrash } from '../components/common/Icons.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function formatPosted(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export default function AnnouncementsPage() {
  const api = useApi();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const load = useCallback(() => api.getAnnouncements(), [api]);
  const { data: items, loading, refresh } = useAsyncResource(load);

  const [editing, setEditing] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const validateAndProcessFile = async (file) => {
    if (!file) return null;
    if (file.size > MAX_FILE_SIZE) {
      showToast('File size must be less than 5MB.', 'err');
      return 'skip';
    }
    if (file.type.startsWith('video/')) {
      showToast('Videos are not allowed.', 'err');
      return 'skip';
    }
    try {
      return await fileToBase64(file);
    } catch (e) {
      showToast('Error processing file.', 'err');
      return 'skip';
    }
  };

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      const fd = new FormData(e.target);
      const file = fd.get('attachment');
      
      let base64 = null;
      if (file && file.size > 0) {
        base64 = await validateAndProcessFile(file);
        if (base64 === 'skip') {
          setSubmitting(false);
          return;
        }
      }

      const res = await api.addAnnouncement({
        title: fd.get('title'),
        body: fd.get('body'),
        priority: fd.get('priority'),
        attachment: base64,
        attachmentName: file?.name || '',
      });
      setSubmitting(false);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        setAddModalOpen(false);
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const update = useCallback(
    async (e) => {
      e.preventDefault();
      setSubmitting(true);
      const fd = new FormData(e.target);
      const file = fd.get('attachment');
      
      let base64 = undefined; // undefined means "no change" to backend
      if (file && file.size > 0) {
        base64 = await validateAndProcessFile(file);
        if (base64 === 'skip') {
          setSubmitting(false);
          return;
        }
      }

      const res = await api.updateAnnouncement(editing.Announcement_ID, {
        title: fd.get('title'),
        body: fd.get('body'),
        priority: fd.get('priority'),
        attachment: base64,
        attachmentName: file?.size > 0 ? file.name : undefined,
      });
      setSubmitting(false);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setEditing(null);
        refresh();
      }
    },
    [api, editing, refresh, showToast]
  );

  const remove = useCallback(
    (id) => {
      setConfirm({
        title: 'Delete Announcement',
        message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          const res = await api.deleteAnnouncement(id);
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
      <SectionHeader title="Announcements" />
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
        Post school-wide notices for staff and parents (shown in order of newest first).
      </p>


      <Card style={{ marginTop: 24 }}>
        <SectionHeader 
          title="Published" 
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setAddModalOpen(true)} size="sm" variant="primary">New Announcement</Button>
              <Button onClick={() => refresh()}>Refresh</Button>
            </div>
          } 
        />
        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!items?.length ? (
            <p className="empty" style={{ padding: 16 }}>
              No announcements yet.
            </p>
          ) : (
            items.map((a) => (
              <article
                key={a.Announcement_ID}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  background: 'var(--card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{esc(a.Title)}</h3>
                      {a.Is_Pending && (
                        <Badge kind="warning" style={{ fontSize: '0.65rem' }}>Pending Broadcast</Badge>
                      )}
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', marginBottom: 8, fontSize: '0.95rem' }}>{esc(a.Body)}</p>
                    
                    {a.Attachment && (
                      <div style={{ marginBottom: 10 }}>
                        <a 
                          href={a.Attachment} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            fontSize: '0.8rem', 
                            color: 'var(--primary)',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '4px 10px',
                            background: 'rgba(99,102,241,0.1)',
                            borderRadius: 6
                          }}
                        >
                          <IconPaperclip size={12} /> {esc(a.Attachment_Name || 'View Attachment')}
                        </a>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>{formatPosted(a.Posted_At)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                         Broadcast: <span style={{ color: a.Is_Pending ? 'var(--warn)' : 'var(--success)' }}>{a.Broadcast_Status}</span>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <Badge kind={a.Priority === 'High' ? 'danger' : 'success'}>{a.Priority}</Badge>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(isAdmin || (a.Is_Pending && a.Author_ID === user?.teacherId)) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(a)}>
                          <IconEdit size={14} />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(a.Announcement_ID)} style={{ color: 'var(--err)' }}>
                          <IconTrash size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
      
      <Modal open={addModalOpen} title="New announcement" onClose={() => setAddModalOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
          <div className="form-group full">
            <label>Title *</label>
            <input name="title" required placeholder="Short headline" />
          </div>
          <div className="form-group full">
            <label>Message *</label>
            <textarea name="body" required rows={4} placeholder="Full text…" />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select name="priority" defaultValue="Normal">
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Attachment (Image/PDF/Doc, max 5MB)</label>
            <div className="file-input-wrapper" style={{ marginTop: 4 }}>
              <input type="file" name="attachment" style={{ fontSize: '0.85rem' }} />
            </div>
          </div>
          <div className="form-group full btn-row">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        open={!!editing} 
        title={editing ? `Edit Announcement` : ''} 
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form className="form-grid" onSubmit={update}>
            <div className="form-group full">
              <label>Title *</label>
              <input name="title" required defaultValue={editing.Title} />
            </div>
            <div className="form-group full">
              <label>Message *</label>
              <textarea name="body" required rows={6} defaultValue={editing.Body} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" defaultValue={editing.Priority}>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Replace Attachment (optional)</label>
              <input type="file" name="attachment" style={{ fontSize: '0.85rem' }} />
            </div>
            <div className="form-group full btn-row">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

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
