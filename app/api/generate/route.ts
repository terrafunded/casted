import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { isScenarioId, SCENARIO_PROMPTS } from "@/lib/scenarios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type FalVideo = {
  video?: { url?: string };
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Generation failed.";
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
  const key = process.env.FAL_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server is missing FAL_KEY." },
      { status: 500 },
    );
  }

  fal.config({ credentials: key });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scenarioId = String(form.get("scenario") ?? "");
  const image = form.get("image");

  if (!isScenarioId(scenarioId)) {
    return NextResponse.json({ error: "Invalid scenario." }, { status: 400 });
  }

  if (!(image instanceof Blob) || image.size === 0) {
    return NextResponse.json({ error: "Missing still." }, { status: 400 });
  }

  const prompt = SCENARIO_PROMPTS[scenarioId];

  try {
    const imageUrl = await uploadStill(image);

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
    const videoUrl = data?.video?.url;
    if (!videoUrl) {
      return NextResponse.json(
        { error: "Generation returned no video." },
        { status: 502 },
      );
    }

    return NextResponse.json({ videoUrl });
  } catch (err) {
    const message = errorMessage(err);
    const status =
      message.toLowerCase().includes("unauthor") ||
      message.toLowerCase().includes("forbidden")
        ? 502
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
