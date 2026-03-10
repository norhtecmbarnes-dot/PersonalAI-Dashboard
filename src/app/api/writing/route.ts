export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/models/sdk.server';
import { memoryFileService } from '@/lib/services/memory-file';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { sanitizePrompt } from '@/lib/utils/validation';

const EXPAND_PROMPT = `You are an expert writer. Expand on the following text, adding more detail, examples, and depth while maintaining the original voice and style. Make it approximately 2-3x longer while keeping it natural and engaging.

Original text:
"""
{text}
"""

Provide ONLY the expanded text, no explanations or meta-commentary.`;

const OUTLINE_PROMPT = `You are an expert at organizing information. Create a detailed outline from the following topic or content.

Topic/Content:
"""
{text}
"""

Create a hierarchical outline with:
- Main sections (Roman numerals: I, II, III)
- Subsections (letters: A, B, C)  
- Details (numbers: 1, 2, 3)
- Key points for each section

Format:
# {Title}

I. {Main Section}
   A. {Subsection}
      1. {Detail}
      2. {Detail}
   B. {Subsection}
II. {Main Section}
   ...

Provide ONLY the outline, no explanations.`;

const CONTINUE_PROMPT = `You are an expert writer. Continue the following text naturally, maintaining the same style, tone, and context. Write approximately the same length as the original.

Text to continue:
"""
{text}
"""

Provide ONLY the continuation, no explanations or meta-commentary.`;

const REWRITE_PROMPT = `You are an expert editor. Rewrite the following text in the specified style while keeping the same meaning and information.

Original text:
"""
{text}
"""

Style: {style}

Provide ONLY the rewritten text, no explanations.`;

const SIMPLIFY_PROMPT = `You are an expert at making complex topics easy to understand. Simplify the following text for a general audience while keeping the key information.

Original text:
"""
{text}
"""

Provide ONLY the simplified text, no explanations.`;

const ELABORATE_PROMPT = `You are an expert at adding depth and detail. Add comprehensive elaboration to the following points, including examples, evidence, and explanations.

Points to elaborate:
"""
{text}
"""

Provide ONLY the elaborated content, no explanations.`;

const STRUCTURE_PROMPT = `You are an expert at organizing content. Structure the following information into a clear, logical format with headers, bullet points, and sections.

Content:
"""
{text}
"""

Provide ONLY the structured content, no explanations.`;

const PROPOSAL_PROMPT = `You are an expert business proposal writer. Generate a comprehensive business proposal based on the following information, using the brand voice and style provided in the context.

Information:
"""
{text}
"""

Generate a professional business proposal that includes:
1. Executive Summary
2. Understanding of Requirements
3. Proposed Solution
4. Timeline & Milestones
5. Deliverables
6. Investment/Pricing (if applicable)
7. Why Choose Us/Company Differentiators
8. Next Steps

Provide ONLY the proposal, no explanations or meta-commentary.`;

const GRAMMAR_PROMPT = `You are an AI assistant tasked with improving a given text to enhance its clarity and coherence for other AI systems. Your job is to review the following text, correct any grammatical or spelling errors, and ensure the logical flow makes sense. Then, you will rewrite the text with these improvements.
Here is the text to review and improve:
"""
{text}
"""

Provide ONLY the improved text, no explanations or meta-commentary.`;

const HUMANIZE_PROMPT = `When it comes to writing content, two factors are crucial, "perplexity" and "burstiness." Perplexity measures the complexity of text. Separately, burstiness compares the variations of sentences. Humans tend to write with greater burstiness, for example, with some longer or complex sentences alongside shorter ones. AI sentences tend to be more uniform. Therefore, when writing the following content I am going to ask you to create, I need it to have a good amount of perplexity and burstiness. Do you understand?

Text to humanize:
"""
{text}
"""

Provide ONLY the humanized text, no explanations or meta-commentary.`;

