import { TUNING } from '../data/schema';
import type { PlayerState, Systems, ViewMode } from '../core/types';
import { clamp, cross, normalize, set, v3, type Vec3 } from '../core/vec';
import { maxSpeedFor } from '../sim/energy';

/**
 * Arcade flight model, not a Newtonian one — the ship goes where the nose
 * points, which is what makes the original loop readable. Attitude is stored as
 * yaw/pitch so mouse aim is exact and frame-rate independent: mouse deltas are
 * applied as angle, keyboard/gamepad as a rate.
 */

export interface ShipInput {
  pitch: number;
  yaw: number;
  mouseDx: number;
  mouseDy: number;
  setSpeed: number | null;
  speedDelta: number;
  /** Settings overrides, so the options screen is not lying about what it changes. */
  invertAft: boolean;
  mouseSensitivity: number;
}

export interface ShipUpdateResult {
  /** True when the ship is pressed against the sector boundary. */
  atBoundary: boolean;
  /** True when a throttle command was received (used to cancel docking). */
  throttleChanged: boolean;
  /** True when any attitude input was received (used to cancel docking). */
  attitudeChanged: boolean;
}

const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };
const scratchRight = v3();
const scratchUp = v3();

const MAX_PITCH = 1.35;

export function updatePlayerShip(
  player: PlayerState,
  input: ShipInput,
  dt: number,
  view: ViewMode,
  systems: Systems,
  sectorRadius: number,
): ShipUpdateResult {
  const cfg = TUNING.ship;

  // ---- throttle -----------------------------------------------------------
  let throttleChanged = false;
  const cap = maxSpeedFor(systems);
  if (input.setSpeed !== null && input.setSpeed !== player.targetSpeed) {
    player.targetSpeed = input.setSpeed;
    throttleChanged = true;
  }
  if (input.speedDelta !== 0) {
    player.targetSpeed = Math.round(clamp(player.targetSpeed + input.speedDelta, 0, cap));
    throttleChanged = true;
  }
  player.targetSpeed = Math.round(clamp(player.targetSpeed, 0, cap));
  player.speed = player.speed + (player.targetSpeed - player.speed) * (1 - Math.exp(-cfg.speedLerp * dt));

  // ---- attitude -----------------------------------------------------------
  const yawSign = view === 'aft' && input.invertAft ? -1 : 1;
  const beforeYaw = player.yaw;
  const beforePitch = player.pitch;

  player.yaw += input.yaw * cfg.yawRate * dt * yawSign;
  player.pitch += input.pitch * cfg.pitchRate * dt;

  // Mouse deltas are applied as direct angle, so aim speed is not tied to FPS.
  player.yaw += input.mouseDx * input.mouseSensitivity * yawSign;
  player.pitch -= input.mouseDy * input.mouseSensitivity;

  player.pitch = clamp(player.pitch, -MAX_PITCH, MAX_PITCH);

  const attitudeChanged =
    Math.abs(player.yaw - beforeYaw) > 1e-5 || Math.abs(player.pitch - beforePitch) > 1e-5;

  // ---- basis vectors ------------------------------------------------------
  const cosPitch = Math.cos(player.pitch);
  set(player.heading, Math.sin(player.yaw) * cosPitch, Math.sin(player.pitch), -Math.cos(player.yaw) * cosPitch);
  normalize(player.heading, player.heading);

  cross(scratchRight, player.heading, WORLD_UP);
  if (Math.abs(scratchRight.x) + Math.abs(scratchRight.y) + Math.abs(scratchRight.z) < 1e-4) {
    set(scratchRight, 1, 0, 0);
  }
  normalize(player.right, scratchRight);
  cross(scratchUp, player.right, player.heading);
  normalize(player.up, scratchUp);

  // Visual bank only — it never changes where the ship is going.
  const bankTarget = -input.yaw * cfg.bankFactor - (input.mouseDx * 0.0006 * yawSign);
  player.roll = player.roll + (bankTarget - player.roll) * (1 - Math.exp(-6 * dt));

  // ---- translation --------------------------------------------------------
  const velocity = player.speed * cfg.unitsPerSpeed;
  player.pos.x += player.heading.x * velocity * dt;
  player.pos.y += player.heading.y * velocity * dt;
  player.pos.z += player.heading.z * velocity * dt;

  // ---- sector boundary ----------------------------------------------------
  let atBoundary = false;
  const distanceSq = player.pos.x ** 2 + player.pos.y ** 2 + player.pos.z ** 2;
  if (distanceSq > sectorRadius * sectorRadius) {
    const scale = sectorRadius / Math.sqrt(distanceSq);
    player.pos.x *= scale;
    player.pos.y *= scale;
    player.pos.z *= scale;
    atBoundary = true;
  }

  return { atBoundary, throttleChanged, attitudeChanged };
}

/** World-space velocity of the player ship, used for enemy lead computation. */
export function playerVelocity(player: PlayerState, out: Vec3): Vec3 {
  const speed = player.speed * TUNING.ship.unitsPerSpeed;
  out.x = player.heading.x * speed;
  out.y = player.heading.y * speed;
  out.z = player.heading.z * speed;
  return out;
}
