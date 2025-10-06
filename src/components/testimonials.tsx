"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  logo?: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Synergon AI transformed our workflows. Studio plus Omnidesk means customers feel supported while our teams automate the repetitive work.",
    name: "Alessandra Ruiz",
    role: "VP of Operations, Latticewave",
    company: "Latticewave",
    logo: "/logos/latticewave.svg",
  },
  {
    quote:
      "RevPulse gives us pipeline clairvoyance. Forecasting accuracy went from guesswork to a science backed by realtime signals.",
    name: "Noah Bennett",
    role: "Chief Revenue Officer, FluxBase",
    company: "FluxBase",
    logo: "/logos/fluxbase.svg",
  },
  {
    quote:
      "Global tenant governance used to cripple rollout speed. Synergon AI's multi-tenant controls let us ship securely, everywhere.",
    name: "Priya Desai",
    role: "CTO, Northwind Systems",
    company: "Northwind Systems",
    logo: "/logos/northwind.svg",
  },
  {
    quote:
      "Our go-to-market pods finally stay in sync. Playbooks adapt in real time so the team hits goals without living in dashboards.",
    name: "Maya Chen",
    role: "Head of Customer Experience, AeroSpark",
    company: "AeroSpark",
  },
  {
    quote:
      "Launch risk dropped overnight. Compliance guardrails trigger automatically, letting product focus on shipping value fast.",
    name: "Elliot Graves",
    role: "Director of Product, Meridian Labs",
    company: "Meridian Labs",
  },
];

const CARD_GAP = 24; // px gap between cards
const CARD_HEIGHT = 360; // px height for consistent card sizing
const AUTO_SCROLL_SPEED = 24; // px per second for the marquee

