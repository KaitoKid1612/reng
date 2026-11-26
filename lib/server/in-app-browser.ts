import "server-only";

import { headers } from "next/headers";

import { isInAppBrowser } from "@/lib/in-app-browser";

export async function isRequestFromInAppBrowser() {
  return isInAppBrowser((await headers()).get("user-agent"));
}
