/**
 * AI Course Ingestion — provider abstraction layer.
 *
 * Currently uses a deterministic mock generator so the architecture is
 * in place before connecting a real AI provider (OpenAI, Claude, Gemini).
 * Swap the provider by changing AI_PROVIDER or by passing `provider` to
 * analyzeContent().
 */

import type {
  AIGeneratedCourse,
  AIGeneratedModule,
  AIGeneratedQuestion,
  AISourceType,
  CourseDifficulty,
} from "@/lib/lms-types";
import { COURSE_CATEGORIES } from "@/lib/lms-types";

export type AIProvider = "mock" | "openai" | "claude" | "gemini";

export interface AIIngestionInput {
  sourceType: AISourceType;
  sourceUrl?: string;
  transcript: string;
}

export interface AIIngestionResult {
  course: AIGeneratedCourse;
  provider: AIProvider;
}

// Change this env variable to switch providers without touching the app.
const DEFAULT_PROVIDER: AIProvider =
  (process.env.AI_COURSE_PROVIDER as AIProvider | undefined) ?? "mock";

// ============================================================
// Public entry point
// ============================================================

export async function analyzeContent(
  input: AIIngestionInput,
  provider: AIProvider = DEFAULT_PROVIDER
): Promise<AIIngestionResult> {
  if (!input.transcript || input.transcript.trim().length < 50) {
    throw new Error(
      "Transcript is too short to generate a course. Provide at least a few paragraphs."
    );
  }

  switch (provider) {
    case "openai":
      // TODO: implement OpenAI integration
      // return openaiAnalyze(input);
      throw new Error("OpenAI provider not yet connected. Set AI_COURSE_PROVIDER=mock to use the mock generator.");
    case "claude":
      // TODO: implement Claude/Anthropic integration
      throw new Error("Claude provider not yet connected. Set AI_COURSE_PROVIDER=mock to use the mock generator.");
    case "gemini":
      // TODO: implement Gemini integration
      throw new Error("Gemini provider not yet connected. Set AI_COURSE_PROVIDER=mock to use the mock generator.");
    default:
      return { course: mockAnalyze(input), provider: "mock" };
  }
}

// ============================================================
// Mock generator — deterministic, transcript-driven
// ============================================================

function mockAnalyze(input: AIIngestionInput): AIGeneratedCourse {
  const text = input.transcript.trim();
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);

  const wordCount = text.split(/\s+/).length;
  // Average speech rate: 130 words/minute
  const totalMinutes = Math.max(5, Math.round(wordCount / 130));

  const title = deriveTitle(sentences);
  const description = deriveDescription(paragraphs);
  const category = inferCategory(text);
  const difficulty = inferDifficulty(text);
  const targetAudience = inferAudience(text);

  const modules = deriveModules(paragraphs, totalMinutes);
  const assessments = deriveAssessments(sentences, modules);
  const tags = deriveTags(text, category);

  return {
    course_title: title,
    course_description: description,
    course_category: category,
    target_audience: targetAudience,
    total_estimated_duration: formatMinutes(totalMinutes),
    difficulty_level: difficulty,
    modules,
    assessments,
    suggested_tags: tags,
    certificate_title: `${title} — Certificate of Completion`,
    thumbnail_prompt: `A professional ministry leadership course cover image representing: ${title}. Clean, editorial, dark background with gold accents.`,
  };
}

// ============================================================
// Title derivation
// ============================================================

function deriveTitle(sentences: string[]): string {
  // Look for a sentence that reads like a heading (short, capitalised words, no verb)
  for (const s of sentences.slice(0, 6)) {
    const clean = s.trim().replace(/[.:,;?!]+$/, "");
    const words = clean.split(/\s+/);
    if (words.length >= 3 && words.length <= 10) {
      // Capitalise each word like a title
      return words.map(titleCase).join(" ");
    }
  }
  // Fallback: use first 6 words
  const fallback = sentences[0]?.split(/\s+/).slice(0, 6).map(titleCase).join(" ") ?? "Ministry Leadership Course";
  return fallback;
}

