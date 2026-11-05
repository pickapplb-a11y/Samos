import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/account/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
