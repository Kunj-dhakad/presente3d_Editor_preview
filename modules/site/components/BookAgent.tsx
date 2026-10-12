"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronDown,
  Lightbulb,
  LoaderCircle,
  Mic,
  MicOff,
  Pencil,
  RotateCcw,
  Send,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { bookPath } from "@shared/bookUrl";
import { PUBLICATION_TYPES } from "@shared/aiBook";
import {
  generateAiBook,
  type AiBookProgress,
  type CreatedBook,
} from "../lib/generateAiBook";

type Size = "portrait" | "landscape" | "square";
type Brief = {
  topic: string;
  pages: number | null;
  size: Size;
  tone: string;
  audience: string;
  category: string;
  /** Publication type, which picks the design. */
  type?: string;
};
type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; options?: string[] }
  | {
      id: number;
      role: "progress";
      brief: Brief;
      progress: AiBookProgress;
      error?: string;
    }
  | { id: number; role: "result"; book: CreatedBook };

// Omit applied to each member, so a new message keeps its own fields.
type NewMessage = Message extends infer M
  ? M extends Message
    ? Omit<M, "id">
    : never
  : never;

const SIZES: { id: Size; label: string }[] = [
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
  { id: "square", label: "Square" },
];
const IDEAS = [
  "Create a 5-page career motivation book with success tips and inspiring stories.",
  "Make a 10-page beginner's guide to digital marketing for small businesses.",
  "Write an 8-page bedtime storybook for kids about honesty.",
  "Create a 12-page travel guide to national parks in the American West.",
  "Build a 6-page healthy breakfast recipe book for busy families.",
];
const STAGE_TEXT = {
  planning: "Planning your pages",
  writing: "Writing and designing pages",
  saving: "Saving your book",
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
const speechCtor = (): RecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};
const subscribeNothing = () => () => {};

