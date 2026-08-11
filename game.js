/**
 * FRIDAY NIGHT FUNKIN' - RHYTHM BATTLE (WEB EDITION)
 * Core Game Engine: Audio Synth, Canvas Renderer, Input Processor, & Chart Editor
 */

(function () {
  'use strict';

  // --- ARROW CONFIG & CONSTANTS ---
  const LANES = 4;
  const LANE_NAMES = ['left', 'down', 'up', 'right'];
  const LANE_COLORS = ['#c24b99', '#00ffff', '#12fa05', '#f9393f'];
  const LANE_GLOWS = ['rgba(194,75,153,0.9)', 'rgba(0,255,255,0.9)', 'rgba(18,250,5,0.9)', 'rgba(249,57,63,0.9)'];
  
  // Key Mappings (Arrow Keys & WASD)
  const KEY_MAP = {
    'ArrowLeft': 0, 'KeyA': 0,
    'ArrowDown': 1, 'KeyS': 1,
    'ArrowUp': 2,   'KeyW': 2,
    'ArrowRight': 3, 'KeyD': 3
  };

  // Hit Windows in Seconds
  const HIT_WINDOWS = {
    SICK: 0.045,  // 45ms
    GOOD: 0.090,  // 90ms
    BAD: 0.135,   // 135ms
    SHIT: 0.180   // 180ms
  };

  // --- AUDIO SYNTHESIZER ENGINE ---
  class FNFSynthEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMuted = false;
      this.volume = 0.8;
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    // Play Kick Drum
    playKick(time) {
      if (!this.initialized) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.15);
    }

    // Play Snare Drum
    playSnare(time) {
      if (!this.initialized) return;
      // Noise buffer for snare snap
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(time);

      // Tonal pop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.1);
    }

    // Play Hi-Hat
    playHiHat(time) {
      if (!this.initialized) return;
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(time);
    }

    // Play Synth Bassline
    playBass(freq, time, duration = 0.2) {
      if (!this.initialized) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(120, time + duration);

      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration);
    }

    // Play Vocal / Lead Note (Player vs Opponent)
    playVocalNote(lane, isPlayer, time, duration = 0.18) {
      if (!this.initialized) return;
      
      // Pitch scale for 4 lanes
      const pitches = isPlayer ? [261.63, 329.63, 392.00, 523.25] : [196.00, 246.94, 293.66, 392.00]; // C4/E4/G4/C5 vs G3/B3/D4/G4
      const freq = pitches[lane] || 300;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isPlayer) {
        osc.type = 'pulse' in osc ? 'pulse' : 'square';
        // Formant filter effect for Boyfriend's crisp beep-boop vocal
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);
        filter.Q.value = 2.5;
        
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        // Opponent: Deep growly FM / Saw vocal tone
        osc.type = 'sawtooth';
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(300, time + duration);

        gain.gain.setValueAtTime(0.45, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
      }

      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + duration);
    }

    // Play Miss Squelch / Vinyl Scratch
    playMissScratch() {
      if (!this.initialized) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    // Play Hit Sparkle Clap
    playHitSound() {
      if (!this.initialized) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  }

  // --- SONG DATA CATALOG ---
  const SONG_CATALOG = [
    {
      id: 'bopeebo',
      title: 'Bopeebo Beat',
      artist: 'Kawai Sprite',
      bpm: 120,
      scrollSpeed: 2.2,
      opponent: 'Daddy Dearest 😈',
      easy: { notes: generateChart(120, 1.0) },
      normal: { notes: generateChart(120, 1.5) },
      hard: { notes: generateChart(120, 2.0) }
    },
    {
      id: 'fresh',
      title: 'Fresh Cyber Jam',
      artist: 'Kawai Sprite',
      bpm: 145,
      scrollSpeed: 2.5,
      opponent: 'Cyber Robot 🤖',
      easy: { notes: generateChart(145, 1.2) },
      normal: { notes: generateChart(145, 1.8) },
      hard: { notes: generateChart(145, 2.4) }
    },
    {
      id: 'demon',
      title: 'Demon Funk Battle',
      artist: 'Kawai Sprite',
      bpm: 175,
      scrollSpeed: 2.8,
      opponent: 'Cyber Demon 👹',
      easy: { notes: generateChart(175, 1.4) },
      normal: { notes: generateChart(175, 2.2) },
      hard: { notes: generateChart(175, 3.0) }
    }
  ];

  // Procedural FNF Chart Generator for structured funk rhythms & hold notes
  function generateChart(bpm, densityMultiplier) {
    const notes = [];
    const beatSec = 60 / bpm;
    const songDuration = 65; // ~65 seconds song
    let time = 2.0; // Start after 2s intro count

    const patterns = [
      [0, 2, 1, 3],
      [1, 0, 3, 2],
      [0, 1, 2, 3],
      [3, 2, 1, 0],
      [0, 0, 2, 2],
      [1, 3, 1, 3]
    ];

    let patternIdx = 0;
    while (time < songDuration) {
      const pattern = patterns[patternIdx % patterns.length];
      patternIdx++;

      // Alternating sections between Opponent and Player
      for (let bar = 0; bar < 2; bar++) {
        // Opponent Bar (4 beats)
        for (let b = 0; b < 4; b++) {
          const lane = pattern[b % 4];
          const isHold = Math.random() < 0.25;
          notes.push({
            time: time + b * beatSec,
            lane: lane,
            isPlayer: false,
            hold: isHold ? beatSec * 0.75 : 0
          });
        }
        time += 4 * beatSec;

        // Player Bar (4 beats)
        for (let b = 0; b < 4; b++) {
          const lane = pattern[(b + 1) % 4];
          const isHold = Math.random() < 0.2;
          notes.push({
            time: time + b * beatSec,
            lane: lane,
            isPlayer: true,
            hold: isHold ? beatSec * 0.75 : 0
          });
          // Extra density on hard
          if (densityMultiplier > 1.8 && b % 2 === 1 && Math.random() < 0.5) {
            notes.push({
              time: time + (b + 0.5) * beatSec,
              lane: (lane + 2) % 4,
              isPlayer: true,
              hold: 0
            });
          }
        }
        time += 4 * beatSec;
      }
    }

    return notes.sort((a, b) => a.time - b.time);
  }

  // --- GAME STATE MANAGER ---
  class FNFGameEngine {
    constructor() {
      // DOM Elements
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.synth = new FNFSynthEngine();

      // UI Overlays
      this.menuScreen = document.getElementById('menuScreen');
      this.songSelectScreen = document.getElementById('songSelectScreen');
      this.pauseScreen = document.getElementById('pauseScreen');
      this.gameOverScreen = document.getElementById('gameOverScreen');
      this.resultsScreen = document.getElementById('resultsScreen');
      this.chartEditorScreen = document.getElementById('chartEditorScreen');
      this.hudHeader = document.getElementById('hudHeader');
      this.healthBarContainer = document.getElementById('healthBarContainer');
      this.keyGuide = document.getElementById('keyGuide');
      this.judgementContainer = document.getElementById('judgementContainer');

      // State flags
      this.state = 'MENU'; // MENU, SONG_SELECT, PLAYING, PAUSED, GAME_OVER, RESULTS, EDITOR
      this.selectedSong = SONG_CATALOG[0];
      this.selectedDiff = 'normal';
      this.notes = [];
      this.startTime = 0;
      this.currentTime = 0;
      this.songDuration = 0;
      this.scrollSpeed = 2.2;
      this.bpm = 120;
      this.animFrameId = null;

      // Stats
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hits = { sick: 0, good: 0, bad: 0, shit: 0, miss: 0 };
      this.totalNotesHit = 0;
      this.totalNotesProcessed = 0;
      this.health = 50; // 0 to 100

      // Input State
      this.pressedLanes = [false, false, false, false];
      this.laneGlowTimer = [0, 0, 0, 0];
      this.oppGlowTimer = [0, 0, 0, 0];

      // Character Pose Timers & State
      this.playerPose = 'idle'; // idle, left, down, up, right, miss
      this.playerPoseTimer = 0;
      this.oppPose = 'idle';
      this.oppPoseTimer = 0;
      this.beatPulseScale = 1.0;

      // Particle sparkles
      this.particles = [];

      // Audio sequencer tracking
      this.scheduledBeat = 0;

      this.initEvents();
      this.resizeCanvas();
    }

    initEvents() {
      window.addEventListener('resize', () => this.resizeCanvas());

      // Key Listeners
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      window.addEventListener('keyup', (e) => this.handleKeyUp(e));

      // UI Button Bindings
      document.getElementById('btnPlay').onclick = () => this.openSongSelect();
      document.getElementById('btnFreeplay').onclick = () => this.openSongSelect();
      document.getElementById('btnEditor').onclick = () => this.openChartEditor();
      document.getElementById('btnBackToMenu').onclick = () => this.showMenu();
      document.getElementById('btnStartSelectedSong').onclick = () => this.startSong();
      document.getElementById('pauseBtn').onclick = () => this.togglePause();
      document.getElementById('btnResume').onclick = () => this.resumeSong();
      document.getElementById('btnRestart').onclick = () => this.startSong();
      document.getElementById('btnQuitToMenu').onclick = () => this.showMenu();
      document.getElementById('btnRetrySong').onclick = () => this.startSong();
      document.getElementById('btnGameOverMenu').onclick = () => this.showMenu();
      document.getElementById('btnResReplay').onclick = () => this.startSong();
      document.getElementById('btnResNext').onclick = () => this.nextSong();

      // Difficulty buttons
      document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedDiff = btn.dataset.diff;
        };
      });

      // Chart editor bindings
      document.getElementById('edCloseBtn').onclick = () => this.showMenu();
      document.getElementById('edPlayBtn').onclick = () => this.playtestFromEditor();
      document.getElementById('edSaveBtn').onclick = () => this.exportChartJSON();

      this.renderSongList();
    }

    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    showMenu() {
      this.state = 'MENU';
      this.hideAllScreens();
      this.menuScreen.classList.remove('hidden');
      this.menuScreen.classList.add('active');
    }

    openSongSelect() {
      this.state = 'SONG_SELECT';
      this.hideAllScreens();
      this.songSelectScreen.classList.remove('hidden');
      this.renderSongList();
    }

    renderSongList() {
      const container = document.getElementById('songList');
      container.innerHTML = '';
      SONG_CATALOG.forEach(song => {
        const card = document.createElement('div');
        card.className = `song-card ${song.id === this.selectedSong.id ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="song-meta">
            <h4>${song.title}</h4>
            <p>Artist: ${song.artist} • Vs: ${song.opponent}</p>
          </div>
          <div class="song-bpm">⚡ ${song.bpm} BPM</div>
        `;
        card.onclick = () => {
          document.querySelectorAll('.song-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedSong = song;
        };
        container.appendChild(card);
      });
    }

    hideAllScreens() {
      [this.menuScreen, this.songSelectScreen, this.pauseScreen, this.gameOverScreen, this.resultsScreen, this.chartEditorScreen].forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
      });
      [this.hudHeader, this.healthBarContainer, this.keyGuide].forEach(h => h.classList.add('hidden'));
    }

    startSong() {
      this.synth.init();
      this.synth.resume();

      this.state = 'PLAYING';
      this.hideAllScreens();

      [this.hudHeader, this.healthBarContainer, this.keyGuide].forEach(h => h.classList.remove('hidden'));

      // Copy chart notes for selected difficulty
      const songData = this.selectedSong[this.selectedDiff] || this.selectedSong.normal;
      this.notes = JSON.parse(JSON.stringify(songData.notes));
      this.scrollSpeed = this.selectedSong.scrollSpeed;
      this.bpm = this.selectedSong.bpm;
      this.songDuration = Math.max(...this.notes.map(n => n.time)) + 3.0;

      // Reset Stats
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hits = { sick: 0, good: 0, bad: 0, shit: 0, miss: 0 };
      this.totalNotesHit = 0;
      this.totalNotesProcessed = 0;
      this.health = 50;
      this.scheduledBeat = 0;

      // Update HUD Labels
      document.getElementById('hudSongTitle').textContent = this.selectedSong.title;
      const diffBadge = document.getElementById('hudDifficulty');
      diffBadge.textContent = this.selectedDiff.toUpperCase();
      diffBadge.className = `badge ${this.selectedDiff}`;
      document.getElementById('iconOpponent').textContent = this.selectedSong.opponent.split(' ').pop();

      this.updateHUD();

      this.startTime = this.synth.ctx.currentTime;
      this.lastLoopTime = performance.now();

      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.gameLoop();
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.pauseScreen.classList.remove('hidden');
      } else if (this.state === 'PAUSED') {
        this.resumeSong();
      }
    }

    resumeSong() {
      this.state = 'PLAYING';
      this.pauseScreen.classList.add('hidden');
    }

    // Main 60 FPS Game Loop
    gameLoop() {
      if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;

      const now = performance.now();
      const dt = (now - this.lastLoopTime) / 1000;
      this.lastLoopTime = now;

      if (this.state === 'PLAYING') {
        this.currentTime = this.synth.ctx.currentTime - this.startTime;
        this.updateAudioSequencer();
        this.updateNotes();
        this.updateParticles(dt);
        this.updateHealthBarUI();

        // Song Complete Check
        if (this.currentTime >= this.songDuration) {
          this.triggerResults();
          return;
        }
      }

      this.renderCanvas();

      this.animFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    // Audio Beat & Rhythm Sequencer
    updateAudioSequencer() {
      const beatSec = 60 / this.bpm;
      const currentBeat = Math.floor(this.currentTime / beatSec);

      if (currentBeat > this.scheduledBeat) {
        this.scheduledBeat = currentBeat;
        const now = this.synth.ctx.currentTime;

        // Bop beat pulse scale
        this.beatPulseScale = 1.08;

        // Rhythm backing synth
        if (currentBeat % 2 === 0) {
          this.synth.playKick(now);
        } else {
          this.synth.playSnare(now);
        }
        this.synth.playHiHat(now + beatSec * 0.5);

        // Funky Bassline
        const bassNotes = [65.41, 73.42, 82.41, 98.00]; // C2, D2, E2, G2
        this.synth.playBass(bassNotes[currentBeat % 4], now, beatSec * 0.8);
      } else {
        this.beatPulseScale += (1.0 - this.beatPulseScale) * 0.1;
      }
    }

    // Process Notes (Opponent Bot Auto-hit & Player Miss Expiry)
    updateNotes() {
      const windowMiss = HIT_WINDOWS.SHIT;

      this.notes.forEach(note => {
        if (note.processed) return;

        // Opponent Bot Note Processing
        if (!note.isPlayer && this.currentTime >= note.time) {
          note.processed = true;
          this.oppPose = LANE_NAMES[note.lane];
          this.oppPoseTimer = 0.25;
          this.oppGlowTimer[note.lane] = 0.2;
          this.synth.playVocalNote(note.lane, false, this.synth.ctx.currentTime);
        }

        // Player Missed Note (scrolled past hit window)
        if (note.isPlayer && !note.hit && (this.currentTime - note.time) > windowMiss) {
          note.processed = true;
          this.handleMiss();
        }
      });
    }

    handleKeyDown(e) {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.togglePause();
        }
        return;
      }

      if (this.state !== 'PLAYING') return;

      const lane = KEY_MAP[e.code];
      if (lane !== undefined) {
        if (!this.pressedLanes[lane]) {
          this.pressedLanes[lane] = true;
          this.laneGlowTimer[lane] = 0.2;
          this.processPlayerHit(lane);
        }
      }
    }

    handleKeyUp(e) {
      const lane = KEY_MAP[e.code];
      if (lane !== undefined) {
        this.pressedLanes[lane] = false;
      }
    }

    processPlayerHit(lane) {
      // Find earliest unhit player note in this lane
      const targetNote = this.notes.find(n => n.isPlayer && !n.processed && n.lane === lane);

      if (!targetNote) {
        // Over-strum Miss
        this.handleMiss();
        return;
      }

      const diff = Math.abs(this.currentTime - targetNote.time);

      if (diff <= HIT_WINDOWS.SHIT) {
        targetNote.processed = true;
        targetNote.hit = true;

        let rating = 'SHIT';
        let scoreAdd = 50;
        let hpAdd = -1.8;

        if (diff <= HIT_WINDOWS.SICK) {
          rating = 'SICK';
          scoreAdd = 350;
          hpAdd = 2.5;
          this.hits.sick++;
          this.spawnSparkles(lane);
        } else if (diff <= HIT_WINDOWS.GOOD) {
          rating = 'GOOD';
          scoreAdd = 200;
          hpAdd = 1.2;
          this.hits.good++;
        } else if (diff <= HIT_WINDOWS.BAD) {
          rating = 'BAD';
          scoreAdd = 100;
          hpAdd = -0.5;
          this.hits.bad++;
        } else {
          this.hits.shit++;
        }

        this.score += scoreAdd;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.totalNotesHit++;
        this.totalNotesProcessed++;
        this.health = Math.min(100, Math.max(0, this.health + hpAdd));

        // Trigger Vocal Synth & Character Pose
        this.playerPose = LANE_NAMES[lane];
        this.playerPoseTimer = 0.25;
        this.synth.playVocalNote(lane, true, this.synth.ctx.currentTime);
        this.synth.playHitSound();

        this.showJudgement(rating);
        this.updateHUD();
      } else {
        // Hit too early
        this.handleMiss();
      }
    }

    handleMiss() {
      this.combo = 0;
      this.hits.miss++;
      this.totalNotesProcessed++;
      this.health = Math.max(0, this.health - 3.5);
      this.playerPose = 'miss';
      this.playerPoseTimer = 0.35;
      this.synth.playMissScratch();
      this.showJudgement('MISS');
      this.updateHUD();

      // Check Game Over
      if (this.health <= 0) {
        this.triggerGameOver();
      }
    }

    showJudgement(rating) {
      const el = document.createElement('div');
      el.className = `judgement-badge ${rating.toLowerCase()}`;
      el.textContent = rating + '!';

      const comboEl = document.createElement('div');
      comboEl.className = 'combo-text';
      comboEl.textContent = `${this.combo}x`;

      this.judgementContainer.innerHTML = '';
      this.judgementContainer.appendChild(el);
      if (this.combo > 1) this.judgementContainer.appendChild(comboEl);
    }

    updateHUD() {
      document.getElementById('hudScore').textContent = this.score.toLocaleString();
      document.getElementById('hudCombo').textContent = this.combo;

      const accuracy = this.totalNotesProcessed > 0
        ? ((this.totalNotesHit / this.totalNotesProcessed) * 100).toFixed(1)
        : '100.0';
      document.getElementById('hudAccuracy').textContent = `${accuracy}%`;
    }

    updateHealthBarUI() {
      const fillPlr = document.getElementById('healthFillPlayer');
      const fillOpp = document.getElementById('healthFillOpponent');
      const divider = document.getElementById('healthDivider');
      const iconPlr = document.getElementById('iconPlayer');
      const iconOpp = document.getElementById('iconOpponent');

      fillPlr.style.width = `${this.health}%`;
      fillOpp.style.width = `${100 - this.health}%`;

      const healthPct = this.health;
      divider.style.left = `${100 - healthPct}%`;
      iconPlr.style.left = `calc(${100 - healthPct}% + 18px)`;
      iconOpp.style.left = `calc(${100 - healthPct}% - 18px)`;
    }

    triggerGameOver() {
      this.state = 'GAME_OVER';
      [this.hudHeader, this.healthBarContainer, this.keyGuide].forEach(h => h.classList.add('hidden'));

      document.getElementById('goScore').textContent = this.score.toLocaleString();
      document.getElementById('goCombo').textContent = this.maxCombo;
      const acc = this.totalNotesProcessed > 0 ? ((this.totalNotesHit / this.totalNotesProcessed) * 100).toFixed(1) : '0';
      document.getElementById('goAccuracy').textContent = `${acc}%`;

      const quotes = [
        `"You got funky... but not funky enough!"`,
        `"Blue balled! Don't let ${this.selectedSong.opponent} win!"`,
        `"Practice your rhythm beat and try again!"`
      ];
      document.getElementById('gameOverQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)];

      this.gameOverScreen.classList.remove('hidden');
    }

    triggerResults() {
      this.state = 'RESULTS';
      [this.hudHeader, this.healthBarContainer, this.keyGuide].forEach(h => h.classList.add('hidden'));

      const acc = this.totalNotesProcessed > 0 ? ((this.totalNotesHit / this.totalNotesProcessed) * 100) : 100;

      let rank = 'S';
      if (acc === 100 && this.hits.miss === 0) rank = 'PERFECT FC';
      else if (acc >= 95) rank = 'RANK S';
      else if (acc >= 85) rank = 'RANK A';
      else if (acc >= 75) rank = 'RANK B';
      else rank = 'RANK C';

      document.getElementById('ratingRankBadge').textContent = rank;
      document.getElementById('resScore').textContent = this.score.toLocaleString();
      document.getElementById('resAccuracy').textContent = `${acc.toFixed(1)}%`;
      document.getElementById('resCombo').textContent = this.maxCombo;
      document.getElementById('resSick').textContent = this.hits.sick;
      document.getElementById('resGood').textContent = this.hits.good;
      document.getElementById('resBad').textContent = this.hits.bad;
      document.getElementById('resMiss').textContent = this.hits.miss;

      this.resultsScreen.classList.remove('hidden');
    }

    nextSong() {
      const idx = SONG_CATALOG.findIndex(s => s.id === this.selectedSong.id);
      const nextIdx = (idx + 1) % SONG_CATALOG.length;
      this.selectedSong = SONG_CATALOG[nextIdx];
      this.startSong();
    }

    // --- CANVAS STAGE & ARROW RENDERING ---
    renderCanvas() {
      const width = this.canvas.width;
      const height = this.canvas.height;

      // 1. Render Neon Stage Background
      this.ctx.fillStyle = '#0b0813';
      this.ctx.fillRect(0, 0, width, height);

      // Stage Lights Pulsing to Beat
      const centerGrad = this.ctx.createRadialGradient(
        width / 2, height / 2, 50,
        width / 2, height / 2, width * 0.6 * this.beatPulseScale
      );
      centerGrad.addColorStop(0, 'rgba(175, 0, 255, 0.25)');
      centerGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
      centerGrad.addColorStop(1, 'transparent');
      this.ctx.fillStyle = centerGrad;
      this.ctx.fillRect(0, 0, width, height);

      // Floor Stage Grid
      this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.15)';
      this.ctx.lineWidth = 2;
      const horizonY = height * 0.7;
      this.ctx.beginPath();
      this.ctx.moveTo(0, horizonY);
      this.ctx.lineTo(width, horizonY);
      this.ctx.stroke();

      // Speaker Box in Background
      const spkWidth = 140 * this.beatPulseScale;
      const spkHeight = 160 * this.beatPulseScale;
      this.ctx.fillStyle = '#16112a';
      this.ctx.strokeStyle = '#ff0055';
      this.ctx.lineWidth = 3;
      this.ctx.fillRect(width / 2 - spkWidth / 2, horizonY - spkHeight, spkWidth, spkHeight);
      this.ctx.strokeRect(width / 2 - spkWidth / 2, horizonY - spkHeight, spkWidth, spkHeight);

      // Speaker Cone Pulsing
      this.ctx.beginPath();
      this.ctx.arc(width / 2, horizonY - spkHeight / 2, 40 * this.beatPulseScale, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ff0055';
      this.ctx.fill();

      // 2. Render Characters (Opponent & Player)
      this.renderCharacter(width * 0.25, horizonY, false); // Opponent (Left)
      this.renderCharacter(width * 0.75, horizonY, true);  // Boyfriend (Right)

      // 3. Render Dual Strumlines & Notes
      const oppStrumX = width * 0.25;
      const plrStrumX = width * 0.75;
      const strumY = 110;
      const laneSpacing = 64;

      this.renderStrumline(oppStrumX, strumY, laneSpacing, false);
      this.renderStrumline(plrStrumX, strumY, laneSpacing, true);

      this.renderScrollingNotes(oppStrumX, plrStrumX, strumY, laneSpacing, height);

      // 4. Render Particle Sparkles
      this.renderParticles();
    }

    renderCharacter(x, y, isPlayer) {
      this.ctx.save();
      this.ctx.translate(x, y);

      const pose = isPlayer ? this.playerPose : this.oppPose;

      // Character Base Shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 70, 20, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw Vector Animated Character
      const scale = isPlayer ? 1.0 : 1.1;
      this.ctx.scale(scale, scale);

      let offsetX = 0;
      let offsetY = 0;

      if (pose === 'left') offsetX = -20;
      if (pose === 'right') offsetX = 20;
      if (pose === 'up') offsetY = -20;
      if (pose === 'down') offsetY = 15;
      if (pose === 'miss') offsetY = 10;

      // Body Capsule
      this.ctx.fillStyle = isPlayer ? '#00ffff' : '#ff0055';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.roundRect(-40 + offsetX, -160 + offsetY, 80, 120, 30);
      this.ctx.fill();
      this.ctx.stroke();

      // Head
      this.ctx.fillStyle = isPlayer ? '#ffcc00' : '#bf00ff';
      this.ctx.beginPath();
      this.ctx.arc(offsetX, -190 + offsetY, 35, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Face Expression
      this.ctx.fillStyle = '#000000';
      if (pose === 'miss') {
        // X Eyes
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.fillText('X X', -15 + offsetX, -185 + offsetY);
      } else {
        // Animated Eyes
        this.ctx.beginPath();
        this.ctx.arc(-12 + offsetX, -195 + offsetY, 5, 0, Math.PI * 2);
        this.ctx.arc(12 + offsetX, -195 + offsetY, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Mic / Weapon in Hand
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(35 + offsetX, -140 + offsetY, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    renderStrumline(centerX, strumY, laneSpacing, isPlayer) {
      const startX = centerX - (laneSpacing * (LANES - 1)) / 2;

      for (let lane = 0; lane < LANES; lane++) {
        const x = startX + lane * laneSpacing;
        const isPressed = isPlayer ? this.pressedLanes[lane] : (this.oppGlowTimer[lane] > 0);
        const glow = isPlayer ? this.laneGlowTimer[lane] : this.oppGlowTimer[lane];

        if (glow > 0) {
          if (isPlayer) this.laneGlowTimer[lane] -= 0.016;
          else this.oppGlowTimer[lane] -= 0.016;
        }

        this.drawArrowReceptor(x, strumY, lane, isPressed, glow);
      }
    }

    drawArrowReceptor(x, y, lane, isPressed, glow) {
      this.ctx.save();
      this.ctx.translate(x, y);

      const color = LANE_COLORS[lane];
      const glowColor = LANE_GLOWS[lane];

      let scale = isPressed ? 1.15 : 1.0;
      if (glow > 0) scale += glow * 0.2;
      this.ctx.scale(scale, scale);

      // Receptors Strum Border
      this.ctx.strokeStyle = isPressed ? '#ffffff' : color;
      this.ctx.lineWidth = isPressed ? 5 : 3;
      this.ctx.fillStyle = isPressed ? glowColor : 'rgba(10, 7, 18, 0.7)';

      if (glow > 0) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 20;
      }

      this.drawArrowShape(lane);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    }

    drawArrowShape(lane) {
      const size = 26;
      this.ctx.beginPath();

      if (lane === 0) { // Left
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size * 0.6, -size);
        this.ctx.lineTo(size * 0.6, -size * 0.4);
        this.ctx.lineTo(size, -size * 0.4);
        this.ctx.lineTo(size, size * 0.4);
        this.ctx.lineTo(size * 0.6, size * 0.4);
        this.ctx.lineTo(size * 0.6, size);
      } else if (lane === 1) { // Down
        this.ctx.moveTo(0, size);
        this.ctx.lineTo(-size, -size * 0.6);
        this.ctx.lineTo(-size * 0.4, -size * 0.6);
        this.ctx.lineTo(-size * 0.4, -size);
        this.ctx.lineTo(size * 0.4, -size);
        this.ctx.lineTo(size * 0.4, -size * 0.6);
        this.ctx.lineTo(size, -size * 0.6);
      } else if (lane === 2) { // Up
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(-size, size * 0.6);
        this.ctx.lineTo(-size * 0.4, size * 0.6);
        this.ctx.lineTo(-size * 0.4, size);
        this.ctx.lineTo(size * 0.4, size);
        this.ctx.lineTo(size * 0.4, size * 0.6);
        this.ctx.lineTo(size, size * 0.6);
      } else if (lane === 3) { // Right
        this.ctx.moveTo(size, 0);
        this.ctx.lineTo(-size * 0.6, -size);
        this.ctx.lineTo(-size * 0.6, -size * 0.4);
        this.ctx.lineTo(-size, -size * 0.4);
        this.ctx.lineTo(-size, size * 0.4);
        this.ctx.lineTo(-size * 0.6, size * 0.4);
        this.ctx.lineTo(-size * 0.6, size);
      }

      this.ctx.closePath();
    }

    renderScrollingNotes(oppStrumX, plrStrumX, strumY, laneSpacing, screenHeight) {
      const scrollPixelsPerSec = 450 * this.scrollSpeed;

      this.notes.forEach(note => {
        if (note.processed && !note.hold) return;

        const timeDiff = note.time - this.currentTime;
        const y = strumY + timeDiff * scrollPixelsPerSec;

        // Render buffer bounds
        if (y < -100 || y > screenHeight + 200) return;

        const centerX = note.isPlayer ? plrStrumX : oppStrumX;
        const startX = centerX - (laneSpacing * (LANES - 1)) / 2;
        const x = startX + note.lane * laneSpacing;

        // Draw Hold Tail
        if (note.hold > 0) {
          const holdLength = note.hold * scrollPixelsPerSec;
          this.ctx.fillStyle = LANE_GLOWS[note.lane];
          this.ctx.fillRect(x - 8, y, 16, holdLength);
        }

        // Draw Arrow Note Head
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.fillStyle = LANE_COLORS[note.lane];
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = LANE_COLORS[note.lane];
        this.ctx.shadowBlur = 12;

        this.drawArrowShape(note.lane);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      });
    }

    spawnSparkles(lane) {
      const plrStrumX = this.canvas.width * 0.75;
      const startX = plrStrumX - (64 * (LANES - 1)) / 2;
      const x = startX + lane * 64;
      const y = 110;

      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 200;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: LANE_COLORS[lane],
          life: 0.3,
          maxLife: 0.3
        });
      }
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    }

    renderParticles() {
      this.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 5 * alpha, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1.0;
    }

    // --- CHART EDITOR INTERFACE ---
    openChartEditor() {
      this.state = 'EDITOR';
      this.hideAllScreens();
      this.chartEditorScreen.classList.remove('hidden');
      this.renderEditorGrid();
    }

    renderEditorGrid() {
      const container = document.getElementById('editorGridContainer');
      container.innerHTML = '';

      const grid = document.createElement('div');
      grid.className = 'editor-grid';

      // Render 32 Beat rows x 8 Columns (4 Opponent + 4 Player)
      for (let r = 0; r < 32; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = document.createElement('div');
          const isOpp = c < 4;
          cell.className = `grid-cell ${isOpp ? 'opp-lane' : 'plr-lane'}`;
          cell.dataset.row = r;
          cell.dataset.col = c;
          cell.onclick = () => {
            cell.classList.toggle(isOpp ? 'opp-note' : 'active-note');
          };
          grid.appendChild(cell);
        }
      }
      container.appendChild(grid);
    }

    playtestFromEditor() {
      alert('Starting playtest of chart grid!');
      this.startSong();
    }

    exportChartJSON() {
      const chartData = JSON.stringify(this.selectedSong.normal, null, 2);
      const blob = new Blob([chartData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.selectedSong.id}-chart.json`;
      a.click();
    }
  }

  // Launch Game Engine when DOM loaded
  window.addEventListener('DOMContentLoaded', () => {
    window.fnfEngine = new FNFGameEngine();
  });
})();
