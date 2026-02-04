import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface Operator {
  id: string;
  name: string;
}

interface SkillLevel {
  id: string;
  name: string;
  sort_order: number;
}

interface OperatorWithProgress extends Operator {
  achievedLevels: string[];
  currentLevel?: string;
  progressPercentage: number;
  completedTasks: number;
  totalTasks: number;
}

export default function SKAPListPage() {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<OperatorWithProgress[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [operatorsRes, skillLevelsRes, progressRes, allTasksRes, taskProgressRes] = await Promise.all([
        supabase.from("operators").select("*").eq("is_agency", false).order("name"),
        supabase.from("skill_levels").select("*").order("sort_order"),
        supabase.from("operator_skill_levels").select("*").eq("achieved", true),
        supabase.from("skill_tasks").select("*"),
        supabase.from("operator_skill_progress").select("*")
      ]);

      if (operatorsRes.error) throw operatorsRes.error;
      if (skillLevelsRes.error) throw skillLevelsRes.error;

      const skillLevelsData = skillLevelsRes.data || [];
      setSkillLevels(skillLevelsData);

      const progressMap = new Map<string, string[]>();
      (progressRes.data || []).forEach((p: any) => {
        if (!progressMap.has(p.operator_id)) {
          progressMap.set(p.operator_id, []);
        }
        progressMap.get(p.operator_id)!.push(p.skill_level_id);
      });

      const allTasks = allTasksRes.data || [];
      const totalTasksCount = allTasks.length;

      const taskCompletionMap = new Map<string, Set<string>>();
      (taskProgressRes.data || []).forEach((tp: any) => {
        if (tp.completed) {
          if (!taskCompletionMap.has(tp.operator_id)) {
            taskCompletionMap.set(tp.operator_id, new Set());
          }
          taskCompletionMap.get(tp.operator_id)!.add(tp.skill_task_id);
        }
      });

      const operatorsWithProgress = (operatorsRes.data || []).map((op: Operator) => {
        const achievedLevelIds = progressMap.get(op.id) || [];
        const achievedLevels = achievedLevelIds
          .map(id => skillLevelsData.find(sl => sl.id === id)?.name)
          .filter(Boolean) as string[];

        const highestAchievedLevel = achievedLevelIds.length > 0
          ? skillLevelsData
              .filter(sl => achievedLevelIds.includes(sl.id))
              .sort((a, b) => b.sort_order - a.sort_order)[0]?.name
          : undefined;

        const completedTasksSet = taskCompletionMap.get(op.id) || new Set();
        const completedTasksCount = completedTasksSet.size;
        const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

        return {
          ...op,
          achievedLevels,
          currentLevel: highestAchievedLevel,
          progressPercentage,
          completedTasks: completedTasksCount,
          totalTasks: totalTasksCount
        };
      });

      setOperators(operatorsWithProgress);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading operators");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    background: "#fff",
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading operators...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>SKAP - Operator Skill Progression</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/skap/settings")}
            style={{
              padding: "10px 20px",
              background: "#c41e3a",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Work Area Settings
          </button>
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
      </div>

      <p style={{ color: "#666", marginBottom: 32, fontSize: 16 }}>
        Track operator progress through skill levels. Click on an operator to view and update their task completion.
      </p>

      {operators.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "#f9f9f9",
          borderRadius: 12,
          border: "2px dashed #ddd"
        }}>
          <p style={{ fontSize: 18, color: "#666", marginBottom: 12 }}>No operators found</p>
          <p style={{ fontSize: 14, color: "#999" }}>Add operators in the Staff Plan page first</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 20
        }}>
          {operators.map((operator) => (
            <div
              key={operator.id}
              style={cardStyle}
              onClick={() => navigate(`/skap/${operator.id}`)}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#c41e3a";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(196, 30, 58, 0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>
                  {operator.name}
                </h3>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: `conic-gradient(#c41e3a ${operator.progressPercentage * 3.6}deg, #e0e0e0 0deg)`,
                  position: "relative"
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1a1a1a"
                  }}>
                    {operator.progressPercentage}%
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12, fontSize: 13, color: "#666" }}>
                <strong>{operator.completedTasks}</strong> of <strong>{operator.totalTasks}</strong> tasks completed
              </div>

              {operator.currentLevel ? (
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    Current Level: {operator.currentLevel}
                  </span>
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    background: "#f5f5f5",
                    color: "#666",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    No levels achieved yet
                  </span>
                </div>
              )}

              <div style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
                <strong>{operator.achievedLevels.length}</strong> of {skillLevels.length} skill levels achieved
              </div>

              {operator.achievedLevels.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: "1px solid #eee" }}>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>Achieved Levels:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {operator.achievedLevels.map((level, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 8px",
                          background: "#e8f5e9",
                          color: "#2e7d32",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
