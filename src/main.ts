import { Game } from './Game';
import { WORLD_CUP_BALLS, WorldCupBall } from './entities/WorldCupBall';
import { WorldCupBallId } from './types';

const BALL_ORDER: WorldCupBallId[] = [
  'al_rihla',
  'telstar_18',
  'brazuca',
  'jabulani',
  'fevernova'
];

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container')!;
  const game = new Game(container);

  let selectedBallId: WorldCupBallId = 'al_rihla';
  let selectedTeamSize: 5 | 7 | 11 = 7;

  // 1. Render World Cup Official Ball Selector Cards with 2D Spherical Previews
  const ballGrid = document.getElementById('ball-selector-grid')!;
  const renderBallCards = () => {
    ballGrid.innerHTML = '';
    BALL_ORDER.forEach((ballId) => {
      const cfg = WORLD_CUP_BALLS[ballId];
      const card = document.createElement('div');
      card.className = `ball-card ${selectedBallId === ballId ? 'active' : ''}`;

      const canvas = document.createElement('canvas');
      canvas.width = 112;
      canvas.height = 112;
      canvas.className = 'ball-preview-canvas';
      const ctx = canvas.getContext('2d')!;
      WorldCupBall.paintTexturePattern(ctx, 112, 112, ballId);

      // Add spherical shading highlight
      const grad = ctx.createRadialGradient(34, 32, 8, 56, 56, 56);
      grad.addColorStop(0, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.48)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 112, 112);

      const title = document.createElement('div');
      title.className = 'ball-card-title';
      title.textContent = cfg.name;

      const host = document.createElement('div');
      host.className = 'ball-card-host';
      host.textContent = `${cfg.year} ${cfg.host}`;

      const desc = document.createElement('div');
      desc.className = 'ball-card-desc';
      desc.textContent = cfg.subtitle;

      card.append(canvas, title, host, desc);
      card.addEventListener('click', () => {
        selectedBallId = ballId;
        game.ball.setBallStyle(ballId);
        game.updateScoreboardHUD();
        renderBallCards();
      });

      ballGrid.appendChild(card);
    });
  };
  renderBallCards();

  // 2. Team Size Segmented Selector
  const sizeGroup = document.getElementById('team-size-group')!;
  sizeGroup.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sizeGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const sz = parseInt((btn as HTMLElement).dataset.size || '7', 10);
      selectedTeamSize = (sz === 5 || sz === 11 ? sz : 7) as 5 | 7 | 11;
    });
  });

  // 3. Lobby Modal Open / Close / Start Match
  const lobbyModal = document.getElementById('lobby-modal')!;
  const closeLobby = () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
  };

  document.getElementById('btn-close-lobby')?.addEventListener('click', closeLobby);
  document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
    lobbyModal.classList.remove('hidden');
  });

  document.getElementById('btn-start-match')?.addEventListener('click', () => {
    game.audio.unlock();
    const homeSelect = document.getElementById('select-home-team') as HTMLSelectElement;
    const awaySelect = document.getElementById('select-away-team') as HTMLSelectElement;
    const homeId = homeSelect.value;
    const awayId = awaySelect.value === homeId ? (homeId === 'KOR' ? 'BRA' : 'KOR') : awaySelect.value;

    game.startNewMatch({
      homeTeamId: homeId,
      awayTeamId: awayId,
      teamSize: selectedTeamSize,
      ballId: selectedBallId,
      halfDurationSec: 180
    });
    lobbyModal.classList.add('hidden');
    game.audio.playWhistle('short');
  });

  // 4. Quick Toolbar Actions (Instant Ball Cycle, Free Kick, Penalty Kick, Yellow/Red Card Demo, Camera, Fullscreen)
  const cycleBall = () => {
    game.audio.unlock();
    const idx = BALL_ORDER.indexOf(game.ball.currentBallId);
    const nextId = BALL_ORDER[(idx + 1) % BALL_ORDER.length];
    selectedBallId = nextId;
    game.ball.setBallStyle(nextId);
    game.updateScoreboardHUD();
    renderBallCards();
    const cfg = WORLD_CUP_BALLS[nextId];
    game.showBanner(
      `⚽ ${cfg.name}`,
      `${cfg.year} ${cfg.host} — ${cfg.subtitle}`,
      'banner-setpiece',
      1.9
    );
  };

  document.getElementById('btn-quick-ball')?.addEventListener('click', cycleBall);
  document.getElementById('hud-ball-name')?.addEventListener('click', cycleBall);

  document.getElementById('btn-quick-fk')?.addEventListener('click', () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
    const spots: [number, number][] = [
      [29, 7.5],
      [27, -8.5],
      [31, 0]
    ];
    const [sx, sz] = spots[Math.floor(Math.random() * spots.length)];
    game.triggerInstantFreeKick(sx, sz);
  });

  document.getElementById('btn-quick-pk')?.addEventListener('click', () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
    game.triggerInstantPenaltyKick('HOME');
  });

  document.getElementById('btn-quick-yc')?.addEventListener('click', () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
    game.triggerInstantFoulCardDemo(false);
  });

  document.getElementById('btn-quick-rc')?.addEventListener('click', () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
    game.triggerInstantFoulCardDemo(true);
  });

  const camBtn = document.getElementById('btn-quick-cam');
  camBtn?.addEventListener('click', () => {
    const mode = game.cycleCameraMode();
    const labelMap = {
      BROADCAST: '🎥 중계뷰',
      THIRD_PERSON: '🎥 3인칭뷰',
      WIDE: '🎥 와이드뷰'
    };
    camBtn.textContent = labelMap[mode];
  });

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  // 5. Set-piece Spin Chip Presets & GK Penalty Dive Buttons
  document.querySelectorAll('.sp-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const spin = parseFloat((chip as HTMLElement).dataset.spin || '0');
      game.controls.setPieceSpin = spin;
      const slider = document.getElementById('setpiece-spin-slider') as HTMLInputElement | null;
      if (slider) {
        slider.value = String(spin);
        slider.dispatchEvent(new Event('input'));
      }
    });
  });

  document.querySelectorAll('.sp-corner').forEach((btn) => {
    btn.addEventListener('click', () => {
      const corner = ((btn as HTMLElement).dataset.corner || 'TL') as 'TL' | 'BL' | 'TR' | 'BR';
      game.applySetPieceCornerPreset(corner);
    });
  });

  document.querySelectorAll('.dive-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dive-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const dir = parseInt((btn as HTMLElement).dataset.dive || '0', 10) as -1 | 0 | 1;
      game.setUserPenaltyDive(dir);
    });
  });
});
