"use client";

import { useRouter } from "next/navigation";
import { Error403 } from "@repo/ui";

export default function UnauthorizedPage() {
  const router = useRouter();
  return <Error403 onGoHome={() => router.push("/")} />;
}
