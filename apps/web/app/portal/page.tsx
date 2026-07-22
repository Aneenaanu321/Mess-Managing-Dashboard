"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/quotations");
  }, [router]);

  return null;
}
