import { ANIMATIONS, type RawSlide, type ViewerEnv, type ViewerSettings } from "./types";
import { GREETINGS } from "./greetings";
import * as php from "./phpApi";

/**
 * The pitch viewer's behaviour, ported from the PHP viewer's engines
 * (assets/presentation/js: slideController, audioEngine, subtitleEngine,
 * modalEngine, chatEngine, qaSystem, speechEngine, audioVisualizerEngine).
 * It is plain TypeScript with mutable state, like the original, because the
 * flow is driven by audio, timers and speech callbacks; React only renders
 * it (useSyncExternalStore) and forwards clicks.
 *
 * Where the PHP viewer would stall, this one keeps going: a slide without a
 * narration file is timed from its subtitle text instead of waiting forever.
 */

export type ModalName = "start" | "lead" | "feedback" | "thankYou" | "share";
export type ChatMessage = { id: number; from: "visitor" | "agent"; text: string; shown: number };
export type SlideLayer = { key: number; index: number; className: string };

type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const COMMAND_MAP: Record<string, string[]> = {
  stop: ["stop", "store", "stock", "step", "stuff", "stopped"],
  pause: ["pause", "pose", "pos", "post", "pausee", "paus"],
  play: ["play", "clay", "place", "plane", "plague", "please"],
  resume: ["resume", "resue", "presume", "assume", "rezoom"],
  next: ["next", "text", "nest", "mixed", "nex"],
  previous: ["previous", "prives", "privious", "previews", "previously"],
};
const LOADER_TEXTS = ["Analyzing data", "Optimizing response", "Preparing insights"];
const WORDS_PER_CHUNK = 11;
const FIRST_LINE_WORDS = 5;
/** A slide with no narration and no subtitle stays this long while playing. */
const SILENT_SLIDE_MS = 5000;

export class PitchEngine {
  /* ---------- inputs ---------- */
  readonly s: ViewerSettings;
  readonly env: ViewerEnv;
  slides: RawSlide[] = [];

  /* ---------- state the UI reads ---------- */
  index = 0;
  /** The last slide finished playing; the next step starts again from the first. */
  atEnd = false;
  pageCount = 1;
  isPlaying = false;
  isPaused = false;
  muted = false;
  subtitlesOn = true;
  chatOpen = false;
  panelOpen = false;
  voiceMode = false;
  started = false;
  overlayVisible: boolean;
  modals = new Set<ModalName>();
  layers: SlideLayer[] = [];
  subtitle = { lines: [] as string[][], highlighted: 0, visible: false };
  messages: ChatMessage[] = [];
  loaderText: string | null = null;
  chatLocked = false;
  input = "";
  /** Bars of the voice-mode waveform, in px. */
  bars = [5, 5, 5, 5, 5];
  toast: { text: string; ok: boolean } | null = null;

  /* ---------- internals ---------- */
  private version = 0;
  private listeners = new Set<() => void>();
  private slideChanged = false;
  private slidePlaying = false;
  private feedbackDone = false;
  private thankYouDone = false;
  private feedbackPending = false;
  private layerKey = 0;
  private messageId = 0;

  private audio: HTMLAudioElement | null = null;
  private answerAudio: HTMLAudioElement | null = null;
  private avatarVideo: HTMLVideoElement | null = null;
  private token = 0;
  private pausedTime = 0;

  /** Timed narration for slides without an audio file. */
  private silent: { timer: ReturnType<typeof setTimeout> | null; started: number; remaining: number; onEnd: (() => void) | null } = { timer: null, started: 0, remaining: 0, onEnd: null };

  private chunks: string[][] = [];
  private chunkIndex = 0;
  private words: string[] = [];
  private timings: { start: number; end: number }[] = [];
  private wordIndex = 0;
  private subtitleTimer: ReturnType<typeof setTimeout> | null = null;

  private waiting = false;
  private answerPlaying = false;
  private loaderInterval: ReturnType<typeof setInterval> | null = null;

  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;
  private recognitionRunning = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animationId: number | null = null;

  constructor(settings: ViewerSettings, env: ViewerEnv) {
    this.s = settings;
    this.env = env;
    this.overlayVisible = settings.auto_play;
  }

  /* ==================== store plumbing ==================== */

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getVersion = () => this.version;
  private emit() {
    this.version++;
    for (const listener of this.listeners) listener();
  }

