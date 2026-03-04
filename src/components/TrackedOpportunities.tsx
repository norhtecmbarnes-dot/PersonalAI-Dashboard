'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrackedOpportunity {
  id: string;
  title: string;
  synopsis: string;
  solicitation_number: string;
  opportunity_type: string;
  posted_date: string;
  updated_date: string;
  response_deadline: string;
  award_amount: string;
  naics_code: string;
  classification_code: string;
  agency: string;
  office: string;
  location: string;
  url: string;
  status: string;
  pipeline_stage: string;
  award_date: string;
  notes: string;
  tags: string[];
  user_priority: string;
  created_at: number;
  updated_at: number;
}

interface OpportunityDocument {
  id: string;
  opportunity_id: string;
  filename: string;
  original_name: string;
  type: string;
  size: number;
  uploaded_at: number;
}

const emptyForm = {
  title: '',
  solicitationNumber: '',
  type: 'Solicitation',
  agency: '',
  office: '',
  postedDate: '',
  updatedDate: '',
  responseDeadline: '',
  awardAmount: '',
  naicsCode: '',
  location: '',
  synopsis: '',
  url: '',
  notes: '',
  tags: '',
  priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  pipelineStage: 'interested' as 'interested' | 'pursuing' | 'bidding' | 'submitted' | 'won' | 'lost',
};

