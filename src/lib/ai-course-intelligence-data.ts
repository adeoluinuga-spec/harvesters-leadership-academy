import {
  BookOpen,
  Brain,
  ClipboardCheck,
  Compass,
  FileText,
  HeartHandshake,
  LineChart,
  MessageSquareText,
  ScrollText,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

export type AiGenerationArtifact = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export const aiGenerationArtifacts: AiGenerationArtifact[] = [
  {
    label: "Course title",
    value: "Stewarding Culture Through Pastoral Leadership",
    detail: "Clear, ministry-centered title extracted from the dominant leadership emphasis.",
    icon: Sparkles,
  },
  {
    label: "Course description",
    value: "A leadership development course for shaping healthy teams through spiritual posture, clear rhythms, and accountable care.",
    detail: "Generated from the session thesis, audience, and application moments.",
    icon: FileText,
  },
  {
    label: "Leadership themes",
    value: "Stewardship, Culture, Follow-up, Delegation",
    detail: "Themes are weighted by repetition, emotional emphasis, and practical instruction.",
    icon: Brain,
  },
  {
    label: "Learning objectives",
    value: "5 objectives",
    detail: "Mapped to observable leadership behaviors and ministry readiness signals.",
    icon: Target,
  },
  {
    label: "Lesson breakdown",
    value: "7 lessons",
    detail: "Segments follow teaching movement, scripture emphasis, and reflection pauses.",
    icon: BookOpen,
  },
  {
    label: "Scripture references",
    value: "6 passages",
    detail: "References are linked to leadership themes and spiritual applications.",
    icon: ScrollText,
  },
  {
    label: "Reflection questions",
    value: "12 prompts",
    detail: "Questions adapt to department culture, stewardship posture, and leadership aspiration.",
    icon: MessageSquareText,
  },
  {
    label: "AI assessments",
    value: "3 checkpoints",
    detail: "Assessment items measure comprehension, application, and pastoral judgment.",
    icon: ClipboardCheck,
  },
];

export const aiGenerationSteps = [
  { label: "Reading transcript", progress: 18 },
  { label: "Detecting leadership themes", progress: 38 },
  { label: "Extracting scripture references", progress: 56 },
  { label: "Structuring lesson pathway", progress: 74 },
  { label: "Preparing assessments and reflections", progress: 92 },
];

export const transcriptSections = [
  {
    timestamp: "00:00-04:18",
    title: "Opening charge on stewardship",
    excerpt:
      "Leadership in ministry begins with the weight of stewardship before it becomes the work of execution.",
    themes: ["Stewardship", "Spiritual posture"],
    principle: "Leaders carry people before they carry plans.",
    scripture: "1 Peter 5:2-3",
  },
  {
    timestamp: "04:19-11:42",
    title: "Culture is formed by repeated rhythms",
    excerpt:
      "What your team experiences every week will disciple them more deeply than what you announce once a quarter.",
    themes: ["Culture", "Consistency"],
    principle: "Rhythm is one of the strongest forms of leadership communication.",
    scripture: "1 Corinthians 14:40",
  },
  {
    timestamp: "11:43-18:06",
    title: "Pastoral follow-up as leadership intelligence",
    excerpt:
      "A leader who notices absence early protects the person, the team, and the mission.",
    themes: ["Follow-up", "Care"],
    principle: "Attention is a pastoral leadership discipline.",
    scripture: "John 10:14",
  },
  {
    timestamp: "18:07-27:30",
    title: "Delegation with clarity and care",
    excerpt:
      "Delegation is not abandonment. It is trust with definition, support, and accountability.",
    themes: ["Delegation", "Accountability"],
    principle: "Clarity makes empowerment sustainable.",
    scripture: "2 Timothy 2:2",
  },
];

export const summaryCards = [
  {
    title: "Lesson overview",
    body: "This teaching frames leadership as spiritual stewardship expressed through culture, rhythm, care, and accountable delegation.",
    icon: FileText,
  },
  {
    title: "Key takeaways",
    body: "Healthy teams are shaped by repeated rhythms, visible care, and leaders who can define the culture they are protecting.",
    icon: Sparkles,
  },
  {
    title: "Leadership principles",
    body: "Notice early, clarify often, delegate with support, and measure progress without losing pastoral warmth.",
    icon: Compass,
  },
  {
    title: "Spiritual applications",
    body: "Shepherd willingly, lead by example, and let service posture shape execution decisions.",
    icon: HeartHandshake,
  },
  {
    title: "Action points",
    body: "Audit one department rhythm, identify two leaders needing follow-up, and rewrite one assignment with clearer ownership.",
    icon: ClipboardCheck,
  },
];

export const reflectionPrompts = [
  {
    prompt: "How would this leadership principle affect your department culture over the next 30 days?",
    tag: "Department culture",
  },
  {
    prompt: "What stewardship lesson stood out most to you, and where does it challenge your current leadership posture?",
    tag: "Stewardship",
  },
  {
    prompt: "Which leader under your care needs earlier follow-up than your current rhythm provides?",
    tag: "Mentorship",
  },
  {
    prompt: "What assignment have you delegated without enough clarity, support, or accountability?",
    tag: "Execution",
  },
];

export const pathwayRecommendations = [
  {
    type: "Course",
    title: "Culture, Teams and Stewardship",
    reason: "Strengthens the operating rhythms needed for healthier department culture.",
  },
  {
    type: "Leadership track",
    title: "Community Leadership Pathway",
    reason: "Matches your aspiration and current responsibility for leader formation.",
  },
  {
    type: "Mentorship pathway",
    title: "Pastoral Follow-up Circle",
    reason: "Recommended because reflection patterns show high care responsibility.",
  },
  {
    type: "Certification",
    title: "Ministry Systems Readiness",
    reason: "Unlock after completing assessment checkpoints on culture and execution.",
  },
];

export const scriptureInsights = [
  {
    reference: "1 Peter 5:2-3",
    theme: "Shepherding posture",
    emphasis: "Lead willingly, by example, and without domination.",
  },
  {
    reference: "2 Timothy 2:2",
    theme: "Leadership multiplication",
    emphasis: "Entrust truth and responsibility to faithful people who can teach others.",
  },
  {
    reference: "John 10:14",
    theme: "Pastoral awareness",
    emphasis: "Know the people you lead; care becomes intelligent when it is attentive.",
  },
  {
    reference: "1 Corinthians 14:40",
    theme: "Order and rhythm",
    emphasis: "Spiritual environments can be excellent, orderly, and deeply alive.",
  },
];

export const courseIntelligenceSignals = [
  { label: "Leadership themes detected", value: "Stewardship, culture, care, delegation", icon: Brain },
  { label: "Emotional tone", value: "Reflective, corrective, pastoral", icon: HeartHandshake },
  { label: "Stewardship emphasis", value: "High", icon: Target },
  { label: "Communication themes", value: "Clarity, repetition, team language", icon: MessageSquareText },
  { label: "Ministry applications", value: "Department rhythms, follow-up, delegation maps", icon: LineChart },
];
