import { redirect } from "next/navigation";

type LeaderboardPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { poolSlug } = await params;
  redirect(`/pools/${poolSlug}`);
}
