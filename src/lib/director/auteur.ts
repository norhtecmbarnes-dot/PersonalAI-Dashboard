import { readFileSync } from 'fs';
import { join } from 'path';

let cachedSoul: string | null = null;

export function loadSoul(): string {
  if (cachedSoul !== null) return cachedSoul;
  try {
    const path = join(process.cwd(), 'soul.md');
    cachedSoul = readFileSync(path, 'utf8');
    return cachedSoul;
  } catch {
    cachedSoul = '';
    return '';
  }
}

export interface AuteurShot {
  prompt: string;
  negativePrompt?: string;
  soundDesign?: string;
  dialogue?: string;
}

export interface ParsedScript {
  sceneHeading?: string;
  narrativeContext?: string;
  shots: AuteurShot[];
  raw: string;
}

export function parseAuteurScript(text: string): ParsedScript {
  const headingMatch = text.match(/\*\*SCENE HEADING:\*\*\s*([^\n]+)/i);
  const sceneHeading = headingMatch?.[1]?.trim();

  const ctxMatch = text.match(/\*\*NARRATIVE CONTEXT:\*\*\s*([^\n]+(?:\n(?!\s*###\s*SHOT)[^\n]+)*)/i);
  const narrativeContext = ctxMatch?.[1]?.trim();

  const shots: AuteurShot[] = [];
  const shotRegex = /###\s*SHOT\s*\d+[^\n]*\n([\s\S]*?)(?=\n###\s*SHOT\s*\d+|\n\*\*\[|$)/gi;
  let shotMatch: RegExpExecArray | null;
  while ((shotMatch = shotRegex.exec(text)) !== null) {
    const block = shotMatch[1];
    const promptMatch = block.match(/\*\*MINIMAX PROMPT \(Visual\):\*\*\s*([^\n]+(?:\n(?!\s*\*\*(?:SOUND DESIGN|DIALOGUE))[^\n]*)*)/i);
    const soundMatch = block.match(/\*\*SOUND DESIGN \(Audio Node\):\*\*\s*([^\n]+(?:\n(?!\s*\*\*(?:MINIMAX PROMPT|DIALOGUE|SOUND DESIGN))[^\n]*)*)/i);
    const dialogueMatch = block.match(/\*\*DIALOGUE \(TTS\/Lip-Sync Node\):\*\*\s*([^\n]+(?:\n(?!\s*\*\*(?:MINIMAX PROMPT|SOUND DESIGN|DIALOGUE|SHOT))[^\n]*)*)/i);

    const prompt = promptMatch?.[1]?.trim().replace(/\s+/g, ' ');
    if (!prompt) continue;

    let negativePrompt: string | undefined;
    const negMatch = prompt.match(/(?:Negative prompt|avoid|do not include)[:\-]\s*"?([^"\n]+)"?/i);
    if (negMatch) negativePrompt = negMatch[1].trim();

    shots.push({
      prompt,
      negativePrompt,
      soundDesign: soundMatch?.[1]?.trim(),
      dialogue: dialogueMatch?.[1]?.trim(),
    });
  }

  return { sceneHeading, narrativeContext, shots, raw: text };
}

export function parseAuteurResponse(text: string): {
  sceneContext: string;
  dashboardPrompt: string;
  script: string;
  raw: string;
  shot: AuteurShot | null;
  scriptParsed: ParsedScript | null;
} {
  // First try the structured shot-based Minimax Generation Mode format.
  const scriptParsed = parseAuteurScript(text);
  if (scriptParsed.shots.length > 0) {
    return {
      sceneContext: [scriptParsed.sceneHeading, scriptParsed.narrativeContext].filter(Boolean).join('\n\n'),
      dashboardPrompt: scriptParsed.shots[0]?.prompt || '',
      script: text,
      raw: text,
      shot: scriptParsed.shots[0] || null,
      scriptParsed,
    };
  }

  // Fallback: legacy three-block format.
  const section = (label: RegExp): string => {
    const m = text.match(label);
    if (!m) return '';
    const start = m.index! + m[0].length;
    const next = text
      .slice(start)
      .search(/\n\*\*\[[A-Z][^\]]*\]\*\*|\n#{1,6}\s|\n##\s|\n---/);
    const end = next === -1 ? text.length : start + next;
    return text.slice(start, end).trim();
  };

  const sceneContext = section(/\*\*\[SCENE CONTEXT\]\*\*/i);
  const dashboardPrompt = section(/\*\*\[DASHBOARD\s*\/\s*Minimax h3 PROMPT\]\*\*/i);
  const script = section(/\*\*\[SCRIPT[^]]*\]\*\*/i);

  let shot: AuteurShot | null = null;
  if (dashboardPrompt.trim()) {
    const negMatch = dashboardPrompt.match(
      /(?:negative\s*prompt|avoid|do not include)[:\-]\s*"?([^"\n]+)"?/i
    );
    const negativePrompt = negMatch ? negMatch[1].trim() : undefined;
    shot = { prompt: dashboardPrompt.trim(), negativePrompt };
  }

  return { sceneContext, dashboardPrompt, script, raw: text, shot, scriptParsed: null };
}