const PIPELINE_STAGES: { value: string; label: string; color: string }[] = [
  { value: 'interested', label: 'Interested', color: 'bg-gray-500' },
  { value: 'pursuing', label: 'Pursuing', color: 'bg-blue-500' },
  { value: 'bidding', label: 'Bidding', color: 'bg-yellow-500' },
  { value: 'submitted', label: 'Submitted', color: 'bg-orange-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-600 text-gray-200',
  medium: 'bg-blue-600 text-blue-100',
  high: 'bg-orange-600 text-orange-100',
  critical: 'bg-red-600 text-red-100',
};

export function TrackedOpportunities() {
  const [opportunities, setOpportunities] = useState<TrackedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPipeline, setFilterPipeline] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<TrackedOpportunity | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [stats, setStats] = useState<Record<string, number>>({});
  const [documents, setDocuments] = useState<OpportunityDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadOpportunities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPipeline !== 'all') params.set('pipelineStage', filterPipeline);
      
      const [oppRes, statsRes] = await Promise.all([
        fetch(`/api/sam/track?${params.toString()}`),
        fetch('/api/sam/track?stats=true'),
      ]);
      
      const oppData = await oppRes.json();
      const statsData = await statsRes.json();
      
      setOpportunities(oppData.opportunities || []);
      setStats(statsData.stats || {});
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPipeline]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const loadDocuments = async (opportunityId: string) => {
    try {
      const res = await fetch(`/api/sam/track?documents=true&id=${opportunityId}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getDeadlineColor = (deadline: string, status: string) => {
    if (status !== 'active') return 'text-gray-400';
    const days = getDaysUntilDeadline(deadline);
    if (days === null) return 'text-gray-400';
    if (days < 0) return 'text-red-400';
    if (days <= 3) return 'text-orange-400';
    if (days <= 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      
      if (editingId) {
        await fetch('/api/sam/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: editingId, ...payload }),
        });
      } else {
        await fetch('/api/sam/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      loadOpportunities();
    } catch (error) {
      console.error('Error saving opportunity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tracked opportunity?')) return;
    try {
      await fetch('/api/sam/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
      loadOpportunities();
      setSelectedOpp(null);
    } catch (error) {
      console.error('Error deleting opportunity:', error);
    }
  };

  const handleEdit = (opp: TrackedOpportunity) => {
    setForm({
      title: opp.title, solicitationNumber: opp.solicitation_number, type: opp.opportunity_type || 'Solicitation',
      agency: opp.agency || '', office: opp.office || '', postedDate: opp.posted_date || '',
      updatedDate: opp.updated_date || '', responseDeadline: opp.response_deadline || '',
      awardAmount: opp.award_amount || '', naicsCode: opp.naics_code || '', location: opp.location || '',
      synopsis: opp.synopsis || '', url: opp.url || '', notes: opp.notes || '',
      tags: opp.tags?.join(', ') || '', priority: (opp.user_priority as any) || 'medium',
      pipelineStage: (opp.pipeline_stage as any) || 'interested',
    });
    setEditingId(opp.id);
    setShowForm(true);
  };

  const handlePipelineChange = async (id: string, stage: string) => {
    try {
      await fetch('/api/sam/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, pipelineStage: stage }),
      });
      loadOpportunities();
      if (selectedOpp && selectedOpp.id === id) {
        setSelectedOpp({ ...selectedOpp, pipeline_stage: stage });
      }
    } catch (error) {
      console.error('Error updating pipeline:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOpp || !e.target.files?.length) return;
    
    setUploadingDoc(true);
    const file = e.target.files[0];
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        
        await fetch('/api/sam/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addDocument',
            id: selectedOpp.id,
            filename: file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
            originalName: file.name,
            content: content,
            type: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });
        
        loadDocuments(selectedOpp.id);
        setUploadingDoc(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadingDoc(false);
    }
    e.target.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch('/api/sam/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteDocument', documentId: docId }),
      });
      loadDocuments(selectedOpp!.id);
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleSelectOpp = async (opp: TrackedOpportunity) => {
    setSelectedOpp(opp);
    await loadDocuments(opp.id);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getOppsByPipeline = (stage: string) => opportunities.filter(opp => opp.pipeline_stage === stage);

  if (loading) return <div className="text-gray-400 p-8">Loading opportunities...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.value} className={`${stage.color} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-bold text-white">{stats[stage.value] || 0}</div>
            <div className="text-xs text-white/80">{stage.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 items-center">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="awarded">Awarded</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filterPipeline} onChange={(e) => setFilterPipeline(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white">
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white">
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex bg-gray-800 rounded-lg p-1 ml-2">
            <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 rounded text-sm ${viewMode === 'kanban' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Kanban</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>List</button>
          </div>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium">+ Add Opportunity</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Opportunity' : 'Add Opportunity'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Solicitation # *</label><input type="text" value={form.solicitationNumber} onChange={(e) => setForm({ ...form, solicitationNumber: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" required /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"><option>Solicitation</option><option>Presolicitation</option><option>Combined Synopsis/Solicitation</option><option>Sources Sought</option><option>RFI</option><option>RFQ</option><option>Amendment</option><option>Award Notice</option></select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Agency</label><input type="text" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Office</label><input type="text" value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Posted Date</label><input type="date" value={form.postedDate} onChange={(e) => setForm({ ...form, postedDate: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Due Date</label><input type="datetime-local" value={form.responseDeadline} onChange={(e) => setForm({ ...form, responseDeadline: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Award Amount</label><input type="text" value={form.awardAmount} onChange={(e) => setForm({ ...form, awardAmount: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" placeholder="$500M" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">NAICS Code</label><input type="text" value={form.naicsCode} onChange={(e) => setForm({ ...form, naicsCode: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                <div><label className="block text-sm text-gray-400 mb-1">Pipeline Stage</label><select value={form.pipelineStage} onChange={(e) => setForm({ ...form, pipelineStage: e.target.value as any })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white">{PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">URL</label><input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" placeholder="https://sam.gov/opp/..." /></div>
                <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">Synopsis</label><textarea value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[80px]" /></div>
                <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label><input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" placeholder="IDIQ, MAC, AFRL" /></div>
                <div className="col-span-2"><label className="block text-sm text-gray-400 mb-1">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white min-h-[60px]" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium">{editingId ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-6 gap-4 overflow-x-auto">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage.value} className="min-w-[280px]">
              <div className={`${stage.color} rounded-t-lg px-3 py-2`}>
                <h3 className="text-white font-medium text-sm">{stage.label}</h3>
                <span className="text-white/70 text-xs">{getOppsByPipeline(stage.value).length}</span>
              </div>
              <div className="bg-gray-800/50 rounded-b-lg p-2 min-h-[200px] space-y-2">
                {getOppsByPipeline(stage.value).filter(opp => filterPriority === 'all' || opp.user_priority === filterPriority).map(opp => {
                  const days = getDaysUntilDeadline(opp.response_deadline);
                  return (
                    <div key={opp.id} className="bg-gray-800 rounded p-3 cursor-pointer hover:bg-gray-750 border-l-2 border-gray-600" onClick={() => handleSelectOpp(opp)}>
                      <div className="text-white text-sm font-medium truncate">{opp.title}</div>
                      <div className="text-gray-400 text-xs mt-1">{opp.solicitation_number}</div>
                      <div className="flex gap-1 mt-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[opp.user_priority] || 'bg-gray-600'}`}>{opp.user_priority}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{formatDate(opp.response_deadline) || 'No deadline'}</span>
                      </div>
                      {opp.award_amount && <div className="text-green-400 text-xs mt-1">{opp.award_amount}</div>}
                    </div>
                  );
                })}
                {getOppsByPipeline(stage.value).length === 0 && <div className="text-gray-500 text-sm text-center py-4">No opportunities</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.filter(opp => filterPriority === 'all' || opp.user_priority === filterPriority).map(opp => {
            const days = getDaysUntilDeadline(opp.response_deadline);
            const stageInfo = PIPELINE_STAGES.find(s => s.value === opp.pipeline_stage);
            return (
              <div key={opp.id} className={`bg-gray-800 rounded-lg p-4 border-l-4 ${opp.pipeline_stage === 'won' ? 'border-green-500' : opp.pipeline_stage === 'lost' ? 'border-red-500' : 'border-purple-500'} cursor-pointer`} onClick={() => handleSelectOpp(opp)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{opp.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[opp.user_priority] || 'bg-gray-600'}`}>{opp.user_priority}</span>
                      {stageInfo && <span className={`text-xs px-2 py-0.5 rounded text-white ${stageInfo.color}`}>{stageInfo.label}</span>}
                    </div>
                    <p className="text-gray-400 text-sm">{opp.agency} | {opp.solicitation_number}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-500">Posted: {formatDate(opp.posted_date)}</span>
                      <span className={getDeadlineColor(opp.response_deadline, opp.status)}>Due: {formatDate(opp.response_deadline)}{days !== null && opp.status === 'active' && <span className="ml-1">({days > 0 ? days : 0}d)</span>}</span>
                      {opp.award_amount && <span className="text-green-400">{opp.award_amount}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOpp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedOpp.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{selectedOpp.solicitation_number}</p>
              </div>
              <button onClick={() => setSelectedOpp(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div className="grid grid-cols-6 gap-2 mb-4">
              {PIPELINE_STAGES.map(stage => (
                <button key={stage.value} onClick={() => handlePipelineChange(selectedOpp.id, stage.value)} className={`p-2 rounded text-center text-xs font-medium ${selectedOpp.pipeline_stage === stage.value ? `${stage.color} text-white` : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>{stage.label}</button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Type</div><div className="text-white">{selectedOpp.opportunity_type || 'Solicitation'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Status</div><div className="text-white capitalize">{selectedOpp.status?.replace('_', ' ') || 'Active'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Agency</div><div className="text-white">{selectedOpp.agency || '-'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Office</div><div className="text-white">{selectedOpp.office || '-'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Posted</div><div className="text-white">{formatDate(selectedOpp.posted_date) || '-'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Due</div><div className={`text-white ${getDeadlineColor(selectedOpp.response_deadline, selectedOpp.status)}`}>{formatDate(selectedOpp.response_deadline) || '-'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">NAICS</div><div className="text-white">{selectedOpp.naics_code || '-'}</div></div>
              <div className="bg-gray-900 p-3 rounded"><div className="text-xs text-gray-500 uppercase">Award</div><div className="text-white">{selectedOpp.award_amount || '-'}</div></div>
            </div>
            
            {selectedOpp.synopsis && <div className="bg-gray-900 p-3 rounded mb-4"><div className="text-xs text-gray-500 uppercase mb-2">Synopsis</div><div className="text-gray-300 whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">{selectedOpp.synopsis}</div></div>}
            
            {selectedOpp.notes && <div className="bg-gray-900 p-3 rounded mb-4"><div className="text-xs text-gray-500 uppercase mb-2">Notes</div><div className="text-gray-300">{selectedOpp.notes}</div></div>}
            
            <div className="bg-gray-900 p-3 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-500 uppercase">Documents</div>
                <label className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded cursor-pointer">
                  Upload
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingDoc} />
                </label>
              </div>
              {documents.length === 0 ? (
                <div className="text-gray-500 text-sm">No documents uploaded</div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex justify-between items-center bg-gray-800 p-2 rounded">
                      <div>
                        <div className="text-white text-sm">{doc.original_name}</div>
                        <div className="text-gray-500 text-xs">{formatFileSize(doc.size)} | {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              {selectedOpp.url && <a href={selectedOpp.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">View on SAM.gov</a>}
              <div className="flex gap-2">
                <button onClick={() => { handleEdit(selectedOpp); setSelectedOpp(null); }} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">Edit</button>
                <button onClick={() => handleDelete(selectedOpp.id)} className="px-3 py-1 bg-red-900 hover:bg-red-800 text-red-300 rounded text-sm">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}