/**
 * AI Course Ingestion — provider abstraction layer.
 *
 * Set AI_COURSE_PROVIDER in .env.local to switch providers:
 *   AI_COURSE_PROVIDER=openai   → GPT-4o (requires OPENAI_API_KEY)
 *   AI_COURSE_PROVIDER=local    -> deterministic transcript parser (no key needed)
 *
 * If AI_COURSE_PROVIDER is unset, defaults to openai when OPENAI_API_KEY is
 * present, otherwise falls back to the local parser automatically.
 */

import type {
  AIGeneratedCourse,
  AIGeneratedModule,
  AIGeneratedQuestion,
  AISourceType,
  CourseDifficulty,
} from "@/lib/lms-types";
import { COURSE_CATEGORIES } from "@/lib/lms-types";

export type AIProvider = "local" | "openai" | "claude" | "gemini";

export interface AIIngestionInput {
  sourceType: AISourceType;
  sourceUrl?: string;
  transcript: string;
}

export interface AIIngestionResult {
  course: AIGeneratedCourse;
  provider: AIProvider;
}

const DEFAULT_PROVIDER: AIProvider = (() => {
  const explicit = process.env.AI_COURSE_PROVIDER as AIProvider | undefined;
  if (explicit) return explicit;
  return process.env.OPENAI_API_KEY ? "openai" : "local";
})();

// ============================================================
// Public entry point
// ============================================================

export async function analyzeContent(
  input: AIIngestionInput,
  provider: AIProvider = DEFAULT_PROVIDER
): Promise<AIIngestionResult> {
  if (!input.transcript || input.transcript.trim().length < 50) {
    throw new Error(
      "Transcript is too short. Provide at least a few paragraphs of content."
    );
  }

  switch (provider) {
    case "openai":
      return { course: await openaiAnalyze(input), provider: "openai" };
    case "claude":
      throw new Error("Claude provider not yet connected. Set AI_COURSE_PROVIDER=openai or AI_COURSE_PROVIDER=local.");
    case "gemini":
      throw new Error("Gemini provider not yet connected. Set AI_COURSE_PROVIDER=openai or AI_COURSE_PROVIDER=local.");
    default:
      return { course: localAnalyze(input), provider: "local" };
  }
}

// ============================================================
// OpenAI GPT-4o — structured JSON output
// ============================================================

