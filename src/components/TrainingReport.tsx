import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface TrainingReportProps {
  operatorId: string;
  operatorName: string;
  onClose: () => void;
}

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
  skill_task_id: string;
  completed: boolean;
  completed_date: string | null;
}

interface LevelProgress {
  skill_level_id: string;
  achieved: boolean;
  achieved_date: string | null;
}

interface PositionRequirement {
  position_name: string;
  minimum_skill_level_id: string;
}

interface LevelReport {
  level: SkillLevel;
  achieved: boolean;
  achievedDate: string | null;
  totalTasks: number;
  completedTasks: number;
  outstandingTasks: SkillTask[];
  unlocksPositions: string[];
}

export default function TrainingReport({ operatorId, operatorName, onClose }: TrainingReportProps) {
  const [report, setReport] = useState<LevelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDate] = useState(new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }));

  useEffect(() => {
    loadReportData();
  }, [operatorId]);

  async function loadReportData() {
    setLoading(true);
    try {
      const [levelsRes, tasksRes, progressRes, levelProgressRes, positionsRes] = await Promise.all([
        supabase.from("skill_levels").select("*").order("sort_order"),
        supabase.from("skill_tasks").select("*").order("sort_order"),
        supabase.from("operator_skill_progress").select("*").eq("operator_id", operatorId),
        supabase.from("operator_skill_levels").select("*").eq("operator_id", operatorId),
        supabase.from("position_skill_requirements").select("position_name, minimum_skill_level_id")
      ]);

      const levels = levelsRes.data || [];
      const tasks = tasksRes.data || [];
      const progress = progressRes.data || [];
      const levelProgress = levelProgressRes.data || [];
      const positions = positionsRes.data || [];

      const progressMap = new Map<string, TaskProgress>();
      progress.forEach((p: any) => {
        progressMap.set(p.skill_task_id, {
          skill_task_id: p.skill_task_id,
          completed: p.completed,
          completed_date: p.completed_date
        });
      });

      const levelProgressMap = new Map<string, LevelProgress>();
      levelProgress.forEach((lp: any) => {
        levelProgressMap.set(lp.skill_level_id, {
          skill_level_id: lp.skill_level_id,
          achieved: lp.achieved,
          achieved_date: lp.achieved_date
        });
      });

      const positionsMap = new Map<string, string[]>();
      (positions as PositionRequirement[]).forEach(pos => {
        if (!positionsMap.has(pos.minimum_skill_level_id)) {
          positionsMap.set(pos.minimum_skill_level_id, []);
        }
        positionsMap.get(pos.minimum_skill_level_id)!.push(pos.position_name);
      });

      const reportData: LevelReport[] = (levels as SkillLevel[]).map(level => {
        const levelTasks = (tasks as SkillTask[]).filter(t => t.skill_level_id === level.id);
        const completedTasks = levelTasks.filter(t => progressMap.get(t.id)?.completed);
        const outstandingTasks = levelTasks.filter(t => !progressMap.get(t.id)?.completed);
        const levelProg = levelProgressMap.get(level.id);

        return {
          level,
          achieved: levelProg?.achieved || false,
          achievedDate: levelProg?.achieved_date || null,
          totalTasks: levelTasks.length,
          completedTasks: completedTasks.length,
          outstandingTasks,
          unlocksPositions: positionsMap.get(level.id) || []
        };
      });

      setReport(reportData);
    } catch (error) {
      console.error("Error loading report data:", error);
      alert("Error loading training report");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{ background: "#fff", padding: 40, borderRadius: 12 }}>
          Loading report...
        </div>
      </div>
    );
  }

  const achievedCount = report.filter(r => r.achieved).length;
  const inProgressCount = report.filter(r => !r.achieved && r.completedTasks > 0).length;
  const notStartedCount = report.filter(r => r.completedTasks === 0).length;

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
          overflowY: "auto"
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            maxWidth: 900,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="no-print" style={{
            padding: "20px 24px",
            borderBottom: "2px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f9fafb"
          }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Training Progress Report</h2>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handlePrint}
                style={{
                  padding: "10px 20px",
                  background: "#c41e3a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                Print Report
              </button>
              <button
                onClick={onClose}
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
                Close
              </button>
            </div>
          </div>

          <div style={{ padding: 32 }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={{
                    margin: "0 0 8px 0",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#1a1a1a"
                  }}>
                    {operatorName}
                  </h1>
                  <p style={{ margin: 0, color: "#666", fontSize: 16 }}>
                    SKAP Training Progress Report
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Report Date:</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{reportDate}</div>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 32
              }}>
                <div style={{
                  padding: 20,
                  background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                  color: "#fff",
                  borderRadius: 12,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{achievedCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Levels Achieved</div>
                </div>
                <div style={{
                  padding: 20,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  borderRadius: 12,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{inProgressCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>In Progress</div>
                </div>
                <div style={{
                  padding: 20,
                  background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                  color: "#fff",
                  borderRadius: 12,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{notStartedCount}</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Not Started</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {report.map((item, index) => {
                const progressPercent = item.totalTasks > 0 ? (item.completedTasks / item.totalTasks) * 100 : 0;
                const status = item.achieved ? "achieved" : item.completedTasks > 0 ? "in-progress" : "not-started";

                return (
                  <div
                    key={item.level.id}
                    style={{
                      border: item.achieved ? "3px solid #2e7d32" : "2px solid #e0e0e0",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#fff",
                      breakInside: "avoid",
                      pageBreakInside: "avoid"
                    }}
                  >
                    <div style={{
                      background: item.achieved
                        ? "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)"
                        : status === "in-progress"
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                      padding: "20px 24px",
                      color: "#fff"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            fontWeight: 700
                          }}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 style={{ margin: "0 0 4px 0", fontSize: 22, fontWeight: 700 }}>
                              {item.level.name}
                            </h3>
                            {item.level.description && (
                              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                                {item.level.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.achieved && (
                          <div style={{
                            padding: "8px 16px",
                            background: "rgba(255, 255, 255, 0.3)",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600
                          }}>
                            ✓ ACHIEVED
                            {item.achievedDate && (
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                {new Date(item.achievedDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{
                        height: 12,
                        background: "rgba(255, 255, 255, 0.3)",
                        borderRadius: 6,
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: "100%",
                          background: "#fff",
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                      <div style={{
                        marginTop: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        opacity: 0.9
                      }}>
                        {item.completedTasks} / {item.totalTasks} tasks completed ({Math.round(progressPercent)}%)
                      </div>
                    </div>

                    <div style={{ padding: 24, background: "#fafafa" }}>
                      {item.unlocksPositions.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#666",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: 12
                          }}>
                            🎯 Unlocks Positions:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {item.unlocksPositions.map(pos => (
                              <div
                                key={pos}
                                style={{
                                  padding: "6px 12px",
                                  background: item.achieved ? "#c41e3a" : "#e0e0e0",
                                  color: item.achieved ? "#fff" : "#666",
                                  borderRadius: 6,
                                  fontSize: 13,
                                  fontWeight: 600
                                }}
                              >
                                {pos}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.outstandingTasks.length > 0 && (
                        <div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#c41e3a",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginBottom: 12
                          }}>
                            📋 Outstanding Tasks ({item.outstandingTasks.length}):
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {item.outstandingTasks.map((task, idx) => (
                              <div
                                key={task.id}
                                style={{
                                  display: "flex",
                                  gap: 12,
                                  padding: 16,
                                  background: "#fff",
                                  borderRadius: 8,
                                  border: "2px solid #fee2e2"
                                }}
                              >
                                <div style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "#fff",
                                  border: "2px solid #c41e3a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#c41e3a",
                                  flexShrink: 0
                                }}>
                                  {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#1a1a1a",
                                    marginBottom: 4
                                  }}>
                                    {task.task_name}
                                  </div>
                                  {task.task_description && (
                                    <div style={{
                                      fontSize: 13,
                                      color: "#666",
                                      lineHeight: 1.5
                                    }}>
                                      {task.task_description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.outstandingTasks.length === 0 && item.achieved && (
                        <div style={{
                          padding: 20,
                          background: "#e8f5e9",
                          borderRadius: 8,
                          textAlign: "center",
                          color: "#2e7d32",
                          fontSize: 15,
                          fontWeight: 600,
                          border: "2px solid #4caf50"
                        }}>
                          ✓ All tasks completed for this level
                        </div>
                      )}

                      {item.outstandingTasks.length === 0 && !item.achieved && (
                        <div style={{
                          padding: 20,
                          background: "#fff3cd",
                          borderRadius: 8,
                          textAlign: "center",
                          color: "#856404",
                          fontSize: 15,
                          fontWeight: 600,
                          border: "2px solid #ffc107"
                        }}>
                          ⚠ All tasks completed - awaiting level sign-off
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: 32,
              padding: 24,
              background: "#f9fafb",
              borderRadius: 12,
              border: "2px solid #e0e0e0"
            }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700 }}>
                Next Steps
              </h3>
              <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
                {achievedCount === report.length ? (
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "#2e7d32" }}>Congratulations!</strong> You have achieved all SKAP skill levels.
                    Continue to maintain your skills and mentor others on their journey.
                  </p>
                ) : (
                  <>
                    <p style={{ margin: "0 0 12px 0" }}>
                      Focus on completing outstanding tasks for in-progress levels before starting new ones.
                    </p>
                    <p style={{ margin: "0 0 12px 0" }}>
                      Complete all tasks for a level, then request sign-off from your supervisor to achieve the level officially.
                    </p>
                    <p style={{ margin: 0 }}>
                      Each level unlocks new work positions, expanding your capabilities and opportunities within the organization.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
