const dateOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' };
export const formatUGX = value => `UGX ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;
export const formatDate = value => value ? new Intl.DateTimeFormat('en-UG', dateOptions).format(new Date(value)) : '—';
export const formatTime = value => value ? new Intl.DateTimeFormat('en-UG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Kampala' }).format(new Date(value)) : '—';
export const formatStatus = value => String(value || '').toLowerCase().split('_').map(word => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ') || '—';
