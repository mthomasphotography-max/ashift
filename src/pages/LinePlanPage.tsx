import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { shiftTypeForDate } from '../utils/shiftPattern';

type DailyPlan = {
  date: string;
  shift: 'days' | 'nights';
  mak1_running: boolean;
  mac1_running: boolean;
  mac2_running: boolean;
  mab1_running: boolean;
  mab2_running: boolean;
  mab3_running: boolean;
  corona_running: boolean;
  packaging_running: boolean;
  tents_running: boolean;
  canning_reduced: boolean;
  mak1_load_slots: number;
  tents_load_slots: number;
  keg_load_slots: number;
  pilots_required: number;
};

type DayPlans = {
  date: string;
  days: DailyPlan;
  nights: DailyPlan;
};

export default function LinePlanPage() {
  const [weekCommencing, setWeekCommencing] = useState('');
  const [dayPlans, setDayPlans] = useState<DayPlans[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${day} ${dateNum}/${month}`;
  }

  function createDefaultPlan(date: string, shift: 'days' | 'nights'): DailyPlan {
    return {
      date,
      shift,
      mak1_running: false,
      mac1_running: false,
      mac2_running: false,
      mab1_running: false,
      mab2_running: false,
      mab3_running: false,
      corona_running: false,
      packaging_running: false,
      tents_running: false,
      canning_reduced: false,
      mak1_load_slots: 0,
      tents_load_slots: 0,
      keg_load_slots: 0,
      pilots_required: 2,
    };
  }

  async function loadLinePlan() {
    if (!weekCommencing) return;

    const weekDates = getWeekDates(weekCommencing);

    const { data } = await supabase
      .from('daily_line_plan')
      .select('*')
      .in('date', weekDates);

    const plans: DayPlans[] = weekDates.map(date => {
      const daysData = data?.find(d => d.date === date && d.shift === 'days');
      const nightsData = data?.find(d => d.date === date && d.shift === 'nights');

      return {
        date,
        days: daysData || createDefaultPlan(date, 'days'),
        nights: nightsData || createDefaultPlan(date, 'nights'),
      };
    });

    setDayPlans(plans);
    setHasLoaded(true);
  }

  async function savePlans() {
    if (dayPlans.length === 0) return;

    setSaving(true);

    const allPlans = dayPlans.flatMap(dp => [dp.days, dp.nights]);

    const { error } = await supabase
      .from('daily_line_plan')
      .upsert(allPlans);

    if (error) {
      console.error('Error saving daily plans:', error);
      alert('Error saving line plans');
    } else {
      alert('Line plans saved successfully');
    }
    setSaving(false);
  }

  function updatePlan(dayIndex: number, shift: 'days' | 'nights', updates: Partial<DailyPlan>) {
    const newPlans = [...dayPlans];
    newPlans[dayIndex][shift] = { ...newPlans[dayIndex][shift], ...updates };

    if (updates.mak1_load_slots !== undefined || updates.tents_load_slots !== undefined || updates.keg_load_slots !== undefined) {
      const plan = newPlans[dayIndex][shift];
      const totalLoads = plan.mak1_load_slots + plan.tents_load_slots + plan.keg_load_slots;
      newPlans[dayIndex][shift].pilots_required = totalLoads <= 40 ? 1 : 2;
    }

    setDayPlans(newPlans);
  }

  function syncLineStatus(dayIndex: number, fromShift: 'days' | 'nights') {
    const newPlans = [...dayPlans];
    const source = newPlans[dayIndex][fromShift];
    const target = fromShift === 'days' ? 'nights' : 'days';

    newPlans[dayIndex][target] = {
      ...newPlans[dayIndex][target],
      mak1_running: source.mak1_running,
      mac1_running: source.mac1_running,
      mac2_running: source.mac2_running,
      mab1_running: source.mab1_running,
      mab2_running: source.mab2_running,
      mab3_running: source.mab3_running,
      corona_running: source.corona_running,
      packaging_running: source.packaging_running,
      tents_running: source.tents_running,
      canning_reduced: source.canning_reduced,
    };

    setDayPlans(newPlans);
  }

  function copyToAll(sourceIndex: number, shift: 'days' | 'nights') {
    const source = dayPlans[sourceIndex][shift];
    const newPlans = dayPlans.map((dayPlan, idx) => {
      if (idx === sourceIndex) return dayPlan;
      return {
        ...dayPlan,
        [shift]: {
          ...dayPlan[shift],
          mak1_running: source.mak1_running,
          mac1_running: source.mac1_running,
          mac2_running: source.mac2_running,
          mab1_running: source.mab1_running,
          mab2_running: source.mab2_running,
          mab3_running: source.mab3_running,
          corona_running: source.corona_running,
          packaging_running: source.packaging_running,
          tents_running: source.tents_running,
          canning_reduced: source.canning_reduced,
          mak1_load_slots: source.mak1_load_slots,
          tents_load_slots: source.tents_load_slots,
          keg_load_slots: source.keg_load_slots,
          pilots_required: source.pilots_required,
        }
      };
    });
    setDayPlans(newPlans);
  }

  const lines = [
    { key: 'mak1_running', label: 'MAK1', color: '#10b981' },
    { key: 'mac1_running', label: 'MAC1', color: '#3b82f6' },
    { key: 'mac2_running', label: 'MAC2', color: '#3b82f6' },
    { key: 'mab1_running', label: 'MAB1', color: '#8b5cf6' },
    { key: 'mab2_running', label: 'MAB2', color: '#8b5cf6' },
    { key: 'mab3_running', label: 'MAB3', color: '#3b82f6' },
    { key: 'corona_running', label: 'Corona', color: '#f59e0b' },
    { key: 'packaging_running', label: 'Pkg', color: '#ec4899' },
    { key: 'tents_running', label: 'Tents', color: '#06b6d4' },
  ];

  function renderShiftPanel(plan: DailyPlan, dayIndex: number, shiftType: 'days' | 'nights') {
    const shiftLabel = shiftType === 'days' ? 'Days' : 'Nights';
    const bgColor = shiftType === 'days' ? '#fffbeb' : '#1e293b';
    const textColor = shiftType === 'days' ? '#000' : '#fff';
    const borderColor = shiftType === 'days' ? '#fbbf24' : '#475569';

    return (
      <div style={{
        background: bgColor,
        padding: 16,
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        color: textColor,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{shiftLabel}</h5>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => syncLineStatus(dayIndex, shiftType)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                background: shiftType === 'days' ? '#fef3c7' : '#334155',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Copy Lines to {shiftType === 'days' ? 'Nights' : 'Days'}
            </button>
            <button
              onClick={() => copyToAll(dayIndex, shiftType)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                background: shiftType === 'days' ? '#fef3c7' : '#334155',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Copy to All {shiftLabel}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6, opacity: 0.7 }}>Production Lines</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {lines.map(line => (
              <label
                key={line.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: plan[line.key as keyof DailyPlan] ? `${line.color}40` : (shiftType === 'days' ? '#fff' : '#0f172a'),
                  border: '1px solid',
                  borderColor: plan[line.key as keyof DailyPlan] ? line.color : (shiftType === 'days' ? '#e5e7eb' : '#334155'),
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  color: textColor,
                }}
              >
                <input
                  type="checkbox"
                  checked={plan[line.key as keyof DailyPlan] as boolean}
                  onChange={(e) => updatePlan(dayIndex, shiftType, { [line.key]: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                {line.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: plan.canning_reduced ? '#fbbf2440' : (shiftType === 'days' ? '#fff' : '#0f172a'),
              border: '1px solid',
              borderColor: plan.canning_reduced ? '#fbbf24' : (shiftType === 'days' ? '#e5e7eb' : '#334155'),
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={plan.canning_reduced}
              onChange={(e) => updatePlan(dayIndex, shiftType, { canning_reduced: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            Canning Reduced
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
              Keg Loads
            </label>
            <input
              type="number"
              min="0"
              value={plan.keg_load_slots}
              onChange={(e) => updatePlan(dayIndex, shiftType, { keg_load_slots: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: 4,
                fontSize: 12,
                background: shiftType === 'days' ? '#fff' : '#0f172a',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
              Magor 1 loads
            </label>
            <input
              type="number"
              min="0"
              value={plan.mak1_load_slots}
              onChange={(e) => updatePlan(dayIndex, shiftType, { mak1_load_slots: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: 4,
                fontSize: 12,
                background: shiftType === 'days' ? '#fff' : '#0f172a',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
              Tents Loads
            </label>
            <input
              type="number"
              min="0"
              value={plan.tents_load_slots}
              onChange={(e) => updatePlan(dayIndex, shiftType, { tents_load_slots: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: 4,
                fontSize: 12,
                background: shiftType === 'days' ? '#fff' : '#0f172a',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
              Pilots
            </label>
            <select
              value={plan.pilots_required}
              onChange={(e) => updatePlan(dayIndex, shiftType, { pilots_required: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: 4,
                fontSize: 12,
                background: shiftType === 'days' ? '#fff' : '#0f172a',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>

        <div style={{
          fontSize: 10,
          padding: 6,
          background: shiftType === 'days' ? '#fff' : '#0f172a',
          borderRadius: 4,
          opacity: 0.9,
        }}>
          Total: {plan.mak1_load_slots + plan.tents_load_slots + plan.keg_load_slots} loads
          {' • '}
          Keg ops: {Math.ceil(plan.keg_load_slots / 6)}
          {' • '}
          Magor 1 ops: {Math.ceil(plan.mak1_load_slots / 15)}
          {' • '}
          Tents ops: {Math.ceil(plan.tents_load_slots / 15)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Daily Line Plan</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16, maxWidth: 600 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Week Commencing (Monday)</label>
          <input
            type="date"
            value={weekCommencing}
            onChange={(e) => setWeekCommencing(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn-primary" onClick={loadLinePlan} style={{ width: '100%' }}>
            Load Week
          </button>
        </div>
      </div>

      {hasLoaded && dayPlans.length > 0 && (
        <>
          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            {dayPlans.map((dayPlan, dayIndex) => {
              const shiftType = shiftTypeForDate(dayPlan.date);

              // Skip OFF days
              if (shiftType === 'OFF') return null;

              return (
                <div key={dayPlan.date} style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 16 }}>{formatDate(dayPlan.date)}</h4>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {shiftType === 'DAYS' && renderShiftPanel(dayPlan.days, dayIndex, 'days')}
                    {shiftType === 'NIGHTS' && renderShiftPanel(dayPlan.nights, dayIndex, 'nights')}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn-primary"
              onClick={savePlans}
              disabled={saving}
              style={{ minWidth: 120 }}
            >
              {saving ? 'Saving...' : 'Save All Plans'}
            </button>
          </div>
        </>
      )}

      {!hasLoaded && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
          Select a week, then click "Load Week" to start.
        </div>
      )}
    </div>
  );
}
