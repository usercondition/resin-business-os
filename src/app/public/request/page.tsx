import { redirect } from "next/navigation";

export default function LegacyPublicRequestRedirect() {
  redirect("/public/inquiry");
}
