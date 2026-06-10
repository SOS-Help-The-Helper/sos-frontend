"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Resource detail lives in the directory module, which already renders the full
// resource view (status, capacity, matches, asset events). Forward there so the
// /cases/resource/[id] route stays a stable typed entry point without duplicating it.
export default function ResourceRedirect() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/app/directory/resource/${id}`);
  }, [id, router]);

  return null;
}
