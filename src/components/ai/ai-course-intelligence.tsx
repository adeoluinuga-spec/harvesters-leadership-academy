"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  FileUp,
  Link2,
  PauseCircle,
  Save,
  Sparkles,
} from "lucide-react";

import { shellContainer, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  aiGenerationArtifacts,
  aiGenerationSteps,
  courseIntelligenceSignals,
  pathwayRecommendations,
  reflectionPrompts,
  scriptureInsights,
  summaryCards,
  transcriptSections,
} from "@/lib/ai-course-intelligence-data";
import {
  defaultLeadershipProfile,
  getLeadershipProfile,
  type MockLeadershipProfile,
} from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div variants={shellItem} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge className="mb-3 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
          {eyebrow}
        </Badge>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </motion.div>
  );
}

export function AiCourseGenerationFlow() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 96 ? 34 : current + 6));
    }, 1200);

    return () => window.clearInterval(timer);
  }, []);

  const activeStep = useMemo(() => {
    return aiGenerationSteps.findLast((step) => progress >= step.progress)?.label ?? aiGenerationSteps[0].label;
  }, [progress]);

  return (
    <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            AI course generation
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Upload sermons, leadership trainings, or conference sessions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                  <FileUp className="size-5" />
                </div>
                <div>
                  <p className="font-heading text-lg font-semibold text-zinc-950">
                    Sunday Leadership Intensive.mp4
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    58 min session - sermon video - ready for intelligence processing
                  </p>
                </div>
              </div>
              <Button className="h-10 rounded-lg bg-black text-white hover:bg-zinc-800">
                Replace file
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-white"
                >
                  <Bot className="size-4" />
                </motion.div>
                <div>
                  <p className="font-medium text-zinc-950">Generating course intelligence</p>
                  <p className="text-sm text-zinc-500">{activeStep}</p>
                </div>
              </div>
              <span className="font-heading text-sm font-semibold text-zinc-950">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-black"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {aiGenerationSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md",
                    progress >= step.progress ? "bg-black text-white" : "bg-zinc-100 text-zinc-400"
                  )}
                >
                  {progress >= step.progress ? <Check className="size-3.5" /> : <Clock3 className="size-3.5" />}
                </div>
                <p className="text-sm font-medium text-zinc-700">{step.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <motion.div variants={shellContainer} className="grid gap-3 sm:grid-cols-2">
        {aiGenerationArtifacts.map((artifact) => (
          <motion.div key={artifact.label} variants={shellItem}>
            <Card className="h-full rounded-xl border-zinc-200 bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                    {artifact.label}
                  </p>
                  <CardTitle className="font-heading mt-3 text-base font-semibold text-zinc-950">
                    {artifact.value}
                  </CardTitle>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <artifact.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-zinc-500">{artifact.detail}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export function TranscriptIntelligence() {
  return (
    <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Transcript intelligence
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Editorial analysis with timestamps, extracted themes, and leadership principles.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {transcriptSections.map((section) => (
            <div key={section.timestamp} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading font-semibold text-zinc-950">{section.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{section.timestamp}</p>
                </div>
                <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                  {section.scripture}
                </Badge>
              </div>
              <p className="border-l-2 border-zinc-200 pl-3 text-sm leading-6 text-zinc-600">
                {section.excerpt}
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="flex flex-wrap gap-2">
                  {section.themes.map((theme) => (
                    <Badge key={theme} className="rounded-md border-zinc-200 bg-white text-zinc-600 hover:bg-white">
                      {theme}
                    </Badge>
                  ))}
                </div>
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-600">
                  {section.principle}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <CourseIntelligencePanel />
    </motion.section>
  );
}

export function AiSummaryExperience() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            AI-generated lesson summary
          </CardTitle>
          <p className="text-sm text-zinc-500">
            A calm synthesis of overview, takeaways, principles, spiritual application, and action.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((summary) => (
            <div key={summary.title} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <summary.icon className="size-4" />
              </div>
              <p className="font-heading font-semibold text-zinc-950">{summary.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{summary.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export function ReflectionPromptSystem() {
  return (
    <motion.section variants={shellItem} className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg font-semibold">Reflection workspace</CardTitle>
          <p className="text-sm text-zinc-400">
            Save reflection, revisit later, or attach the note to a leadership growth journey.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-40 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-white/25"
            placeholder="Write a reflective leadership note..."
            defaultValue="I need to review how our team rhythms are forming culture beyond what we say in meetings."
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "Save reflection", icon: Save },
              { label: "Revisit later", icon: PauseCircle },
              { label: "Attach to journey", icon: Link2 },
            ].map((action) => (
              <Button key={action.label} className="h-10 rounded-lg bg-white text-black hover:bg-zinc-100">
                <action.icon className="size-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            AI reflection prompts
          </CardTitle>
          <p className="text-sm text-zinc-500">Generated for leadership application, not passive consumption.</p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2">
          {reflectionPrompts.map((item) => (
            <div key={item.prompt} className="rounded-lg border border-zinc-100 p-4">
              <Badge className="mb-4 rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                {item.tag}
              </Badge>
              <p className="text-sm leading-6 text-zinc-700">{item.prompt}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export function PathwayRecommendations() {
  const [profile, setProfile] = useState<MockLeadershipProfile>(defaultLeadershipProfile);

  useEffect(() => {
    function syncProfile() {
      setProfile(getLeadershipProfile());
    }

    syncProfile();
    window.addEventListener("harvesters-profile-change", syncProfile);
    window.addEventListener("storage", syncProfile);

    return () => {
      window.removeEventListener("harvesters-profile-change", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
                AI leadership pathway recommendations
              </CardTitle>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                As a {profile.currentLeadershipRole} preparing for {profile.leadershipAspiration}, your pathway is adapting to course behavior, engagement, and assessment patterns.
              </p>
            </div>
            <Badge className="w-fit rounded-md bg-black px-3 py-1.5 text-white hover:bg-black">
              {profile.department}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-4">
          {pathwayRecommendations.map((recommendation) => (
            <div key={recommendation.title} className="rounded-lg border border-zinc-100 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <Badge className="rounded-md bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                  {recommendation.type}
                </Badge>
                <ArrowRight className="size-4 text-zinc-400" />
              </div>
              <p className="font-heading font-semibold text-zinc-950">{recommendation.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{recommendation.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export function ScriptureExtraction() {
  return (
    <motion.section variants={shellItem}>
      <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
            Scripture intelligence
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Extracted scripture references linked to leadership themes and spiritual emphasis.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 pt-1 md:grid-cols-2 xl:grid-cols-4">
          {scriptureInsights.map((scripture) => (
            <div key={scripture.reference} className="rounded-lg border border-zinc-100 p-4">
              <p className="font-heading text-xl font-semibold text-zinc-950">{scripture.reference}</p>
              <p className="mt-3 text-sm font-medium text-zinc-700">{scripture.theme}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{scripture.emphasis}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  );
}

export function CourseIntelligencePanel() {
  return (
    <Card className="rounded-xl border-zinc-200 bg-[#0b0b0b] text-white shadow-sm">
      <CardHeader>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white text-black">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle className="font-heading text-lg font-semibold">Course intelligence panel</CardTitle>
            <p className="text-sm text-zinc-400">Embedded ministry insight, not a chatbot.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {courseIntelligenceSignals.map((signal) => (
          <div key={signal.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white">
                <signal.icon className="size-4" />
              </div>
              <p className="text-sm text-zinc-400">{signal.label}</p>
            </div>
            <p className="font-heading text-sm font-semibold leading-6 text-white">{signal.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AiCourseIntelligenceSections() {
  return (
    <>
      <SectionHeading
        eyebrow="AI course generation flow"
        title="Transform teachings into structured leadership development"
        description="A simulated admin flow for converting sermons, trainings, and conference sessions into LMS-ready courses."
      />
      <AiCourseGenerationFlow />

      <SectionHeading
        eyebrow="Transcript intelligence"
        title="Read the teaching like an editorial leadership map"
        description="Transcript sections become timestamped insight, leadership principles, scripture links, and ministry applications."
      />
      <TranscriptIntelligence />

      <SectionHeading
        eyebrow="AI summary experience"
        title="Summaries that help leaders carry the lesson into practice"
        description="Each lesson receives a calm synthesis for overview, takeaways, principles, spiritual application, and action."
      />
      <AiSummaryExperience />

      <SectionHeading
        eyebrow="Reflection prompt system"
        title="Reflection that attaches learning to formation"
        description="Prompts move leaders from content consumption into department culture, stewardship, mentorship, and execution."
      />
      <ReflectionPromptSystem />

      <SectionHeading
        eyebrow="Leadership pathway recommendations"
        title="Recommendations shaped by role, aspiration, and behavior"
        description="AI suggests courses, tracks, mentorship pathways, and certifications based on leadership profile and learning signals."
      />
      <PathwayRecommendations />

      <SectionHeading
        eyebrow="Scripture extraction"
        title="Spiritual emphasis stays connected to leadership practice"
        description="Scripture references are extracted, organized, and linked to themes leaders can apply in ministry."
      />
      <ScriptureExtraction />
    </>
  );
}
