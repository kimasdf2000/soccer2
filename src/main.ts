import { Game } from './Game';
import { TEAMS } from './entities/Player';
import { WORLD_CUP_BALLS, WorldCupBall } from './entities/WorldCupBall';
import { getRoomCodeFromUrl } from './systems/CoopNetwork';
import { CoopPlayMode, DifficultyLevel, GameMode, TacticalStance, WorldCupBallId } from './types';

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
  let selectedCoopMode: CoopPlayMode = 'SOLO';

  const localCoopGuide = document.getElementById('local-coop-guide');
  const onlineCoopPanel = document.getElementById('online-coop-panel');
  const coopNetStatus = document.getElementById('coop-net-status');

  const syncControlGroupsUI = () => {
    selectedCoopMode = game.coopMode;

    // Sync Difficulty buttons in Lobby & Pause Modal
    document
      .querySelectorAll('#difficulty-group .seg-btn, #pause-difficulty-group .seg-btn')
      .forEach((b) => {
        const d = (b as HTMLElement).dataset.diff as DifficultyLevel | undefined;
        b.classList.toggle('active', d === selectedDifficulty);
      });

    // Sync Co-op buttons in Lobby & Pause Modal
    document
      .querySelectorAll('#coop-mode-group .seg-btn, #pause-coop-group .seg-btn')
      .forEach((b) => {
        const c = (b as HTMLElement).dataset.coop as CoopPlayMode | undefined;
        b.classList.toggle('active', c === selectedCoopMode);
      });

    localCoopGuide?.classList.toggle('hidden', selectedCoopMode !== 'LOCAL_COOP');
    onlineCoopPanel?.classList.toggle('hidden', selectedCoopMode !== 'ONLINE_COOP');

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

  // 3-B. Same-Team 2-Player Co-op Mode Selector & Online Room Code Controls
  document
    .querySelectorAll('#coop-mode-group .seg-btn, #pause-coop-group .seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const coop = ((btn as HTMLElement).dataset.coop || 'SOLO') as CoopPlayMode;
        selectedCoopMode = coop;
        game.setCoopMode(coop, true);
        if (game.isPaused) {
          game.setPaused(true);
        }
        syncControlGroupsUI();
      });
    });

  game.net.onStatusChange = (statusText, connected, isError) => {
    if (coopNetStatus) {
      coopNetStatus.textContent = statusText;
      coopNetStatus.classList.toggle('status-connected', !!connected);
      coopNetStatus.classList.toggle('status-error', !!isError);
    }
    syncControlGroupsUI();
  };

  const hostInfoBox = document.getElementById('coop-host-info');
  const roomCodeDisplay = document.getElementById('coop-room-code-display');
  const copyLinkBtn = document.getElementById('btn-copy-coop-link');
  const codeInput = document.getElementById('input-coop-code') as HTMLInputElement | null;

  document.getElementById('btn-host-coop')?.addEventListener('click', () => {
    game.audio.unlock();
    selectedCoopMode = 'ONLINE_COOP';
    game.coopMode = 'ONLINE_COOP';
    const code = game.net.hostRoom();
    if (roomCodeDisplay) roomCodeDisplay.textContent = code;
    hostInfoBox?.classList.remove('hidden');
    syncControlGroupsUI();
  });

  copyLinkBtn?.addEventListener('click', async () => {
    if (!game.net.roomCode) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${game.net.roomCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyLinkBtn.textContent = '✅ 링크 복사됨!';
      window.setTimeout(() => {
        copyLinkBtn.textContent = '🔗 초대 링크 복사';
      }, 1800);
    } catch {
      if (codeInput) codeInput.value = game.net.roomCode;
    }
  });

  const triggerJoinCoopRoom = () => {
    game.audio.unlock();
    if (!codeInput) return;
    selectedCoopMode = 'ONLINE_COOP';
    game.coopMode = 'ONLINE_COOP';
    game.net.joinRoom(codeInput.value);
    syncControlGroupsUI();
  };

  document.getElementById('btn-join-coop')?.addEventListener('click', triggerJoinCoopRoom);
  codeInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerJoinCoopRoom();
    }
  });

  // Auto-detect ?room=ABCD invite link in URL
  const urlRoom = getRoomCodeFromUrl();
  if (urlRoom) {
    selectedCoopMode = 'ONLINE_COOP';
    game.coopMode = 'ONLINE_COOP';
    if (codeInput) codeInput.value = urlRoom;
    syncControlGroupsUI();
    game.net.joinRoom(urlRoom);
  }

  // 3-C. Searchable Combobox Wiring for Home & Away World Cup Teams
  const setupSearchableTeamCombobox = (
    selectId: string,
    inputId: string,
    resultsId: string,
    clearBtnId: string,
    defaultTeamId: string
  ) => {
    const select = document.getElementById(selectId) as HTMLSelectElement | null;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const results = document.getElementById(resultsId) as HTMLElement | null;
    const clearBtn = document.getElementById(clearBtnId) as HTMLElement | null;
    if (!select || !input || !results) return;

    const teamList = Object.values(TEAMS);

    // Populate native select with all 17 World Cup teams
    select.innerHTML = '';
    teamList.forEach((team) => {
      const opt = document.createElement('option');
      opt.value = team.id;
      const topRoster = team.roster.slice(0, 3).map((r) => `${r.name} #${r.num}`).join(' · ');
      opt.textContent = `${team.flag} ${team.name} (${topRoster})`;
      if (team.id === defaultTeamId) opt.selected = true;
      select.appendChild(opt);
    });

    const renderResults = (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) {
        results.classList.add('hidden');
        results.innerHTML = '';
        clearBtn?.classList.add('hidden');
        return;
      }
      clearBtn?.classList.remove('hidden');

      const matches = teamList.filter((team) => {
        const matchName = team.name.toLowerCase().includes(q);
        const matchEng = (team.shortName || '').toLowerCase().includes(q) || team.id.toLowerCase().includes(q);
        const matchPlayer = team.roster.some((p) => p.name.toLowerCase().includes(q));
        return matchName || matchEng || matchPlayer;
      });

      results.innerHTML = '';
      if (matches.length === 0) {
        const noItem = document.createElement('div');
        noItem.className = 'search-no-match';
        noItem.textContent = `"${query}" 검색 결과가 없습니다.`;
        results.appendChild(noItem);
      } else {
        matches.forEach((team) => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          const topStars = team.roster.slice(0, 2).map((r) => r.name).join(', ');
          item.innerHTML = `<span>${team.flag} <b>${team.name}</b> (${team.id})</span><span class="team-stars">${topStars}</span>`;
          item.addEventListener('click', () => {
            select.value = team.id;
            input.value = `${team.flag} ${team.name}`;
            results.classList.add('hidden');
            select.dispatchEvent(new Event('change'));
          });
          results.appendChild(item);
        });
      }
      results.classList.remove('hidden');
    };

    input.addEventListener('input', () => {
      renderResults(input.value);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length > 0) {
        renderResults(input.value);
      }
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      results.classList.add('hidden');
      clearBtn.classList.add('hidden');
    });

    select.addEventListener('change', () => {
      const cur = TEAMS[select.value];
      if (cur) {
        input.value = `${cur.flag} ${cur.name}`;
      }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e: MouseEvent) => {
      if (!input.contains(e.target as Node) && !results.contains(e.target as Node)) {
        results.classList.add('hidden');
      }
    });

    // Set initial input label
    const initialTeam = TEAMS[defaultTeamId];
    if (initialTeam) {
      input.value = `${initialTeam.flag} ${initialTeam.name}`;
    }
  };

  setupSearchableTeamCombobox('select-home-team', 'search-home-team', 'home-team-results', 'clear-home-search', 'KOR');
  setupSearchableTeamCombobox('select-away-team', 'search-away-team', 'away-team-results', 'clear-away-search', 'BRA');

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
      difficulty: selectedDifficulty,
      coopMode: selectedCoopMode
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

  const handleToggleCoopQuick = () => {
    game.audio.unlock();
    selectedCoopMode = game.toggleLocalCoop();
    syncControlGroupsUI();
  };

  document.getElementById('btn-quick-coop')?.addEventListener('click', handleToggleCoopQuick);
  document.getElementById('hud-coop-status')?.addEventListener('click', handleToggleCoopQuick);

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