const SBIR_PROMPT = `You are an expert grant writer specializing in SBIR (Small Business Innovation Research) and other government funding proposals. Generate a comprehensive SBIR/grant proposal based on the following information, using the brand voice and style provided in the context.

Information:
"""
{text}
"""

Generate a professional SBIR/grant proposal that includes:

I. Executive Summary
* Provide a concise overview of the proposed project, including the problem or opportunity, objectives, scope, and expected outcomes

II. Problem Statement
* Clearly articulate the problem or opportunity that the proposed project aims to address
* Provide evidence to support the problem or opportunity, including data, statistics, or other relevant information

III. Objectives
* List the specific, measurable, achievable, relevant, and time-bound (SMART) objectives of the proposed project
* Provide evidence to support the objectives, including research, analysis, or other relevant information

IV. Scope
* Define the scope of the proposed project, including the activities, tasks, and deliverables that will be undertaken
* Provide evidence to support the scope, including project plans, timelines, or other relevant documents

V. Methodology
* Describe the methodology that will be used to achieve the proposed project's objectives, including the research design, data collection methods, and analysis techniques
* Provide evidence to support the methodology, including research protocols, data management plans, or other relevant documents

VI. Expected Outcomes
* Describe the expected outcomes of the proposed project, including the benefits, impacts, and deliverables that will be produced
* Provide evidence to support the expected outcomes, including case studies, pilot projects, or other relevant information

VII. Budget and Cost Estimate
* Provide a detailed budget and cost estimate for the proposed project, including all expenses, revenues, and funding sources
* Provide evidence to support the budget and cost estimate, including financial statements, invoices, or other relevant documents

VIII. Timeline
* Provide a detailed timeline for the proposed project, including all activities, tasks, and milestones that will be undertaken
* Provide evidence to support the timeline, including Gantt charts, project plans, or other scheduling documents

IX. Team and Qualifications
* Provide a detailed description of the team that will be responsible for executing the proposed project, including their qualifications, experience, and expertise
* Provide evidence to support the team's qualifications, including resumes, CVs, or other professional documents

X. Conclusion
* Summarize the main points of the proposal, including the problem or opportunity, objectives, scope, methodology, expected outcomes, benefits, budget, cost estimate, timeline, and team
* Provide a clear call to action, including the next steps that the applicant plans to take to advance the proposed project

XI. Appendices
* Provide any additional supporting materials or documents that may be relevant to the proposal, such as letters of support, case studies, or other evidence that supports the proposal's objectives, scope, and expected outcomes.

Provide ONLY the proposal content, no explanations or meta-commentary.`;

const CAPTURE_PLAN_PROMPT = `Act as a senior government capture manager. Read the attached Request for Proposal and provide a one-page executive summary that includes:
1. Agency and customer
2. Scope of work
3. Key deadlines
4. Contract type
5. Anticipated value
6. Go/No-Go recommendation with justification

Use case: This gives a high-level overview to decide if pursuing the proposal is worthwhile (e.g., go/no-go decision).

RFP Content:
"""
{text}
"""

Provide ONLY the executive summary, no explanations or meta-commentary.`;

const DEADLINE_FINDER_PROMPT = `Scan the attached solicitation and all its appendices. Extract all key dates and deadlines, including the questions due date, proposal submission date, and anticipated award date. Format them as a table.

RFP Content:
"""
{text}
"""

Provide ONLY the date table, no explanations or meta-commentary.`;

const EVALUATION_FACTORS_PROMPT = `Based on Section M of the attached RFP, list the evaluation factors for award in descending order of importance. Specify if the award is LPTA (Lowest Price Technically Acceptable) or Best Value Trade-Off.

RFP Content:
"""
{text}
"""

Provide ONLY the evaluation factors list, no explanations or meta-commentary.`;

const COMPLIANCE_MATRIX_PROMPT = `Analyze the attached RFP, specifically Sections L and M. Create a compliance matrix in a table with four columns: 'Requirement Reference (Section/Page)', 'Requirement Description', 'Our Approach (Leave Blank)', and 'Fully Compliant? (Y/N)'.

RFP Content:
"""
{text}
"""

Provide ONLY the compliance matrix, no explanations or meta-commentary.`;

