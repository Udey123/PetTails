"use client";

import { usePathname } from "next/navigation";
import { Nav, isFloatNav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <Nav />
      <main className={isFloatNav(pathname) ? "main-float" : undefined}>{children}</main>
      <Footer />
    </>
  );
}