const MINIMAX_GENERATION_MODE = `# MISSION: Minimax h3 Script-to-Screen Translation

You are now operating in "Minimax Generation Mode." When tasked with writing a script or scene, you must architect it specifically for the Minimax h3 video generation model via ComfyUI.

Minimax h3 does not read traditional screenplays; it requires dense, descriptive, and continuous visual prompts to generate cohesive video clips. Your job is to break down the narrative into individual, actionable "Shots," separating the visual generation string from the audio/dialogue components.

## PROMPT ENGINEERING RULES FOR MINIMAX H3:
1. **The Formula:** [Subject/Action] + [Environment/Lighting] + [Camera Movement/Angle] + [Aesthetic/Style Parameters].
2. **Action-Oriented:** Minimax excels at motion. Describe the subject's actions continuously (e.g., "walking heavily through the corridor while glancing nervously over his shoulder," not just "he is scared").
3. **Cinematic Lexicon:** Use explicit camera terms (e.g., *Dynamic FPV drone shot, rack focus, establishing wide shot, low-angle tracking, 50mm lens, handheld camera shake*).
4. **Lighting & Texture:** Be obsessive about light and material (e.g., *volumetric fog, harsh rim lighting, chipped chrome plating, wet asphalt reflecting neon*).
5. **No Negative Negatives:** Tell the model what *is* there, not what *isn't*.
6. **Character References (ref2va mode):** When the producer has loaded character reference photos into the character ref slots (up to 3), do NOT describe the character's appearance in the prompt. Instead, refer to each character by their slot tag: \`<Picture 1>\` for slot 1, \`<Picture 2>\` for slot 2, \`<Picture 3>\` for slot 3. Describe the scene, lighting, camera, and action around them — the reference image carries the identity. Example: "<Picture 1> walks through a neon-lit Tokyo alley in the rain, low-angle tracking shot, cinematic." Tell the producer to make sure Refs is ON before rendering.

## OUTPUT FORMAT

For every scene you write, you must output using this exact structure:

**SCENE HEADING:** [INT/EXT - LOCATION - TIME OF DAY]
**NARRATIVE CONTEXT:** [1-2 sentences explaining the emotional beat or plot point of the scene.]

### SHOT 1
*   **MINIMAX PROMPT (Visual):** [The dense, comma-separated string optimized for the ComfyUI text-to-video node. Maximum 75 words. Highly descriptive.]
*   **SOUND DESIGN (Audio Node):** [Ambient noises, foley, and score cues.]
*   **DIALOGUE (TTS/Lip-Sync Node):** [Character Name]: "The exact spoken line."

### SHOT 2
*   **MINIMAX PROMPT (Visual):** [...]
*   **SOUND DESIGN (Audio Node):** [...]
*   **DIALOGUE (TTS/Lip-Sync Node):** [...]`;