const PROPOSAL_OUTLINE_PROMPT = `Create a detailed proposal outline for the attached RFP. The outline should include a cover letter, executive summary, and separate volumes for technical approach, past performance, staffing plan, and pricing, structured according to the instructions in Section L.

RFP Content:
"""
{text}
"""

Provide ONLY the proposal outline, no explanations or meta-commentary.`;

const PAST_PERFORMANCE_PROMPT = `Search our library of past projects (attached documents). Find three examples of relevant past performance for the project and extract the project summary, customer POC, and CPARS rating for each.

Project Context:
"""
{text}
"""

Provide ONLY the past performance examples, no explanations or meta-commentary.`;

const RISK_IDENTIFICATION_PROMPT = `Are there any risks, unclear areas or red flags in this solicitation?

RFP Content:
"""
{text}
"""

Provide ONLY the risk assessment, no explanations or meta-commentary.`;

const DIAGRAM_PROMPT = `You are an expert at creating diagrams and visualizations. Generate Mermaid.js diagram code based on the following description.

Diagram Description:
"""
{text}
"""

Generate valid Mermaid.js code for an appropriate diagram type (flowchart, sequence diagram, class diagram, pie chart, etc.) based on the description.

Requirements:
1. Output ONLY the Mermaid code block, no explanations
2. Start with \`\`\`mermaid and end with \`\`\`
3. Include appropriate styling and formatting
4. Make sure the diagram is clear and matches the description
5. Use proper Mermaid syntax

Example output format:
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
\`\`\`

Provide ONLY the Mermaid code block.`;

const BLOG_POST_PROMPT = `You are an expert blog writer. Generate a comprehensive blog post based on the following topic or outline.

Topic/Outline:
"""
{text}
"""

Generate a professional blog post that includes:
1. Engaging headline
2. Introduction that hooks the reader
3. Main content with subheadings
4. Key points and insights
5. Examples or case studies (if applicable)
6. Conclusion with summary and call-to-action
7. SEO-optimized with relevant keywords

Write in a conversational yet professional tone. Target length: 800-1200 words.

Provide ONLY the blog post content, no explanations or meta-commentary.`;

const SOCIAL_MEDIA_PROMPT = `You are a social media marketing expert. Generate engaging social media content based on the following information.

Content Information:
"""
{text}
"""

Generate social media posts for platforms like Twitter/X, LinkedIn, and Instagram. Include:
1. Multiple post variations (3-5)
2. Appropriate hashtags
3. Platform-specific formatting (character limits, emojis, etc.)
4. Engaging hooks
5. Clear call-to-action where appropriate

Make the content shareable, engaging, and platform-appropriate.

Provide ONLY the social media content, no explanations or meta-commentary.`;

const AD_COPY_PROMPT = `You are a professional advertising copywriter. Generate persuasive ad copy based on the following product/service description.

Product/Service Description:
"""
{text}
"""

Generate compelling ad copy that includes:
1. Attention-grabbing headline
2. Key benefits and features
3. Unique selling proposition (USP)
4. Emotional or logical appeals
5. Clear call-to-action
6. Target audience consideration

Create variations for different platforms (Google Ads, Facebook, Instagram, etc.) and formats (short copy, long copy).

Provide ONLY the ad copy, no explanations or meta-commentary.`;

const PRODUCT_DESCRIPTION_PROMPT = `You are an expert e-commerce writer. Generate persuasive product descriptions based on the following product information.

Product Information:
"""
{text}
"""

Generate comprehensive product descriptions that include:
1. Engaging product title
2. Key features and specifications
3. Benefits to the customer
4. Use cases and applications
5. Technical details (if applicable)
6. SEO-optimized keywords
7. Call-to-action for purchase

Write in a persuasive yet informative tone. Create variations for different lengths (short for listings, detailed for product pages).

Provide ONLY the product description(s), no explanations or meta-commentary.`;

