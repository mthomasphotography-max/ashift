import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import TrainingReport from "../components/TrainingReport";

interface SkillLevel {
  id: string;
  name: string;
  sort_order: number;
  description: string;
}

interface SkillTask {
  id: string;
  skill_level_id: string;
  task_name: string;
  task_description: string;
  sort_order: number;
}

interface TaskProgress {
  id?: string;
  skill_task_id: string;
  completed: boolean;
  completed_date: string | null;
  notes: string;
}

interface SkillLevelWithTasks extends SkillLevel {
  tasks: SkillTask[];
  progress: Map<string, TaskProgress>;
  allTasksCompleted: boolean;
  levelAchieved: boolean;
}

interface QualifiedPosition {
  position_name: string;
  required_level: string;
}

export default function SKAPDetailPage() {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const [operatorName, setOperatorName] = useState("");
  const [skillLevels, setSkillLevels] = useState<SkillLevelWithTasks[]>([]);
  const [qualifiedPositions, setQualifiedPositions] = useState<QualifiedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (operatorId) {
      loadData();
    }
  }, [operatorId]);

  async function loadData() {
    if (!operatorId) return;

    setLoading(true);
    try {
      const [operatorRes, levelsRes, tasksRes, progressRes, levelProgressRes] = await Promise.all([
        supabase.from("operators").select("*").eq("id", operatorId).maybeSingle(),
        supabase.from("skill_levels").select("*").order("sort_order"),
        supabase.from("skill_tasks").select("*").order("sort_order"),
        supabase.from("operator_skill_progress").select("*").eq("operator_id", operatorId),
        supabase.from("operator_skill_levels").select("*").eq("operator_id", operatorId)
      ]);

      if (operatorRes.error) throw operatorRes.error;
      if (!operatorRes.data) {
        alert("Operator not found");
        navigate("/skap");
        return;
      }

      setOperatorName(operatorRes.data.name);

      const levels = levelsRes.data || [];
      const tasks = tasksRes.data || [];
      const progress = progressRes.data || [];
      const levelProgress = levelProgressRes.data || [];

      const progressMap = new Map<string, TaskProgress>();
      progress.forEach((p: any) => {
        progressMap.set(p.skill_task_id, {
          id: p.id,
          skill_task_id: p.skill_task_id,
          completed: p.completed,
          completed_date: p.completed_date,
          notes: p.notes || ""
        });
      });

      const levelAchievedMap = new Map<string, boolean>();
      levelProgress.forEach((lp: any) => {
        if (lp.achieved) {
          levelAchievedMap.set(lp.skill_level_id, true);
        }
      });

      const levelsWithTasks: SkillLevelWithTasks[] = levels.map((level: SkillLevel) => {
        const levelTasks = tasks.filter((t: SkillTask) => t.skill_level_id === level.id);
        const completedTasks = levelTasks.filter(t => progressMap.get(t.id)?.completed);
        const allTasksCompleted = levelTasks.length > 0 && completedTasks.length === levelTasks.length;

        return {
          ...level,
          tasks: levelTasks,
          progress: progressMap,
          allTasksCompleted,
          levelAchieved: levelAchievedMap.get(level.id) || false
        };
      });

      setSkillLevels(levelsWithTasks);

      const { data: qualifiedPos, error: qualError } = await supabase
        .rpc('get_operator_qualified_positions', { p_operator_id: operatorId });

      if (!qualError && qualifiedPos) {
        setQualifiedPositions(qualifiedPos);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading operator data");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTaskCompletion(taskId: string, currentStatus: boolean) {
    if (!operatorId || saving) return;

    setSaving(true);
    try {
      const existingProgress = skillLevels
        .flatMap(sl => Array.from(sl.progress.values()))
        .find(p => p.skill_task_id === taskId);

      if (existingProgress?.id) {
        const { error } = await supabase
          .from("operator_skill_progress")
          .update({
            completed: !currentStatus,
            completed_date: !currentStatus ? new Date().toISOString().split('T')[0] : null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingProgress.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("operator_skill_progress")
          .insert({
            operator_id: operatorId,
            skill_task_id: taskId,
            completed: true,
            completed_date: new Date().toISOString().split('T')[0]
          });

        if (error) throw error;
      }

      await loadData();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Error updating task completion");
    } finally {
      setSaving(false);
    }
  }

  function toggleModuleExpansion(levelId: string) {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(levelId)) {
        newSet.delete(levelId);
      } else {
        newSet.add(levelId);
      }
      return newSet;
    });
  }

  async function selectAllTasks(level: SkillLevelWithTasks) {
    if (!operatorId || saving) return;

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasksToUpdate: string[] = [];
      const tasksToInsert: string[] = [];

      level.tasks.forEach(task => {
        const progress = level.progress.get(task.id);
        if (progress?.id && !progress.completed) {
          tasksToUpdate.push(progress.id);
        } else if (!progress) {
          tasksToInsert.push(task.id);
        }
      });

      if (tasksToUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("operator_skill_progress")
          .update({
            completed: true,
            completed_date: today,
            updated_at: new Date().toISOString()
          })
          .in("id", tasksToUpdate);

        if (updateError) throw updateError;
      }

      if (tasksToInsert.length > 0) {
        const insertData = tasksToInsert.map(taskId => ({
          operator_id: operatorId,
          skill_task_id: taskId,
          completed: true,
          completed_date: today
        }));

        const { error: insertError } = await supabase
          .from("operator_skill_progress")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      await loadData();
    } catch (error) {
      console.error("Error selecting all tasks:", error);
      alert("Error marking all tasks as complete");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLevelAchievement(levelId: string, currentStatus: boolean) {
    if (!operatorId || saving) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("operator_skill_levels")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("skill_level_id", levelId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("operator_skill_levels")
          .update({
            achieved: !currentStatus,
            achieved_date: !currentStatus ? new Date().toISOString().split('T')[0] : null,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("operator_skill_levels")
          .insert({
            operator_id: operatorId,
            skill_level_id: levelId,
            achieved: true,
            achieved_date: new Date().toISOString().split('T')[0]
          });

        if (error) throw error;
      }

      await loadData();
    } catch (error) {
      console.error("Error updating level:", error);
      alert("Error updating skill level");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 700 }}>{operatorName}</h1>
          <p style={{ margin: 0, color: "#666", fontSize: 16 }}>SKAP Progress Tracker</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setShowReport(true)}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 2px 8px rgba(196, 30, 58, 0.3)"
            }}
          >
            📄 Training Report
          </button>
          <button
            onClick={() => navigate("/skap")}
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
            Back to List
          </button>
        </div>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        border: "2px solid #ddd"
      }}>
        <h2 style={{
          margin: "0 0 16px 0",
          fontSize: 20,
          fontWeight: 700,
          color: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          Qualified Work Positions
        </h2>
        {qualifiedPositions.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12
          }}>
            {qualifiedPositions.map((pos, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(196, 30, 58, 0.3)"
                }}
              >
                {pos.position_name}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: "20px",
            background: "#fff",
            borderRadius: 8,
            textAlign: "center",
            color: "#666",
            fontSize: 14,
            border: "2px dashed #ddd"
          }}>
            No positions qualified yet. Complete skill levels to unlock work positions.
          </div>
        )}
      </div>

      {skillLevels.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "#f9f9f9",
          borderRadius: 12,
          border: "2px dashed #ddd"
        }}>
          <p style={{ fontSize: 18, color: "#666" }}>No skill levels found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {skillLevels.map((level) => {
            const completedCount = level.tasks.filter(t => level.progress.get(t.id)?.completed).length;
            const totalCount = level.tasks.length;
            const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            const isExpanded = expandedModules.has(level.id);

            return (
              <div
                key={level.id}
                style={{
                  border: level.levelAchieved ? "3px solid #2e7d32" : "2px solid #e0e0e0",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff"
                }}
              >
                <div
                  style={{
                    background: level.levelAchieved
                      ? "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)"
                      : "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
                    padding: "20px 24px",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                  onClick={() => toggleModuleExpansion(level.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 700,
                          transition: "transform 0.3s ease"
                        }}>
                          <span style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.3s ease" }}>▶</span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#fff" }}>
                          {level.name}
                          {level.levelAchieved && (
                            <span style={{
                              marginLeft: 12,
                              padding: "4px 12px",
                              background: "rgba(255, 255, 255, 0.3)",
                              color: "#fff",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600
                            }}>
                              ✓ ACHIEVED
                            </span>
                          )}
                        </h2>
                      </div>
                      {level.description && (
                        <p style={{ margin: "0 0 12px 44px", color: "rgba(255, 255, 255, 0.9)", fontSize: 14 }}>{level.description}</p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 44 }}>
                        <div style={{
                          flex: 1,
                          height: 10,
                          background: "rgba(255, 255, 255, 0.3)",
                          borderRadius: 5,
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${progressPercent}%`,
                            height: "100%",
                            background: "#fff",
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", minWidth: 70 }}>
                          {completedCount} / {totalCount}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLevelAchievement(level.id, level.levelAchieved);
                      }}
                      disabled={saving}
                      style={{
                        marginLeft: 16,
                        padding: "10px 20px",
                        background: "#fff",
                        color: level.levelAchieved ? "#2e7d32" : "#c41e3a",
                        border: "none",
                        borderRadius: 8,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: saving ? 0.6 : 1,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
                      }}
                    >
                      {level.levelAchieved ? "Revoke Level" : "Mark Achieved"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: 24, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#666",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Module Tasks ({level.tasks.length})
                      </h3>
                      {level.tasks.length > 0 && completedCount < totalCount && (
                        <button
                          onClick={() => selectAllTasks(level)}
                          disabled={saving}
                          style={{
                            padding: "8px 16px",
                            background: "#c41e3a",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: saving ? "not-allowed" : "pointer",
                            fontSize: 13,
                            fontWeight: 600,
                            opacity: saving ? 0.6 : 1,
                            transition: "all 0.2s ease"
                          }}
                        >
                          Select All
                        </button>
                      )}
                    </div>

                    {level.tasks.length === 0 ? (
                      <div style={{
                        padding: 32,
                        background: "#fff",
                        borderRadius: 8,
                        textAlign: "center",
                        color: "#999",
                        fontSize: 14,
                        border: "2px dashed #e0e0e0"
                      }}>
                        No tasks defined for this module yet
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {level.tasks.map((task, index) => {
                          const taskProgress = level.progress.get(task.id);
                          const isCompleted = taskProgress?.completed || false;

                          return (
                            <div
                              key={task.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 16,
                                padding: 18,
                                background: isCompleted ? "#e8f5e9" : "#fff",
                                borderRadius: 10,
                                border: isCompleted ? "2px solid #4caf50" : "2px solid #e0e0e0",
                                transition: "all 0.2s ease",
                                position: "relative"
                              }}
                            >
                              <div style={{
                                position: "absolute",
                                left: 18,
                                top: 18,
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                background: isCompleted ? "#4caf50" : "#fff",
                                border: isCompleted ? "none" : "2px solid #c41e3a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                color: isCompleted ? "#fff" : "#c41e3a"
                              }}>
                                {isCompleted ? "✓" : index + 1}
                              </div>
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => toggleTaskCompletion(task.id, isCompleted)}
                                disabled={saving}
                                style={{
                                  width: 22,
                                  height: 22,
                                  marginTop: 2,
                                  marginLeft: 32,
                                  cursor: saving ? "not-allowed" : "pointer",
                                  accentColor: "#c41e3a"
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: 16,
                                  fontWeight: 600,
                                  color: isCompleted ? "#2e7d32" : "#1a1a1a",
                                  textDecoration: isCompleted ? "line-through" : "none",
                                  marginBottom: 4
                                }}>
                                  {task.task_name}
                                </div>
                                {task.task_description && (
                                  <div style={{
                                    fontSize: 14,
                                    color: "#666",
                                    marginTop: 6,
                                    lineHeight: 1.5
                                  }}>
                                    {task.task_description}
                                  </div>
                                )}
                                {isCompleted && taskProgress?.completed_date && (
                                  <div style={{
                                    display: "inline-block",
                                    marginTop: 8,
                                    padding: "4px 10px",
                                    background: "#c8e6c9",
                                    color: "#2e7d32",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}>
                                    ✓ Completed {new Date(taskProgress.completed_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showReport && operatorId && (
        <TrainingReport
          operatorId={operatorId}
          operatorName={operatorName}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
