export function captureCoverFrame(video: HTMLVideoElement): Promise<Blob> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    return Promise.reject(new Error("Camera is not ready."));
  }

  const elw = video.clientWidth || vw;
  const elh = video.clientHeight || vh;
  const videoRatio = vw / vh;
  const elRatio = elw / elh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > elRatio) {
    sw = vh * elRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / elRatio;
    sy = (vh - sh) / 2;
  }

  const longSide = Math.max(sw, sh);
  const scale = Math.min(1, 1280 / longSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Could not capture frame."));
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Capture failed."))),
      "image/jpeg",
      0.9,
    );
  });
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
