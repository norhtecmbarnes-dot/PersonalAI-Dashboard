export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class TokenOptimizer {
  private static maxContextTokens = 4096;
  private static reservedTokens = 512;
  private static availableForContext = this.maxContextTokens - this.reservedTokens;

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static compressMessage(message: ConversationMessage): ConversationMessage {
    let content = message.content;
    
    content = content.replace(/\s+/g, ' ');
    content = content.replace(/(\.)\1{2,}/g, '.');
    
    const importantPatterns = [
      /```[\s\S]*?```/g,
      /`[^`]+`/g,
      /\*\*[^*]+\*\*/g,
    ];
    
    for (const pattern of importantPatterns) {
      content = content.replace(pattern, (match) => match);
    }
    
    return { ...message, content };
  }

  static optimizeContext(
    messages: ConversationMessage[],
    systemPrompt: string,
    additionalContext: string = ''
  ): { messages: ConversationMessage[]; system: string; context: string } {
    const systemTokens = this.estimateTokens(systemPrompt);
    const contextTokens = this.estimateTokens(additionalContext);
    
    let availableTokens = this.availableForContext - systemTokens - contextTokens;
    
    const compressedMessages = messages.map(m => this.compressMessage(m));
    
    const result: ConversationMessage[] = [];
    
    for (let i = compressedMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens(compressedMessages[i].content);
      
      if (availableTokens - msgTokens >= 0) {
        result.unshift(compressedMessages[i]);
        availableTokens -= msgTokens;
      } else {
        break;
      }
    }

    return {
      messages: result,
      system: systemPrompt,
      context: additionalContext,
    };
  }

  static truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const maxChars = maxTokens * 4;
    let truncated = text.slice(0, maxChars);
    
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastPeriod > maxChars * 0.8) {
      truncated = truncated.slice(0, lastPeriod + 1);
    } else if (lastSpace > maxChars * 0.8) {
      truncated = truncated.slice(0, lastSpace);
    }

    return truncated + '...';
  }

  static summarizeLongContent(content: string, maxTokens = 500): string {
    const tokens = this.estimateTokens(content);
    
    if (tokens <= maxTokens) {
      return content;
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const summary: string[] = [];
    let tokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (tokenCount + sentenceTokens <= maxTokens) {
        summary.push(sentence);
        tokenCount += sentenceTokens;
      } else if (summary.length === 0) {
        summary.push(this.truncateToTokenLimit(sentence, maxTokens));
        break;
      } else {
        break;
      }
    }

    return summary.join('. ') + (content.endsWith('.') ? '.' : '');
  }

  static getUsageStats(usage: TokenUsage): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costEstimate: number;
  } {
    const promptCostPer1k = 0.001;
    const completionCostPer1k = 0.002;

    return {
      promptTokens: usage.prompt,
      completionTokens: usage.completion,
      totalTokens: usage.total,
      costEstimate: (usage.prompt / 1000 * promptCostPer1k) + 
                   (usage.completion / 1000 * completionCostPer1k),
    };
  }
}
