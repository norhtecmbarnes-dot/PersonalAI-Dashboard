/**
 * Strips thinking/reasoning tags from AI model responses.
 * 
 * Models like GLM 5.3, DeepSeek, and others wrap their reasoning in:
 * - <think>...</think>
 * - <thinking>...</thinking>
 * - <answer>...</answer>
 * - ```thinking...```
 * 
 * This function removes the thinking parts and extracts the actual answer content.
 */
export function stripThinkingTags(content: string): string {
  if (!content || typeof content !== 'string') return content;

  let cleaned = content;

  // Extract content from <answer> tags if present (some models wrap the final answer)
  const answerMatch = cleaned.match(/<answer[^>]*>([\s\S]*?)<\/answer>/i);
  if (answerMatch) {
    cleaned = answerMatch[1].trim();
  }

  // Strip <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Strip <thinking>...</thinking> blocks
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // Strip ```thinking...``` code blocks
  cleaned = cleaned.replace(/```thinking[\s\S]*?```/gi, '');

  // Strip any remaining <answer> tags (in case we didn't extract above)
  cleaned = cleaned.replace(/<\/?answer[^>]*>/gi, '');

  // Strip Chinese thinking markers
  cleaned = cleaned.replace(/#####+\s*思考[\s\S]*?(?=####|$)/gi, '');

  // Clean up extra whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
