'use client';

import { WorkspaceManager } from '@/components/WorkspaceManager';

export default function WorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Workspace</h1>
          <p className="text-gray-400 mt-1">
            Organize documents into folders, manage brand profiles, and track projects
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 h-[700px]">
          <WorkspaceManager />
        </div>
      </div>
    </div>
  );
}
