'use client';

import { useState, useEffect, useRef } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useGlobalModel } from '@/lib/context/ModelContext';
import type {
  Brand,
  Project,
  BrandDocument,
  ChatSession,
  ChatMessage,
} from '@/types/brand-workspace';

type ViewMode =
  | 'brands'
  | 'projects'
  | 'documents'
  | 'chat'
  | 'memory'
  | 'proposal'
  | 'scout'
  | 'customers';

const TAB_LABELS: Record<ViewMode, string> = {
  brands: 'Companies',
  projects: 'Procurements',
  documents: 'Documents',
  chat: 'Chat',
  memory: 'Memory',
  proposal: 'Proposal',
  scout: 'Scout',
  customers: 'Customers',
};

interface PromptField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}

interface PromptModalState {
  title: string;
  fields: PromptField[];
  onSubmit: (values: Record<string, string>) => void;
}

interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export default function BrandWorkspacePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [brandVoiceDocs, setBrandVoiceDocs] = useState<BrandDocument[]>([]);
  const [projectDocs, setProjectDocs] = useState<BrandDocument[]>([]);
  const [uploadTarget, setUploadTarget] = useState<'brand' | 'project'>('project');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('brands');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [memoryData, setMemoryData] = useState<any>(null);
  const [soulData, setSoulData] = useState<string>('');
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState(false);
  const [editingSoul, setEditingSoul] = useState(false);
  const [editedSoul, setEditedSoul] = useState<string>('');
  const [memoryMode, setMemoryMode] = useState<'auto' | 'manual'>('auto');
  const [proposalMarkdown, setProposalMarkdown] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalAction, setProposalAction] = useState('');
  const [researchMarkdown, setResearchMarkdown] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [orgChartMarkdown, setOrgChartMarkdown] = useState('');
  const [orgChartLoading, setOrgChartLoading] = useState(false);
  const [orgChartContactsAdded, setOrgChartContactsAdded] = useState(0);
  const [winThemesInput, setWinThemesInput] = useState('');
  const [sectionsInput, setSectionsInput] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [coverTitle, setCoverTitle] = useState('');
  const [coverSubtitle, setCoverSubtitle] = useState('');
  const [coverAgency, setCoverAgency] = useState('');
  const [coverSolicitation, setCoverSolicitation] = useState('');
  const [coverDueDate, setCoverDueDate] = useState('');
  const [proprietaryNotice, setProprietaryNotice] = useState(
    'PROPRIETARY & CONFIDENTIAL — Contains trade secrets. Do not distribute without authorization.'
  );
  const [deckCompany, setDeckCompany] = useState('');
  const [deckDate, setDeckDate] = useState('');
  const [docFontSize, setDocFontSize] = useState<'10' | '12'>('12');
  const [ganttInput, setGanttInput] = useState('');
  const [staffingInput, setStaffingInput] = useState('');
  const [quadrantInput, setQuadrantInput] = useState('');
  const [scoutProfile, setScoutProfile] = useState<any>(null);
  const [scoutStatus, setScoutStatus] = useState<any>(null);
  const [scoutResults, setScoutResults] = useState<any[]>([]);
  const [scoutEvents, setScoutEvents] = useState<any[]>([]);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutSearchMode, setScoutSearchMode] = useState('');
  const [scoutSources, setScoutSources] = useState<string[]>(['sam', 'diu', 'ssc', 'afwerx', 'sbir']);
  const [scoutSourcesUsed, setScoutSourcesUsed] = useState<string[]>([]);
  const [scoutLearnProjectId, setScoutLearnProjectId] = useState('');
  const [scoutOutcome, setScoutOutcome] = useState<'win' | 'loss' | 'bid' | 'review'>('bid');
  const [promptModal, setPromptModal] = useState<PromptModalState | null>(null);
  const [promptValues, setPromptValues] = useState<Record<string, string>>({});
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [dissectLoading, setDissectLoading] = useState(false);
  const [dissectStatus, setDissectStatus] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [orgChartLoadingId, setOrgChartLoadingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedModel } = useGlobalModel();

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (viewMode === 'memory') {
      loadMemoryData();
    }
  }, [viewMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const saveSoul = async () => {
    try {
      const response = await fetch('/api/memory-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSoul',
          soul: editedSoul,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSoulData(editedSoul);
        setEditingSoul(false);
      }
    } catch (e) {
      console.error('Failed to save soul:', e);
    }
  };

  const saveMemory = async (updatedMemory: any) => {
    try {
      const response = await fetch('/api/memory-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'memory',
          memory: updatedMemory,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMemoryData(updatedMemory);
        setEditingMemory(false);
      }
    } catch (e) {
      console.error('Failed to save memory:', e);
    }
  };

  const loadMemoryData = async () => {
    setMemoryLoading(true);
    try {
      const [memRes, soulRes] = await Promise.all([
        fetch('/api/memory-file?action=memory'),
        fetch('/api/memory-file?action=soul'),
      ]);
      const memData = await memRes.json();
      const soulDataResult = await soulRes.json();
      if (memData.success) setMemoryData(memData.memory);
      if (soulDataResult.success) setSoulData(soulDataResult.soul);
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
    setMemoryLoading(false);
  };

  const loadBrands = async () => {
    try {
      const response = await fetch('/api/brand-workspace/brands');
      const data = await response.json();
      const loaded = data.brands || [];
      setBrands(loaded);

      // Deep-link support: /brand-workspace?brand=<id> selects that company
      // (e.g. from the "Open <company> vault" link on the Office tab).
      const requestedId =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('brand')
          : null;
      if (requestedId) {
        const target = loaded.find((b: Brand) => b.id === requestedId);
        if (target) {
          await selectBrand(target);
        }
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadProjects = async (brandId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/projects?brandId=${brandId}`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadDocuments = async (brandId: string, projectId?: string) => {
    try {
      // Load brand voice documents (no projectId)
      const brandParams = new URLSearchParams({ id: brandId, includeDocuments: 'true' });
      const brandResponse = await fetch(`/api/brand-workspace/brands?${brandParams}`);
      const brandData = await brandResponse.json();
      const allDocs = brandData.documents || [];

      // Separate brand voice docs (no projectId) from project docs
      setBrandVoiceDocs(allDocs.filter((doc: BrandDocument) => !doc.projectId));

      // If projectId provided, also load project-specific docs
      if (projectId) {
        const projectParams = new URLSearchParams({
          id: brandId,
          includeDocuments: 'true',
          projectId,
        });
        const projectResponse = await fetch(`/api/brand-workspace/brands?${projectParams}`);
        const projectData = await projectResponse.json();
        const projectDocuments = projectData.documents || [];
        setProjectDocs(
          projectDocuments.filter((doc: BrandDocument) => doc.projectId === projectId)
        );
      } else {
        setProjectDocs([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadSessions = async (projectId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/chat?projectId=${projectId}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const selectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedProject(null);
    setBrandVoiceDocs([]);
    setProjectDocs([]);
    setSessions([]);
    setCurrentSession(null);
    // Keep the current tab if it's already brand-scoped (e.g. Customers);
    // otherwise land on Procurements as before.
    setViewMode(prev => (prev === 'brands' ? 'projects' : prev));
    await loadProjects(brand.id);
    await loadDocuments(brand.id);
  };

  const selectProject = async (project: Project) => {
    setSelectedProject(project);
    setViewMode('documents');
    await loadDocuments(project.brandId, project.id);
    await loadSessions(project.id);
  };

  const startChat = async () => {
    if (!selectedProject || !selectedBrand) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          projectId: selectedProject.id,
          brandId: selectedBrand.id,
          title: `Procurement Chat - ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
        setViewMode('chat');
        loadSessions(selectedProject.id);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startBrandChat = async () => {
    if (!selectedBrand) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          brandId: selectedBrand.id,
          title: `Vault Chat - ${selectedBrand.name} - ${new Date().toLocaleDateString()}`,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
        setViewMode('chat');
        // Load brand-level sessions (without project filter)
        await loadBrandSessions(selectedBrand.id);
      }
    } catch (error) {
      console.error('Error creating brand chat session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrandSessions = async (brandId: string) => {
    try {
      const response = await fetch(`/api/brand-workspace/chat?brandId=${brandId}`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading brand sessions:', error);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setCurrentSession(session);
    setViewMode('chat');
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentSession || !selectedBrand || isLoading) return;

    const message = chatInput.trim();
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          projectId: selectedProject?.id || undefined,
          brandId: selectedBrand.id,
          sessionId: currentSession.id,
          message,
        }),
      });
      const data = await response.json();
      if (data.success && data.session) {
        setCurrentSession(data.session);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBrand = () => {
    setPromptValues({});
    setPromptModal({
      title: 'Create Company',
      fields: [
        { key: 'name', label: 'Company name', placeholder: 'Acme Federal Services' },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performCreateBrand(values.name);
      },
    });
  };

  const performCreateBrand = async (name: string) => {
    if (!name) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name }),
      });
      const data = await response.json();
      if (data.success) {
        await loadBrands();
      }
    } catch (error) {
      console.error('Error creating brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = () => {
    if (!selectedBrand) return;
    setPromptValues({});
    setPromptModal({
      title: 'Create Procurement',
      fields: [
        { key: 'name', label: 'Procurement name', placeholder: 'SBIR Phase II — Resilient Mesh Networking' },
        {
          key: 'solicitationType',
          label: 'Solicitation type',
          defaultValue: 'RFP',
          placeholder: 'SBIR/STTR/BAA/OTA/OT/CSO/RFI/RFP',
        },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performCreateProject(values.name, values.solicitationType || 'RFP');
      },
    });
  };

  const performCreateProject = async (name: string, solicitationType: string) => {
    if (!selectedBrand) return;
    if (!name) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          brandId: selectedBrand.id,
          name,
          type: 'proposal',
          solicitationType,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await loadProjects(selectedBrand.id);
      }
    } catch (error) {
      console.error('Error creating procurement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBrand = (brandId: string, brandName: string) => {
    setConfirmModal({
      title: `Delete "${brandName}"?`,
      message:
        'This will permanently delete the company vault, its documents, all procurements, and all chat sessions. This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        setConfirmModal(null);
        void performDeleteBrand(brandId, brandName);
      },
    });
  };

  const performDeleteBrand = async (brandId: string, brandName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: brandId }),
      });
      const data = await response.json();
      if (data.success) {
        await loadBrands();
        if (selectedBrand?.id === brandId) {
          setSelectedBrand(null);
          setSelectedProject(null);
          setViewMode('brands');
        }
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = (projectId: string, projectName: string) => {
    setConfirmModal({
      title: `Delete "${projectName}"?`,
      message:
        'This will permanently delete the procurement, all requirement documents, and all chat sessions. This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => {
        setConfirmModal(null);
        void performDeleteProject(projectId, projectName);
      },
    });
  };

  const performDeleteProject = async (projectId: string, projectName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: projectId }),
      });
      const data = await response.json();
      if (data.success && selectedBrand) {
        await loadProjects(selectedBrand.id);
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setViewMode('projects');
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (files: FileList) => {
    if (!selectedBrand || !files.length) return;

    setIsLoading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('brandId', selectedBrand.id);
        if (uploadTarget === 'project' && selectedProject?.id) {
          formData.append('projectId', selectedProject.id);
        }
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        formData.append('extractKnowledge', 'true');

        const response = await fetch('/api/brand-workspace/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          await loadDocuments(selectedBrand.id, selectedProject?.id);
          // Show what the system extracted from a solicitation uploaded to a
          // procurement: opportunity name, due date → calendar, format guide.
          if (data.solicitation) {
            const s = data.solicitation;
            const lines: string[] = ['✅ Solicitation processed:'];
            if (s.opportunityName) lines.push(`• Opportunity: ${s.opportunityName}`);
            if (s.responseDeadline)
              lines.push(`• Due date: ${s.responseDeadline}${s.calendarEventId ? ' — added to Calendar' : ''}`);
            if (s.formatGuideMarkdown) lines.push('• Format guide generated (markdown)');
            if (lines.length > 1) {
              alert(lines.join('\n'));
              if (selectedBrand) await loadProjects(selectedBrand.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUrlDocument = () => {
    if (!selectedBrand) return;
    setPromptValues({});
    setPromptModal({
      title: 'Import from URL',
      fields: [
        { key: 'url', label: 'URL', placeholder: 'https://sam.gov/... or any web page' },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performAddUrlDocument(values.url);
      },
    });
  };

  const performAddUrlDocument = async (url: string) => {
    if (!selectedBrand) return;
    if (!url) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addDocumentFromUrl',
          brandId: selectedBrand.id,
          projectId: uploadTarget === 'project' ? selectedProject?.id : undefined,
          url,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await loadDocuments(selectedBrand.id, selectedProject?.id);
      }
    } catch (error) {
      console.error('Error adding URL document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateOutput = (type: 'proposal' | 'quote') => {
    if (!selectedProject || !selectedBrand) return;
    setPromptValues({});
    setPromptModal({
      title: type === 'proposal' ? 'Generate Proposal' : 'Generate Quote',
      fields: [
        {
          key: 'requirements',
          label: 'Specific requirements (optional)',
          placeholder: 'e.g. Include a staffing plan, past performance table, and pricing summary',
        },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performGenerateOutput(type, values.requirements || '');
      },
    });
  };

  const performGenerateOutput = async (type: 'proposal' | 'quote', requirements: string) => {
    if (!selectedProject || !selectedBrand) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'proposal' ? 'generateProposal' : 'generateQuote',
          projectId: selectedProject.id,
          brandId: selectedBrand.id,
          requirements,
          sessionId: currentSession?.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully!`);
      }
    } catch (error) {
      console.error('Error generating output:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the search agent — collect public-domain intel (budget, customers,
  // competition, news) into a markdown research report for this procurement.
  const runResearch = async () => {
    if (!selectedProject) return;
    setResearchLoading(true);
    try {
      const response = await fetch('/api/research/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          model: selectedModel || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.markdown) {
        setResearchMarkdown(data.markdown);
        if (data.filePath) {
          console.log(`[Research] Report saved to ${data.filePath}`);
        }
      } else {
        alert(data.error || 'Research failed');
      }
    } catch (error) {
      console.error('Error running research:', error);
      alert('Research failed. Check console for details.');
    } finally {
      setResearchLoading(false);
    }
  };

  // Build an org chart of the buying organization and identify key individuals.
  const runOrgChart = async () => {
    if (!selectedProject) return;
    setOrgChartLoading(true);
    try {
      const response = await fetch('/api/research/org-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          model: selectedModel || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.markdown) {
        setOrgChartMarkdown(data.markdown);
        setOrgChartContactsAdded(data.contactsAdded || 0);
        if (data.filePath) {
          console.log(`[OrgChart] Saved to ${data.filePath}`);
        }
      } else {
        alert(data.error || 'Org chart build failed');
      }
    } catch (error) {
      console.error('Error building org chart:', error);
      alert('Org chart failed. Check console for details.');
    } finally {
      setOrgChartLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ===== Proposal Genie studio =====
  const runProposalAction = async (action: string, extra: any = {}) => {
    if (!selectedBrand || !selectedProject) return;
    setProposalLoading(true);
    setProposalAction(action);
    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          brandId: selectedBrand.id,
          projectId: selectedProject.id,
          model: selectedModel || undefined,
          ...extra,
        }),
      });
      const data = await response.json();
      if (data.markdown) setProposalMarkdown(data.markdown);
      else alert(data.error || 'Failed to run function');
    } catch (error) {
      console.error('Proposal action error:', error);
      alert('Failed to run function');
    } finally {
      setProposalLoading(false);
      setProposalAction('');
    }
  };

  // Persist the current generated markdown into the project's vault so it shows
  // in the Documents tab and feeds future chat / proposal functions.
  const saveProposalToVault = async () => {
    if (!selectedBrand || !selectedProject || !proposalMarkdown.trim()) return;
    setIsLoading(true);
    try {
      const labels: Record<string, string> = {
        'cover-page': 'Cover Page',
        'win-themes': 'Win Themes',
        competition: 'Competition Analysis',
        'write-sections': 'Proposal Sections',
        assemble: 'Assembled Proposal',
      };
      const label = labels[proposalAction] || 'Proposal';
      const title = `${label} — ${selectedProject.name}`;
      const response = await fetch('/api/brand-workspace/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addDocument',
          brandId: selectedBrand.id,
          projectId: selectedProject.id,
          title,
          content: proposalMarkdown,
          type: 'proposal',
          metadata: {
            generatedBy: proposalAction || 'proposal-studio',
            generatedAt: Date.now(),
          },
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Failed to save to vault');
        return;
      }
      await loadDocuments(selectedBrand.id, selectedProject.id);
      alert(`Saved "${title}" to the vault — it now appears in the Documents tab and feeds the chat.`);
    } catch (error) {
      console.error('Error saving to vault:', error);
      alert('Failed to save to vault');
    } finally {
      setIsLoading(false);
    }
  };

  // Dissect the loaded solicitation into compliance, scoring, milestones, and
  // format intelligence. The results are persisted on the procurement and
  // injected into every chat / proposal model call.
  const dissectProject = async () => {
    if (!selectedBrand || !selectedProject) return;
    setDissectLoading(true);
    setDissectStatus('Dissecting the solicitation — extracting compliance, scoring, milestones, and format…');
    try {
      const response = await fetch('/api/bid-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dissect',
          projectId: selectedProject.id,
          model: selectedModel || undefined,
          force: true,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        setDissectStatus(data.error || 'Dissection failed');
        return;
      }
      setDissectStatus(
        `✅ Extracted ${data.complianceCount} compliance requirements, ${data.scoringCount} scoring factors, ${data.milestonesCount} milestones.`
      );
      // Refresh documents (intelligence report appears in the vault) and the
      // project metadata (format rules, scoring, win themes now live there).
      await loadDocuments(selectedBrand.id, selectedProject.id);
      const refreshed = await fetch(
        `/api/brand-workspace/projects?id=${selectedProject.id}`
      );
      const refreshedData = await refreshed.json();
      if (refreshedData.project) setSelectedProject(refreshedData.project);
      await loadProjects(selectedBrand.id);
    } catch (error) {
      console.error('Dissect error:', error);
      setDissectStatus('Dissection failed');
    } finally {
      setDissectLoading(false);
    }
  };

  // Extract quad-chart / schedule / staffing data from the proposal with the AI,
  // then fill the textareas (still editable) so the exports below have real data.
  const autoGeneratePresentations = async () => {
    if (!selectedBrand || !selectedProject) return;
    setProposalLoading(true);
    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-presentations',
          brandId: selectedBrand.id,
          projectId: selectedProject.id,
          model: selectedModel || undefined,
          markdown: proposalMarkdown,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Generation failed');
        return;
      }
      if (Array.isArray(data.quadrants) && data.quadrants.length > 0) {
        setQuadrantInput(
          data.quadrants
            .map((q: any) => `${q.name}: ${(q.points || []).join('; ')}`)
            .join('\n')
        );
      }
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        setGanttInput(
          data.tasks
            .map((t: any) => `${t.name}|${t.start}|${t.end}|${t.status || 'planned'}`)
            .join('\n')
        );
      }
      if (Array.isArray(data.staffing) && data.staffing.length > 0) {
        setStaffingInput(
          data.staffing
            .map(
              (s: any) =>
                `${s.laborCategory || ''}|${s.name || ''}|${s.role || ''}|${s.level || ''}|${s.loe || ''}|${s.status || ''}`
            )
            .join('\n')
        );
      }
      alert('Presentations populated from the proposal — review the data, then export.');
    } catch (error) {
      console.error('Error generating presentations:', error);
      alert('Failed to generate presentations');
    } finally {
      setProposalLoading(false);
    }
  };

  const downloadFile = (base64: string, filename: string, mimeType: string) => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocument = async (action: string, extra: any = {}) => {
    if (!selectedBrand || !selectedProject) return;
    setProposalLoading(true);
    setProposalAction(action);
    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          brandId: selectedBrand.id,
          projectId: selectedProject.id,
          markdown: proposalMarkdown,
          title: coverTitle || selectedProject?.name || 'Proposal',
          companyName: deckCompany || selectedBrand?.name || '',
          date: deckDate || new Date().toLocaleDateString(),
          logoBase64,
          proprietaryNotice,
          ...extra,
        }),
      });
      const data = await response.json();
      if (data.document) {
        downloadFile(data.document.buffer, data.document.filename, data.document.mimeType);
      } else {
        alert(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setProposalLoading(false);
      setProposalAction('');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoBase64(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Parse Gantt lines: "Task name|start|end|status"
  const parseGantt = (): any[] =>
    ganttInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name, start, end, status] = line.split('|').map(s => s.trim());
        return {
          name: name || 'Task',
          start: parseInt(start || '0') || 0,
          end: parseInt(end || '1') || 1,
          status: (status || 'planned') as any,
        };
      });

  // Parse staffing lines: "Labor Category|Name|Role|Level|LOE|Status"
  const parseStaffing = (): any[] =>
    staffingInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [laborCategory, name, role, level, loe, status] = line.split('|').map(s => s.trim());
        return { laborCategory: laborCategory || '', name, role, level, loe, status };
      });

  // Parse quadrant lines: "Name: point1; point2"
  const parseQuadrants = (): any[] =>
    quadrantInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const idx = line.indexOf(':');
        if (idx < 0) return { name: 'Quadrant', points: [line] };
        return {
          name: line.slice(0, idx).trim(),
          points: line
            .slice(idx + 1)
            .split(';')
            .map(p => p.trim())
            .filter(Boolean),
        };
      });

  // ===== Opportunity Scout =====
  const loadScout = async (brandId: string) => {
    setScoutLoading(true);
    try {
      const [profileRes, statusRes, eventsRes] = await Promise.all([
        fetch(`/api/opportunity-scout?action=profile&brandId=${encodeURIComponent(brandId)}`),
        fetch(`/api/opportunity-scout?action=status&brandId=${encodeURIComponent(brandId)}`),
        fetch(`/api/opportunity-scout?action=learn-events&brandId=${encodeURIComponent(brandId)}`),
      ]);
      const [profileData, statusData, eventsData] = await Promise.all([
        profileRes.json(),
        statusRes.json(),
        eventsRes.json(),
      ]);
      if (profileData.profile) setScoutProfile(profileData.profile);
      if (statusData.status) setScoutStatus(statusData.status);
      if (eventsData.events) setScoutEvents(eventsData.events);
    } catch (e) {
      console.error('Error loading scout:', e);
    } finally {
      setScoutLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'scout' && selectedBrand) {
      loadScout(selectedBrand.id);
    }
  }, [viewMode, selectedBrand?.id]);

  const loadCustomers = async (brandId: string) => {
    try {
      const response = await fetch(`/api/customers?brandId=${brandId}`);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (e) {
      console.error('Error loading customers:', e);
    }
  };

  useEffect(() => {
    if (viewMode === 'customers' && selectedBrand) {
      loadCustomers(selectedBrand.id);
    }
  }, [viewMode, selectedBrand?.id]);

  const createCustomer = () => {
    setPromptValues({});
    setPromptModal({
      title: 'Add Customer',
      fields: [
        {
          key: 'name',
          label: 'Customer / agency name',
          placeholder: 'e.g., MDA, DIU, SSC, NOAA, NASA',
        },
        {
          key: 'mission',
          label: 'Mission / focus (optional)',
          placeholder: 'What they do and what they buy',
        },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performCreateCustomer(values.name, values.mission);
      },
    });
  };

  const performCreateCustomer = async (name: string, mission?: string) => {
    if (!selectedBrand || !name.trim()) return;
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', brandId: selectedBrand.id, name, mission }),
    });
    const data = await response.json();
    if (data.success) await loadCustomers(selectedBrand.id);
  };

  const editCustomer = (c: any) => {
    setPromptValues({ name: c.name, mission: c.mission || '', notes: c.notes || '' });
    setPromptModal({
      title: 'Edit Customer',
      fields: [
        { key: 'name', label: 'Customer / agency name', placeholder: '' },
        { key: 'mission', label: 'Mission / focus (optional)', placeholder: '' },
        { key: 'notes', label: 'Notes (optional)', placeholder: 'Contacts, strategy, account intel' },
      ],
      onSubmit: values => {
        setPromptModal(null);
        void performUpdateCustomer(c.id, values);
      },
    });
  };

  const performUpdateCustomer = async (id: string, values: Record<string, string>) => {
    if (!selectedBrand) return;
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        brandId: selectedBrand.id,
        id,
        name: values.name,
        mission: values.mission,
        notes: values.notes,
      }),
    });
    const data = await response.json();
    if (data.success) await loadCustomers(selectedBrand.id);
  };

  const deleteCustomer = (id: string, name: string) => {
    setConfirmModal({
      title: `Delete "${name}"?`,
      message:
        'This removes the customer record and all learned intelligence. This cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null);
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        if (selectedBrand) await loadCustomers(selectedBrand.id);
      },
    });
  };

  const buildCustomerOrgChart = async (c: any) => {
    if (!selectedBrand) return;
    setOrgChartLoadingId(c.id);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'orgChart',
          brandId: selectedBrand.id,
          id: c.id,
          model: selectedModel || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await loadCustomers(selectedBrand.id);
      } else {
        alert(data.error || 'Org chart build failed');
      }
    } catch (error) {
      console.error('Error building customer org chart:', error);
      alert('Org chart failed. Check console for details.');
    } finally {
      setOrgChartLoadingId(null);
    }
  };

  const learnAllCustomers = async () => {
    if (!selectedBrand) return;
    setCustomersLoading(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'learnAll', brandId: selectedBrand.id }),
      });
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers || []);
        alert(
          data.learned.length
            ? `Learned from ${data.learned.length} procurement(s): ${data.learned.join(', ')}`
            : 'No procurements to learn from yet. Add an RFP and dissect it first.'
        );
      }
    } finally {
      setCustomersLoading(false);
    }
  };

  const scoutFetch = async (action: string, extra: any = {}) => {
    if (!selectedBrand) return null;
    setScoutLoading(true);
    try {
      const response = await fetch('/api/opportunity-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, brandId: selectedBrand.id, ...extra }),
      });
      return await response.json();
    } catch (e) {
      console.error('Scout error:', e);
      return null;
    } finally {
      setScoutLoading(false);
    }
  };

  const buildScoutProfile = async () => {
    const data = await scoutFetch('build-profile', { model: selectedModel || undefined });
    if (data?.profile) {
      setScoutProfile(data.profile);
      alert('Company profile rebuilt from your brand data, documents, and past proposals.');
    } else {
      alert(data?.error || 'Failed to build profile');
    }
  };

  const saveScoutProfile = async () => {
    if (!scoutProfile) return;
    const data = await scoutFetch('save-profile', { profile: scoutProfile });
    if (data?.profile) setScoutProfile(data.profile);
  };

  const runScoutSearch = async () => {
    const data = await scoutFetch('search', { limit: 15, sources: scoutSources });
    if (data?.opportunities) {
      setScoutResults(data.opportunities);
      setScoutSearchMode(data.mode || '');
      setScoutSourcesUsed(data.sourcesUsed || []);
      if (data.profile) setScoutProfile(data.profile);
      loadScout(selectedBrand!.id);
    } else {
      setScoutResults([]);
      setScoutSourcesUsed([]);
      alert(data?.message || data?.error || 'Search found nothing');
    }
  };

  const scoutLearn = async () => {
    if (!scoutLearnProjectId) {
      alert('Select a project to learn from');
      return;
    }
    const data = await scoutFetch('learn', {
      projectId: scoutLearnProjectId,
      outcome: scoutOutcome,
      model: selectedModel || undefined,
    });
    if (data?.profile) {
      setScoutProfile(data.profile);
      loadScout(selectedBrand!.id);
      alert('Learned from project — future searches will weight these keywords higher.');
    } else {
      alert(data?.error || 'Failed to learn');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Corporate Vault</h1>
            <p className="text-gray-400 text-sm">NotebookLM-style knowledge management</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedBrand && (
              <button
                onClick={() => {
                  setSelectedBrand(null);
                  setSelectedProject(null);
                  setViewMode('brands');
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                All Companies
              </button>
            )}
            {selectedProject && (
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setViewMode('projects');
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {selectedBrand?.name} Procurements
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {(['brands', 'projects', 'documents', 'chat', 'memory', 'proposal', 'scout', 'customers'] as ViewMode[]).map(tab => (
            <button
              key={tab}
              onClick={() => setViewMode(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {tab === 'brands' && '🏢 '}
              {tab === 'projects' && '📁 '}
              {tab === 'documents' && '📄 '}
              {tab === 'chat' && '💬 '}
              {tab === 'memory' && '🧠 '}
              {tab === 'proposal' && '📝 '}
              {tab === 'scout' && '🎯 '}
              {tab === 'customers' && '🏛️ '}
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div
          className={`grid gap-6 ${viewMode === 'memory' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}
        >
          {/* Sidebar - hidden in memory view */}
          {viewMode !== 'memory' && (
            <div className="lg:col-span-1 space-y-4">
              {/* Brands List */}
              {(viewMode === 'brands' || viewMode === 'proposal' || viewMode === 'scout' || viewMode === 'customers') && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Corporate Vault</h2>                      <button
                        onClick={createBrand}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                      >
                        + New Company
                      </button>
                  </div>
                  <div className="space-y-2">
                    {brands.map(brand => (
                      <div key={brand.id} className="w-full">
                        <div className="flex gap-1">
                          <button
                            onClick={() => selectBrand(brand)}
                            className="flex-1 text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <div className="font-medium">{brand.name}</div>
                            {brand.industry && (
                              <div className="text-sm text-gray-400">{brand.industry}</div>
                            )}
                          </button>
                          <button
                            onClick={() => deleteBrand(brand.id, brand.name)}
                            className="px-2 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                            title="Delete brand"
                          >
                            🗑️
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBrand(brand);
                            startBrandChat();
                          }}
                          className="w-full mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                          💬 Ask the Vault
                        </button>
                      </div>
                    ))}
                    {brands.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No companies yet. Add your company to start building the vault.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Projects List */}
              {(viewMode === 'projects' || viewMode === 'proposal' || viewMode === 'scout') && selectedBrand && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Procurements — {selectedBrand.name}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={startBrandChat}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        title="Chat with vault documents"
                      >
                        💬 Ask the Vault
                      </button>
                      <button
                        onClick={createProject}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                      >
                        + New Procurement
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {projects.map(project => (
                      <div key={project.id} className="flex gap-1">
                        <button
                          onClick={() => selectProject(project)}
                          className={`flex-1 text-left p-3 rounded-lg transition-colors ${
                            selectedProject?.id === project.id
                              ? 'bg-purple-900/50 border border-purple-500'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div className="font-medium">{project.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-purple-900/60 text-purple-300 rounded">
                              {project.solicitationType || 'Other'}
                            </span>
                            <span className="text-xs text-gray-400">{project.status}</span>
                          </div>
                        </button>
                        <button
                          onClick={() => deleteProject(project.id, project.name)}
                          className="px-2 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors self-start mt-3"
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="text-gray-500 text-sm text-center py-4">
                        <p>No procurements yet.</p>
                        <button
                          onClick={startBrandChat}
                          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          💬 Ask the Vault
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Details Sidebar */}
              {(viewMode === 'documents' || viewMode === 'chat' || viewMode === 'proposal' || viewMode === 'scout') && selectedProject && (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-2">{selectedProject.name}</h2>
                    <p className="text-gray-400 text-sm mb-3">
                      {selectedProject.description || 'No description'}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded">
                        {selectedProject.solicitationType || 'Other'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                        {selectedProject.status}
                      </span>
                    </div>
                  </div>

                  {/* Document Actions */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Add Sources</h3>

                    {/* Upload Target Toggle */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setUploadTarget('project')}
                        className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                          uploadTarget === 'project'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        To Procurement
                      </button>
                      <button
                        onClick={() => setUploadTarget('brand')}
                        className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                          uploadTarget === 'brand'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        To Vault
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="block w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer text-center text-sm">
                        Upload Files
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.markdown,.html,.pdf,.json,.docx"
                          className="hidden"
                          onChange={e => e.target.files && uploadDocument(e.target.files)}
                        />
                      </label>
                      <button
                        onClick={addUrlDocument}
                        className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  {/* Chat Sessions */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Chat Sessions</h3>
                      <button
                        onClick={startChat}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                      >
                        New Chat
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {sessions.map(session => (
                        <button
                          key={session.id}
                          onClick={() => selectSession(session)}
                          className={`w-full text-left p-2 rounded text-sm ${
                            currentSession?.id === session.id
                              ? 'bg-purple-900/50 border border-purple-500'
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div className="truncate">{session.title || 'Untitled Chat'}</div>
                          <div className="text-xs text-gray-400">
                            {session.messages.length} messages
                          </div>
                        </button>
                      ))}
                      {sessions.length === 0 && (
                        <p className="text-gray-500 text-xs text-center py-2">No chats yet</p>
                      )}
                    </div>
                  </div>

                  {/* Generate Actions */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Generate</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => generateOutput('proposal')}
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50"
                      >
                        Generate Proposal
                      </button>
                      <button
                        onClick={() => generateOutput('quote')}
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                      >
                        Generate Quote
                      </button>
                      <button
                        onClick={runResearch}
                        disabled={isLoading || researchLoading || !selectedProject}
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
                      >
                        {researchLoading ? 'Researching the web…' : '🔎 Market Research'}
                      </button>
                      <button
                        onClick={runOrgChart}
                        disabled={isLoading || orgChartLoading || !selectedProject}
                        className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm disabled:opacity-50"
                      >
                        {orgChartLoading ? 'Mapping the organization…' : '🏛️ Customer Org Chart'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Content */}
          <div className={viewMode === 'memory' ? 'col-span-1' : 'lg:col-span-3'}>
            {/* Brand Voice Upload (no project needed) */}
            {(viewMode === 'documents' || viewMode === 'projects') &&
              selectedBrand &&
              !selectedProject && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Corporate Vault Documents</h2>
                      <p className="text-sm text-gray-400">
                        These documents build your company knowledge base — previous proposals,
                        product data sheets, and past conversations. Available across all procurements.
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">{brandVoiceDocs.length} documents</span>
                  </div>

                  {/* Upload Area */}
                  <div className="mb-6 p-6 border-2 border-dashed border-gray-600 rounded-lg bg-gray-700/30">
                    <div className="text-center mb-4">
                      <p className="text-gray-300 mb-2">
                        Upload company information to build your knowledge base
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported files: .txt, .md, .markdown, .html, .pdf, .json, .docx
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <label className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer text-white font-medium transition-colors">
                        Upload Files
                        <input
                          type="file"
                          multiple
                          accept=".txt,.md,.markdown,.html,.pdf,.json,.docx"
                          className="hidden"
                          onChange={e => {
                            setUploadTarget('brand');
                            e.target.files && uploadDocument(e.target.files);
                          }}
                        />
                      </label>
                      <button
                        onClick={() => {
                          setUploadTarget('brand');
                          addUrlDocument();
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  {/* Brand Voice Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brandVoiceDocs.map((doc: BrandDocument) => (
                      <div
                        key={doc.id}
                        className="bg-gradient-to-br from-purple-900/30 to-gray-700 rounded-lg p-4 border border-purple-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                                {doc.type}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded">
                                Vault
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setConfirmModal({
                                title: 'Delete this document?',
                                message: `"${doc.title}" will be permanently removed from the vault. This action cannot be undone.`,
                                confirmLabel: 'Delete',
                                onConfirm: () => {
                                  setConfirmModal(null);
                                  void (async () => {
                                    await fetch('/api/brand-workspace/brands', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'deleteDocument',
                                        documentId: doc.id,
                                      }),
                                    });
                                    loadDocuments(selectedBrand.id);
                                  })();
                                },
                              })
                            }
                            className="p-1 text-gray-400 hover:text-red-400"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        {doc.metadata?.summary && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {doc.metadata.summary}
                          </p>
                        )}
                        {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {brandVoiceDocs.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-gray-500">
                        <svg
                          className="w-16 h-16 mx-auto mb-4 opacity-30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <p className="text-lg mb-2">No vault documents yet</p>
                        <p className="text-sm">
                          Upload previous proposals, product data sheets, and company information
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Documents View */}
            {viewMode === 'documents' && selectedProject && (
              <div className="space-y-6">
                {/* Brand Voice Documents */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Corporate Vault Documents</h2>
                      <p className="text-sm text-gray-400">
                        Shared across all {selectedBrand?.name} procurements
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm">{brandVoiceDocs.length} documents</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {brandVoiceDocs.map((doc: BrandDocument) => (
                      <div
                        key={doc.id}
                        className="bg-gradient-to-br from-purple-900/30 to-gray-700 rounded-lg p-4 border border-purple-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded">
                                {doc.type}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-purple-600/50 text-purple-200 rounded">
                                Vault
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {doc.metadata?.size ? `${Math.round(doc.metadata.size / 1024)}KB` : ''}
                          </span>
                        </div>
                        {doc.metadata?.summary && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {doc.metadata.summary}
                          </p>
                        )}
                        {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {brandVoiceDocs.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                        <p className="text-sm">No vault documents yet</p>
                        <p className="text-xs mt-1">Add company info, URLs, or product data sheets</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Documents */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Requirement Documents (Solicitations)</h2>
                      <p className="text-sm text-gray-400">
                        Requirement documents for {selectedProject?.name} — solicitations, SOWs, and amendments
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{projectDocs.length} documents</span>
                      {projectDocs.length > 0 && (
                        <button
                          onClick={dissectProject}
                          disabled={dissectLoading}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs text-white"
                        >
                          {dissectLoading ? 'Dissecting…' : '🧠 Dissect RFP'}
                        </button>
                      )}
                    </div>
                  </div>

                  {dissectStatus && (
                    <div className="mb-4 px-4 py-2.5 bg-purple-900/30 border border-purple-500/30 rounded text-sm text-purple-200">
                      {dissectStatus}
                    </div>
                  )}

                  {selectedProject?.metadata?.solicitationIntel && (
                    <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Compliance', value: (selectedProject.metadata.solicitationIntel.compliance || []).length, icon: '✅' },
                        { label: 'Scoring factors', value: (selectedProject.metadata.solicitationIntel.scoring || []).length, icon: '🎯' },
                        { label: 'Milestones', value: (selectedProject.metadata.solicitationIntel.milestones || []).length, icon: '📅' },
                        { label: 'Format rules', value: Object.values(selectedProject.metadata.solicitationIntel.format || {}).filter(Boolean).length, icon: '📐' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-gray-900/60 rounded-lg p-3 text-center border border-gray-700">
                          <div className="text-xl">{stat.icon}</div>
                          <div className="text-2xl font-bold text-white">{stat.value}</div>
                          <div className="text-xs text-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectDocs.map((doc: BrandDocument) => (
                      <div key={doc.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-gray-600 rounded">
                                {doc.type}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                                Project
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {doc.metadata?.size ? `${Math.round(doc.metadata.size / 1024)}KB` : ''}
                          </span>
                        </div>
                        {doc.metadata?.summary && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {doc.metadata.summary}
                          </p>
                        )}
                        {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {doc.metadata.tags.slice(0, 5).map((tag: string) => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-600 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {projectDocs.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                        <p className="text-sm">No requirement documents yet</p>
                        <p className="text-xs mt-1">
                          Upload solicitations, SOWs, specifications, or amendments
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chat View */}
            {viewMode === 'chat' && currentSession && (
              <div
                className="bg-gray-800 rounded-lg flex flex-col"
                style={{ height: 'calc(100vh - 200px)' }}
              >
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700">
                  <h2 className="font-semibold">{currentSession.title || 'Chat'}</h2>
                  <p className="text-sm text-gray-400">
                    {currentSession.messages.length} messages |{' '}
                    {brandVoiceDocs.length + projectDocs.length} sources available (
                    {brandVoiceDocs.length} vault, {projectDocs.length} procurement)
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentSession.messages.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      <p className="text-lg mb-2">Start a conversation</p>
                      <p className="text-sm">
                        Ask questions about {selectedBrand?.name}'s corporate vault and requirement documents
                      </p>
                    </div>
                  )}
                  {currentSession.messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p>{message.content}</p>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
                        {message.metadata?.documentsReferenced && (
                          <div className="text-xs text-gray-400 mt-2">
                            Sources: {message.metadata.documentsReferenced.length} documents
                            referenced
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-400">Thinking...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about your documents, request content generation..."
                      className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 resize-none"
                      rows={3}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !chatInput.trim()}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg self-end"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Empty State */}
            {viewMode === 'chat' && !currentSession && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <h2 className="text-2xl font-semibold mb-4">💬 Vault Chat</h2>
                {!selectedBrand ? (
                  <>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Select a company from the Companies tab, then start a chat to ask
                      questions about its vault documents.
                    </p>
                    <button
                      onClick={() => setViewMode('brands')}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg"
                    >
                      🏢 Go to Companies
                    </button>
                  </>
                ) : !selectedProject ? (
                  <>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Chat with {selectedBrand.name}'s corporate vault — product data, past
                      proposals, and company knowledge.
                    </p>
                    <button
                      onClick={startBrandChat}
                      disabled={isLoading}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                    >
                      {isLoading ? 'Starting…' : '💬 Ask the Vault'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Chat with {selectedProject.name} — ask questions about its requirement
                      documents and your company's vault.
                    </p>
                    <button
                      onClick={startChat}
                      disabled={isLoading}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
                    >
                      {isLoading ? 'Starting…' : '💬 New Chat'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Empty State */}
            {viewMode === 'brands' && brands.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <h2 className="text-2xl font-semibold mb-4">Welcome to the Corporate Vault</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Create a company vault to organize your knowledge base and procurements.
                  Similar to NotebookLM, you can add sources and chat with AI about your content.
                </p>
                <button
                  onClick={createBrand}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg"
                >
                  Create Your Company Vault
                </button>
              </div>
            )}

            {/* Opportunity Scout */}
            {viewMode === 'scout' && (
              <div className="space-y-6">
                {!selectedBrand ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-4">🎯 Opportunity Scout</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      The scout searches SAM.gov for opportunities that fit this company — based
                      on its products, capabilities, and past proposals. It learns from every
                      proposal you write.
                    </p>
                    <p className="text-gray-500">Pick a company from the list on the left →</p>
                  </div>
                ) : (
                  <>
                    {/* Status bar */}
                    <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">🎯 Opportunity Scout — {selectedBrand.name}</h2>
                        <p className="text-sm text-gray-400">
                          Self-learning SAM.gov search tuned to this company
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded ${scoutStatus?.apiConfigured ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}
                        >
                          {scoutStatus?.apiConfigured ? 'SAM.gov API ✓' : 'API key missing — SAM search disabled'}
                        </span>
                        <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {scoutStatus?.searchCount || 0} searches
                        </span>
                        <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {scoutStatus?.learnedKeywordCount || 0} learned keywords
                        </span>
                        {scoutLoading && <span className="px-2 py-1 rounded bg-purple-900/50 text-purple-300">Working...</span>}
                      </div>
                    </div>

                    {/* Profile */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Company Profile</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={buildScoutProfile}
                            disabled={scoutLoading}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-xs"
                          >
                            Rebuild from company data
                          </button>
                          <button
                            onClick={saveScoutProfile}
                            disabled={scoutLoading || !scoutProfile}
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded text-xs"
                          >
                            Save edits
                          </button>
                        </div>
                      </div>
                      {scoutProfile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Products / services (comma-separated)</label>
                            <input
                              value={(scoutProfile.products || []).join(', ')}
                              onChange={e => setScoutProfile({ ...scoutProfile, products: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">NAICS codes (comma-separated)</label>
                            <input
                              value={(scoutProfile.naicsCodes || []).join(', ')}
                              onChange={e => setScoutProfile({ ...scoutProfile, naicsCodes: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Search keywords (comma-separated)</label>
                            <input
                              value={(scoutProfile.keywords || []).join(', ')}
                              onChange={e => setScoutProfile({ ...scoutProfile, keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Target agencies (comma-separated)</label>
                            <input
                              value={(scoutProfile.targetAgencies || []).join(', ')}
                              onChange={e => setScoutProfile({ ...scoutProfile, targetAgencies: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No profile yet. Click "Rebuild from company data" to extract it from
                          your vault documents and past proposals.
                        </p>
                      )}

                      {scoutProfile?.learnedKeywords && scoutProfile.learnedKeywords.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-400 mb-1">
                            Learned keywords (weighted by what produced bids & wins)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {scoutProfile.learnedKeywords.map((k: any, i: number) => (
                              <span
                                key={i}
                                title={`Source: ${k.source}`}
                                className={`px-2 py-0.5 rounded text-xs ${k.weight >= 3 ? 'bg-green-900/60 text-green-300' : k.weight >= 1.5 ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-700 text-gray-400'}`}
                              >
                                {k.keyword} <span className="opacity-70">({k.weight.toFixed(1)})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Search */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Search Opportunity Sources</h3>
                        <button
                          onClick={runScoutSearch}
                          disabled={scoutLoading}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                        >
                          {scoutLoading ? 'Searching...' : '🎯 Run Scout Search'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          { id: 'sam', label: 'SAM.gov' },
                          { id: 'diu', label: 'DIU' },
                          { id: 'ssc', label: 'SSC Front Door' },
                          { id: 'afwerx', label: 'AFWERX' },
                          { id: 'sbir', label: 'SBIR.gov' },
                        ].map(s => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border ${
                              scoutSources.includes(s.id)
                                ? 'bg-purple-900/40 border-purple-600 text-purple-200'
                                : 'bg-gray-900 border-gray-700 text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={scoutSources.includes(s.id)}
                              onChange={() =>
                                setScoutSources(prev =>
                                  prev.includes(s.id)
                                    ? prev.filter(x => x !== s.id)
                                    : [...prev, s.id]
                                )
                              }
                              className="accent-purple-500"
                            />
                            {s.label}
                          </label>
                        ))}
                      </div>
                      {scoutSearchMode && (
                        <p className="text-xs text-gray-400 mb-2">
                          SAM.gov mode: {scoutSearchMode === 'api' ? 'API' : 'Blocked (key required)'}
                          {scoutSourcesUsed.length > 0
                            ? ` · Sources searched: ${scoutSourcesUsed.join(', ')}`
                            : ''}
                        </p>
                      )}
                      {scoutResults.length > 0 ? (
                        <div className="space-y-2 max-h-[420px] overflow-y-auto">
                          {scoutResults.map((opp: any, i: number) => (
                            <div key={opp.id || i} className="bg-gray-900 rounded p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-white text-sm font-medium">{opp.title}</h4>
                                    {opp.source && (
                                      <span
                                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                          opp.source === 'sam'
                                            ? 'bg-gray-700 text-gray-300'
                                            : opp.source === 'diu'
                                            ? 'bg-blue-900/60 text-blue-300'
                                            : opp.source === 'ssc'
                                            ? 'bg-cyan-900/60 text-cyan-300'
                                            : opp.source === 'afwerx'
                                            ? 'bg-amber-900/60 text-amber-300'
                                            : 'bg-green-900/60 text-green-300'
                                        }`}
                                      >
                                        {opp.source.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {opp.agency || 'Agency unknown'}
                                    {opp.solicitationNumber ? ` · ${opp.solicitationNumber}` : ''}
                                    {opp.responseDeadline ? ` · Due ${opp.responseDeadline}` : ''}
                                  </p>
                                  {opp.synopsis && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{opp.synopsis}</p>
                                  )}
                                  {opp.reasons && opp.reasons.length > 0 && (
                                    <p className="text-xs text-purple-300 mt-1">
                                      {opp.reasons.join(' · ')}
                                    </p>
                                  )}
                                </div>
                                <div
                                  className={`shrink-0 px-2.5 py-1 rounded text-sm font-bold ${
                                    opp.fitScore >= 70
                                      ? 'bg-green-900/60 text-green-300'
                                      : opp.fitScore >= 40
                                      ? 'bg-blue-900/60 text-blue-300'
                                      : 'bg-gray-700 text-gray-400'
                                  }`}
                                >
                                  {opp.fitScore}
                                </div>
                              </div>
                              {opp.url && (
                                <a
                                  href={opp.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
                                >
                                  View opportunity
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          Run a search to find opportunities scored against the company profile —
                          from SAM.gov and customer-published sites like DIU, SSC Front Door, AFWERX,
                          and SBIR.gov.
                          {!scoutStatus?.apiConfigured &&
                            ' Tip: add a free SAM.gov API key in Settings → API Keys for reliable results.'}
                        </p>
                      )}
                    </div>

                    {/* Learn */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3">Teach the Scout</h3>
                      <p className="text-xs text-gray-400 mb-3">
                        After a proposal is written, won, or lost, tell the scout the outcome — it
                        will weight future searches toward what actually worked.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={scoutLearnProjectId}
                          onChange={e => setScoutLearnProjectId(e.target.value)}
                          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                        >
                          <option value="">Select project...</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={scoutOutcome}
                          onChange={e => setScoutOutcome(e.target.value as any)}
                          className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                        >
                          <option value="win">Won</option>
                          <option value="bid">Bid / proposal written</option>
                          <option value="loss">Lost</option>
                          <option value="review">In review</option>
                        </select>
                        <button
                          onClick={scoutLearn}
                          disabled={scoutLoading}
                          className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded text-sm"
                        >
                          Learn from project
                        </button>
                      </div>

                      {scoutEvents.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-400 mb-1">Learning history</label>
                          <div className="space-y-1">
                            {scoutEvents.slice(0, 5).map((ev: any, i: number) => (
                              <div key={i} className="text-xs text-gray-500">
                                <span className="text-gray-300">{ev.projectName}</span> ({ev.outcome})
                                {ev.agency ? ` · ${ev.agency}` : ''} — learned{' '}
                                {ev.keywords.length} keyword{ev.keywords.length === 1 ? '' : 's'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Customer Knowledge Base */}
            {viewMode === 'customers' && (
              <div className="space-y-6">
                {!selectedBrand ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-4">🏛️ Customer Knowledge Base</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Intelligence on the agencies you sell to — MDA, DIU, Space Systems Command,
                      NOAA, NASA and more. The base learns automatically from every solicitation
                      you dissect and every outcome you record.
                    </p>
                    <p className="text-gray-500">Pick a company from the list on the left →</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">🏛️ Customers — {selectedBrand.name}</h2>
                        <p className="text-sm text-gray-400">
                          Self-improving knowledge base: mission, priorities, hot buttons, buying
                          patterns, and win/loss history per agency.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={learnAllCustomers}
                          disabled={customersLoading}
                          className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded text-sm"
                        >
                          {customersLoading ? 'Learning…' : '🔄 Learn from procurements'}
                        </button>
                        <button
                          onClick={createCustomer}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm"
                        >
                          + Add Customer
                        </button>
                      </div>
                    </div>

                    {customers.length === 0 && (
                      <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <p className="text-gray-400 mb-3">
                          No customers yet. Add one manually, or dissect an RFP and the system
                          creates the customer record automatically.
                        </p>
                        <button
                          onClick={createCustomer}
                          className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm"
                        >
                          + Add Customer
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customers.map(c => (
                        <div key={c.id} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold">{c.name}</h3>
                              {c.aliases?.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  aka {c.aliases.join(', ')}
                                </div>
                              )}
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-300 rounded">
                                  {c.winCount} won
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-red-900/40 text-red-300 rounded">
                                  {c.lossCount} lost
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                                  {c.bidCount} bid
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => buildCustomerOrgChart(c)}
                                disabled={orgChartLoadingId === c.id}
                                className="px-2 py-1 bg-blue-700/30 hover:bg-blue-700 text-blue-300 hover:text-white rounded text-xs disabled:opacity-50"
                                title="Go collect this customer's org structure from Wikipedia / government sites"
                              >
                                {orgChartLoadingId === c.id ? '⏳' : '🛠️'}
                              </button>
                              <button
                                onClick={() => editCustomer(c)}
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteCustomer(c.id, c.name)}
                                className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {c.mission && (
                            <p className="text-sm text-gray-300 mt-2">{c.mission}</p>
                          )}

                          {c.hotButtons?.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-gray-400 mb-1">
                                🎯 Hot buttons
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {c.hotButtons.slice(0, 6).map((h: string, i: number) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {c.priorities?.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-gray-400 mb-1">
                                📌 Priorities
                              </div>
                              <ul className="text-sm text-gray-300 space-y-1">
                                {c.priorities.slice(0, 5).map((p: string, i: number) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {c.buyingPatterns?.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-gray-400 mb-1">
                                📅 Buying patterns
                              </div>
                              <ul className="text-sm text-gray-400 space-y-1">
                                {c.buyingPatterns.slice(0, 4).map((b: string, i: number) => (
                                  <li key={i}>• {b}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {c.intel?.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-700">
                              <div className="text-xs font-medium text-gray-400 mb-2">
                                🧠 Learned intelligence
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {c.intel.slice(0, 8).map((entry: any, i: number) => (
                                  <div key={i} className="text-xs text-gray-400">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                                        entry.source === 'outcome'
                                          ? 'bg-green-900/40 text-green-300'
                                          : entry.source === 'solicitation'
                                          ? 'bg-blue-900/40 text-blue-300'
                                          : 'bg-gray-700 text-gray-300'
                                      }`}
                                    >
                                      {entry.source}
                                    </span>{' '}
                                    <span className="text-gray-300">{entry.content}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {c.orgChart && (
                            <div className="mt-4 pt-3 border-t border-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-400">
                                  🛠️ Last known org chart
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {c.orgChartUpdatedAt
                                    ? `as of ${new Date(c.orgChartUpdatedAt).toLocaleDateString()}`
                                    : ''}
                                </span>
                              </div>
                              <div className="max-h-80 overflow-y-auto text-sm">
                                <MarkdownRenderer content={c.orgChart} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Proposal Genie Studio */}
            {viewMode === 'proposal' && (
              <div className="space-y-6">
                {!selectedBrand ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-4">📝 Proposal Genie Studio</h2>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                      Select a company to start building proposals. Each company carries its
                      corporate vault — knowledge sources, logo, and past performance.
                    </p>
                    {brands.length === 0 ? (
                      <button
                        onClick={createBrand}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg"
                      >
                        Create Your Company Vault
                      </button>
                    ) : (
                      <p className="text-gray-500">Pick a company from the list on the left →</p>
                    )}
                  </div>
                ) : !selectedProject ? (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <h2 className="text-2xl font-semibold mb-2">📝 {selectedBrand.name}</h2>
                    <p className="text-gray-400 mb-6">
                      Select or create a procurement (solicitation) to run the proposal pipeline
                      against it.
                    </p>
                    <p className="text-gray-500">Pick a project from the list on the left →</p>
                  </div>
                ) : (
                  <>
                    {/* Context bar */}
                    <div className="bg-gray-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">📝 Proposal Studio</h2>
                        <p className="text-sm text-gray-400">
                          {selectedBrand.name} / {selectedProject.name} —{' '}
                          {brandVoiceDocs.length + projectDocs.length} sources loaded · Win themes
                          and RFP knowledge feed every function
                        </p>
                      </div>
                    </div>

                    {/* Pre-set functions */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3">Pre-set Functions</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {[
                          { id: 'cover-page', label: '1 · Cover Page', desc: 'Generate the cover page' },
                          { id: 'win-themes', label: '2 · Win Themes', desc: 'Integrate win themes' },
                          { id: 'competition', label: '3 · Competition', desc: 'Analyze the competition' },
                          { id: 'write-sections', label: '4 · Sections', desc: 'Write proposal sections' },
                          { id: 'assemble', label: '5 · Assemble', desc: 'Assemble full proposal' },
                        ].map(fn => (
                          <button
                            key={fn.id}
                            onClick={() => {
                              const extra: any = {};
                              if (fn.id === 'win-themes' && winThemesInput.trim()) {
                                extra.winThemes = winThemesInput
                                  .split('\n')
                                  .map(s => s.trim())
                                  .filter(Boolean);
                              }
                              if (fn.id === 'write-sections' && sectionsInput.trim()) {
                                extra.sections = sectionsInput
                                  .split(',')
                                  .map(s => s.trim())
                                  .filter(Boolean);
                              }
                              runProposalAction(fn.id, extra);
                            }}
                            disabled={proposalLoading}
                            className="bg-gray-700 hover:bg-purple-700 disabled:opacity-50 rounded-lg p-3 text-left"
                          >
                            <span className="font-medium text-white">{fn.label}</span>
                            <span className="block text-xs text-gray-400 mt-1">{fn.desc}</span>
                          </button>
                        ))}
                      </div>

                      {/* Optional inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Win themes (one per line — optional)
                          </label>
                          <textarea
                            value={winThemesInput}
                            onChange={e => setWinThemesInput(e.target.value)}
                            rows={3}
                            placeholder="e.g., Proven 12-year VA EHR track record..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Sections to write (comma-separated — optional)
                          </label>
                          <textarea
                            value={sectionsInput}
                            onChange={e => setSectionsInput(e.target.value)}
                            rows={3}
                            placeholder="Technical Approach, Management Plan, Past Performance"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Output */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Output</h3>
                        <div className="flex items-center gap-3">
                          {proposalLoading && (
                            <span className="text-xs text-purple-400">
                              Running {proposalAction}...
                            </span>
                          )}
                          {!proposalLoading && proposalMarkdown && (
                            <button
                              onClick={saveProposalToVault}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white"
                            >
                              💾 Save to Vault
                            </button>
                          )}
                        </div>
                      </div>
                      {proposalMarkdown ? (
                        <div className="bg-gray-900 rounded-lg p-4 max-h-[480px] overflow-y-auto">
                          <MarkdownRenderer content={proposalMarkdown} />
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          Run a pre-set function to generate proposal content here.
                        </p>
                      )}
                    </div>

                    {/* Export */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-3">Export</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-2">Word Document</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <input
                              value={coverTitle}
                              onChange={e => setCoverTitle(e.target.value)}
                              placeholder="Proposal title"
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <input
                              value={coverSubtitle}
                              onChange={e => setCoverSubtitle(e.target.value)}
                              placeholder="Subtitle"
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <input
                              value={coverAgency}
                              onChange={e => setCoverAgency(e.target.value)}
                              placeholder="Agency"
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <input
                              value={coverSolicitation}
                              onChange={e => setCoverSolicitation(e.target.value)}
                              placeholder="Solicitation No."
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <input
                              value={coverDueDate}
                              onChange={e => setCoverDueDate(e.target.value)}
                              placeholder="Due date"
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                            <input
                              value={deckCompany}
                              onChange={e => setDeckCompany(e.target.value)}
                              placeholder="Company name"
                              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <label className="text-xs text-gray-400">Logo:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="text-xs text-gray-400"
                            />
                            {logoBase64 && <span className="text-xs text-green-400">✓ loaded</span>}
                          </div>
                          <textarea
                            value={proprietaryNotice}
                            onChange={e => setProprietaryNotice(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm mb-3"
                            placeholder="Proprietary notice (footer of every page)"
                          />
                          <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs text-gray-400">Body font</label>
                            <select
                              value={docFontSize}
                              onChange={e => setDocFontSize(e.target.value as '10' | '12')}
                              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                              title="Times New Roman — 12 pt default, 10 pt optional"
                            >
                              <option value="12">Times Roman 12 pt</option>
                              <option value="10">Times Roman 10 pt</option>
                            </select>
                          </div>
                          <button
                            onClick={() =>
                              exportDocument('export-word', {
                                fontSize: Number(docFontSize),
                                cover: {
                                  title: coverTitle || selectedProject?.name || 'Proposal',
                                  subtitle: coverSubtitle,
                                  agency: coverAgency,
                                  solicitationNumber: coverSolicitation,
                                  dueDate: coverDueDate,
                                  companyName: deckCompany || selectedBrand?.name || '',
                                  logoBase64,
                                  date: deckDate || new Date().toLocaleDateString(),
                                },
                              })
                            }
                            disabled={proposalLoading || !proposalMarkdown}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded text-sm"
                          >
                            Generate Word (.docx)
                          </button>
                        </div>

                        <div className="bg-gray-900 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-2">Presentations</h4>
                          <button
                            onClick={autoGeneratePresentations}
                            disabled={proposalLoading}
                            className="w-full mb-3 px-3 py-2 bg-purple-600/40 hover:bg-purple-700 disabled:opacity-50 rounded text-sm border border-purple-700"
                          >
                            ✨ Auto-generate from proposal
                          </button>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                              onClick={() =>
                                exportDocument('export-capture-deck', { deck: { sections: [] } })
                              }
                              disabled={proposalLoading || !proposalMarkdown}
                              className="px-3 py-2 bg-gray-700 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                            >
                              Capture Deck
                            </button>
                            <button
                              onClick={() =>
                                exportDocument('export-quad-chart', {
                                  quadrants: parseQuadrants(),
                                  pageTitle: selectedProject?.name || 'Quad Chart',
                                })
                              }
                              disabled={proposalLoading}
                              className="px-3 py-2 bg-gray-700 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                            >
                              Quad Chart
                            </button>
                            <button
                              onClick={() =>
                                exportDocument('export-gantt', { tasks: parseGantt() })
                              }
                              disabled={proposalLoading}
                              className="px-3 py-2 bg-gray-700 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                            >
                              Schedule (Gantt)
                            </button>
                            <button
                              onClick={() =>
                                exportDocument('export-staffing', {
                                  staffing: parseStaffing(),
                                  subtitle: selectedProject?.name || 'Staffing',
                                })
                              }
                              disabled={proposalLoading}
                              className="px-3 py-2 bg-gray-700 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                            >
                              Staffing Report
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <textarea
                              value={ganttInput}
                              onChange={e => setGanttInput(e.target.value)}
                              rows={2}
                              placeholder="Gantt: Task|start|end|status (one per line)"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                            />
                            <textarea
                              value={staffingInput}
                              onChange={e => setStaffingInput(e.target.value)}
                              rows={2}
                              placeholder="Staffing: Labor Cat|Name|Role|Level|LOE|Status"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                            />
                            <textarea
                              value={quadrantInput}
                              onChange={e => setQuadrantInput(e.target.value)}
                              rows={2}
                              placeholder="Quad: Name: point; point"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Memory Tab - AI-managed context with optional editing */}
            {viewMode === 'memory' && (
              <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">🧠 AI Memory & Soul</h2>
                      <p className="text-sm text-gray-400">
                        Memory is built automatically through conversations. Toggle to manual mode
                        to edit directly.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm ${memoryMode === 'auto' ? 'text-cyan-400' : 'text-gray-400'}`}
                      >
                        {memoryMode === 'auto' ? '🤖 Auto Mode' : '✏️ Manual Mode'}
                      </span>
                      <button
                        onClick={() => setMemoryMode(memoryMode === 'auto' ? 'manual' : 'auto')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          memoryMode === 'auto'
                            ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {memoryMode === 'auto' ? 'Enable Manual Editing' : 'Enable Auto Mode'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Soul Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">✨ AI Soul</h2>
                      <p className="text-sm text-gray-400">
                        Defines how the AI should behave and respond.
                      </p>
                    </div>
                    {memoryMode === 'manual' && !editingSoul && (
                      <button
                        onClick={() => {
                          setEditedSoul(soulData);
                          setEditingSoul(true);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                      >
                        ✏️ Edit Soul
                      </button>
                    )}
                  </div>

                  {editingSoul ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedSoul}
                        onChange={e => setEditedSoul(e.target.value)}
                        className="w-full h-64 bg-gray-900 text-white border border-gray-700 rounded-lg p-4 font-mono text-sm"
                        placeholder="Enter your AI Soul..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveSoul}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={() => setEditingSoul(false)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/30">
                      <pre className="whitespace-pre-wrap text-sm text-gray-200 font-mono">
                        {soulData || 'No soul defined. Click Edit to create one.'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Memory Context Section */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">📋 Memory Context</h2>
                      <p className="text-sm text-gray-400">
                        AI-managed context including user info, projects, and learned knowledge.
                      </p>
                    </div>
                    {memoryMode === 'manual' && (
                      <button
                        onClick={() => setEditingMemory(!editingMemory)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                      >
                        {editingMemory ? '👁️ View Mode' : '✏️ Edit Memory'}
                      </button>
                    )}
                  </div>

                  {memoryLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Loading memory...</p>
                    </div>
                  ) : editingMemory ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      {/* User Info Edit */}
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-400 mb-3">User Profile</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Name"
                            defaultValue={memoryData?.user?.name}
                            className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2"
                            onChange={e => {
                              if (memoryData) {
                                memoryData.user.name = e.target.value;
                              }
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Role"
                            defaultValue={memoryData?.user?.role}
                            className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2"
                            onChange={e => {
                              if (memoryData) {
                                memoryData.user.role = e.target.value;
                              }
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Organization"
                            defaultValue={memoryData?.user?.organization}
                            className="bg-gray-900 text-white border border-gray-600 rounded px-3 py-2"
                            onChange={e => {
                              if (memoryData) {
                                memoryData.user.organization = e.target.value;
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Knowledge Edit */}
                      <div className="bg-gray-700/50 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-400 mb-3">Knowledge</h3>
                        <div className="space-y-3">
                          {memoryData?.knowledge?.map((k: any, i: number) => (
                            <div key={i} className="bg-gray-800 rounded p-3">
                              <input
                                type="text"
                                defaultValue={k.title}
                                className="w-full bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 mb-2"
                                placeholder="Title"
                              />
                              <textarea
                                defaultValue={k.content}
                                className="w-full h-20 bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 text-sm"
                                placeholder="Content"
                              />
                            </div>
                          )) || <p className="text-gray-500 text-sm">No knowledge entries yet.</p>}
                        </div>
                      </div>

                      <button
                        onClick={() => saveMemory(memoryData)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="space-y-6">
                      {/* User Info */}
                      {memoryData?.user && (
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h3 className="font-semibold text-purple-400 mb-2">User Profile</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {memoryData.user.name && (
                              <div>
                                <span className="text-gray-400">Name:</span> {memoryData.user.name}
                              </div>
                            )}
                            {memoryData.user.role && (
                              <div>
                                <span className="text-gray-400">Role:</span> {memoryData.user.role}
                              </div>
                            )}
                            {memoryData.user.organization && (
                              <div>
                                <span className="text-gray-400">Organization:</span>{' '}
                                {memoryData.user.organization}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {memoryData?.projects?.length > 0 && (
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h3 className="font-semibold text-purple-400 mb-2">Procurements</h3>
                          <div className="space-y-2">
                            {memoryData.projects.map((p: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span>{p.name}</span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    p.status === 'active'
                                      ? 'bg-green-900/50 text-green-300'
                                      : p.status === 'completed'
                                        ? 'bg-blue-900/50 text-blue-300'
                                        : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Knowledge Sections */}
                      {memoryData?.knowledge?.length > 0 && (
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h3 className="font-semibold text-purple-400 mb-2">Knowledge</h3>
                          <div className="space-y-3">
                            {memoryData.knowledge.map((k: any, i: number) => (
                              <div key={i} className="border-l-2 border-purple-500 pl-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{k.title}</span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      k.importance === 'critical'
                                        ? 'bg-red-900/50 text-red-300'
                                        : k.importance === 'high'
                                          ? 'bg-orange-900/50 text-orange-300'
                                          : 'bg-gray-600 text-gray-300'
                                    }`}
                                  >
                                    {k.importance}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                                  {k.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Context */}
                      {memoryData?.context && (
                        <div className="bg-gray-700/50 rounded-lg p-4">
                          <h3 className="font-semibold text-purple-400 mb-2">Current Context</h3>
                          <div className="text-sm space-y-1">
                            {memoryData.context.currentFocus && (
                              <div>
                                <span className="text-gray-400">Current Focus:</span>{' '}
                                {memoryData.context.currentFocus}
                              </div>
                            )}
                            {memoryData.context.recentFiles?.length > 0 && (
                              <div>
                                <span className="text-gray-400">Recent Files:</span>{' '}
                                {memoryData.context.recentFiles.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!memoryData?.knowledge?.length && !memoryData?.projects?.length && (
                        <p className="text-gray-500 text-center py-4">
                          No memory data yet. Memory is built through conversations with the AI.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    💡 <strong>How it works:</strong> In <strong>Auto Mode</strong>, the AI
                    automatically updates your memory and soul during conversations using the{' '}
                    <code className="bg-blue-900/50 px-1 rounded">/memory</code> command. Switch to{' '}
                    <strong>Manual Mode</strong> to edit directly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Research / Org Chart Viewer */}
      {(researchMarkdown || orgChartMarkdown) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">
                {orgChartMarkdown ? '🏛️ Customer Org Chart' : '🔎 Market Research'} —{' '}
                {selectedProject?.name || 'Procurement'}
              </h2>
              <button
                onClick={() => {
                  setResearchMarkdown('');
                  setOrgChartMarkdown('');
                  setOrgChartContactsAdded(0);
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 text-xs text-gray-500">
                {orgChartMarkdown
                  ? 'Org structure and key individuals compiled from the solicitation and public sources. A copy is stored in the org chart markdown file and as a generated output.'
                  : 'Compiled from public web sources. A copy is stored in the research markdown file and as a generated output for this procurement.'}
              </div>
              {orgChartMarkdown && orgChartContactsAdded > 0 && (
                <div className="mb-4 px-3 py-2 bg-green-900/40 border border-green-600/40 rounded text-xs text-green-300">
                  ✅ {orgChartContactsAdded} key individual(s) added to your contacts.
                </div>
              )}
              <div className="text-sm">
                <MarkdownRenderer content={orgChartMarkdown || researchMarkdown} />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(orgChartMarkdown || researchMarkdown);
                  } catch {
                    /* ignore */
                  }
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
              >
                Copy Markdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt modal */}
      {promptModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-xl">
            <form
              onSubmit={e => {
                e.preventDefault();
                promptModal.onSubmit(promptValues);
              }}
            >
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">{promptModal.title}</h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                {promptModal.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {f.label}
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={promptValues[f.key] ?? f.defaultValue ?? ''}
                      onChange={e =>
                        setPromptValues(v => ({ ...v, [f.key]: e.target.value }))
                      }
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPromptModal(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">{confirmModal.title}</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-300 whitespace-pre-line">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-3 border-t border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm text-white"
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
