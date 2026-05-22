"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, ExternalLink } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUserCertificates } from "@/lib/lms";
import type { LMSCertificate } from "@/lib/lms-types";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<LMSCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCertificates()
      .then(setCertificates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell searchPlaceholder="Search certificates..." showDate={false}>
      <motion.section
        variants={shellItem}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        <div className="p-6 md:p-8">
          <Badge className="mb-5 rounded-md border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-50">
            Certificates
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            My Certificates
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-500">
            Your earned credentials from Harvesters Leadership Academy ministry courses.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Certificates earned", value: certificates.length, detail: "verified credentials" },
              { label: "Courses completed", value: certificates.length, detail: "lifetime completions" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                <p className="font-heading mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{stat.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={shellItem}>
        <Card className="rounded-xl border-zinc-200 bg-white shadow-sm">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="font-heading text-lg font-semibold text-zinc-950">
              Earned certificates
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {loading ? "Loading..." : certificates.length === 0 ? "No certificates earned yet." : `${certificates.length} certificate${certificates.length !== 1 ? "s" : ""}`}
            </p>
          </CardHeader>
          <CardContent className="pt-1">
            {loading ? (
              <div className="py-8 text-center text-sm text-zinc-400">Loading certificates...</div>
            ) : certificates.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-zinc-100">
                  <Award className="size-6 text-zinc-400" />
                </div>
                <p className="font-heading font-semibold text-zinc-950">No certificates yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Complete 90% of a course and pass its assessment to earn a certificate.
                </p>
                <Button asChild className="mt-5 rounded-lg bg-black text-white hover:bg-zinc-800">
                  <Link href="/courses">Browse courses</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 py-1">
                {certificates.map((cert) => (
                  <CertCard key={cert.id} certificate={cert} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </DashboardShell>
  );
}

function CertCard({ certificate }: { certificate: LMSCertificate }) {
  const course = certificate.course;
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg hover:shadow-zinc-200/70">
      {/* Thumbnail stripe */}
      {course?.thumbnail_url ? (
        <div
          className="h-24 bg-cover bg-center"
          style={{ backgroundImage: `url(${course.thumbnail_url})` }}
        >
          <div className="h-full w-full bg-gradient-to-r from-black/70 to-black/10" />
        </div>
      ) : (
        <div className="h-24 bg-[#0b0b0b]" />
      )}

      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {course?.category ? (
              <Badge className="rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-100">
                {course.category}
              </Badge>
            ) : null}
            <p className="font-heading mt-2 font-semibold leading-snug text-zinc-950">
              {course?.title ?? "Course"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Award className="size-5" />
          </div>
        </div>
        <p className="text-sm text-zinc-500">Issued {issuedDate}</p>
        <p className="font-mono mt-1 text-xs text-zinc-400">{certificate.certificate_number}</p>

        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" className="rounded-lg bg-black text-white hover:bg-zinc-800">
            <Link href={`/courses/${course?.slug ?? ""}/certificate`}>
              <ExternalLink className="size-3.5" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