export function Testimonials() {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const hoverShadow =
    theme === "dark"
      ? "0 32px 120px rgba(0, 0, 0, 0.45)"
      : "0 28px 68px rgba(20, 24, 35, 0.28)";
  const overlayGradient =
    theme === "dark"
      ? "radial-gradient(circle at top left, rgba(201, 99, 66, 0.22), transparent 65%)"
      : "radial-gradient(circle at top left, rgba(253, 173, 120, 0.16), transparent 65%)";
  const canLoop = testimonials.length > 1;
  const loopedTestimonials = canLoop
    ? [...testimonials, ...testimonials]
    : testimonials;
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const translateRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; translate: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const boundedCardWidth = (() => {
    if (containerWidth === 0) return 0;
    const raw = (containerWidth - CARD_GAP * 2) / 3;
    const clamped = Math.min(Math.max(raw, 260), 360);
    return Number.isFinite(clamped) ? Math.round(clamped) : 0;
  })();

  const cardWidthForMotion = boundedCardWidth || 320;
  const slideDistance = cardWidthForMotion + CARD_GAP;
  const totalScrollDistance = slideDistance * testimonials.length;

  const applyTranslate = useCallback(
    (value: number) => {
      if (!trackRef.current) return;

      if (!canLoop || totalScrollDistance <= 0) {
        translateRef.current = 0;
        trackRef.current.style.transform = "translateX(0px)";
        return;
      }

      const normalized =
        ((value % totalScrollDistance) + totalScrollDistance) % totalScrollDistance;
      translateRef.current = normalized;
      trackRef.current.style.transform = `translateX(-${normalized}px)`;
    },
    [canLoop, totalScrollDistance]
  );

  useEffect(() => {
    if (!canLoop || prefersReducedMotion) {
      applyTranslate(0);
    }
  }, [applyTranslate, canLoop, prefersReducedMotion]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !canLoop ||
      prefersReducedMotion ||
      isPaused ||
      slideDistance <= 0
    ) {
      return;
    }

    let lastTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const delta = timestamp - lastTimestamp;
        const distance = (delta / 1000) * AUTO_SCROLL_SPEED;
        applyTranslate(translateRef.current + distance);
      }
      lastTimestamp = timestamp;
      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimestamp = null;
    };
  }, [applyTranslate, canLoop, prefersReducedMotion, isPaused, slideDistance]);

  useEffect(() => {
    if (!trackRef.current) return;
    if (!canLoop) {
      applyTranslate(0);
      return;
    }
    applyTranslate(translateRef.current);
  }, [applyTranslate, canLoop]);

  const handlePause = () => {
    if (!canLoop) return;
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!canLoop) return;
    setIsPaused(false);
  };

  const releasePointer = (target: Element | null) => {
    if (pointerIdRef.current !== null && target) {
      const element = target as HTMLElement;
      if (typeof element.releasePointerCapture === "function" && element.hasPointerCapture?.(pointerIdRef.current)) {
        element.releasePointerCapture(pointerIdRef.current);
      }
    }
    pointerIdRef.current = null;
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canLoop) return;
    handlePause();
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    pointerStartRef.current = {
      x: event.clientX,
      translate: translateRef.current,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    event.preventDefault();
    const deltaX = event.clientX - pointerStartRef.current.x;
    applyTranslate(pointerStartRef.current.translate - deltaX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    releasePointer(event.currentTarget);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    releasePointer(event.currentTarget);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId === pointerIdRef.current) {
      releasePointer(event.currentTarget);
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!canLoop) return;
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (dominantDelta === 0) return;
    handlePause();
    event.preventDefault();
    applyTranslate(translateRef.current + dominantDelta);
  };

  const handleStep = (direction: -1 | 1) => {
    if (!canLoop || slideDistance <= 0) return;
    handlePause();
    applyTranslate(translateRef.current + direction * slideDistance);
  };

  return (
    <section
      className="relative scroll-mt-32 py-28"
      style={{ background: "var(--section-gradient)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: overlayGradient }}
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-5">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-magenta)]/60 bg-card/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-foreground/70">
            Loved by Teams Everywhere
          </span>
          <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-foreground">
            Customer stories that keep scaling
          </h2>
        </motion.div>

        <div className="-mx-5 md:mx-0">
          <div
            ref={containerRef}
            className={`relative overflow-hidden bg-card px-5 py-3 ${
              canLoop
                ? isDragging
                  ? "cursor-grabbing select-none"
                  : "cursor-grab"
                : ""
            }`}
            aria-live="polite"
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
            onFocusCapture={handlePause}
            onBlurCapture={handleResume}
            onTouchStart={handlePause}
            onTouchEnd={handleResume}
            onTouchCancel={handleResume}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerLeave}
            onWheel={handleWheel}
          >
            {canLoop ? (
              <>
                <button
                  type="button"
                  className="pointer-events-auto absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-card/80 p-2 text-foreground shadow-md backdrop-blur transition hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--surface-magenta)] md:flex"
                  aria-label="Scroll testimonials left"
                  onClick={() => handleStep(-1)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M15 5L9 12l6 7" />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  className="pointer-events-auto absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-card/80 p-2 text-foreground shadow-md backdrop-blur transition hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--surface-magenta)] md:flex"
                  aria-label="Scroll testimonials right"
                  onClick={() => handleStep(1)}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M9 5l6 7-6 7" />
                    </svg>
                  </span>
                </button>
              </>
            ) : null}
            <div className="relative">
              <div
                ref={trackRef}
                className="flex will-change-transform"
                role="list"
                style={{
                  gap: `${CARD_GAP}px`,
                  transform: "translateX(0px)",
                }}
              >
                {loopedTestimonials.map((testimonial, index) => (
                  <motion.article
                    key={`${testimonial.name}-${index}`}
                    whileHover={{ y: -8, boxShadow: hoverShadow }}
                    className="relative flex h-full flex-shrink-0 overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)] backdrop-blur-xl transition-transform duration-300"
                    style={{
                      width: `${cardWidthForMotion}px`,
                      minWidth: `${cardWidthForMotion}px`,
                      maxWidth: "360px",
                      height: `${CARD_HEIGHT}px`,
                      minHeight: `${CARD_HEIGHT}px`,
                    }}
                    role="listitem"
                  >
                    <CardContent testimonial={testimonial} />
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CardContent({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        {testimonial.logo ? (
          <div className="relative h-8 w-24">
            <Image
              src={testimonial.logo}
              alt={`${testimonial.company} logo`}
              fill
              className="object-contain"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="flex h-8 items-center rounded-full bg-card/60 px-4 text-xs font-semibold uppercase tracking-[0.32em] text-foreground/70">
            {testimonial.company}
          </div>
        )}
        <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.28em] text-foreground/70">
          Case Study
        </span>
      </div>
      <p className="mt-6 flex-1 text-base leading-relaxed text-foreground/80">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="mt-6">
        <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
        <p className="text-xs text-foreground/60">{testimonial.role}</p>
      </div>
    </div>
  );
}
