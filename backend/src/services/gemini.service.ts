import { Team, MatchStage } from "./storage.service";

export interface AIModifiers {
  homeAttackModifier: number;
  homeDefenseModifier: number;
  awayAttackModifier: number;
  awayDefenseModifier: number;
  tacticalAnalysis: string;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

export class GeminiService {
  private static readonly MODEL = "gemini-2.5-flash";

  static async getMatchPredictionModifiers(
    homeTeam: Team,
    awayTeam: Team,
    stage: MatchStage
  ): Promise<AIModifiers> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.getFallbackModifiers("Gemini API key is not configured.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${apiKey}`;

    const prompt = `Analyze the upcoming World Cup football match:
Home Team: ${homeTeam.name} (${homeTeam.code})
FIFA Points: ${homeTeam.fifaPoints}
Squad Value: €${homeTeam.squadValue}M
Key Players: ${homeTeam.keyPlayers.join(", ")}

Away Team: ${awayTeam.name} (${awayTeam.code})
FIFA Points: ${awayTeam.fifaPoints}
Squad Value: €${awayTeam.squadValue}M
Key Players: ${awayTeam.keyPlayers.join(", ")}

Tournament Stage: ${stage}

Analyze their form, squad quality, tactics, and key players to return modifiers (0.8 to 1.2) representing how they compare offensively and defensively, and a very brief tactical analysis (under 150 characters).`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            homeAttackModifier: {
              type: "NUMBER",
              description: "Attack rating multiplier for home team between 0.8 and 1.2. 1.0 is neutral, >1.0 represents stronger attack.",
            },
            homeDefenseModifier: {
              type: "NUMBER",
              description: "Defense rating multiplier for home team between 0.8 and 1.2. 1.0 is neutral, <1.0 represents tighter defense (reduces opponent scoring), >1.0 represents weaker/shakier defense (increases opponent scoring).",
            },
            awayAttackModifier: {
              type: "NUMBER",
              description: "Attack rating multiplier for away team between 0.8 and 1.2.",
            },
            awayDefenseModifier: {
              type: "NUMBER",
              description: "Defense rating multiplier for away team between 0.8 and 1.2.",
            },
            tacticalAnalysis: {
              type: "STRING",
              description: "A single concise sentence summarizing the tactical outlook of the match (maximum 150 characters).",
            },
          },
          required: [
            "homeAttackModifier",
            "homeDefenseModifier",
            "awayAttackModifier",
            "awayDefenseModifier",
            "tacticalAnalysis",
          ],
        },
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errBody}`);
      }

      const responseData = (await response.json()) as GeminiResponse;
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error("Empty response from Gemini API.");
      }

      const parsed = JSON.parse(rawText);

      return {
        homeAttackModifier: Math.max(0.8, Math.min(1.2, Number(parsed.homeAttackModifier) || 1.0)),
        homeDefenseModifier: Math.max(0.8, Math.min(1.2, Number(parsed.homeDefenseModifier) || 1.0)),
        awayAttackModifier: Math.max(0.8, Math.min(1.2, Number(parsed.awayAttackModifier) || 1.0)),
        awayDefenseModifier: Math.max(0.8, Math.min(1.2, Number(parsed.awayDefenseModifier) || 1.0)),
        tacticalAnalysis: parsed.tacticalAnalysis || "Strategic battle expected.",
      };
    } catch (error) {
      console.warn("Gemini service error: using fallback.", error);
      return this.getFallbackModifiers(error instanceof Error ? error.message : "Unknown error");
    }
  }

  private static getFallbackModifiers(reason: string): AIModifiers {
    return {
      homeAttackModifier: 1.0,
      homeDefenseModifier: 1.0,
      awayAttackModifier: 1.0,
      awayDefenseModifier: 1.0,
      tacticalAnalysis: `Offline fallback (${reason}). Oracle predicted using standard historical team metrics.`,
    };
  }
}
