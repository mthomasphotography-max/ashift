export type ShiftType = 'DAYS' | 'NIGHTS' | 'OFF';

export function shiftTypeForDate(dateStr: string): ShiftType {
  const anchor = new Date("2026-01-02T00:00:00Z");
  const d = new Date(dateStr + "T00:00:00Z");

  const msPerDay = 24 * 60 * 60 * 1000;
  const offsetDays = Math.floor((d.getTime() - anchor.getTime()) / msPerDay);

  const pos = ((offsetDays % 8) + 8) % 8;

  if (pos === 0 || pos === 1) return "DAYS";
  if (pos === 2 || pos === 3) return "NIGHTS";
  return "OFF";
}

export function getShiftPattern(startDate: string, days: number = 8): Array<{ date: string; shift: ShiftType }> {
  const result: Array<{ date: string; shift: ShiftType }> = [];
  const start = new Date(startDate + "T00:00:00Z");

  for (let i = 0; i < days; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      shift: shiftTypeForDate(dateStr)
    });
  }

  return result;
}

export const SHIFT_PATTERN_INFO = {
  anchorDate: '2026-01-02',
  anchorShift: 'DAYS' as ShiftType,
  cycleLength: 8,
  pattern: [
    { day: 0, shift: 'DAYS' as ShiftType },
    { day: 1, shift: 'DAYS' as ShiftType },
    { day: 2, shift: 'NIGHTS' as ShiftType },
    { day: 3, shift: 'NIGHTS' as ShiftType },
    { day: 4, shift: 'OFF' as ShiftType },
    { day: 5, shift: 'OFF' as ShiftType },
    { day: 6, shift: 'OFF' as ShiftType },
    { day: 7, shift: 'OFF' as ShiftType },
  ]
};
