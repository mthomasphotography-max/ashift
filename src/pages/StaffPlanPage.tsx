import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { generateStaffPlanCSVTemplate, downloadCSV } from '../utils/csvTemplates';
import { parseStaffPlanCSV } from '../utils/csvParser';
import { shiftTypeForDate } from '../utils/shiftPattern';
import AllocationChart from '../components/AllocationChart';

type Operator = {
  id: string;
  name: string;
  is_active: boolean;
  is_agency: boolean;
  shift?: string;
};

type StaffPlan = {
  id?: string;
  week_commencing: string;
  operator_id: string;
  day1: string;
  day2: string;
  night1: string;
  night2: string;
};

export default function StaffPlanPage() {
  const [weekCommencing, setWeekCommencing] = useState('');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [staffPlans, setStaffPlans] = useState<Record<string, StaffPlan>>({});
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOperators();
    const monday = getNextMonday();
    setWeekCommencing(monday);
  }, []);

  function getNextMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().split('T')[0];
  }

  async function loadOperators() {
    const { data } = await supabase
      .from('operators')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    setOperators(data || []);
  }

  async function loadStaffPlan() {
    if (!weekCommencing) return;

    setLoading(true);
    const { data } = await supabase
      .from('weekly_staff_plan')
      .select('*')
      .eq('week_commencing', weekCommencing);

    const planMap: Record<string, StaffPlan> = {};
    data?.forEach(plan => {
      planMap[plan.operator_id] = plan;
    });

    operators.forEach(op => {
      if (!planMap[op.id]) {
        const defaultValue = op.shift ? 'OFF' : (op.is_agency ? 'Y' : 'Y');
        planMap[op.id] = {
          week_commencing: weekCommencing,
          operator_id: op.id,
          day1: defaultValue,
          day2: defaultValue,
          night1: defaultValue,
          night2: defaultValue,
        };
      }
    });

    setStaffPlans(planMap);
    setLoading(false);
    setHasLoaded(true);
    setHasUnsavedChanges(false);
  }

  function updatePlan(operatorId: string, field: keyof StaffPlan, value: string) {
    const plan = { ...staffPlans[operatorId], [field]: value };
    setStaffPlans({ ...staffPlans, [operatorId]: plan });
    setHasUnsavedChanges(true);
  }

  async function saveAllChanges() {
    setSaving(true);
    try {
      const plansToSave = Object.values(staffPlans).map(plan => ({
        week_commencing: plan.week_commencing,
        operator_id: plan.operator_id,
        day1: plan.day1,
        day2: plan.day2,
        night1: plan.night1,
        night2: plan.night2,
      }));

      const { error } = await supabase
        .from('weekly_staff_plan')
        .upsert(plansToSave, {
          onConflict: 'week_commencing,operator_id'
        });

      if (error) {
        console.error('Error saving staff plan:', error);
        alert('Error saving changes. Please try again.');
      } else {
        setHasUnsavedChanges(false);
        alert('Changes saved successfully!');
      }
    } catch (error) {
      console.error('Error saving staff plan:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadTemplate() {
    if (!hasLoaded || operators.length === 0) {
      const template = generateStaffPlanCSVTemplate(weekCommencing || getNextMonday());
      downloadCSV(`staff-plan-${weekCommencing || 'template'}.csv`, template);
      return;
    }

    const headers = ['Week Commencing', 'Operator Name', 'Day1', 'Day2', 'Night1', 'Night2'];
    const rows = operators.map(op => {
      const plan = staffPlans[op.id];
      if (!plan) return null;

      return [
        weekCommencing,
        op.name,
        plan.day1 || 'Y',
        plan.day2 || 'Y',
        plan.night1 || 'Y',
        plan.night2 || 'Y'
      ].join(',');
    }).filter(Boolean);

    const csvContent = [headers.join(','), ...rows, ''].join('\n');
    downloadCSV(`staff-plan-${weekCommencing}.csv`, csvContent);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseStaffPlanCSV(text);

      const operatorsByName = new Map(operators.map(op => [op.name.toLowerCase(), op]));

      for (const row of rows) {
        const operator = operatorsByName.get(row.operator_name.toLowerCase());
        if (!operator) {
          console.warn(`Operator not found: ${row.operator_name}`);
          continue;
        }

        await supabase
          .from('weekly_staff_plan')
          .upsert({
            week_commencing: row.week_commencing,
            operator_id: operator.id,
            day1: row.day1,
            day2: row.day2,
            night1: row.night1,
            night2: row.night2,
          }, {
            onConflict: 'week_commencing,operator_id'
          });
      }

      alert(`Successfully imported ${rows.length} staff plan entries`);
      loadStaffPlan();
    } catch (error) {
      alert(`Error importing CSV: ${error}`);
      console.error('CSV import error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const regularOperators = operators.filter(op => !op.is_agency && !op.shift);
  const agencyOperators = operators.filter(op => op.is_agency);
  const shiftAOperators = operators.filter(op => !op.is_agency && op.shift === 'A');
  const shiftBOperators = operators.filter(op => !op.is_agency && op.shift === 'B');
  const shiftCOperators = operators.filter(op => !op.is_agency && op.shift === 'C');
  const shiftDOperators = operators.filter(op => !op.is_agency && op.shift === 'D');

  function getWeekDates(mondayDate: string): string[] {
    const dates: string[] = [];
    const startDate = new Date(mondayDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day} ${dateNum}/${month}`;
  }

  const weekDates = hasLoaded && weekCommencing ? getWeekDates(weekCommencing) : [];
  const workingDays = weekDates.map(date => ({
    date,
    shiftType: shiftTypeForDate(date),
    label: formatDate(date)
  })).filter(d => d.shiftType !== 'OFF');

  const columnMapping: Array<{ field: 'day1' | 'day2' | 'night1' | 'night2'; date: string; label: string; shiftType: string }> = [];

  let dayCount = 0;
  let nightCount = 0;

  workingDays.forEach(day => {
    if (day.shiftType === 'DAYS') {
      dayCount++;
      if (dayCount === 1) {
        columnMapping.push({ field: 'day1', date: day.date, label: day.label, shiftType: day.shiftType });
      } else if (dayCount === 2) {
        columnMapping.push({ field: 'day2', date: day.date, label: day.label, shiftType: day.shiftType });
      }
    } else if (day.shiftType === 'NIGHTS') {
      nightCount++;
      if (nightCount === 1) {
        columnMapping.push({ field: 'night1', date: day.date, label: day.label, shiftType: day.shiftType });
      } else if (nightCount === 2) {
        columnMapping.push({ field: 'night2', date: day.date, label: day.label, shiftType: day.shiftType });
      }
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Staff Availability Plan</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handleDownloadTemplate}>
            {hasLoaded ? 'Download CSV' : 'Download CSV Template'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16, maxWidth: 600 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Week Commencing</label>
          <input
            type="date"
            value={weekCommencing}
            onChange={(e) => setWeekCommencing(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn-primary" onClick={loadStaffPlan} style={{ width: '100%' }}>
            Load Plan
          </button>
        </div>
      </div>

      {hasLoaded && (
        <>
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Availability Codes:</div>
            <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              <div><strong>Y</strong> - Working / Available</div>
              <div><strong>OFF</strong> - Not Rostered</div>
              <div><strong>H</strong> - Holiday / Unavailable</div>
              <div><strong>SICK</strong> - Sick / Unavailable</div>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, border: '1px solid #fbbf24', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>You have unsaved changes</span>
              <button
                className="btn-primary"
                onClick={saveAllChanges}
                disabled={saving}
                style={{ minWidth: 120 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {loading ? (
            <div>Loading staff plan...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Regular Staff</th>
                  {columnMapping.map((col, idx) => (
                    <th key={idx} style={{
                      background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b',
                      color: col.shiftType === 'DAYS' ? '#000' : '#fff'
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regularOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>{op.name}</td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {shiftAOperators.length > 0 && (
                  <tr>
                    <td colSpan={columnMapping.length + 1} style={{ background: '#fef3c7', padding: '12px 16px' }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#92400e' }}>
                        Shift A Overtime
                      </h5>
                    </td>
                  </tr>
                )}

                {shiftAOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {op.name}
                          <span style={{
                            fontSize: 10,
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontWeight: 600
                          }}>
                            SHIFT A
                          </span>
                        </div>
                      </td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {shiftBOperators.length > 0 && (
                  <tr>
                    <td colSpan={columnMapping.length + 1} style={{ background: '#ddd6fe', padding: '12px 16px' }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#5b21b6' }}>
                        Shift B Overtime
                      </h5>
                    </td>
                  </tr>
                )}

                {shiftBOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {op.name}
                          <span style={{
                            fontSize: 10,
                            background: '#ddd6fe',
                            color: '#5b21b6',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontWeight: 600
                          }}>
                            SHIFT B
                          </span>
                        </div>
                      </td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {shiftCOperators.length > 0 && (
                  <tr>
                    <td colSpan={columnMapping.length + 1} style={{ background: '#fecaca', padding: '12px 16px' }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#991b1b' }}>
                        Shift C Overtime
                      </h5>
                    </td>
                  </tr>
                )}

                {shiftCOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {op.name}
                          <span style={{
                            fontSize: 10,
                            background: '#fecaca',
                            color: '#991b1b',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontWeight: 600
                          }}>
                            SHIFT C
                          </span>
                        </div>
                      </td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {shiftDOperators.length > 0 && (
                  <tr>
                    <td colSpan={columnMapping.length + 1} style={{ background: '#bfdbfe', padding: '12px 16px' }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>
                        Shift D Overtime
                      </h5>
                    </td>
                  </tr>
                )}

                {shiftDOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {op.name}
                          <span style={{
                            fontSize: 10,
                            background: '#bfdbfe',
                            color: '#1e3a8a',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontWeight: 600
                          }}>
                            SHIFT D
                          </span>
                        </div>
                      </td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {agencyOperators.length > 0 && (
                  <tr>
                    <td colSpan={columnMapping.length + 1} style={{ background: '#e0f2fe', padding: '12px 16px' }}>
                      <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#075985' }}>
                        Agency Staff (Available for any shift unless marked)
                      </h5>
                    </td>
                  </tr>
                )}

                {agencyOperators.map(op => {
                  const plan = staffPlans[op.id];
                  if (!plan) return null;

                  return (
                    <tr key={op.id}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {op.name}
                          <span style={{
                            fontSize: 10,
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '2px 6px',
                            borderRadius: 3,
                            fontWeight: 600
                          }}>
                            AGENCY
                          </span>
                        </div>
                      </td>
                      {columnMapping.map((col, idx) => {
                        const value = plan[col.field] || 'Y';
                        const valueUpper = value.trim().toUpperCase();
                        const isHoliday = valueUpper === 'H';
                        const isSick = valueUpper === 'SICK';
                        const isWorking = valueUpper === 'Y';
                        const isOff = valueUpper === 'OFF';

                        return (
                          <td key={idx} style={{
                            background: col.shiftType === 'DAYS' ? '#fffbeb' : '#1e293b'
                          }}>
                            <select
                              value={value}
                              onChange={(e) => updatePlan(op.id, col.field, e.target.value)}
                              style={{
                                width: 'auto',
                                minWidth: 120,
                                backgroundColor: isHoliday ? '#fef08a' : isSick ? '#fecaca' : isWorking ? '#bbf7d0' : isOff ? '#e5e7eb' : 'white',
                                fontWeight: 500
                              }}
                            >
                              <option value="Y">Y - Working</option>
                              <option value="OFF">OFF - Not Rostered</option>
                              <option value="H">H - Holiday</option>
                              <option value="SICK">SICK</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && operators.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={saveAllChanges}
                disabled={saving}
                style={{ minWidth: 120 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {operators.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
              No active operators found. Add operators first.
            </div>
          )}
        </>
      )}

      {!hasLoaded && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
          Select a week, then click "Load Plan" to start.
        </div>
      )}

      <div style={{ marginTop: 48, paddingTop: 32, borderTop: '2px solid #e5e7eb' }}>
        <AllocationChart />
      </div>
    </div>
  );
}
