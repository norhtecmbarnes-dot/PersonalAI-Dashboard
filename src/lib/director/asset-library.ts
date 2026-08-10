export const runtime = 'nodejs';

import { sqlDatabase } from '@/lib/database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export interface DirectorCharacter {
  id: string;
  name: string;
  description: string;
  refImageName?: string;
  refImageSubfolder?: string;
  refImageType?: string;
  tags?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DirectorScene {
  id: string;
  name: string;
  description: string;
  imageName?: string;
  imageSubfolder?: string;
  imageType?: string;
  prompt?: string;
  tags?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DirectorShot {
  id: string;
  chainId?: string;
  shotIndex: number;
  prompt: string;
  negativePrompt?: string;
  characterIds?: string;
  sceneId?: string;
  firstFrameName?: string;
  firstFrameSubfolder?: string;
  firstFrameType?: string;
  lastFrameName?: string;
  lastFrameSubfolder?: string;
  lastFrameType?: string;
  videoName?: string;
  videoSubfolder?: string;
  videoType?: string;
  seed?: number;
  status: 'pending' | 'rendering' | 'done' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface DirectorChain {
  id: string;
  name: string;
  description: string;
  shotIds?: string;
  status: 'planning' | 'rendering' | 'done' | 'failed';
  createdAt: number;
  updatedAt: number;
}

function rowToCharacter(row: any[]): DirectorCharacter {
  return {
    id: row[0],
    name: row[1],
    description: row[2] || '',
    refImageName: row[3] || undefined,
    refImageSubfolder: row[4] || undefined,
    refImageType: row[5] || undefined,
    tags: row[6] || undefined,
    createdAt: row[7],
    updatedAt: row[8],
  };
}

function rowToScene(row: any[]): DirectorScene {
  return {
    id: row[0],
    name: row[1],
    description: row[2] || '',
    imageName: row[3] || undefined,
    imageSubfolder: row[4] || undefined,
    imageType: row[5] || undefined,
    prompt: row[6] || undefined,
    tags: row[7] || undefined,
    createdAt: row[8],
    updatedAt: row[9],
  };
}

function rowToShot(row: any[]): DirectorShot {
  return {
    id: row[0],
    chainId: row[1] || undefined,
    shotIndex: row[2] || 0,
    prompt: row[3],
    negativePrompt: row[4] || undefined,
    characterIds: row[5] || undefined,
    sceneId: row[6] || undefined,
    firstFrameName: row[7] || undefined,
    firstFrameSubfolder: row[8] || undefined,
    firstFrameType: row[9] || undefined,
    lastFrameName: row[10] || undefined,
    lastFrameSubfolder: row[11] || undefined,
    lastFrameType: row[12] || undefined,
    videoName: row[13] || undefined,
    videoSubfolder: row[14] || undefined,
    videoType: row[15] || undefined,
    seed: row[16] || undefined,
    status: row[17] || 'pending',
    createdAt: row[18],
    updatedAt: row[19],
  };
}

function rowToChain(row: any[]): DirectorChain {
  return {
    id: row[0],
    name: row[1],
    description: row[2] || '',
    shotIds: row[3] || undefined,
    status: row[4] || 'planning',
    createdAt: row[5],
    updatedAt: row[6],
  };
}

// --- Characters ---

export function createCharacter(data: Partial<DirectorCharacter>): DirectorCharacter {
  const now = Date.now();
  const character: DirectorCharacter = {
    id: data.id || uuidv4(),
    name: data.name || 'Untitled',
    description: data.description || '',
    refImageName: data.refImageName,
    refImageSubfolder: data.refImageSubfolder,
    refImageType: data.refImageType,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
  };
  sqlDatabase.runSql(
    `INSERT INTO director_characters (id, name, description, ref_image_name, ref_image_subfolder, ref_image_type, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [character.id, character.name, character.description, character.refImageName || null, character.refImageSubfolder || null, character.refImageType || null, character.tags || null, character.createdAt, character.updatedAt]
  );
  return character;
}

export function listCharacters(): DirectorCharacter[] {
  const result = sqlDatabase.querySql('SELECT id, name, description, ref_image_name, ref_image_subfolder, ref_image_type, tags, created_at, updated_at FROM director_characters ORDER BY updated_at DESC');
  if (result.length === 0) return [];
  return result[0].values.map(rowToCharacter);
}

export function getCharacter(id: string): DirectorCharacter | null {
  const result = sqlDatabase.querySql('SELECT id, name, description, ref_image_name, ref_image_subfolder, ref_image_type, tags, created_at, updated_at FROM director_characters WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToCharacter(result[0].values[0]);
}

export function updateCharacter(id: string, updates: Partial<DirectorCharacter>): void {
  const existing = getCharacter(id);
  if (!existing) return;
  const merged = { ...existing, ...updates, updatedAt: Date.now() };
  sqlDatabase.runSql(
    `UPDATE director_characters SET name = ?, description = ?, ref_image_name = ?, ref_image_subfolder = ?, ref_image_type = ?, tags = ?, updated_at = ? WHERE id = ?`,
    [merged.name, merged.description, merged.refImageName || null, merged.refImageSubfolder || null, merged.refImageType || null, merged.tags || null, merged.updatedAt, id]
  );
}

export function deleteCharacter(id: string): void {
  sqlDatabase.runSql('DELETE FROM director_characters WHERE id = ?', [id]);
}

// --- Scenes ---

export function createScene(data: Partial<DirectorScene>): DirectorScene {
  const now = Date.now();
  const scene: DirectorScene = {
    id: data.id || uuidv4(),
    name: data.name || 'Untitled Scene',
    description: data.description || '',
    imageName: data.imageName,
    imageSubfolder: data.imageSubfolder,
    imageType: data.imageType,
    prompt: data.prompt,
    tags: data.tags,
    createdAt: now,
    updatedAt: now,
  };
  sqlDatabase.runSql(
    `INSERT INTO director_scenes (id, name, description, image_name, image_subfolder, image_type, prompt, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [scene.id, scene.name, scene.description, scene.imageName || null, scene.imageSubfolder || null, scene.imageType || null, scene.prompt || null, scene.tags || null, scene.createdAt, scene.updatedAt]
  );
  return scene;
}

export function listScenes(): DirectorScene[] {
  const result = sqlDatabase.querySql('SELECT id, name, description, image_name, image_subfolder, image_type, prompt, tags, created_at, updated_at FROM director_scenes ORDER BY updated_at DESC');
  if (result.length === 0) return [];
  return result[0].values.map(rowToScene);
}

export function getScene(id: string): DirectorScene | null {
  const result = sqlDatabase.querySql('SELECT id, name, description, image_name, image_subfolder, image_type, prompt, tags, created_at, updated_at FROM director_scenes WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToScene(result[0].values[0]);
}

export function updateScene(id: string, updates: Partial<DirectorScene>): void {
  const existing = getScene(id);
  if (!existing) return;
  const merged = { ...existing, ...updates, updatedAt: Date.now() };
  sqlDatabase.runSql(
    `UPDATE director_scenes SET name = ?, description = ?, image_name = ?, image_subfolder = ?, image_type = ?, prompt = ?, tags = ?, updated_at = ? WHERE id = ?`,
    [merged.name, merged.description, merged.imageName || null, merged.imageSubfolder || null, merged.imageType || null, merged.prompt || null, merged.tags || null, merged.updatedAt, id]
  );
}

export function deleteScene(id: string): void {
  sqlDatabase.runSql('DELETE FROM director_scenes WHERE id = ?', [id]);
}

// --- Shots ---

export function createShot(data: Partial<DirectorShot>): DirectorShot {
  const now = Date.now();
  const shot: DirectorShot = {
    id: data.id || uuidv4(),
    chainId: data.chainId,
    shotIndex: data.shotIndex || 0,
    prompt: data.prompt || '',
    negativePrompt: data.negativePrompt,
    characterIds: data.characterIds,
    sceneId: data.sceneId,
    firstFrameName: data.firstFrameName,
    firstFrameSubfolder: data.firstFrameSubfolder,
    firstFrameType: data.firstFrameType,
    lastFrameName: data.lastFrameName,
    lastFrameSubfolder: data.lastFrameSubfolder,
    lastFrameType: data.lastFrameType,
    videoName: data.videoName,
    videoSubfolder: data.videoSubfolder,
    videoType: data.videoType,
    seed: data.seed,
    status: data.status || 'pending',
    createdAt: now,
    updatedAt: now,
  };
  sqlDatabase.runSql(
    `INSERT INTO director_shots (id, chain_id, shot_index, prompt, negative_prompt, character_ids, scene_id, first_frame_name, first_frame_subfolder, first_frame_type, last_frame_name, last_frame_subfolder, last_frame_type, video_name, video_subfolder, video_type, seed, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [shot.id, shot.chainId || null, shot.shotIndex, shot.prompt, shot.negativePrompt || null, shot.characterIds || null, shot.sceneId || null, shot.firstFrameName || null, shot.firstFrameSubfolder || null, shot.firstFrameType || null, shot.lastFrameName || null, shot.lastFrameSubfolder || null, shot.lastFrameType || null, shot.videoName || null, shot.videoSubfolder || null, shot.videoType || null, shot.seed || null, shot.status, shot.createdAt, shot.updatedAt]
  );
  return shot;
}

export function listShots(chainId?: string): DirectorShot[] {
  const query = chainId
    ? 'SELECT id, chain_id, shot_index, prompt, negative_prompt, character_ids, scene_id, first_frame_name, first_frame_subfolder, first_frame_type, last_frame_name, last_frame_subfolder, last_frame_type, video_name, video_subfolder, video_type, seed, status, created_at, updated_at FROM director_shots WHERE chain_id = ? ORDER BY shot_index ASC'
    : 'SELECT id, chain_id, shot_index, prompt, negative_prompt, character_ids, scene_id, first_frame_name, first_frame_subfolder, first_frame_type, last_frame_name, last_frame_subfolder, last_frame_type, video_name, video_subfolder, video_type, seed, status, created_at, updated_at FROM director_shots ORDER BY created_at DESC';
  const result = chainId ? sqlDatabase.querySql(query, [chainId]) : sqlDatabase.querySql(query);
  if (result.length === 0) return [];
  return result[0].values.map(rowToShot);
}

export function getShot(id: string): DirectorShot | null {
  const result = sqlDatabase.querySql('SELECT id, chain_id, shot_index, prompt, negative_prompt, character_ids, scene_id, first_frame_name, first_frame_subfolder, first_frame_type, last_frame_name, last_frame_subfolder, last_frame_type, video_name, video_subfolder, video_type, seed, status, created_at, updated_at FROM director_shots WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToShot(result[0].values[0]);
}

export function updateShot(id: string, updates: Partial<DirectorShot>): void {
  const existing = getShot(id);
  if (!existing) return;
  const merged = { ...existing, ...updates, updatedAt: Date.now() };
  sqlDatabase.runSql(
    `UPDATE director_shots SET chain_id = ?, shot_index = ?, prompt = ?, negative_prompt = ?, character_ids = ?, scene_id = ?, first_frame_name = ?, first_frame_subfolder = ?, first_frame_type = ?, last_frame_name = ?, last_frame_subfolder = ?, last_frame_type = ?, video_name = ?, video_subfolder = ?, video_type = ?, seed = ?, status = ?, updated_at = ? WHERE id = ?`,
    [merged.chainId || null, merged.shotIndex, merged.prompt, merged.negativePrompt || null, merged.characterIds || null, merged.sceneId || null, merged.firstFrameName || null, merged.firstFrameSubfolder || null, merged.firstFrameType || null, merged.lastFrameName || null, merged.lastFrameSubfolder || null, merged.lastFrameType || null, merged.videoName || null, merged.videoSubfolder || null, merged.videoType || null, merged.seed || null, merged.status, merged.updatedAt, id]
  );
}

export function deleteShot(id: string): void {
  sqlDatabase.runSql('DELETE FROM director_shots WHERE id = ?', [id]);
}

// --- Chains ---

export function createChain(data: Partial<DirectorChain>): DirectorChain {
  const now = Date.now();
  const chain: DirectorChain = {
    id: data.id || uuidv4(),
    name: data.name || 'Untitled Chain',
    description: data.description || '',
    shotIds: data.shotIds,
    status: data.status || 'planning',
    createdAt: now,
    updatedAt: now,
  };
  sqlDatabase.runSql(
    `INSERT INTO director_chains (id, name, description, shot_ids, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [chain.id, chain.name, chain.description, chain.shotIds || null, chain.status, chain.createdAt, chain.updatedAt]
  );
  return chain;
}

export function listChains(): DirectorChain[] {
  const result = sqlDatabase.querySql('SELECT id, name, description, shot_ids, status, created_at, updated_at FROM director_chains ORDER BY updated_at DESC');
  if (result.length === 0) return [];
  return result[0].values.map(rowToChain);
}

export function getChain(id: string): DirectorChain | null {
  const result = sqlDatabase.querySql('SELECT id, name, description, shot_ids, status, created_at, updated_at FROM director_chains WHERE id = ?', [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  return rowToChain(result[0].values[0]);
}

export function updateChain(id: string, updates: Partial<DirectorChain>): void {
  const existing = getChain(id);
  if (!existing) return;
  const merged = { ...existing, ...updates, updatedAt: Date.now() };
  sqlDatabase.runSql(
    `UPDATE director_chains SET name = ?, description = ?, shot_ids = ?, status = ?, updated_at = ? WHERE id = ?`,
    [merged.name, merged.description, merged.shotIds || null, merged.status, merged.updatedAt, id]
  );
}

export function deleteChain(id: string): void {
  sqlDatabase.runSql('DELETE FROM director_chains WHERE id = ?', [id]);
  sqlDatabase.runSql('DELETE FROM director_shots WHERE chain_id = ?', [id]);
}