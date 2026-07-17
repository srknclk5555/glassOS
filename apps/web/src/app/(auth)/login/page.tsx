"use client";

import { useRouter } from "next/navigation";
import { LoginPage } from "@repo/ui";

export default function LoginRoute() {
  const router = useRouter();

  return (
    <LoginPage
      onForgotPassword={() => {
        /* TODO: wire up forgot-password flow */
      }}
      onLoginSuccess={() => router.push("/")}
    />
  );
}