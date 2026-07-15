"use client";

import Image from "next/image";
import { ArrowUpRight, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/illustrations/poolwaffle-sign-up-launch.png",
    imagePosition: "object-[63%_50%]",
    kicker: "Set up your format",
    title: "Create a pool with clear rules and a clear deadline.",
    description:
      "Choose the format, define scoring, and invite participants with one shareable link.",
  },
  {
    image: "/illustrations/poolwaffle-sign-in-community.png",
    imagePosition: "object-[61%_50%]",
    kicker: "Collect picks online",
    title: "Give every participant one place to submit and review picks.",
    description:
      "Participants can submit before the lock time and return to see their entry and standing.",
  },
  {
    image: "/illustrations/poolwaffle-sign-up-standings.png",
    imagePosition: "object-[62%_50%]",
    kicker: "Share standings",
    title: "Keep scores and standings visible as results are recorded.",
    description:
      "Public pool pages give participants a consistent place to follow the leaderboard.",
  },
] as const;

export function SignUpValueCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6200);

    return () => window.clearInterval(interval);
  }, [paused]);

  const activeSlide = slides[activeIndex];

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <Image
          key={slide.image}
          src={slide.image}
          alt="Friends building and enjoying a sports pool together"
          fill
          priority={index === 0}
          sizes="(min-width: 1280px) 53vw, 48vw"
          className={`object-cover transition-opacity duration-700 ${slide.imagePosition} ${
            index === activeIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-linear-to-b from-[#160a2d]/90 via-[#2d1651]/30 to-[#160a2d]/88" />

      <div className="relative flex h-full flex-col justify-between p-8 pt-20 xl:p-10 xl:pt-24">
        <div className="max-w-[26rem]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white uppercase backdrop-blur-sm">
            <Trophy className="size-3.5 text-[#b3e802]" aria-hidden="true" />
            {activeSlide.kicker}
          </div>
          <h2 className="mt-5 font-heading text-4xl leading-[1.02] text-white xl:text-5xl">
            {activeSlide.title}
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-6 text-white/78">
            {activeSlide.description}
          </p>
        </div>

        <div className="flex items-end justify-between gap-6">
          <p className="max-w-44 text-sm font-medium leading-5 text-white/82">
            Built for setup, entry collection, scoring, and standings.
          </p>
          <div className="flex items-center gap-2" aria-label="Sign-up value stories">
            {slides.map((slide, index) => (
              <button
                key={slide.kicker}
                type="button"
                aria-label={`Show story ${index + 1}: ${slide.kicker}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`grid size-9 place-items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3e802] ${
                  index === activeIndex
                    ? "border-[#b3e802] bg-[#b3e802] text-black"
                    : "border-white/25 bg-black/18 text-white hover:border-white/70 hover:bg-white/12"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="text-xs font-bold">0{index + 1}</span>
              </button>
            ))}
            <ArrowUpRight className="ml-1 size-4 text-[#b3e802]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
