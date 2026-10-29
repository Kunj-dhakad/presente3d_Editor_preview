"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BookPreviewProvider, useBookPreview } from "@reader/context/BookPreviewContext";
import PageRenderer from "@reader/render/PageRenderer";
import { notifyParent } from "@shared/parentBridge";
import { PitchEngine } from "./engine";
import ViewerModals from "./ViewerModals";
import { DEFAULT_ENV, DEFAULT_SETTINGS, type RawSlide, type ViewerData, type ViewerEnv, type ViewerSettings } from "./types";

/**
 * The pitch viewer: the PHP app's ppt-view page (views/default/presentation/
 * ppt_view.php) rebuilt here, with the same markup and class names so its
 * stylesheet (public/viewer/presentation_view.css) applies unchanged. Slides
 * are drawn by the reader's renderer, so they look exactly as in the editor.
 */

// The slide box from presentation_view.css: calc(var(--slide-w) / 1.3) × calc(var(--slide-h) / 1.3).
const BOX_W = 1110 / 1.3;
const BOX_H = 625 / 1.3;
const LAYER_BORDER = 3;
const THUMB_W = 153;
const THUMB_H = 86.2;

/** Unwraps the JSON-string-inside-JSON that PHP stores. */
function unwrap(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 3 && typeof current === "string"; i++) {
    try { current = JSON.parse(current); } catch { break; }
  }
  return current;
}

export default function PitchViewer({ data, templateUrl }: { data: ViewerData | null; templateUrl: string | null }) {
  const [doc, setDoc] = useState<{ json: string; slides: RawSlide[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const raw = data?.document !== undefined ? unwrap(data.document) : templateUrl ? unwrap(await (await fetch(templateUrl)).json()) : null;
        if (raw === null) return;
        const slides = (raw as { slides?: RawSlide[] })?.slides;
        if (!Array.isArray(slides) || !slides.length) throw new Error("This presentation has no slides.");
        if (live) setDoc({ json: JSON.stringify(raw), slides });
      } catch (e) {
        if (live) {
          setError(e instanceof Error ? e.message : "This presentation could not be opened.");
          notifyParent("LOADER_OFF");
        }
      }
    })();
    return () => { live = false; };
  }, [data, templateUrl]);

  const settings = useMemo<ViewerSettings>(() => ({ ...DEFAULT_SETTINGS, ...data?.settings }), [data]);
  const env = useMemo<ViewerEnv>(() => ({ ...DEFAULT_ENV, ...data?.env }), [data]);

  return (
    <>
      {/* The PHP viewer's stylesheets, in its order; React puts them in <head>. */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" precedence="viewer" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" precedence="viewer" />
      {/* eslint-disable-next-line @next/next/no-css-tags -- the PHP viewer's stylesheet, copied unchanged; it must load after Bootstrap */}
      <link rel="stylesheet" href="/viewer/presentation_view.css" precedence="viewer" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/inter-ui/4.1.1/inter.min.css" precedence="viewer" />
      <style>{`.subtitle, .word { color: ${settings.subtitle_text_color}; } .subtitle-line { background: ${settings.subtitle_background_color}; }`}</style>
      {error && <div className="not-find">{error}</div>}
      {doc && (
        <BookPreviewProvider json={doc.json}>
          <ViewerShell settings={settings} env={env} slides={doc.slides} />
        </BookPreviewProvider>
      )}
    </>
  );
}

