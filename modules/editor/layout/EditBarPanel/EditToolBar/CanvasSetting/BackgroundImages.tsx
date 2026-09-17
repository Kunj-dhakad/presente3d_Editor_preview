import React, {  useEffect, useState } from "react";
import { fetchLibrary } from "@editor/lib/data/libraryCache";

interface BackgroundPickerProps {
    handleBackgroundSelect: (background: string) => void;
}
interface BgImagesItem {
    id: number;
    url: string;
}

const BackgroundImages: React.FC<BackgroundPickerProps> = ({ handleBackgroundSelect }) => {

    const [BgImages, setBgImages] = useState<BgImagesItem[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        (async () => {
            try {
                // Cached: ye list poore session me ek hi baar aati hai.
                const data = await fetchLibrary<unknown>("/api/bgImages");

                if (Array.isArray(data)) {
                    setBgImages(data);
                } else {
                    console.error("Invalid API response:", data);
                    setBgImages([]);
                }

            } catch (err) {
                console.error("Fetch failed:", err);
                setBgImages([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);



    return (
        <div className="flex flex-col h-full w-full px-2 ">
            <p className="kd-text-primary text-xs mb-2 px-2">Custom Image</p>
                {loading && (
                    <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-full h-16 rounded-lg overflow-hidden border border-transparent kd-text-primary transition-all hover:scale-105">
                                <div className="w-full h-full flex items-center justify-center animate-pulse">
                                    <div className="w-96 h-16 rounded kd-bg-hover"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            
            <div className="grid grid-cols-2 gap-2 mb-3  h-full overflow-y-auto kd-custom-scrollbar px-2">
                {!loading &&
                    BgImages.map((el, idx) => (
                       <button
                        key={idx}
                        onClick={() =>
                            handleBackgroundSelect(`url(${el.url}) center/cover no-repeat`)
                        }
                        className="w-full min-h-14 rounded-lg overflow-hidden kd-border-secondary kd-text-primary transition-all hover:scale-105"
                    >
                        <div
                            style={{
                                backgroundImage: `url(${el.url})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                width: "100%",
                                height: "100%",
                            }}
                        ></div>
                    </button>
                    ))}
            </div>
        </div>
    )
}
export default BackgroundImages;