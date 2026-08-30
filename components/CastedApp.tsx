"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { captureCoverFrame, stopStream } from "@/lib/capture";
import { copy, localeFromNavigator, type Locale } from "@/lib/i18n";
import { SCENARIO_IDS, type ScenarioId } from "@/lib/scenarios";

type Step = "age" | "consent" | "studio" | "generating" | "result";

function subscribeLanguage(onStoreChange: () => void) {
  window.addEventListener("languagechange", onStoreChange);
  return () => window.removeEventListener("languagechange", onStoreChange);
}

function subscribeShare() {
  return () => undefined;
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
  const [scenario, setScenario] = useState<ScenarioId>("action");
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
      setGenError(t.errorGeneric);
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
      const data = (await res.json()) as { videoUrl?: string; error?: string };
      if (!res.ok || !data.videoUrl) {
        setGenError(data.error || t.errorGeneric);
        setStep("studio");
        return;
      }
      setVideoUrl(data.videoUrl);
      setStep("result");
    } catch {
      setGenError(t.errorServer);
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
      a.download = "casted-trailer.mp4";
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
      const file = new File([blob], "casted-trailer.mp4", { type: "video/mp4" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Casted",
          text: t.aiGenerated,
        });
        return;
      }
      await navigator.share({ title: "Casted", text: t.aiGenerated, url: videoUrl });
    } catch {
      /* user cancelled or share failed */
    }
  }

  function resetStudio() {
    setVideoUrl(null);
    setGenError(null);
    setStep("studio");
  }

  function toggleLocale() {
    const next: Locale = locale === "en" ? "es" : "en";
    setOverrideLocale(next);
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="grain" aria-hidden />
      <div className="vignette" aria-hidden />

      <header className="relative z-10 mb-8 flex items-baseline justify-between">
        <p className="font-display text-3xl tracking-tight">{t.brand}</p>
        <button
          type="button"
          className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase"
          onClick={toggleLocale}
          aria-label={t.langAria}
        >
          {t.langToggle}
        </button>
      </header>

      {step === "age" && (
        <main className="relative z-10 flex flex-1 flex-col justify-end gap-10">
          <div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight">
              {t.tagline}
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)]">{t.ageLead}</p>
          </div>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--ink)] py-4 text-base font-medium text-black"
            onClick={() => setStep("consent")}
          >
            {t.ageButton}
          </button>
        </main>
      )}

      {step === "consent" && (
        <main className="relative z-10 flex flex-1 flex-col justify-end gap-10">
          <p className="text-lg text-[var(--muted)]">{t.consentLead}</p>
          <label className="flex cursor-pointer items-start gap-3 text-base leading-snug">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--gold)]"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
            />
            <span>{t.consentLabel}</span>
          </label>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--ink)] py-4 text-base font-medium text-black"
            disabled={!consented}
            onClick={() => consented && setStep("studio")}
          >
            {t.continue}
          </button>
        </main>
      )}

      {step === "studio" && (
        <main className="relative z-10 flex flex-1 flex-col gap-5">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-black ring-1 ring-[var(--line)]">
            <video
              ref={onVideoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
              style={{ transform: "scaleX(-1)" }}
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center bg-black/80 p-6">
                <p className="text-base leading-relaxed">{cameraError}</p>
              </div>
            )}
          </div>

          {genError && (
            <p className="text-sm text-red-300" role="alert">
              {genError}
            </p>
          )}

          <p className="text-xs tracking-[0.25em] text-[var(--muted)] uppercase">
            {t.pick}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SCENARIO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setScenario(id)}
                className={`rounded-full py-3 text-sm ${
                  scenario === id
                    ? "bg-[var(--gold)] text-black"
                    : "ring-1 ring-[var(--line)] text-[var(--ink)]"
                }`}
              >
                {t[id]}
              </button>
            ))}
          </div>

          {cameraError ? (
            <button
              type="button"
              className="w-full rounded-full bg-[var(--ink)] py-4 text-base font-medium text-black"
              onClick={() => void startCamera()}
            >
              {t.retryCamera}
            </button>
          ) : (
            <button
              type="button"
              className="w-full rounded-full bg-[var(--ink)] py-4 text-base font-medium text-black"
              disabled={!consented || busy || !cameraReady}
              onClick={() => void onCapture()}
            >
              {t.capture}
            </button>
          )}
        </main>
      )}

      {step === "generating" && (
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <p className="font-display text-4xl leading-tight">{t.generating}</p>
          <div className="progress-bar h-px w-40 bg-[var(--gold)]" />
          <p className="text-sm text-[var(--muted)]">{t.generatingHint}</p>
        </main>
      )}

      {step === "result" && videoUrl && (
        <main className="relative z-10 flex flex-1 flex-col gap-5">
          <div className="relative overflow-hidden rounded-sm bg-black ring-1 ring-[var(--line)]">
            <video
              className="w-full"
              src={videoUrl}
              controls
              playsInline
              autoPlay
              loop
            />
          </div>
          <p className="text-xs tracking-[0.25em] text-[var(--gold)] uppercase">
            {t.aiGenerated}
          </p>
          <div className={canShare ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
            <button
              type="button"
              className="rounded-full bg-[var(--ink)] py-4 text-sm font-medium text-black"
              onClick={() => void onDownload()}
            >
              {t.download}
            </button>
            {canShare && (
              <button
                type="button"
                className="rounded-full py-4 text-sm ring-1 ring-[var(--line)]"
                onClick={() => void onShare()}
              >
                {t.share}
              </button>
            )}
          </div>
          <button
            type="button"
            className="w-full py-3 text-sm text-[var(--muted)]"
            onClick={resetStudio}
          >
            {t.again}
          </button>
        </main>
      )}
    </div>
  );
}