function useViewportWidth() {
  const [width, setWidth] = useState(1440);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

function ViewerShell({ settings: s, env, slides }: { settings: ViewerSettings; env: ViewerEnv; slides: RawSlide[] }) {
  const { pages, loading, setCurrentPage } = useBookPreview();
  const [engine] = useState(() => new PitchEngine(s, env));
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  const width = useViewportWidth();
  const progressRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading || !pages.length) return;
    engine.start(slides);
    notifyParent("LOADER_OFF");
    return () => engine.dispose();
  }, [engine, loading, pages.length, slides]);

  // Keeps the reader's "nearby page" logic (media loading) on the shown slide.
  useEffect(() => { setCurrentPage(engine.index + 1); }, [engine.index, setCurrentPage]);

  // Keyboard: arrows and space, as uiController.js.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") engine.nextSlide();
      if (e.key === "ArrowLeft") engine.prevSlide();
      if (e.key === " ") { e.preventDefault(); engine.togglePlay(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [engine]);

  // Progress bar: click or drag to seek.
  useEffect(() => {
    const bar = progressRef.current;
    if (!bar) return;
    let dragging = false;
    const seek = (x: number) => { const r = bar.getBoundingClientRect(); engine.seek((x - r.left) / r.width); };
    const down = (e: PointerEvent) => { dragging = true; seek(e.clientX); };
    const move = (e: PointerEvent) => { if (dragging) seek(e.clientX); };
    const up = () => { dragging = false; };
    bar.addEventListener("pointerdown", down);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    return () => { bar.removeEventListener("pointerdown", down); document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); };
  }, [engine]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    if (!engine.panelOpen) return;
    document.querySelector(".slide-thumb.active-slide")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [engine.index, engine.panelOpen]);

  if (loading || !pages.length) return null;

  const total = pages.length;
  const avatar = engine.hasAvatar;
  const wide = width > 1360;
  const percent = ((engine.index + 1) / total) * 100;
  const assets = env.assets_url;

  // Layout shifts that chatEngine.js and slidePanelEngine.js made with inline styles and classes.
  const viewerTransform = wide ? (engine.chatOpen ? "translateX(-90px)" : engine.panelOpen ? "translateX(120px)" : "translateX(45px)") : undefined;
  const otherOpen = avatar || engine.chatOpen;
  const viewerClass = ["viewer-container", engine.panelOpen ? "" : "close", engine.panelOpen && otherOpen ? "slide-chat" : "", engine.panelOpen && !otherOpen ? "slide-add" : ""].filter(Boolean).join(" ");
  // scaleView.js: below 1360px the slide scales with the window.
  const sliderStyle: CSSProperties = { transform: width <= 1360 ? `scale(${width / 800})` : "scale(1)" };
  const subtitleStyle: CSSProperties = {
    top: width <= 767 ? "100%" : wide ? "90%" : undefined,
    visibility: engine.subtitle.visible ? "visible" : "hidden",
    display: engine.subtitlesOn ? undefined : "none",
    opacity: engine.subtitlesOn ? 1 : 0,
  };
  const chatParentStyle: CSSProperties | undefined = !wide && !engine.chatOpen ? { display: "none" } : undefined;
  const footerStyle: CSSProperties = { zIndex: !wide && engine.chatOpen ? -1 : 999 };
  const headBtnStyle: CSSProperties | undefined = width <= 767 && engine.chatOpen ? { zIndex: -1 } : undefined;
  const logo = env.logo_url || `${assets}logo.png`;

  const thumbnails = pages.map((page, index) => {
    const scale = Math.min(THUMB_W / page.width, THUMB_H / page.height);
    return (
      <li className="slide-thumb-wrapper" key={page.id}>
        <div
          className={`slide-thumb${index === engine.index ? " active-slide" : ""}`}
          data-index={index}
          style={{ width: THUMB_W, height: THUMB_H, position: "relative", overflow: "hidden" }}
          onClick={() => engine.jumpTo(index)}
        >
          <PageRenderer page={page} pageNumber={index + 1} thumbnail style={{ transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0, boxShadow: "none" }} />
          <div style={{ position: "absolute", top: 4, right: 6, fontSize: 10, backgroundColor: "#fff", color: "rgb(0, 0, 0)", padding: "2px 4px", borderRadius: 3 }}>
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>
      </li>
    );
  });

  return (
    <>
      <header id="ppt-header">
        <button type="button" className="back-to-super" id="backBtn" style={{ display: env.can_go_back ? "block" : undefined }} onClick={() => notifyParent("VIEWER_BACK")}>
          <i className="fa-solid fa-arrow-left" />
        </button>
        <h3>{s.presentation_name}</h3>
        <div className="gap-2 top-head-btn" style={headBtnStyle}>
          <button id="openShareModal" type="button" className="btn btn-sm btn-primary" onClick={() => engine.openShare()} title="Share">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" style={{ width: "1.25rem", height: "1.25rem", flexShrink: 0 }}>
              <path fillRule="evenodd" d="M14 5a4 4 0 1 1 1.159 2.815L9.85 10.912a4.002 4.002 0 0 1 0 2.176l5.309 3.097a4 4 0 1 1-1.009 1.727l-5.308-3.097a4 4 0 1 1 0-5.63l5.308-3.097A4.003 4.003 0 0 1 14 5Z" clipRule="evenodd" />
            </svg>
          </button>
          <button id="feedbakModalOpen" type="button" className="btn btn-sm btn-primary" onClick={() => engine.reopenFeedback()} title="Feedback">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20, fill: "white" }}>
              <path d="m24.913 12.45-1.973.797c-.254.103-.521.155-.793.155-.583 0-1.147-.246-1.546-.675-.397-.426-.602-1.005-.561-1.588l.149-2.122-1.369-1.628c-.304-.362-.456-.805-.477-1.259h-12.973c-2.35 0-4.27 1.92-4.27 4.28v11.9c0 2.36 1.92 4.27 4.27 4.27h3.25l-.07 1.99c-.02.81.41 1.55 1.13 1.93.31.16.64.24.98.24.44 0 .88-.15 1.25-.43l4.96-3.73h5.72c2.35 0 4.27-1.91 4.27-4.27v-9.073zm-10.436 7.08h-5.249c-.497 0-.9-.403-.9-.9s.403-.9.9-.9h5.249c.497 0 .9.403.9.9s-.403.9-.9.9zm4.653-4.546h-9.9c-.497 0-.9-.403-.9-.9s.403-.9.9-.9h9.9c.497 0 .9.403.9.9s-.403.9-.9.9z" />
              <path d="m25.433 2.454 1.449 2.319 2.653.661c.44.11.613.642.322.99l-1.758 2.094.191 2.727c.032.452-.421.782-.842.612l-2.535-1.025-2.535 1.025c-.42.17-.874-.159-.842-.612l.191-2.727-1.758-2.094c-.292-.347-.118-.88.322-.99l2.653-.661 1.449-2.319c.239-.385.8-.385 1.04 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="main-presentation-view" id="main-presentation-view" style={{ opacity: engine.started ? 1 : undefined }}>
        <div id="slideArea" style={{ flex: engine.chatOpen ? "0 0 calc(100% - 200px)" : "1" }}>
          <div className={viewerClass} id="viewer-container" style={{ transform: viewerTransform }}>
            <div className={`slide-panel-container slide-panel-container-style-2${engine.panelOpen ? " open" : ""}`} id="slidePanelContainer">
              <div className="slide-panel-header">
                <h4 className="slide-panel-title">Cards</h4>
                <span className="close-slide-btn" id="closeSlideBtn" onClick={() => engine.togglePanel()}>
                  <i className="fa-solid fa-xmark" />
                </span>
              </div>
              <ul className="slide-panel-inner" style={{ listStyle: "none", padding: "7px 0px", margin: "-10px 0px" }}>{thumbnails}</ul>
            </div>

            <div className={`slider-position${avatar ? " shift" : ""}`} id="presentation-slide" style={sliderStyle}>
              <div className="slider" id="slider">
                <div className="slideWrapper" id="slideWrapper">
                  {engine.layers.map(layer => {
                    const page = pages[layer.index];
                    if (!page) return null;
                    const scale = Math.min((BOX_W - 2 * LAYER_BORDER) / page.width, (BOX_H - 2 * LAYER_BORDER) / page.height);
                    return (
                      <div
                        key={layer.key}
                        className={`slide-layer ${layer.className}${engine.isPlaying ? " play" : ""}`}
                        style={{ position: "absolute", left: 0, top: 0, width: BOX_W, height: BOX_H, border: `${LAYER_BORDER}px solid #00A6EE`, boxSizing: "border-box", overflow: "hidden", background: page.background || "#ffffff" }}
                        onClick={e => { if (e.target === e.currentTarget) engine.togglePlay(); }}
                      >
                        <PageRenderer page={page} pageNumber={layer.index + 1} style={{ transform: `scale(${scale})`, transformOrigin: "top left", boxShadow: "none" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="subtitle" id="subtitleBox" style={subtitleStyle}>
                {engine.subtitle.lines.map((line, li) => (
                  <span className="subtitle-line" key={li}>
                    {line.map((word, wi) => {
                      const index = li === 0 ? wi : wi + engine.subtitle.lines[0].length;
                      return <span key={wi}><span className={`word${index < engine.subtitle.highlighted ? " highlight" : ""}`} data-index={index}>{word}</span>{wi < line.length - 1 ? " " : ""}</span>;
                    })}
                  </span>
                ))}
              </div>
            </div>

            <div className="avatar-chat-parent" style={chatParentStyle}>
              {avatar && <AvatarBox engine={engine} assets={assets} />}
              <ChatBox engine={engine} assets={assets} />
            </div>
          </div>
        </div>
        {s.auto_play && engine.overlayVisible && (
          <span className="play-btn-backdraw" id="playOverlay" onClick={() => engine.startPlayer()}>
            <span id="playBtn">
              {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF from the PHP app */}
              <img src={`${assets}PLay_animation.gif`} className="autoPlay-2" id="autoPlay" title="Play" alt="Play" />
            </span>
          </span>
        )}
      </div>

      <footer id="ppt-footer" style={footerStyle}>
        <div className="progress" id="progressContainer" ref={progressRef}>
          <div className="progress-bar" role="progressbar" aria-label="Slide progress" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} style={{ width: `${percent}%` }} />
        </div>
        <div className="controls">
          <div className="left-controls">
            {engine.isPlaying
              ? <i className="fa-solid fa-pause icon-btn-2" id="pause" title="Pause" style={{ display: "flex" }} onClick={() => engine.pausePlayer()} />
              : <i className="fa-solid fa-play icon-btn-2" id="play" title="Play" style={{ display: "flex" }} onClick={() => engine.startPlayer()} />}
            <div className="left-pagination">
              <i className="fa-solid fa-angles-left icon-btn" id="prev" title="Previous" onClick={() => engine.prevSlide()} />
              <p className="slide-index" id="slide-index" style={{ fontSize: 16, margin: "0 -16px", color: "#0B2638" }} title="Slide Index">{engine.index + 1}/{total}</p>
              <i className="fa-solid fa-angles-right icon-btn" id="next" title="Next" onClick={() => engine.nextSlide()} />
            </div>
          </div>

          {s.ask_ques && (
            <div className="midle-controls">
              <div className="m-controls1" id="m-controls1" style={{ display: engine.voiceMode ? "none" : "flex" }}>
                <button className="app-btn ask-ques-btn" id="ask-ques-btn" title="Ask Questions" onClick={() => engine.openVoiceMode()}>
                  <i className="fa-solid fa-microphone" /> Ask Questions
                </button>
              </div>
              <div className="m-controls2" id="m-controls2" style={{ position: "relative", marginTop: 0, display: engine.voiceMode ? "flex" : "none" }}>
                <div className="waveformWrapper" id="waveformWrapper" style={Object.fromEntries(engine.bars.map((h, i) => [`--bar${i + 1}`, `${h}px`])) as CSSProperties}>
                  {engine.bars.map((_, i) => <div className="bar" key={i} />)}
                </div>
                <button className="cntrols-btn" id="close-c" title="Close" onClick={() => engine.leaveVoiceMode()}><i className="fa-solid fa-xmark" /></button>
              </div>
            </div>
          )}

          <span className="right-controls">
            {engine.muted
              ? <i className="fa-solid fa-volume-xmark" style={{ color: "#00A6EE", fontSize: 20, cursor: "pointer" }} id="muteOffBtn" onClick={() => engine.toggleMute()} />
              : <i className="fa-solid fa-volume-high" style={{ color: "#00A6EE", fontSize: 20, cursor: "pointer" }} id="muteOnBtn" onClick={() => engine.toggleMute()} />}
            {s.slides_panel && <i className={`fa-solid fa-layer-group icon-btn slidePanelBtn${engine.panelOpen ? " active" : ""}`} id="slidePanelBtn" title="Slides" onClick={() => engine.togglePanel()} />}
            {s.chat_panel && <i className={`fa-solid fa-comments icon-btn chatOpenBtn${engine.chatOpen ? " active" : ""}`} id="chatOpenBtn" title="Chat To Agent" style={{ pointerEvents: engine.chatLocked ? "none" : "auto" }} onClick={() => engine.toggleChat()} />}
            <i className={`fa-solid fa-closed-captioning icon-btn subtitleBtn${engine.subtitlesOn ? " active" : ""}`} id="subtitleBtn" title="Subtitle" onClick={() => engine.toggleSubtitles()} />
            <i className="fa-solid fa-expand icon-btn fullscreenBtn" id="fullscreenBtn" title="Fullscreen" onClick={toggleFullscreen} />
            <div className="logo">
              <a href={env.logo_link || "#"} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- white-label logo from the PHP app */}
                <img className="site-logo" src={logo} style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 40 }} alt="logo" />
              </a>
            </div>
          </span>

          {/* Narrow screens: the same buttons in a drop-up menu. */}
          <span className="right-controls compact-view align-items-center" style={{ display: "none" }}>
            <div className="dropdown dropup no-icon d-inline-flex">
              <button className="btn btn-sm btn-primary dropdown-toggle" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
                <i className="fa-solid fa-bars" />
              </button>
              <ul className={`dropdown-menu${menuOpen ? " show" : ""}`} style={menuOpen ? { position: "absolute", bottom: "100%", left: 0 } : undefined} onClick={() => setMenuOpen(false)}>
                <li className="dropdown-item" onClick={() => engine.toggleMute()}>
                  <i className={`fa-solid ${engine.muted ? "fa-volume-xmark" : "fa-volume-high"}`} style={{ color: "#00A6EE", fontSize: 16, width: 29, textAlign: "center" }} />
                  <span className="text">{engine.muted ? "Unmute" : "Mute"}</span>
                </li>
                {s.slides_panel && (
                  <li className="dropdown-item slidePanelBtn" onClick={() => engine.togglePanel()}>
                    <i className="fa-solid fa-layer-group icon-btn" title="Slides" />
                    <span className="text">Slides</span>
                  </li>
                )}
                {s.chat_panel && (
                  <li className="dropdown-item chatOpenBtn" onClick={() => engine.toggleChat()}>
                    <i className="fa-solid fa-comments icon-btn" title="Chat To Agent" />
                    <span className="text">Chat</span>
                  </li>
                )}
                <li className={`dropdown-item subtitleBtn${engine.subtitlesOn ? " active" : ""}`} onClick={() => engine.toggleSubtitles()}>
                  <i className="fa-solid fa-closed-captioning icon-btn" title="Subtitle" />
                  <span className="text">Subtitle</span>
                </li>
              </ul>
            </div>
            <i className="fa-solid fa-expand icon-btn fullscreenBtn" title="Fullscreen" onClick={toggleFullscreen} />
            <div className="logo">
              <a href={env.logo_link || "#"} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- white-label logo from the PHP app */}
                <img className="site-logo" src={logo} style={{ width: "100%", height: "100%", objectFit: "cover", maxHeight: 40 }} alt="logo" />
              </a>
            </div>
          </span>
        </div>
      </footer>

      <ViewerModals engine={engine} />
    </>
  );
}

