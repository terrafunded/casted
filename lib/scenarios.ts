export const SCENARIO_IDS = ["chase", "confession", "ending"] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export function isScenarioId(value: string): value is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(value);
}

export const CHAPTER_META: Record<
  ScenarioId,
  { roman: "I" | "II" | "III" }
> = {
  chase: { roman: "I" },
  confession: { roman: "II" },
  ending: { roman: "III" },
};

const STOCK =
  "The same motion picture throughout: photochemical 35mm, crushed blacks, warm print stock, anamorphic, no dialogue. Five-second scene from one film. Do not imitate any franchise, brand, or celebrity. Close on a brief title card that reads A CASTED PICTURE.";

/**
 * Full cinematic prompts stay on the server. Users only see chapter titles.
 */
export const SCENARIO_PROMPTS: Record<ScenarioId, string> = {
  chase: `${STOCK} Night rooftop chase in driving rain. A helicopter spotlight sweeps wet concrete and metal railings. The person looks straight into camera, then turns and sprints along the rooftop edge. Handheld urgency, rain streaks, searchlight flare.`,
  confession: `${STOCK} Wet city street at night. Neon smears across rain-slick asphalt. Thin smoke. Slow push-in on the person's face. Hard key, deep shadows, sharp rim light, near black-and-white with a thread of neon. Stillness and tension.`,
  ending: `${STOCK} The person stands on a high cliff above a sea of clouds at golden hour. Wind in hair and clothing. Ancient stone ruins behind them. The camera orbits once. Warm low sun, vast sky, the last shot of the picture.`,
};
