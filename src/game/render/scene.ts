import * as THREE from 'three';
import { TUNING } from '../data/schema';
import type { Asteroid, EnemyShip, PlayerState, ViewMode } from '../core/types';
import type { PhotonPool } from '../weapons/photons';
import { buildPointField, type SectorLayout } from '../galaxy/sector';

/**
 * The WebGL world: everything outside the cockpit. Stars, dust, rock, ships,
 * bolts, and short bright deaths.
 *
 * Deliberately no post-processing stack. The brief asks for "short explosion
 * then debris, not a 4-second cutscene", and a bloom pass on a mid-range PC is
 * exactly how you lose the 60 FPS budget. Bright additive geometry plus a
 * dark background buys the glow for free.
 */

const BASE_FOV = 62;

/** Pooled particle effects (explosions, hit sparks, warp streaks). */
class Effects {
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly velocities: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly baseColor: Float32Array;
  private head = 0;
  readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;

  constructor(private readonly capacity = 420) {
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.baseColor = new Float32Array(capacity * 3);

    for (let i = 0; i < capacity; i++) {
      this.positions[i * 3 + 1] = 1e6; // park dead particles out of frustum
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 46,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  burst(
    position: { x: number; y: number; z: number },
    color: number,
    count: number,
    speed: number,
    life: number,
    size = 46,
  ) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const index = this.head;
      this.head = (this.head + 1) % this.capacity;

      this.positions[index * 3] = position.x;
      this.positions[index * 3 + 1] = position.y;
      this.positions[index * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const magnitude = speed * (0.35 + Math.random() * 0.85);
      this.velocities[index * 3] = Math.sin(phi) * Math.cos(theta) * magnitude;
      this.velocities[index * 3 + 1] = Math.cos(phi) * magnitude;
      this.velocities[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * magnitude;

      const warmth = 0.65 + Math.random() * 0.35;
      this.baseColor[index * 3] = c.r * warmth;
      this.baseColor[index * 3 + 1] = c.g * warmth;
      this.baseColor[index * 3 + 2] = c.b * warmth;

      this.colors[index * 3] = c.r;
      this.colors[index * 3 + 1] = c.g;
      this.colors[index * 3 + 2] = c.b;

      this.maxLife[index] = life * (0.6 + Math.random() * 0.7);
      this.life[index] = this.maxLife[index];
    }
    this.material.size = size;
    this.points.visible = true;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  update(dt: number) {
    let alive = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      alive++;
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);

      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

      // Drag so debris slows rather than flying off forever.
      this.velocities[i * 3] *= 1 - 1.6 * dt;
      this.velocities[i * 3 + 1] *= 1 - 1.6 * dt;
      this.velocities[i * 3 + 2] *= 1 - 1.6 * dt;

      // Additive blending means fading to black is fading to nothing.
      this.colors[i * 3] = this.baseColor[i * 3] * t;
      this.colors[i * 3 + 1] = this.baseColor[i * 3 + 1] * t;
      this.colors[i * 3 + 2] = this.baseColor[i * 3 + 2] * t;

      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = 1e6;
      }
    }
    this.points.visible = alive > 0;
    if (alive > 0) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  reset() {
    this.life.fill(0);
    for (let i = 0; i < this.capacity; i++) this.positions[i * 3 + 1] = 1e6;
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

interface BoltVisual {
  mesh: THREE.InstancedMesh;
  dummy: THREE.Object3D;
  color: THREE.Color;
}

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly world = new THREE.Group();
  private readonly enemyMeshes = new Map<EnemyShip, THREE.Object3D>();
  private readonly effects = new Effects();
  private bolts: BoltVisual | null = null;
  private baseObject: THREE.Object3D | null = null;
  private sunLight: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private stars: THREE.Points;
  private dust: THREE.Points;
  private asteroidMeshes: THREE.Mesh[] = [];
  private disposed = false;

  // Reused objects so per-frame work allocates nothing.
  private readonly vForward = new THREE.Vector3();
  private readonly vUp = new THREE.Vector3();
  private readonly vRight = new THREE.Vector3();
  private readonly vScratch = new THREE.Vector3();
  private readonly mBasis = new THREE.Matrix4();

  private readonly asteroidGeometry = new THREE.IcosahedronGeometry(1, 1);
  private readonly asteroidMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b6157,
    roughness: 0.96,
    metalness: 0.05,
    flatShading: true,
  });

  constructor(canvas: HTMLCanvasElement, starCount: number, dustCount: number, sectorRadius: number) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setClearColor(0x03040a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 2, sectorRadius * 12);

    this.scene.add(this.world);
    this.scene.add(this.effects.points);

