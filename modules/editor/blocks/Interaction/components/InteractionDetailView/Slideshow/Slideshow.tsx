"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import useEditorStore from "@editor/store/editorStore";
import SlideshowImagePicker, {
  SlideshowPickerTabs,
  type PickerTab,
} from "./SlideshowImagePicker";
import { useAddInteraction } from "../../useAddInteraction";

export default function Slideshow({ onBack, popup }: { onBack: () => void; popup: boolean }) {
  const [images, setImages] = useState<string[]>([]);
  const [tab, setTab] = useState<PickerTab>("upload");
  const { addInteraction } = useAddInteraction();

  const addImage = (src: string) =>
    setImages((current) => (current.includes(src) ? current : [...current, src]));

  const removeImage = (src: string) =>
    setImages((current) => current.filter((item) => item !== src));

  const create = () => {
    if (!images.length) return;
    addInteraction(popup ? "popup-slideshow" : "slideshow");
    const store = useEditorStore.getState();
    const element = store.slides[store.activeSlide]?.elements.at(-1);
    if (element)
      store.updateElement(
        element.id,
        { slideshowImages: images, slideshowInterval: 3000 },
        { history: true },
      );
    onBack();
  };

  return (
    <div className="kd-element-panel">
      <div className="kd-panel-header">
        <button type="button" onClick={onBack} aria-label="Back" className="kd-icon-btn">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="kd-panel-header-title">
            {popup ? "Pop-up slideshow" : "Slideshow"}
          </h2>
          <p className="kd-panel-subtext">
            {popup ? "The slider opens in a popup." : "The slider plays on the page."}
          </p>
        </div>
      </div>
      <div className="kd-panel-divider" />

      {/* Outside the scroller on purpose, so the tabs never move. */}
      <div className="kd-pick-tabbar">
        <SlideshowPickerTabs tab={tab} onChange={setTab} />
      </div>

      {/* The only scroll container in this panel. */}
      <div className="kd-panel-body kd-custom-scrollbar">
        <SlideshowImagePicker
          selected={images}
          onPick={addImage}
          tab={tab}
          onTabChange={setTab}
        />
      </div>

      <div className="kd-slideshow-tray">
        {images.length === 0 ? (
          <p className="kd-pick-note">Pick one or more images to build the slider.</p>
        ) : (
          <>
            <div className="kd-slideshow-tray-head">
              <span>
                {images.length} image{images.length > 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={() => setImages([])}
                className="kd-slideshow-tray-clear"
              >
                Clear
              </button>
            </div>

            <div className="kd-slideshow-tray-strip kd-custom-scrollbar">
              {images.map((src, index) => (
                <div key={src} className="kd-set-thumb kd-slideshow-tray-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                  <span className="kd-set-thumb-index">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(src)}
                    className="kd-set-thumb-remove"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={create}
          disabled={!images.length}
          className="kd-set-action kd-set-action-primary w-full"
        >
          Add {popup ? "pop-up slideshow" : "slideshow"}
        </button>
      </div>
    </div>
  );
}
