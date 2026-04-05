/**
 * Parent WhatsApp notifications — demo / no API key.
 * Queues messages in DB.whatsapp_log; replace queueWhatsApp with a real provider later.
 */

export const ADMIN_CLASS_FEE_TYPE = 'Class fee (admin)';

export function parentPhone(student) {
  const raw = String(student?.Parent_WhatsApp || student?.Phone || '').replace(/\D/g, '');
  if (raw.length >= 10) return raw.slice(-10);
  return raw || '';
}

/** @param {any} DB */
export function getAdminClassFeeSetting(DB, cls) {
  const list = DB.class_fee_settings || [];
  return list.find((x) => String(x.Class) === String(cls)) || null;
}

export function formatRupeeIN(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN')}`;
}

export function parseAttendanceDay(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const p = s.split('/');
  if (p.length === 3) {
    const day = parseInt(p[0], 10);
    const month = parseInt(p[1], 10) - 1;
    const year = parseInt(p[2], 10);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) return new Date(year, month, day);
  }
  return null;
}

export function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseHolidayIso(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const [y, m, dd] = String(s).split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function isClosedOnDay(day, holidays) {
  const t = startOfLocalDay(day).getTime();
  for (const h of holidays || []) {
    const a = parseHolidayIso(h.Start_Date);
    const b = parseHolidayIso(h.End_Date);
    if (!a || !b) continue;
    if (t >= startOfLocalDay(a).getTime() && t <= startOfLocalDay(b).getTime()) return true;
  }
  return false;
}

export function isTodayDuringHoliday(holidays) {
  return isClosedOnDay(new Date(), holidays);
}

export function queueWhatsApp(DB, audit, { to, body, kind, refId }) {
  if (!to || !body) return;
  const entry = {
    Log_ID: 'WA_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    at: new Date().toISOString(),
    to,
    body,
    kind: kind || 'general',
    refId: refId || '',
    status: 'mock_queued',
  };
  if (!DB.whatsapp_log) DB.whatsapp_log = [];
  DB.whatsapp_log.push(entry);
  if (DB.whatsapp_log.length > 800) DB.whatsapp_log.splice(0, DB.whatsapp_log.length - 800);
  if (typeof audit === 'function') audit('whatsapp_queued', { to, kind: entry.kind, refId: entry.refId });
}

export function hasDedupe(DB, key) {
  return (DB.notification_dedupe || []).some((x) => x.key === key);
}

export function setDedupe(DB, key) {
  if (!DB.notification_dedupe) DB.notification_dedupe = [];
  DB.notification_dedupe.push({ key, at: new Date().toISOString() });
  if (DB.notification_dedupe.length > 400) DB.notification_dedupe.splice(0, DB.notification_dedupe.length - 300);
}

export function notifyAbsentForAttendance(DB, audit, schoolName, records, dateStr) {
  const day = parseAttendanceDay(dateStr);
  if (!day || isClosedOnDay(day, DB.holidays)) return;
  for (const rec of records) {
    if (rec.status !== 'Absent') continue;
    const st = DB.students.find((s) => s.Student_ID === rec.studentId);
    if (!st || st.Status !== 'Active') continue;
    const phone = parentPhone(st);
    if (!phone) continue;
    const body = `[${schoolName}] Attendance: ${st.Name} (Class ${st.Class}-${st.Section}) was marked ABSENT on ${dateStr}. If this is unexpected, please contact the school.`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'absent', refId: rec.studentId });
  }
}

export function notifyAnnouncementBroadcast(DB, audit, schoolName, announcement) {
  if (isTodayDuringHoliday(DB.holidays)) return;
  const seen = new Set();
  for (const st of DB.students) {
    if (st.Status !== 'Active') continue;
    const phone = parentPhone(st);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const body = `[${schoolName}] Announcement: ${announcement.Title}\n\n${announcement.Body}`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'announcement', refId: announcement.Announcement_ID });
  }
}

