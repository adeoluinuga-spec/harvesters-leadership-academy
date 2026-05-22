"use client";

import { Award, CheckCircle2, Download, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LMSCertificate } from "@/lib/lms-types";

type CertificateViewProps = {
  certificate: LMSCertificate;
  recipientName: string;
};

export function CertificateView({ certificate, recipientName }: CertificateViewProps) {
  const course = certificate.course;
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Certificate of completion</p>
          <p className="font-heading mt-1 text-xl font-semibold text-zinc-950">
            {course?.title ?? "Course"}
          </p>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="gap-2 rounded-lg border-zinc-200 bg-white print:hidden"
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>

      {/* The printable certificate */}
      <div
        id="certificate"
        className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
        style={{ aspectRatio: "1.41 / 1" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[#f9f9f7]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Left accent bar */}
        <div className="absolute inset-y-0 left-0 w-2 bg-[#0b0b0b]" />

        {/* Content */}
        <div className="relative flex h-full flex-col px-12 py-8 md:px-16 md:py-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-black/10 bg-[#0b0b0b] text-white">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold tracking-tight text-zinc-950">
                  Harvesters Leadership Academy
                </p>
                <p className="text-xs text-zinc-400">Ministry Excellence Programme</p>
              </div>
            </div>
            <Award className="size-8 text-zinc-300" />
          </div>

          {/* Body */}
          <div className="mt-auto">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
              Certificate of Completion
            </p>
            <p className="font-heading mt-4 text-4xl font-light text-zinc-950 md:text-5xl">
              {recipientName}
            </p>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
              has successfully completed the course
            </p>
            <p className="font-heading mt-1 text-2xl font-semibold text-zinc-950 md:text-3xl">
              {course?.title ?? "Course"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {course?.category} · {course?.level}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-auto flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-400">Instructor</p>
              <p className="text-sm font-medium text-zinc-700">{course?.instructor_name}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs text-zinc-400">Date of issue</p>
              <p className="text-sm font-medium text-zinc-700">{issuedDate}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs text-zinc-400">Certificate number</p>
              <p className="font-mono text-xs font-semibold text-zinc-600">
                {certificate.certificate_number}
              </p>
            </div>
          </div>
        </div>

        {/* Verified badge */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <div className="flex size-20 flex-col items-center justify-center rounded-full border-4 border-zinc-100 bg-white shadow-sm">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
              Verified
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
