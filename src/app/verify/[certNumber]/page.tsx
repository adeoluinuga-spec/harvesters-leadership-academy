import { createClient } from "@/lib/server";
import { Award, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ certNumber: string }>;
};

type CertRow = {
  id: string;
  certificate_number: string;
  issued_at: string;
  user_id: string;
};

type UserRow = { full_name: string | null };
type CourseRow = { title: string; category: string; level: string };

export default async function VerifyCertificatePage({ params }: Props) {
  const { certNumber } = await params;
  const decoded = decodeURIComponent(certNumber);

  const supabase = await createClient();

  const { data: cert } = await supabase
    .from("certificates")
    .select("id, certificate_number, issued_at, user_id, course_id")
    .eq("certificate_number", decoded)
    .maybeSingle<CertRow & { course_id: string }>();

  let recipientName: string | null = null;
  let course: CourseRow | null = null;

  if (cert) {
    const [userRes, courseRes] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", cert.user_id).maybeSingle<UserRow>(),
      supabase
        .from("courses")
        .select("title, category, level")
        .eq("id", cert.course_id)
        .maybeSingle<CourseRow>(),
    ]);
    recipientName = userRes.data?.full_name ?? null;
    course = courseRes.data ?? null;
  }

  const issuedDate = cert
    ? new Date(cert.issued_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f9f9f7] flex flex-col items-center justify-center p-6">
      {/* Ministry header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <p className="font-semibold text-zinc-950 text-sm">Harvesters Leadership Academy</p>
          <p className="text-xs text-zinc-400">Certificate Verification</p>
        </div>
      </div>

      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {cert ? (
          <>
            {/* Verified header */}
            <div className="border-b border-zinc-100 bg-emerald-50 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                    Verified Certificate
                  </p>
                  <p className="font-heading mt-1 text-xl font-semibold text-zinc-950">
                    This certificate is authentic
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate details */}
            <div className="px-8 py-6 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Awarded to
                </p>
                <p className="font-heading mt-1 text-2xl font-light text-zinc-950">
                  {recipientName ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Course</p>
                <p className="mt-1 text-base font-semibold text-zinc-900">
                  {course?.title ?? "—"}
                </p>
                {course && (
                  <p className="text-sm text-zinc-500">
                    {course.category} · {course.level}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                    Date of issue
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-700">{issuedDate}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                    Certificate number
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-zinc-700">
                    {cert.certificate_number}
                  </p>
                </div>
              </div>

              {/* Ministry seal */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <Award className="size-6 shrink-0 text-zinc-400" />
                <p className="text-xs text-zinc-500">
                  Issued by <span className="font-semibold text-zinc-700">Harvesters International Christian Centre</span> through the Leadership Academy Ministry Excellence Programme.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Not found */}
            <div className="border-b border-zinc-100 bg-red-50 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                  <XCircle className="size-7" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
                    Not Found
                  </p>
                  <p className="font-heading mt-1 text-xl font-semibold text-zinc-950">
                    Certificate not recognised
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-3">
              <p className="text-sm text-zinc-500">
                No certificate matching{" "}
                <span className="font-mono font-semibold text-zinc-800">{decoded}</span> was found in
                our records. Please check the certificate number and try again.
              </p>
              <p className="text-xs text-zinc-400">
                If you believe this is an error, contact the academy at{" "}
                <span className="font-medium text-zinc-600">academy@harvesters.org.ng</span>.
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-100 px-8 py-4">
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← Return to Harvesters Leadership Academy
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-400 text-center max-w-sm">
        This verification page confirms that the certificate was issued by Harvesters Leadership Academy
        and that the holder completed the stated course.
      </p>
    </div>
  );
}
