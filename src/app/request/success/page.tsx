import { redirect } from "next/navigation";

export default function LegacyRequestSuccessRedirect() {
  redirect("/request");
}