export default function BookAgent({ userName = "" }: { userName?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [size, setSize] = useState<Size>("portrait");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const idea = useRef(0);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognition = useRef<Recognition | null>(null);
  // What the agent has gathered so far, sent back so no detail is lost between turns.
  const brief = useRef<Brief | null>(null);
  // Voice input exists only in some browsers; decide after hydration.
  const canListen = useSyncExternalStore(
    subscribeNothing,
    () => Boolean(speechCtor()),
    () => false,
  );

  const busy = thinking || generating;
  const started = messages.length > 0;
  const initial = (userName.trim()[0] || "Y").toUpperCase();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);
  useEffect(() => {
    if (!generating) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [generating]);
  useEffect(() => () => recognition.current?.stop(), []);

  const add = (message: NewMessage) => {
    const id = nextId.current++;
    setMessages((current) => [...current, { ...message, id } as Message]);
    return id;
  };
  const update = (id: number, patch: Partial<Message>) =>
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? ({ ...message, ...patch } as Message) : message,
      ),
    );

  async function build(brief: Brief) {
    const id = add({
      role: "progress",
      brief,
      progress: { stage: "planning", done: 0, total: (brief.pages || 0) + 1 },
    });
    setGenerating(true);
    try {
      const prompt = [
        brief.topic,
        brief.audience && `Written for ${brief.audience}.`,
      ]
        .filter(Boolean)
        .join(" ");
      const book = await generateAiBook(
        {
          prompt,
          pages: brief.pages!,
          size: brief.size,
          tone: brief.tone,
          audience: brief.audience,
          category: brief.category,
          publicationType: brief.type,
          kind: "agent",
        },
        (progress) => update(id, { progress }),
      );
      setMessages((current) => current.filter((message) => message.id !== id));
      add({ role: "result", book });
      add({
        role: "assistant",
        text: "Your book is ready! Open it in the editor to make it yours — or tell me about the next one.",
        options: ["Create another book"],
      });
    } catch (e) {
      update(id, {
        error:
          e instanceof Error ? e.message : "The book could not be created.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setDraft("");
    setSizeOpen(false);
    add({ role: "user", text: content });
    const history = [
      ...messages,
      { id: 0, role: "user", text: content } as Message,
    ]
      .filter(
        (m): m is Extract<Message, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({ role: m.role, content: m.text }));
    setThinking(true);
    try {
      const response = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, size, brief: brief.current }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The agent could not reply.");
      brief.current = data.brief;
      add({ role: "assistant", text: data.reply, options: data.options });
      if (data.brief?.size && data.brief.size !== size)
        setSize(data.brief.size);
      if (data.ready) void build(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The agent could not reply.");
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }

  function toggleVoice() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const recognizer = new Ctor();
    recognizer.lang = "en-US";
    recognizer.interimResults = false;
    recognizer.continuous = false;
    recognizer.onresult = (event) => {
      const said = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (said) setDraft((current) => (current ? `${current} ${said}` : said));
    };
    recognizer.onend = () => setListening(false);
    recognizer.onerror = () => setListening(false);
    recognition.current = recognizer;
    setListening(true);
    recognizer.start();
  }

  function reset() {
    brief.current = null;
    if (busy) return;
    setMessages([]);
    setDraft("");
    setError("");
  }

  const composer = (
    <form
      className="fs-agent-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void send(draft);
      }}
    >
      <textarea
        ref={inputRef}
        rows={started ? 1 : 2}
        maxLength={2000}
        value={draft}
        disabled={generating}
        placeholder={IDEAS[0]}
        aria-label="Message the Book Agent"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send(draft);
          }
        }}
      />
      <div className="fs-agent-tools">
        <button
          type="button"
          className="fs-agent-icon"
          title="Give me an idea"
          aria-label="Give me an idea"
          disabled={busy}
          onClick={() => {
            setDraft(IDEAS[idea.current % IDEAS.length]);
            idea.current += 1;
            inputRef.current?.focus();
          }}
        >
          <Lightbulb size={18} />
        </button>
        <span className="fs-agent-spacer" />
        <div className="fs-agent-size">
          <button
            type="button"
            className="fs-agent-size-toggle"
            aria-haspopup="listbox"
            aria-expanded={sizeOpen}
            disabled={busy}
            onClick={() => setSizeOpen((open) => !open)}
          >
            <i className={`fs-shape fs-shape-${size}`} />
            {SIZES.find((s) => s.id === size)?.label}
            <ChevronDown size={15} />
          </button>
          {sizeOpen && (
            <ul role="listbox" aria-label="Book size">
              {SIZES.map((option) => (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={option.id === size}
                >
                  <button
                    type="button"
                    className={option.id === size ? "on" : ""}
                    onClick={() => {
                      setSize(option.id);
                      setSizeOpen(false);
                    }}
                  >
                    <i className={`fs-shape fs-shape-${option.id}`} />
                    {option.label}
                    {option.id === size && <Check size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {canListen && (
          <button
            type="button"
            className={`fs-agent-icon${listening ? " listening" : ""}`}
            aria-pressed={listening}
            title={listening ? "Stop listening" : "Speak your idea"}
            aria-label={listening ? "Stop listening" : "Speak your idea"}
            disabled={busy}
            onClick={toggleVoice}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <button
          type="submit"
          className="fs-btn fs-primary fs-agent-send"
          disabled={busy || !draft.trim()}
        >
          {thinking ? <LoaderCircle size={16} className="fs-spin" /> : null}Send
          <Send size={15} />
        </button>
      </div>
    </form>
  );

  if (!started)
    return (
      <main className="fs-agent fs-agent-home">
        <div className="fs-agent-hero">
          <span className="fs-agent-mark">
            <BookOpen size={40} />
            <Sparkles size={18} />
          </span>
          <h1>
            AI <em>Book</em> Agent
          </h1>
          <p>Create interactive AI books with just a single command.</p>
        </div>
        <div className="fs-agent-dock">
          {error && (
            <p className="fs-alert" role="alert">
              {error}
            </p>
          )}
          {composer}
          <div className="fs-agent-starters">
            {IDEAS.slice(1, 4).map((text) => (
              <button key={text} type="button" onClick={() => void send(text)}>
                <Sparkles size={13} />
                {text}
              </button>
            ))}
          </div>
        </div>
      </main>
    );

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <main className="fs-agent fs-agent-chat">
      <header className="fs-agent-bar">
        <span>
          <Sparkles size={16} /> Book Agent
        </span>
        <button
          type="button"
          className="fs-btn fs-outline fs-btn-sm"
          disabled={busy}
          onClick={reset}
        >
          <SquarePen size={14} />
          New chat
        </button>
      </header>

      <div className="fs-agent-log" aria-live="polite">
        {messages.map((message) => {
          if (message.role === "user")
            return (
              <div key={message.id} className="fs-msg fs-msg-user">
                <p>{message.text}</p>
                <span className="fs-msg-avatar">{initial}</span>
              </div>
            );
          if (message.role === "assistant")
            return (
              <div key={message.id} className="fs-msg fs-msg-agent">
                <span className="fs-msg-avatar">
                  <BookOpen size={17} />
                </span>
                <div>
                  <p>{message.text}</p>
                  {message.id === lastAssistant &&
                  !busy &&
                  message.options?.length ? (
                    <div className="fs-msg-options">
                      {message.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            option === "Create another book"
                              ? reset()
                              : void send(option)
                          }
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          if (message.role === "progress") {
            const { progress, brief } = message;
            const percent =
              progress.stage === "planning"
                ? 6
                : progress.stage === "saving"
                  ? 97
                  : Math.max(
                      8,
                      Math.round(
                        (progress.done / Math.max(1, progress.total)) * 92,
                      ),
                    );
            return (
              <div key={message.id} className="fs-msg fs-msg-agent">
                <span className="fs-msg-avatar">
                  <BookOpen size={17} />
                </span>
                <div className="fs-build-card">
                  <strong>{progress.title || brief.topic}</strong>
                  <small>
                    {brief.pages} pages + cover ·{" "}
                    {PUBLICATION_TYPES.find((t) => t.id === brief.type)?.name ?? "Book"} ·{" "}
                    {SIZES.find((s) => s.id === brief.size)?.label}
                  </small>
                  {message.error ? (
                    <>
                      <p className="fs-alert" role="alert">
                        {message.error}
                      </p>
                      <button
                        type="button"
                        className="fs-btn fs-primary fs-btn-sm"
                        disabled={generating}
                        onClick={() => {
                          setMessages((current) =>
                            current.filter((m) => m.id !== message.id),
                          );
                          void build(brief);
                        }}
                      >
                        <RotateCcw size={14} />
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <progress
                        value={percent}
                        max={100}
                        aria-label="Book progress"
                      />
                      <span className="fs-build-stage">
                        <LoaderCircle size={14} className="fs-spin" />
                        {STAGE_TEXT[progress.stage]}
                        {progress.stage === "writing"
                          ? ` · ${progress.done}/${progress.total}`
                          : "…"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={message.id} className="fs-msg fs-msg-agent">
              <span className="fs-msg-avatar">
                <BookOpen size={17} />
              </span>
              <div className="fs-build-card fs-build-done">
                <span className="fs-build-check">
                  <Check size={16} />
                </span>
                <strong>{message.book.title}</strong>
                <small>
                  {message.book.pages} pages ready
                  {message.book.readPath ? " · Published" : ""}
                </small>
                <div className="fs-row">
                  {message.book.readPath && (
                    <a
                      className="fs-btn fs-primary fs-btn-sm"
                      href={message.book.readPath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen size={14} /> Read book
                    </a>
                  )}
                  <Link
                    className={`fs-btn ${message.book.readPath ? "fs-outline" : "fs-primary"} fs-btn-sm`}
                    href={bookPath(message.book)}
                  >
                    <Pencil size={14} /> Edit book
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="fs-msg fs-msg-agent">
            <span className="fs-msg-avatar">
              <BookOpen size={17} />
            </span>
            <p className="fs-typing">
              <i />
              <i />
              <i />
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="fs-agent-dock">
        {error && (
          <p className="fs-alert" role="alert">
            {error}
          </p>
        )}
        {composer}
      </div>
    </main>
  );
}
