export interface LocalAvatarShot {
  facePrompt: string;
  faceImageFile?: { name: string; subfolder: string; type: string };
  audioFile?: { name: string; subfolder: string; type: string };
  scriptText: string;
  voice: string;
  width: number;
  height: number;
  length: number;
  steps: number;
  cfg: number;
  seed: number;
  sampler: string;
  scheduler: string;
  // Model filenames (must match ComfyUI models/ folders)
  faceModel: string;
  faceClip: string;
  faceVae: string;
  talkModel: string;
  talkModelPatch: string;
  talkClip: string;
  talkVae: string;
  audioEncoder: string;
}

let _laNodeSeq = 1;
function lnid(prefix: string): string {
  return `${prefix}_${_laNodeSeq++}`;
}

/**
 * Build a two-stage ComfyUI graph for a fully local AI avatar:
 *
 * Stage 1 — Face: Qwen-Image generates a consistent character from a prompt.
 *           (Skipped if faceImageFile is provided — use an uploaded photo instead.)
 *
 * Stage 2 — Lip-Sync: Wan InfiniteTalk animates the face image, driven by
 *           audio (from VocalLab TTS or an uploaded audio file).
 *
 * The graph chains: face generation → audio encode → InfiniteTalk → VAE decode → save video.
 */
export function buildLocalAvatarGraph(shot: LocalAvatarShot): Record<string, unknown> {
  _laNodeSeq = 1;
  const graph: Record<string, unknown> = {};

  // ---- Stage 1: Face (Qwen-Image or uploaded photo) ----
  let faceImageRef: [string, number];

  if (shot.faceImageFile) {
    // Use uploaded photo directly
    const loadPhotoNode = lnid('loadphoto');
    graph[loadPhotoNode] = {
      class_type: 'LoadImage',
      inputs: { image: `${shot.faceImageFile.subfolder}/${shot.faceImageFile.name}` },
    };
    faceImageRef = [loadPhotoNode, 0];
  } else {
    // Generate face with Qwen-Image
    const faceClipNode = lnid('faceclip');
    graph[faceClipNode] = {
      class_type: 'CLIPLoader',
      inputs: { clip_name: shot.faceClip },
    };

    const faceModelNode = lnid('facemodel');
    graph[faceModelNode] = {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: shot.faceModel },
    };

    const faceVaeNode = lnid('facevae');
    graph[faceVaeNode] = {
      class_type: 'VAELoader',
      inputs: { vae_name: shot.faceVae },
    };

    const posCondNode = lnid('facepos');
    graph[posCondNode] = {
      class_type: 'CLIPTextEncode',
      inputs: { clip: [faceClipNode, 0], text: shot.facePrompt },
    };

    const negCondNode = lnid('faceneg');
    graph[negCondNode] = {
      class_type: 'CLIPTextEncode',
      inputs: { clip: [faceClipNode, 0], text: 'blurry, distorted, deformed, low quality, watermark, text, bad anatomy' },
    };

    const emptyLatentNode = lnid('faceemptylatent');
    graph[emptyLatentNode] = {
      class_type: 'EmptySD3LatentImage',
      inputs: { width: shot.width, height: shot.height, batch_size: 1 },
    };

    const faceSamplerNode = lnid('facesampler');
    graph[faceSamplerNode] = {
      class_type: 'KSampler',
      inputs: {
        model: [faceModelNode, 0],
        positive: [posCondNode, 0],
        negative: [negCondNode, 0],
        latent_image: [emptyLatentNode, 0],
        seed: shot.seed,
        steps: 20,
        cfg: 6.0,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
      },
    };

    const faceDecodeNode = lnid('facedecode');
    graph[faceDecodeNode] = {
      class_type: 'VAEDecode',
      inputs: { samples: [faceSamplerNode, 0], vae: [faceVaeNode, 0] },
    };

    const saveFaceNode = lnid('saveface');
    graph[saveFaceNode] = {
      class_type: 'SaveImage',
      inputs: { images: [faceDecodeNode, 0], filename_prefix: 'avatar_face' },
    };

    faceImageRef = [faceDecodeNode, 0];
  }

  // ---- Stage 2: Audio encode (for InfiniteTalk) ----
  if (!shot.audioFile) {
    throw new Error('Audio file is required for lip-sync. Generate TTS via VocalLab first.');
  }

  const loadAudioNode = lnid('loadaudio');
  graph[loadAudioNode] = {
    class_type: 'LoadAudio',
    inputs: { audio: `${shot.audioFile.subfolder}/${shot.audioFile.name}` },
  };

  const audioEncoderNode = lnid('audioencoder');
  graph[audioEncoderNode] = {
    class_type: 'AudioEncoderLoader',
    inputs: { audio_encoder_name: shot.audioEncoder },
  };

  const audioEncodeNode = lnid('audioencode');
  graph[audioEncodeNode] = {
    class_type: 'AudioEncoderEncode',
    inputs: { audio_encoder: [audioEncoderNode, 0], audio: [loadAudioNode, 0] },
  };

  // ---- Stage 3: Wan InfiniteTalk (lip-sync) ----
  const talkModelNode = lnid('talkmodel');
  graph[talkModelNode] = {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: shot.talkModel },
  };

  const talkModelPatchNode = lnid('talkmodelpatch');
  graph[talkModelPatchNode] = {
    class_type: 'ModelPatchLoader',
    inputs: { name: shot.talkModelPatch },
  };

  const talkClipNode = lnid('talkclip');
  graph[talkClipNode] = {
    class_type: 'CLIPLoader',
    inputs: { clip_name: shot.talkClip },
  };

  const talkVaeNode = lnid('talkvae');
  graph[talkVaeNode] = {
    class_type: 'VAELoader',
    inputs: { vae_name: shot.talkVae },
  };

  const talkPosNode = lnid('talkpos');
  graph[talkPosNode] = {
    class_type: 'CLIPTextEncode',
    inputs: { clip: [talkClipNode, 0], text: 'a person talking naturally, realistic facial expressions, lip-synced to speech' },
  };

  const talkNegNode = lnid('talkneg');
  graph[talkNegNode] = {
    class_type: 'CLIPTextEncode',
    inputs: { clip: [talkClipNode, 0], text: 'distorted, deformed, blurry, bad lip sync, frozen face, artifacts' },
  };

  const infiniteTalkNode = lnid('infinitetalk');
  graph[infiniteTalkNode] = {
    class_type: 'WanInfiniteTalkToVideo',
    inputs: {
      mode: { mode: 'single_speaker' },
      model: [talkModelNode, 0],
      model_patch: [talkModelPatchNode, 0],
      positive: [talkPosNode, 0],
      negative: [talkNegNode, 0],
      vae: [talkVaeNode, 0],
      width: shot.width,
      height: shot.height,
      length: shot.length,
      start_image: [faceImageRef[0], faceImageRef[1]],
      audio_encoder_output_1: [audioEncodeNode, 0],
      motion_frame_count: 9,
      audio_scale: 1.0,
    },
  };

  // ---- Stage 4: Sample + decode + save ----
  const samplerNode = lnid('talksampler');
  graph[samplerNode] = {
    class_type: 'KSampler',
    inputs: {
      model: [infiniteTalkNode, 0],
      positive: [infiniteTalkNode, 1],
      negative: [infiniteTalkNode, 2],
      latent_image: [infiniteTalkNode, 3],
      seed: shot.seed,
      steps: shot.steps,
      cfg: shot.cfg,
      sampler_name: shot.sampler,
      scheduler: shot.scheduler,
      denoise: 1.0,
    },
  };

  const decodeNode = lnid('talkdecode');
  graph[decodeNode] = {
    class_type: 'VAEDecode',
    inputs: { samples: [samplerNode, 0], vae: [talkVaeNode, 0] },
  };

  const saveVideoNode = lnid('saveavatarvideo');
  graph[saveVideoNode] = {
    class_type: 'SaveVideo',
    inputs: { images: [decodeNode, 0], filename_prefix: 'local_avatar' },
  };

  return graph;
}

export function defaultLocalAvatarShot(): LocalAvatarShot {
  return {
    facePrompt: '',
    scriptText: '',
    voice: 'Ashley',
    width: 832,
    height: 480,
    length: 81,
    steps: 30,
    cfg: 6.0,
    seed: Math.floor(Math.random() * 2_147_483_647),
    sampler: 'euler',
    scheduler: 'normal',
    faceModel: 'qwen_image.safetensors',
    faceClip: 'qwen_image_text_encoder.safetensors',
    faceVae: 'qwen_image_vae.safetensors',
    talkModel: 'wan2.2_i2v_14b_fp16.safetensors',
    talkModelPatch: 'infinite_talk_patch.safetensors',
    talkClip: 'umt5_xxl.safetensors',
    talkVae: 'wan_2.1_vae.safetensors',
    audioEncoder: 'audio_encoder.safetensors',
  };
}