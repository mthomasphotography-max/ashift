import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type AllocationData = {
  operator_id: string;
  operator_name: string;
  area_counts: Record<string, number>;
  total: number;
};

export default function AllocationChart() {
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [areas, setAreas] = useState<string[]>([]);

  useEffect(() => {
    loadAllocations();
  }, []);

  async function loadAllocations() {
    setLoading(true);

    const { data: operators } = await supabase
      .from('operators')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: allocationData } = await supabase
      .from('weekly_rota_allocation')
      .select('operator_id, area, week_commencing')
      .not('assigned_to', 'eq', 'Agency')
      .order('week_commencing', { ascending: true });

    if (!operators || !allocationData) {
      setLoading(false);
      return;
    }

    if (allocationData.length > 0) {
      const weeks = allocationData.map(a => a.week_commencing).sort();
      setDateRange({
        start: weeks[0],
        end: weeks[weeks.length - 1]
      });
    }

    const uniqueAreas = Array.from(new Set(allocationData.map(a => a.area))).sort();
    setAreas(uniqueAreas);

    const allocationsByOperator = new Map<string, Record<string, number>>();

    allocationData.forEach(allocation => {
      if (!allocationsByOperator.has(allocation.operator_id)) {
        allocationsByOperator.set(allocation.operator_id, {});
      }
      const operatorCounts = allocationsByOperator.get(allocation.operator_id)!;
      operatorCounts[allocation.area] = (operatorCounts[allocation.area] || 0) + 1;
    });

    const result: AllocationData[] = [];

    operators.forEach(operator => {
      const areaCounts = allocationsByOperator.get(operator.id) || {};
      const total = Object.values(areaCounts).reduce((sum, count) => sum + count, 0);

      result.push({
        operator_id: operator.id,
        operator_name: operator.name,
        area_counts: areaCounts,
        total
      });
    });

    setAllocations(result);
    setLoading(false);
  }

  function getMaxCount(): number {
    let max = 0;
    allocations.forEach(allocation => {
      Object.values(allocation.area_counts).forEach(count => {
        if (count > max) max = count;
      });
    });
    return max;
  }

  function getCellColor(count: number, max: number): string {
    if (count === 0) return '#f9f9f9';
    const intensity = count / max;
    if (intensity >= 0.7) return '#10b981';
    if (intensity >= 0.4) return '#60a5fa';
    if (intensity >= 0.2) return '#fbbf24';
    return '#e5e7eb';
  }

  function getAreaTotals(): Record<string, number> {
    const totals: Record<string, number> = {};
    areas.forEach(area => {
      totals[area] = 0;
    });
    allocations.forEach(allocation => {
      areas.forEach(area => {
        totals[area] += allocation.area_counts[area] || 0;
      });
    });
    return totals;
  }

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>Loading allocation data...</div>;
  }

  if (allocations.length === 0 || allocations.every(a => a.total === 0)) {
    return (
      <div style={{ padding: 24, textAlign: 'center', background: '#f9f9f9', borderRadius: 8 }}>
        <p style={{ margin: 0, color: '#666' }}>
          No allocation history found. Generate rotas to see allocation data here.
        </p>
      </div>
    );
  }

  const maxCount = getMaxCount();
  const areaTotals = getAreaTotals();
  const grandTotal = Object.values(areaTotals).reduce((sum, val) => sum + val, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h4 style={{ margin: 0, marginBottom: 4 }}>Historical Allocations by Area</h4>
          {dateRange && (
            <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
              Data from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, background: '#10b981', borderRadius: 2 }}></div>
            <span>High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, background: '#60a5fa', borderRadius: 2 }}></div>
            <span>Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, background: '#fbbf24', borderRadius: 2 }}></div>
            <span>Low</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 16, background: '#e5e7eb', borderRadius: 2 }}></div>
            <span>Minimal</span>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 10 }}>Operator</th>
              {areas.map(area => (
                <th key={area} style={{ minWidth: 80 }}>
                  {area}
                </th>
              ))}
              <th style={{ fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map(allocation => (
              <tr key={allocation.operator_id}>
                <td style={{
                  fontWeight: 500,
                  position: 'sticky',
                  left: 0,
                  background: 'white',
                  zIndex: 9
                }}>
                  {allocation.operator_name}
                </td>
                {areas.map(area => {
                  const count = allocation.area_counts[area] || 0;
                  return (
                    <td
                      key={area}
                      style={{
                        textAlign: 'center',
                        background: getCellColor(count, maxCount),
                        fontWeight: count > 0 ? 500 : 400,
                        color: count === 0 ? '#999' : '#000'
                      }}
                    >
                      {count || '-'}
                    </td>
                  );
                })}
                <td style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  background: '#f3f4f6'
                }}>
                  {allocation.total}
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #374151' }}>
              <td style={{
                fontWeight: 700,
                position: 'sticky',
                left: 0,
                background: '#f3f4f6',
                zIndex: 9
              }}>
                Total by Area
              </td>
              {areas.map(area => (
                <td
                  key={area}
                  style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    background: '#dbeafe',
                    color: '#1e40af'
                  }}
                >
                  {areaTotals[area]}
                </td>
              ))}
              <td style={{
                textAlign: 'center',
                fontWeight: 700,
                background: '#374151',
                color: 'white'
              }}>
                {grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#666', fontStyle: 'italic' }}>
        Each cell shows the number of times an operator has been allocated to that area across all generated rotas.
      </div>
    </div>
  );
}
