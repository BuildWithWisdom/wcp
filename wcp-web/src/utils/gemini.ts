import type { Team } from "./teams";
import type { SimulationResult } from "./poisson";

/**
 * Generates a witty, professional post-match summary.
 * Uses the local template-based summary generator.
 */
export async function generateWittySummary(
  home: Team,
  away: Team,
  result: SimulationResult,
  _apiKey: string
): Promise<string> {
  const goals = result.timeline.filter((event) => event.type === "GOAL");
  const scorersText = goals
    .map((g) => `${g.playerName} (${g.minute}') for ${g.teamId === home.id ? home.name : away.name}`)
    .join(", ");

  const cardsCount = result.timeline.filter((event) => event.type === "YELLOW" || event.type === "RED").length;

  return generateLocalRecap(home, away, result, scorersText, cardsCount);
}

function generateLocalRecap(
  home: Team,
  away: Team,
  result: SimulationResult,
  scorersText: string,
  cardsCount: number
): string {
  const winner = result.winnerId === home.id ? home : result.winnerId === away.id ? away : null;
  const loser = winner ? (winner.id === home.id ? away : home) : null;
  const margin = Math.abs(result.homeScore - result.awayScore);

  // A. Scoreless Draw
  if (result.homeScore === 0 && result.awayScore === 0) {
    const scorelessTemplates = [
      `A total tactical snorefest as ${home.name} and ${away.name} cancel each other out in a 0-0 gridlock. Fans in the stadium were spotted checking their tax returns by the 75th minute. Both managers will claim it was a "disciplined defensive performance," but we know the truth.`,
      `The football gods are weeping after a barren 0-0 draw between ${home.name} and ${away.name}. Neither side could hit a barn door with a banjo today, although ${cardsCount > 3 ? "at least the referee kept busy handing out yellow cards" : "the keepers had a relaxing afternoon in the sun"}.`,
    ];
    return scorelessTemplates[Math.floor(Math.random() * scorelessTemplates.length)];
  }

  // B. Draw with goals
  if (result.homeScore === result.awayScore) {
    const drawTemplates = [
      `A thrilling ${result.homeScore}-${result.awayScore} draw that saw defenses evaporate. ${scorersText ? `Goals from ${scorersText}` : ""} kept the crowd on their toes. Both teams walk away with a point, though neither will be happy about the defensive comedy of errors on display.`,
      `Honors even in a dramatic ${result.homeScore}-${result.awayScore} stalemate. ${home.name} and ${away.name} traded blows like heavyweights, with ${cardsCount > 4 ? `a spicy total of ${cardsCount} cards keeping the referee sweating` : "fluid counter-attacks illuminating the pitch"}.`,
    ];
    return drawTemplates[Math.floor(Math.random() * drawTemplates.length)];
  }

  // C. Penalty Shootout Win
  if (result.decidedBy === "PENALTIES" && winner && loser) {
    return `Absolute drama! After a grueling draw, ${winner.name} edges past ${loser.name} in a nerve-shredding penalty shootout (${result.penaltyScores?.home}-${result.penaltyScores?.away}). ${loser.name}'s fans will be having nightmares about the decisive spot-kick that sailed into orbit, while ${winner.name} marches on with ice in their veins.`;
  }

  // D. Extra Time Win
  if (result.decidedBy === "EXTRA_TIME" && winner && loser) {
    return `Lungs were burning and legs were cramping, but ${winner.name} found the energy to secure a ${result.homeScore}-${result.awayScore} extra-time victory over ${loser.name}. A dramatic late strike in the dying embers of the 120 minutes broke ${loser.name}'s hearts and spared us the horror of a penalty lottery.`;
  }

  // E. Massive Blowout (Margin >= 3)
  if (winner && loser && margin >= 3) {
    const blowoutTemplates = [
      `A complete and utter dismantling! ${winner.name} bullies ${loser.name} in a brutal ${result.homeScore}-${result.awayScore} shellacking. ${scorersText ? `With ${scorersText} running the show,` : ""} the ${loser.name} defense was left looking like cardboard cutout models. Start the car, this one was over by halftime.`,
      `Total humiliation for ${loser.name} as ${winner.name} runs riot in a ${result.homeScore}-${result.awayScore} masterclass. The ${winner.name} attack was absolutely cooking today, leaving ${loser.name} manager looking like they'd rather be anywhere else on Earth.`,
    ];
    return blowoutTemplates[Math.floor(Math.random() * blowoutTemplates.length)];
  }

  // F. Normal Win (Margin 1 or 2)
  if (winner && loser) {
    const winTemplates = [
      `A tense, hard-fought battle ends with ${winner.name} squeezing past ${loser.name} ${result.homeScore}-${result.awayScore}. ${scorersText ? `Goals from ${scorersText} made the difference` : ""} as ${winner.name} successfully parked the bus in the final ten minutes to frustrate a frantic ${loser.name} press.`,
      `Job done for ${winner.name}! They secure a vital ${result.homeScore}-${result.awayScore} win against a resilient ${loser.name}. A mixture of tactical composure and ${cardsCount > 3 ? "cynical fouling" : "defensive coordination"} saw them lock down the three points as the whistle blew.`,
    ];
    return winTemplates[Math.floor(Math.random() * winTemplates.length)];
  }

  return `The match between ${home.name} and ${away.name} ended in a scoreline of ${result.homeScore}-${result.awayScore}.`;
}
