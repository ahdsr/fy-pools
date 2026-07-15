import Image from "next/image";
import Link from "next/link";
import { ChartNoAxesCombined, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { BrandWordmark } from "@/components/app/brand";
import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: ReactNode;
  footerCopy?: string;
  panelTitle: string;
  panelDescription: string;
  rightPanel?: ReactNode;
  centerContent?: boolean;
};

const benefits = [
  {
    icon: <UsersRound className="size-4" aria-hidden="true" />,
    label: "Invite your crew",
  },
  {
    icon: <Trophy className="size-4" aria-hidden="true" />,
    label: "Make every pick count",
  },
  {
    icon: <ChartNoAxesCombined className="size-4" aria-hidden="true" />,
    label: "Follow the action live",
  },
];

export function AuthSplitLayout({
  children,
  eyebrow,
  title,
  description,
  footerCopy,
  panelTitle,
  panelDescription,
  rightPanel,
  centerContent = false,
}: AuthSplitLayoutProps) {
  return (
    <main className="grid min-h-[100dvh] bg-surface-paper lg:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.05fr)]">
      <section
        className={cn(
          "flex min-w-0 flex-col px-6 py-6 sm:px-10 sm:py-8 lg:min-h-[100dvh] lg:px-[clamp(3rem,7vw,8.5rem)] lg:py-[clamp(2.5rem,6vh,5.75rem)]",
          centerContent && "lg:relative",
        )}
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <BrandWordmark />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to home
          </Link>
        </div>

        <div
          className={cn(
            "mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-14 md:max-w-[34rem] md:py-16 lg:mx-0 lg:max-w-[26rem] lg:py-8",
            centerContent &&
              "lg:absolute lg:inset-0 lg:mx-0 lg:max-w-none lg:items-center lg:justify-center lg:px-8 lg:py-0",
          )}
        >
          <div className={cn("w-full", centerContent && "lg:max-w-[26rem]")}>
            <p className="mb-3 text-sm font-semibold tracking-[0.08em] text-brand-hot uppercase">
              {eyebrow}
            </p>
            <h1 className="font-heading text-4xl leading-[0.98] text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-sm text-[0.9375rem] leading-6 text-muted-foreground">
              {description}
            </p>

            <div className="mt-8 border-t border-border pt-7 sm:mt-10">
              {children}
            </div>
          </div>
        </div>

        {footerCopy ? (
          <p className="relative z-10 hidden text-xs leading-5 text-muted-foreground lg:block">
            {footerCopy}
          </p>
        ) : null}
      </section>

      <aside className="relative hidden overflow-hidden bg-[#1d102f] p-5 lg:z-10 lg:-ml-12 lg:block lg:rounded-l-[3.5rem] xl:p-7">
        <div className="relative h-full min-h-[42rem] overflow-hidden rounded-[1.8rem] bg-[#2d1651] shadow-2xl">
          <BrandWordmark
            variant="light"
            className="absolute top-8 left-8 z-20 xl:top-10 xl:left-10"
          />
          {rightPanel ?? (
            <DefaultAuthPanel
              panelTitle={panelTitle}
              panelDescription={panelDescription}
            />
          )}
        </div>
      </aside>
    </main>
  );
}

function DefaultAuthPanel({
  panelTitle,
  panelDescription,
}: Pick<AuthSplitLayoutProps, "panelTitle" | "panelDescription">) {
  return (
    <>
      <Image
        src="/illustrations/poolwaffle-sign-in-community.png"
        alt="Friends enjoying game day and comparing their pool brackets"
        fill
        priority
        sizes="(min-width: 1280px) 53vw, 48vw"
        className="object-cover object-[61%_50%]"
      />
      <div className="absolute inset-0 bg-linear-to-b from-[#2d1651]/88 via-[#2d1651]/26 to-[#170d28]/82" />

      <div className="relative flex h-full flex-col justify-between p-8 pt-20 xl:p-10 xl:pt-24">
        <div className="max-w-[25rem]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white uppercase backdrop-blur-sm">
            <Trophy className="size-3.5 text-[#b3e802]" aria-hidden="true" />
            Better pools, together
          </div>
          <h2 className="mt-5 max-w-sm font-heading text-4xl leading-[1.02] text-white xl:text-5xl">
            {panelTitle}
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-6 text-white/78">
            {panelDescription}
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-2.5 xl:gap-3">
          {benefits.map((benefit) => (
            <Benefit key={benefit.label} {...benefit} />
          ))}
        </div>
      </div>
    </>
  );
}

function Benefit({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-white/16 bg-black/18 p-3.5 text-white backdrop-blur-sm xl:p-4">
      <div className="grid size-8 place-items-center rounded-xl bg-[#b3e802] text-black">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold leading-5 text-white">{label}</p>
    </div>
  );
}
