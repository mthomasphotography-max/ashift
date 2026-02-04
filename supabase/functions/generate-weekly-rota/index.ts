import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Rating = "N" | "B" | "C" | "S" | "" | null | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function ratingToScore(r: Rating): number {
  const x = (r || "").toString().trim().toUpperCase();
  if (x === "N") return 0;
  if (x === "B") return 1;
  if (x === "C") return 2;
  if (x === "S") return 3;
  return 0;
}

function isHolidayCell(v: string | null): boolean {
  return (v || "").trim().toUpperCase() === "H";
}

function isSickCell(v: string | null): boolean {
  return (v || "").trim().toUpperCase() === "SICK";
}

function isOffCell(v: string | null): boolean {
  return (v || "").trim().toUpperCase() === "OFF";
}

function isUnavailable(v: string | null): boolean {
  return isHolidayCell(v) || isSickCell(v) || isOffCell(v);
}

function isWorkingCell(v: string | null): boolean {
  const t = (v || "").trim().toUpperCase();
  if (!t) return false;
  if (t === "H" || t === "SICK" || t === "OFF") return false;
  return true;
}

function fullyUnavailable(day1: string|null, day2: string|null, night1: string|null, night2: string|null): boolean {
  return isUnavailable(day1) && isUnavailable(day2) && isUnavailable(night1) && isUnavailable(night2);
}

