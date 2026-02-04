import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface SkillLevel {
  id: string;
  name: string;
  sort_order: number;
  description: string | null;
}

interface SkillTask {
  id: string;
  skill_level_id: string;
  task_name: string;
  task_description: string | null;
  sort_order: number;
  work_areas: string[];
}

const WORK_AREAS = [
  'Keg line - inside',
  'Keg line - outside',
  'Keg loading',
  'Can lines',
  'Bot lines',
  'Packaging',
  'Piloting',
  'Loading',
];

export default function SKAPSettingsPage() {
  const navigate = useNavigate();
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [skillTasks, setSkillTasks] = useState<SkillTask[]>([]);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editedLevelName, setEditedLevelName] = useState('');
  const [editingTaskName, setEditingTaskName] = useState<string | null>(null);
  const [editedTaskName, setEditedTaskName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: levels } = await supabase
      .from('skill_levels')
      .select('*')
      .order('sort_order');

    const { data: tasks } = await supabase
      .from('skill_tasks')
      .select('*')
      .order('sort_order');

    if (levels) {
      const filteredLevels = levels.filter(level => level.name !== 'Drivers Licence');
      setSkillLevels(filteredLevels);
    }
    if (tasks) setSkillTasks(tasks);
  };

  const toggleLevel = (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
    }
    setExpandedLevels(newExpanded);
  };

  const toggleWorkArea = async (taskId: string, workArea: string) => {
    const task = skillTasks.find(t => t.id === taskId);
    if (!task) return;

    setSaving(taskId);
    const currentAreas = task.work_areas || [];
    const newAreas = currentAreas.includes(workArea)
      ? currentAreas.filter(a => a !== workArea)
      : [...currentAreas, workArea];

    const { error } = await supabase
      .from('skill_tasks')
      .update({ work_areas: newAreas })
      .eq('id', taskId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } else {
      setSkillTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, work_areas: newAreas } : t
      ));
      setMessage({ type: 'success', text: 'Work area associations updated' });
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(null);
  };

  const selectAllWorkAreas = async (taskId: string) => {
    setSaving(taskId);

    const { error } = await supabase
      .from('skill_tasks')
      .update({ work_areas: WORK_AREAS })
      .eq('id', taskId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } else {
      setSkillTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, work_areas: WORK_AREAS } : t
      ));
      setMessage({ type: 'success', text: 'All work areas selected' });
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(null);
  };

  const startEditingTask = (taskId: string, currentDescription: string | null) => {
    setEditingTask(taskId);
    setEditedDescription(currentDescription || '');
  };

  const cancelEditingTask = () => {
    setEditingTask(null);
    setEditedDescription('');
  };

  const saveTaskDescription = async (taskId: string) => {
    setSaving(taskId);

    const { error } = await supabase
      .from('skill_tasks')
      .update({ task_description: editedDescription || null })
      .eq('id', taskId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } else {
      setSkillTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, task_description: editedDescription || null } : t
      ));
      setMessage({ type: 'success', text: 'Task description updated' });
      setTimeout(() => setMessage(null), 3000);
      setEditingTask(null);
      setEditedDescription('');
    }
    setSaving(null);
  };

  const startEditingLevel = (levelId: string, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingLevel(levelId);
    setEditedLevelName(currentName);
  };

  const cancelEditingLevel = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingLevel(null);
    setEditedLevelName('');
  };

  const saveLevelName = async (levelId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!editedLevelName.trim()) {
      setMessage({ type: 'error', text: 'Level name cannot be empty' });
      return;
    }

    setSaving(levelId);

    const { error } = await supabase
      .from('skill_levels')
      .update({ name: editedLevelName.trim() })
      .eq('id', levelId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } else {
      setSkillLevels(prev => prev.map(l =>
        l.id === levelId ? { ...l, name: editedLevelName.trim() } : l
      ));
      setMessage({ type: 'success', text: 'Level name updated' });
      setTimeout(() => setMessage(null), 3000);
      setEditingLevel(null);
      setEditedLevelName('');
    }
    setSaving(null);
  };

  const startEditingTaskName = (taskId: string, currentName: string) => {
    setEditingTaskName(taskId);
    setEditedTaskName(currentName);
  };

  const cancelEditingTaskName = () => {
    setEditingTaskName(null);
    setEditedTaskName('');
  };

  const saveTaskName = async (taskId: string) => {
    if (!editedTaskName.trim()) {
      setMessage({ type: 'error', text: 'Task name cannot be empty' });
      return;
    }

    setSaving(taskId);

    const { error } = await supabase
      .from('skill_tasks')
      .update({ task_name: editedTaskName.trim() })
      .eq('id', taskId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } else {
      setSkillTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, task_name: editedTaskName.trim() } : t
      ));
      setMessage({ type: 'success', text: 'Task name updated' });
      setTimeout(() => setMessage(null), 3000);
      setEditingTaskName(null);
      setEditedTaskName('');
    }
    setSaving(null);
  };

  const expandAll = () => {
    setExpandedLevels(new Set(skillLevels.map(l => l.id)));
  };

  const collapseAll = () => {
    setExpandedLevels(new Set());
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
              SKAP Work Area Settings
            </h1>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Associate training tasks with work areas to improve rota allocation accuracy
            </p>
          </div>
          <button
            onClick={() => navigate('/skap')}
            style={{
              padding: '8px 16px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Back to SKAP
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: '4px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Collapse All
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {skillLevels.map(level => {
            const levelTasks = skillTasks.filter(t => t.skill_level_id === level.id);
            const isExpanded = expandedLevels.has(level.id);

            return (
              <div
                key={level.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white',
                }}
              >
                <div
                  onClick={() => toggleLevel(level.id)}
                  style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid #ddd' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {editingLevel === level.id ? (
                      <div onClick={(e) => e.stopPropagation()} style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={editedLevelName}
                          onChange={(e) => setEditedLevelName(e.target.value)}
                          style={{
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            fontSize: '16px',
                            fontWeight: '600',
                            width: '300px',
                            maxWidth: '100%',
                          }}
                          placeholder="Enter level name..."
                          autoFocus
                        />
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => saveLevelName(level.id, e)}
                            disabled={saving === level.id}
                            style={{
                              padding: '6px 12px',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving === level.id ? 'wait' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={(e) => cancelEditingLevel(e)}
                            disabled={saving === level.id}
                            style={{
                              padding: '6px 12px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: saving === level.id ? 'wait' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                          {level.name}
                        </h2>
                        <button
                          onClick={(e) => startEditingLevel(level.id, level.name, e)}
                          style={{
                            padding: '4px 8px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    {level.description && !editingLevel && (
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                        {level.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      background: '#e9ecef',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}>
                      {levelTasks.length} tasks
                    </span>
                    <span style={{ fontSize: '20px' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '16px' }}>
                    {levelTasks.length === 0 ? (
                      <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>
                        No tasks defined for this skill level
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {levelTasks.map(task => (
                          <div
                            key={task.id}
                            style={{
                              padding: '16px',
                              background: '#f8f9fa',
                              borderRadius: '6px',
                              border: '1px solid #e9ecef',
                            }}
                          >
                            <div style={{ marginBottom: '12px' }}>
                              {editingTaskName === task.id ? (
                                <div style={{ marginBottom: '8px' }}>
                                  <input
                                    type="text"
                                    value={editedTaskName}
                                    onChange={(e) => setEditedTaskName(e.target.value)}
                                    style={{
                                      padding: '8px',
                                      border: '1px solid #ced4da',
                                      borderRadius: '4px',
                                      fontSize: '16px',
                                      fontWeight: '600',
                                      width: '400px',
                                      maxWidth: '100%',
                                    }}
                                    placeholder="Enter task name..."
                                    autoFocus
                                  />
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => saveTaskName(task.id)}
                                      disabled={saving === task.id}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: saving === task.id ? 'wait' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEditingTaskName}
                                      disabled={saving === task.id}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: saving === task.id ? 'wait' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                    Task {task.sort_order}: {task.task_name}
                                  </h3>
                                  <button
                                    onClick={() => startEditingTaskName(task.id, task.task_name)}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                    }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                              {editingTask === task.id ? (
                                <div style={{ marginTop: '8px' }}>
                                  <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    style={{
                                      width: '100%',
                                      minHeight: '60px',
                                      padding: '8px',
                                      border: '1px solid #ced4da',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                      fontFamily: 'inherit',
                                      resize: 'vertical',
                                    }}
                                    placeholder="Enter task description..."
                                  />
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => saveTaskDescription(task.id)}
                                      disabled={saving === task.id}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: saving === task.id ? 'wait' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                      }}
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEditingTask}
                                      disabled={saving === task.id}
                                      style={{
                                        padding: '6px 12px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: saving === task.id ? 'wait' : 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                                  <p style={{ margin: 0, color: '#666', fontSize: '14px', flex: 1 }}>
                                    {task.task_description || 'No description'}
                                  </p>
                                  <button
                                    onClick={() => startEditingTask(task.id, task.task_description)}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      flexShrink: 0,
                                    }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>

                            <div>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px',
                              }}>
                                <label style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#495057',
                                  margin: 0,
                                }}>
                                  Applicable Work Areas:
                                </label>
                                <button
                                  onClick={() => selectAllWorkAreas(task.id)}
                                  disabled={saving === task.id}
                                  style={{
                                    padding: '4px 12px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: saving === task.id ? 'wait' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    opacity: saving === task.id ? 0.6 : 1,
                                  }}
                                >
                                  Select All
                                </button>
                              </div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '8px',
                              }}>
                                {WORK_AREAS.map(workArea => {
                                  const isSelected = (task.work_areas || []).includes(workArea);
                                  const isSaving = saving === task.id;

                                  return (
                                    <label
                                      key={workArea}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        background: 'white',
                                        border: `2px solid ${isSelected ? '#007bff' : '#dee2e6'}`,
                                        borderRadius: '4px',
                                        cursor: isSaving ? 'wait' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: isSaving ? 0.6 : 1,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleWorkArea(task.id, workArea)}
                                        disabled={isSaving}
                                        style={{ cursor: isSaving ? 'wait' : 'pointer' }}
                                      />
                                      <span style={{ fontSize: '14px' }}>{workArea}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
  );
}