  /** Called once the slides are known and the page is in the browser. */
  start(slides: RawSlide[]) {
    this.slides = slides;
    this.audio = new Audio();
    this.answerAudio = new Audio();
    if (window.innerWidth > 1360) this.chatOpen = true;
    php.countPresentationView(this.env, this.s);
    this.loadSlide(0);
  }

  dispose() {
    this.stopAll();
    this.answerAudio?.pause();
    this.stopVoiceMode();
    if (this.loaderInterval) clearInterval(this.loaderInterval);
    this.listeners.clear();
  }

  /** The avatar <video>, once React has mounted it. */
  attachAvatar = (video: HTMLVideoElement | null) => { this.avatarVideo = video; };

  get total() { return this.slides.length; }
  private slide(i = this.index) { return this.slides[i]; }
  private clamp(i: number) { return Math.max(0, Math.min(i, this.total - 1)); }
  get hasAvatar() { return this.s.avatar_setting != 0; }

  /* ==================== slides ==================== */

  loadSlide(i: number) {
    this.clearSubtitleTimer();
    this.index = this.clamp(i);
    this.atEnd = false;
    this.pushLayer(this.index);

    if (this.slide()?.subtitle_text) this.setupSubtitles(true);
    else this.subtitle = { lines: [], highlighted: 0, visible: false };

    if (!this.isPlaying) this.activeModals();
    void php.countSlideVisit(this.env, this.s, this.index, this.total);
    this.emit();
  }

  /** The PHP renderer's enter/exit animation: old layer gets -exit, new one -enter then -active. */
  private pushLayer(index: number) {
    const animation = this.s.slide_animation ? ANIMATIONS[this.s.animation - 1] : null;
    const key = ++this.layerKey;
    if (!animation || !this.layers.length) {
      this.layers = [{ key, index, className: "" }];
      return;
    }
    this.layers = [
      ...this.layers.filter(layer => !layer.className.endsWith("-exit")).map(layer => ({ ...layer, className: `${animation}-exit` })),
      { key, index, className: `${animation}-enter` },
    ];
    requestAnimationFrame(() => {
      this.layers = this.layers.map(layer => layer.key === key ? { ...layer, className: `${animation}-enter ${animation}-active` } : layer);
      this.emit();
    });
    setTimeout(() => {
      this.layers = this.layers.filter(layer => !layer.className.endsWith("-exit"));
      this.emit();
    }, 450);
  }

  nextSlide(opts: { fromAutoplay?: boolean } = {}): void {
    this.slideChanged = true;
    this.pausedTime = 0;
    this.isPaused = false;
    const current = this.atEnd ? -1 : this.index;
    // Past the last slide: wrap to the first (autoplay stops there, a click keeps playing).
    if (current >= this.total - 1) {
      if (opts.fromAutoplay) this.stopPlayer();
      return this.nextFromStart();
    }
    this.pageCount++;
    this.loadSlide(current + 1);
    if (this.isPlaying) this.slideAudio(this.index);
  }
  private nextFromStart() {
    this.pageCount++;
    this.loadSlide(0);
    if (this.isPlaying) this.slideAudio(this.index);
  }

  prevSlide() {
    this.slideChanged = true;
    this.pausedTime = 0;
    this.isPaused = false;
    this.pageCount--;
    if (!this.atEnd && this.index > 0) {
      this.loadSlide(this.index - 1);
      if (this.isPlaying) this.slideAudio(this.index);
    }
    this.emit();
  }

  /** Progress bar click or drag, at `fraction` (0–1) of its width. */
  seek(fraction: number) {
    let next = Math.floor(Math.max(0, Math.min(1, fraction)) * this.total);
    if (next >= this.total) next = this.total - 1;
    if (next === this.index && !this.atEnd) return;
    this.slideChanged = true;
    this.pausedTime = 0;
    this.isPaused = false;
    this.loadSlide(next);
    if (this.isPlaying) this.slideAudio(next);
  }

  /** A thumbnail in the Cards panel. */
  jumpTo(i: number) {
    this.slideChanged = false;
    this.isPaused = false;
    this.loadSlide(i);
    if (this.isPlaying) this.slideAudio(this.index);
  }

  /* ==================== player ==================== */

