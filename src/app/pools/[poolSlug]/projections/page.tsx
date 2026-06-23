"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProjectionsPage() {
  const params = useParams<{ poolSlug: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/pools/${params.poolSlug}?standings=projection#leaderboard`);
  }, [params.poolSlug, router]);

  return null;
}
