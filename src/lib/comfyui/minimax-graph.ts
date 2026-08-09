export interface MiniMaxH3Shot {
  id: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  length: number;
  steps: number;
  cfg: number;
  distilledCfg: number;
  shiftVideo: number;
  shiftAudio: number;
  seed: number;
  sampler: string;
  scheduler: string;
  firstFrameFile?: UploadedImage;
  lastFrameFile?: UploadedImage;
  model: string;
  clip: string;
  vae: string;
  audioVae: string;
  loraName?: string;
  loraStrengthModel?: number;
  loraStrengthClip?: number;
}

export interface UploadedImage {
  name: string;
  subfolder: string;
  type: string;
}

export const RESOLUTION_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: '1344×768 (landscape, default)', width: 1344, height: 768 },
  { label: '768×1344 (portrait)', width: 768, height: 1344 },
  { label: '1024×1024 (square)', width: 1024, height: 1024 },
];

export const LENGTH_PRESETS: Array<{ label: string; length: number }> = [
  { label: '~5s (124 frames)', length: 124 },
  { label: '~10s (244 frames)', length: 244 },
  { label: '~15s (364 frames)', length: 364 },
];

export const SAMPLERS = ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde'];
export const SCHEDULERS = ['normal', 'karras', 'exponential', 'sgm_uniform'];

export type RenderMode = 'prototype' | 'final';

export interface TurboPreset {
  label: string;
  loraName: string;
  loraStrengthModel: number;
  loraStrengthClip: number;
  steps: number;
  cfg: number;
  shiftVideo: number;
  shiftAudio: number;
}

export const TURBO_PRESETS: TurboPreset[] = [
  {
    label: 'LightX2V 4-step turbo',
    loraName: 'minimax_h3_fl2v_lightx2v_turbo_4step_v0.1_comfy.safetensors',
    loraStrengthModel: 1.0,
    loraStrengthClip: 1.0,
    steps: 4,
    cfg: 1.0,
    shiftVideo: 3.0,
    shiftAudio: 1.5,
  },
];

const FINAL_PARAMS = { steps: 30, cfg: 7.0, shiftVideo: 12.0, shiftAudio: 3.0 };

let _nodeSeq = 1;
function nid(prefix: string): string {
  return `${prefix}_${_nodeSeq++}`;
}

export function buildMiniMaxH3Graph(shot: MiniMaxH3Shot): Record<string, unknown> {
  _nodeSeq = 1;
  const graph: Record<string, unknown> = {};

  const clipNode = nid('clip');
  graph[clipNode] = {
    class_type: 'CLIPLoaderMiniMax',
    inputs: { clip_name: shot.clip },
  };

  const vaeNode = nid('vae');
  graph[vaeNode] = {
    class_type: 'VAELoaderMiniMax',
    inputs: { vae_name: shot.vae },
  };

  const audioVaeNode = nid('audiovae');
  graph[audioVaeNode] = {
    class_type: 'AudioVAELoaderMiniMax',
    inputs: { vae_name: shot.audioVae },
  };

  const modelNode = nid('model');
  graph[modelNode] = {
    class_type: 'CheckpointLoaderMiniMax',
    inputs: { ckpt_name: shot.model },
  };

  // Apply LoRA (e.g. LightX2V 4-step turbo) to both model and CLIP when configured.
  let clipOut: [string, number] = [clipNode, 0];
  let modelOut: [string, number] = [modelNode, 0];
  if (shot.loraName && shot.loraName.trim()) {
    const loraNode = nid('lora');
    graph[loraNode] = {
      class_type: 'LoraLoader',
      inputs: {
        model: [modelNode, 0],
        clip: [clipNode, 0],
        lora_name: shot.loraName,
        strength_model: shot.loraStrengthModel ?? 1.0,
        strength_clip: shot.loraStrengthClip ?? 1.0,
      },
    };
    modelOut = [loraNode, 0];
    clipOut = [loraNode, 1];
  }

  const condNode = nid('cond');
  const condInputs: Record<string, unknown> = {
    clip: [clipOut[0], clipOut[1]],
    vae: [vaeNode, 0],
    prompt: shot.prompt,
    width: shot.width,
    height: shot.height,
    length: shot.length,
  };
  if (shot.firstFrameFile) {
    const loadImageNode = nid('loadimage_first');
    graph[loadImageNode] = {
      class_type: 'LoadImage',
      inputs: { image: `${shot.firstFrameFile.subfolder}/${shot.firstFrameFile.name}` },
    };
    condInputs.first_frame = [loadImageNode, 0];
  }
  if (shot.lastFrameFile) {
    const loadImageNode = nid('loadimage_last');
    graph[loadImageNode] = {
      class_type: 'LoadImage',
      inputs: { image: `${shot.lastFrameFile.subfolder}/${shot.lastFrameFile.name}` },
    };
    condInputs.last_frame = [loadImageNode, 0];
  }
  graph[condNode] = {
    class_type: 'MiniMaxH3ImageToVideo',
    inputs: condInputs,
  };

  const sigmaNode = nid('sigma');
  graph[sigmaNode] = {
    class_type: 'MiniMaxH3SigmaShift',
    inputs: {
      model: [modelOut[0], modelOut[1]],
      shift_video: shot.shiftVideo,
      shift_audio: shot.shiftAudio,
    },
  };
  modelOut = [sigmaNode, 0];

  const negNode = nid('negcond');
  graph[negNode] = {
    class_type: 'MiniMaxH3ImageToVideo',
    inputs: {
      clip: [clipOut[0], clipOut[1]],
      vae: [vaeNode, 0],
      prompt: shot.negativePrompt || 'blurry, low quality, distorted, watermark',
      width: shot.width,
      height: shot.height,
      length: shot.length,
    },
  };

  const latentNode = condNode;
  const samplerNode = nid('sampler');
  graph[samplerNode] = {
    class_type: 'KSampler',
    inputs: {
      model: [modelOut[0], modelOut[1]],
      positive: [condNode, 0],
      negative: [negNode, 0],
      latent_image: [latentNode, 1],
      seed: shot.seed,
      steps: shot.steps,
      cfg: shot.cfg,
      sampler_name: shot.sampler,
      scheduler: shot.scheduler,
      denoise: 1.0,
    },
  };

  const decodeNode = nid('decode');
  graph[decodeNode] = {
    class_type: 'VAEDecode',
    inputs: {
      samples: [samplerNode, 0],
      vae: [vaeNode, 0],
    },
  };

  const saveVideoNode = nid('savevideo');
  graph[saveVideoNode] = {
    class_type: 'SaveMiniMaxH3Video',
    inputs: {
      images: [decodeNode, 0],
      audio: [samplerNode, 1],
      audio_vae: [audioVaeNode, 0],
      fps: 24,
      filename_prefix: 'minimax_h3_director',
    },
  };

  // Save the last decoded frame so the next shot in a chain can use it as its first frame.
  const lastFrameNode = nid('lastframe');
  graph[lastFrameNode] = {
    class_type: 'ImageFromBatch',
    inputs: {
      image: [decodeNode, 0],
      batch_index: -1,
      length: 1,
    },
  };

  const saveLastFrameNode = nid('savelastframe');
  graph[saveLastFrameNode] = {
    class_type: 'SaveImage',
    inputs: {
      images: [lastFrameNode, 0],
      filename_prefix: 'minimax_h3_chain_frame',
    },
  };

  return graph;
}

