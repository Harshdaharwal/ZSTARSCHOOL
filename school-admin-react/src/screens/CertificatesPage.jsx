import { useCallback, useMemo, useRef, useState } from 'react';
import { Card } from '../components/common/Card.jsx';
import { Spinner } from '../components/common/Spinner.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAsyncResource } from '../hooks/useAsyncResource.js';
import { useToast } from '../hooks/useToast.js';
import { esc } from '../utils/format.js';
import { SCHOOL_NAME, SCHOOL_TAGLINE, ACADEMIC_YEAR } from '../config/schoolConfig.js';
import { IconCertificate, IconDownload, IconSearch, IconPrint } from '../components/common/Icons.jsx';

const CERT_TYPES = [
  { id: 'bonafide', label: 'Bonafide Certificate', icon: '📜', color: '#0284c7', desc: 'Confirms student is enrolled in school' },
  { id: 'tc', label: 'Transfer Certificate', icon: '🏫', color: '#7c3aed', desc: 'Issued when student leaves school' },
  { id: 'character', label: 'Character Certificate', icon: '⭐', color: '#059669', desc: 'Confirms good conduct and character' },
  { id: 'achievement', label: 'Achievement Certificate', icon: '🏆', color: '#d97706', desc: 'For academic or extracurricular achievement' },
];

