"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Megaphone,
  Users,
} from "lucide-react";
import { CommsShell } from "@/components/comms/comms-shell";
import { cn } from "@/lib/utils";
import {
  fetchMessageDetail,
  markMessageRead,
  SCOPE_LABELS,
  PRIORITY_LABELS,
  priorityColor,
  statusColor,
  scopeColor,
  timeAgo,
  type CommMessage,
} from "@/lib/comms";

type Analytics = {
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  open_rate: number;
};

type Detail = {
  message: CommMessage;
  analytics: Analytics | null;
  is_sender: boolean;
};

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  );
}

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    fetchMessageDetail(id).then((data) => {
      if (!active) return;
      if (!data) {
        setNotFound(true);
      } else {
        setDetail(data as Detail);
        markMessageRead(id);
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [id]);

  return (
    <CommsShell>
      <div className="space-y-4">
        {/* Back link */}
        <Link
          href="/dashboard/comms/announcements"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" />
          All announcements
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
              <div className="h-5 w-16 rounded-full bg-zinc-100" />
            </div>
            <div className="h-6 w-2/3 rounded bg-zinc-100" />
            <div className="h-3 w-1/3 rounded bg-zinc-100" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="h-3 w-full rounded bg-zinc-100" />
              <div className="h-3 w-4/5 rounded bg-zinc-100" />
              <div className="h-3 w-3/5 rounded bg-zinc-100" />
            </div>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-20 text-center">
            <Megaphone className="size-10 text-zinc-200" />
            <p className="mt-3 text-sm font-medium text-zinc-500">Announcement not found</p>
            <p className="mt-1 text-xs text-zinc-400">
              This announcement may have been removed or you may not have access.
            </p>
          </div>
        ) : detail ? (
          <>
            {/* Message card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
              {/* Badges */}
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className={statusColor(detail.message.status)}>
                  {detail.message.status}
                </Badge>
                <Badge className={priorityColor(detail.message.priority)}>
                  {PRIORITY_LABELS[detail.message.priority]}
                </Badge>
                <Badge className={scopeColor(detail.message.audience_scope)}>
                  {SCOPE_LABELS[detail.message.audience_scope]}
                </Badge>
              </div>

              {/* Title */}
              <h2 className="font-heading text-2xl font-semibold text-zinc-950">
                {detail.message.title}
              </h2>

              {/* Meta */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>
                  From{" "}
                  <span className="font-medium text-zinc-600">
                    {detail.message.sender_role}
                  </span>
                </span>
                {detail.message.sent_at ? (
                  <span>Sent {timeAgo(detail.message.sent_at)}</span>
                ) : (
                  <span>Created {timeAgo(detail.message.created_at)}</span>
                )}
              </div>

              <div className="my-5 border-t border-zinc-100" />

              {/* Body */}
              <p className="text-sm leading-7 text-zinc-700 whitespace-pre-wrap">
                {detail.message.body}
              </p>

              {/* CTA */}
              {detail.message.cta_label && detail.message.cta_url && (
                <div className="mt-6">
                  <a
                    href={detail.message.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    {detail.message.cta_label} →
                  </a>
                </div>
              )}
            </div>

            {/* Delivery analytics — senders and admins only */}
            {detail.is_sender && detail.analytics && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "Recipients", value: detail.analytics.recipient_count, icon: Users },
                  { label: "Delivered", value: detail.analytics.delivered_count, icon: CheckCircle2 },
                  { label: "Read", value: detail.analytics.read_count, icon: Eye },
                  { label: "Open rate", value: `${detail.analytics.open_rate}%`, icon: Eye },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <p className="text-xl font-bold text-zinc-950">{s.value}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </CommsShell>
  );
}
