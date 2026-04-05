import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardTitle } from '../components/common/Card.jsx';
import { Button } from '../components/common/Button.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { SectionHeader } from '../components/common/SectionHeader.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { PaginationBar } from '../components/common/PaginationBar.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useFilteredList } from '../hooks/useFilteredList.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { ACADEMIC_YEAR, ACADEMIC_YEAR_OPTIONS } from '../config/schoolConfig.js';

const PAGE_SIZE = 20;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB

/* ── Photo Picker ───────────────────────────────────────────────────── */
function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null);
  const { showToast } = useToast();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      showToast('Photo must be 4 MB or smaller.', 'err');
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
          <span style={{ fontSize: 32, opacity: 0.4 }}>📷</span>
        )}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {value ? 'Click to change' : 'Click to add photo'}
        <br />
        Max 4 MB
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
        fontSize: 18,
        border: '2px solid var(--border,#e0e0e0)',
      }}
    >
      🎒
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function StudentsPage() {
  const api = useApi();
  const { showToast } = useToast();
  const load = useCallback(() => api.getAllStudents(), [api]);
  const { data: students, loading, refresh } = useAsyncResource(load);

  const [q, setQ] = useState('');
  const [fc, setFc] = useState('');
  const [fs, setFs] = useState('');
  const [fy, setFy] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useFilteredList(students || [], q, fc, fs, fy, '');

  useEffect(() => {
    setPage(1);
  }, [q, fc, fs, fy]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  // Photo state for add form
  const [addPhoto, setAddPhoto] = useState('');
  // Photo state for edit modal
  const [editPhoto, setEditPhoto] = useState('');

  const openEdit = useCallback((s) => {
    setEdit(s);
    setEditPhoto(s.Photo || '');
    setModalOpen(true);
  }, []);

  const onSave = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.updateStudent(edit.Student_ID, {
        name: fd.get('name'),
        fatherName: fd.get('father'),
        motherName: edit.Mother_Name,
        cls: fd.get('cls'),
        section: fd.get('section'),
        dob: edit.DOB,
        gender: edit.Gender,
        phone: fd.get('phone'),
        parentWhatsApp: fd.get('parentWhatsApp'),
        address: fd.get('address'),
        academicYear: fd.get('academicYear'),
        photo: editPhoto,
      });
      showToast(res.ok ? res.msg : res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) {
        setModalOpen(false);
        refresh();
      }
    },
    [api, edit, editPhoto, refresh, showToast]
  );

  const toggleStatus = useCallback(
    async (id, next) => {
      const res = await api.setStudentStatus(id, next);
      showToast(res.msg, res.ok ? 'ok' : 'err');
      if (res.ok) refresh();
    },
    [api, refresh, showToast]
  );

  const addStudent = useCallback(
    async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const res = await api.addStudent({
        name: fd.get('name'),
        fatherName: fd.get('father'),
        motherName: fd.get('mother') || '',
        cls: fd.get('cls'),
        section: fd.get('section'),
        dob: fd.get('dob') || '',
        gender: fd.get('gender'),
        phone: fd.get('phone') || '',
        parentWhatsApp: fd.get('parentWhatsApp') || '',
        address: fd.get('address') || '',
        academicYear: fd.get('academicYear'),
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

  if (loading && !students) return <Spinner />;

  return (
    <>
      <Card>
        <CardTitle>➕ New Student Registration</CardTitle>
        <form className="form-grid" onSubmit={addStudent}>
          {/* Photo picker spans full width, centered */}
          <div className="form-group full" style={{ display: 'flex', justifyContent: 'center' }}>
            <PhotoPicker value={addPhoto} onChange={setAddPhoto} />
          </div>

          <div className="form-group">
            <label>Full Name *</label>
            <input name="name" required placeholder="Student name" />
          </div>
          <div className="form-group">
            <label>Father&apos;s Name *</label>
            <input name="father" required />
          </div>
          <div className="form-group">
            <label>Mother&apos;s Name</label>
            <input name="mother" />
          </div>
          <div className="form-group">
            <label>Class *</label>
            <select name="cls" required>
              <option value="">-- Select --</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section *</label>
            <select name="section" required>
              <option value="">--</option>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Academic year *</label>
            <select name="academicYear" required defaultValue={ACADEMIC_YEAR}>
              {ACADEMIC_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>DOB</label>
            <input name="dob" type="date" />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" defaultValue="Male">
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" maxLength={10} />
          </div>
          <div className="form-group">
            <label>Parent WhatsApp (optional)</label>
            <input name="parentWhatsApp" maxLength={15} placeholder="10-digit; overrides Phone for alerts" />
          </div>
          <div className="form-group full">
            <label>Address</label>
            <textarea name="address" rows={2} />
          </div>
          <div className="form-group full btn-row">
            <Button type="submit">🎒 Register Student</Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader title="📋 All Students" actions={<Button onClick={() => refresh()}>🔄 Refresh</Button>} />
        <div className="filter-bar">
          <input placeholder="🔍 Search" style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="filter-label-inline">
            <span>Class</span>
            <select value={fc} onChange={(e) => setFc(e.target.value)}>
              <option value="">All</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </select>
          </label>
          <label className="filter-label-inline">
            <span>Section</span>
            <select value={fs} onChange={(e) => setFs(e.target.value)}>
              <option value="">All</option>
              {['A', 'B', 'C', 'D'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="filter-label-inline">
            <span>Year</span>
            <select value={fy} onChange={(e) => setFy(e.target.value)}>
              <option value="">All years</option>
              {ACADEMIC_YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>ID</th>
                <th>Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      title="No students to show"
                      hint="Adjust search or filters, or register a student above."
                    />
                  </td>
                </tr>
              ) : (
                pagedRows.map((s) => (
                  <tr key={s.Student_ID}>
                    <td><PhotoThumb src={s.Photo} name={s.Name} /></td>
                    <td>{esc(s.Student_ID)}</td>
                    <td>{esc(s.Name)}</td>
                    <td>{esc(s.Class)}</td>
                    <td>{esc(s.Section)}</td>
                    <td>{esc(s.Academic_Year || '—')}</td>
                    <td>
                      <Badge kind={s.Status === 'Active' ? 'success' : 'danger'}>{s.Status}</Badge>
                    </td>
                    <td>
                      <Button size="sm" onClick={() => openEdit(s)}>
                        Edit
                      </Button>{' '}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(s.Student_ID, s.Status === 'Active' ? 'Inactive' : 'Active')}
                      >
                        {s.Status === 'Active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        <p style={{ padding: '0 0 12px', color: 'var(--text-muted)', fontWeight: 600 }}>
          Total in school: {students?.length || 0}
        </p>
      </Card>

      <Modal open={modalOpen} title="✏️ Edit Student" onClose={() => setModalOpen(false)}>
        {edit && (
          <form onSubmit={onSave} className="form-grid">
            <input type="hidden" name="_id" value={edit.Student_ID} />

            {/* Photo picker */}
            <div className="form-group full" style={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoPicker value={editPhoto} onChange={setEditPhoto} />
            </div>

            <div className="form-group">
              <label>Name</label>
              <input name="name" defaultValue={edit.Name} />
            </div>
            <div className="form-group">
              <label>Father</label>
              <input name="father" defaultValue={edit.Father_Name} />
            </div>
            <div className="form-group">
              <label>Class</label>
              <select name="cls" defaultValue={edit.Class}>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <select name="section" defaultValue={edit.Section}>
                {['A', 'B', 'C', 'D'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Academic year</label>
              <select name="academicYear" defaultValue={edit.Academic_Year || ACADEMIC_YEAR}>
                {ACADEMIC_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" defaultValue={edit.Phone} />
            </div>
            <div className="form-group">
              <label>Parent WhatsApp</label>
              <input name="parentWhatsApp" defaultValue={edit.Parent_WhatsApp || ''} placeholder="Optional" maxLength={15} />
            </div>
            <div className="form-group full">
              <label>Address</label>
              <textarea name="address" defaultValue={edit.Address} rows={2} />
            </div>
            <div className="btn-row">
              <Button type="submit">💾 Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
