import { redirect } from "next/navigation";

export default function CommsRootPage() {
  redirect("/dashboard/comms/announcements");
}
