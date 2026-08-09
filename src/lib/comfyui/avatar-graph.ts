import type { UploadedImage } from './client';

export interface AvatarShot {
  photoFile?: UploadedImage;
  audioFile?: { name: string; subfolder: string; type: string };
  text: string;
  voice: string;
  resolution: '720p' | '1080p';
  aspectRatio: 'auto' | '16:9' | '9:16' | '1:1' | '4:5' | '5:4';
  expressiveness: 'low' | 'medium' | 'high';
  speechSource: 'script' | 'audio';
  seed: number;
}

let _avatarNodeSeq = 1;
function anid(prefix: string): string {
  return `${prefix}_${_avatarNodeSeq++}`;
}

/**
 * Build a ComfyUI graph for HeyGen Talking Photo — animates a still photo
 * with lip-sync, driven by either a text script (HeyGen TTS) or an uploaded
 * audio file (e.g. from VocalLab).
 */
export function buildAvatarGraph(shot: AvatarShot): Record<string, unknown> {
  _avatarNodeSeq = 1;
  const graph: Record<string, unknown> = {};

  if (!shot.photoFile) {
    throw new Error('A photo image is required for the avatar');
  }

  // Load the photo
  const loadImageNode = anid('loadphoto');
  graph[loadImageNode] = {
    class_type: 'LoadImage',
    inputs: { image: `${shot.photoFile.subfolder}/${shot.photoFile.name}` },
  };

  // Build the speech source dict that the HeyGen node expects
  let speech: Record<string, unknown>;
  if (shot.speechSource === 'audio' && shot.audioFile) {
    const loadAudioNode = anid('loadaudio');
    graph[loadAudioNode] = {
      class_type: 'LoadAudio',
      inputs: { audio: `${shot.audioFile.subfolder}/${shot.audioFile.name}` },
    };
    speech = {
      speech: 'audio',
      audio: [loadAudioNode, 0],
    };
  } else {
    speech = {
      speech: 'script',
      text: shot.text,
      voice: shot.voice,
    };
  }

  // HeyGen Talking Photo node
  const heygenNode = anid('heygen');
  graph[heygenNode] = {
    class_type: 'HeyGenTalkingPhotoNode',
    inputs: {
      image: [loadImageNode, 0],
      speech,
      resolution: shot.resolution,
      aspect_ratio: shot.aspectRatio,
      expressiveness: shot.expressiveness,
      seed: shot.seed,
    },
  };

  // Save the output video
  const saveNode = anid('savevideo');
  graph[saveNode] = {
    class_type: 'SaveVideo',
    inputs: {
      images: [heygenNode, 0],
      filename_prefix: 'avatar_director',
    },
  };

  return graph;
}

export function defaultAvatarShot(): AvatarShot {
  return {
    text: '',
    voice: 'Ashley',
    resolution: '1080p',
    aspectRatio: 'auto',
    expressiveness: 'medium',
    speechSource: 'script',
    seed: Math.floor(Math.random() * 2_147_483_647),
  };
}