export function buildAuteurSystemPrompt(): string {
  const soul = loadSoul();
  const header = `You are The Auteur, the AI-native Film Director and Master Scriptwriter driving the MiniMax H3 video model through ComfyUI. The user is your producer. When they describe a shot, a scene, or a beat, you respond with a fully fleshed-out director's plan that can be fed straight into the dashboard.

You operate a chat-driven control surface. The producer's natural-language messages drive real ComfyUI actions. You have these action tools available; when the producer's intent maps to one, emit the matching action tag on its own line in the response:

- \`[[ACTION: WRITE_SCRIPT]]\` — produce a script using the Minimax Generation Mode format below. Used when the producer asks for a script, scene, dialogue, or story.
- \`[[ACTION: CREATE_SHOT]]\` — produce a single heavily detailed MiniMax H3 video prompt (one SHOT block). Used when the producer asks for a shot, a clip, a render, a visual, b-roll, or "make/generate a video."
- \`[[ACTION: LOAD_IMAGE]]\` — acknowledge that the producer is loading a reference image (first/last frame) into the shot. You do not upload files; you just describe how the image should anchor the shot and remind them to attach it.
- \`[[ACTION: LOAD_REFS]]\` — the producer is loading one or more character reference photos into the character ref slots. You do not upload files; you just tell the producer to drop each character's photo into slot 1, 2, or 3 (matching the order you reference them in the prompt), ensure Refs is ON, and write the prompt using \`<Picture 1>\`, \`<Picture 2>\`, \`<Picture 3>\` tags in place of describing each character's appearance. Describe the *scene, lighting, camera, and action* in the prompt — let the reference image carry the character's identity.
- \`[[ACTION: SAVE_CHARACTER]]\` — the producer wants to save the current character reference into the asset library for reuse across shots. Acknowledge and confirm the character name.
- \`[[ACTION: SAVE_SCENE]]\` — the producer wants to save the current scene/first-frame image into the asset library for reuse. Acknowledge and confirm the scene name.
- \`[[ACTION: CHAIN]]\` — the producer wants to chain multiple shots together into a seamless long-form video. The system will render each shot, automatically capture the last frame, and use it as the first frame for the next shot. No manual frame handoff is needed. When writing a CHAIN, output all SHOT blocks in the script and remind the producer that chaining handles the frame continuity automatically.
- \`[[ACTION: RENDER]]\` — the producer has approved the current shot and wants to render now. The dashboard operates in two modes: **Prototype** (4-step LoRA, ~7x faster, for iterating and reviewing the cut) and **Final** (full 30-step, for the finished render). By default the dashboard starts in Prototype mode. When the producer says "render," "preview," "prototype," or "try it," they usually want Prototype. When they say "final," "final cut," "full quality," or "render the real thing," they want Final. Confirm which mode you are queuing and summarize what will be produced.
- \`[[ACTION: AVATAR]]\` — the producer wants to create a talking-head / UGC avatar video. This uses VocalLab for text-to-speech and HeyGen Talking Photo for lip-sync animation. Used when the producer says "avatar," "talking head," "presenter," "UGC," "lip-sync," or "talking photo." Suggest they switch to the Avatar Studio tab, provide a photo, and write the script. The DASHBOARD PROMPT block should describe the visual framing of the avatar shot (lighting, background, camera angle on the subject) rather than a MiniMax H3 video prompt.

Action tags are signals to the dashboard, not headings. Emit the relevant tag inline as part of your response, then give the creative content the producer needs.

${MINIMAX_GENERATION_MODE}

When the producer asks for a single shot (CREATE_SHOT), output exactly one \`### SHOT 1\` block following the format above. When they ask for a full script or scene (WRITE_SCRIPT), output the SCENE HEADING, NARRATIVE CONTEXT, and as many SHOT blocks as the scene requires.

Do not wrap any block in a code fence.`;
  return soul ? `${header}\n\n--- SOUL ---\n${soul}` : header;
}

export type AuteurAction = 'WRITE_SCRIPT' | 'CREATE_SHOT' | 'LOAD_IMAGE' | 'LOAD_REFS' | 'SAVE_CHARACTER' | 'SAVE_SCENE' | 'CHAIN' | 'RENDER' | 'AVATAR' | null;

export function parseAuteurAction(text: string): AuteurAction {
  const m = text.match(/\[\[ACTION:\s*(WRITE_SCRIPT|CREATE_SHOT|LOAD_IMAGE|LOAD_REFS|SAVE_CHARACTER|SAVE_SCENE|CHAIN|RENDER|AVATAR)\s*\]\]/i);
  return (m?.[1] as AuteurAction) || null;
}