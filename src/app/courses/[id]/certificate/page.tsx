"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

import { DashboardShell, shellItem } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CertificateView } from "@/components/lms/certificate-view";
import { fetchCertificate } from "@/lib/lms";
import { getCurrentUserProfile } from "@/lib/auth";
import type { LMSCertificate } from "@/lib/lms-types";

type CertificatePageProps = {
  params: Promise<{ id: string }>;
};

export default function CertificatePage({ params }: CertificatePageProps) {
  const { id } = use(params);
  const [certificate, setCertificate] = useState<LMSCertificate | null>(null);
  const [recipientName, setRecipientName] = useState("Academy Leader");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCertificate(id), getCurrentUserProfile()])
      .then(([cert, auth]) => {
        setCertificate(cert);
        if (auth.profile?.fullName) setRecipientName(auth.profile.fullName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardShell searchPlaceholder="Search certificates..." showDate={false}>
      <motion.div variants={shellItem} className="flex items-center gap-4">
        <Button asChild variant="outline" className="rounded-lg border-zinc-200 bg-white">
          <Link href={`/courses/${id}/learn`}>
            <ArrowLeft className="size-4" />
            Back to course
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={shellItem}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-zinc-300" />
          </div>
        ) : certificate ? (
          <CertificateView certificate={certificate} recipientName={recipientName} />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <p className="font-heading text-xl font-semibold text-zinc-950">
              Certificate not yet earned
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Complete 90% or more of lessons and pass the assessment to earn your certificate.
            </p>
            <Button asChild className="mt-6 rounded-lg bg-black text-white hover:bg-zinc-800">
              <Link href={`/courses/${id}/learn`}>Continue learning</Link>
            </Button>
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