type AreaDemand = { area: string; count: number; minCount?: number; minEligible?: (op: any) => boolean; scoreFn: (op: any) => number };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { week_commencing } = await req.json();
    if (!week_commencing) {
      return new Response(JSON.stringify({ error: "week_commencing required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Build week dates array for fetching daily line plans
    const weekStart = new Date(week_commencing + "T00:00:00Z");
    const weekDates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      weekDates.push(dateStr);
    }

    // Get all daily line plans for the week
    const { data: dailyPlans, error: lpErr } = await sb
      .from("daily_line_plan")
      .select("*")
      .in("date", weekDates);

    if (lpErr) {
      return new Response(JSON.stringify({ error: `Error fetching daily plans: ${lpErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dailyPlans || dailyPlans.length === 0) {
      return new Response(JSON.stringify({ error: `No daily line plans found for week ${week_commencing}. Please create a line plan first.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate the requirements across all daily plans
    const linePlan = {
      mak1_running: dailyPlans.some(p => p.mak1_running),
      mac1_running: dailyPlans.some(p => p.mac1_running),
      mac2_running: dailyPlans.some(p => p.mac2_running),
      mab1_running: dailyPlans.some(p => p.mab1_running),
      mab2_running: dailyPlans.some(p => p.mab2_running),
      mab3_running: dailyPlans.some(p => p.mab3_running),
      corona_running: dailyPlans.some(p => p.corona_running),
      packaging_running: dailyPlans.some(p => p.packaging_running),
      tents_running: dailyPlans.some(p => p.tents_running),
      canning_reduced: dailyPlans.some(p => p.canning_reduced),
      keg_load_slots: Math.max(...dailyPlans.map(p => p.keg_load_slots || 0)),
      mak1_load_slots: Math.max(...dailyPlans.map(p => p.mak1_load_slots || 0)),
      tents_load_slots: Math.max(...dailyPlans.map(p => p.tents_load_slots || 0)),
      pilots_required: Math.max(...dailyPlans.map(p => p.pilots_required || 2)),
    };

    const { data: staffRows, error: spErr } = await sb
      .from("weekly_staff_plan")
      .select(`
        day1, day2, night1, night2,
        operators:operator_id (
          id, name, is_active, is_agency, shift, role, constraints, best_suited_areas,
          operator_capabilities (
            flt, canning, mab1, mab2, corona, kegging_inside, kegging_outside, wms, sap, say, packaging, loaders, pilots
          )
        )
      `)
      .eq("week_commencing", week_commencing);

    if (spErr) {
      return new Response(JSON.stringify({ error: spErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!staffRows?.length) {
      return new Response(JSON.stringify({ error: "No staff plan rows found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch allocation history for the last 4 weeks to enable rotation fairness
    const weekStartDate = new Date(week_commencing + "T00:00:00Z");
    const fourWeeksAgo = new Date(weekStartDate);
    fourWeeksAgo.setUTCDate(weekStartDate.getUTCDate() - 28);
    const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

    const { data: historyData } = await sb
      .from("allocation_history")
      .select("operator_id, week_commencing, area")
      .gte("week_commencing", fourWeeksAgoStr)
      .lt("week_commencing", week_commencing);

    // Build a map: operator_id -> area -> weeks_ago
    const rotationHistory = new Map<string, Map<string, number[]>>();
    if (historyData) {
      for (const record of historyData) {
        const recordDate = new Date(record.week_commencing + "T00:00:00Z");
        const weeksDiff = Math.floor((weekStartDate.getTime() - recordDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

        if (!rotationHistory.has(record.operator_id)) {
          rotationHistory.set(record.operator_id, new Map());
        }
        const operatorHistory = rotationHistory.get(record.operator_id)!;

        if (!operatorHistory.has(record.area)) {
          operatorHistory.set(record.area, []);
        }
        operatorHistory.get(record.area)!.push(weeksDiff);
      }
    }

    const pool = staffRows
      .filter(r => r.operators?.is_active)
      .filter(r => r.operators?.operator_capabilities)
      .filter(r => !fullyUnavailable(r.day1, r.day2, r.night1, r.night2))
      .map(r => {
        const c = r.operators.operator_capabilities;
        return {
          operator_id: r.operators.id,
          name: r.operators.name,
          is_agency: r.operators.is_agency || false,
          shift: r.operators.shift || null,
          role: r.operators.role || "General Operator",
          constraints: r.operators.constraints || "",
          best_suited_areas: r.operators.best_suited_areas || {},
          availability: { day1: r.day1, day2: r.day2, night1: r.night1, night2: r.night2 },
          s: {
            flt: ratingToScore(c.flt),
            canning: ratingToScore(c.canning),
            mab1: ratingToScore(c.mab1),
            mab2: ratingToScore(c.mab2),
            corona: ratingToScore(c.corona),
            keg_in: ratingToScore(c.kegging_inside),
            keg_out: ratingToScore(c.kegging_outside),
            wms: ratingToScore(c.wms),
            sap: ratingToScore(c.sap),
            say: ratingToScore(c.say),
            packaging: ratingToScore(c.packaging),
            loaders: ratingToScore(c.loaders),
            pilots: ratingToScore(c.pilots),
          }
        };
      });

    function getBestSuitedBonus(op: any, area: string): number {
      const bestSuited = op.best_suited_areas || {};
      const areaLower = area.toLowerCase();

      const areaMap: Record<string, string[]> = {
        'kegging_inside': ['kegging - inside', 'kegging inside'],
        'kegging_outside': ['kegging - outside', 'kegging outside'],
        'keg_loading': ['keg loading'],
        'pilots': ['pilots'],
        'canning': ['canning'],
        'mab1': ['mab1'],
        'mab2': ['mab2'],
        'corona': ['corona'],
        'packaging': ['packaging'],
        'loaders': ['magor 1 loading', 'magor loading', 'loading'],
        'tents': ['tents']
      };

      for (const [key, matchTerms] of Object.entries(areaMap)) {
        if (bestSuited[key] === true) {
          for (const term of matchTerms) {
            if (areaLower.includes(term) || term.includes(areaLower)) {
              return 50;
            }
          }
        }
      }

      return 0;
    }

    function getRotationPenalty(operatorId: string, area: string): number {
      const operatorHistory = rotationHistory.get(operatorId);
      if (!operatorHistory) {
        return 0;
      }

      const areaHistory = operatorHistory.get(area);
      if (!areaHistory || areaHistory.length === 0) {
        return 0;
      }

      const mostRecentWeek = Math.min(...areaHistory);

      if (mostRecentWeek === 1) {
        return -20;
      } else if (mostRecentWeek === 2) {
        return -15;
      } else if (mostRecentWeek === 3) {
        return -10;
      } else if (mostRecentWeek === 4) {
        return -5;
      }

      return 0;
    }

    function getRolePriorityBonus(op: any, area: string): number {
      const role = (op.role || "").toLowerCase();
      const areaLower = area.toLowerCase();

      let roleBonus = 0;
      if (areaLower.includes("pilot")) {
        if (role.includes("distop") || role.includes("pilot")) roleBonus = 15;
        else if (role.includes("supervisor") || role.includes("multi-op")) roleBonus = 8;
      } else if (areaLower.includes("kegging")) {
        if (role.includes("kegging")) roleBonus = 15;
        else if (role.includes("supervisor") || role.includes("multi-op")) roleBonus = 8;
      } else if (areaLower.includes("packaging")) {
        if (role.includes("packaging")) roleBonus = 15;
        else if (role.includes("supervisor") || role.includes("multi-op")) roleBonus = 8;
      } else if (areaLower.includes("loading") || areaLower.includes("loader")) {
        if (role.includes("loader")) roleBonus = 15;
        else if (role.includes("supervisor") || role.includes("multi-op")) roleBonus = 8;
      } else if (areaLower.includes("canning") || areaLower.includes("mab") || areaLower.includes("corona") || areaLower.includes("tents")) {
        if (role.includes("supervisor") || role.includes("multi-op")) roleBonus = 8;
      }

      const bestSuitedAreas = op.best_suited_areas || {};
      for (const [skillArea, isSuited] of Object.entries(bestSuitedAreas)) {
        if (isSuited) {
          const skillAreaNormalized = skillArea.toLowerCase().replace(/_/g, ' ');
          if (areaLower.includes(skillAreaNormalized) || skillAreaNormalized.includes(areaLower)) {
            roleBonus += 10;
            break;
          }
        }
      }

      return roleBonus;
    }

    function isOperatorEligibleForShift(op: any, shiftBlock: string): boolean {
      // All operators are eligible if they've marked themselves available in the staff plan
      // The availability check (isWorkingCell) will determine if they can actually work this shift
      // This includes:
      // - Regular shift A operators
      // - Other shift (B/C/D) operators doing overtime
      // - Agency workers
      return true;
    }

    function checkConstraints(op: any, area: string, shiftBlock: string): boolean {
      const constraints = (op.constraints || "").toLowerCase();
      const areaLower = area.toLowerCase();
      const isNightShift = shiftBlock.includes("NIGHT");

      if (constraints.includes("flt") && constraints.includes("night") && isNightShift && areaLower.includes("flt")) {
        return false;
      }

      if (constraints.includes("no") && constraints.includes(areaLower)) {
        return false;
      }

      return true;
    }

    const demand: AreaDemand[] = [];

    if (linePlan.mak1_running) {
      demand.push({
        area: "Kegging - Inside",
        count: 1,
        minEligible: (op) => op.s.keg_in >= 2 && op.s.wms >= 2,
        scoreFn: (op) => op.s.keg_in * 3 + op.s.wms * 2 + op.s.flt
      });
      demand.push({
        area: "Kegging - Outside",
        count: 1,
        minEligible: (op) => op.s.keg_out >= 2,
        scoreFn: (op) => op.s.keg_out * 3 + op.s.flt
      });
    }

    const pilotsCount = linePlan.pilots_required || 2;
    demand.push({
      area: "Pilots",
      count: pilotsCount,
      minEligible: (op) => op.s.wms >= 2 && op.s.pilots >= 1,
      scoreFn: (op) => op.s.pilots * 3 + op.s.wms * 2
    });

    if (linePlan.packaging_running) {
      demand.push({
        area: "Packaging",
        count: 1,
        minEligible: (op) => op.s.wms >= 2 && op.s.packaging >= 1,
        scoreFn: (op) => op.s.packaging * 3 + op.s.wms * 2 + op.s.sap
      });
    }

    if (linePlan.mab1_running) {
      demand.push({ area: "MAB1", count: 1, minEligible: (op) => op.s.mab1 >= 2, scoreFn: (op) => op.s.mab1 * 3 + op.s.flt });
    }
    if (linePlan.mab2_running) {
      demand.push({ area: "MAB2", count: 1, minEligible: (op) => op.s.mab2 >= 2, scoreFn: (op) => op.s.mab2 * 3 + op.s.flt });
    }
    if (linePlan.corona_running) {
      demand.push({ area: "Corona", count: 1, minEligible: (op) => op.s.corona >= 2, scoreFn: (op) => op.s.corona * 3 + op.s.flt });
    }

    const anyCanningRunning = linePlan.mac1_running || linePlan.mac2_running || linePlan.mab3_running;
    if (anyCanningRunning) {
      const canningCount = linePlan.canning_reduced ? 3 : 4;
      demand.push({
        area: "Canning",
        count: canningCount,
        minEligible: (op) => op.s.canning >= 1 && op.s.flt >= 2,
        scoreFn: (op) => op.s.canning * 3 + op.s.flt * 2
      });
    }

    if (linePlan.keg_load_slots > 0) {
      const kegLoadOperators = Math.ceil((linePlan.keg_load_slots || 0) / 6);
      demand.push({
        area: "Keg Loading",
        count: kegLoadOperators,
        minEligible: (op) => op.s.loaders >= 1 && op.s.flt >= 2,
        scoreFn: (op) => op.s.loaders * 3 + op.s.flt * 2
      });
    }

    if (linePlan.mak1_load_slots > 0) {
      const mak1LoadOperators = Math.max(1, Math.ceil((linePlan.mak1_load_slots || 0) / 15));
      demand.push({
        area: "Magor 1 Loading",
        count: mak1LoadOperators,
        minCount: 1,
        minEligible: (op) => op.s.loaders >= 1 && op.s.flt >= 2,
        scoreFn: (op) => op.s.loaders * 3 + op.s.flt * 2
      });
    }

    // Combine Tents loading and running into a single "Tents" area
    if (linePlan.tents_load_slots > 0 || linePlan.tents_running) {
      let tentsOperators = 0;

      if (linePlan.tents_load_slots > 0) {
        tentsOperators += Math.max(2, Math.ceil((linePlan.tents_load_slots || 0) / 15));
      }

      if (linePlan.tents_running) {
        tentsOperators += 4;
      }

      demand.push({
        area: "Tents",
        count: tentsOperators,
        minCount: 2,
        minEligible: (op) => op.s.flt >= 1,
        scoreFn: (op) => op.s.loaders * 3 + op.s.flt * 2
      });
    }

    await sb.from("weekly_rota_allocation").delete().eq("week_commencing", week_commencing);
    await sb.from("weekly_rota_gaps").delete().eq("week_commencing", week_commencing);

    const blocks = [
      { key: "DAY1", field: "day1" as const },
      { key: "DAY2", field: "day2" as const },
      { key: "NIGHT1", field: "night1" as const },
      { key: "NIGHT2", field: "night2" as const },
    ];

    const allocationRows: any[] = [];

    for (const block of blocks) {
      const usedInShift = new Set<string>();

      // Phase 1: Allocate minimum required operators for areas with minCount
      const areasWithMinCount = demand.filter(d => d.minCount && d.minCount > 0);
      for (const areaDef of areasWithMinCount) {
        const minToAllocate = areaDef.minCount || 0;
        for (let i = 0; i < minToAllocate; i++) {
          const isCanning = areaDef.area.toLowerCase().includes('canning');
          const canningAllocations = allocationRows.filter(a =>
            a.area.toLowerCase().includes('canning') && a.shift_block === block.key
          );
          const hasRegularOperatorInCanning = canningAllocations.some(a => {
            const op = pool.find(p => p.operator_id === a.operator_id);
            return op && !op.is_agency;
          });

          // First pass: Try with strict minEligible requirements
          let candidates = pool
            .filter(op => !usedInShift.has(op.operator_id))
            .filter(op => isOperatorEligibleForShift(op, block.key))
            .filter(op => isWorkingCell(op.availability[block.field]))
            .filter(op => !isUnavailable(op.availability[block.field]))
            .filter(op => checkConstraints(op, areaDef.area, block.key))
            .filter(op => (areaDef.minEligible ? areaDef.minEligible(op) : true))
            .map(op => {
              const baseScore = areaDef.scoreFn(op);
              const roleBonus = getRolePriorityBonus(op, areaDef.area);
              const rotationPenalty = getRotationPenalty(op.operator_id, areaDef.area);
              const bestSuitedBonus = getBestSuitedBonus(op, areaDef.area);
              return { op, score: baseScore + roleBonus + rotationPenalty + bestSuitedBonus };
            })
            .sort((a, b) => b.score - a.score);

          // For Canning: prioritize regular operators for first position
          if (isCanning && !hasRegularOperatorInCanning && candidates.length > 0) {
            const regularCandidates = candidates.filter(c => !c.op.is_agency);
            if (regularCandidates.length > 0) {
              candidates = regularCandidates;
            }
          }

          // Second pass: If no candidates with strict requirements, try without minEligible
          if (candidates.length === 0 && areaDef.minEligible) {
            candidates = pool
              .filter(op => !usedInShift.has(op.operator_id))
              .filter(op => isOperatorEligibleForShift(op, block.key))
              .filter(op => isWorkingCell(op.availability[block.field]))
              .filter(op => !isUnavailable(op.availability[block.field]))
              .filter(op => checkConstraints(op, areaDef.area, block.key))
              .map(op => {
                const baseScore = areaDef.scoreFn(op);
                const roleBonus = getRolePriorityBonus(op, areaDef.area);
                const rotationPenalty = getRotationPenalty(op.operator_id, areaDef.area);
                const bestSuitedBonus = getBestSuitedBonus(op, areaDef.area);
                return { op, score: baseScore + roleBonus + rotationPenalty + bestSuitedBonus };
              })
              .sort((a, b) => b.score - a.score);

            // For Canning: prioritize regular operators for first position even in second pass
            if (isCanning && !hasRegularOperatorInCanning && candidates.length > 0) {
              const regularCandidates = candidates.filter(c => !c.op.is_agency);
              if (regularCandidates.length > 0) {
                candidates = regularCandidates;
              }
            }
          }

          const best = candidates[0];
          if (!best) continue;

          usedInShift.add(best.op.operator_id);
          allocationRows.push({
            week_commencing,
            operator_id: best.op.operator_id,
            area: areaDef.area,
            shift_block: block.key,
            score: best.score
          });
        }
      }

      // Phase 2: Fill remaining spots in normal order
      for (const areaDef of demand) {
        const alreadyAllocated = allocationRows.filter(a =>
          a.area === areaDef.area && a.shift_block === block.key
        ).length;
        const remaining = areaDef.count - alreadyAllocated;

        for (let i = 0; i < remaining; i++) {
          const isCanning = areaDef.area.toLowerCase().includes('canning');
          const canningAllocations = allocationRows.filter(a =>
            a.area.toLowerCase().includes('canning') && a.shift_block === block.key
          );
          const hasRegularOperatorInCanning = canningAllocations.some(a => {
            const op = pool.find(p => p.operator_id === a.operator_id);
            return op && !op.is_agency;
          });

          // First pass: Try with strict minEligible requirements
          let candidates = pool
            .filter(op => !usedInShift.has(op.operator_id))
            .filter(op => isOperatorEligibleForShift(op, block.key))
            .filter(op => isWorkingCell(op.availability[block.field]))
            .filter(op => !isUnavailable(op.availability[block.field]))
            .filter(op => checkConstraints(op, areaDef.area, block.key))
            .filter(op => (areaDef.minEligible ? areaDef.minEligible(op) : true))
            .map(op => {
              const baseScore = areaDef.scoreFn(op);
              const roleBonus = getRolePriorityBonus(op, areaDef.area);
              const rotationPenalty = getRotationPenalty(op.operator_id, areaDef.area);
              const bestSuitedBonus = getBestSuitedBonus(op, areaDef.area);
              return { op, score: baseScore + roleBonus + rotationPenalty + bestSuitedBonus };
            })
            .sort((a, b) => b.score - a.score);

          // For Canning: prioritize regular operators for first position
          if (isCanning && !hasRegularOperatorInCanning && candidates.length > 0) {
            const regularCandidates = candidates.filter(c => !c.op.is_agency);
            if (regularCandidates.length > 0) {
              candidates = regularCandidates;
            }
          }

          // Second pass: If no candidates with strict requirements, try without minEligible
          if (candidates.length === 0 && areaDef.minEligible) {
            candidates = pool
              .filter(op => !usedInShift.has(op.operator_id))
              .filter(op => isOperatorEligibleForShift(op, block.key))
              .filter(op => isWorkingCell(op.availability[block.field]))
              .filter(op => !isUnavailable(op.availability[block.field]))
              .filter(op => checkConstraints(op, areaDef.area, block.key))
              .map(op => {
                const baseScore = areaDef.scoreFn(op);
                const roleBonus = getRolePriorityBonus(op, areaDef.area);
                const rotationPenalty = getRotationPenalty(op.operator_id, areaDef.area);
                const bestSuitedBonus = getBestSuitedBonus(op, areaDef.area);
                return { op, score: baseScore + roleBonus + rotationPenalty + bestSuitedBonus };
              })
              .sort((a, b) => b.score - a.score);

            // For Canning: prioritize regular operators for first position even in second pass
            if (isCanning && !hasRegularOperatorInCanning && candidates.length > 0) {
              const regularCandidates = candidates.filter(c => !c.op.is_agency);
              if (regularCandidates.length > 0) {
                candidates = regularCandidates;
              }
            }
          }

          const best = candidates[0];
          if (!best) continue;

          usedInShift.add(best.op.operator_id);
          allocationRows.push({
            week_commencing,
            operator_id: best.op.operator_id,
            area: areaDef.area,
            shift_block: block.key,
            score: best.score
          });
        }
      }
    }

    if (allocationRows.length) {
      const { error: insErr } = await sb.from("weekly_rota_allocation").insert(allocationRows);
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record allocations to history for rotation fairness
      const historyRecords = allocationRows.map(allocation => ({
        operator_id: allocation.operator_id,
        week_commencing: allocation.week_commencing,
        day_name: allocation.shift_block,
        shift: allocation.shift_block.includes('NIGHT') ? 'Night' : 'Day',
        area: allocation.area,
        position: allocation.area,
        allocation_id: null
      }));

      const { error: histErr } = await sb.from("allocation_history").insert(historyRecords);
      if (histErr) {
        console.error("Failed to insert allocation history:", histErr.message);
      }
    }

    const demandMap = new Map<string, number>();
    for (const d of demand) demandMap.set(d.area, (demandMap.get(d.area) || 0) + d.count);

    const gapsToInsert: any[] = [];
    for (const b of blocks) {
      const assignedInShift = new Set(
        allocationRows
          .filter(a => a.shift_block === b.key)
          .map(a => a.operator_id)
      );

      for (const [area, required] of demandMap.entries()) {
        const allocatedForAreaInShift = allocationRows.filter(
          a => a.area === area && a.shift_block === b.key
        );
        const missing = required - allocatedForAreaInShift.length;
        if (missing <= 0) continue;

        const coverCandidates = pool
          .filter(op => isOperatorEligibleForShift(op, b.key))
          .filter(op => isWorkingCell(op.availability[b.field]))
          .filter(op => !isUnavailable(op.availability[b.field]))
          .filter(op => !assignedInShift.has(op.operator_id))
          .filter(op => checkConstraints(op, area, b.key))
          .map(op => {
            const def = demand.find(d => d.area === area);
            const baseScore = def ? def.scoreFn(op) : 0;
            const roleBonus = getRolePriorityBonus(op, area);
            return { operator_id: op.operator_id, name: op.name, score: baseScore + roleBonus };
          })
          .sort((a,b) => b.score - a.score)
          .slice(0, 5);

        gapsToInsert.push({
          week_commencing,
          shift_block: b.key,
          area,
          missing_count: missing,
          recommendations: coverCandidates
        });
      }
    }

    if (gapsToInsert.length) {
      const { error: gErr } = await sb.from("weekly_rota_gaps").insert(gapsToInsert);
      if (gErr) {
        return new Response(JSON.stringify({ error: gErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      week_commencing,
      allocated_count: allocationRows.length,
      pool_count: pool.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});