function toggleFullscreen() {
  if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
  else void document.exitFullscreen?.().catch(() => {});
}

/** The avatar video beside the slides, or its image while the video is being made. */
function AvatarBox({ engine, assets }: { engine: PitchEngine; assets: string }) {
  const s = engine.s;
  const [waitedLong, setWaitedLong] = useState(false);
  const attachVideo = useCallback((video: HTMLVideoElement | null) => engine.attachAvatar(video), [engine]);
  useEffect(() => {
    const timer = setTimeout(() => setWaitedLong(true), 60000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={`avt-video-box open${engine.chatOpen ? " add-chat" : ""}`} id="avt-video-box">
      {s.avt_video_path ? (
        <video className="avt-video" id="avt-video" src={s.avt_video_path} loop playsInline ref={attachVideo} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar image from the PHP app */}
          <img src={s.avt_img_path} className="avt-video" alt="" />
          <div className="reload-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element -- loader GIF from the PHP app */}
            {!waitedLong && <img src={`${assets}avt_load.gif`} id="process-gif" width={60} alt="" />}
            <button type="button" className="reload-tag" id="reload-tag" style={{ display: waitedLong ? "flex" : "none" }} onClick={() => location.reload()}>
              <i className="fa-solid fa-arrow-rotate-right" />
            </button>
            <span className="reload-text">Video is being processed.</span>
            <span className="reload-text">Please wait 2–3 minutes and refresh.</span>
          </div>
        </>
      )}
    </div>
  );
}

function ChatBox({ engine, assets }: { engine: PitchEngine; assets: string }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const last = engine.messages[engine.messages.length - 1];
  useEffect(() => {
    const area = areaRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [engine.messages.length, last?.shown, engine.loaderText]);

  return (
    <div className={`chat-container-box${engine.chatOpen ? " open" : ""}${engine.chatOpen && engine.hasAvatar ? " mini-video" : ""}`} id="chatContainerBox">
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-icon">
            {/* eslint-disable-next-line @next/next/no-img-element -- avatar image from the PHP app */}
            <img src={engine.s.avt_img_path || `${assets}agent_dlf.png`} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 5 }} alt="" />
          </div>
          <h4 className="chat-title">Ask Question</h4>
        </div>
        <span className="close-chat-btn" id="closeChatBtn" onClick={() => engine.toggleChat()}>
          <i className="fa-solid fa-xmark" />
        </span>
      </div>

      <div className="chat-area-box" id="chatAreaBox" ref={areaRef}>
        {engine.messages.map(message => message.from === "visitor" ? (
          // The PHP viewer put the visitor's text in .bot-message and the answer in .user-message; its CSS styles them that way.
          <div className="chat-message bot-message" key={message.id}><div className="message-bubble">{message.text}</div></div>
        ) : (
          <div className="chat-message user-message" key={message.id}><div className="message-bubble">{message.text.slice(0, message.shown)}</div></div>
        ))}
        {engine.loaderText && (
          <div className="loader-bot dynamic-loader">
            <div className="msg-wrapper">
              <div className="loader-text">{engine.loaderText}</div>
              <div className="blue ball" />
              <div className="red ball" />
              <div className="yellow ball" />
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <textarea
          className="chat-input" id="ppt-chat-input" placeholder="Type a message" value={engine.input}
          onChange={e => engine.setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); engine.ask("", "chat"); } }}
        />
        <button className="app-btn" id="sendChatBtn" onClick={() => engine.ask("", "chat")}>
          <i className="fa-solid fa-paper-plane" /> Send
        </button>
      </div>
    </div>
  );
}
