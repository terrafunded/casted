export const SCENARIO_IDS = ["action", "noir", "myth"] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export function isScenarioId(value: string): value is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(value);
}

/**
 * Full cinematic prompts stay on the server. Users only see short labels.
 * No franchises, celebrities, or other copyrighted IP.
 */
export const SCENARIO_PROMPTS: Record<ScenarioId, string> = {
  action:
    "Cinematic movie trailer, five seconds, no dialogue. Night rooftop chase in driving rain. A helicopter spotlight sweeps wet concrete and metal railings. The person looks straight into camera, then turns and sprints along the rooftop edge. Handheld urgency, trailer energy, hard cuts of motion, rain streaks, lens flare from the searchlight.",
  noir: "Cinematic movie trailer, five seconds, no dialogue. Wet city street at night. Neon signs smear across rain-slick asphalt. Thin smoke drifts. Slow push-in on the person's face. 1940s crime lighting: hard key light, deep shadows, sharp rim light, high contrast black-and-white mood with muted color. Stillness and tension.",
  myth: "Cinematic movie trailer, five seconds, no dialogue. The person stands on a high cliff above a sea of clouds at golden hour. Wind pulls at hair and clothing. Ancient stone ruins rise behind them. The camera orbits once around the figure. Epic, mythic scale, warm low sun, vast sky.",
};
