// Shared time helpers. All accept ISO strings; null/invalid input returns a safe fallback.

const toDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function formatDateTime(iso, fallback = 'Not available') {
  const d = toDate(iso);
  if (!d) return fallback;
  return d.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso, fallback = 'Never') {
  const d = toDate(iso);
  if (!d) return fallback;
  const seconds = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// True when the timestamp is older than `minutes`, or missing/invalid.
export function isOlderThan(iso, minutes) {
  const d = toDate(iso);
  if (!d) return true;
  return Date.now() - d.getTime() > minutes * 60 * 1000;
}
