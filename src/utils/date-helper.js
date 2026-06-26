// ==========================================
// DATE-HELPER.JS - FUNGSI TANGGAL LOKAL
// ==========================================

/**
 * Mendapatkan string tanggal hari ini dalam format YYYY-MM-DD
 * berdasarkan zona waktu lokal perangkat
 */
export function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan tanggal lokal dari timestamp Firestore
 * @param {Object} timestamp - Firestore Timestamp
 * @returns {string} Format YYYY-MM-DD
 */
export function getLocalDateFromTimestamp(timestamp) {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

/**
 * Format tanggal lokal untuk tampilan (misal: "26 Juni 2026")
 */
export function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}