export function defaultShot(): MiniMaxH3Shot {
  const base: MiniMaxH3Shot = {
    id: `shot_${Date.now()}`,
    prompt: '',
    negativePrompt: 'blurry, low quality, distorted, watermark, text',
    width: 1344,
    height: 768,
    length: 124,
    steps: 30,
    cfg: 7.0,
    distilledCfg: 3.5,
    shiftVideo: 12.0,
    shiftAudio: 3.0,
    seed: Math.floor(Math.random() * 2_147_483_647),
    sampler: 'euler',
    scheduler: 'normal',
    model: 'minimax_h3_v1.safetensors',
    clip: 'minimax_h3_text_encoder.safetensors',
    vae: 'minimax_h3_vae.safetensors',
    audioVae: 'minimax_h3_audio_vae.safetensors',
    loraName: '',
    loraStrengthModel: 1.0,
    loraStrengthClip: 1.0,
  };
  // Default to prototype mode for fast iteration
  return applyTurboPreset(base, TURBO_PRESETS[0]);
}

export function setRenderMode(shot: MiniMaxH3Shot, mode: RenderMode): MiniMaxH3Shot {
  if (mode === 'prototype') {
    return applyTurboPreset(shot, TURBO_PRESETS[0]);
  }
  // Final mode: clear LoRA, restore full-quality sampling params
  return {
    ...shot,
    loraName: '',
    loraStrengthModel: 1.0,
    loraStrengthClip: 1.0,
    steps: FINAL_PARAMS.steps,
    cfg: FINAL_PARAMS.cfg,
    shiftVideo: FINAL_PARAMS.shiftVideo,
    shiftAudio: FINAL_PARAMS.shiftAudio,
  };
}

export function getRenderMode(shot: MiniMaxH3Shot): RenderMode {
  return shot.loraName && shot.loraName.trim() ? 'prototype' : 'final';
}

export function applyTurboPreset(shot: MiniMaxH3Shot, preset: TurboPreset): MiniMaxH3Shot {
  return {
    ...shot,
    loraName: preset.loraName,
    loraStrengthModel: preset.loraStrengthModel,
    loraStrengthClip: preset.loraStrengthClip,
    steps: preset.steps,
    cfg: preset.cfg,
    shiftVideo: preset.shiftVideo,
    shiftAudio: preset.shiftAudio,
  };
}