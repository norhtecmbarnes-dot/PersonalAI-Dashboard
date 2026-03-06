import { NextResponse } from 'next/server';
import { streamChatCompletion, chatCompletion } from '@/lib/models/sdk.server';
import { vectorLake } from '@/lib/storage/vector-lake';
import { performWebSearch } from '@/lib/websearch';
import { ollamaWebSearch, webSearchToolDefinition, executeWebSearchTool } from '@/lib/browser/web-search-tool';
import { executeBrowserTool, agentBrowserToolDefinition } from '@/lib/browser/agent-browser-service';
import { aiTools } from '@/lib/browser/ai-tools';
import { mathTools } from '@/lib/utils/math-tools';
import { SYSTEM_PROMPT, GREETING } from '@/lib/config/system-prompt';
import { userPreferences } from '@/lib/config/user-preferences';
import { memoryFileService } from '@/lib/services/memory-file';
import { validateString, validateArray, sanitizeString, sanitizeObject } from '@/lib/utils/validation';
import { injectMemoryContext } from '@/lib/memory/memory-injector';
import { memoryStore } from '@/lib/memory/persistent-store';
import { rlTrainer, getRLStats, recordFeedback, logConversationTurn } from '@/lib/agent/rl-trainer';
import { aiSecurityScanner, getSecurityStatus } from '@/lib/security/ai-security-scanner';
import { deaiify, formatDeaiResult, analyzeText, DeAiMode } from '@/lib/writing/de-ai-ify';
import { taskScheduler } from '@/lib/services/task-scheduler';

export interface ChatRequest {
  model: string;
  message: string;
  conversationHistory?: any[];
  useVectorLake?: boolean;
  searchMode?: boolean;
  userName?: string;
  assistantName?: string;
}

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_LENGTH = 100;

