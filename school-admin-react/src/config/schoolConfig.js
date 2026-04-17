/** Single-school profile — India. Adjust name / year when going live. */

export const SCHOOL_NAME = 'Edu Manage';
export const SCHOOL_NAME_SHORT = 'Edu Manage';
export const SCHOOL_TAGLINE = 'Jaipur, Rajasthan · India';
export const ACADEMIC_YEAR = '2026-27';
/** Dropdown options for student academic year filters and registration. */
export const ACADEMIC_YEAR_OPTIONS = ['2025-26', '2026-27', '2027-28', '2028-29', '2029-30', '2030-31'];
export const ACADEMIC_TERM = 'Term II';
export const LOCALE_DEFAULT = 'en-IN';
export const COUNTRY_CODE = 'IN';

/** Parent alerts use `Phone` or `Parent_WhatsApp` on each student until a real WhatsApp Business API is configured. */
export const WHATSAPP_DELIVERY_MODE = 'mock';

export const SCHOOL_EXPORT_META = {
  schoolName: SCHOOL_NAME,
  academicYear: ACADEMIC_YEAR,
  country: 'India',
};

export function getPdfHeaderTitle() {
  return `${SCHOOL_NAME} — ${ACADEMIC_YEAR}`;
}
