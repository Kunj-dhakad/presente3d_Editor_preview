"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import useEditorStore, {
  ContactFormField,
  InteractionData,
  QuizOption,
  QuizQuestionItem,
  isInteractionData,
} from "@editor/store/editorStore";
import EmbedMediaSettings from "./EmbedMediaSettings";
import SlideshowImagePicker from "../components/InteractionDetailView/Slideshow/SlideshowImagePicker";
import { ICON_ONLY_KINDS, NAV_KINDS, SHOP_KINDS } from "../components/constants";
import {
  Block,
  Field,
  Hint,
  IconButton,
  Item,
  Section,
  Segmented,
  Swatch,
  Switch,
  actionButton,
  fullInput,
  input,
  numberInput,
  primaryButton,
} from "@editor/layout/EditBarPanel/SettingsControls";
import { apiFetch } from "@shared/apiFetch";

const genId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const NAV_TITLES: Partial<Record<InteractionData["interactionKind"], string>> = {
  "nav-prev-page": "Prev page",
  "nav-next-page": "Next page",
  "nav-goto-page": "Go to page",
  "nav-first-page": "First page",
  "nav-last-page": "Last page",
};

const SHOP_TITLES: Partial<Record<InteractionData["interactionKind"], string>> = {
  "product-card": "Product card",
  "product-button": "Product button",
  "price-tag": "Price tag",
};

const FIELD_TYPES: { value: ContactFormField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Long" },
];