export async function POST(request: Request) {
  // Mark session as active - pause low-priority background tasks
  taskScheduler.startSession();
  
  try {
    const body = await request.json();

    // Validate request body
    const messageValidation = validateString(body.message, 'message', { 
      maxLength: MAX_MESSAGE_LENGTH,
      required: true 
    });
    if (!messageValidation.valid) {
      return NextResponse.json(
        { error: messageValidation.error },
        { status: 400 }
      );
    }

    const modelValidation = validateString(body.model, 'model', { required: true });
    if (!modelValidation.valid) {
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 400 }
      );
    }

    const historyValidation = validateArray(body.conversationHistory, 'conversationHistory', { 
      maxLength: MAX_HISTORY_LENGTH 
    });
    if (!historyValidation.valid) {
      return NextResponse.json(
        { error: historyValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const message = sanitizeString(body.message);
    const model = sanitizeString(body.model);
    const conversationHistory = sanitizeObject(body.conversationHistory || []);
    const useVectorLake = Boolean(body.useVectorLake);
    const searchMode = Boolean(body.searchMode);
    const clientUserName = body.userName ? sanitizeString(body.userName) : undefined;
    const clientAssistantName = body.assistantName ? sanitizeString(body.assistantName) : undefined;

    // Handle commands
    // Web search - uses Ollama web search (default)
    if (message.startsWith('/search ')) {
      const query = message.replace('/search ', '').trim();
      // Removed verbose logging to reduce console spam
      
      try {
        const result = await executeWebSearchTool({ query, max_results: 5 });
        return NextResponse.json({
          message: result,
          done: true,
        });
      } catch (error) {
        console.error('[Chat] Ollama search failed:', error);
        // Fallback to legacy search if Ollama search fails
        try {
          const results = await performWebSearch(query);
          const formattedResults = results.map((r, i) => 
            `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.excerpt.slice(0, 200)}...`
          ).join('\n\n');
          return NextResponse.json({
            message: `## Web Search Results for "${query}"\n\n${formattedResults}`,
            done: true,
          });
        } catch (fallbackError) {
          console.error('[Chat] Fallback search also failed:', fallbackError);
          return NextResponse.json({
            message: `## Web Search Error\n\nOllama search: ${error instanceof Error ? error.message : 'Unknown error'}\n\nFallback search: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}\n\n**To fix:**\n1. Get a free API key at https://ollama.com/settings/keys\n2. Add to .env.local: OLLAMA_API_KEY=your-key\n3. Restart the server`,
            done: true,
          });
        }
      }
    }

    // Legacy web search command (kept for compatibility)
    if (message.startsWith('/web ')) {
      const query = message.replace('/web ', '').trim();
      try {
        const result = await executeWebSearchTool({ query, max_results: 5 });
        return NextResponse.json({
          message: result,
          done: true,
        });
      } catch (error) {
        return NextResponse.json({
          message: `## Web Search Error\n\nFailed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message.startsWith('/memory ')) {
      const query = message.replace('/memory ', '').trim();
      try {
        const vlResult = await vectorLake.processQuery(query);
        if (vlResult.context) {
          return NextResponse.json({
            message: `## Memory Search Results\n\n${vlResult.context}`,
            done: true,
          });
        }
      } catch (e) {
        // Fall through to regular chat
      }
    }

    // RL Training commands
    if (message.startsWith('/feedback ')) {
      const parts = message.replace('/feedback ', '').trim().split(' ');
      const feedbackType = parts[0].toLowerCase();
      const conversationId = parts[1];
      const correction = parts.slice(2).join(' ');

      if (!['good', 'bad', 'correction'].includes(feedbackType)) {
        return NextResponse.json({
          message: `## Feedback Error\n\nUsage: /feedback [good|bad|correction] [conversation_id] [correction text]\n\nExample: /feedback good turn_123\nExample: /feedback correction turn_123 You should have checked the scratchpad first`,
          done: true,
        });
      }

      try {
        if (feedbackType === 'correction' && correction) {
          await recordFeedback(conversationId, 'correction', correction);
        } else {
          await recordFeedback(conversationId, feedbackType as 'good' | 'bad');
        }
        return NextResponse.json({
          message: `## Feedback Recorded\n\nFeedback type: **${feedbackType}**\nConversation: ${conversationId}\n\nThe AI will learn from this feedback. Thank you!`,
          done: true,
        });
      } catch (error) {
        return NextResponse.json({
          message: `## Feedback Error\n\nFailed to record feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message === '/rl status' || message === '/rl') {
      try {
        const stats = getRLStats();
        const recentConversations = rlTrainer.getRecentConversations(5);
        
        let response = `## RL Training Status\n\n`;
        response += `**Total Conversations:** ${stats.totalConversations}\n`;
        response += `**Training Pairs:** ${stats.totalTrainingPairs}\n`;
        response += `**Good Responses:** ${stats.goodResponses}\n`;
        response += `**Bad Responses:** ${stats.badResponses}\n`;
        response += `**Corrected Responses:** ${stats.correctedResponses}\n`;
        response += `**Average Score:** ${stats.averageScore.toFixed(2)}\n`;
        response += `**Lessons Learned:** ${stats.improvementsLearned}\n`;
        response += `**Training Runs:** ${stats.trainingRunsCompleted}\n`;
        response += `**Last Training:** ${stats.lastTrainingRun ? new Date(stats.lastTrainingRun).toLocaleString() : 'Never'}\n\n`;
        
        if (recentConversations.length > 0) {
          response += `### Recent Conversations\n`;
          for (const conv of recentConversations) {
            const score = conv.score ? conv.score.toFixed(2) : 'pending';
            const feedback = conv.feedback || 'none';
            response += `- Score: ${score} | Feedback: ${feedback} | ${conv.userMessage.slice(0, 50)}...\n`;
          }
        }

        return NextResponse.json({ message: response, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## RL Status Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message === '/rl train') {
      try {
        const result = await rlTrainer.runTrainingSession();
        return NextResponse.json({
          message: `## RL Training Complete\n\n**Pairs Processed:** ${result.pairsProcessed}\n**Lessons Extracted:** ${result.lessonsExtracted}\n**Memories Updated:** ${result.memoriesUpdated}`,
          done: true,
        });
      } catch (error) {
        return NextResponse.json({
          message: `## RL Training Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    // Security commands
    if (message === '/security scan' || message === '/security') {
      try {
        const { securityAgent } = await import('@/lib/agent/security-agent');
        const report = await securityAgent.performSecurityScan();
        
        let response = `## Security Scan Complete\n\n`;
        response += `**Risk Score:** ${report.riskScore}/100\n`;
        response += `**Duration:** ${report.scanDuration}ms\n`;
        response += `**Findings:** ${report.findings.length}\n\n`;
        
        const critical = report.findings.filter(f => f.severity === 'critical');
        const high = report.findings.filter(f => f.severity === 'high');
        const medium = report.findings.filter(f => f.severity === 'medium');
        
        if (critical.length > 0) {
          response += `### Critical Issues (${critical.length})\n`;
          critical.slice(0, 3).forEach(f => {
            response += `- **${f.title}**\n  ${f.description}\n`;
            if (f.location) response += `  Location: ${f.location}\n`;
          });
          if (critical.length > 3) response += `  *...and ${critical.length - 3} more*\n`;
          response += `\n`;
        }
        
        if (high.length > 0) {
          response += `### High Issues (${high.length})\n`;
          high.slice(0, 3).forEach(f => {
            response += `- **${f.title}**\n`;
          });
          if (high.length > 3) response += `  *...and ${high.length - 3} more*\n`;
          response += `\n`;
        }
        
        response += `### Summary\n${report.summary}\n`;
        
        return NextResponse.json({ message: response, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## Security Scan Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message === '/security quick') {
      try {
        const { securityAgent } = await import('@/lib/agent/security-agent');
        const result = await securityAgent.performQuickScan();
        const report = aiSecurityScanner.generateReport(result);
        
        return NextResponse.json({ message: report, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## Quick Scan Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message === '/security status') {
      try {
        const status = await getSecurityStatus();
        
        let response = `## Security Status\n\n`;
        response += `**Risk Level:** ${status.riskLevel.toUpperCase()}\n`;
        response += `**Total Issues:** ${status.issueCount}\n`;
        
        if (status.lastScan) {
          response += `**Last Scan:** ${new Date(status.lastScan.timestamp).toLocaleString()}\n`;
          response += `**Last Risk Score:** ${status.lastScan.riskScore}/100\n`;
          response += `\n### Last Scan Summary\n`;
          response += `- Critical: ${status.lastScan.summary.critical}\n`;
          response += `- High: ${status.lastScan.summary.high}\n`;
          response += `- Medium: ${status.lastScan.summary.medium}\n`;
          response += `- Low: ${status.lastScan.summary.low}\n`;
        } else {
          response += `\n*No previous scans found. Run \`/security scan\` to perform a security audit.*\n`;
        }
        
        return NextResponse.json({ message: response, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## Security Status Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    // De-AI-ify command - transforms AI-generated text to human voice
    if (message.startsWith('/de-ai-ify ')) {
      const input = message.replace('/de-ai-ify ', '').trim();
      
      // Parse options
      let mode: DeAiMode = 'strict';
      let threshold = 8;
      let text = input;
      
      // Check for mode flags
      if (input.includes('--preserve-formal')) {
        mode = 'preserve-formal';
        text = text.replace('--preserve-formal', '').trim();
      } else if (input.includes('--academic')) {
        mode = 'academic';
        text = text.replace('--academic', '').trim();
      }
      
      // Check for threshold
      const thresholdMatch = text.match(/--threshold\s+(\d+)/);
      if (thresholdMatch) {
        threshold = parseInt(thresholdMatch[1]);
        text = text.replace(/--threshold\s+\d+/, '').trim();
      }
      
      // Check for --analyze flag (just analyze, don't transform)
      if (input.includes('--analyze')) {
        text = text.replace('--analyze', '').trim();
        const analysis = analyzeText(text);
        let response = `## AI Detection Analysis\n\n`;
        response += `**Human-ness Score:** ${analysis.score.toFixed(1)}/10\n`;
        response += `**AI Patterns Found:** ${analysis.patternCount}\n\n`;
        
        if (analysis.issues.length > 0) {
          response += `### Issues Detected\n`;
          for (const issue of analysis.issues) {
            response += `- ${issue}\n`;
          }
          response += `\n`;
        }
        
        if (analysis.suggestions.length > 0) {
          response += `### Suggestions\n`;
          for (const suggestion of analysis.suggestions) {
            response += `- ${suggestion}\n`;
          }
        }
        
        return NextResponse.json({ message: response, done: true });
      }
      
      if (!text || text.length < 10) {
        return NextResponse.json({
          message: `## De-AI-ify Help\n\nTransform AI-generated text to human voice.\n\n**Usage:**\n\`\`\`\n/de-ai-ify <text>\n/de-ai-ify <text> --preserve-formal\n/de-ai-ify <text> --academic\n/de-ai-ify <text> --analyze\n/de-ai-ify <text> --threshold 7\n\`\`\`\n\n**Modes:**\n- (default) Strict - Removes all 47 AI patterns\n- \`--preserve-formal\` - Keeps some formal language for business docs\n- \`--academic\` - Preserves academic conventions\n\n**Options:**\n- \`--analyze\` - Just analyze, don't transform\n- \`--threshold N\` - Target score (default: 8)\n\n**Example:**\n\`\`\`\n/de-ai-ify In today's rapidly evolving digital landscape, it's crucial to leverage cutting-edge solutions.\n\`\`\``,
          done: true,
        });
      }
      
      try {
        const result = deaiify(text, mode, { scoreThreshold: threshold });
        const response = formatDeaiResult(result);
        return NextResponse.json({ message: response, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## De-AI-ify Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    // Shorthand /analyze for quick AI detection
    if (message.startsWith('/analyze ')) {
      const text = message.replace('/analyze ', '').trim();
      
      if (!text || text.length < 10) {
        return NextResponse.json({
          message: `## Analyze Help\n\nAnalyze text for AI patterns.\n\n**Usage:** \`/analyze <text>\`\n\n**Example:**\n\`\`\`\n/analyze In today's fast-paced world, leveraging data is crucial for success.\n\`\`\``,
          done: true,
        });
      }
      
      try {
        const analysis = analyzeText(text);
        let response = `## AI Detection Analysis\n\n`;
        response += `**Human-ness Score:** ${analysis.score.toFixed(1)}/10 `;
        
        if (analysis.score >= 8) response += `✨ Natural voice\n`;
        else if (analysis.score >= 6) response += `⚠️ Needs refinement\n`;
        else response += `👤 AI-generated\n`;
        
        response += `**AI Patterns Found:** ${analysis.patternCount}\n\n`;
        
        if (analysis.issues.length > 0) {
          response += `### Issues\n`;
          for (const issue of analysis.issues) {
            response += `- ${issue}\n`;
          }
        }
        
        return NextResponse.json({ message: response, done: true });
      } catch (error) {
        return NextResponse.json({
          message: `## Analysis Error\n\n${error instanceof Error ? error.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    if (message.startsWith('/sam ')) {
      const query = message.replace('/sam ', '').trim();
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sam?keyword=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.opportunities?.length > 0) {
          const formatted = data.opportunities.slice(0, 5).map((o: any, i: number) => 
            `${i + 1}. **${o.title}**\n   ${o.description?.slice(0, 150)}...\n   Posted: ${o.postedDate}`
          ).join('\n\n');
          return NextResponse.json({
            message: `## SAM.gov Opportunities for "${query}"\n\n${formatted}`,
            done: true,
          });
        }
      } catch (e) {
        // Fall through
      }
    }

    // Handle /math command - use math tools
    if (message.startsWith('/math ')) {
      const mathExpr = message.replace('/math ', '').trim();
      try {
        const result = mathTools.calculate(mathExpr);
        if (result.success) {
          return NextResponse.json({
            message: `## Calculation Result\n\n**${mathExpr}** = ${result.result}`,
            done: true,
          });
        } else {
          return NextResponse.json({
            message: `## Calculation Error\n\n${result.error}`,
            done: true,
          });
        }
      } catch (e) {
        return NextResponse.json({
          message: `## Math Error\n\nFailed to calculate: ${mathExpr}`,
          done: true,
        });
      }
    }

    // Handle /visualize command - generate Chart.js code
    if (message.startsWith('/visualize ')) {
      const vizRequest = message.replace('/visualize ', '').trim();
      
      const vizPrompt = `Generate a Chart.js visualization code based on this request: "${vizRequest}"

Return ONLY the HTML/JS code for the chart using Chart.js. The code should include:
- A <canvas id="myChart"></canvas> element
- The chart initialization script

Example format:
<h2>Chart Title</h2>
<canvas id="myChart"></canvas>
<script>
  const ctx = document.getElementById('myChart').getContext('2d');
  const myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Label1', 'Label2', 'Label3'],
      datasets: [{
        label: 'Dataset',
        data: [12, 19, 3],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
      }]
    },
    options: { responsive: true }
  });
</script>

Generate appropriate chart type (line, bar, pie, doughnut, etc.) based on the request. Use modern colors. Return ONLY the HTML code, no explanations.`;

      try {
        const result = await streamChatCompletion({
          model: 'ollama/qwen3.5:9b',
          messages: [
            { role: 'system', content: 'You generate Chart.js visualization code. Return ONLY HTML code, no markdown code blocks.' },
            { role: 'user', content: vizPrompt },
          ],
        });

        let chartCode = '';
        if (result.message) {
          if (typeof result.message === 'string') {
            chartCode = result.message;
          } else if (result.message.content) {
            chartCode = result.message.content;
          }
        }
        chartCode = chartCode.replace(/```html|```/g, '').trim();
        
        if (chartCode.includes('<canvas') && chartCode.includes('Chart')) {
          return NextResponse.json({
            message: chartCode,
            done: true,
            visualization: chartCode,
          });
        } else {
          return NextResponse.json({
            message: `## Visualization\n\n${chartCode}`,
            done: true,
          });
        }
      } catch (e) {
        console.error('Visualization error:', e);
        return NextResponse.json({
          message: `## Visualization Error\n\nFailed to generate visualization: ${e instanceof Error ? e.message : 'Unknown error'}`,
          done: true,
        });
      }
    }

    let context = '';
    let vectorLakeUsed = false;
    let vectorLakeData = null;

    if (useVectorLake) {
      try {
        const vlResult = await vectorLake.processQuery(message);
        vectorLakeUsed = true;
        vectorLakeData = vlResult;
        
        if (vlResult.context) {
          context = `\n\nRelevant Context from Knowledge Lake:\n${vlResult.context}\n\n`;
        }

        if (vlResult.organizedData && !vlResult.cached) {
          await vectorLake.saveOrganizedData(vlResult.organizedData);
        }
      } catch (vlError) {
        console.error('VectorLake error:', vlError);
      }
    }

    // Load MEMORY.md context
    let memoryContext = '';
    try {
      const memoryPrompt = memoryFileService.getSystemPrompt();
      memoryContext = `\n\n--- MEMORY CONTEXT ---\n${memoryPrompt}\n\n`;
    } catch (memError) {
      console.error('Memory load error:', memError);
    }

    // Inject persistent memory context
    let persistentMemoryContext = '';
    try {
      await memoryStore.initialize();
      const memoryResult = await injectMemoryContext(message, 1500);
      if (memoryResult.systemPromptAddition) {
        persistentMemoryContext = memoryResult.systemPromptAddition;
      }
    } catch (memError) {
      console.error('Persistent memory injection error:', memError);
    }

    // Add current message to history - use client-provided names or fallback
    const finalUserName = clientUserName || userPreferences.getUserName() || 'User';
    const finalAssistantName = clientAssistantName || userPreferences.getAssistantName() || 'AI Assistant';
    
    const personalizedSystemPrompt = SYSTEM_PROMPT
      .replace(/{{USER_NAME}}/g, finalUserName)
      .replace(/{{ASSISTANT_NAME}}/g, finalAssistantName);
    
    const messages = [
      { role: 'system', content: persistentMemoryContext + memoryContext + personalizedSystemPrompt },
      ...(conversationHistory as any[]),
      { role: 'user', content: context + message },
    ];

    // Define tools for AI models that support function calling
    // Web search tool is ONLY included when searchMode is enabled
    const tools = searchMode ? [
      webSearchToolDefinition,
      {
        type: 'function',
        function: {
          name: 'scrape_url',
          description: 'Extract content from a webpage. Use this when you need to read the full content of a specific URL, get article text, or extract information from a website.',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to scrape',
              },
            },
            required: ['url'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'screenshot_url',
          description: 'Take a screenshot of a webpage. Use this when you need to see what a website looks like, capture visual information, or verify page layout.',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to screenshot',
              },
            },
            required: ['url'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'research_topic',
          description: 'Conduct deep research on a topic by searching and scraping multiple sources. Use this when you need comprehensive information, want to analyze multiple sources, or need to gather detailed information about a topic.',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'The topic to research',
              },
              depth: {
                type: 'integer',
                description: 'Number of sources to analyze (1-5, default: 3)',
                default: 3,
              },
            },
            required: ['topic'],
          },
        },
      },
      agentBrowserToolDefinition,
    ] : [
      // When search is OFF, only provide memory tools (no web access)
      {
        type: 'function',
        function: {
          name: 'save_memory',
          description: 'Save important information to persistent memory for future reference',
          parameters: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The information to save',
              },
              key: {
                type: 'string',
                description: 'A short key/identifier for this memory',
              },
              category: {
                type: 'string',
                enum: ['user', 'project', 'brand', 'decision', 'knowledge', 'security', 'preference'],
                description: 'Category of the memory',
              },
              importance: {
                type: 'integer',
                description: 'Importance level (1-10, where 10 is most important)',
                default: 5,
              },
            },
            required: ['content', 'key'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_memory',
          description: 'Search persistent memory for relevant past information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              category: {
                type: 'string',
                enum: ['user', 'project', 'brand', 'decision', 'knowledge', 'security', 'preference'],
                description: 'Optional category to filter results',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    // Tool call execution loop - limit to 2 iterations for speed
    const maxToolIterations = 2;
    let currentMessages = [...messages];
    let finalContent = '';
    let toolCallsExecuted: string[] = [];

    // Use fast model - prefer qwen3.5:9b
    const fastModel = model && model.includes('qwen3.5') ? model : 'ollama/qwen3.5:9b';

    for (let iteration = 0; iteration < maxToolIterations; iteration++) {
      const result = await chatCompletion({
        model: fastModel,
        messages: currentMessages,
        temperature: 0.7,
        maxTokens: 2048,  // Reduced for speed
        tools: tools,
      });

      // Extract content
      let messageContent = '';
      if (result.message) {
        if (typeof result.message === 'string') {
          messageContent = result.message;
        } else if (result.message.content) {
          messageContent = result.message.content;
        }
      }

      // Check for tool calls
      if (result.tool_calls && result.tool_calls.length > 0) {
        // Add assistant message with tool calls to history
        currentMessages.push({
          role: 'assistant',
          content: messageContent || '',
          tool_calls: result.tool_calls,
        } as any);

        // Execute each tool call
        for (const toolCall of result.tool_calls) {
          const functionName = toolCall.function.name;
          let functionArgs: any = {};
          
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            functionArgs = {};
          }

          let toolResult = '';

          if (functionName === 'web_search') {
            toolCallsExecuted.push('web_search');
            const searchResult = await executeWebSearchTool(functionArgs);
            toolResult = searchResult;
          } else if (functionName === 'save_memory') {
            toolCallsExecuted.push('save_memory');
            try {
              await memoryStore.initialize();
              await memoryStore.saveMemory({
                content: functionArgs.content,
                key: functionArgs.key,
                category: functionArgs.category || 'knowledge',
                importance: functionArgs.importance || 5,
                metadata: { source: 'conversation' },
              });
              toolResult = `Memory saved: "${functionArgs.key}"`;
            } catch (e) {
              toolResult = `Failed to save memory: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else if (functionName === 'search_memory') {
            toolCallsExecuted.push('search_memory');
            try {
              await memoryStore.initialize();
              const results = await memoryStore.search(functionArgs.query, { category: functionArgs.category });
              toolResult = results.length > 0 
                ? results.map((r: any) => `[${r.memory.key}]: ${r.memory.content}`).join('\n')
                : 'No memories found matching query.';
            } catch (e) {
              toolResult = `Failed to search memory: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else if (functionName === 'browser_automate') {
            toolCallsExecuted.push('browser_automate');
            try {
              toolResult = await executeBrowserTool(functionArgs);
            } catch (e) {
              toolResult = `Browser automation failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else if (functionName === 'scrape_url') {
            toolCallsExecuted.push('scrape_url');
            try {
              const result = await aiTools.scrape_url(functionArgs.url);
              if (result.success) {
                toolResult = `Successfully scraped ${result.result.url}:
Title: ${result.result.title}
Content: ${result.result.content.substring(0, 2000)}${result.result.content.length > 2000 ? '...' : ''}
Links found: ${result.result.links.join(', ')}`;
              } else {
                toolResult = `Failed to scrape URL: ${result.error}`;
              }
            } catch (e) {
              toolResult = `Scraping failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else if (functionName === 'screenshot_url') {
            toolCallsExecuted.push('screenshot_url');
            try {
              const result = await aiTools.screenshot_url(functionArgs.url);
              if (result.success) {
                toolResult = `Screenshot taken of ${result.result.url}. The screenshot is available as base64 data.`;
              } else {
                toolResult = `Failed to take screenshot: ${result.error}`;
              }
            } catch (e) {
              toolResult = `Screenshot failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else if (functionName === 'research_topic') {
            toolCallsExecuted.push('research_topic');
            try {
              const result = await aiTools.research_topic(functionArgs.topic, functionArgs.depth || 3);
              if (result.success) {
                const sources = result.result.sources.map((s: any, i: number) => 
                  `${i + 1}. ${s.title}\n   URL: ${s.url}\n   Content: ${s.content.substring(0, 500)}...`
                ).join('\n\n');
                toolResult = `Research on "${result.result.topic}":\n${result.result.summary}\n\nSources:\n${sources}`;
              } else {
                toolResult = `Research failed: ${result.error}`;
              }
            } catch (e) {
              toolResult = `Research failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
          } else {
            toolResult = `Unknown tool: ${functionName}`;
          }

          // Add tool result to messages
          currentMessages.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            name: functionName,
            content: toolResult,
          } as any);
        }
      } else {
        // No tool calls, we have the final response
        finalContent = messageContent;
        break;
      }
    }

    // If we exhausted iterations, use the last content
    if (!finalContent) {
      finalContent = "I'm still processing. Please ask again.";
    }

    // Log conversation for RL training
    const startTime = Date.now();
    try {
      const conversationId = await logConversationTurn(
        message,
        finalContent,
        model || 'glm-4.7-flash',
        Date.now() - startTime,
        toolCallsExecuted
      );
      
      // End session - resume background tasks
      taskScheduler.endSession();
      
      return NextResponse.json({
        message: finalContent,
        done: true,
        vectorLakeUsed,
        vectorLakeData: vectorLakeData ? {
          cached: vectorLakeData.cached,
          searchTerms: vectorLakeData.searchTerms,
          organizedData: vectorLakeData.organizedData,
        } : null,
        toolCalls: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
        conversationId, // Return for feedback commands
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('[RL] Failed to log conversation:', logError);
      
      // End session - resume background tasks
      taskScheduler.endSession();
      
      return NextResponse.json({
        message: finalContent,
        done: true,
        vectorLakeUsed,
        vectorLakeData: vectorLakeData ? {
          cached: vectorLakeData.cached,
          searchTerms: vectorLakeData.searchTerms,
          organizedData: vectorLakeData.organizedData,
        } : null,
        toolCalls: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Chat error stack:', errorStack);
    
    // End session on error too
    taskScheduler.endSession();
    
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: errorMessage,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}