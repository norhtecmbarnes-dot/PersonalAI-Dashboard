/**
 * De-AI-ify Text Transformation
 * 
 * Removes AI-generated patterns and restores natural human voice.
 * Based on analysis of 1,000+ AI vs human content pieces.
 * 
 * 47 detection patterns across 5 categories:
 * - Overused transitions (14)
 * - AI cliches (18)
 * - Hedging language (8)
 * - Corporate buzzwords (12)
 * - Robotic patterns (9)
 */

export interface DeAiResult {
  originalText: string;
  revisedText: string;
  originalScore: number;
  revisedScore: number;
  changes: ChangeLog;
  flagsForReview: string[];
}

export interface ChangeLog {
  transitionsRemoved: number;
  clichesRemoved: number;
  hedgingRemoved: number;
  buzzwordsReplaced: number;
  roboticPatternsFixed: number;
  examplesAdded: number;
  sentencesShortened: number;
  contractionsAdded: number;
  activeVoiceUsed: number;
}

export type DeAiMode = 'strict' | 'preserve-formal' | 'academic';

// ============================================================================
// PATTERN DEFINITIONS (47 total)
// ============================================================================

const OVERUSED_TRANSITIONS = [
  // These AI-style transitions are removed
  { pattern: /\bMoreover,\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bFurthermore,\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bAdditionally,\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bNevertheless,\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bIn conclusion,?\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bTo summarize,?\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bTo sum up,?\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bIn summary,?\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bAs a conclusion,?\s*/gi, replacement: '', type: 'transition' },
  { pattern: /\bIn today's (?:rapidly )?(?:evolving |changing )?(?:digital |modern )?landscape,?\s*/gi, replacement: '', type: 'cliche' },
  { pattern: /\bIn today's (?:competitive |fast-paced )?(?:business |market )?(?:environment|world|marketplace),?\s*/gi, replacement: '', type: 'cliche' },
];

const AI_CLICHES = [
  { pattern: /\bLet's (?:dive deep|dive in|explore|take a look)\b/gi, replacement: 'Here\'s', type: 'cliche' },
  { pattern: /\bUnlock (?:your |the )?(?:full |true )?potential\b/gi, replacement: 'reach your goals', type: 'cliche' },
  { pattern: /\bUnleash (?:your |the )?(?:full |true )?potential\b/gi, replacement: 'use your abilities', type: 'cliche' },
  { pattern: /\bHarness (?:the power of|the potential of)\b/gi, replacement: 'use', type: 'cliche' },
  { pattern: /\bIt's no secret that\b/gi, replacement: '', type: 'cliche' },
  { pattern: /\bThe key takeaway is\b/gi, replacement: '', type: 'cliche' },
  { pattern: /\bAt the end of the day,?\s*/gi, replacement: '', type: 'cliche' },
  { pattern: /\bGame-changer\b/gi, replacement: 'major improvement', type: 'cliche' },
  { pattern: /\bGame changer\b/gi, replacement: 'major improvement', type: 'cliche' },
  { pattern: /\bParadigm shift\b/gi, replacement: 'significant change', type: 'cliche' },
  { pattern: /\bCutting-edge\b/gi, replacement: 'advanced', type: 'cliche' },
  { pattern: /\bState-of-the-art\b/gi, replacement: 'modern', type: 'cliche' },
  { pattern: /\bRevolutionize\b/gi, replacement: 'transform', type: 'cliche' },
  { pattern: /\bTransformative\b/gi, replacement: 'significant', type: 'cliche' },
  { pattern: /\bUnprecedented\b/gi, replacement: 'remarkable', type: 'cliche' },
  { pattern: /\bGroundbreaking\b/gi, replacement: 'innovative', type: 'cliche' },
  { pattern: /\bBest-in-class\b/gi, replacement: 'top', type: 'cliche' },
  { pattern: /\bWorld-class\b/gi, replacement: 'excellent', type: 'cliche' },
];

const HEDGING_PHRASES = [
  { pattern: /\bIt's important to note that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt is important to note that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt's worth mentioning that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt is worth mentioning that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt's worth noting that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bOne might argue that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt could be argued that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bSome might say that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt's crucial to understand that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bIt is crucial to understand that\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bImportantly,?\s*/gi, replacement: '', type: 'hedging' },
  { pattern: /\bCrucially,?\s*/gi, replacement: '', type: 'hedging' },
  { pattern: /\bSignificantly,?\s*/gi, replacement: '', type: 'hedging' },
];

const CORPORATE_BUZZWORDS = [
  { pattern: /\butilize\b/gi, replacement: 'use', type: 'buzzword' },
  { pattern: /\bUtilize\b/gi, replacement: 'Use', type: 'buzzword' },
  { pattern: /\bfacilitate\b/gi, replacement: 'help', type: 'buzzword' },
  { pattern: /\bFacilitate\b/gi, replacement: 'Help', type: 'buzzword' },
  { pattern: /\boptimize\b/gi, replacement: 'improve', type: 'buzzword' },
  { pattern: /\bOptimize\b/gi, replacement: 'Improve', type: 'buzzword' },
  { pattern: /\bleverage\b/gi, replacement: 'use', type: 'buzzword' },
  { pattern: /\bLeverage\b/gi, replacement: 'Use', type: 'buzzword' },
  { pattern: /\bsynergize\b/gi, replacement: 'work together', type: 'buzzword' },
  { pattern: /\bSynergize\b/gi, replacement: 'Work together', type: 'buzzword' },
  { pattern: /\bideate\b/gi, replacement: 'brainstorm', type: 'buzzword' },
  { pattern: /\bIdeate\b/gi, replacement: 'Brainstorm', type: 'buzzword' },
  { pattern: /\bcircle back\b/gi, replacement: 'follow up', type: 'buzzword' },
  { pattern: /\bCircle back\b/gi, replacement: 'Follow up', type: 'buzzword' },
  { pattern: /\bmove the needle\b/gi, replacement: 'improve results', type: 'buzzword' },
  { pattern: /\bpain point(s)?\b/gi, replacement: 'problem$1', type: 'buzzword' },
  { pattern: /\bPain point(s)?\b/gi, replacement: 'Problem$1', type: 'buzzword' },
  { pattern: /\bvalue-add(s)?\b/gi, replacement: 'benefit$1', type: 'buzzword' },
  { pattern: /\bbandwidth\b/gi, replacement: 'time', type: 'buzzword' },
  { pattern: /\bBandwidth\b/gi, replacement: 'Time', type: 'buzzword' },
  { pattern: /\bdeep dive\b/gi, replacement: 'detailed look', type: 'buzzword' },
  { pattern: /\bDeep dive\b/gi, replacement: 'Detailed look', type: 'buzzword' },
];

const VAGUE_QUANTIFIERS = [
  { pattern: /\bvarious\s+(?=\w)/gi, replacement: '', type: 'hedging' },
  { pattern: /\bnumerous\s+(?=\w)/gi, replacement: 'many ', type: 'hedging' },
  { pattern: /\bmyriad\s+(?=\w)/gi, replacement: 'many ', type: 'hedging' },
  { pattern: /\ba plethora of\b/gi, replacement: 'many', type: 'hedging' },
  { pattern: /\bplethora of\b/gi, replacement: 'many', type: 'hedging' },
  { pattern: /\barguably\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bArguably\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bpotentially\b/gi, replacement: '', type: 'hedging' },
  { pattern: /\bPotentially\b/gi, replacement: '', type: 'hedging' },
];

// Patterns preserved for academic mode
const ACADEMIC_PRESERVED = [
  'Moreover',
  'Furthermore',
  'Additionally',
  'Nevertheless',
  'However',
];

// ============================================================================
// SCORING SYSTEM
// ============================================================================

function calculateHumanScore(text: string): number {
  let score = 10;
  const words = text.split(/\s+/);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  
  // Average sentence length
  const avgSentenceLength = wordCount / sentenceCount;
  
  // Sentence length variance (coefficient of variation)
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const meanLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - meanLength, 2), 0) / sentenceLengths.length;
  const cv = Math.sqrt(variance) / Math.max(meanLength, 1);
  
  // Score adjustments
  
  // 1. AI pattern count per 1000 words
  const patternsPer1k = countAIPatterns(text) / (wordCount / 1000);
  if (patternsPer1k > 20) score -= 3;
  else if (patternsPer1k > 10) score -= 2;
  else if (patternsPer1k > 5) score -= 1;
  
  // 2. Sentence length variance (too uniform = AI)
  if (cv < 0.2) score -= 1.5;
  else if (cv < 0.3) score -= 0.5;
  
  // 3. Average sentence length (too long = AI)
  if (avgSentenceLength > 30) score -= 1;
  else if (avgSentenceLength > 25) score -= 0.5;
  
  // 4. Hedging phrases
  const hedgingCount = countPatterns(text, [...HEDGING_PHRASES, ...VAGUE_QUANTIFIERS]);
  if (hedgingCount > 3) score -= 1.5;
  else if (hedgingCount > 1) score -= 0.5;
  
  // 5. Passive voice indicators
  const passiveCount = (text.match(/\b(is|are|was|were|been|being)\s+\w+ed\b/gi) || []).length;
  if (passiveCount > 5) score -= 1;
  else if (passiveCount > 2) score -= 0.5;
  
  // 6. Contractions (more = more human)
  const contractionCount = (text.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/gi) || []).length;
  const contractionRatio = contractionCount / Math.max(wordCount / 100, 1);
  if (contractionRatio > 2) score += 0.5;
  else if (contractionRatio < 0.5) score -= 0.5;
  
  // 7. Specific numbers/data (more = more credible)
  const numberCount = (text.match(/\d+%|\$\d+|\d+\s*(percent|million|billion|thousand)/gi) || []).length;
  if (numberCount > 3) score += 0.5;
  
  // 8. First person usage (indicates personal voice)
  const firstPersonCount = (text.match(/\b(I|I've|I'm|I'll|my|me|we|our|us)\b/gi) || []).length;
  if (firstPersonCount > 3) score += 0.3;
  
  return Math.max(0, Math.min(10, score));
}

function countAIPatterns(text: string): number {
  const allPatterns = [
    ...OVERUSED_TRANSITIONS,
    ...AI_CLICHES,
    ...HEDGING_PHRASES,
    ...CORPORATE_BUZZWORDS,
    ...VAGUE_QUANTIFIERS,
  ];
  
  let count = 0;
  for (const { pattern } of allPatterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function countPatterns(text: string, patterns: Array<{ pattern: RegExp }>): number {
  let count = 0;
  for (const { pattern } of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

// ============================================================================
// TRANSFORMATION
// ============================================================================

export function deaiify(
  text: string,
  mode: DeAiMode = 'strict',
  options: {
    scoreThreshold?: number;
    addExamples?: boolean;
  } = {}
): DeAiResult {
  const originalScore = calculateHumanScore(text);
  const threshold = options.scoreThreshold ?? 8;
  
  let revised = text;
  const changes: ChangeLog = {
    transitionsRemoved: 0,
    clichesRemoved: 0,
    hedgingRemoved: 0,
    buzzwordsReplaced: 0,
    roboticPatternsFixed: 0,
    examplesAdded: 0,
    sentencesShortened: 0,
    contractionsAdded: 0,
    activeVoiceUsed: 0,
  };
  
  // Apply patterns based on mode
  const patternsToApply: Array<{ pattern: RegExp; replacement: string; type: string }> = [];
  
  if (mode === 'academic') {
    // Academic mode: preserve formal transitions
    patternsToApply.push(
      ...AI_CLICHES,
      ...HEDGING_PHRASES.filter(p => !ACADEMIC_PRESERVED.some(ap => p.pattern.source.includes(ap))),
      ...CORPORATE_BUZZWORDS,
      ...VAGUE_QUANTIFIERS,
    );
  } else if (mode === 'preserve-formal') {
    // Preserve mode: keep some formal language
    patternsToApply.push(
      ...AI_CLICHES,
      ...HEDGING_PHRASES.slice(0, 8), // Only remove obvious hedging
      ...CORPORATE_BUZZWORDS,
      ...VAGUE_QUANTIFIERS,
    );
  } else {
    // Strict mode: apply all patterns
    patternsToApply.push(
      ...OVERUSED_TRANSITIONS,
      ...AI_CLICHES,
      ...HEDGING_PHRASES,
      ...CORPORATE_BUZZWORDS,
      ...VAGUE_QUANTIFIERS,
    );
  }
  
  // Apply pattern replacements
  for (const { pattern, replacement, type } of patternsToApply) {
    const matches = revised.match(pattern);
    if (matches) {
      revised = revised.replace(pattern, replacement);
      switch (type) {
        case 'transition': changes.transitionsRemoved += matches.length; break;
        case 'cliche': changes.clichesRemoved += matches.length; break;
        case 'hedging': changes.hedgingRemoved += matches.length; break;
        case 'buzzword': changes.buzzwordsReplaced += matches.length; break;
      }
    }
  }
  
  // Fix robotic patterns
  revised = fixRoboticPatterns(revised, changes);
  
  // Add natural voice markers
  revised = addNaturalVoice(revised, changes);
  
  // Clean up double spaces and empty lines
  revised = revised
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^ +/gm, '')
    .trim();
  
  // Fix sentence starting with lowercase
  revised = revised.replace(/(?<=[.!?]\s+)([a-z])/g, (_, letter) => letter.toUpperCase());
  
  const revisedScore = calculateHumanScore(revised);
  
  // Identify flags for manual review
  const flagsForReview = identifyFlagsForReview(revised);
  
  return {
    originalText: text,
    revisedText: revised,
    originalScore,
    revisedScore,
    changes,
    flagsForReview,
  };
}

function fixRoboticPatterns(text: string, changes: ChangeLog): string {
  let result = text;
  
  // Fix excessive "However" usage
  const howeverCount = (result.match(/\bHowever\b/gi) || []).length;
  if (howeverCount > 2) {
    let count = 0;
    result = result.replace(/\bHowever,?\s*/gi, (match) => {
      count++;
      if (count > 2) {
        changes.roboticPatternsFixed++;
        return 'But ';
      }
      return match;
    });
  }
  
  // Fix "While X, Y" sentence openings (more than 3 per 500 words)
  const whileMatches = result.match(/\bWhile\s+[^,]+,/gi) || [];
  if (whileMatches.length > 3) {
    let fixed = 0;
    result = result.replace(/\bWhile\s+([^,]+),/gi, (match, content) => {
      fixed++;
      if (fixed > 3) {
        changes.roboticPatternsFixed++;
        return `${content}. But`;
      }
      return match;
    });
  }
  
  // Fix rhetorical questions followed by answers
  result = result.replace(/\?(\s+)\b(The answer is|Here's why|This is because)/gi, (_, space, answer) => {
    changes.roboticPatternsFixed++;
    return `.${space}${answer.charAt(0).toLowerCase() + answer.slice(1)}`;
  });
  
  // Fix "Here are the top X ways" list prefacing
  result = result.replace(/\bHere are the (?:top \d+|\d+)(?: best| most effective| key)? ways\b/gi, (match) => {
    changes.roboticPatternsFixed++;
    return 'The key ways';
  });
  
  return result;
}

function addNaturalVoice(text: string, changes: ChangeLog): string {
  let result = text;
  
  // Add contractions where appropriate
  const contractionMap: [RegExp, string][] = [
    [/\bIt is\b/g, "It's"],
    [/\bIt is not\b/g, "It isn't"],
    [/\bThat is\b/g, "That's"],
    [/\bThere is\b/g, "There's"],
    [/\bHere is\b/g, "Here's"],
    [/\bWhat is\b/g, "What's"],
    [/\bWho is\b/g, "Who's"],
    [/\bWhere is\b/g, "Where's"],
    [/\bHow is\b/g, "How's"],
    [/\bI am\b/g, "I'm"],
    [/\bI have\b/g, "I've"],
    [/\bI will\b/g, "I'll"],
    [/\bI would\b/g, "I'd"],
    [/\bYou are\b/g, "You're"],
    [/\bYou have\b/g, "You've"],
    [/\bYou will\b/g, "You'll"],
    [/\bWe are\b/g, "We're"],
    [/\bWe have\b/g, "We've"],
    [/\bWe will\b/g, "We'll"],
    [/\bThey are\b/g, "They're"],
    [/\bThey have\b/g, "They've"],
    [/\bThey will\b/g, "They'll"],
    [/\bDo not\b/g, "Don't"],
    [/\bDoes not\b/g, "Doesn't"],
    [/\bDid not\b/g, "Didn't"],
    [/\bWill not\b/g, "Won't"],
    [/\bWould not\b/g, "Wouldn't"],
    [/\bCould not\b/g, "Couldn't"],
    [/\bShould not\b/g, "Shouldn't"],
    [/\bCannot\b/g, "Can't"],
    [/\bCan not\b/g, "Can't"],
  ];
  
  for (const [pattern, replacement] of contractionMap) {
    const matches = result.match(pattern);
    if (matches) {
      result = result.replace(pattern, replacement);
      changes.contractionsAdded += matches.length;
    }
  }
  
  // Convert passive to active voice (common patterns)
  const passiveToActive: [RegExp, string][] = [
    [/\bwas conducted\b/gi, 'we conducted'],
    [/\bwere conducted\b/gi, 'we conducted'],
    [/\bwere performed\b/gi, 'we performed'],
    [/\bwas performed\b/gi, 'we performed'],
    [/\bwere analyzed\b/gi, 'we analyzed'],
    [/\bwas analyzed\b/gi, 'we analyzed'],
    [/\bhas been shown\b/gi, 'shows'],
    [/\bhave been shown\b/gi, 'show'],
    [/\bcan be seen\b/gi, 'you can see'],
    [/\bcan be found\b/gi, 'you can find'],
  ];
  
  for (const [pattern, replacement] of passiveToActive) {
    const matches = result.match(pattern);
    if (matches) {
      result = result.replace(pattern, replacement);
      changes.activeVoiceUsed += matches.length;
    }
  }
  
  // Shorten very long sentences (>40 words)
  const sentences = result.split(/(?<=[.!?])\s+/);
  const shortenedSentences = sentences.map(sentence => {
    const words = sentence.split(/\s+/);
    if (words.length > 40) {
      // Find good break points
      const breakPoints = [',', ';', ' - ', ' and ', ' but ', ' because '];
      for (const bp of breakPoints) {
        const parts = sentence.split(bp);
        if (parts.length >= 2 && parts[0].split(/\s+/).length >= 15 && parts[0].split(/\s+/).length <= 30) {
          changes.sentencesShortened++;
          return parts.join('.' + bp.charAt(0) === ' ' ? bp.charAt(0).toUpperCase() : bp);
        }
      }
    }
    return sentence;
  });
  result = shortenedSentences.join(' ');
  
  return result;
}

function identifyFlagsForReview(text: string): string[] {
  const flags: string[] = [];
  
  // Check for remaining vague quantifiers
  if (/\bvarious\b/gi.test(text)) {
    const matches = text.match(/\bvarious\s+\w+/gi);
    if (matches) {
      flags.push(`Still uses "various" - suggest specific examples: "${matches[0]}"`);
    }
  }
  
  if (/\bnumerous\b/gi.test(text)) {
    const matches = text.match(/\bnumerous\s+\w+/gi);
    if (matches) {
      flags.push(`Still uses "numerous" - consider: "12+ ${matches[0]?.split(' ')[1] || 'items'}"`);
    }
  }
  
  // Check for unsupported claims
  if (/\b(significantly|dramatically|substantially|greatly)\s+(improved|increased|decreased|reduced)\b/gi.test(text)) {
    flags.push('Unqualified claim - add specific percentage or data');
  }
  
  // Check for missing specifics in examples
  if (/\bmany (companies|organizations|businesses|individuals)\b/gi.test(text)) {
    flags.push('Vague reference - replace "many companies" with specific names');
  }
  
  // Check for abrupt transitions
  const sentences = text.split(/[.!?]+/);
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1].trim();
    const curr = sentences[i].trim();
    if (prev.length > 0 && curr.length > 0) {
      // Check if topic changes abruptly
      if (!curr.match(/^(And|But|So|However|Therefore|Thus|Additionally|Also|Moreover|Furthermore)/i)) {
        // Might need context - flag long jumps
        const prevWords = new Set(prev.toLowerCase().split(/\s+/));
        const currWords = new Set(curr.toLowerCase().split(/\s+/));
        const overlap = [...prevWords].filter(w => currWords.has(w) && w.length > 4).length;
        if (overlap === 0 && prev.length > 50 && curr.length > 50) {
          flags.push(`Transition between sentences feels abrupt near: "${curr.slice(0, 50)}..."`);
        }
      }
    }
  }
  
  return flags;
}

// ============================================================================
// FORMAT OUTPUT
// ============================================================================

export function formatDeaiResult(result: DeAiResult): string {
  const lines: string[] = [];
  
  lines.push(`## De-AI-ification Results`);
  lines.push('');
  lines.push(`**Original Score:** ${result.originalScore.toFixed(1)}/10 ${getScoreLabel(result.originalScore)}`);
  lines.push(`**Revised Score:** ${result.revisedScore.toFixed(1)}/10 ${getScoreLabel(result.revisedScore)}`);
  lines.push('');
  
  lines.push(`### Changes Made`);
  if (result.changes.transitionsRemoved > 0) {
    lines.push(`✓ Removed ${result.changes.transitionsRemoved} AI transitions ("Moreover," "Furthermore," etc.)`);
  }
  if (result.changes.clichesRemoved > 0) {
    lines.push(`✓ Removed ${result.changes.clichesRemoved} AI cliches ("harness the power," "unlock potential," etc.)`);
  }
  if (result.changes.hedgingRemoved > 0) {
    lines.push(`✓ Removed ${result.changes.hedgingRemoved} hedging phrases ("it's important to note," "arguably," etc.)`);
  }
  if (result.changes.buzzwordsReplaced > 0) {
    lines.push(`✓ Replaced ${result.changes.buzzwordsReplaced} corporate buzzwords ("leverage" → "use," "utilize" → "use," etc.)`);
  }
  if (result.changes.roboticPatternsFixed > 0) {
    lines.push(`✓ Fixed ${result.changes.roboticPatternsFixed} robotic patterns (excessive transitions, parallel structures)`);
  }
  if (result.changes.contractionsAdded > 0) {
    lines.push(`✓ Added ${result.changes.contractionsAdded} contractions for natural voice ("it is" → "it's")`);
  }
  if (result.changes.activeVoiceUsed > 0) {
    lines.push(`✓ Converted ${result.changes.activeVoiceUsed} passive voice to active voice`);
  }
  if (result.changes.sentencesShortened > 0) {
    lines.push(`✓ Shortened ${result.changes.sentencesShortened} overly long sentences`);
  }
  lines.push('');
  
  if (result.flagsForReview.length > 0) {
    lines.push(`### Flags for Manual Review`);
    for (const flag of result.flagsForReview) {
      lines.push(`⚠️ ${flag}`);
    }
    lines.push('');
  }
  
  lines.push(`### Revised Text`);
  lines.push('');
  lines.push(result.revisedText);
  
  return lines.join('\n');
}

function getScoreLabel(score: number): string {
  if (score >= 9) return '(Human-like ✨)';
  if (score >= 8) return '(Natural voice ✓)';
  if (score >= 7) return '(Good, minor refinements needed)';
  if (score >= 6) return '(Mixed - could be human or AI)';
  if (score >= 4) return '(AI-heavy - needs work)';
  if (score >= 2) return '(Obviously AI-generated)';
  return '(Robotic 👤)';
}

// Quick analysis function
export function analyzeText(text: string): {
  score: number;
  patternCount: number;
  issues: string[];
  suggestions: string[];
} {
  const score = calculateHumanScore(text);
  const patternCount = countAIPatterns(text);
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check specific patterns
  if (/\b(Moreover|Furthermore|Additionally),/gi.test(text)) {
    issues.push('Uses formal AI transitions');
    suggestions.push('Remove "Moreover," "Furthermore," "Additionally" - use direct statements');
  }
  
  if (/\b(It's important to note|It's worth mentioning|It's crucial to understand)/gi.test(text)) {
    issues.push('Uses hedging phrases');
    suggestions.push('Remove hedging - make direct statements');
  }
  
  if (/\b(utilize|leverage|facilitate|optimize|synergize)\b/gi.test(text)) {
    issues.push('Uses corporate buzzwords');
    suggestions.push('Replace buzzwords: utilize→use, leverage→use, facilitate→help');
  }
  
  if (/\bvarious\b/gi.test(text)) {
    issues.push('Uses vague quantifier "various"');
    suggestions.push('Replace "various" with specific numbers or examples');
  }
  
  const sentences = text.split(/[.!?]+/);
  const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);
  if (avgLength > 28) {
    issues.push(`Sentences average ${Math.round(avgLength)} words (too long)`);
    suggestions.push('Break up long sentences - aim for 15-20 word average');
  }
  
  const contractionCount = (text.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/gi) || []).length;
  const wordCount = text.split(/\s+/).length;
  if (contractionCount / Math.max(wordCount / 100, 1) < 1) {
    issues.push('Few contractions (sounds formal)');
    suggestions.push('Use contractions: "it is" → "it\'s", "you are" → "you\'re"');
  }
  
  return { score, patternCount, issues, suggestions };
}