async function openaiAnalyze(input: AIIngestionInput): Promise<AIGeneratedCourse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local or set AI_COURSE_PROVIDER=local to use the local transcript parser."
    );
  }

  const systemPrompt = `You are an expert ministry leadership trainer and curriculum designer for Harvesters Leadership Academy, a church-based leadership development platform.

Analyse the provided transcript and return ONLY a valid JSON object. No prose, no markdown — pure JSON.

The JSON must match this exact structure:
{
  "course_title": string,
  "course_description": string,
  "course_category": "Leadership" | "Discipleship" | "Operations" | "Care" | "Volunteer Growth" | "Strategy" | "Prayer" | "Evangelism" | "Finance" | "General",
  "target_audience": string,
  "total_estimated_duration": string,
  "difficulty_level": "Foundational" | "Intermediate" | "Advanced" | "Executive",
  "modules": [
    {
      "module_title": string,
      "timestamp_start": string,
      "timestamp_end": string,
      "module_summary": string,
      "learning_objectives": string[],
      "key_takeaways": string[],
      "reflection_questions": string[],
      "assessment_questions": [
        {
          "question": string,
          "question_type": "mcq" | "true_false",
          "options": string[],
          "correct_answer": string,
          "explanation": string
        }
      ]
    }
  ],
  "assessments": [],
  "suggested_tags": string[],
  "certificate_title": string,
  "thumbnail_prompt": string
}

Rules:
- Generate 4–6 well-structured modules that follow the flow of the transcript
- Each module must have exactly 2–3 assessment_questions (mix of mcq and true_false)
- For mcq: provide exactly 4 options; correct_answer must match one option exactly
- For true_false: options must be exactly ["True", "False"]
- learning_objectives: 2–3 concise statements per module
- key_takeaways: 2–3 actionable insights per module
- reflection_questions: 1–2 open-ended questions per module
- Timestamps in M:SS or H:MM:SS format, proportional to content length
- All content must derive directly from the transcript
- Use ministry and church leadership language throughout
- assessments field must be an empty array (questions live inside each module)`;

  const userMessage = `Analyse this transcript and generate the course structure:\n\n${input.transcript.slice(0, 15000)}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string | null } }>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response. Please try again.");

  let parsed: AIGeneratedCourse;
  try {
    parsed = JSON.parse(content) as AIGeneratedCourse;
  } catch {
    throw new Error("OpenAI returned malformed JSON. Please try again.");
  }

  // Safety defaults
  parsed.assessments = [];
  parsed.modules = (parsed.modules ?? []).map((m) => ({
    ...m,
    assessment_questions: m.assessment_questions ?? [],
  }));

  return parsed;
}

// ============================================================
// Local parser - deterministic, transcript-driven
// ============================================================

function localAnalyze(input: AIIngestionInput): AIGeneratedCourse {
  const text = input.transcript.trim();
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);

  const wordCount = text.split(/\s+/).length;
  const totalMinutes = Math.max(5, Math.round(wordCount / 130));

  const title = deriveTitle(sentences);
  const description = deriveDescription(paragraphs);
  const category = inferCategory(text);
  const difficulty = inferDifficulty(text);
  const targetAudience = inferAudience(text);

  const modules = deriveModules(paragraphs, totalMinutes);
  const tags = deriveTags(text, category);

  return {
    course_title: title,
    course_description: description,
    course_category: category,
    target_audience: targetAudience,
    total_estimated_duration: formatMinutes(totalMinutes),
    difficulty_level: difficulty,
    modules,
    assessments: [],
    suggested_tags: tags,
    certificate_title: `${title} — Certificate of Completion`,
    thumbnail_prompt: `A professional ministry leadership course cover image for: ${title}. Clean, editorial, dark background with gold accents.`,
  };
}

// ============================================================
// Title derivation
// ============================================================

function deriveTitle(sentences: string[]): string {
  for (const s of sentences.slice(0, 6)) {
    const clean = s.trim().replace(/[.:,;?!]+$/, "");
    const words = clean.split(/\s+/);
    if (words.length >= 3 && words.length <= 10) {
      return words.map(titleCase).join(" ");
    }
  }
  return (
    sentences[0]?.split(/\s+/).slice(0, 6).map(titleCase).join(" ") ??
    "Ministry Leadership Course"
  );
}

function deriveDescription(paragraphs: string[]): string {
  const first = paragraphs[0]?.trim() ?? "";
  if (first.length > 50) return first.length > 280 ? first.slice(0, 277) + "…" : first;
  const combined = paragraphs.slice(0, 2).join(" ").trim();
  return combined.length > 280 ? combined.slice(0, 277) + "…" : combined;
}

// ============================================================
// Module derivation (with per-module assessment questions)
// ============================================================

function deriveModules(
  paragraphs: string[],
  totalMinutes: number
): AIGeneratedModule[] {
  const targetCount = Math.min(6, Math.max(3, Math.floor(paragraphs.length / 2)));
  const chunkSize = Math.ceil(paragraphs.length / targetCount);

  const chunks: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const chunk = paragraphs.slice(i, i + chunkSize);
    if (chunk.join(" ").trim().length > 30) chunks.push(chunk);
  }

  const chunkWords = chunks.map((c) => c.join(" ").split(/\s+/).length);
  const totalWords = chunkWords.reduce((a, b) => a + b, 0);

  let cursor = 0;
  return chunks.map((chunk, idx): AIGeneratedModule => {
    const chunkText = chunk.join(" ").trim();
    const sentences = splitSentences(chunkText);

    const durationSeconds = Math.round((chunkWords[idx] / totalWords) * totalMinutes * 60);
    const startSec = cursor;
    const endSec = cursor + durationSeconds;
    cursor = endSec;

    const moduleTitle = deriveModuleTitle(sentences, idx);
    const summary = sentences.slice(0, 3).join(" ").slice(0, 300);

    return {
      module_title: moduleTitle,
      timestamp_start: formatTimestamp(startSec),
      timestamp_end: formatTimestamp(endSec),
      module_summary: summary || chunkText.slice(0, 200),
      learning_objectives: deriveObjectives(sentences),
      key_takeaways: deriveTakeaways(sentences),
      reflection_questions: deriveReflectionQuestions(sentences, moduleTitle),
      assessment_questions: deriveModuleAssessments(sentences, moduleTitle),
    };
  });
}

function deriveModuleTitle(sentences: string[], fallbackIndex: number): string {
  const moduleLabels = [
    "Foundations",
    "Core Principles",
    "Practical Application",
    "Systems and Strategy",
    "Leadership in Action",
    "Growth and Sustainability",
  ];
  for (const s of sentences.slice(0, 3)) {
    const clean = s.trim().replace(/[.:,;?!]+$/, "");
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 8) {
      return words.map(titleCase).join(" ");
    }
  }
  return moduleLabels[fallbackIndex] ?? `Module ${fallbackIndex + 1}`;
}

function deriveObjectives(sentences: string[]): string[] {
  const objectives: string[] = [];
  const verbs = ["understand", "apply", "identify", "explain", "demonstrate", "develop", "analyse", "build"];
  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (verbs.some((v) => lower.includes(v)) && s.length > 20 && s.length < 150) {
      objectives.push(cleanSentence(s));
    }
    if (objectives.length >= 3) break;
  }
  if (objectives.length === 0) {
    return sentences.slice(0, 3).map((s) => `Understand and apply: ${cleanSentence(s).toLowerCase()}`);
  }
  return objectives.slice(0, 4);
}

function deriveTakeaways(sentences: string[]): string[] {
  const mid = sentences.slice(Math.floor(sentences.length / 4));
  const picks = mid.filter((s) => s.length > 30 && s.length < 200).slice(0, 3);
  if (picks.length === 0) return sentences.slice(0, 3).map(cleanSentence);
  return picks.map(cleanSentence);
}

function deriveReflectionQuestions(sentences: string[], moduleTitle: string): string[] {
  return [
    `How does "${moduleTitle.toLowerCase()}" apply to your current leadership context?`,
    `What one action will you take this week based on what you learned in this section?`,
  ];
}

function deriveModuleAssessments(sentences: string[], moduleTitle: string): AIGeneratedQuestion[] {
  const stem = sentences.find((s) => s.length > 40 && s.length < 180) ?? moduleTitle;
  const cleanStem = cleanSentence(stem).replace(/[.!?]$/, "");

  return [
    {
      question: `Which of the following best captures the central principle of "${moduleTitle}"?`,
      question_type: "mcq",
      options: [
        cleanStem.length > 10 ? cleanStem : `The foundational principle of ${moduleTitle}`,
        `A secondary consideration in ${moduleTitle.toLowerCase()}`,
        `An optional framework only relevant to larger organisations`,
        `A historical concept not applicable to modern ministry`,
      ],
      correct_answer: cleanStem.length > 10 ? cleanStem : `The foundational principle of ${moduleTitle}`,
      explanation: `This answer reflects the core teaching from the "${moduleTitle}" section of the course.`,
    },
    {
      question: `True or False: The principles taught in "${moduleTitle}" can be directly applied to everyday ministry leadership.`,
      question_type: "true_false",
      options: ["True", "False"],
      correct_answer: "True",
      explanation: "The content in this module is designed for direct application in ministry contexts.",
    },
  ];
}

// ============================================================
// Category / difficulty / audience inference
// ============================================================

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  const signals: [string, string[]][] = [
    ["Leadership", ["leadership", "leader", "authority", "vision", "oversight", "govern"]],
    ["Discipleship", ["disciple", "discipleship", "spiritual growth", "maturity", "faith"]],
    ["Operations", ["operations", "process", "systems", "management", "administrative", "structure"]],
    ["Care", ["care", "pastoral", "wellbeing", "support", "counselling", "compassion"]],
    ["Volunteer Growth", ["volunteer", "serve", "team", "department", "ministry team"]],
    ["Strategy", ["strategy", "strategic", "planning", "goals", "mission", "vision"]],
    ["Prayer", ["prayer", "intercession", "worship", "devotion", "spiritual"]],
    ["Evangelism", ["evangelism", "outreach", "gospel", "salvation", "witness", "community"]],
    ["Finance", ["finance", "budget", "stewardship", "giving", "tithes", "resources"]],
  ];

  let topCategory = "General";
  let topScore = 0;

  for (const [cat, keywords] of signals) {
    const score = keywords.reduce((acc, kw) => {
      const re = new RegExp(`\\b${kw}\\b`, "gi");
      return acc + (lower.match(re)?.length ?? 0);
    }, 0);
    if (score > topScore) {
      topScore = score;
      topCategory = cat;
    }
  }

  return (COURSE_CATEGORIES as readonly string[]).includes(topCategory) ? topCategory : "General";
}

function inferDifficulty(text: string): CourseDifficulty {
  const lower = text.toLowerCase();
  if (/executive|senior pastor|apostolic|governance|boardroom/.test(lower)) return "Executive";
  if (/advanced|complex|strategic|organisational|systemic/.test(lower)) return "Advanced";
  if (/intermediate|develop|growing|practical|application/.test(lower)) return "Intermediate";
  return "Foundational";
}

function inferAudience(text: string): string {
  const lower = text.toLowerCase();
  if (/group pastor|senior pastor|apostle|overseer/.test(lower)) return "Group Pastors and Senior Leaders";
  if (/campus pastor|campus|regional/.test(lower)) return "Campus Pastors and Regional Leaders";
  if (/cell leader|cell|zone/.test(lower)) return "Cell Leaders and Zone Leaders";
  if (/hod|department head|department/.test(lower)) return "Heads of Departments";
  return "All Ministry Leadership Cadres";
}

// ============================================================
// Tag derivation
// ============================================================

function deriveTags(text: string, category: string): string[] {
  const lower = text.toLowerCase();
  const tagKeywords = [
    "leadership", "vision", "culture", "teams", "systems", "discipleship",
    "evangelism", "prayer", "pastoral", "governance", "stewardship", "growth",
    "ministry", "church", "community", "strategy", "operations",
  ];
  const found = tagKeywords.filter((kw) => lower.includes(kw));
  return Array.from(new Set([category.toLowerCase(), ...found])).slice(0, 6);
}

// ============================================================
// Text utilities
// ============================================================

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20);
}

function cleanSentence(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/['"]/g, "");
}

function titleCase(word: string): string {
  const minors = new Set(["a", "an", "the", "and", "but", "or", "for", "of", "in", "on", "to", "with"]);
  if (minors.has(word.toLowerCase())) return word.toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${h}h ${m}m`;
}
