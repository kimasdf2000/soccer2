import { Game } from './Game';
import { WORLD_CUP_BALLS, WorldCupBall } from './entities/WorldCupBall';
import { DifficultyLevel, GameMode, TacticalStance, WorldCupBallId } from './types';

const BALL_ORDER: WorldCupBallId[] = [
  'trionda_26',
  'al_rihla',
  'telstar_18',
  'brazuca',
  'jabulani',
  'fevernova'
];

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container')!;
  const game = new Game(container);

  let selectedBallId: WorldCupBallId = 'trionda_26';
  let selectedTeamSize: 5 | 7 | 11 = 7;
  let selectedGameMode: GameMode = 'EXHIBITION';
  let selectedDifficulty: DifficultyLevel = 'NORMAL';

  const syncControlGroupsUI = () => {
    // Sync Difficulty buttons in Lobby & Pause Modal
    document
      .querySelectorAll('#difficulty-group .seg-btn, #pause-difficulty-group .seg-btn')
      .forEach((b) => {
        const d = (b as HTMLElement).dataset.diff as DifficultyLevel | undefined;
        b.classList.toggle('active', d === selectedDifficulty);
      });

    // Sync Tactics buttons in Pause Modal
    document.querySelectorAll('#pause-tactics-group .seg-btn').forEach((b) => {
      const st = (b as HTMLElement).dataset.stance as TacticalStance | undefined;
      b.classList.toggle('active', st === game.tacticalStance);
    });

    // Sync Ball buttons in Pause Modal
    document.querySelectorAll('#pause-ball-group .seg-btn').forEach((b) => {
      const bId = (b as HTMLElement).dataset.ball as WorldCupBallId | undefined;
      b.classList.toggle('active', bId === selectedBallId);
    });
  };

  // 1. Render World Cup Official Ball Selector Cards with 2D Spherical Previews
  const ballGrid = document.getElementById('ball-selector-grid')!;
  const renderBallCards = () => {
    ballGrid.innerHTML = '';
    BALL_ORDER.forEach((ballId) => {
      const cfg = WORLD_CUP_BALLS[ballId];
      const card = document.createElement('div');
      card.className = `ball-card ${selectedBallId === ballId ? 'active' : ''}`;

      const canvas = document.createElement('canvas');
      canvas.width = 136;
      canvas.height = 136;
      canvas.className = 'ball-preview-canvas';
      const ctx = canvas.getContext('2d')!;
      WorldCupBall.paintTexturePattern(ctx, 136, 136, ballId);

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
        syncControlGroupsUI();
      });

      ballGrid.appendChild(card);
    });
  };
  renderBallCards();

  // 2. Game Mode Selector (Exhibition / Tournament / Penalty Shootout / Free Kick Challenge)
  const modeGroup = document.getElementById('game-mode-group')!;
  modeGroup.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      modeGroup.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedGameMode = ((btn as HTMLElement).dataset.mode || 'EXHIBITION') as GameMode;
    });
  });

  // 3. Team Size Segmented Selector & Difficulty Selector
  const sizeGroup = document.getElementById('team-size-group')!;
  sizeGroup.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sizeGroup.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const sz = parseInt((btn as HTMLElement).dataset.size || '7', 10);
      selectedTeamSize = (sz === 5 || sz === 11 ? sz : 7) as 5 | 7 | 11;
    });
  });

  document
    .querySelectorAll('#difficulty-group .seg-btn, #pause-difficulty-group .seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const diff = ((btn as HTMLElement).dataset.diff || 'NORMAL') as DifficultyLevel;
        selectedDifficulty = diff;
        game.setDifficulty(diff, true);
        if (game.isPaused) {
          game.setPaused(true); // Refresh pause summary text
        }
        syncControlGroupsUI();
      });
    });

  // 4. Lobby Modal Open / Close / Start Match & Pause Modal Controls
  const lobbyModal = document.getElementById('lobby-modal')!;
  const closeLobby = () => {
    game.audio.unlock();
    lobbyModal.classList.add('hidden');
  };

  document.getElementById('btn-close-lobby')?.addEventListener('click', closeLobby);
  document.getElementById('btn-open-lobby')?.addEventListener('click', () => {
    game.setPaused(false);
    lobbyModal.classList.remove('hidden');
  });

  const startCurrentConfiguredMatch = () => {
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
      halfDurationSec: 180,
      gameMode: selectedGameMode,
      difficulty: selectedDifficulty
    });
    lobbyModal.classList.add('hidden');
    game.setPaused(false);
    syncControlGroupsUI();
    game.audio.playWhistle('short');
  };

  document.getElementById('btn-start-match')?.addEventListener('click', startCurrentConfiguredMatch);

  // Pause Modal & Quick Pause Wiring
  const toggleGamePause = () => {
    game.audio.unlock();
    if (!lobbyModal.classList.contains('hidden')) {
      closeLobby();
      return;
    }
    game.togglePause();
    syncControlGroupsUI();
  };

  document.getElementById('btn-quick-pause')?.addEventListener('click', toggleGamePause);
  document.getElementById('btn-resume-match')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
  });
  document.getElementById('btn-restart-match')?.addEventListener('click', () => {
    startCurrentConfiguredMatch();
  });
  document.getElementById('btn-pause-to-lobby')?.addEventListener('click', () => {
    game.setPaused(false);
    lobbyModal.classList.remove('hidden');
  });

  document.querySelectorAll('#pause-tactics-group .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = ((btn as HTMLElement).dataset.stance || 'BALANCED') as TacticalStance;
      game.tacticalStance = st;
      game.updateModeSpecificHUD();
      syncControlGroupsUI();
    });
  });

  document.querySelectorAll('#pause-ball-group .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bId = ((btn as HTMLElement).dataset.ball || 'trionda_26') as WorldCupBallId;
      selectedBallId = bId;
      game.ball.setBallStyle(bId);
      game.updateScoreboardHUD();
      if (game.isPaused) {
        game.setPaused(true);
      }
      renderBallCards();
      syncControlGroupsUI();
    });
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      toggleGamePause();
    }
  });

  // 5. Quick Toolbar Actions
  const cycleBall = () => {
    game.audio.unlock();
    const idx = BALL_ORDER.indexOf(game.ball.currentBallId);
    const nextId = BALL_ORDER[(idx + 1) % BALL_ORDER.length];
    selectedBallId = nextId;
    game.ball.setBallStyle(nextId);
    game.updateScoreboardHUD();
    renderBallCards();
    syncControlGroupsUI();
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

  document.getElementById('hud-diff-status')?.addEventListener('click', () => {
    game.audio.unlock();
    selectedDifficulty = game.cycleDifficulty();
    syncControlGroupsUI();
  });

  document.getElementById('hud-mode-status')?.addEventListener('click', () => {
    game.cycleTacticalStance();
    syncControlGroupsUI();
  });

  // Tap on Radar Minimap to collapse/expand if the user wants even more screen space on tablet
  const radarWrap = document.getElementById('radar-wrap');
  radarWrap?.addEventListener('click', () => {
    radarWrap.classList.toggle('radar-collapsed');
  });

  document.getElementById('btn-quick-fk')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
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
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.triggerInstantPenaltyKick('HOME');
  });

  document.getElementById('btn-quick-ck')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.triggerInstantCornerKick();
  });

  document.getElementById('btn-quick-yc')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.triggerInstantFoulCardDemo(false, false);
  });

  document.getElementById('btn-quick-rc')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.triggerInstantFoulCardDemo(true, false);
  });

  document.getElementById('btn-quick-var')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.triggerInstantFoulCardDemo(false, true);
  });

  document.getElementById('btn-quick-sub')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.substituteTiredPlayer();
  });

  document.getElementById('btn-quick-next-round')?.addEventListener('click', () => {
    game.audio.unlock();
    game.setPaused(false);
    lobbyModal.classList.add('hidden');
    game.advanceTournamentStage();
  });

  const ttsBtn = document.getElementById('btn-quick-tts');
  ttsBtn?.addEventListener('click', () => {
    const on = game.commentary.toggleTTS();
    ttsBtn.textContent = on ? '🎙️ 음성해설 ON' : '🎙️ 음성해설 OFF';
  });

  document.getElementById('btn-skip-replay')?.addEventListener('click', () => {
    game.controls.triggerPass = true;
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

  // 6. Set-piece Spin Chip Presets, Corner Target Presets & GK Penalty Dive Buttons
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