export default function InteractionSettings() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlide = useEditorStore((s) => s.activeSlide);
  const activeElementId = useEditorStore((s) => s.activeElementId);
  const updateElement = useEditorStore((s) => s.updateElement);
  const element = slides[activeSlide]?.elements.find(
    (item) => item.id === activeElementId,
  );

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!element || !isInteractionData(element.data)) return null;
  const data = element.data as InteractionData;
  if (data.interactionKind === "embed-media") return <EmbedMediaSettings />;
  const patch = (value: Partial<InteractionData>) =>
    updateElement(element.id, value, { history: true });

  const isQuiz = data.interactionKind === "quiz";
  const isQuestion = data.interactionKind === "question";
  const isContactForm = data.interactionKind === "contact-form";
  const isSpotlight = data.interactionKind === "spotlight";
  const isVideoButton = data.interactionKind === "video-button";
  const isAudioButton = data.interactionKind === "audio-button";
  const isSlideshow =
    data.interactionKind === "slideshow" ||
    data.interactionKind === "popup-slideshow";
  const isPopupSlideshow = data.interactionKind === "popup-slideshow";
  const isNavigation = NAV_KINDS.includes(data.interactionKind);
  // Link areas, link buttons, tags, captions and social icons are drawn as a
  // bare icon, so a button label would be a field for words nobody sees.
  const isIconOnly = ICON_ONLY_KINDS.includes(data.interactionKind);
  const isCaption = data.interactionKind === "caption";
  const isGoToPage = data.interactionKind === "nav-goto-page";
  const isShop = SHOP_KINDS.includes(data.interactionKind);
  const isProductCard = data.interactionKind === "product-card";
  const isPriceTag = data.interactionKind === "price-tag";
  const isEngagement =
    isQuiz ||
    isQuestion ||
    isContactForm ||
    isSpotlight ||
    isVideoButton ||
    isAudioButton ||
    isPopupSlideshow;

  const kindTitle = isQuiz
    ? "Quiz"
    : isQuestion
      ? "Question"
      : isContactForm
        ? "Contact form"
        : isSpotlight
          ? "Spotlight"
          : isVideoButton
            ? "Video button"
            : isAudioButton
              ? "Audio button"
              : isPopupSlideshow
                ? "Pop-up slideshow"
                : data.interactionKind === "slideshow"
                  ? "Slideshow"
                  : isNavigation
                    ? (NAV_TITLES[data.interactionKind] ?? "Navigation")
                    : isShop
                      ? (SHOP_TITLES[data.interactionKind] ?? "Shop")
                      : "Interaction";

  /* ==================== QUIZ HELPERS ==================== */

  const setQuestions = (questions: QuizQuestionItem[]) =>
    patch({ quizQuestions: questions });

  const addQuestion = () => {
    const questions = data.quizQuestions ?? [];
    setQuestions([
      ...questions,
      {
        id: genId(),
        question: "New question",
        multiple: false,
        options: [
          { id: genId(), text: "Option A", correct: true },
          { id: genId(), text: "Option B", correct: false },
        ],
      },
    ]);
  };

  const removeQuestion = (qId: string) =>
    setQuestions((data.quizQuestions ?? []).filter((q) => q.id !== qId));

  const updateQuestion = (qId: string, patchQ: Partial<QuizQuestionItem>) =>
    setQuestions(
      (data.quizQuestions ?? []).map((q) =>
        q.id === qId ? { ...q, ...patchQ } : q,
      ),
    );

  const addOption = (qId: string) =>
    updateQuestion(qId, {
      options: [
        ...(data.quizQuestions?.find((q) => q.id === qId)?.options ?? []),
        { id: genId(), text: "New option", correct: false },
      ],
    });

  const removeOption = (qId: string, optId: string) => {
    const q = data.quizQuestions?.find((item) => item.id === qId);
    if (!q) return;
    updateQuestion(qId, { options: q.options.filter((o) => o.id !== optId) });
  };

  const updateOption = (qId: string, optId: string, patchO: Partial<QuizOption>) => {
    const q = data.quizQuestions?.find((item) => item.id === qId);
    if (!q) return;
    updateQuestion(qId, {
      options: q.options.map((o) => {
        if (o.id !== optId) {
          // enforce single-correct when not multiple choice
          return patchO.correct && !q.multiple ? { ...o, correct: false } : o;
        }
        return { ...o, ...patchO };
      }),
    });
  };

  /* ==================== CONTACT FORM HELPERS ==================== */

  const setFields = (fields: ContactFormField[]) => patch({ contactFields: fields });

  const addField = () =>
    setFields([
      ...(data.contactFields ?? []),
      { id: genId(), label: "New field", type: "text", placeholder: "New field", required: false },
    ]);

  const removeField = (fId: string) =>
    setFields((data.contactFields ?? []).filter((f) => f.id !== fId));

  const updateField = (fId: string, patchF: Partial<ContactFormField>) =>
    setFields((data.contactFields ?? []).map((f) => (f.id === fId ? { ...f, ...patchF } : f)));

  /* ==================== SLIDESHOW HELPERS ==================== */

  const addSlideshowImage = (raw: string) => {
    const url = raw.trim();
    if (!url) return false;
    const current = data.slideshowImages ?? [];
    if (current.includes(url)) return false;
    patch({ slideshowImages: [...current, url] });
    return true;
  };

  /* ==================== AI GENERATE ==================== */

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      if (isQuiz) {
        const res = await apiFetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt, mode: "quiz", count: data.quizQuestions?.length || 3 }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Generation failed");
        const questions: QuizQuestionItem[] = json.questions.map((q: { question: string; options: { text: string; correct: boolean }[] }) => ({
          id: genId(),
          question: q.question,
          multiple: false,
          options: q.options.map((o) => ({ id: genId(), text: o.text, correct: !!o.correct })),
        }));
        patch({ quizTitle: json.title, quizQuestions: questions });
      } else if (isQuestion) {
        const res = await apiFetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt, mode: "question" }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Generation failed");
        patch({ questionText: json.question, questionPlaceholder: json.placeholder });
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setAiLoading(false);
    }
  };

  /* ==================== RENDER ==================== */

  return (
    <div className="pb-6">
      {!isVideoButton && !isAudioButton && !isSlideshow && !isIconOnly && (
        <Section title={kindTitle}>
          <Field label="Button label" stacked>
            <input
              className={fullInput}
              value={data.text}
              placeholder="e.g. TAKE QUIZ"
              onChange={(event) => patch({ text: event.target.value })}
            />
          </Field>
        </Section>
      )}

      {/* ===================== CAPTION ===================== */}
      {/* The icon says nothing on its own — the words live in the bubble it
          opens, which is the only text a caption actually shows. */}
      {isCaption && (
        <Section title="Caption">
          <Field label="Caption text" stacked>
            <textarea
              className={fullInput}
              rows={3}
              value={data.expandedText ?? ""}
              placeholder="Add your caption text here."
              onChange={(event) => patch({ expandedText: event.target.value })}
            />
          </Field>
          <Hint>Readers click the icon to open and close this caption.</Hint>
        </Section>
      )}

      {/* ===================== SLIDESHOW ===================== */}
      {isSlideshow && (
        <Section title={`${kindTitle} images (${(data.slideshowImages ?? []).length})`}>
          <Hint>
            {isPopupSlideshow
              ? "Images open in a popup when the reader clicks the button."
              : "Images play as a carousel directly on the page."}
          </Hint>
          {(data.slideshowImages ?? []).length > 0 ? (
            <Block className="grid grid-cols-3 gap-1.5">
              {(data.slideshowImages ?? []).map((src, index) => (
                <div key={`${src}-${index}`} className="kd-set-thumb">
                  <img src={src} alt="" />
                  <span className="kd-set-thumb-index">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        slideshowImages: (data.slideshowImages ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    className="kd-set-thumb-remove"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </Block>
          ) : (
            <Block>
              <p className="kd-set-empty">No images yet — add one below.</p>
            </Block>
          )}
          {/* Plain flow content — this settings column is already the scroll
              container, so the picker must not bring one of its own. */}
          <Field label="Add images" stacked>
            <SlideshowImagePicker
              selected={data.slideshowImages ?? []}
              onPick={addSlideshowImage}
            />
          </Field>
          <Field label="Auto-play (ms)">
            <input
              type="number"
              min={1500}
              step={500}
              className={numberInput}
              value={data.slideshowInterval ?? 3000}
              onChange={(event) =>
                patch({
                  slideshowInterval: Math.max(
                    1500,
                    Number(event.target.value) || 3000,
                  ),
                })
              }
            />
          </Field>
        </Section>
      )}

      {/* ===================== AI GENERATE (quiz / question) ===================== */}
      {(isQuiz || isQuestion) && (
        <Section title="Generate with AI">
          <Hint>Write it yourself below, or describe it here and let AI draft it.</Hint>
          <Block className="space-y-2">
            <textarea
              className={fullInput}
              rows={2}
              placeholder={isQuiz ? "e.g. KPIs for a business team" : "e.g. Ask about our overtime policy"}
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
            />
            <button
              type="button"
              disabled={!aiPrompt.trim() || aiLoading}
              onClick={handleGenerateWithAi}
              className={`${primaryButton} w-full`}
            >
              {aiLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate with AI
                </>
              )}
            </button>
            {aiError && <p className="kd-set-error">{aiError}</p>}
          </Block>
        </Section>
      )}

      {/* ===================== QUIZ QUESTIONS ===================== */}
      {isQuiz && (
        <Section title="Questions">
          <Field label="Quiz title" stacked>
            <input
              className={fullInput}
              value={data.quizTitle ?? ""}
              onChange={(event) => patch({ quizTitle: event.target.value })}
            />
          </Field>
          <Block className="space-y-2">
            {(data.quizQuestions ?? []).map((q, qIndex) => (
              <Item
                key={q.id}
                title={`Question ${qIndex + 1}`}
                removeTitle="Remove question"
                onRemove={() => removeQuestion(q.id)}
              >
                <input
                  className={`${fullInput} mb-2`}
                  value={q.question}
                  onChange={(event) => updateQuestion(q.id, { question: event.target.value })}
                />

                <div className="kd-set-inline-toggle">
                  <span>Allow multiple answers</span>
                  <Switch
                    on={!!q.multiple}
                    onChange={(next) => updateQuestion(q.id, { multiple: next })}
                  />
                </div>

                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-1.5">
                      <input
                        type={q.multiple ? "checkbox" : "radio"}
                        name={`correct-${q.id}`}
                        title="Mark as a correct answer"
                        className="kd-set-mark"
                        checked={!!opt.correct}
                        onChange={(event) => updateOption(q.id, opt.id, { correct: event.target.checked })}
                      />
                      <input
                        className={`${input} min-w-0 flex-1`}
                        value={opt.text}
                        onChange={(event) => updateOption(q.id, opt.id, { text: event.target.value })}
                      />
                      <IconButton
                        title="Remove option"
                        onClick={() => removeOption(q.id, opt.id)}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  className={`${actionButton} mt-1.5 w-full`}
                >
                  <Plus size={12} /> Add option
                </button>
              </Item>
            ))}
            <button
              type="button"
              onClick={addQuestion}
              className={`${primaryButton} w-full`}
            >
              <Plus size={14} /> Add question
            </button>
          </Block>
        </Section>
      )}

      {/* ===================== SINGLE QUESTION ===================== */}
      {isQuestion && (
        <Section title="Question">
          <Field label="Question text" stacked>
            <textarea
              className={fullInput}
              rows={2}
              value={data.questionText ?? ""}
              onChange={(event) => patch({ questionText: event.target.value })}
            />
          </Field>
          <Field label="Answer placeholder" stacked>
            <input
              className={fullInput}
              value={data.questionPlaceholder ?? ""}
              onChange={(event) => patch({ questionPlaceholder: event.target.value })}
            />
          </Field>
        </Section>
      )}

      {/* ===================== SPOTLIGHT ===================== */}
      {isSpotlight && (
        <Section title="Spotlight">
          <Field label="Title" stacked>
            <input
              className={fullInput}
              value={data.spotlightTitle ?? ""}
              placeholder="Featured spotlight"
              onChange={(event) => patch({ spotlightTitle: event.target.value })}
            />
          </Field>
          <Field label="Content" stacked>
            <textarea
              className={fullInput}
              rows={4}
              value={data.spotlightContent ?? ""}
              placeholder="Add the content shown in the spotlight popup"
              onChange={(event) => patch({ spotlightContent: event.target.value })}
            />
          </Field>
          <Field label="Image URL (optional)" stacked>
            <input
              className={fullInput}
              value={data.spotlightImageUrl ?? ""}
              placeholder="https://example.com/image.jpg"
              onChange={(event) => patch({ spotlightImageUrl: event.target.value })}
            />
          </Field>
        </Section>
      )}

      {/* ===================== MEDIA BUTTONS ===================== */}
      {isVideoButton && (
        <Section title="Video button">
          <Field label="Video URL" stacked>
            <input
              type="url"
              className={fullInput}
              value={data.videoUrl ?? ""}
              placeholder="YouTube, Vimeo, or direct video URL"
              onChange={(event) => patch({ videoUrl: event.target.value })}
            />
          </Field>
          <Hint>The video opens in a popup when the reader clicks this button.</Hint>
        </Section>
      )}

      {isAudioButton && (
        <Section title="Audio button">
          <Field label="Audio URL" stacked>
            <input
              type="url"
              className={fullInput}
              value={data.audioUrl ?? ""}
              placeholder="https://example.com/audio.mp3"
              onChange={(event) => patch({ audioUrl: event.target.value })}
            />
          </Field>
          <Hint>
            Clicking the button plays audio in place; its label changes to Pause audio.
          </Hint>
        </Section>
      )}

      {/* ===================== CONTACT FORM ===================== */}
      {isContactForm && (
        <>
          <Section title="Form">
            <Field label="Form title" stacked>
              <input
                className={fullInput}
                value={data.contactFormTitle ?? ""}
                onChange={(event) => patch({ contactFormTitle: event.target.value })}
              />
            </Field>
            <Field label="Description" stacked>
              <textarea
                className={fullInput}
                rows={3}
                value={data.contactFormDescription ?? ""}
                onChange={(event) => patch({ contactFormDescription: event.target.value })}
              />
            </Field>
          </Section>

          <Section title="Fields">
            <Block className="space-y-2">
              {(data.contactFields ?? []).map((field) => (
                <Item key={field.id}>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <input
                      className={`${input} min-w-0 flex-1`}
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, {
                          label: event.target.value,
                          placeholder: event.target.value,
                        })
                      }
                    />
                    <IconButton
                      title="Remove field"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Segmented
                      options={FIELD_TYPES}
                      active={field.type}
                      onChange={(next) => updateField(field.id, { type: next })}
                    />
                    <div className="kd-set-inline-toggle kd-set-inline-toggle-flush">
                      <span>Required</span>
                      <Switch
                        on={!!field.required}
                        onChange={(next) => updateField(field.id, { required: next })}
                      />
                    </div>
                  </div>
                </Item>
              ))}
              <button
                type="button"
                onClick={addField}
                className={`${primaryButton} w-full`}
              >
                <Plus size={14} /> Add field
              </button>
            </Block>
          </Section>

          <Section title="Consent">
            <Field label="Privacy text" stacked>
              <input
                className={fullInput}
                value={data.privacyPolicyText ?? ""}
                onChange={(event) => patch({ privacyPolicyText: event.target.value })}
              />
            </Field>
            <Field label="Privacy link" stacked>
              <input
                className={fullInput}
                value={data.privacyPolicyLink ?? ""}
                placeholder="https://example.com/privacy"
                onChange={(event) => patch({ privacyPolicyLink: event.target.value })}
              />
            </Field>
            <Field label="Marketing opt-in">
              <Switch
                on={!!data.showMarketingOptIn}
                onChange={(next) => patch({ showMarketingOptIn: next })}
              />
            </Field>
            {data.showMarketingOptIn && (
              <Field label="Opt-in text" stacked>
                <input
                  className={fullInput}
                  value={data.marketingOptInText ?? ""}
                  onChange={(event) => patch({ marketingOptInText: event.target.value })}
                />
              </Field>
            )}
          </Section>
        </>
      )}

      {/* ===================== NAVIGATION ===================== */}
      {isNavigation && (
        <Section title={kindTitle}>
          {isGoToPage ? (
            <>
              <Field label="Target page">
                <input
                  type="number"
                  min={1}
                  className={numberInput}
                  value={data.navTargetPage ?? 1}
                  onChange={(event) =>
                    patch({
                      navTargetPage: Math.max(1, Number(event.target.value) || 1),
                    })
                  }
                />
              </Field>
              <Hint>
                Clicking this button jumps the reader straight to this page number in
                preview.
              </Hint>
            </>
          ) : (
            <Hint>
              This button automatically navigates the reader (
              {NAV_TITLES[data.interactionKind]?.toLowerCase()}) — no link needed. It
              only works while previewing the book.
            </Hint>
          )}
        </Section>
      )}

      {/* ===================== SHOP (product card / button / price tag) ===================== */}
      {isShop && (
        <Section title="Product">
          {!isPriceTag && (
            <Field label="Name" stacked>
              <input
                className={fullInput}
                value={data.productName ?? ""}
                placeholder="e.g. Ceramic pour-over kit"
                onChange={(event) => patch({ productName: event.target.value })}
              />
            </Field>
          )}
          <Field label="Price">
            <input
              className={input}
              value={data.productPrice ?? ""}
              placeholder="$19.99"
              onChange={(event) => patch({ productPrice: event.target.value })}
            />
          </Field>
          {isProductCard && (
            <Field label="Image URL (optional)" stacked>
              <input
                className={fullInput}
                value={data.productImageUrl ?? ""}
                placeholder="https://example.com/product.jpg"
                onChange={(event) => patch({ productImageUrl: event.target.value })}
              />
            </Field>
          )}
        </Section>
      )}

      {/* ===================== RESPONSE DELIVERY (temporarily hidden) =====================
      {(isQuiz || isQuestion || isContactForm) && (
        <Section title="Responses">
          <Field label="Webhook URL (optional)" stacked>
            <input
              type="url"
              className={fullInput}
              value={data.submitUrl ?? ""}
              placeholder="https://your-server.com/responses"
              onChange={(event) => patch({ submitUrl: event.target.value })}
            />
          </Field>
          <Hint>
            Readers' answers are POSTed here as JSON. Leave it empty and the popup
            just confirms on screen without storing anything.
          </Hint>
        </Section>
      )}
      */}

      {/* ===================== NON-ENGAGEMENT (link / tag / social / caption / shop) ===================== */}
      {!isEngagement && !isSlideshow && !isNavigation && (
        <Section title="Link">
          <Field label={isShop ? "Product link" : "URL"} stacked>
            <input
              className={fullInput}
              value={data.url ?? data.link ?? ""}
              placeholder="https://example.com"
              onChange={(event) =>
                patch({ url: event.target.value, link: event.target.value })
              }
            />
          </Field>
          <Field label="Opens in">
            <Segmented
              options={[
                { value: "_self", label: "This tab" },
                { value: "_blank", label: "New tab" },
                { value: "popup", label: "Popup" },
              ]}
              active={(data.target ?? "_blank") as "_self" | "_blank" | "popup"}
              onChange={(next) =>
                patch({ target: next as InteractionData["target"] })
              }
            />
          </Field>
        </Section>
      )}

      <Section title="Colors">
        <Field label={isEngagement ? "Text color" : "Icon color"}>
          <Swatch
            color={data.iconColor ?? data.textColor ?? "#ffffff"}
            onChange={(next) => patch({ iconColor: next, textColor: next })}
          />
        </Field>
        <Field label="Background color">
          <Swatch
            color={data.backgroundColor ?? "#4f46e5"}
            onChange={(next) => patch({ backgroundColor: next })}
          />
        </Field>
      </Section>
    </div>
  );
}
