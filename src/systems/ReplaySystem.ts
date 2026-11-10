import * as THREE from 'three';
import { ReplayFrame } from '../types';
import { Player } from '../entities/Player';
import { Referee } from '../entities/Referee';
import { WorldCupBall } from '../entities/WorldCupBall';

export class ReplaySystem {
  private frames: ReplayFrame[] = [];
  private maxFrames: number = 110; // ~3.5 seconds at 30Hz
  private recordAccum: number = 0;
  private playbackIndex: number = 0;
  public isPlaying: boolean = false;

  public clear(): void {
    this.frames = [];
    this.isPlaying = false;
  }

  public recordStep(
    dt: number,
    ball: WorldCupBall,
    players: Player[],
    referee: Referee
  ): void {
    this.recordAccum += dt;
    if (this.recordAccum < 0.032) return;
    this.recordAccum = 0;

    const frame: ReplayFrame = {
      ballPos: ball.position.clone(),
      ballQuat: ball.mesh.quaternion.clone(),
      refPos: referee.position.clone(),
      refFacing: referee.facingAngle,
      actors: players.map((p) => ({
        id: p.id,
        x: p.position.x,
        y: p.bodyGroup.position.y,
        z: p.position.z,
        facing: p.facingAngle,
        kickTimer: p.kickAnimTimer,
        slideTimer: p.slideTimer,
        diveTimer: p.diveTimer,
        diveDirZ: p.diveDirZ
      }))
    };

    this.frames.push(frame);
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  public startPlayback(): boolean {
    if (this.frames.length < 15) return false;
    this.isPlaying = true;
    this.playbackIndex = 0;
    return true;
  }

  /**
   * Advances slow-motion replay (0.55x speed) and applies frame pose to 3D meshes.
   * Returns false when replay finishes.
   */
  public updatePlayback(
    dt: number,
    ball: WorldCupBall,
    players: Player[],
    referee: Referee
  ): boolean {
    if (!this.isPlaying || this.frames.length === 0) return false;

    // 30fps recorded -> play back at 17fps (~0.56x slow-mo)
    this.playbackIndex += dt * 17.5;
    const idx = Math.floor(this.playbackIndex);

    if (idx >= this.frames.length) {
      this.isPlaying = false;
      return false;
    }

    const f = this.frames[idx];
    ball.position.copy(f.ballPos);
    ball.mesh.quaternion.copy(f.ballQuat);
    ball.syncMesh();

    referee.position.copy(f.refPos);
    referee.facingAngle = f.refFacing;
    referee.group.position.copy(f.refPos);
    referee.bodyGroup.rotation.y = f.refFacing;

    for (const snap of f.actors) {
      const p = players.find((pl) => pl.id === snap.id);
      if (!p || p.isSentOff) continue;
      p.position.set(snap.x, 0, snap.z);
      p.group.position.copy(p.position);
      p.bodyGroup.position.y = snap.y;
      p.facingAngle = snap.facing;
      p.bodyGroup.rotation.y = snap.facing;
      p.bodyGroup.rotation.z = snap.diveTimer > 0 ? -snap.diveDirZ * 1.1 : 0;
    }

    return true;
  }
}
