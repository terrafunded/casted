import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import {
  clientHttpStatus,
  formatGenerateError,
  inspectFalError,
  isAuthFailure,
} from "@/lib/errors";
import { isScenarioId, SCENARIO_PROMPTS } from "@/lib/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type FalVideo = {
  video?: { url?: string };
};

function fail(falStatus: number, reason: string) {
  const payload = formatGenerateError(falStatus, reason);
  return NextResponse.json(payload, { status: clientHttpStatus(falStatus) });
}

function toDataUri(image: Blob): Promise<string> {
  return image.arrayBuffer().then((buf) => {
    const bytes = Buffer.from(buf);
    const mime = image.type || "image/jpeg";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  });
}

async function uploadStillPlain(image: Blob): Promise<string | null> {
  try {
    const file = new File([image], "still.jpg", {
      type: image.type || "image/jpeg",
    });
    const url = await fal.storage.upload(file);
    if (typeof url === "string" && url.length > 0) return url;
    return null;
  } catch {
    return null;
  }
}

async function runModel(imageUrl: string, prompt: string) {
  const result = await fal.subscribe("minimax/h3-max/image-to-video", {
    input: {
      prompt,
      image_url: imageUrl,
      duration: 5,
      resolution: "480P",
      enable_safety_checker: true,
      prompt_expansion_mode: "balanced",
    },
  });
  const data = result.data as FalVideo;
  return data?.video?.url ?? null;
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "invalid request body");
  }

  const scenarioId = String(form.get("scenario") ?? "");
  const image = form.get("image");

  if (!isScenarioId(scenarioId)) {
    return fail(400, "unknown chapter");
  }

  if (!(image instanceof Blob) || image.size === 0) {
    return fail(400, "missing still");
  }

  const key = process.env.FAL_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Missing FAL_KEY on the server.", status: 500 },
      { status: 500 },
    );
  }

  fal.config({ credentials: key });

  const prompt = SCENARIO_PROMPTS[scenarioId];
  let dataUri: string;
  try {
    dataUri = await toDataUri(image);
  } catch {
    return fail(400, "could not read the still");
  }

  const storedUrl = await uploadStillPlain(image);

  try {
    if (storedUrl) {
      try {
        const videoUrl = await runModel(storedUrl, prompt);
        if (videoUrl) return NextResponse.json({ videoUrl });
        return fail(502, "generation returned no video");
      } catch (err) {
        if (!isAuthFailure(err)) {
          const { status, reason } = inspectFalError(err);
          return fail(status, reason);
        }
        // Storage URL was refused (often 403). Retry with an inline JPEG.
      }
    }

    const videoUrl = await runModel(dataUri, prompt);
    if (!videoUrl) return fail(502, "generation returned no video");
    return NextResponse.json({ videoUrl });
  } catch (err) {
    const { status, reason } = inspectFalError(err);
    return fail(status, reason);
  }
}
