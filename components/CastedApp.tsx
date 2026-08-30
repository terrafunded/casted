"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { captureCoverFrame, stopStream } from "@/lib/capture";
import { errorFromHttpBody } from "@/lib/errors";
import { copy, localeFromNavigator, type Locale } from "@/lib/i18n";
import { CHAPTER_META, SCENARIO_IDS, type ScenarioId } from "@/lib/scenarios";

type Step = "age" | "consent" | "studio" | "generating" | "result";

function subscribeLanguage(onStoreChange: () => void) {
  window.addEventListener("languagechange", onStoreChange);
  return () => window.removeEventListener("languagechange", onStoreChange);
}

function subscribeShare() {
  return () => undefined;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function Timecode() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frames = 0;
    const id = window.setInterval(() => {
      frames += 1;
      const f = frames % 24;
      const total = Math.floor(frames / 24);
      const s = total % 60;
      const m = Math.floor(total / 60) % 60;
      const h = Math.floor(total / 3600);
      if (ref.current) {
        ref.current.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
      }
    }, 1000 / 24);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span ref={ref} className="tc">
      00:00:00:00
    </span>
  );
}

function FrameTicks() {
  return (
    <div className="ticks" aria-hidden>
      <span className="tl" />
      <span className="tr" />
      <span className="bl" />
      <span className="br" />
    </div>
  );
}