/** Notify only parents of students in a specific class (and optional section) — for teacher class announcements. */
export function notifyClassAnnouncement(DB, audit, schoolName, ann) {
  if (isTodayDuringHoliday(DB.holidays)) return;
  const cls = String(ann.Class || '');
  const sec = ann.Section ? String(ann.Section) : null;
  const seen = new Set();
  for (const st of DB.students) {
    if (st.Status !== 'Active') continue;
    if (String(st.Class) !== cls) continue;
    if (sec && String(st.Section) !== sec) continue;
    const phone = parentPhone(st);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const who = sec ? `Class ${cls}-${sec}` : `Class ${cls}`;
    const body = `[${schoolName}] 📢 Class Notice (${who})\n${ann.Title}\n\n${ann.Body}\n— ${ann.Teacher_Name || 'Your Teacher'}`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'class_announcement', refId: ann.Announcement_ID });
  }
}

export function notifyExamForClass(DB, audit, schoolName, exam) {
  if (isTodayDuringHoliday(DB.holidays)) return;
  const cls = String(exam.Class);
  const seen = new Set();
  for (const st of DB.students) {
    if (st.Status !== 'Active' || String(st.Class) !== cls) continue;
    const phone = parentPhone(st);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const body = `[${schoolName}] Exam / test update: ${exam.Exam_Name} — ${exam.Subject} (Class ${cls}). Date: ${exam.Exam_Date || 'TBA'}. Max marks: ${exam.Max_Marks}.`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'exam', refId: exam.Exam_ID });
  }
}

export function broadcastHolidayDates(DB, audit, schoolName, holiday) {
  const seen = new Set();
  for (const st of DB.students) {
    if (st.Status !== 'Active') continue;
    const phone = parentPhone(st);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    const body = `[${schoolName}] Holiday: ${holiday.Title}\nStarts: ${holiday.Start_Date}\nEnds: ${holiday.End_Date}\n\nSchool is closed for this period. Routine WhatsApp alerts (attendance, weekly/monthly digests, announcements) are paused until holidays end. You will get a short reminder before school reopens.`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'holiday_notice', refId: holiday.Holiday_ID });
  }
}

/** Two local days before holiday End_Date — one reminder per holiday. */
export function processHolidayEndReminders(DB, audit, schoolName, today = new Date()) {
  let messages = 0;
  for (const h of DB.holidays || []) {
    const end = parseHolidayIso(h.End_Date);
    if (!end) continue;
    const reminderDay = startOfLocalDay(end);
    reminderDay.setDate(reminderDay.getDate() - 2);
    if (startOfLocalDay(today).getTime() !== reminderDay.getTime()) continue;
    const key = `holiday_end_reminder_${h.Holiday_ID}_${h.End_Date}`;
    if (hasDedupe(DB, key)) continue;
    const seen = new Set();
    for (const st of DB.students) {
      if (st.Status !== 'Active') continue;
      const phone = parentPhone(st);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      const body = `[${schoolName}] Reminder: holidays for “${h.Title}” end on ${h.End_Date}. School reopens the next working day — please ensure your child is ready for classes.`;
      queueWhatsApp(DB, audit, { to: phone, body, kind: 'holiday_reopen_reminder', refId: h.Holiday_ID });
      messages++;
    }
    setDedupe(DB, key);
  }
  return { messages };
}

export function buildWeeklyDigestForStudent(DB, st, asOf = new Date()) {
  const ms7 = 7 * 24 * 60 * 60 * 1000;
  const since = new Date(asOf.getTime() - ms7);

  const hw = (DB.homework || []).filter(
    (h) =>
      String(h.Class) === String(st.Class) &&
      String(h.Section) === String(st.Section) &&
      h.Created_At &&
      new Date(h.Created_At) >= since
  );
  const marks = (DB.marks || []).filter((m) => m.Student_ID === st.Student_ID);
  const anns = (DB.announcements || []).filter((a) => a.Posted_At && new Date(a.Posted_At) >= since);

  const parts = [];
  parts.push(`Weekly update — ${st.Name} (Class ${st.Class}-${st.Section})`);

  if (hw.length) {
    parts.push('\nHomework (last 7 days):');
    hw.forEach((h) => parts.push(`• ${h.Subject}: ${h.Title}${h.Due_Date ? ` (due ${h.Due_Date})` : ''}`));
  }

  if (marks.length) {
    parts.push('\nTest / marks on record:');
    marks.slice(0, 10).forEach((m) => parts.push(`• ${m.Subject}: ${m.Marks_Obtained}/${m.Max_Marks} (${m.Grade})`));
  }

  if (anns.length) {
    parts.push('\nSchool announcements this week:');
    anns.forEach((a) => parts.push(`• ${a.Title}`));
  }

  if (!marks.length && !hw.length) {
    parts.push('\nNo new homework or graded tests in the last 7 days.');
    if (anns.length === 0) parts.push('No new announcements this week.');
    else parts.push('See announcements above.');
  }

  const adminFee = getAdminClassFeeSetting(DB, st.Class);
  if (adminFee && Number(adminFee.Amount) > 0) {
    parts.push(
      `\nSchool fee for Class ${st.Class}: ${formatRupeeIN(adminFee.Amount)} (${adminFee.Fee_Type || ADMIN_CLASS_FEE_TYPE}). See fee desk / monthly report for payment status.`
    );
  }

  return parts.join('\n');
}