  startPlayer() {
    this.answerAudio?.pause();
    this.slidePlaying = true;
    if (this.atEnd) { this.atEnd = false; this.loadSlide(0); }
    if (this.voiceMode) this.closeVoiceMode();
    this.chatLocked = false;
    if (this.isPaused && !this.slideChanged) {
      this.resume();
      return;
    }
    this.slideChanged = false;
    this.isPaused = false;
    this.pausedTime = 0;
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.overlayVisible = false;
    // Subtitles first: narration starts their highlighting, which a later reset would cancel.
    if (this.subtitlesOn && this.slide()?.subtitle_text) this.setupSubtitles(true);
    this.slideAudio(this.index);
    this.emit();
  }

  stopPlayer() {
    this.isPlaying = false;
    this.stopAll();
    this.stopSubtitleHighlight(false);
    this.emit();
  }

  pausePlayer() {
    this.isPlaying = false;
    this.slidePlaying = false;
    this.pause();
    this.emit();
  }

  togglePlay() {
    if (this.isPlaying) this.pausePlayer();
    else this.startPlayer();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.audio) this.audio.muted = this.muted;
    this.emit();
  }

  /* ==================== narration audio ==================== */

  private slideAudio(index: number) {
    if (!this.isPlaying || this.isPaused || !this.audio) return;
    const video = this.avatarVideo;
    if (this.hasAvatar && video) {
      // On the first slide a photo avatar speaks its own greeting.
      if (index === 0 && this.s.selected_agent_type === "photo") { video.muted = false; this.audio.muted = true; }
      else { video.muted = true; this.audio.muted = false; }
      video.currentTime = 0;
    } else {
      this.audio.muted = this.muted;
    }
    if (this.muted) {
      if (video) video.muted = true;
      this.audio.muted = true;
    }

    const onEnd = () => {
      if (!this.isPlaying) return;
      if (this.index === this.total - 1) {
        this.stopPlayer();
        this.atEnd = true;
        this.activeModals();
        this.emit();
        return;
      }
      this.nextSlide({ fromAutoplay: true });
    };

    const url = this.s.subtitle_audio[index];
    if (url) this.playUrl(url, onEnd);
    else this.playSilent(onEnd);
  }

  private playUrl(url: string, onEnd: () => void) {
    this.stopAll();
    const myToken = ++this.token;
    const audio = this.audio!;
    audio.src = url;
    audio.load();
    audio.onended = () => { if (myToken === this.token) onEnd(); };
    audio.play().then(() => {
      if (myToken !== this.token) return;
      this.setupSubtitles(true);
      this.startSubtitleHighlight(false);
      this.avatarVideo?.play().catch(() => {});
      this.emit();
    }).catch(() => {
      // Autoplay refused or the file is missing: time the slide instead of stalling.
      if (myToken === this.token) this.playSilent(onEnd);
    });
  }

  /** Narration timed from the subtitle words, for slides with no audio file. */
  private playSilent(onEnd: () => void) {
    this.stopAll();
    const words = (this.slide()?.subtitle_text || "").split(/\s+/).filter(Boolean);
    const duration = words.length
      ? words.reduce((sum, w) => sum + Math.max(150, w.replace(/[^a-zA-Z0-9]/g, "").length * 65) + 31, 0) + 1000
      : SILENT_SLIDE_MS;
    if (words.length) { this.setupSubtitles(true); this.startSubtitleHighlight(false); }
    this.avatarVideo?.play().catch(() => {});
    this.silent = { timer: null, started: Date.now(), remaining: duration, onEnd };
    this.silent.timer = setTimeout(() => { this.silent.timer = null; onEnd(); }, duration);
    this.emit();
  }

  private stopAll() {
    this.token++;
    if (this.audio) {
      try { this.audio.pause(); this.audio.currentTime = 0; } catch { /* not loaded */ }
    }
    if (this.silent.timer) clearTimeout(this.silent.timer);
    this.silent = { timer: null, started: 0, remaining: 0, onEnd: null };
    this.pausedTime = 0;
    this.stopSubtitleHighlight(false);
    try { this.avatarVideo?.pause(); } catch { /* not loaded */ }
  }

  private pause() {
    this.isPaused = true;
    this.isPlaying = false;
    if (this.silent.timer) {
      clearTimeout(this.silent.timer);
      this.silent.timer = null;
      this.silent.remaining -= Date.now() - this.silent.started;
    } else if (this.audio) {
      this.pausedTime = this.audio.currentTime || 0;
      try { this.audio.pause(); } catch { /* not loaded */ }
    }
    this.clearSubtitleTimer();
    try { this.avatarVideo?.pause(); } catch { /* not loaded */ }
  }

  private resume() {
    this.isPaused = false;
    this.isPlaying = true;
    if (this.silent.onEnd) {
      const onEnd = this.silent.onEnd;
      this.silent.started = Date.now();
      this.silent.timer = setTimeout(() => { this.silent.timer = null; onEnd(); }, Math.max(0, this.silent.remaining));
      this.startSubtitleHighlight(true);
      this.avatarVideo?.play().catch(() => {});
      this.emit();
      return;
    }
    const myToken = this.token;
    const audio = this.audio!;
    audio.currentTime = this.pausedTime;
    audio.play().then(() => {
      if (myToken !== this.token) return;
      this.resumeSubtitleFromAudio();
      this.avatarVideo?.play().catch(() => {});
      this.emit();
    }).catch(() => {});
    this.emit();
  }

  /* ==================== subtitles (subtitleEngine.js) ==================== */

  private clearSubtitleTimer() {
    if (this.subtitleTimer) clearTimeout(this.subtitleTimer);
    this.subtitleTimer = null;
  }

  private stopSubtitleHighlight(clear: boolean) {
    this.clearSubtitleTimer();
    if (clear) this.subtitle = { ...this.subtitle, highlighted: 0 };
    this.wordIndex = 0;
    this.chunkIndex = 0;
  }

  private setupSubtitles(resetIndex: boolean) {
    this.stopSubtitleHighlight(true);
    const text = this.slide()?.subtitle_text;
    if (!text) {
      this.subtitle = { lines: [], highlighted: 0, visible: false };
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    this.chunks = [];
    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) this.chunks.push(words.slice(i, i + WORDS_PER_CHUNK));
    this.chunkIndex = 0;
    this.subtitle = { ...this.subtitle, visible: true };
    this.buildChunk(resetIndex, false);
  }

  private buildChunk(resetIndex: boolean, resume: boolean) {
    this.words = this.chunks[this.chunkIndex] || [];
    let time = 0;
    this.timings = this.words.map(word => {
      const duration = Math.max(150, word.replace(/[^a-zA-Z0-9]/g, "").length * 65);
      const timing = { start: time, end: time + duration };
      time += duration + 1;
      return timing;
    });
    const lines = [this.words.slice(0, FIRST_LINE_WORDS)];
    if (this.words.length > FIRST_LINE_WORDS) lines.push(this.words.slice(FIRST_LINE_WORDS));
    this.subtitle = { lines, highlighted: resetIndex && !resume ? 0 : this.subtitle.highlighted, visible: this.subtitle.visible };
    if (resetIndex && !resume) this.wordIndex = 0;
  }

  private startSubtitleHighlight(resume: boolean) {
    this.clearSubtitleTimer();
    if (!resume) this.wordIndex = 0;
    const loop = () => {
      if (!this.isPlaying && !resume) return;
      if (!this.words.length) return;
      if (this.wordIndex >= this.words.length) {
        if (this.chunkIndex < this.chunks.length - 1) {
          this.chunkIndex++;
          this.buildChunk(true, false);
          this.wordIndex = 0;
          this.emit();
          loop();
        }
        return;
      }
      this.subtitle = { ...this.subtitle, highlighted: this.wordIndex + 1 };
      this.emit();
      const timing = this.timings[this.wordIndex];
      const delay = timing ? timing.end - timing.start + 30 : 280;
      this.wordIndex++;
      this.subtitleTimer = setTimeout(loop, delay);
    };
    loop();
  }

  private resumeSubtitleFromAudio() {
    const t = (this.audio?.currentTime || 0) * 1000;
    let acc = 0;
    for (let i = 0; i < this.timings.length; i++) {
      acc += this.timings[i].end - this.timings[i].start;
      if (t <= acc) { this.wordIndex = i; break; }
    }
    this.startSubtitleHighlight(true);
  }

  toggleSubtitles() {
    this.subtitlesOn = !this.subtitlesOn;
    this.emit();
  }

  /* ==================== modals (modalEngine.js) ==================== */

  open(name: ModalName) { this.modals.add(name); this.emit(); }
  close(name: ModalName) { this.modals.delete(name); this.emit(); }

  private activeModals() {
    this.handleLead();
    this.handleFeedback();
    if (!this.started) this.open("start");
    if (!this.s.feedback_form || php.getFlag("visitor_feedback_id_ppt")) this.showThankYou(5000);
  }

  private handleLead() {
    if (!this.s.lead_form || php.getFlag("visitor_lead_id_ppt")) return;
    if (this.s.lead_form_delay > 0 && this.s.lead_form_delay == this.pageCount) {
      this.open("lead");
      if (this.isPlaying) this.stopPlayer();
    }
  }

  private handleFeedback() {
    if (!this.s.feedback_form || php.getFlag("visitor_feedback_id_ppt")) return;
    if (this.pageCount == this.total && !this.isPlaying && !this.feedbackPending) {
      this.feedbackPending = true;
      setTimeout(() => { this.feedbackPending = false; this.openFeedback(); }, 5000);
    }
  }

  openFeedback() {
    if (this.feedbackDone || !this.s.feedback_form) return;
    this.open("feedback");
  }

  /** The header's feedback button: always opens it again. */
  reopenFeedback() {
    this.feedbackDone = false;
    this.openFeedback();
  }

  closeFeedback() {
    this.close("feedback");
    if (this.s.thank_you_msg) this.showThankYou(100);
    else this.resetSlides();
  }

  async submitFeedback(rating: number, message: string) {
    try {
      await php.submitFeedback(this.env, this.s, rating, message);
      this.feedbackDone = true;
      php.setFlag("visitor_feedback_id_ppt", php.visitorId());
      this.closeFeedback();
    } catch {
      this.showToast("Could not send your feedback. Please try again.", false);
    }
  }

  private showThankYou(delay: number) {
    setTimeout(() => {
      if (this.s.thank_you_msg && !this.thankYouDone && this.pageCount == this.total && !this.isPlaying) {
        this.pageCount = 1;
        this.open("thankYou");
      }
    }, delay);
  }

  closeThankYou() {
    if (this.thankYouDone) return;
    this.thankYouDone = true;
    this.close("thankYou");
    this.resetSlides();
  }

  /** The welcome modal's Continue button (or a click outside it). */
  begin() {
    if (this.started) return;
    this.started = true;
    this.close("start");
    if (!this.s.lead_form || php.getFlag("visitor_lead_id_ppt")) this.startPlayer();
    this.emit();
  }

  async submitLead(name: string, email: string) {
    await php.submitLead(this.env, this.s, name, email);
    this.close("lead");
    php.setFlag("visitor_lead_id_ppt", php.visitorId());
    this.startPlayer();
  }

  openShare() {
    php.countShare(this.env, this.s);
    this.open("share");
  }

  private resetSlides() {
    this.loadSlide(0);
  }

  showToast(text: string, ok = true) {
    this.toast = { text, ok };
    this.emit();
    setTimeout(() => { if (this.toast?.text === text) { this.toast = null; this.emit(); } }, 2500);
  }

  /* ==================== panels (chatEngine.js, slidePanelEngine.js) ==================== */

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (!this.chatOpen && this.voiceMode) this.closeVoiceMode();
    this.emit();
  }

  togglePanel() {
    this.panelOpen = !this.panelOpen;
    this.emit();
  }

  /* ==================== questions (qaSystem.js) ==================== */

  setInput(value: string) {
    this.input = value;
    this.emit();
  }

  ask(text = "", type: "chat" | "voice" = "chat") {
    const question = this.input.trim() || text;
    if (!question) return;
    this.messages = [...this.messages, { id: ++this.messageId, from: "visitor", text: question, shown: question.length }];
    this.input = "";
    this.showLoader();
    void this.answer(question, type);
  }

  private async answer(question: string, type: "chat" | "voice") {
    this.waiting = true;
    let reply = "";
    try {
      const language = await php.detectLanguage(question);
      if (Object.prototype.hasOwnProperty.call(GREETINGS, question)) {
        reply = GREETINGS[question];
        php.saveChat(this.env, this.s, question, 1);
        php.saveChat(this.env, this.s, reply, 2);
      } else {
        reply = this.s.ppt_id ? await php.askTrained(this.s, question, language).catch(() => "") : "";
        if (reply) {
          php.saveChat(this.env, this.s, question, 1);
          php.saveChat(this.env, this.s, reply, 2);
        } else if (this.env.site_url) {
          reply = await php.askAi(this.env, this.s, question, language);
          php.saveChat(this.env, this.s, question, 1);
          php.saveChat(this.env, this.s, reply, 2);
        } else {
          reply = "Questions can be answered once this presentation is opened from your dashboard.";
        }
      }
    } catch (error) {
      console.error("Answer failed:", error);
      reply = "Sorry, I could not answer that right now. Please try again.";
    }

    if (type === "voice" && this.env.site_url) {
      let src = "";
      try { src = await php.textToSpeech(this.env, this.s, reply); } catch (error) { console.warn("TTS failed:", error); }
      this.hideLoader();
      this.print(reply);
      if (src && !this.slidePlaying && this.answerAudio) {
        this.waiting = false;
        this.answerPlaying = true;
        this.answerAudio.src = src;
        this.answerAudio.play().then(() => { this.chatLocked = true; this.emit(); }).catch(() => {});
        this.answerAudio.onended = () => {
          this.chatLocked = false;
          this.answerPlaying = false;
          this.startNoSpeechTimer();
          this.emit();
        };
      }
      return;
    }
    setTimeout(() => { this.hideLoader(); this.print(reply); }, 1000);
  }

  /** Types the answer out, as the PHP viewer did (12 ms a character). */
  private print(text: string) {
    this.waiting = false;
    const message: ChatMessage = { id: ++this.messageId, from: "agent", text, shown: 0 };
    this.messages = [...this.messages, message];
    const step = () => {
      const current = this.messages.find(m => m.id === message.id);
      if (!current || current.shown >= text.length) return;
      this.messages = this.messages.map(m => m.id === message.id ? { ...m, shown: m.shown + 1 } : m);
      this.emit();
      setTimeout(step, 12);
    };
    step();
  }

  private showLoader() {
    this.hideLoader();
    let i = 0;
    this.loaderText = LOADER_TEXTS[0];
    this.loaderInterval = setInterval(() => {
      i = (i + 1) % LOADER_TEXTS.length;
      this.loaderText = LOADER_TEXTS[i];
      this.emit();
    }, 1500);
    this.emit();
  }

  private hideLoader() {
    if (this.loaderInterval) clearInterval(this.loaderInterval);
    this.loaderInterval = null;
    this.loaderText = null;
    this.emit();
  }

  /* ==================== voice mode (uiController.js, speechEngine.js) ==================== */

  get speechSupported() {
    return typeof window !== "undefined" && Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  }

  openVoiceMode() {
    if (!this.speechSupported) {
      this.showToast("Voice questions are not supported in this browser.", false);
      return;
    }
    this.startListening();
    if (!this.chatOpen) this.chatOpen = true;
    this.pausePlayer();
    void this.startVisualizer();
    this.voiceMode = true;
    this.emit();
  }

  closeVoiceMode() {
    this.stopVoiceMode();
    this.voiceMode = false;
    this.emit();
  }

  /** The voice bar's close button: back to the presentation. */
  leaveVoiceMode() {
    this.closeVoiceMode();
    this.toggleChat();
    this.startPlayer();
  }

  private stopVoiceMode() {
    this.stopListening();
    this.stopVisualizer();
  }

  private initRecognition() {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;
    const r = new Recognition();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => this.startNoSpeechTimer();
    r.onresult = event => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) this.setInput(interim);
      if (final.trim()) this.handleTranscript(final.trim());
      if (this.listening) this.resetRestartTimer();
    };
    r.onerror = event => { if (event.error !== "no-speech") this.restartListening(); };
    r.onend = () => {
      this.recognitionRunning = false;
      if (!this.listening) return;
      setTimeout(() => { if (this.listening && !this.recognitionRunning) this.startListening(); }, 600);
    };
    this.recognition = r;
  }

  private startListening() {
    if (!this.recognition) this.initRecognition();
    if (!this.recognition || this.recognitionRunning) return;
    this.listening = true;
    try { this.recognition.start(); this.recognitionRunning = true; } catch { /* already started */ }
    this.resetRestartTimer();
  }

  private stopListening() {
    this.listening = false;
    for (const timer of [this.restartTimer, this.silenceTimer, this.noSpeechTimer]) if (timer) clearTimeout(timer);
    if (this.recognitionRunning) { try { this.recognition?.stop(); } catch { /* not running */ } }
    this.recognitionRunning = false;
  }

  private restartListening() {
    if (this.listening && this.recognitionRunning) { try { this.recognition?.stop(); } catch { /* not running */ } }
  }

  private resetRestartTimer() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => this.restartListening(), 40000);
  }

  private startNoSpeechTimer() {
    if (this.noSpeechTimer) clearTimeout(this.noSpeechTimer);
    this.noSpeechTimer = setTimeout(() => {
      if (this.listening && !this.waiting && !this.answerPlaying) this.startPlayer();
    }, 10000);
  }

  /** "go to slide 3", "next", "pause"…; anything else is a question. */
  private handleTranscript(text: string) {
    const lower = text.toLowerCase();
    const normalized = this.normalizeCommands(lower);
    const slideNumber = this.slideNumberIn(normalized);
    if (slideNumber && /(slide|go|move)/i.test(normalized) && slideNumber - 1 < this.total) {
      this.loadSlide(slideNumber - 1);
      this.setInput("");
      return;
    }
    const commands: [string, () => void][] = [
      ["play", () => this.startPlayer()],
      ["pause", () => this.pausePlayer()],
      ["resume", () => this.startPlayer()],
      ["stop", () => this.stopPlayer()],
      ["previous", () => this.prevSlide()],
      ["first", () => this.loadSlide(0)],
      ["last", () => this.loadSlide(this.total - 1)],
      ["next", () => this.nextSlide({ fromAutoplay: true })],
    ];
    const matched = commands.find(([cmd]) => new RegExp(`\\b${cmd}\\b`, "i").test(normalized));
    if (matched) {
      matched[1]();
      this.setInput("");
      return;
    }
    this.setInput(lower);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.ask(lower, "voice");
      this.startNoSpeechTimer();
    }, 1500);
  }

  private slideNumberIn(text: string) {
    const digits = text.match(/\b\d+\b/);
    if (digits) return parseInt(digits[0], 10);
    const units: Record<string, number> = { zero: 0, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
    const total = text.split(/\s+/).reduce((sum, word) => sum + (units[word] ?? 0), 0);
    return total || null;
  }

  /** Speech often mishears the word next to "ppt" ("next ppt" → "text ppt"). */
  private normalizeCommands(sentence: string) {
    const words = sentence.split(/\s+/);
    const fix = (word: string) => Object.keys(COMMAND_MAP).find(cmd => COMMAND_MAP[cmd].includes(word)) ?? word;
    words.forEach((word, i) => {
      if (word !== "ppt") return;
      if (i > 0) words[i - 1] = fix(words[i - 1]);
      if (i < words.length - 1) words[i + 1] = fix(words[i + 1]);
    });
    return words.join(" ");
  }

  /* ---------- waveform (audioVisualizerEngine.js) ---------- */

  private async startVisualizer() {
    const last = [5, 5, 5, 5, 5];
    let speaking = false;
    let silence: ReturnType<typeof setTimeout> | null = null;
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext.createMediaStreamSource(this.micStream).connect(this.analyser);
    } catch (error) {
      console.warn("Mic not available:", error);
    }
    const data = new Uint8Array(this.analyser?.frequencyBinCount || 0);
    const frame = () => {
      this.animationId = requestAnimationFrame(frame);
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(data);
      const volume = data.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
      if (volume > 15) { speaking = true; if (silence) clearTimeout(silence); }
      else if (speaking) silence = setTimeout(() => { speaking = false; }, 800);
      const base = Math.max(5, volume / 4);
      const size = Math.floor(data.length / 5);
      for (let i = 0; i < 5; i++) {
        const chunk = data.slice(i * size, i * size + size);
        const avg = chunk.reduce((sum, v) => sum + v, 0) / (chunk.length || 1);
        const target = (base + avg / 2) * (speaking ? 1.3 : 0.7);
        last[i] = last[i] * 0.7 + target * 0.3;
      }
      this.bars = [...last];
      this.emit();
    };
    frame();
  }

  private stopVisualizer() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
    this.micStream?.getTracks().forEach(track => track.stop());
    this.micStream = null;
    void this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
    this.bars = [5, 5, 5, 5, 5];
  }
}
