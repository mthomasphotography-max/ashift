import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportRotaToCSV } from '../utils/rotaExport';

type Allocation = {
  id: string;
  area: string;
  shift_block: string;
  score: number;
  assigned_to: string | null;
  is_break_cover?: boolean;
  hours_required?: number;
  operator_id?: string;
  operator: {
    name: string;
    is_agency?: boolean;
  } | null;
};

type Gap = {
  id: string;
  shift_block: string;
  area: string;
  missing_count: number;
  recommendations: Array<{ operator_id: string; name: string; score: number }>;
};

type PreviousWeek = {
  week_commencing: string;
  allocation_count: number;
};

type Operator = {
  id: number;
  name: string;
  is_agency?: boolean;
  operator_capabilities: {
    flt?: string;
    canning?: string;
    mab1?: string;
    mab2?: string;
    corona?: string;
    kegging_inside?: string;
    kegging_outside?: string;
    wms?: string;
    sap?: string;
    say?: string;
    packaging?: string;
    loaders?: string;
    pilots?: string;
    keg_loading?: string;
  } | null;
};

type BreakCoverageNeed = {
  area: string;
  shift_block: string;
  hours_required: number;
  reason: string;
  suitable_operators: Operator[];
};

type StaffPlanEntry = {
  operator_id: string;
  day1: string;
  day2: string;
  night1: string;
  night2: string;
};

