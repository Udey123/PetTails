"use client";

import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
