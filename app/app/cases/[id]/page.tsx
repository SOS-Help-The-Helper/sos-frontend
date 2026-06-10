"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Legacy route. Case detail now lives under typed sub-routes
// (/app/cases/sos/[id], /app/cases/request/[id], /app/cases/resource/[id]).
// Old links here assumed a SOS umbrella, so forward there for backward compat.
export default function LegacyCaseRedirect() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/app/cases/sos/${id}`);
  }, [id, router]);

  return null;
}