export default function RotaPage() {
  const navigate = useNavigate();
  const [weekCommencing, setWeekCommencing] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isNewGeneration, setIsNewGeneration] = useState(false);
  const [previousWeeks, setPreviousWeeks] = useState<PreviousWeek[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [breakCoverageNeeds, setBreakCoverageNeeds] = useState<BreakCoverageNeed[]>([]);
  const [staffPlan, setStaffPlan] = useState<Map<string, StaffPlanEntry>>(new Map());
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const monday = getNextMonday();
    setWeekCommencing(monday);
    loadPreviousWeeks();
    loadOperators();
  }, []);

  useEffect(() => {
    if (allocations.length > 0 && operators.length > 0) {
      calculateBreakCoverageNeeds();
    }
  }, [allocations, operators]);

  async function loadOperators() {
    const { data } = await supabase
      .from('operators')
      .select('id, name, is_agency, operator_capabilities(*)')
      .order('name');

    if (data) {
      setOperators(data as Operator[]);
    }
  }


  async function loadPreviousWeeks() {
    const { data } = await supabase
      .from('weekly_rota_allocation')
      .select('week_commencing')
      .order('week_commencing', { ascending: false });

    if (data) {
      const weekCounts = data.reduce((acc, row) => {
        acc[row.week_commencing] = (acc[row.week_commencing] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const weeks = Object.entries(weekCounts).map(([week, count]) => ({
        week_commencing: week,
        allocation_count: count
      }));

      setPreviousWeeks(weeks);
    }
  }

  function getNextMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toISOString().split('T')[0];
  }

  async function generateRota() {
    if (!weekCommencing) return;

    setGenerating(true);
    setHasLoaded(false);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-weekly-rota`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_commencing: weekCommencing,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Error: ${result.error || 'Failed to generate rota'}`);
        return;
      }

      await loadAllocations();
      setIsNewGeneration(true);
      setHasLoaded(true);
      await loadPreviousWeeks();
    } catch (error) {
      console.error('Error generating rota:', error);
      alert('Failed to generate rota. Check console for details.');
    } finally {
      setGenerating(false);
    }
  }

  async function loadPreviousRota(week?: string) {
    const targetWeek = week || weekCommencing;
    if (!targetWeek) return;

    if (week) {
      setWeekCommencing(week);
    }

    setLoading(true);
    setHasLoaded(false);

    await loadAllocationsForWeek(targetWeek);
    setIsNewGeneration(false);
    setHasLoaded(true);
    setLoading(false);
  }

  async function deleteRota(week: string, event: React.MouseEvent) {
    event.stopPropagation();

    if (!confirm(`Delete rota for week of ${formatDate(week)}?`)) {
      return;
    }

    const { error: allocError } = await supabase
      .from('weekly_rota_allocation')
      .delete()
      .eq('week_commencing', week);

    if (allocError) {
      console.error('Error deleting allocations:', allocError);
      alert('Error deleting rota');
      return;
    }

    const { error: gapsError } = await supabase
      .from('weekly_rota_gaps')
      .delete()
      .eq('week_commencing', week);

    if (gapsError) {
      console.error('Error deleting gaps:', gapsError);
    }

    await loadPreviousWeeks();

    if (hasLoaded && weekCommencing === week) {
      setHasLoaded(false);
    }
  }

  async function loadAllocationsForWeek(week: string) {
    const { data: allocData } = await supabase
      .from('weekly_rota_allocation')
      .select('id, area, shift_block, score, assigned_to, is_break_cover, hours_required, operator_id, operator:operators(name, is_agency)')
      .eq('week_commencing', week)
      .order('area')
      .order('shift_block');

    setAllocations((allocData as any) || []);

    const { data: gapData } = await supabase
      .from('weekly_rota_gaps')
      .select('*')
      .eq('week_commencing', week)
      .order('shift_block')
      .order('area');

    setGaps((gapData as any) || []);

    const { data: staffPlanData } = await supabase
      .from('weekly_staff_plan')
      .select('operator_id, day1, day2, night1, night2')
      .eq('week_commencing', week);

    const planMap = new Map<string, StaffPlanEntry>();
    (staffPlanData || []).forEach((entry: any) => {
      planMap.set(entry.operator_id, entry);
    });
    setStaffPlan(planMap);
  }

  async function loadAllocations() {
    const { data: allocData } = await supabase
      .from('weekly_rota_allocation')
      .select('id, area, shift_block, score, assigned_to, is_break_cover, hours_required, operator_id, operator:operators(name, is_agency)')
      .eq('week_commencing', weekCommencing)
      .order('area')
      .order('shift_block');

    setAllocations((allocData as any) || []);

    const { data: gapData } = await supabase
      .from('weekly_rota_gaps')
      .select('*')
      .eq('week_commencing', weekCommencing)
      .order('shift_block')
      .order('area');

    setGaps((gapData as any) || []);

    const { data: staffPlanData } = await supabase
      .from('weekly_staff_plan')
      .select('operator_id, day1, day2, night1, night2')
      .eq('week_commencing', weekCommencing);

    const planMap = new Map<string, StaffPlanEntry>();
    (staffPlanData || []).forEach((entry: any) => {
      planMap.set(entry.operator_id, entry);
    });
    setStaffPlan(planMap);
  }

  async function assignAgencyToGap(gap: Gap) {
    // Check if this is Canning area and if it already has 4 operators
    if (gap.area === 'Canning') {
      const currentCanningCount = allocations.filter(
        a => a.area === 'Canning' &&
        a.shift_block === gap.shift_block &&
        !a.is_break_cover
      ).length;

      if (currentCanningCount >= 4) {
        alert('Canning area cannot have more than 4 operators per shift. This is a hard limit that cannot be exceeded.');
        return;
      }
    }

    const { error } = await supabase
      .from('weekly_rota_allocation')
      .insert({
        week_commencing: weekCommencing,
        area: gap.area,
        shift_block: gap.shift_block,
        assigned_to: 'Agency',
        score: 0,
      });

    if (error) {
      console.error('Error assigning agency:', error);
      if (error.message.includes('Canning area cannot have more than 4')) {
        alert('Canning area cannot have more than 4 operators per shift. This is a hard limit that cannot be exceeded.');
      } else {
        alert('Error assigning agency worker');
      }
      return;
    }

    await loadAllocations();
  }

  async function removeAgencyAssignment(allocation: Allocation) {
    if (!confirm('Remove this agency assignment?')) {
      return;
    }

    console.log('Removing agency allocation with ID:', allocation.id);

    setAllocations(prev => prev.filter(a => a.id !== allocation.id));

    const { error } = await supabase
      .from('weekly_rota_allocation')
      .delete()
      .eq('id', allocation.id);

    if (error) {
      console.error('Error removing agency assignment:', error);
      alert(`Error removing agency assignment: ${error.message}`);
      await loadAllocations();
      return;
    }

    await loadOperators();
  }

  async function replaceWithAgency(allocation: Allocation) {
    if (!allocation.operator) return;

    const canLineAreas = ['Canning', 'Can Line', 'MAB3'];
    if (canLineAreas.includes(allocation.area)) {
      const regularOperatorsOnCanLine = allocations.filter(
        a => canLineAreas.includes(a.area) &&
        a.shift_block === allocation.shift_block &&
        a.operator &&
        !a.assigned_to &&
        !a.is_break_cover &&
        a.id !== allocation.id
      );

      if (regularOperatorsOnCanLine.length === 0) {
        alert('Cannot replace this operator with agency. Can Line must have at least one regular operator per shift.');
        return;
      }
    }

    if (!confirm(`Replace ${allocation.operator.name} with agency on ${allocation.area}? This will free them up to cover other gaps.`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('weekly_rota_allocation')
      .delete()
      .eq('id', allocation.id);

    if (deleteError) {
      console.error('Error removing operator:', deleteError);
      alert('Error replacing operator');
      return;
    }

    const { error: insertError } = await supabase
      .from('weekly_rota_allocation')
      .insert({
        week_commencing: weekCommencing,
        area: allocation.area,
        shift_block: allocation.shift_block,
        assigned_to: 'Agency',
        score: 0,
      });

    if (insertError) {
      console.error('Error assigning agency:', insertError);
      alert('Error assigning agency worker');
      return;
    }

    await loadAllocations();
    await loadOperators();
  }

  async function manualAssignOperator(gapArea: string, gapShift: string, operatorId: number) {
    // Check if this is Canning area and if it already has 4 operators
    if (gapArea === 'Canning') {
      const currentCanningCount = allocations.filter(
        a => a.area === 'Canning' &&
        a.shift_block === gapShift &&
        !a.is_break_cover
      ).length;

      if (currentCanningCount >= 4) {
        alert('Canning area cannot have more than 4 operators per shift. This is a hard limit that cannot be exceeded.');
        return;
      }
    }

    const { error } = await supabase
      .from('weekly_rota_allocation')
      .insert({
        week_commencing: weekCommencing,
        area: gapArea,
        shift_block: gapShift,
        operator_id: operatorId,
        score: 0,
      });

    if (error) {
      console.error('Error assigning operator:', error);
      if (error.message.includes('Canning area cannot have more than 4')) {
        alert('Canning area cannot have more than 4 operators per shift. This is a hard limit that cannot be exceeded.');
      } else {
        alert('Error assigning operator');
      }
      return;
    }

    await loadAllocations();
    await loadOperators();
  }

  function getAvailableOperatorsForShift(shift: string) {
    const allocatedOperatorNames = new Set(
      allocations
        .filter(a => a.shift_block === shift && a.operator)
        .map(a => a.operator!.name)
    );

    const shiftField = shift.toLowerCase() as 'day1' | 'day2' | 'night1' | 'night2';

    return operators.filter(op => {
      if (allocatedOperatorNames.has(op.name)) return false;

      const plan = staffPlan.get(op.id.toString());
      if (!plan) return false;

      const availability = plan[shiftField];
      const availUpper = (availability || '').trim().toUpperCase();

      return availUpper !== 'H' && availUpper !== 'SICK' && availUpper !== 'OFF';
    });
  }

  function calculateBreakCoverageNeeds() {
    const needs: BreakCoverageNeed[] = [];
    const shifts = ['DAY1', 'DAY2', 'NIGHT1', 'NIGHT2'];

    shifts.forEach(shift => {
      // Group allocations by area for this shift (exclude break covers)
      const areaGroups = allocations
        .filter(a => a.shift_block === shift && !a.assigned_to && a.operator)
        .reduce((acc, a) => {
          if (!acc[a.area]) acc[a.area] = [];
          acc[a.area].push(a);
          return acc;
        }, {} as Record<string, Allocation[]>);

      // Can Line: Need cover if exactly 3 operators
      if (areaGroups['Can Line']) {
        const canCount = areaGroups['Can Line'].length;
        if (canCount === 3) {
          needs.push({
            area: 'Can Line',
            shift_block: shift,
            hours_required: 3,
            reason: '3 operators - need 3 hours cover',
            suitable_operators: findSuitableOperators(shift, 'canning'),
          });
        }
      }

      // Bottle Lines: Always need cover
      ['MAB1', 'MAB2'].forEach(bottleLine => {
        if (areaGroups[bottleLine] && areaGroups[bottleLine].length > 0) {
          const skillKey = bottleLine === 'MAB1' ? 'mab1' : 'mab2';
          needs.push({
            area: bottleLine,
            shift_block: shift,
            hours_required: 1,
            reason: 'Bottle line requires break cover',
            suitable_operators: findSuitableOperators(shift, skillKey),
          });
        }
      });

      // Keg Line: Use keg loaders to cover
      if (areaGroups['Keg Fillers']) {
        const kegCount = areaGroups['Keg Fillers'].length;
        if (kegCount > 0) {
          needs.push({
            area: 'Keg Fillers',
            shift_block: shift,
            hours_required: kegCount,
            reason: 'Keg line needs cover - prefer keg loaders',
            suitable_operators: findSuitableOperators(shift, 'kegging_inside', true),
          });
        }
      }

      // Corona: Use keg team or others
      if (areaGroups['Corona']) {
        needs.push({
          area: 'Corona',
          shift_block: shift,
          hours_required: 1,
          reason: 'Corona needs cover - prefer keg team',
          suitable_operators: findSuitableOperators(shift, 'corona'),
        });
      }
    });

    setBreakCoverageNeeds(needs);
  }

  function findSuitableOperators(shift: string, skillKey: string, preferKegLoaders = false): Operator[] {
    const allocated = new Set(
      allocations
        .filter(a => a.shift_block === shift && a.operator)
        .map(a => a.operator!.name)
    );

    const shiftField = shift.toLowerCase() as 'day1' | 'day2' | 'night1' | 'night2';

    let suitable = operators.filter(op => {
      if (allocated.has(op.name)) return false;
      if (!op.operator_capabilities) return false;

      const plan = staffPlan.get(op.id.toString());
      if (!plan) return false;

      const availability = plan[shiftField];
      const availUpper = (availability || '').trim().toUpperCase();
      if (availUpper === 'H' || availUpper === 'SICK' || availUpper === 'OFF') return false;

      const skills = op.operator_capabilities;
      const skillLevel = (skills[skillKey as keyof typeof skills] || '').toString().trim().toUpperCase();

      return skillLevel === 'C' || skillLevel === 'S';
    });

    // For keg line, prefer keg loaders
    if (preferKegLoaders) {
      const kegLoaders = suitable.filter(op => {
        const kegLoadSkill = (op.operator_capabilities?.keg_loading || '').toString().trim().toUpperCase();
        return kegLoadSkill === 'C' || kegLoadSkill === 'S';
      });
      if (kegLoaders.length > 0) {
        suitable = [...kegLoaders, ...suitable.filter(op => !kegLoaders.includes(op))];
      }
    }

    return suitable;
  }

  async function assignBreakCover(area: string, shift: string, operatorId: number, hours: number) {
    // Break covers are allowed regardless of the 4-operator limit for Canning
    // as they are part-time coverage and marked separately

    const { error } = await supabase
      .from('weekly_rota_allocation')
      .insert({
        week_commencing: weekCommencing,
        area: area,
        shift_block: shift,
        operator_id: operatorId,
        is_break_cover: true,
        hours_required: hours,
        score: 0,
      });

    if (error) {
      console.error('Error assigning break cover:', error);
      alert('Error assigning break cover');
      return;
    }

    await loadAllocations();
    await loadOperators();
  }

  async function removeBreakCover(allocation: Allocation) {
    if (!confirm(`Remove ${allocation.operator?.name} from break cover on ${allocation.area}?`)) {
      return;
    }

    setAllocations(prev => prev.filter(a => a.id !== allocation.id));

    const { error } = await supabase
      .from('weekly_rota_allocation')
      .delete()
      .eq('id', allocation.id);

    if (error) {
      console.error('Error removing break cover:', error);
      alert('Error removing break cover');
      await loadAllocations();
      return;
    }

    await loadOperators();
  }

  function startEditingOperator(operatorId: string, currentName: string) {
    setEditingOperatorId(operatorId);
    setEditingName(currentName);
  }

  async function saveOperatorName(operatorId: string) {
    if (!editingName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    const { error } = await supabase
      .from('operators')
      .update({ name: editingName.trim() })
      .eq('id', operatorId);

    if (error) {
      console.error('Error updating operator name:', error);
      alert(`Error updating name: ${error.message}`);
      return;
    }

    setEditingOperatorId(null);
    setEditingName('');
    await loadAllocations();
    await loadOperators();
  }

  function cancelEditing() {
    setEditingOperatorId(null);
    setEditingName('');
  }

  const areaGroups = [
    { label: 'Canning', areas: ['Canning', 'MAB3', 'Can Line'] },
    { label: 'Bottling', areas: ['MAB1', 'MAB2'] },
    { label: 'Kegging', areas: ['Kegging - Inside', 'Kegging - Outside', 'Keg Fillers', 'Keg Loading', 'Keg Loaders'] },
    { label: 'Corona', areas: ['Corona'] },
    { label: 'Magor 1', areas: ['Loaders', 'MAK1 Loaders'] },
    { label: 'Tents', areas: ['Tents', 'Tents Loaders'] },
    { label: 'Packaging', areas: ['Packaging'] },
    { label: 'Office', areas: ['Pilots'] }
  ];

  const shifts = ['DAY1', 'DAY2', 'NIGHT1', 'NIGHT2'];

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function isOperatorQualified(_operatorId: string | undefined, _position: string): boolean {
    return true;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Generate & View Rota</h3>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600
          }}
        >
          Back to Home
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, marginBottom: 16, maxWidth: 700 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Week Commencing</label>
          <input
            type="date"
            value={weekCommencing}
            onChange={(e) => setWeekCommencing(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            className="btn-secondary"
            onClick={() => loadPreviousRota()}
            disabled={loading || generating}
            style={{ width: '100%' }}
          >
            {loading ? 'Loading...' : 'Load Previous'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            className="btn-primary"
            onClick={generateRota}
            disabled={generating || loading}
            style={{ width: '100%' }}
          >
            {generating ? 'Generating...' : 'Generate New'}
          </button>
        </div>
      </div>

      {previousWeeks.length > 0 && !hasLoaded && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ marginBottom: 12 }}>Previous Rotas</h4>
          <div style={{ display: 'grid', gap: 8, maxWidth: 600 }}>
            {previousWeeks.slice(0, 10).map(week => (
              <div
                key={week.week_commencing}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                onClick={() => loadPreviousRota(week.week_commencing)}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>Week of {formatDate(week.week_commencing)}</span>
                  <span style={{ color: '#666', fontSize: 13, marginLeft: 12 }}>{week.allocation_count} allocations</span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={(e) => deleteRota(week.week_commencing, e)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    background: '#fee',
                    border: '1px solid #fcc',
                    color: '#c00',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasLoaded && (
        <>
          {allocations.length > 0 ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      {isNewGeneration ? 'Allocation Results' : `Rota for Week of ${formatDate(weekCommencing)}`}
                    </h4>
                    {!isNewGeneration && (
                      <span style={{ fontSize: 13, color: '#666' }}>Viewing saved rota</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setHasLoaded(false);
                        loadPreviousWeeks();
                      }}
                    >
                      Back to List
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => exportRotaToCSV(allocations, weekCommencing)}
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
                  {areaGroups.map((group) => {
                    const areaAllocs = allocations.filter(a => group.areas.includes(a.area));
                    const areaGaps = gaps.filter(g => group.areas.includes(g.area));

                    return (
                      <div
                        key={group.label}
                        style={{
                          background: 'white',
                          border: '1px solid #ddd',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{
                          background: '#e5e7eb',
                          padding: '12px 16px',
                          fontWeight: 600,
                          fontSize: 15,
                          textAlign: 'center',
                          borderBottom: '2px solid #9ca3af'
                        }}>
                          {group.label}
                        </div>

                        <div style={{ padding: 16 }}>
                          {shifts.map(shift => {
                            const shiftAllocs = areaAllocs.filter(a => a.shift_block === shift);
                            const shiftGaps = areaGaps.filter(g => g.shift_block === shift);
                            const totalMissing = shiftGaps.reduce((sum, g) => sum + g.missing_count, 0);

                            if (shiftAllocs.length === 0 && totalMissing === 0) return null;

                            return (
                              <div key={shift} style={{ marginBottom: 16 }}>
                                <div style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#6b7280',
                                  marginBottom: 6,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  {shift}
                                </div>

                                {shiftAllocs.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {shiftAllocs.map(alloc => {
                                      const canLineAreas = ['Canning', 'Can Line', 'MAB3'];
                                      const isCanLineArea = canLineAreas.includes(alloc.area);

                                      const regularOperatorsOnCanLine = isCanLineArea ? allocations.filter(
                                        a => canLineAreas.includes(a.area) &&
                                        a.shift_block === shift &&
                                        a.operator &&
                                        !a.assigned_to &&
                                        !a.is_break_cover
                                      ).length : 0;

                                      const isLastRegularOnCanLine = isCanLineArea &&
                                                                     regularOperatorsOnCanLine === 1 &&
                                                                     alloc.operator &&
                                                                     !alloc.assigned_to;

                                      return (
                                        <div key={alloc.id} style={{
                                          fontSize: 13,
                                          padding: '6px 8px',
                                          background: '#f9fafb',
                                          borderRadius: 4,
                                          border: '1px solid #e5e7eb'
                                        }}>
                                          {alloc.assigned_to === 'Agency' ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <span style={{ color: '#2563eb', fontWeight: 600 }}>Agency</span>
                                              <button
                                                onClick={() => removeAgencyAssignment(alloc)}
                                                style={{
                                                  padding: '2px 6px',
                                                  fontSize: 10,
                                                  background: '#fee',
                                                  border: '1px solid #fcc',
                                                  borderRadius: 3,
                                                  cursor: 'pointer',
                                                  color: '#c00',
                                                }}
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : alloc.is_break_cover ? (
                                            <div>
                                              {editingOperatorId === alloc.operator_id ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                  <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveOperatorName(alloc.operator_id!);
                                                      if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    autoFocus
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 12,
                                                      border: '1px solid #3b82f6',
                                                      borderRadius: 3,
                                                      flex: 1,
                                                    }}
                                                  />
                                                  <button
                                                    onClick={() => saveOperatorName(alloc.operator_id!)}
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 10,
                                                      background: '#22c55e',
                                                      color: 'white',
                                                      border: 'none',
                                                      borderRadius: 3,
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    ✓
                                                  </button>
                                                  <button
                                                    onClick={cancelEditing}
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 10,
                                                      background: '#ef4444',
                                                      color: 'white',
                                                      border: 'none',
                                                      borderRadius: 3,
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span
                                                      onClick={() => startEditingOperator(alloc.operator_id!, alloc.operator!.name)}
                                                      style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                                      title="Click to edit name"
                                                    >
                                                      {alloc.operator?.name}
                                                    </span>
                                                    <span style={{
                                                      fontSize: 9,
                                                      background: '#fef3c7',
                                                      color: '#92400e',
                                                      padding: '1px 4px',
                                                      borderRadius: 3,
                                                      fontWeight: 600,
                                                    }}>
                                                      BREAK {alloc.hours_required}h
                                                    </span>
                                                  </div>
                                                  <button
                                                    onClick={() => removeBreakCover(alloc)}
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 10,
                                                      background: '#fee',
                                                      border: '1px solid #fcc',
                                                      borderRadius: 3,
                                                      cursor: 'pointer',
                                                      color: '#c00',
                                                    }}
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div>
                                              {editingOperatorId === alloc.operator_id ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                  <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveOperatorName(alloc.operator_id!);
                                                      if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                    autoFocus
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 12,
                                                      border: '1px solid #3b82f6',
                                                      borderRadius: 3,
                                                      flex: 1,
                                                    }}
                                                  />
                                                  <button
                                                    onClick={() => saveOperatorName(alloc.operator_id!)}
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 10,
                                                      background: '#22c55e',
                                                      color: 'white',
                                                      border: 'none',
                                                      borderRadius: 3,
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    ✓
                                                  </button>
                                                  <button
                                                    onClick={cancelEditing}
                                                    style={{
                                                      padding: '2px 6px',
                                                      fontSize: 10,
                                                      background: '#ef4444',
                                                      color: 'white',
                                                      border: 'none',
                                                      borderRadius: 3,
                                                      cursor: 'pointer',
                                                    }}
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span
                                                      onClick={() => startEditingOperator(alloc.operator_id!, alloc.operator!.name)}
                                                      style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                                      title="Click to edit name"
                                                    >
                                                      {alloc.operator?.name}
                                                    </span>
                                                    {isLastRegularOnCanLine && (
                                                      <span style={{
                                                        fontSize: 9,
                                                        background: '#dbeafe',
                                                        color: '#1e40af',
                                                        padding: '1px 4px',
                                                        borderRadius: 3,
                                                        fontWeight: 600,
                                                      }}>
                                                        REQUIRED
                                                      </span>
                                                    )}
                                                    {alloc.operator_id && !alloc.operator?.is_agency && !isOperatorQualified(alloc.operator_id, alloc.area) && (
                                                      <span style={{
                                                        fontSize: 9,
                                                        background: '#fee2e2',
                                                        color: '#991b1b',
                                                        padding: '1px 4px',
                                                        borderRadius: 3,
                                                        fontWeight: 600,
                                                      }}>
                                                        ⚠ NOT QUALIFIED
                                                      </span>
                                                    )}
                                                  </div>
                                                  {['Canning', 'MAB1', 'MAB2', 'Loaders', 'Can Line'].includes(alloc.area) && alloc.operator && !alloc.assigned_to && !isLastRegularOnCanLine && (
                                                    <button
                                                      onClick={() => replaceWithAgency(alloc)}
                                                      style={{
                                                        padding: '3px 8px',
                                                        fontSize: 10,
                                                        background: '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: 3,
                                                        cursor: 'pointer',
                                                        color: '#2563eb',
                                                        alignSelf: 'flex-start',
                                                      }}
                                                    >
                                                      Replace w/ Agency
                                                    </button>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : totalMissing > 0 ? (
                                  <div style={{
                                    color: '#dc2626',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    padding: '6px 8px',
                                    background: '#fef2f2',
                                    borderRadius: 4,
                                    border: '1px solid #fecaca'
                                  }}>
                                    GAP ({totalMissing})
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}

                          {areaAllocs.length === 0 && areaGaps.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>
                              No allocations
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {gaps.length > 0 && (
                <div>
                  <h4 style={{ color: '#dc2626' }}>Staffing Gaps Detected</h4>
                  <div style={{ padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                    <strong>Tip:</strong> Use "Replace w/ Agency" on Can Line or Bottle Line positions to free up operators for other gaps.
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {gaps.map(gap => {
                      const hasAgencyAssigned = allocations.some(
                        a => a.area === gap.area && a.shift_block === gap.shift_block && a.assigned_to === 'Agency'
                      );
                      return (
                        <div
                          key={gap.id}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            padding: 16,
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <strong>{gap.area}</strong> - {gap.shift_block}
                            </div>
                            {!hasAgencyAssigned && (
                              <button
                                onClick={() => assignAgencyToGap(gap)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: 13,
                                  background: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                Assign Agency
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 12 }}>
                            Missing {gap.missing_count} operator{gap.missing_count !== 1 ? 's' : ''}
                          </div>

                          {(() => {
                            const availableOps = getAvailableOperatorsForShift(gap.shift_block);
                            return availableOps.length > 0 ? (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                                  Available operators ({availableOps.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {availableOps.map(op => (
                                    <button
                                      key={op.id}
                                      onClick={() => manualAssignOperator(gap.area, gap.shift_block, op.id)}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: 12,
                                        background: '#fff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        color: '#374151',
                                      }}
                                    >
                                      {op.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
                                No operators available for this shift
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {breakCoverageNeeds.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ color: '#f59e0b' }}>Break Coverage Required</h4>
                  <div style={{ padding: 12, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                    <strong>Break Coverage Rules:</strong> Can Line (3 ops = 3hrs), Bottle Lines (always 1hr each), Keg Line (prefer loaders), Corona (prefer keg team)
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {breakCoverageNeeds.map((need, idx) => (
                      <div
                        key={`${need.area}-${need.shift_block}-${idx}`}
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          padding: 16,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <strong>{need.area}</strong> - {need.shift_block}
                        </div>
                        <div style={{ fontSize: 13, color: '#92400e', marginBottom: 12 }}>
                          {need.reason} ({need.hours_required} hour{need.hours_required !== 1 ? 's' : ''})
                        </div>

                        {need.suitable_operators.length > 0 ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                              Available operators ({need.suitable_operators.length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {need.suitable_operators.map(op => (
                                <button
                                  key={op.id}
                                  onClick={() => assignBreakCover(need.area, need.shift_block, op.id, need.hours_required)}
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    background: '#fff',
                                    border: '1px solid #d97706',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    color: '#92400e',
                                    fontWeight: 500,
                                  }}
                                >
                                  {op.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: '#78716c', fontStyle: 'italic' }}>
                            No suitable operators available - all qualified operators are already assigned
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gaps.length === 0 && (
                <div style={{ padding: 16, background: '#dcfce7', borderRadius: 8, border: '1px solid #86efac' }}>
                  No staffing gaps detected. All areas are fully covered for the week.
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#666', background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
              No allocations generated. This may mean no staff plan or line plan exists for this week.
            </div>
          )}
        </>
      )}

      {!hasLoaded && previousWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
          Select a week, then click "Generate New" to create a rota or "Load Previous" to view an existing one.
        </div>
      )}
    </div>
  );
}
