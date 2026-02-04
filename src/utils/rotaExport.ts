type Allocation = {
  id: string;
  area: string;
  shift_block: string;
  score: number;
  assigned_to: string | null;
  is_break_cover?: boolean;
  hours_required?: number;
  operator: {
    name: string;
  } | null;
};

export function exportRotaToCSV(
  allocations: Allocation[],
  weekCommencing: string
): void {
  // Get all unique areas
  const allAreas = Array.from(new Set(allocations.map(a => a.area))).sort();

  // Shifts in order
  const shifts = ['DAY1', 'DAY2', 'NIGHT1', 'NIGHT2'];

  // Build a map of area -> shift -> operators
  const areaShiftMap: Record<string, Record<string, string[]>> = {};

  allAreas.forEach(area => {
    areaShiftMap[area] = {};
    shifts.forEach(shift => {
      areaShiftMap[area][shift] = [];
    });
  });

  // Fill in the allocations
  allocations.forEach(alloc => {
    const area = alloc.area;
    const shift = alloc.shift_block;

    if (areaShiftMap[area] && areaShiftMap[area][shift]) {
      let name = alloc.assigned_to === 'Agency' ? 'Agency' : (alloc.operator?.name || 'Unknown');

      // Add break cover indicator if applicable
      if (alloc.is_break_cover && alloc.hours_required) {
        name += ` (${alloc.hours_required}h break)`;
      }

      areaShiftMap[area][shift].push(name);
    }
  });

  // Build CSV rows
  const csvRows: string[] = [];

  // Header row
  const headerRow = ['Area', ...shifts].join(',');
  csvRows.push(headerRow);

  // Data rows - one row per area
  allAreas.forEach(area => {
    const shiftData = shifts.map(shift => {
      const operators = areaShiftMap[area][shift];
      // Join multiple operators with semicolon if there are multiple
      return operators.length > 0 ? operators.join('; ') : '';
    });

    const row = [area, ...shiftData].join(',');
    csvRows.push(row);
  });

  const csvContent = csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const fileName = `rota-${weekCommencing}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
