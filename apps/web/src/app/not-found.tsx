"use client";

import { useRouter } from "next/navigation";
import { Error404 } from "@repo/ui";

export default function NotFound() {
  const router = useRouter();
  return <Error404 onGoHome={() => router.push("/")} />;
}
