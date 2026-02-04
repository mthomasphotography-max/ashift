import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SkillLevel {
  id: string;
  name: string;
  sort_order: number;
}

interface SkillTask {
  id: string;
  skill_level_id: string;
  task_name: string;
  task_description: string;
  sort_order: number;
}

interface TaskWithLevel extends SkillTask {
  skill_level_name: string;
}

const SKAPTaskEditorPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithLevel[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [modifiedTasks, setModifiedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [levelsResult, tasksResult] = await Promise.all([
        supabase.from('skill_levels').select('*').order('sort_order'),
        supabase
          .from('skill_tasks')
          .select('*, skill_levels(name)')
          .order('sort_order')
      ]);

      if (levelsResult.data) {
        setSkillLevels(levelsResult.data);
      }

      if (tasksResult.data) {
        const tasksWithLevel = tasksResult.data.map((task: any) => ({
          ...task,
          skill_level_name: task.skill_levels?.name || 'Unknown'
        }));
        setTasks(tasksWithLevel);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (task: TaskWithLevel) => {
    setEditingTaskId(task.id);
    setEditValue(task.task_description);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditValue('');
  };

  const saveTask = async (taskId: string) => {
    if (editValue.trim() === '') {
      alert('Task description cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const { error } = await supabase
        .from('skill_tasks')
        .update({ task_description: editValue.trim() })
        .eq('task_name', task.task_name);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? { ...t, task_description: editValue.trim() }
            : t
        )
      );

      setModifiedTasks(prev => {
        const newSet = new Set(prev);
        newSet.add(taskId);
        return newSet;
      });

      setEditingTaskId(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel =
      selectedLevel === 'all' || task.skill_level_name === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const groupedTasks = skillLevels.reduce((acc, level) => {
    acc[level.name] = filteredTasks.filter(
      task => task.skill_level_name === level.name
    );
    return acc;
  }, {} as Record<string, TaskWithLevel[]>);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            SKAP Task Editor
          </h1>
          <p className="text-gray-600">
            Review and correct task descriptions for spelling and accuracy
          </p>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Tasks
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by task name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Level
              </label>
              <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                {skillLevels.map(level => (
                  <option key={level.id} value={level.name}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {modifiedTasks.size > 0 && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              <strong>{modifiedTasks.size}</strong> task(s) have been updated
            </p>
          </div>
        )}

        <div className="space-y-6">
          {skillLevels.map(level => {
            const levelTasks = groupedTasks[level.name] || [];
            if (levelTasks.length === 0 && selectedLevel !== 'all') return null;

            return (
              <div key={level.id} className="bg-white rounded-lg shadow">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {level.name}
                    <span className="ml-3 text-sm font-normal text-gray-500">
                      ({levelTasks.length} tasks)
                    </span>
                  </h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {levelTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-6 hover:bg-gray-50 transition-colors ${
                        modifiedTasks.has(task.id) ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {task.task_name}
                          </span>
                          {modifiedTasks.has(task.id) && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Saved
                            </span>
                          )}
                        </div>
                        {editingTaskId !== task.id && (
                          <button
                            onClick={() => startEditing(task)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {editingTaskId === task.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => saveTask(task.id)}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 leading-relaxed">
                          {task.task_description}
                        </p>
                      )}
                    </div>
                  ))}

                  {levelTasks.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No tasks found for this level
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
};

export default SKAPTaskEditorPage;