export default function CastedApp() {
  const browserLocale = useSyncExternalStore(
    subscribeLanguage,
    localeFromNavigator,
    (): Locale => "en",
  );
  const [overrideLocale, setOverrideLocale] = useState<Locale | null>(null);
  const locale = overrideLocale ?? browserLocale;
  const t = copy[locale];

  const canShare = useSyncExternalStore(
    subscribeShare,
    () => typeof navigator.share === "function",
    () => false,
  );

  const [step, setStep] = useState<Step>("age");
  const [consented, setConsented] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>("chase");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    releaseCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.cameraMissing);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const node = videoRef.current;
      if (node) {
        node.srcObject = stream;
        await node.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError") {
        setCameraError(t.cameraMissing);
      } else {
        setCameraError(t.cameraDenied);
      }
    }
  }, [releaseCamera, t.cameraDenied, t.cameraMissing]);

  const onVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node) {
        void startCamera();
      } else {
        releaseCamera();
      }
    },
    [startCamera, releaseCamera],
  );

  async function onCapture() {
    if (!consented || busy) return;
    const video = videoRef.current;
    if (!video) return;

    setBusy(true);
    setGenError(null);

    let still: Blob;
    try {
      still = await captureCoverFrame(video);
    } catch {
      setBusy(false);
      setGenError(t.errors.lab_failed);
      return;
    }

    releaseCamera();
    setStep("generating");

    const body = new FormData();
    body.set("scenario", scenario);
    body.set("image", still, "still.jpg");
    still = new Blob();

    try {
      const res = await fetch("/api/generate", { method: "POST", body });
      const text = await res.text();
      let parsed: { videoUrl?: string; error?: string; status?: number } = {};
      try {
        parsed = JSON.parse(text) as {
          videoUrl?: string;
          error?: string;
          status?: number;
        };
      } catch {
        parsed = {};
      }

      if (!res.ok || !parsed.videoUrl) {
        const message = errorFromHttpBody(parsed.status ?? res.status, text);
        setGenError(message);
        setStep("studio");
        return;
      }
      setVideoUrl(parsed.videoUrl);
      setStep("result");
    } catch {
      setGenError(t.errors.lab_failed);
      setStep("studio");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    if (!videoUrl) return;
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "a-casted-picture.mp4";
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function onShare() {
    if (!videoUrl || !navigator.share) return;
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const file = new File([blob], "a-casted-picture.mp4", { type: "video/mp4" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "A CASTED PICTURE",
          text: t.endCard,
        });
        return;
      }
      await navigator.share({ title: "A CASTED PICTURE", text: t.endCard, url: videoUrl });
    } catch {
      /* cancelled */
    }
  }

  function resetStudio() {
    setVideoUrl(null);
    setGenError(null);
    setStep("studio");
  }

  function toggleLocale() {
    setOverrideLocale(locale === "en" ? "es" : "en");
  }

  const shooting = step === "studio" && cameraReady && !cameraError;

  return (
    <div className="house">
      <div className="poster">
        <div className="grain" aria-hidden />
        <div className="grain-move" aria-hidden />
        <div className="vignette" aria-hidden />

        <div className="poster-inner">
          <header className="bar">
            <p className="wordmark">Casted</p>
            <div className="bar">
              {shooting && (
                <p className="rec gothic" aria-live="polite">
                  <span className="rec-dot" />
                  Rec
                  <Timecode />
                </p>
              )}
              <button type="button" className="lang gothic" onClick={toggleLocale} aria-label={t.langAria}>
                {locale === "en" ? "ES" : "EN"}
              </button>
            </div>
          </header>

          {step === "age" && (
            <main className="title-card">
              <p className="gothic" style={{ fontSize: "0.62rem", color: "var(--gold)", marginBottom: "1.4rem" }}>
                {t.picture}
              </p>
              <h1 className="title-line">{t.ageLine}</h1>
              <p className="title-sub">{t.ageSub}</p>
              <button type="button" className="ticket gothic" onClick={() => setStep("consent")}>
                {t.ageButton}
              </button>
            </main>
          )}

          {step === "consent" && (
            <main className="title-card" style={{ justifyContent: "center" }}>
              <div className="release">
                <p className="release-eye gothic">{t.releaseEyebrow}</p>
                <h2>{t.releaseTitle}</h2>
                <p>{t.releaseBody}</p>
                <label className="release-sign">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                  />
                  <span>{t.releaseSign}</span>
                </label>
                <button
                  type="button"
                  className="release-enter gothic"
                  disabled={!consented}
                  onClick={() => consented && setStep("studio")}
                >
                  {t.releaseEnter}
                </button>
              </div>
            </main>
          )}

          {step === "studio" && (
            <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className={`stage is-${scenario}`}>
                <video
                  ref={onVideoRef}
                  className="mirror"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="grade" />
                <FrameTicks />
                <div className="letterbox-fade" />
                {cameraError && (
                  <div className="veil">
                    <div>
                      <p>{cameraError}</p>
                      <button type="button" onClick={() => void startCamera()}>
                        {t.retryCamera}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {genError && (
                <p className="err" role="alert">
                  {genError}
                </p>
              )}

              <div className="deck" role="group" aria-label={t.pick}>
                {SCENARIO_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`lobby ${scenario === id ? "is-on" : ""}`}
                    onClick={() => setScenario(id)}
                  >
                    <span className="lobby-num gothic">{CHAPTER_META[id].roman}</span>
                    <span className="lobby-title">{t[id]}</span>
                  </button>
                ))}
              </div>

              <div className="shutter-row">
                <button
                  type="button"
                  className="shutter"
                  disabled={!consented || busy || !cameraReady || Boolean(cameraError)}
                  onClick={() => void onCapture()}
                  aria-label={t.capture}
                >
                  <span className="shutter-ring" />
                  <span className="shutter-core" />
                </button>
              </div>
            </main>
          )}

          {step === "generating" && (
            <main className="lab">
              <p className="gothic" style={{ fontSize: "0.62rem", color: "var(--gold)" }}>
                Reel 01
              </p>
              <h1>{t.developing}</h1>
              <div className="lab-rule" />
              <p>{t.generatingHint}</p>
            </main>
          )}

          {step === "result" && videoUrl && (
            <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="stage">
                <video src={videoUrl} controls playsInline autoPlay loop />
                <FrameTicks />
                <div className="stamps">
                  <p className="stamp-end">{t.endCard}</p>
                  <p className="stamp-ai gothic">{t.aiGenerated}</p>
                </div>
              </div>
              <div className="drop">
                {canShare && (
                  <button type="button" className="drop-main gothic" onClick={() => void onShare()}>
                    {t.share}
                  </button>
                )}
                <button
                  type="button"
                  className={canShare ? "drop-ghost gothic" : "drop-main gothic"}
                  onClick={() => void onDownload()}
                >
                  {t.download}
                </button>
                <button type="button" className="again gothic" onClick={resetStudio}>
                  {t.again}
                </button>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