    this.ambient = new THREE.AmbientLight(0x2b3550, 0.55);
    this.sunLight = new THREE.DirectionalLight(0xfff0d0, 3);
    this.sunLight.position.set(1, 1, 1);
    this.scene.add(this.ambient, this.sunLight);

    // ---- starfield --------------------------------------------------------
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = buildPointField(starCount, sectorRadius * 9, 0x5eed);
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const tint = 0.75 + Math.random() * 0.25;
      const cool = Math.random() < 0.25;
      starColors[i * 3] = tint * (cool ? 0.8 : 1);
      starColors[i * 3 + 1] = tint * 0.93;
      starColors[i * 3 + 2] = tint * (cool ? 1.3 : 0.92);
    }
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: 26,
        vertexColors: true,
        sizeAttenuation: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.stars.frustumCulled = false;

    // ---- near dust (speed parallax) ---------------------------------------
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = buildPointField(dustCount, sectorRadius * 1.1, 0xd057);
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        size: 12,
        color: 0x9fb6d4,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    this.dust.frustumCulled = false;

    this.scene.add(this.stars, this.dust);
    this.resize(16, 9, 1);
  }

  /** Rebuild everything that belongs to a single sector. */
  setSector(layout: SectorLayout) {
    this.clearWorld();

    this.sunLight.color.setHex(layout.sun.color);
    this.sunLight.intensity = layout.sun.intensity;
    this.sunLight.position.set(
      layout.sun.direction.x * 1000,
      layout.sun.direction.y * 1000,
      layout.sun.direction.z * 1000,
    );

    for (const asteroid of layout.asteroids) {
      const mesh = new THREE.Mesh(this.asteroidGeometry, this.asteroidMaterial);
      mesh.position.set(asteroid.pos.x, asteroid.pos.y, asteroid.pos.z);
      mesh.scale.setScalar(asteroid.radius);
      mesh.rotation.set(asteroid.angle, asteroid.angle * 0.7, asteroid.angle * 0.3);
      this.world.add(mesh);
      this.asteroidMeshes.push(mesh);
    }

    if (layout.base) {
      this.baseObject = this.createBase(layout.base.radius);
      this.baseObject.position.set(layout.base.pos.x, layout.base.pos.y, layout.base.pos.z);
      this.world.add(this.baseObject);
    }
  }

  private createBase(radius: number): THREE.Object3D {
    const group = new THREE.Group();

    const hull = new THREE.MeshStandardMaterial({
      color: 0xa8bccd,
      metalness: 0.72,
      roughness: 0.32,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.11, 10, 36), hull);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const spokeGeometry = new THREE.BoxGeometry(radius * 1.85, radius * 0.05, radius * 0.07);
    for (let i = 0; i < 3; i++) {
      const spoke = new THREE.Mesh(spokeGeometry, hull);
      spoke.rotation.y = (i / 3) * Math.PI;
      group.add(spoke);
    }

    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.2, radius * 0.26, radius * 0.5, 12),
      hull,
    );
    group.add(core);

    // Beacon: additive so it reads as "friendly" from across the sector.
    const beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ffcc,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.16, 12, 12), beaconMaterial);
    beacon.position.y = radius * 0.4;
    group.add(beacon);

    const beaconLight = new THREE.PointLight(0x66ffcc, 900, radius * 9, 2);
    beaconLight.position.copy(beacon.position);
    group.add(beaconLight);

    return group;
  }

  private ensureBolts(pool: PhotonPool) {
    if (this.bolts && this.bolts.mesh.count === pool.items.length) return this.bolts;

    if (this.bolts) {
      this.world.remove(this.bolts.mesh);
      this.bolts.mesh.dispose();
    }

    const geometry = new THREE.BoxGeometry(9, 9, 78);
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, pool.items.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;

    const color = new THREE.Color(0xffffff);
    for (let i = 0; i < pool.items.length; i++) mesh.setColorAt(i, color);

    this.world.add(mesh);
    this.bolts = { mesh, dummy: new THREE.Object3D(), color };
    return this.bolts;
  }

  syncBolts(pool: PhotonPool) {
    const visual = this.ensureBolts(pool);
    const { mesh, dummy, color } = visual;

    const forward = this.vScratch.set(0, 0, 1);
    for (let i = 0; i < pool.items.length; i++) {
      const bolt = pool.items[i];
      if (!bolt.active) {
        dummy.position.set(0, 1e6, 0);
        dummy.scale.setScalar(0.0001);
        dummy.quaternion.identity();
      } else {
        dummy.position.set(bolt.pos.x, bolt.pos.y, bolt.pos.z);
        dummy.scale.setScalar(bolt.friendly ? 1 : 1.15);
        this.vForward.set(bolt.vel.x, bolt.vel.y, bolt.vel.z).normalize();
        dummy.quaternion.setFromUnitVectors(forward, this.vForward);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (bolt.active) {
        color.setHex(bolt.friendly ? 0x8fe9ff : 0xff7a45);
        mesh.setColorAt(i, color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private ensureEnemyMesh(enemy: EnemyShip): THREE.Object3D {
    const existing = this.enemyMeshes.get(enemy);
    if (existing) return existing;

    const group = new THREE.Group();

    const hullColor = enemy.drone ? 0x3f6a5c : 0x8e2130;
    const hull = new THREE.MeshStandardMaterial({
      color: hullColor,
      metalness: 0.55,
      roughness: 0.42,
      emissive: enemy.drone ? 0x0a2a22 : 0x25050a,
    });

    if (enemy.kind === 'anvil') {
      // Heavy cruiser: a deep slab body, twin pods, a wide dorsal plate. It
      // should read as "big" before it reads as "enemy" — that is the tell.
      const body = new THREE.Mesh(new THREE.BoxGeometry(150, 60, 300), hull);
      group.add(body);

      const plate = new THREE.Mesh(new THREE.BoxGeometry(260, 10, 140), hull);
      plate.position.z = 30;
      group.add(plate);

      const podGeometry = new THREE.CylinderGeometry(22, 22, 180, 8);
      const podLeft = new THREE.Mesh(podGeometry, hull);
      podLeft.rotation.x = Math.PI / 2;
      podLeft.position.set(-95, -10, -20);
      group.add(podLeft);

      const podRight = new THREE.Mesh(podGeometry, hull);
      podRight.rotation.x = Math.PI / 2;
      podRight.position.set(95, -10, -20);
      group.add(podRight);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(26, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(enemy.engineHue, 0.95, 0.55),
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      glow.position.z = -170;
      group.add(glow);

      this.world.add(group);
      this.enemyMeshes.set(enemy, group);
      return group;
    }

    if (enemy.kind === 'lance') {
      // Duelist: a long needle with a ring cowl and short swept fins — a
      // spear in flight, instantly distinct from the Dart's delta planform.
      const needleGeometry = new THREE.CylinderGeometry(9, 16, 200, 6);
      needleGeometry.rotateX(Math.PI / 2);
      const needle = new THREE.Mesh(needleGeometry, hull);
      group.add(needle);

      const cowl = new THREE.Mesh(new THREE.TorusGeometry(26, 7, 8, 18), hull);
      cowl.position.z = 60;
      group.add(cowl);

      const fin = new THREE.Mesh(new THREE.BoxGeometry(70, 6, 44), hull);
      fin.position.z = -40;
      group.add(fin);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(14, 10, 10),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(enemy.engineHue, 0.95, 0.6),
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      glow.position.z = -110;
      group.add(glow);

      this.world.add(group);
      this.enemyMeshes.set(enemy, group);
      return group;
    }

    // Body points along +Z so Object3D.lookAt orients it correctly.
    const bodyGeometry = new THREE.ConeGeometry(26, 96, 5);
    bodyGeometry.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeometry, hull);
    group.add(body);

    const wingGeometry = new THREE.BoxGeometry(120, 6, 34);
    const wing = new THREE.Mesh(wingGeometry, hull);
    wing.position.z = 6;
    group.add(wing);

    const finGeometry = new THREE.BoxGeometry(7, 34, 30);
    const fin = new THREE.Mesh(finGeometry, hull);
    fin.position.set(0, 14, -10);
    group.add(fin);

    // Engine glow: the readable silhouette cue at long range.
    const glowColor = new THREE.Color().setHSL(enemy.engineHue, 0.95, 0.6);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(15, 10, 10),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    glow.position.z = -40;
    group.add(glow);

    this.world.add(group);
    this.enemyMeshes.set(enemy, group);
    return group;
  }

  syncEnemies(enemies: EnemyShip[]) {
    for (const enemy of enemies) {
      const mesh = this.enemyMeshes.get(enemy);
      const shouldShow = enemy.active && enemy.detail && !enemy.drone;
      const showDrone = enemy.active && enemy.drone;

      if (!enemy.active) {
        if (mesh) {
          this.world.remove(mesh);
          this.enemyMeshes.delete(enemy);
        }
        continue;
      }

      // Queued ships stay off screen entirely — that is the readability rule.
      if (!shouldShow && !showDrone) {
        if (mesh) mesh.visible = false;
        continue;
      }

      const object = this.ensureEnemyMesh(enemy);
      object.visible = true;
      object.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      this.vScratch.set(
        enemy.pos.x + enemy.heading.x,
        enemy.pos.y + enemy.heading.y,
        enemy.pos.z + enemy.heading.z,
      );
      object.lookAt(this.vScratch);
    }
  }

  spawnExplosion(position: { x: number; y: number; z: number }, large: boolean, hostile: boolean) {
    const color = hostile ? 0xffa14a : 0xffd28a;
    this.effects.burst(position, color, large ? 34 : 12, large ? 520 : 260, large ? 0.75 : 0.34, large ? 72 : 40);
    if (large) {
      this.effects.burst(position, 0xffffff, 12, 200, 0.2, 96);
    }
  }

  spawnShieldHit(position: { x: number; y: number; z: number }) {
    this.effects.burst(position, 0x8fd8ff, 10, 180, 0.26, 34);
  }

  spawnWarpStreaks(position: { x: number; y: number; z: number }) {
    this.effects.burst(position, 0xbfe6ff, 26, 1400, 0.5, 58);
  }

  updateEffects(dt: number) {
    this.effects.update(dt);
  }

  resetEffects() {
    this.effects.reset();
    this.enemyMeshes.forEach(mesh => this.world.remove(mesh));
    this.enemyMeshes.clear();
  }

  private clearWorld() {
    for (const mesh of this.asteroidMeshes) this.world.remove(mesh);
    this.asteroidMeshes = [];
    if (this.baseObject) {
      this.world.remove(this.baseObject);
      this.baseObject = null;
    }
    this.enemyMeshes.forEach(mesh => this.world.remove(mesh));
    this.enemyMeshes.clear();
  }

  resize(width: number, height: number, pixelRatio: number) {
    if (this.disposed) return;
    this.renderer.setPixelRatio(Math.min(pixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  /** Paint one frame. `speed` drives the FOV punch; `view` picks fore or aft. */
  render(player: PlayerState, view: ViewMode, speed: number) {
    const aft = view === 'aft';

    this.vForward.set(player.heading.x, player.heading.y, player.heading.z);
    this.vUp.set(player.up.x, player.up.y, player.up.z);
    this.vRight.set(player.right.x, player.right.y, player.right.z);

    if (aft) {
      this.vForward.negate();
      this.vRight.negate();
    }

    // Cameras look down their own -Z, so the basis is (right, up, -forward).
    this.vScratch.copy(this.vForward).negate();
    this.mBasis.makeBasis(this.vRight, this.vUp, this.vScratch);
    this.camera.matrixAutoUpdate = false;
    this.camera.matrix.copy(this.mBasis);
    this.camera.matrix.setPosition(player.pos.x, player.pos.y, player.pos.z);
    this.camera.matrixWorldNeedsUpdate = true;
    this.camera.updateMatrixWorld(true);

    // Speed punch: a wider lens at speed 9 without hiding information.
    const targetFov = BASE_FOV + speed * 1.35;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    const dustMaterial = this.dust.material as THREE.PointsMaterial;
    dustMaterial.size = 12 + speed * 8;
    dustMaterial.opacity = 0.32 + speed * 0.05;

    this.stars.position.set(
      player.pos.x * 0.0004,
      player.pos.y * 0.0004,
      player.pos.z * 0.0004,
    );
    this.stars.rotation.y += 0.00002;

    this.renderer.render(this.scene, this.camera);
  }

  /** The WebGL canvas, needed for pointer lock. */
  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Project a world point to normalised screen coordinates, or report that it
   * is behind the camera. Used for lock boxes, docking brackets and compass
   * contacts — anything that has to track a point in the world.
   */
  project(point: { x: number; y: number; z: number }): { x: number; y: number; inFront: boolean } {
    this.vScratch.set(point.x, point.y, point.z).applyMatrix4(this.camera.matrixWorldInverse);
    const inFront = this.vScratch.z < -1;
    this.vScratch.set(point.x, point.y, point.z).project(this.camera);
    return { x: this.vScratch.x, y: this.vScratch.y, inFront };
  }

  get asteroids(): readonly Asteroid[] {
    return this.asteroidMeshes.map(m => ({
      pos: { x: m.position.x, y: m.position.y, z: m.position.z },
      radius: m.scale.x,
      spin: { x: 0, y: 0, z: 0 },
      angle: 0,
      seed: 0,
    }));
  }

  /** Number of live WebGL resources, for the perf readout. */
  get stats() {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resetEffects();
    this.clearWorld();
    if (this.bolts) {
      this.world.remove(this.bolts.mesh);
      this.bolts.mesh.geometry.dispose();
      (this.bolts.mesh.material as THREE.Material).dispose();
      this.bolts = null;
    }
    this.effects.dispose();
    this.asteroidGeometry.dispose();
    this.asteroidMaterial.dispose();
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
    this.dust.geometry.dispose();
    (this.dust.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}

/** Rotate an asteroid mesh for a little life without a physics engine. */
export function spinAsteroids(meshes: THREE.Mesh[], dt: number) {
  for (const mesh of meshes) {
    mesh.rotation.x += dt * 0.06;
    mesh.rotation.y += dt * 0.04;
  }
}