const EMAIL_TEMPLATE_PROMPT = `You are an email marketing expert. Generate professional email templates based on the following purpose or context.

Email Purpose/Context:
"""
{text}
"""

Generate complete email templates that include:
1. Subject line (multiple options)
2. Preheader text
3. Greeting
4. Body content with clear messaging
5. Call-to-action button/link
6. Closing and signature
7. Mobile-responsive formatting considerations

Create templates for different purposes (newsletters, promotions, onboarding, follow-ups, etc.) with appropriate tone.

Provide ONLY the email template(s), no explanations or meta-commentary.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, style, model, stream, brandId, projectId } = body;

    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action required' }, { status: 400 });
    }

    const sanitizedText = sanitizePrompt(text, 8000);
    const sanitizedStyle = style ? sanitizePrompt(style, 100) : 'professional';

    let memoryContext = '';
    try {
      memoryContext = memoryFileService.getSystemPrompt().slice(0, 1500);
    } catch (e) {
    }

    let brandContext = '';
    if (brandId) {
      try {
        const context = await brandWorkspace.buildContextForChat(brandId, projectId);
        brandContext = context.systemPrompt.slice(0, 2000);
      } catch (error) {
        console.error('Error building brand context:', error);
      }
    }

    let prompt = '';
    switch (action) {
      case 'expand':
        prompt = EXPAND_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'outline':
        prompt = OUTLINE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'continue':
        prompt = CONTINUE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'rewrite':
        prompt = REWRITE_PROMPT.replace('{text}', sanitizedText).replace('{style}', sanitizedStyle);
        break;
      case 'simplify':
        prompt = SIMPLIFY_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'elaborate':
        prompt = ELABORATE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'structure':
        prompt = STRUCTURE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'proposal':
        prompt = PROPOSAL_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'grammar':
        prompt = GRAMMAR_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'humanize':
        prompt = HUMANIZE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'sbir':
        prompt = SBIR_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'capture_plan':
        prompt = CAPTURE_PLAN_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'deadline_finder':
        prompt = DEADLINE_FINDER_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'evaluation_factors':
        prompt = EVALUATION_FACTORS_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'compliance_matrix':
        prompt = COMPLIANCE_MATRIX_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'proposal_outline':
        prompt = PROPOSAL_OUTLINE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'past_performance':
        prompt = PAST_PERFORMANCE_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'risk_identification':
        prompt = RISK_IDENTIFICATION_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'diagram':
        prompt = DIAGRAM_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'blog_post':
        prompt = BLOG_POST_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'social_media':
        prompt = SOCIAL_MEDIA_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'ad_copy':
        prompt = AD_COPY_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'product_description':
        prompt = PRODUCT_DESCRIPTION_PROMPT.replace('{text}', sanitizedText);
        break;
      case 'email_template':
        prompt = EMAIL_TEMPLATE_PROMPT.replace('{text}', sanitizedText);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action. Use: expand, outline, continue, rewrite, simplify, elaborate, structure, proposal, grammar, humanize, sbir, capture_plan, deadline_finder, evaluation_factors, compliance_matrix, proposal_outline, past_performance, risk_identification, diagram, blog_post, social_media, ad_copy, product_description, email_template' }, { status: 400 });
    }

    const combinedContext = (brandContext ? brandContext + '\n\n' : '') + memoryContext;
    const systemMessage = {
      role: 'system' as const,
      content: combinedContext + '\n\nYou are a skilled writing assistant. Follow instructions precisely and provide only the requested output.'
    };

    const useModel = model || 'kimi-k2.5';
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Writing] Processing:', action, 'with model:', useModel);
    }
    
    // Handle streaming
    if (stream) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            const result = await chatCompletion({
              model: useModel,
              messages: [systemMessage, { role: 'user', content: prompt }],
              temperature: 0.7,
              maxTokens: 4000,
            });

            const content = result.message?.content || '';
            const sseData = JSON.stringify({
              choices: [{ delta: { content }, finish_reason: 'stop' }]
            });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          } catch (error) {
            console.error('Stream error:', error);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Non-streaming response
    const result = await chatCompletion({
      model: useModel,
      messages: [systemMessage, { role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 4000,
    });

    const content = result.message?.content || '';
    
    console.log('[Writing] Result length:', content.length, 'characters');

    return NextResponse.json({
      success: true,
      action,
      result: content,
      model: useModel,
    });
  } catch (error) {
    console.error('Writing assistant error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    actions: [
      {
        name: 'expand',
        description: 'Expand text with more detail, examples, and depth (2-3x longer)',
        parameters: ['text'],
      },
      {
        name: 'outline',
        description: 'Create a detailed hierarchical outline from a topic or content',
        parameters: ['text'],
      },
      {
        name: 'continue',
        description: 'Continue writing from where the text ends',
        parameters: ['text'],
      },
      {
        name: 'rewrite',
        description: 'Rewrite text in a specified style',
        parameters: ['text', 'style (optional: professional, casual, academic, etc.)'],
      },
      {
        name: 'simplify',
        description: 'Simplify complex text for a general audience',
        parameters: ['text'],
      },
      {
        name: 'elaborate',
        description: 'Add comprehensive elaboration with examples and evidence',
        parameters: ['text'],
      },
      {
        name: 'structure',
        description: 'Organize content with headers, bullets, and sections',
        parameters: ['text'],
      },
      {
        name: 'proposal',
        description: 'Generate a business proposal using brand voice',
        parameters: ['text'],
      },
      {
        name: 'grammar',
        description: 'Improve grammar, spelling, and logical flow for AI systems',
        parameters: ['text'],
      },
      {
        name: 'humanize',
        description: 'Add perplexity and burstiness to make text sound more human-written',
        parameters: ['text'],
      },
      {
        name: 'sbir',
        description: 'Generate comprehensive SBIR/grant proposal with all required sections',
        parameters: ['text'],
      },
      {
        name: 'capture_plan',
        description: 'Create executive summary for RFP go/no-go decision',
        parameters: ['text'],
      },
      {
        name: 'deadline_finder',
        description: 'Extract key dates and deadlines from solicitation as table',
        parameters: ['text'],
      },
      {
        name: 'evaluation_factors',
        description: 'List evaluation factors from Section M (LPTA vs Best Value)',
        parameters: ['text'],
      },
      {
        name: 'compliance_matrix',
        description: 'Create compliance matrix table from Sections L and M',
        parameters: ['text'],
      },
      {
        name: 'proposal_outline',
        description: 'Generate detailed proposal outline following Section L',
        parameters: ['text'],
      },
      {
        name: 'past_performance',
        description: 'Find relevant past performance examples from project library',
        parameters: ['text'],
      },
      {
        name: 'risk_identification',
        description: 'Identify risks, unclear areas, and red flags in solicitation',
        parameters: ['text'],
      },
      {
        name: 'diagram',
        description: 'Generate Mermaid.js diagram code from a description',
        parameters: ['text'],
      },
      {
        name: 'blog_post',
        description: 'Generate comprehensive blog post from topic/outline',
        parameters: ['text'],
      },
      {
        name: 'social_media',
        description: 'Generate engaging social media content for multiple platforms',
        parameters: ['text'],
      },
      {
        name: 'ad_copy',
        description: 'Generate persuasive advertising copy for products/services',
        parameters: ['text'],
      },
      {
        name: 'product_description',
        description: 'Generate persuasive product descriptions for e-commerce',
        parameters: ['text'],
      },
      {
        name: 'email_template',
        description: 'Generate professional email templates for marketing',
        parameters: ['text'],
      },
    ],
    usage: 'POST with { action: "expand|outline|proposal|sbir|capture_plan|grammar|humanize|...", text: "your text", model: "optional", stream: false }',
  });
}