export default function CertificatesPage() {
  const api = useApi();
  const { showToast } = useToast();
  const [certType, setCertType] = useState('bonafide');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [certNo, setCertNo] = useState(() => `CERT-${ACADEMIC_YEAR.replace('-', '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const printRef = useRef(null);

  const load = useCallback(() => api.getStudents(), [api]);
  const { data: students, loading } = useAsyncResource(load);

  const filtered = useMemo(() => {
    if (!students || !search.trim()) return [];
    const q = search.trim().toLowerCase();
    return students.filter((s) =>
      String(s.Name || s.name || '').toLowerCase().includes(q) ||
      String(s.Student_ID || '').toLowerCase().includes(q) ||
      String(s.Roll_No || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [students, search]);

  function selectStudent(s) {
    setSelectedStudent(s);
    setSearch(s.Name || s.name || '');
    setFormData({
      purpose: 'bank account opening',
      achievement: 'exceptional academic performance',
      conduct: 'good',
      leavingDate: new Date().toLocaleDateString('en-IN'),
      issueDate: new Date().toLocaleDateString('en-IN'),
    });
    setCertNo(`CERT-${ACADEMIC_YEAR.replace('-', '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  }

  function handlePrint() {
    if (!selectedStudent) { showToast('Please select a student first', 'err'); return; }
    const printContent = printRef.current?.innerHTML;
    const win = window.open('', '_blank');
    if (!win) { showToast('Popup blocked. Please allow popups for this site.', 'err'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>${certType} Certificate</title>
    <style>
      body { font-family: 'Times New Roman', serif; margin: 0; padding: 40px; color: #000; }
      .cert-outer { border: 8px double #1e3a5f; padding: 40px; max-width: 750px; margin: 0 auto; position: relative; }
      .cert-inner { border: 2px solid #1e3a5f; padding: 30px; }
      .cert-header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 24px; }
      .cert-school { font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #1e3a5f; }
      .cert-address { font-size: 13px; color: #555; margin-top: 4px; }
      .cert-type { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 16px 0 4px; color: #1e3a5f; text-decoration: underline; }
      .cert-no { font-size: 12px; color: #666; }
      .cert-body { font-size: 15px; line-height: 2.2; text-align: justify; }
      .cert-body strong { color: #000; }
      .cert-footer { display: flex; justify-content: space-between; margin-top: 60px; }
      .cert-sig { text-align: center; }
      .cert-sig-line { border-top: 1px solid #000; width: 180px; margin: 0 auto 4px; padding-top: 8px; font-size: 13px; font-weight: 700; }
      .cert-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 72px; color: rgba(0,0,0,0.04); font-weight: 900; white-space: nowrap; pointer-events: none; }
      @media print { body { padding: 0; } }
    </style></head><body>${printContent}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    showToast('Certificate sent to printer', 'ok');
  }

  const selectedType = CERT_TYPES.find((t) => t.id === certType);

  return (
    <div>
      {/* Type Selector */}
      <div className="cert-type-grid">
        {CERT_TYPES.map((t) => (
          <button
            key={t.id}
            className={`cert-type-card${certType === t.id ? ' selected' : ''}`}
            onClick={() => setCertType(t.id)}
            style={{ '--c-color': t.color }}
          >
            <span className="cert-type-icon">{t.icon}</span>
            <div>
              <div className="cert-type-label">{t.label}</div>
              <div className="cert-type-desc">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="cert-builder-grid">
        {/* Left: Student Search + Form */}
        <div>
          <Card style={{ marginBottom: 20 }}>
            <div className="wa-section-title" style={{ marginBottom: 14 }}>Select Student</div>
            {loading ? <Spinner /> : (
              <div style={{ position: 'relative' }}>
                <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  placeholder="Search by name, ID, roll number..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedStudent(null); }}
                  style={{ paddingLeft: 36, width: '100%' }}
                />
                {filtered.length > 0 && !selectedStudent && (
                  <div className="cert-dropdown">
                    {filtered.map((s) => (
                      <div key={s.Student_ID || s.id} className="cert-dropdown-item" onClick={() => selectStudent(s)}>
                        <strong>{esc(s.Name || s.name)}</strong>
                        <span>Class {esc(s.Class || s.class)} · Roll {esc(s.Roll_No || '—')}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{esc(s.Student_ID)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedStudent && (
              <div className="cert-student-card">
                <div className="cert-student-avatar">
                  {selectedStudent.Photo ? (
                    <img src={selectedStudent.Photo} alt="" />
                  ) : (
                    <span>{(selectedStudent.Name || 'S')[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{esc(selectedStudent.Name || selectedStudent.name)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Class {esc(selectedStudent.Class)} · Roll {esc(selectedStudent.Roll_No)} · {esc(selectedStudent.Student_ID)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Father: {esc(selectedStudent.Father_Name || selectedStudent.father_name || '—')}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Extra Fields */}
          {selectedStudent && (
            <Card>
              <div className="wa-section-title" style={{ marginBottom: 14 }}>Certificate Details</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Certificate No.</label>
                  <input value={certNo} onChange={(e) => setCertNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Issue Date</label>
                  <input value={formData.issueDate || ''} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} />
                </div>
                {certType === 'bonafide' && (
                  <div className="form-group full">
                    <label>Purpose (e.g. bank account, scholarship)</label>
                    <input value={formData.purpose || ''} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
                  </div>
                )}
                {certType === 'tc' && (
                  <div className="form-group">
                    <label>Date of Leaving</label>
                    <input value={formData.leavingDate || ''} onChange={(e) => setFormData({ ...formData, leavingDate: e.target.value })} />
                  </div>
                )}
                {certType === 'character' && (
                  <div className="form-group">
                    <label>Conduct</label>
                    <select value={formData.conduct || 'good'} onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}>
                      <option value="excellent">Excellent</option>
                      <option value="very good">Very Good</option>
                      <option value="good">Good</option>
                      <option value="satisfactory">Satisfactory</option>
                    </select>
                  </div>
                )}
                {certType === 'achievement' && (
                  <div className="form-group full">
                    <label>Achievement Description</label>
                    <textarea value={formData.achievement || ''} onChange={(e) => setFormData({ ...formData, achievement: e.target.value })} rows={3} />
                  </div>
                )}
              </div>
              <div className="btn-row" style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={handlePrint}>
                  <IconPrint size={16} /> Print Certificate
                </button>
                <button className="btn btn-ghost" onClick={handlePrint}>
                  <IconDownload size={16} /> Download PDF
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Preview */}
        <div>
          <Card>
            <div className="wa-section-title" style={{ marginBottom: 16 }}>
              <IconCertificate size={16} /> Preview — {selectedType?.label}
            </div>
            {!selectedStudent ? (
              <div className="empty" style={{ minHeight: 300 }}>
                Select a student to see the certificate preview
              </div>
            ) : (
              <div ref={printRef}>
                <CertificatePreview
                  type={certType}
                  student={selectedStudent}
                  certNo={certNo}
                  formData={formData}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function CertificatePreview({ type, student, certNo, formData }) {
  const name = esc(student.Name || student.name || '');
  const fatherName = esc(student.Father_Name || student.father_name || '');
  const cls = esc(String(student.Class || student.class || ''));
  const roll = esc(String(student.Roll_No || ''));
  const dob = esc(student.DOB || student.dob || '');
  const admNo = esc(student.Student_ID || '');
  const section = esc(student.Section || '');
  const today = formData.issueDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="cert-outer">
      <div className="cert-inner">
        <div className="cert-watermark">{SCHOOL_NAME}</div>
        <div className="cert-header">
          <div className="cert-school">{SCHOOL_NAME}</div>
          <div className="cert-address">{SCHOOL_TAGLINE}</div>
          <div className="cert-type">{
            type === 'bonafide' ? 'Bonafide Certificate' :
            type === 'tc' ? 'Transfer Certificate' :
            type === 'character' ? 'Character Certificate' :
            'Achievement Certificate'
          }</div>
          <div className="cert-no">No. {esc(certNo)} &nbsp;|&nbsp; Date: {today}</div>
        </div>

        <div className="cert-body">
          {type === 'bonafide' && (
            <p>
              This is to certify that <strong>{name}</strong>, {fatherName ? <>son/daughter of <strong>{fatherName}</strong>, </> : ''}
              bearing Admission No. <strong>{admNo}</strong> and Roll No. <strong>{roll}</strong>, is a bonafide student of
              Class <strong>{cls}{section ? `-${section}` : ''}</strong> for the academic year <strong>{ACADEMIC_YEAR}</strong>.
              {dob && <> His/Her date of birth as per school records is <strong>{dob}</strong>.</>}
              <br /><br />
              This certificate is issued for the purpose of <strong>{formData.purpose || '___________'}</strong>.
            </p>
          )}
          {type === 'tc' && (
            <p>
              This is to certify that <strong>{name}</strong>, {fatherName ? <>son/daughter of <strong>{fatherName}</strong>, </> : ''}
              bearing Admission No. <strong>{admNo}</strong> was a student of this school.
              He/She has been studying in Class <strong>{cls}{section ? `-${section}` : ''}</strong> during the academic year <strong>{ACADEMIC_YEAR}</strong>.
              {dob && <> His/Her date of birth as per school records is <strong>{dob}</strong>.</>}
              <br /><br />
              He/She has been relieved from the school on <strong>{formData.leavingDate || today}</strong>.
              His/Her conduct and character have been <strong>satisfactory</strong> throughout his/her stay in the school.
              <br /><br />
              He/She is free to join any other school/college of his/her choice.
            </p>
          )}
          {type === 'character' && (
            <p>
              This is to certify that <strong>{name}</strong>, {fatherName ? <>son/daughter of <strong>{fatherName}</strong>, </> : ''}
              bearing Admission No. <strong>{admNo}</strong>, was a student of Class <strong>{cls}{section ? `-${section}` : ''}</strong>
              {' '}during the academic year <strong>{ACADEMIC_YEAR}</strong>.
              <br /><br />
              During his/her stay at this institution, his/her conduct and character have been found to be <strong>{formData.conduct || 'good'}</strong>.
              He/She has been a disciplined and sincere student. We wish him/her success in all future endeavours.
            </p>
          )}
          {type === 'achievement' && (
            <p>
              This is to certify that <strong>{name}</strong>, student of Class <strong>{cls}{section ? `-${section}` : ''}</strong>,
              bearing Admission No. <strong>{admNo}</strong>, has been awarded this certificate for <strong>{formData.achievement || 'outstanding performance'}</strong>
              {' '}during the academic year <strong>{ACADEMIC_YEAR}</strong>.
              <br /><br />
              We commend his/her dedication and hard work, and wish him/her continued success.
            </p>
          )}
        </div>

        <div className="cert-footer">
          <div className="cert-sig">
            <div className="cert-sig-line">Class Teacher</div>
          </div>
          <div className="cert-sig">
            <div className="cert-sig-line">Date: {today}</div>
          </div>
          <div className="cert-sig">
            <div className="cert-sig-line">Principal / Head</div>
          </div>
        </div>
      </div>
    </div>
  );
}
