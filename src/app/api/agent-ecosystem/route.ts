import { NextRequest, NextResponse } from 'next/server';
import { agentEcosystemResearch } from '@/lib/agent/agent-ecosystem-research';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const capability = searchParams.get('capability');

  try {
    switch (action) {
      case 'research':
        const shouldRun = agentEcosystemResearch.shouldRunResearch();
        if (!shouldRun) {
          const cached = agentEcosystemResearch.getCachedFrameworks();
          return NextResponse.json({
            cached: true,
            frameworks: cached,
            message: 'Using cached research. Run research again in 24 hours.',
          });
        }

        const report = await agentEcosystemResearch.researchEcosystem();
        return NextResponse.json({
          success: true,
          report,
        });

      case 'frameworks':
        const frameworks = agentEcosystemResearch.getCachedFrameworks();
        return NextResponse.json({
          frameworks,
          count: frameworks.length,
        });

      case 'recommendations':
        if (!capability) {
          const latestReport = agentEcosystemResearch.getLatestReport();
          return NextResponse.json({
            suggestions: latestReport?.suggestedIntegrations || [],
          });
        }

        const recommendations = agentEcosystemResearch.getRecommendationsForCapability(capability);
        return NextResponse.json({
          capability,
          recommendations,
        });

      case 'history':
        const history = agentEcosystemResearch.getReportHistory();
        return NextResponse.json({
          reports: history,
          count: history.length,
        });

      case 'latest':
        const latest = agentEcosystemResearch.getLatestReport();
        return NextResponse.json({
          report: latest,
        });

      default:
        return NextResponse.json({
          endpoints: {
            'GET ?action=research': 'Research agent ecosystem (runs every 24h)',
            'GET ?action=frameworks': 'Get cached framework list',
            'GET ?action=recommendations': 'Get integration recommendations',
            'GET ?action=recommendations&capability=X': 'Get recommendations for specific capability',
            'GET ?action=history': 'Get research report history',
            'GET ?action=latest': 'Get latest research report',
          },
          knownFrameworks: [
            'OpenClaw', 'AutoGPT', 'LangChain', 'LlamaIndex', 'CrewAI',
            'AutoGen', 'AgentGPT', 'BabyAGI', 'SuperAGI', 'GPT-Engineer',
            'LangGraph', 'Haystack', 'MemGPT', 'Mem0', 'AgentOps',
            'Phoenix', 'Ragas', 'DeepEval', 'Dify', 'Flowise',
            'Semantic Kernel', 'OpenAI Swarm', 'Agent Zero', 'Remotion',
          ],
        });
    }
  } catch (error) {
    console.error('[Agent Ecosystem API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}