// ============================================================
// Description
// ============================================================

function deriveDescription(paragraphs: string[]): string {
  const first = paragraphs[0]?.trim() ?? "";
  if (first.length > 50) {
    return first.length > 280 ? first.slice(0, 277) + "…" : first;
  }
  const combined = paragraphs.slice(0, 2).join(" ").trim();
  return combined.length > 280 ? combined.slice(0, 277) + "…" : combined;
}

// ============================================================
// Module derivation
// ============================================================

function deriveModules(paragraphs: string[], totalMinutes: number): AIGeneratedModule[] {
  // Target 4-6 modules
  const targetCount = Math.min(6, Math.max(3, Math.floor(paragraphs.length / 2)));
  const chunkSize = Math.ceil(paragraphs.length / targetCount);

  const chunks: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    const chunk = paragraphs.slice(i, i + chunkSize);
    if (chunk.join(" ").trim().length > 30) chunks.push(chunk);
  }

  // Distribute time proportionally by word count
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
    // Generate generic objectives from first 3 sentences
    return sentences.slice(0, 3).map((s) => `Understand and apply: ${cleanSentence(s).toLowerCase()}`);
  }
  return objectives.slice(0, 4);
}

function deriveTakeaways(sentences: string[]): string[] {
  // Pick substantive middle sentences
  const mid = sentences.slice(Math.floor(sentences.length / 4));
  const picks = mid.filter((s) => s.length > 30 && s.length < 200).slice(0, 3);
  if (picks.length === 0) return sentences.slice(0, 3).map(cleanSentence);
  return picks.map(cleanSentence);
}

function deriveReflectionQuestions(sentences: string[], moduleTitle: string): string[] {
  return [
    `How does the concept of "${moduleTitle.toLowerCase()}" apply to your current leadership context?`,
    `What one action will you take this week based on what you learned in this section?`,
    `How would you explain the key principle from this module to a member of your team?`,
  ];
}

// ============================================================
// Assessment derivation
// ============================================================

function deriveAssessments(sentences: string[], modules: AIGeneratedModule[]): AIGeneratedQuestion[] {
  const questions: AIGeneratedQuestion[] = [];

  // Generate 1 MCQ per module
  for (let i = 0; i < Math.min(modules.length, 4); i++) {
    const m = modules[i];
    const stem = m.key_takeaways[0] ?? m.module_summary;
    const cleanStem = cleanSentence(stem).replace(/[.!?]$/, "");

    questions.push({
      question: `Which of the following best describes the principle of "${m.module_title}"?`,
      question_type: "mcq",
      options: [
        cleanStem.length > 10 ? cleanStem : `The core principle of ${m.module_title}`,
        `A secondary consideration in ${m.module_title.toLowerCase()}`,
        `An optional framework that only applies in larger organisations`,
        `A historical concept no longer relevant to modern ministry`,
      ],
      correct_answer: cleanStem.length > 10 ? cleanStem : `The core principle of ${m.module_title}`,
      explanation: `This answer captures the central teaching from the "${m.module_title}" module as described in the learning objectives.`,
    });
  }

  // Add 2 true/false questions from key sentences
  const tfSentences = sentences.filter((s) => s.length > 40 && s.length < 180).slice(2, 5);
  for (const s of tfSentences.slice(0, 2)) {
    questions.push({
      question: `True or False: "${cleanSentence(s)}"`,
      question_type: "true_false",
      options: ["True", "False"],
      correct_answer: "True",
      explanation: "This statement is drawn directly from the course content and reflects a key principle taught in this curriculum.",
    });
  }

  // Add 1 reflection question
  questions.push({
    question: "Describe one concrete way you will apply the leadership principles from this course within the next 30 days.",
    question_type: "reflection",
    options: [],
    correct_answer: "",
    explanation: "Reflection questions have no single correct answer. They are evaluated based on depth of engagement and practical specificity.",
  });

  return questions;
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

  // Validate against COURSE_CATEGORIES
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
  const tags = Array.from(new Set([category.toLowerCase(), ...found])).slice(0, 6);
  return tags;
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
