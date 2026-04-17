import { redirect } from "next/navigation";

export default function LegacyPublicRequestSuccessRedirect() {
  redirect("/public/inquiry/success");
}
