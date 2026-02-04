export type OperatorCSVRow = {
  name: string;
  flt: string;
  canning: string;
  mab1: string;
  mab2: string;
  corona: string;
  kegging_inside: string;
  kegging_outside: string;
  keg_loading: string;
  wms: string;
  sap: string;
  say: string;
  packaging: string;
  loaders: string;
  pilots: string;
  sap_vl31n: string;
  sap_vt01n: string;
  sap_vl71: string;
  sap_vl33n: string;
  sap_vl03n: string;
  sap_vt03n: string;
  sap_cor3: string;
  sap_zc30: string;
  role?: string;
  constraints?: string;
  notes?: string;
  skill_proficiency?: Record<string, string>;
};

export type StaffPlanCSVRow = {
  week_commencing: string;
  operator_name: string;
  day1: string;
  day2: string;
  night1: string;
  night2: string;
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseOperatorsCSV(csvContent: string): OperatorCSVRow[] {
  // Handle different line endings and filter out empty lines
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: OperatorCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip rows that are completely empty
    if (values.every(v => !v.trim())) continue;
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    if (!row.name?.trim()) {
      throw new Error(`Row ${i + 1}: Name is required`);
    }

    const operatorRow: OperatorCSVRow = {
      name: row.name.trim(),
      flt: row.flt?.trim() || 'N',
      canning: row.canning?.trim() || 'N',
      mab1: row.mab1?.trim() || 'N',
      mab2: row.mab2?.trim() || 'N',
      corona: row.corona?.trim() || 'N',
      kegging_inside: row.kegging_inside?.trim() || 'N',
      kegging_outside: row.kegging_outside?.trim() || 'N',
      keg_loading: row.keg_loading?.trim() || 'N',
      wms: row.wms?.trim() || 'N',
      sap: row.sap?.trim() || 'N',
      say: row.say?.trim() || 'N',
      packaging: row.packaging?.trim() || 'N',
      loaders: row.loaders?.trim() || 'N',
      pilots: row.pilots?.trim() || 'N',
      sap_vl31n: row.sap_vl31n?.trim() || 'N',
      sap_vt01n: row.sap_vt01n?.trim() || 'N',
      sap_vl71: row.sap_vl71?.trim() || 'N',
      sap_vl33n: row.sap_vl33n?.trim() || 'N',
      sap_vl03n: row.sap_vl03n?.trim() || 'N',
      sap_vt03n: row.sap_vt03n?.trim() || 'N',
      sap_cor3: row.sap_cor3?.trim() || 'N',
      sap_zc30: row.sap_zc30?.trim() || 'N',
    };

    if (row.role?.trim()) {
      operatorRow.role = row.role.trim();
    }

    if (row.constraints?.trim()) {
      operatorRow.constraints = row.constraints.trim();
    }

    if (row.notes?.trim()) {
      operatorRow.notes = row.notes.trim();
    }

    if (row.skill_proficiency?.trim()) {
      try {
        operatorRow.skill_proficiency = JSON.parse(row.skill_proficiency);
      } catch {
        console.warn(`Row ${i + 1}: Invalid skill_proficiency JSON, skipping`);
      }
    }

    rows.push(operatorRow);
  }

  return rows;
}

export function parseStaffPlanCSV(csvContent: string): StaffPlanCSVRow[] {
  // Handle different line endings and filter out empty lines
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: StaffPlanCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Skip rows that are completely empty or don't have the first required columns
    if (values.every(v => !v.trim())) continue;
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Validate required fields
    if (!row.week_commencing?.trim()) {
      throw new Error(`Row ${i + 1}: Week Commencing is required (found: "${row.week_commencing || 'empty'}")`);
    }
    if (!row.operator_name?.trim()) {
      throw new Error(`Row ${i + 1}: Operator Name is required (found: "${row.operator_name || 'empty'}")`);
    }

    rows.push({
      week_commencing: row.week_commencing.trim(),
      operator_name: row.operator_name.trim(),
      day1: row.day1?.trim() || 'Y',
      day2: row.day2?.trim() || 'Y',
      night1: row.night1?.trim() || 'Y',
      night2: row.night2?.trim() || 'Y',
    });
  }

  return rows;
}
