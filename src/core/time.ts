export const DAYS_PER_SEASON = 28;
export const DAY_START = 6 * 60;
export const DAY_END = 26 * 60; // 2:00 da madrugada
export const REAL_MS_PER_GAME_MIN = 700;

export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno'];
export const WEEKDAYS = ['Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.', 'Dom.'];
export const WEEKDAYS_FULL = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export function weekday(day: number) {
  return WEEKDAYS[(day - 1) % 7];
}

export function fmtClock(min: number) {
  const m = Math.floor(min) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = Math.floor((m % 60) / 10) * 10;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

export function fmtDate(day: number, season: number) {
  return `${weekday(day)} ${day} de ${SEASONS[season]}`;
}

export function hourOf(min: number) {
  return min / 60;
}
