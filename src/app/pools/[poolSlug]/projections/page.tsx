import { redirect } from "next/navigation";

type ProjectionsPageProps = {
  params: Promise<{ poolSlug: string }>;
};

export default async function ProjectionsPage({ params }: ProjectionsPageProps) {
  const { poolSlug } = await params;
  redirect(`/pools/${poolSlug}?standings=projection#leaderboard`);
}
