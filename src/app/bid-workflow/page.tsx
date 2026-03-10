'use client';

import { useState, useEffect } from 'react';
import type { Brand, Project } from '@/types/brand-workspace';
import type { BidWorkflow, CaptureDocument, ComplianceMatrix } from '@/types/brand-workspace';

interface WorkflowWithProject {
  project: Project;
  workflow: BidWorkflow;
  capture?: CaptureDocument | null;
  compliance?: ComplianceMatrix | null;
}

interface NewBidData {
  projectName: string;
  description: string;
  agency: string;
  solicitationNumber: string;
  responseDeadline: string;
  awardAmount: string;
}

export default function BidWorkflowPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowWithProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewBidModal, setShowNewBidModal] = useState(false);
  const [newBidData, setNewBidData] = useState<NewBidData>({
    projectName: '',
    description: '',
    agency: '',
    solicitationNumber: '',
    responseDeadline: '',
    awardAmount: '',
  });
  const [creating, setCreating] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithProject | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadWorkflows(selectedBrandId);
    } else {
      setWorkflows([]);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace/brands');
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (err) {
      console.error('Error loading brands:', err);
      setError('Failed to load brands');
    }
  };

  const loadWorkflows = async (brandId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bid-workflow?action=list&brandId=${brandId}`);
      const data = await response.json();
      if (data.workflows) {
        const enriched = await Promise.all(
          data.workflows.map(async (item: { project: Project; workflow: BidWorkflow }) => {
            const capture = await fetchCapture(item.project.id);
            const compliance = await fetchCompliance(item.project.id);
            return { ...item, capture, compliance };
          })
        );
        setWorkflows(enriched);
      } else {
        setWorkflows([]);
      }
    } catch (err) {
      console.error('Error loading workflows:', err);
      setError('Failed to load bid workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchCapture = async (projectId: string): Promise<CaptureDocument | null> => {
    if (!projectId) return null;
    try {
      const response = await fetch(`/api/bid-workflow?action=capture&projectId=${projectId}`);
      const data = await response.json();
      return data.captureDocument || null;
    } catch {
      return null;
    }
  };

  const fetchCompliance = async (projectId: string): Promise<ComplianceMatrix | null> => {
    if (!projectId) return null;
    try {
      const response = await fetch(`/api/bid-workflow?action=compliance&projectId=${projectId}`);
      const data = await response.json();
      return data.complianceMatrix || null;
    } catch {
      return null;
    }
  };

  const handleStartBid = () => {
    if (!selectedBrandId) {
      setError('Please select a brand first');
      return;
    }
    setShowNewBidModal(true);
  };

  const handleCreateBid = async () => {
    if (!selectedBrandId) {
      setError('Please select a brand first');
      return;
    }
    if (!newBidData.projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          brandId: selectedBrandId,
          opportunityId: `manual_${Date.now()}`,
          opportunityData: {
            title: newBidData.projectName,
            synopsis: newBidData.description,
            agency: newBidData.agency,
            solicitation_number: newBidData.solicitationNumber,
            response_deadline: newBidData.responseDeadline,
            award_amount: newBidData.awardAmount,
          },
          projectName: newBidData.projectName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowNewBidModal(false);
        setNewBidData({
          projectName: '',
          description: '',
          agency: '',
          solicitationNumber: '',
          responseDeadline: '',
          awardAmount: '',
        });
        await loadWorkflows(selectedBrandId);
      } else {
        setError(data.error || 'Failed to create bid');
      }
    } catch (err) {
      console.error('Error creating bid:', err);
      setError('Failed to create bid');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateCapture = async (projectId: string) => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const brandDocsResponse = await fetch(`/api/brand-workspace/documents?brandId=${selectedBrandId}`);
      const docsData = await brandDocsResponse.json();
      const documents = docsData.documents || [];
      
      if (documents.length === 0) {
        setError('No documents found. Please upload RFP documents to the brand workspace first.');
        return;
      }

      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'capture',
          projectId,
          documents,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadWorkflows(selectedBrandId);
      } else {
        setError(data.error || 'Failed to generate capture document');
      }
    } catch (err) {
      console.error('Error generating capture:', err);
      setError('Failed to generate capture document');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCompliance = async (projectId: string) => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const brandDocsResponse = await fetch(`/api/brand-workspace/documents?brandId=${selectedBrandId}`);
      const docsData = await brandDocsResponse.json();
      const documents = docsData.documents || [];
      
      if (documents.length === 0) {
        setError('No documents found. Please upload RFP documents to the brand workspace first.');
        return;
      }

      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compliance',
          projectId,
          documents,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadWorkflows(selectedBrandId);
      } else {
        setError(data.error || 'Failed to generate compliance matrix');
      }
    } catch (err) {
      console.error('Error generating compliance:', err);
      setError('Failed to generate compliance matrix');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOutline = async (projectId: string) => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const workflowsResponse = await fetch(`/api/bid-workflow?action=list&brandId=${selectedBrandId}`);
      const workflowsData = await workflowsResponse.json();
      const currentWorkflow = workflowsData.workflows?.find(
        (w: { project: Project; workflow: BidWorkflow }) => w.project.id === projectId
      );

      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          projectId,
          captureDocumentId: currentWorkflow?.workflow?.captureDocumentId,
          complianceMatrixId: currentWorkflow?.workflow?.complianceMatrixId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Outline generated! Check your browser console for the output.');
        console.log('Generated Outline:', data.outline);
      } else {
        setError(data.error || 'Failed to generate outline');
      }
    } catch (err) {
      console.error('Error generating outline:', err);
      setError('Failed to generate outline');
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'capture': return 'bg-blue-500';
      case 'compliance': return 'bg-yellow-500';
      case 'outline': return 'bg-purple-500';
      case 'writing': return 'bg-green-500';
      case 'review': return 'bg-orange-500';
      case 'submitted': return 'bg-teal-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-slate-500';
    }
  };

  const handleUpdateStage = async (projectId: string, newStage: BidWorkflow['stage']) => {
    if (!selectedBrandId) return;
    setStageUpdating(true);
    try {
      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          projectId,
          stage: newStage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowStageModal(false);
        setSelectedWorkflow(null);
        await loadWorkflows(selectedBrandId);
      } else {
        setError(data.error || 'Failed to update stage');
      }
    } catch (err) {
      console.error('Error updating stage:', err);
      setError('Failed to update stage');
    } finally {
      setStageUpdating(false);
    }
  };

  const stages: BidWorkflow['stage'][] = ['capture', 'compliance', 'outline', 'writing', 'review', 'submitted', 'archived'];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Bid Workflow Management</h1>
            <p className="text-gray-400 mt-1">Manage government bid workflows and proposals</p>
          </div>
          <button
            onClick={handleStartBid}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
          >
            Start New Bid
          </button>
        </div>

        {/* Brand Selection */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Select Brand</h2>
          <select
            value={selectedBrandId || ''}
            onChange={(e) => setSelectedBrandId(e.target.value || null)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none min-w-[300px]"
          >
            <option value="">Select a brand...</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <p className="text-slate-400 text-sm mt-2">
            Select a brand to view its bid workflows. Only projects of type "bid" or "proposal" will appear.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Loading bid workflows...</span>
          </div>
        )}

        {/* Workflows List */}
        {!loading && selectedBrandId && (
          <div className="space-y-6">
            {workflows.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-lg">No bid workflows found for this brand.</p>
                <p className="mt-2">Start a new bid from an opportunity or convert an existing project.</p>
              </div>
            ) : (
              workflows.map(({ project, workflow, capture, compliance }) => (
                <div key={workflow.id} className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">{project.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(workflow.stage)}`}>
                          {workflow.stage.charAt(0).toUpperCase() + workflow.stage.slice(1)}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateCapture(project.id)}
                        disabled={workflow.stage !== 'capture' || loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
                      >
                        {capture ? 'Regenerate' : 'Generate Capture'}
                      </button>
                      <button
                        onClick={() => handleGenerateCompliance(project.id)}
                        disabled={(workflow.stage !== 'capture' && workflow.stage !== 'compliance') || loading}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
                      >
                        {compliance ? 'Regenerate' : 'Generate Compliance'}
                      </button>
                      <button
                        onClick={() => handleGenerateOutline(project.id)}
                        disabled={(workflow.stage !== 'compliance' && workflow.stage !== 'outline') || loading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
                      >
                        Generate Outline
                      </button>
                    </div>
                  </div>

                  {/* Artifacts */}
                  <div className="grid grid-cols-2 gap-4 mt-5">
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-300 mb-2">Capture Document</h4>
                      {capture ? (
                        <div>
                          <p className="text-sm text-white truncate">{capture.title}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {capture.extractedData?.summary?.substring(0, 100)}...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not generated</p>
                      )}
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-300 mb-2">Compliance Matrix</h4>
                      {compliance ? (
                        <div>
                          <p className="text-sm text-white">{compliance.items.length} requirements</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {compliance.metadata?.formatRequirements || 'Standard format'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not generated</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-700">
                    <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedWorkflow({ project, workflow, capture, compliance });
                        setShowStageModal(true);
                      }}
                      className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      Update Stage
                    </button>
                    <button className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded">
                      Generate Proposal
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* New Bid Modal */}
        {showNewBidModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-700">
              <h2 className="text-xl font-bold mb-4">Start New Bid</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newBidData.projectName}
                    onChange={(e) => setNewBidData({ ...newBidData, projectName: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Enter project/bid name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Description</label>
                  <textarea
                    value={newBidData.description}
                    onChange={(e) => setNewBidData({ ...newBidData, description: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none min-h-[80px]"
                    placeholder="Brief description of the opportunity"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Agency</label>
                    <input
                      type="text"
                      value={newBidData.agency}
                      onChange={(e) => setNewBidData({ ...newBidData, agency: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., DOD, GSA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Solicitation #</label>
                    <input
                      type="text"
                      value={newBidData.solicitationNumber}
                      onChange={(e) => setNewBidData({ ...newBidData, solicitationNumber: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., RFP-2024-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Response Deadline</label>
                    <input
                      type="date"
                      value={newBidData.responseDeadline}
                      onChange={(e) => setNewBidData({ ...newBidData, responseDeadline: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Award Amount</label>
                    <input
                      type="text"
                      value={newBidData.awardAmount}
                      onChange={(e) => setNewBidData({ ...newBidData, awardAmount: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., $1,000,000"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewBidModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBid}
                  disabled={creating || !newBidData.projectName.trim()}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded font-medium"
                >
                  {creating ? 'Creating...' : 'Create Bid'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage Update Modal */}
        {showStageModal && selectedWorkflow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
              <h2 className="text-xl font-bold mb-2">Update Workflow Stage</h2>
              <p className="text-gray-400 text-sm mb-4">
                Current: <span className={`px-2 py-1 rounded text-xs ${getStageColor(selectedWorkflow.workflow.stage)}`}>
                  {selectedWorkflow.workflow.stage}
                </span>
              </p>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleUpdateStage(selectedWorkflow.project.id, stage)}
                    disabled={stageUpdating || stage === selectedWorkflow.workflow.stage}
                    className={`w-full px-4 py-3 text-left rounded-lg transition-colors flex items-center justify-between ${
                      stage === selectedWorkflow.workflow.stage
                        ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span className="capitalize">{stage}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStageColor(stage)}`}>
                      {stage}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowStageModal(false);
                    setSelectedWorkflow(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                  disabled={stageUpdating}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}