export function sendWeeklyDigests(DB, audit, schoolName, asOf = new Date()) {
  if (isClosedOnDay(asOf, DB.holidays)) {
    return {
      ok: true,
      skipped: true,
      sent: 0,
      msg: 'Weekly digests not sent — today falls during a configured school holiday.',
    };
  }
  let sent = 0;
  for (const st of DB.students) {
    if (st.Status !== 'Active') continue;
    const phone = parentPhone(st);
    if (!phone) continue;
    const inner = buildWeeklyDigestForStudent(DB, st, asOf);
    const body = `[${schoolName}]\n${inner}`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'weekly_digest', refId: st.Student_ID });
    sent++;
  }
  return { ok: true, skipped: false, sent, msg: `Queued ${sent} weekly WhatsApp message(s) (mock — no API).` };
}

export function buildMonthlyDigestForStudent(DB, st) {
  const phone = parentPhone(st);
  const marks = (DB.marks || []).filter((m) => m.Student_ID === st.Student_ID);
  const att = (DB.att_stu || []).filter((a) => a.Student_ID === st.Student_ID);
  const present = att.filter((a) => a.Status === 'Present').length;
  const pendingList = (DB.fees || []).filter((f) => f.Student_ID === st.Student_ID && f.Status === 'Pending');
  const pendingFeesCount = pendingList.length;
  const pendingTotal = pendingList.reduce((s, f) => s + (Number(f.Amount) || 0), 0);
  const adminFee = getAdminClassFeeSetting(DB, st.Class);

  const parts = [
    `Monthly report — ${st.Name} (Class ${st.Class}-${st.Section})`,
    `Parent WhatsApp number on file: ${phone || '—'}`,
    `Attendance entries in system: ${att.length} (${present} marked present).`,
  ];
  if (adminFee && Number(adminFee.Amount) > 0) {
    parts.push(
      `Class ${st.Class} fee set by school: ${formatRupeeIN(adminFee.Amount)} (${adminFee.Fee_Type || ADMIN_CLASS_FEE_TYPE}).`
    );
  }
  parts.push(`Pending fee records: ${pendingFeesCount} (total outstanding ${formatRupeeIN(pendingTotal)}).`);
  if (marks.length) {
    parts.push('\nMarks:');
    marks.slice(0, 15).forEach((m) => parts.push(`• ${m.Subject}: ${m.Marks_Obtained}/${m.Max_Marks} (${m.Grade})`));
  } else parts.push('\nNo marks on record for this student yet.');
  return parts.join('\n');
}

export function sendMonthlyDigests(DB, audit, schoolName, asOf = new Date()) {
  if (isClosedOnDay(asOf, DB.holidays)) {
    return {
      ok: true,
      skipped: true,
      sent: 0,
      msg: 'Monthly reports not sent — today falls during a configured school holiday.',
    };
  }
  let sent = 0;
  for (const st of DB.students) {
    if (st.Status !== 'Active') continue;
    const phone = parentPhone(st);
    if (!phone) continue;
    const inner = buildMonthlyDigestForStudent(DB, st);
    const body = `[${schoolName}]\n${inner}`;
    queueWhatsApp(DB, audit, { to: phone, body, kind: 'monthly_report', refId: st.Student_ID });
    sent++;
  }
  return { ok: true, skipped: false, sent, msg: `Queued ${sent} monthly WhatsApp message(s) (mock — no API).` };
}
