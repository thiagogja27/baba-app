/**
 * Utilitários para formatação de datas no padrão brasileiro (DD/MM/YYYY)
 * Seguro contra distorções de fuso horário / UTC.
 */

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  // Se for YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

export function formatDateWithWeekdayBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    // Cria data local evitando o bug de meia-noite UTC
    const d = new Date(year, month - 1, day);
    const weekdayRaw = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1).replace('.', '');
    return `${weekday}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

export function formatDateTimeBR(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function calculateHoursDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours === 0 && minutes === 0) return '0h';
  if (minutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }
  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours}h ${minutes}min`;
}

export function formatScheduleTimeWithHours(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  const duration = calculateHoursDuration(startTime, endTime);
  return `${startTime} às ${endTime} (${duration})`;
}
