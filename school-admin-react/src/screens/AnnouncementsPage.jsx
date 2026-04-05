import { useCallback, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';

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
  const { showToast } = useToast();
  const load = useCallback(() => api.getAnnouncements(), [api]);
  const { data: items, loading, refresh } = useAsyncResource(load);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addAnnouncement({
        title: fd.get('title'),
        body: fd.get('body'),
        priority: fd.get('priority'),
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        refresh();
      }
    },
    [api, refresh, showToast]
  );

  const remove = useCallback(
    async (id) => {
      const res = await api.deleteAnnouncement(id);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
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

      <Card>
        <CardTitle>New announcement</CardTitle>
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
              <option>Normal</option>
              <option>High</option>
            </select>
          </div>
          <div className="form-group full btn-row">
            <Button type="submit">Publish</Button>
          </div>
        </form>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <SectionHeader title="Published" actions={<Button onClick={() => refresh()}>Refresh</Button>} />
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
                    <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>{esc(a.Title)}</h3>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', marginBottom: 8 }}>{esc(a.Body)}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {formatPosted(a.Posted_At)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <Badge kind={a.Priority === 'High' ? 'danger' : 'success'}>{a.Priority}</Badge>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(a.Announcement_ID)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
