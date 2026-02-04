import { useState, useEffect, useRef, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { generateOperatorsCSVTemplate, downloadCSV } from '../utils/csvTemplates';
import { parseOperatorsCSV } from '../utils/csvParser';

type Operator = {
  id: string;
  name: string;
  is_active: boolean;
  is_agency: boolean;
  sort_order: number;
  shift?: string;
  role?: string;
  skill_proficiency?: Record<string, string>;
  constraints?: string;
  best_suited_areas?: Record<string, boolean>;
  notes?: string;
};

type Capabilities = {
  operator_id: string;
  flt: string;
  canning: string;
  mab1: string;
  mab2: string;
  corona: string;
  kegging_inside: string;
  kegging_outside: string;
  keg_loading: string;
  wms: string;
  sap: string;
  say: string;
  packaging: string;
  loaders: string;
  pilots: string;
  sap_vl31n: string;
  sap_vt01n: string;
  sap_vl71: string;
  sap_vl33n: string;
  sap_vl03n: string;
  sap_vt03n: string;
  sap_cor3: string;
  sap_zc30: string;
};

const RATING_OPTIONS = ['N', 'B', 'C', 'S'];

const ROLE_OPTIONS = [
  'General Operator',
  'Supervisor/Multi-op',
  'Distop/Pilot',
  'Kegging Specialist',
  'Loader',
  'Packaging Specialist'
];

const PROFICIENCY_LEVELS = [
  { value: 'not_trained', label: 'Not Trained' },
  { value: 'partial', label: 'Partial Training' },
  { value: 'competent', label: 'Competent' },
  { value: 'expert', label: 'Expert' }
];

const SKILL_AREAS = [
  'kegging_inside',
  'kegging_outside',
  'keg_loading',
  'pilots',
  'loaders',
  'flt',
  'canning',
  'mab1',
  'mab2',
  'corona',
  'packaging',
  'wms',
  'sap',
  'say'
];

const MAIN_WORK_AREAS = [
  { key: 'kegging_inside', label: 'Kegging - Inside' },
  { key: 'kegging_outside', label: 'Kegging - Outside' },
  { key: 'keg_loading', label: 'Keg Loading' },
  { key: 'pilots', label: 'Pilots' },
  { key: 'canning', label: 'Canning' },
  { key: 'mab1', label: 'MAB1' },
  { key: 'mab2', label: 'MAB2' },
  { key: 'corona', label: 'Corona' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'loaders', label: 'Magor/Tents Loading' },
  { key: 'tents', label: 'Tents' }
];

export default function SettingsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddAgencyForm, setShowAddAgencyForm] = useState(false);
  const [showAddOtherShiftForm, setShowAddOtherShiftForm] = useState(false);
  const [newOperator, setNewOperator] = useState({ name: '' });
  const [newAgency, setNewAgency] = useState({ name: '' });
  const [newOtherShift, setNewOtherShift] = useState({ name: '', shift: 'B' });
  const [capabilities, setCapabilities] = useState<Record<string, Capabilities>>({});
  const [editingCapabilities, setEditingCapabilities] = useState<string | null>(null);
  const [editingCapabilitiesData, setEditingCapabilitiesData] = useState<Capabilities | null>(null);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  async function loadOperators() {
    setLoading(true);
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading operators:', error);
    } else {
      setOperators(data || []);
      await loadCapabilities(data || []);
    }
    setLoading(false);
  }

  async function loadCapabilities(ops: Operator[]) {
    const { data } = await supabase
      .from('operator_capabilities')
      .select('*')
      .in('operator_id', ops.map(o => o.id));

    const capsMap: Record<string, Capabilities> = {};
    data?.forEach(cap => {
      capsMap[cap.operator_id] = cap;
    });
    setCapabilities(capsMap);
  }

  async function addOperator() {
    if (!newOperator.name.trim()) return;

    const maxSortOrder = operators.length > 0 ? Math.max(...operators.map(op => op.sort_order || 0)) : 0;

    const { data, error } = await supabase
      .from('operators')
      .insert([{ name: newOperator.name, is_active: true, is_agency: false, sort_order: maxSortOrder + 1 }])
      .select()
      .single();

    if (error) {
      console.error('Error adding operator:', error);
      alert(`Error adding operator: ${error.message}`);
      return;
    }

    await supabase.from('operator_capabilities').insert([{ operator_id: data.id }]);

    setNewOperator({ name: '' });
    setShowAddForm(false);
    loadOperators();
  }

  async function addAgencyStaff() {
    if (!newAgency.name.trim()) return;

    const maxSortOrder = operators.length > 0 ? Math.max(...operators.map(op => op.sort_order || 0)) : 0;

    const { data, error } = await supabase
      .from('operators')
      .insert([{
        name: newAgency.name,
        is_active: true,
        is_agency: true,
        sort_order: maxSortOrder + 1,
        role: 'Agency Worker'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding agency staff:', error);
      alert(`Error adding agency staff: ${error.message}`);
      return;
    }

    await supabase.from('operator_capabilities').insert([{ operator_id: data.id }]);

    setNewAgency({ name: '' });
    setShowAddAgencyForm(false);
    loadOperators();
  }

  async function addOtherShiftOperator() {
    if (!newOtherShift.name.trim() || !newOtherShift.shift) return;

    const maxSortOrder = operators.length > 0 ? Math.max(...operators.map(op => op.sort_order || 0)) : 0;

    const { data, error } = await supabase
      .from('operators')
      .insert([{
        name: newOtherShift.name,
        is_active: true,
        is_agency: false,
        shift: newOtherShift.shift,
        sort_order: maxSortOrder + 1,
        role: 'General Operator'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding other shift operator:', error);
      alert(`Error adding other shift operator: ${error.message}`);
      return;
    }

    await supabase.from('operator_capabilities').insert([{ operator_id: data.id }]);

    setNewOtherShift({ name: '', shift: 'B' });
    setShowAddOtherShiftForm(false);
    loadOperators();
  }

  async function updateOperator(id: string, updates: Partial<Operator>) {
    const { error } = await supabase
      .from('operators')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating operator:', error);
    } else {
      setEditingId(null);
      loadOperators();
    }
  }

  async function deleteOperator(id: string) {
    if (!confirm('Are you sure you want to delete this operator?')) return;

    setOperators(prev => prev.filter(op => op.id !== id));

    const { error } = await supabase
      .from('operators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting operator:', error);
      alert(`Error deleting operator: ${error.message}`);
      loadOperators();
    }
  }

  async function saveCapabilities() {
    if (!editingCapabilities || !editingCapabilitiesData || !editingOperator) return;

    const { error: capError } = await supabase
      .from('operator_capabilities')
      .upsert({ ...editingCapabilitiesData, operator_id: editingCapabilities });

    if (capError) {
      console.error('Error updating capabilities:', capError);
      alert('Error saving skills. Please try again.');
      return;
    }

    const { error: opError } = await supabase
      .from('operators')
      .update({
        shift: editingOperator.shift || null,
        role: editingOperator.role,
        skill_proficiency: editingOperator.skill_proficiency,
        constraints: editingOperator.constraints,
        best_suited_areas: editingOperator.best_suited_areas,
        notes: editingOperator.notes
      })
      .eq('id', editingCapabilities);

    if (opError) {
      console.error('Error updating operator details:', opError);
      alert('Error saving operator details. Please try again.');
      return;
    }

    setEditingCapabilities(null);
    setEditingCapabilitiesData(null);
    setEditingOperator(null);
    loadOperators();
  }

  function startEditingCapabilities(operatorId: string) {
    const operator = operators.find(op => op.id === operatorId);
    if (!operator) return;

    setEditingCapabilities(operatorId);
    setEditingCapabilitiesData({ ...capabilities[operatorId] });
    setEditingOperator({
      ...operator,
      shift: operator.shift,
      skill_proficiency: operator.skill_proficiency || {},
      best_suited_areas: operator.best_suited_areas || {},
      role: operator.role || 'General Operator',
      constraints: operator.constraints || '',
      notes: operator.notes || ''
    });
  }

  function cancelEditingCapabilities() {
    setEditingCapabilities(null);
    setEditingCapabilitiesData(null);
    setEditingOperator(null);
  }

  function resetSkillProficiency() {
    if (!editingOperator) return;
    if (!confirm('Reset all skill proficiency levels to "Not Trained"?')) return;

    const resetProficiency: Record<string, string> = {};
    SKILL_AREAS.forEach(skill => {
      resetProficiency[skill] = 'not_trained';
    });

    setEditingOperator({
      ...editingOperator,
      skill_proficiency: resetProficiency
    });
  }

  function resetLegacySkills() {
    if (!editingCapabilitiesData) return;
    if (!confirm('Reset all legacy skills to "N - None"?')) return;

    const resetSkills = { ...editingCapabilitiesData };
    Object.keys(resetSkills).forEach(key => {
      if (key !== 'operator_id') {
        resetSkills[key as keyof Capabilities] = 'N';
      }
    });

    setEditingCapabilitiesData(resetSkills);
  }

  function updateEditingCapability(skill: string, value: string) {
    if (!editingCapabilitiesData) return;
    setEditingCapabilitiesData({ ...editingCapabilitiesData, [skill]: value });
  }

  async function moveOperator(operatorId: string, direction: 'up' | 'down') {
    const currentIndex = operators.findIndex(op => op.id === operatorId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === operators.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentOp = operators[currentIndex];
    const swapOp = operators[swapIndex];

    await supabase.from('operators').update({ sort_order: swapOp.sort_order }).eq('id', currentOp.id);
    await supabase.from('operators').update({ sort_order: currentOp.sort_order }).eq('id', swapOp.id);

    loadOperators();
  }

  function handleDownloadTemplate() {
    const template = generateOperatorsCSVTemplate();
    downloadCSV('operators-template.csv', template);
  }

  async function handleDownloadOperators() {
    const headers = [
      'Name',
      'FLT',
      'Canning',
      'MAB1',
      'MAB2',
      'Corona',
      'Kegging Inside',
      'Kegging Outside',
      'Keg Loading',
      'WMS',
      'SAP',
      'SAY',
      'Packaging',
      'Loaders',
      'Pilots',
      'SAP VL31N',
      'SAP VT01N',
      'SAP VL71',
      'SAP VL33N',
      'SAP VL03N',
      'SAP VT03N',
      'SAP COR3',
      'SAP ZC30',
      'Role',
      'Constraints',
      'Notes',
      'Skill Proficiency'
    ];

    const rows = operators.map(op => {
      const caps = capabilities[op.id];

      const skillProficiencyJson = op.skill_proficiency && Object.keys(op.skill_proficiency).length > 0
        ? JSON.stringify(op.skill_proficiency)
        : '';

      return [
        op.name,
        caps?.flt || 'N',
        caps?.canning || 'N',
        caps?.mab1 || 'N',
        caps?.mab2 || 'N',
        caps?.corona || 'N',
        caps?.kegging_inside || 'N',
        caps?.kegging_outside || 'N',
        caps?.keg_loading || 'N',
        caps?.wms || 'N',
        caps?.sap || 'N',
        caps?.say || 'N',
        caps?.packaging || 'N',
        caps?.loaders || 'N',
        caps?.pilots || 'N',
        caps?.sap_vl31n || 'N',
        caps?.sap_vt01n || 'N',
        caps?.sap_vl71 || 'N',
        caps?.sap_vl33n || 'N',
        caps?.sap_vl03n || 'N',
        caps?.sap_vt03n || 'N',
        caps?.sap_cor3 || 'N',
        caps?.sap_zc30 || 'N',
        op.role || 'General Operator',
        op.constraints || '',
        op.notes || '',
        skillProficiencyJson ? `"${skillProficiencyJson}"` : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows, ''].join('\n');
    downloadCSV('operators-data.csv', csvContent);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseOperatorsCSV(text);

      const maxSortOrder = operators.length > 0 ? Math.max(...operators.map(op => op.sort_order || 0)) : 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const { data: existingOperator } = await supabase
          .from('operators')
          .select('id, sort_order, skill_proficiency')
          .eq('name', row.name)
          .maybeSingle();

        const operatorData: any = {
          name: row.name,
          is_active: true,
          role: row.role || 'General Operator',
          constraints: row.constraints || '',
          notes: row.notes || '',
          sort_order: existingOperator?.sort_order ?? (maxSortOrder + i + 1)
        };

        if (row.skill_proficiency !== undefined) {
          operatorData.skill_proficiency = row.skill_proficiency;
        } else if (existingOperator?.skill_proficiency) {
          operatorData.skill_proficiency = existingOperator.skill_proficiency;
        } else {
          operatorData.skill_proficiency = {};
        }

        const { data: upsertedOperator, error: opError } = await supabase
          .from('operators')
          .upsert(operatorData, { onConflict: 'name' })
          .select()
          .single();

        if (opError) {
          console.error(`Error upserting operator ${row.name}:`, opError);
          continue;
        }

        await supabase
          .from('operator_capabilities')
          .upsert({
            operator_id: upsertedOperator.id,
            flt: row.flt,
            canning: row.canning,
            mab1: row.mab1,
            mab2: row.mab2,
            corona: row.corona,
            kegging_inside: row.kegging_inside,
            kegging_outside: row.kegging_outside,
            keg_loading: row.keg_loading,
            wms: row.wms,
            sap: row.sap,
            say: row.say,
            packaging: row.packaging,
            loaders: row.loaders,
            pilots: row.pilots,
            sap_vl31n: row.sap_vl31n,
            sap_vt01n: row.sap_vt01n,
            sap_vl71: row.sap_vl71,
            sap_vl33n: row.sap_vl33n,
            sap_vl03n: row.sap_vl03n,
            sap_vt03n: row.sap_vt03n,
            sap_cor3: row.sap_cor3,
            sap_zc30: row.sap_zc30
          });
      }

      alert(`Successfully imported ${rows.length} operators`);
      loadOperators();
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

  if (loading) {
    return <div>Loading settings...</div>;
  }

  const regularOperators = operators.filter(op => !op.is_agency && (!op.shift || op.shift === 'A'));
  const otherShiftOperators = operators.filter(op => !op.is_agency && op.shift && op.shift !== 'A');
  const agencyStaff = operators.filter(op => op.is_agency);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Settings</h3>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h4 style={{ margin: 0 }}>Regular Operators</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={handleDownloadTemplate}>
              Download CSV Template
            </button>
            <button
              className="btn-secondary"
              onClick={handleDownloadOperators}
              disabled={operators.length === 0}
            >
              Download Operators CSV
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
            <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Operator'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <div style={{ background: 'white', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #ddd' }}>
            <h4 style={{ marginTop: 0 }}>New Operator</h4>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Name</label>
                <input
                  value={newOperator.name}
                  onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                  placeholder="Enter operator name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addOperator();
                    }
                  }}
                />
              </div>
              <button className="btn-primary" onClick={addOperator}>Add</button>
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Order</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {regularOperators.map((op, index) => (
              <Fragment key={op.id}>
                <tr>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => moveOperator(op.id, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.5 : 1
                        }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveOperator(op.id, 'down')}
                        disabled={index === regularOperators.length - 1}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          cursor: index === regularOperators.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === regularOperators.length - 1 ? 0.5 : 1
                        }}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    {editingId === op.id ? (
                      <input
                        defaultValue={op.name}
                        onBlur={(e) => updateOperator(op.id, { name: e.target.value })}
                      />
                    ) : (
                      op.name
                    )}
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={op.is_active}
                        onChange={(e) => updateOperator(op.id, { is_active: e.target.checked })}
                      />
                      {op.is_active ? 'Active' : 'Inactive'}
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => editingCapabilities === op.id ? cancelEditingCapabilities() : startEditingCapabilities(op.id)}
                      >
                        {editingCapabilities === op.id ? 'Cancel' : 'Edit Skills'}
                      </button>
                      <button className="btn-danger" onClick={() => deleteOperator(op.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                {editingCapabilities === op.id && editingCapabilitiesData && editingOperator && (
                  <tr>
                    <td colSpan={4} style={{ padding: 16, background: '#f9f9f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0 }}>Profile & Skills for {op.name}</h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-secondary" onClick={cancelEditingCapabilities}>
                            Cancel
                          </button>
                          <button className="btn-primary" onClick={saveCapabilities}>
                            Save Changes
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 24, background: '#f0f9ff', padding: 16, borderRadius: 8, border: '2px solid #0ea5e9' }}>
                        <h5 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#0369a1' }}>
                          Quick Setup - Where Can They Work?
                        </h5>
                        <p style={{ fontSize: 12, color: '#0c4a6e', marginBottom: 12 }}>
                          Tick the areas where this operator can work. This gives them priority in allocation until you set up detailed SKAP data.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                          {MAIN_WORK_AREAS.map(area => (
                            <label key={area.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, background: 'white', borderRadius: 4, border: '1px solid #e0e7ff' }}>
                              <input
                                type="checkbox"
                                checked={editingOperator.best_suited_areas?.[area.key] || false}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  best_suited_areas: { ...editingOperator.best_suited_areas, [area.key]: e.target.checked }
                                })}
                                style={{ width: 16, height: 16 }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{area.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <h5 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Role & Details</h5>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Primary Role</label>
                          <select
                            value={editingOperator.role}
                            onChange={(e) => setEditingOperator({ ...editingOperator, role: e.target.value })}
                            style={{ width: '100%' }}
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Constraints / Special Notes</label>
                          <textarea
                            value={editingOperator.constraints}
                            onChange={(e) => setEditingOperator({ ...editingOperator, constraints: e.target.value })}
                            placeholder="e.g., Vision issues at night - FLT limitation, Should rotate as pilot on nights"
                            rows={2}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Additional Notes</label>
                          <textarea
                            value={editingOperator.notes}
                            onChange={(e) => setEditingOperator({ ...editingOperator, notes: e.target.value })}
                            placeholder="e.g., Upskilling needed in kegging, Strong on Bot line, Go-to for Corona line"
                            rows={3}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Skill Proficiency Levels</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetSkillProficiency}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                          {SKILL_AREAS.map(skill => (
                            <div key={skill}>
                              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                {skill.replace(/_/g, ' ')}
                              </label>
                              <select
                                value={editingOperator.skill_proficiency?.[skill] || 'not_trained'}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  skill_proficiency: { ...editingOperator.skill_proficiency, [skill]: e.target.value }
                                })}
                                style={{ width: '100%' }}
                              >
                                {PROFICIENCY_LEVELS.map(level => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>


                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Legacy Skills (N/B/C/S System)</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetLegacySkills}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>These are maintained for compatibility with existing systems</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          {Object.keys(editingCapabilitiesData)
                            .filter(key => key !== 'operator_id' && key !== 'updated_at')
                            .map(skill => (
                              <div key={skill}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                  {skill.replace(/_/g, ' ')}
                                </label>
                                <select
                                  value={editingCapabilitiesData[skill as keyof Capabilities]}
                                  onChange={(e) => updateEditingCapability(skill, e.target.value)}
                                >
                                  {RATING_OPTIONS.map(rating => (
                                    <option key={rating} value={rating}>
                                      {rating} - {rating === 'N' ? 'None' : rating === 'B' ? 'Basic' : rating === 'C' ? 'Competent' : 'Specialist'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {regularOperators.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
            No operators added yet. Click "Add Operator" to get started.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0 }}>Other Shift Operators (Overtime)</h4>
            <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0 0' }}>
              Operators from shifts B, C, and D doing overtime on your shift
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddOtherShiftForm(!showAddOtherShiftForm)}>
            {showAddOtherShiftForm ? 'Cancel' : 'Add Other Shift Operator'}
          </button>
        </div>

        {showAddOtherShiftForm && (
          <div style={{ background: 'white', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #ddd' }}>
            <h4 style={{ marginTop: 0 }}>New Other Shift Operator</h4>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 150px auto', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Name</label>
                <input
                  value={newOtherShift.name}
                  onChange={(e) => setNewOtherShift({ ...newOtherShift, name: e.target.value })}
                  placeholder="Enter operator name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addOtherShiftOperator();
                    }
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Their Shift</label>
                <select
                  value={newOtherShift.shift}
                  onChange={(e) => setNewOtherShift({ ...newOtherShift, shift: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                  <option value="D">Shift D</option>
                </select>
              </div>
              <button className="btn-primary" onClick={addOtherShiftOperator}>Add</button>
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {otherShiftOperators.map((op) => (
              <Fragment key={op.id}>
                <tr>
                  <td>
                    {editingId === op.id ? (
                      <input
                        defaultValue={op.name}
                        onBlur={(e) => updateOperator(op.id, { name: e.target.value })}
                      />
                    ) : (
                      op.name
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11,
                      background: op.shift === 'B' ? '#ddd6fe' : op.shift === 'C' ? '#fecaca' : '#bfdbfe',
                      color: op.shift === 'B' ? '#5b21b6' : op.shift === 'C' ? '#991b1b' : '#1e3a8a',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      SHIFT {op.shift}
                    </span>
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={op.is_active}
                        onChange={(e) => updateOperator(op.id, { is_active: e.target.checked })}
                      />
                      {op.is_active ? 'Active' : 'Inactive'}
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => editingCapabilities === op.id ? cancelEditingCapabilities() : startEditingCapabilities(op.id)}
                      >
                        {editingCapabilities === op.id ? 'Cancel' : 'Edit Skills'}
                      </button>
                      <button className="btn-danger" onClick={() => deleteOperator(op.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                {editingCapabilities === op.id && editingCapabilitiesData && editingOperator && (
                  <tr>
                    <td colSpan={4} style={{ padding: 16, background: '#f9f9f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0 }}>Profile & Skills for {op.name}</h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-secondary" onClick={cancelEditingCapabilities}>
                            Cancel
                          </button>
                          <button className="btn-primary" onClick={saveCapabilities}>
                            Save Changes
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 24, background: '#f0f9ff', padding: 16, borderRadius: 8, border: '2px solid #0ea5e9' }}>
                        <h5 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#0369a1' }}>
                          Quick Setup - Where Can They Work?
                        </h5>
                        <p style={{ fontSize: 12, color: '#0c4a6e', marginBottom: 12 }}>
                          Tick the areas where this operator can work. This gives them priority in allocation until you set up detailed SKAP data.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                          {MAIN_WORK_AREAS.map(area => (
                            <label key={area.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, background: 'white', borderRadius: 4, border: '1px solid #e0e7ff' }}>
                              <input
                                type="checkbox"
                                checked={editingOperator.best_suited_areas?.[area.key] || false}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  best_suited_areas: { ...editingOperator.best_suited_areas, [area.key]: e.target.checked }
                                })}
                                style={{ width: 16, height: 16 }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{area.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <h5 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Role & Details</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Primary Role</label>
                            <select
                              value={editingOperator.role}
                              onChange={(e) => setEditingOperator({ ...editingOperator, role: e.target.value })}
                              style={{ width: '100%' }}
                            >
                              {ROLE_OPTIONS.map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>
                              Their Regular Shift
                            </label>
                            <select
                              value={editingOperator.shift || 'B'}
                              onChange={(e) => setEditingOperator({ ...editingOperator, shift: e.target.value })}
                              style={{ width: '100%' }}
                            >
                              <option value="B">Shift B</option>
                              <option value="C">Shift C</option>
                              <option value="D">Shift D</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Constraints / Special Notes</label>
                          <textarea
                            value={editingOperator.constraints}
                            onChange={(e) => setEditingOperator({ ...editingOperator, constraints: e.target.value })}
                            placeholder="e.g., Vision issues at night - FLT limitation, Should rotate as pilot on nights"
                            rows={2}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Additional Notes</label>
                          <textarea
                            value={editingOperator.notes}
                            onChange={(e) => setEditingOperator({ ...editingOperator, notes: e.target.value })}
                            placeholder="e.g., Upskilling needed in kegging, Strong on Bot line, Go-to for Corona line"
                            rows={3}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Skill Proficiency Levels</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetSkillProficiency}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                          {SKILL_AREAS.map(skill => (
                            <div key={skill}>
                              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                {skill.replace(/_/g, ' ')}
                              </label>
                              <select
                                value={editingOperator.skill_proficiency?.[skill] || 'not_trained'}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  skill_proficiency: { ...editingOperator.skill_proficiency, [skill]: e.target.value }
                                })}
                                style={{ width: '100%' }}
                              >
                                {PROFICIENCY_LEVELS.map(level => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>


                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Legacy Skills (N/B/C/S System)</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetLegacySkills}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>These are maintained for compatibility with existing systems</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          {Object.keys(editingCapabilitiesData)
                            .filter(key => key !== 'operator_id' && key !== 'updated_at')
                            .map(skill => (
                              <div key={skill}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                  {skill.replace(/_/g, ' ')}
                                </label>
                                <select
                                  value={editingCapabilitiesData[skill as keyof Capabilities]}
                                  onChange={(e) => updateEditingCapability(skill, e.target.value)}
                                >
                                  {RATING_OPTIONS.map(rating => (
                                    <option key={rating} value={rating}>
                                      {rating} - {rating === 'N' ? 'None' : rating === 'B' ? 'Basic' : rating === 'C' ? 'Competent' : 'Specialist'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {otherShiftOperators.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
            No other shift operators added yet. Click "Add Other Shift Operator" to get started.
          </div>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0 }}>Agency Staff</h4>
            <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0 0' }}>
              Agency staff don't follow shift patterns and can work any shift
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddAgencyForm(!showAddAgencyForm)}>
            {showAddAgencyForm ? 'Cancel' : 'Add Agency Staff'}
          </button>
        </div>

        {showAddAgencyForm && (
          <div style={{ background: 'white', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #ddd' }}>
            <h4 style={{ marginTop: 0 }}>New Agency Staff</h4>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Name</label>
                <input
                  value={newAgency.name}
                  onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                  placeholder="Enter agency staff name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addAgencyStaff();
                    }
                  }}
                />
              </div>
              <button className="btn-primary" onClick={addAgencyStaff}>Add</button>
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agencyStaff.map((op) => (
              <Fragment key={op.id}>
                <tr>
                  <td>
                    {editingId === op.id ? (
                      <input
                        defaultValue={op.name}
                        onBlur={(e) => updateOperator(op.id, { name: e.target.value })}
                      />
                    ) : (
                      <div>
                        {op.name}
                        <span style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontWeight: 600
                        }}>
                          AGENCY
                        </span>
                      </div>
                    )}
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={op.is_active}
                        onChange={(e) => updateOperator(op.id, { is_active: e.target.checked })}
                      />
                      {op.is_active ? 'Active' : 'Inactive'}
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => editingCapabilities === op.id ? cancelEditingCapabilities() : startEditingCapabilities(op.id)}
                      >
                        {editingCapabilities === op.id ? 'Cancel' : 'Edit Skills'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => updateOperator(op.id, { is_agency: false })}
                        style={{ fontSize: 12 }}
                      >
                        Convert to Regular
                      </button>
                      <button className="btn-danger" onClick={() => deleteOperator(op.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                {editingCapabilities === op.id && editingCapabilitiesData && editingOperator && (
                  <tr>
                    <td colSpan={3} style={{ padding: 16, background: '#f9f9f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0 }}>Profile & Skills for {op.name}</h4>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-secondary" onClick={cancelEditingCapabilities}>
                            Cancel
                          </button>
                          <button className="btn-primary" onClick={saveCapabilities}>
                            Save Changes
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 24, background: '#f0f9ff', padding: 16, borderRadius: 8, border: '2px solid #0ea5e9' }}>
                        <h5 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#0369a1' }}>
                          Quick Setup - Where Can They Work?
                        </h5>
                        <p style={{ fontSize: 12, color: '#0c4a6e', marginBottom: 12 }}>
                          Tick the areas where this operator can work. This gives them priority in allocation until you set up detailed SKAP data.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                          {MAIN_WORK_AREAS.map(area => (
                            <label key={area.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 8, background: 'white', borderRadius: 4, border: '1px solid #e0e7ff' }}>
                              <input
                                type="checkbox"
                                checked={editingOperator.best_suited_areas?.[area.key] || false}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  best_suited_areas: { ...editingOperator.best_suited_areas, [area.key]: e.target.checked }
                                })}
                                style={{ width: 16, height: 16 }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{area.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <h5 style={{ marginTop: 0, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Role & Details</h5>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Primary Role</label>
                          <select
                            value={editingOperator.role}
                            onChange={(e) => setEditingOperator({ ...editingOperator, role: e.target.value })}
                            style={{ width: '100%' }}
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Constraints / Special Notes</label>
                          <textarea
                            value={editingOperator.constraints}
                            onChange={(e) => setEditingOperator({ ...editingOperator, constraints: e.target.value })}
                            placeholder="e.g., Vision issues at night - FLT limitation, Should rotate as pilot on nights"
                            rows={2}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500 }}>Additional Notes</label>
                          <textarea
                            value={editingOperator.notes}
                            onChange={(e) => setEditingOperator({ ...editingOperator, notes: e.target.value })}
                            placeholder="e.g., Upskilling needed in kegging, Strong on Bot line, Go-to for Corona line"
                            rows={3}
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Skill Proficiency Levels</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetSkillProficiency}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                          {SKILL_AREAS.map(skill => (
                            <div key={skill}>
                              <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                {skill.replace(/_/g, ' ')}
                              </label>
                              <select
                                value={editingOperator.skill_proficiency?.[skill] || 'not_trained'}
                                onChange={(e) => setEditingOperator({
                                  ...editingOperator,
                                  skill_proficiency: { ...editingOperator.skill_proficiency, [skill]: e.target.value }
                                })}
                                style={{ width: '100%' }}
                              >
                                {PROFICIENCY_LEVELS.map(level => (
                                  <option key={level.value} value={level.value}>{level.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>


                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Legacy Skills (N/B/C/S System)</h5>
                          <button
                            className="btn-secondary"
                            onClick={resetLegacySkills}
                            style={{ padding: '4px 12px', fontSize: 12 }}
                          >
                            Reset All
                          </button>
                        </div>
                        <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>These are maintained for compatibility with existing systems</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                          {Object.keys(editingCapabilitiesData)
                            .filter(key => key !== 'operator_id' && key !== 'updated_at')
                            .map(skill => (
                              <div key={skill}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
                                  {skill.replace(/_/g, ' ')}
                                </label>
                                <select
                                  value={editingCapabilitiesData[skill as keyof Capabilities]}
                                  onChange={(e) => updateEditingCapability(skill, e.target.value)}
                                >
                                  {RATING_OPTIONS.map(rating => (
                                    <option key={rating} value={rating}>
                                      {rating} - {rating === 'N' ? 'None' : rating === 'B' ? 'Basic' : rating === 'C' ? 'Competent' : 'Specialist'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        {agencyStaff.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
            No agency staff added yet. Click "Add Agency Staff" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
