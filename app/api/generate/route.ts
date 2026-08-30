import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { classifyLabError, type LabError } from "@/lib/errors";
import { isScenarioId, SCENARIO_PROMPTS } from "@/lib/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type FalVideo = {
  video?: { url?: string };
};

function fail(code: LabError, status: number) {
  return NextResponse.json({ error: code }, { status });
}

async function uploadStill(image: Blob): Promise<string> {
  const file = new File([image], "still.jpg", { type: image.type || "image/jpeg" });
  try {
    return await fal.storage.upload(file);
  } catch {
    const buffer = Buffer.from(await image.arrayBuffer());
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("lab_failed", 400);
  }

  const scenarioId = String(form.get("scenario") ?? "");
  const image = form.get("image");

  if (!isScenarioId(scenarioId)) {
    return fail("lab_failed", 400);
  }

  if (!(image instanceof Blob) || image.size === 0) {
    return fail("lab_failed", 400);
  }

  const key = process.env.FAL_KEY;
  if (!key) {
    return fail("lab_missing_key", 500);
  }

  fal.config({ credentials: key });

  try {
    const imageUrl = await uploadStill(image);

    const result = await fal.subscribe("minimax/h3-max/image-to-video", {
      input: {
        prompt: SCENARIO_PROMPTS[scenarioId],
        image_url: imageUrl,
        duration: 5,
        resolution: "480P",
        enable_safety_checker: true,
        prompt_expansion_mode: "balanced",
      },
    });

    const data = result.data as FalVideo;
    const videoUrl = data?.video?.url;
    if (!videoUrl) {
      return fail("lab_no_print", 502);
    }

    return NextResponse.json({ videoUrl });
  } catch (err) {
    const code = classifyLabError(err);
    return fail(code, code === "lab_timeout" ? 504 : 502);
  }
}
