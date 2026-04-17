import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { IconCamera, IconTeachers, IconPlus, IconRefresh, IconTrash } from '../components/common/Icons.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';

const PAGE_SIZE = 10;
const MAX_PHOTO_BYTES = 200 * 1024; // 200 KB

/* ── Photo Picker ───────────────────────────────────────────────────── */
function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null);
  const { showToast } = useToast();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      const selectedKb = Math.ceil(file.size / 1024);
      showToast(`Photo is ${selectedKb}KB. Maximum allowed is 200KB.`, 'err');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        onClick={() => inputRef.current?.click()}
        title="Click to upload photo"
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '2px dashed var(--border, #ccc)',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--card-bg, #f5f5f5)',
          flexShrink: 0,
          transition: 'border-color .2s',
        }}
      >
        {value ? (
          <img src={value} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <IconCamera size={28} style={{ opacity: 0.35 }} strokeWidth={1.5} />
        )}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {value ? 'Click to change' : 'Click to add photo'}
        <br />
        Max 200 KB
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

/* ── Photo Thumbnail for table ──────────────────────────────────────── */
function PhotoThumb({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border,#e0e0e0)' }}
      />
    );
  }
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--sidebar-bg,#e8eaf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid var(--border,#e0e0e0)',
        color: 'rgba(99,102,241,0.7)',
      }}
    >
      <IconCamera size={16} strokeWidth={1.5} style={{ opacity: 0.6 }} />
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function TeachersPage() {
  const api = useApi();
  const { showToast } = useToast();
  const load = useCallback(() => api.getAllTeachers(), [api]);
  const { data: teachers, loading, refresh } = useAsyncResource(load);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    if (!teachers?.length) return [];
    const qq = q.toLowerCase();
    if (!qq) return teachers;
    return teachers.filter(
      (t) => String(t.Name).toLowerCase().includes(qq) || String(t.Subject).toLowerCase().includes(qq)
    );
  }, [teachers, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);

  // Photo state for add form
  const [addPhoto, setAddPhoto] = useState('');
  // Photo state for edit modal
  const [editPhoto, setEditPhoto] = useState('');
  // Teacher being deleted (for confirmation)
  const [deletingTeacher, setDeletingTeacher] = useState(null);

  const submitAdd = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const pw = String(fd.get('password') || '');
      const pw2 = String(fd.get('password2') || '');
      if (pw !== pw2) {
        showToast('Password and confirm password do not match.', 'err');
        return;
      }
      if (pw.length < 4) {
        showToast('Password must be at least 4 characters (demo).', 'err');
        return;
      }
      const res = await api.addTeacher({
        name: fd.get('name'),
        subject: fd.get('subject'),
        phone: fd.get('phone'),
        email: fd.get('email') || '',
        qualification: fd.get('qualification') || '',
        classAssigned: fd.get('classAssigned') || '',
        sectionAssigned: fd.get('sectionAssigned') || '',
        joinDate: fd.get('joinDate') || '',
        password: pw,
        photo: addPhoto,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        e.target.reset();
        setAddPhoto('');
        refresh();
      }
    },
    [api, addPhoto, refresh, showToast]
  );

  const saveEdit = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const pw = String(fd.get('password') || '');
      const pw2 = String(fd.get('password2') || '');
      if (pw && pw !== pw2) {
        showToast('Password and confirm password do not match.', 'err');
        return;
      }
      const res = await api.updateTeacher(edit.Teacher_ID, {
        name: fd.get('name'),
        subject: fd.get('subject'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        qualification: fd.get('qualification') || edit.Qualification || '',
        classAssigned: fd.get('classAssigned') || '',
        sectionAssigned: fd.get('sectionAssigned') || '',
        joinDate: fd.get('joinDate') || '',
        password: pw || undefined,
        photo: editPhoto,
      });
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setOpenEdit(false);
        refresh();
      }
    },
    [api, edit, editPhoto, refresh, showToast]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingTeacher) return;
    try {
      const res = await api.deleteTeacher(deletingTeacher.Teacher_ID);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
    } catch {
      showToast('Failed to delete teacher.', 'err');
    } finally {
      setDeletingTeacher(null);
    }
  }, [api, deletingTeacher, refresh, showToast]);

  if (loading && !teachers) return <Spinner />;

  return (
    <>
      <Card>
        <CardTitle><IconPlus size={16} strokeWidth={2.5} style={{ verticalAlign: 'middle', marginRight: 6 }} />Add Teacher</CardTitle>
        <form className="form-grid" onSubmit={submitAdd}>
          {/* Photo picker */}
          <div className="form-group full" style={{ display: 'flex', justifyContent: 'center' }}>
            <PhotoPicker value={addPhoto} onChange={setAddPhoto} />
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input name="name" required />
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <input name="subject" required />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              name="phone"
              required
              maxLength={10}
              pattern="\d{10}"
              title="Enter a 10-digit mobile number"
              placeholder="10-digit number"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" />
          </div>
          <div className="form-group">
            <label>Qualification</label>
            <input name="qualification" />
          </div>
          <div className="form-group">
            <label>Join date</label>
            <input name="joinDate" type="date" />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input name="password" type="password" autoComplete="new-password" required minLength={4} />
          </div>
          <div className="form-group">
            <label>Confirm password *</label>
            <input name="password2" type="password" autoComplete="new-password" required minLength={4} />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select name="classAssigned">
              <option value="">--</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section</label>
            <select name="sectionAssigned">
              <option value="">--</option>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <p className="form-group full" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Password is stored for demo / local mode only. Use your real auth provider in production.
          </p>
          <div className="form-group full btn-row">
            <Button type="submit">Add Teacher</Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader title="All Teachers" actions={<Button onClick={() => refresh()} size="sm" variant="ghost"><IconRefresh size={14} /> Refresh</Button>} />
        <div className="filter-bar">
          <input placeholder="Search…" style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>ID</th>
                <th>Name</th>
                <th>Subject</th>
                <th>Phone</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty" style={{ padding: 24 }}>
                    No teachers match your search.
                  </td>
                </tr>
              ) : (
                pagedRows.map((t) => (
                  <tr key={t.Teacher_ID}>
                    <td><PhotoThumb src={t.Photo} name={t.Name} /></td>
                    <td>{esc(t.Teacher_ID)}</td>
                    <td>{esc(t.Name)}</td>
                    <td>{esc(t.Subject)}</td>
                    <td>{esc(t.Phone)}</td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setView(t);
                          setOpenView(true);
                        }}
                      >
                        View
                      </Button>{' '}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setEdit(t);
                          setEditPhoto(t.Photo || '');
                          setOpenEdit(true);
                        }}
                      >
                        Edit
                      </Button>{' '}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingTeacher(t)}
                        title="Delete teacher"
                        style={{ color: 'var(--danger, #e53935)' }}
                      >
                        <IconTrash size={14} />
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

      {/* View modal */}
      <Modal open={openView} title="Teacher details" onClose={() => setOpenView(false)}>
        {view && (
          <div>
            {/* Large photo at top */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              {view.Photo ? (
                <img
                  src={view.Photo}
                  alt={view.Name}
                  style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border,#e0e0e0)' }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'var(--sidebar-bg,#e8eaf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid var(--border,#e0e0e0)',
                    color: 'rgba(99,102,241,0.6)',
                  }}
                >
                  <IconCamera size={48} strokeWidth={1.2} style={{ opacity: 0.5 }} />
                </div>
              )}
            </div>
            <dl className="detail-dl">
              <dt>ID</dt>
              <dd>{esc(view.Teacher_ID)}</dd>
              <dt>Name</dt>
              <dd>{esc(view.Name)}</dd>
              <dt>Subject</dt>
              <dd>{esc(view.Subject)}</dd>
              <dt>Phone</dt>
              <dd>{esc(view.Phone)}</dd>
              <dt>Email</dt>
              <dd>{esc(view.Email || '—')}</dd>
              <dt>Qualification</dt>
              <dd>{esc(view.Qualification || '—')}</dd>
              <dt>Join date</dt>
              <dd>{esc(view.Join_Date || '—')}</dd>
              <dt>Class / Section</dt>
              <dd>
                {esc(view.Class_Assigned || '—')} {view.Section_Assigned ? `· ${esc(view.Section_Assigned)}` : ''}
              </dd>
              <dt>Status</dt>
              <dd>{esc(view.Status || '—')}</dd>
            </dl>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={openEdit} title="Edit Teacher" onClose={() => setOpenEdit(false)}>
        {edit && (
          <form className="form-grid" onSubmit={saveEdit}>
            {/* Photo picker */}
            <div className="form-group full" style={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoPicker value={editPhoto} onChange={setEditPhoto} />
            </div>

            <div className="form-group full">
              <label>Teacher ID</label>
              <input
                value={edit.Teacher_ID}
                readOnly
                style={{ background: 'var(--input-disabled-bg, #f3f4f6)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                title="Teacher ID cannot be changed"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                Teacher ID is auto-assigned and cannot be edited.
              </span>
            </div>

            <div className="form-group">
              <label>Name</label>
              <input name="name" defaultValue={edit.Name} />
            </div>
            <div className="form-group">
              <label>Subject</label>
              <input name="subject" defaultValue={edit.Subject} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                name="phone"
                defaultValue={edit.Phone}
                maxLength={10}
                pattern="\d{10}"
                title="Enter a 10-digit mobile number"
                placeholder="10-digit number"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" defaultValue={edit.Email} />
            </div>
            <div className="form-group">
              <label>Qualification</label>
              <input name="qualification" defaultValue={edit.Qualification || ''} />
            </div>
            <div className="form-group">
              <label>Join date</label>
              <input
                name="joinDate"
                type="date"
                defaultValue={isoDateFromStored(edit.Join_Date)}
              />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep" />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input name="password2" type="password" autoComplete="new-password" placeholder="Repeat if changing" />
            </div>
            <div className="form-group">
              <label>Class</label>
              <select name="classAssigned" defaultValue={edit.Class_Assigned || ''}>
                <option value="">--</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <select name="sectionAssigned" defaultValue={edit.Section_Assigned || ''}>
                <option value="">--</option>
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="btn-row">
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingTeacher}
        title="Delete Teacher"
        message={deletingTeacher ? `Are you sure you want to permanently delete teacher "${deletingTeacher.Name}" (${deletingTeacher.Teacher_ID})? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTeacher(null)}
      />
    </>
  );
}

/** Best-effort: map dd/mm/yyyy to yyyy-mm-dd for <input type="date"> */
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
