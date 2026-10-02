"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DomainRadar } from "@/components/DomainRadar";
import {
  SCENARIOS,
  domainScores,
  level,
  questionsFor,
  rank,
  type Choice,
  type RankedTrait,
} from "@/lib/read";

interface ReadResult {
  ranked: RankedTrait[];
  headline: string;
  paragraphs: string[];
}

type Phase = "intro" | "scenarios" | "written" | "working" | "read";

/** Stagger helper: children arrive one after another rather than all at once. */
const delay = (i: number, step = 55) => ({ animationDelay: `${i * step}ms` });

export function TryFlow() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReadResult | null>(null);
  const [failed, setFailed] = useState(false);
  const firstOption = useRef<HTMLButtonElement>(null);

  const scenario = SCENARIOS[index];
  const questions = choices.length === SCENARIOS.length ? questionsFor(rank(choices)) : [];

  // Focus the first choice as each scenario lands. The group is labelled by the
  // question, so a screen reader hears the situation, then the first option.
  useEffect(() => {
    if (phase === "scenarios") firstOption.current?.focus();
  }, [phase, index]);

  const choose = useCallback(
    (optionIndex: number) => {
      setChoices((prev) => [
        ...prev.filter((c) => c.scenarioId !== scenario.id),
        { scenarioId: scenario.id, optionIndex },
      ]);
      if (index + 1 < SCENARIOS.length) setIndex(index + 1);
      else setPhase("written");
    },
    [index, scenario],
  );

  // 1-4 picks an option. The whole point is momentum.
  useEffect(() => {
    if (phase !== "scenarios") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= scenario.options.length) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, scenario, choose]);

  async function submit() {
    setPhase("working");
    setFailed(false);
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          choices,
          answers: questions.map((q) => ({ question: q, answer: drafts[q] ?? "" })),
        }),
      });
      if (!res.ok) throw new Error("failed");
      setResult(await res.json());
      setPhase("read");
    } catch {
      setFailed(true);
      setPhase("written");
    }
  }

  // One narrow column for the flow, a wider field only where there are two columns.
  // Without this the content hugs the left of an over-wide container.
  const shell = phase === "read" ? "max-w-[72rem]" : "max-w-[38rem] xl:max-w-[46rem]";

  return (
    <main className={`mx-auto flex w-full flex-1 flex-col px-6 py-10 sm:px-8 ${shell}`}>
      {phase === "intro" && (
        <section className="flex flex-1 flex-col justify-center gap-8">
          <p className="rise text-[0.9375rem] text-dim" style={delay(0)}>
            Twelve everyday moments
          </p>
          <h1
            className="rise font-display text-[clamp(2.25rem,4.4vw,4.25rem)] leading-[1.02] tracking-[-0.03em]"
            style={delay(1)}
          >
            Pick what you&rsquo;d actually do.
          </h1>
          <p className="rise text-[clamp(1.0625rem,1.1vw,1.25rem)] leading-relaxed text-dim" style={delay(2)}>
            No scales, no right answers. Takes about a minute, then you get one read
            back on what you&rsquo;re actually like.
          </p>
          <div className="rise" style={delay(3)}>
            <button
              type="button"
              onClick={() => setPhase("scenarios")}
              className="rounded-full bg-more px-8 py-3.5 font-display text-[1rem] text-base transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
            >
              Start
            </button>
          </div>
        </section>
      )}

      {phase === "scenarios" && (
        <section className="flex flex-1 flex-col gap-10">
          <div className="flex items-center gap-4">
            <div
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-edge"
              role="img"
              aria-label={`${index} of ${SCENARIOS.length} answered`}
            >
              <div
                className="h-full rounded-full bg-more transition-[width] duration-500 ease-out"
                style={{ width: `${(index / SCENARIOS.length) * 100}%` }}
              />
            </div>
            <span className="font-display text-[0.8125rem] tabular-nums text-dim">
              {index + 1}/{SCENARIOS.length}
            </span>
          </div>

          <div
            key={scenario.id}
            className="flex flex-1 flex-col justify-center gap-8"
            role="group"
            aria-labelledby={`q-${scenario.id}`}
          >
            <h1
              id={`q-${scenario.id}`}
              className="rise font-display text-[clamp(1.5rem,2.6vw,2.625rem)] leading-[1.1] tracking-[-0.02em]"
              style={delay(0)}
            >
              {scenario.prompt}
            </h1>

            <ul className="flex flex-col gap-2.5">
              {scenario.options.map((option, i) => (
                <li key={option.text} className="rise" style={delay(i + 1)}>
                  <button
                    ref={i === 0 ? firstOption : undefined}
                    type="button"
                    onClick={() => choose(i)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-edge bg-raised px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-more/60 hover:bg-raised/80 active:translate-y-0"
                  >
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-md border border-edge text-[0.75rem] tabular-nums text-dim transition-colors group-hover:border-more group-hover:bg-more group-hover:text-base"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[clamp(1rem,1.05vw,1.1875rem)] leading-snug">{option.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {phase === "written" && (
        <section className="flex flex-1 flex-col justify-center gap-8">
          <h1
            className="rise font-display text-[clamp(1.75rem,3vw,3rem)] leading-[1.05] tracking-[-0.025em]"
            style={delay(0)}
          >
            Two more, in your own words.
          </h1>
          <div className="grid gap-6">
            {questions.map((q, i) => (
              <label key={q} className="rise flex flex-col gap-2.5" style={delay(i + 1)}>
                <span className="text-[0.9375rem] leading-snug text-dim">{q}</span>
                <textarea
                  rows={4}
                  value={drafts[q] ?? ""}
                  maxLength={2000}
                  onChange={(e) => setDrafts((d) => ({ ...d, [q]: e.target.value }))}
                  placeholder="However much you feel like."
                  className="w-full resize-y rounded-xl border border-edge bg-raised px-4 py-3 text-[1rem] leading-relaxed text-text transition-colors placeholder:text-dim/50 hover:border-more/40"
                />
              </label>
            ))}
          </div>
          {failed && (
            <p role="alert" className="text-[0.9375rem] text-less">
              That didn&rsquo;t go through. Try again.
            </p>
          )}
          <div className="rise flex flex-wrap items-center gap-5" style={delay(3)}>
            <button
              type="button"
              onClick={submit}
              className="rounded-full bg-more px-8 py-3.5 font-display text-[1rem] text-base transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
            >
              Read me
            </button>
            <button
              type="button"
              onClick={submit}
              className="px-2 py-3 text-[0.9375rem] text-dim transition-colors hover:text-text"
            >
              Skip these
            </button>
          </div>
        </section>
      )}

      {phase === "working" && (
        <section className="flex flex-1 flex-col justify-center gap-6">
          <h1 className="font-display text-[clamp(1.75rem,3vw,3rem)] leading-[1.05] tracking-[-0.025em]">
            Reading it back.
          </h1>
          <div className="h-[3px] w-full max-w-[24rem] overflow-hidden rounded-full bg-edge">
            <div className="sweep h-full w-1/3 rounded-full bg-more" />
          </div>
        </section>
      )}

      {phase === "read" && result && <Read result={result} onRestart={() => {
        setChoices([]);
        setDrafts({});
        setResult(null);
        setIndex(0);
        setPhase("intro");
      }} />}
    </main>
  );
}

function Read({ result, onRestart }: { result: ReadResult; onRestart: () => void }) {
  // Bars grow from zero on arrival, so the ranking draws itself rather than appearing.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const domains = domainScores(result.ranked);
  const top = result.ranked[0];
  const bottom = result.ranked[result.ranked.length - 1];

  return (
    <section className="flex flex-1 flex-col gap-12 py-6">
      <div className="flex flex-col gap-3">
        <p className="rise text-[0.9375rem] text-dim" style={delay(0)}>
          Here&rsquo;s the read
        </p>
        <h1
          className="rise max-w-[20ch] font-display text-[clamp(2rem,3.6vw,4rem)] leading-[1.0] tracking-[-0.032em]"
          style={delay(1)}
        >
          {result.headline}
        </h1>
      </div>

      {/* The shape first, because it answers "where am I" before any reading. */}
      <div className="grid items-center gap-10 lg:grid-cols-[24rem_1fr] lg:gap-16">
        <div className="rise" style={delay(2)}>
          <DomainRadar domains={domains} />
        </div>

        <div className="flex flex-col gap-4">
          {result.paragraphs.map((p, i) => (
            <p
              key={p}
              className="rise max-w-[46ch] text-[clamp(1.0625rem,1.05vw,1.1875rem)] leading-relaxed"
              style={delay(i + 3)}
            >
              {p}
            </p>
          ))}
          <div className="rise flex flex-wrap gap-x-8 gap-y-2 pt-2 text-[0.875rem]" style={delay(6)}>
            <span className="text-dim">
              Most you <span className="text-more">{top.name}</span>
            </span>
            <span className="text-dim">
              Least you <span className="text-less">{bottom.name}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Then the detail: each domain opened up into the two facets under it. */}
      <div className="flex flex-col gap-4">
        <div className="rise flex flex-wrap items-center justify-between gap-x-8 gap-y-2" style={delay(7)}>
          <h2 className="text-[0.9375rem] text-dim">What sits under each one</h2>
          {/* The bars mean nothing without saying where they start from. */}
          <div className="flex items-center gap-3 text-[0.75rem] text-dim">
            <span className="text-less">less like you</span>
            <span className="relative h-[7px] w-24 rounded-full bg-edge/60">
              <span className="absolute left-1/2 top-[-3px] h-[13px] w-px -translate-x-1/2 bg-dim" />
            </span>
            <span className="text-more">more like you</span>
          </div>
        </div>
        <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain, i) => (
            <li
              key={domain.id}
              className="rise flex flex-col gap-2.5 rounded-xl border border-edge/70 bg-raised/50 p-4"
              style={delay(i + 8, 45)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[1.0625rem] leading-tight">{domain.name}</span>
                <span
                  className={`shrink-0 text-[0.75rem] ${
                    domain.score > 0.1 ? "text-more" : domain.score < -0.1 ? "text-less" : "text-dim"
                  }`}
                >
                  {level(domain.score)}
                </span>
              </div>
              <p className="text-[0.8125rem] leading-snug text-dim">{domain.blurb}</p>

              <div className="mt-1 flex flex-col gap-2">
                {domain.facets.map((facet) => {
                  const more = facet.score > 0.02;
                  const less = facet.score < -0.02;
                  return (
                    <div key={facet.id} className="flex flex-col gap-1.5">
                      <span className="text-[0.8125rem] leading-tight text-text/85">{facet.name}</span>
                      {/* Bars start at the midpoint, so the tick has to be legible. */}
                      <div className="relative h-[7px] w-full rounded-full bg-edge/60">
                        <span className="absolute left-1/2 top-[-3px] h-[13px] w-px -translate-x-1/2 bg-dim" />
                        <div
                          className={`absolute top-0 h-full rounded-full transition-[width] duration-700 ease-out ${
                            more ? "bg-more" : less ? "bg-less" : "bg-dim/60"
                          }`}
                          style={{
                            width: grown ? `${Math.max(Math.abs(facet.score) * 50, 1.5)}%` : "0%",
                            left: more ? "50%" : undefined,
                            right: more ? undefined : "50%",
                            transitionDelay: `${300 + i * 60}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-fit px-2 py-3 text-[0.9375rem] text-dim transition-colors hover:text-text"
      >
        Start over
      </button>
    </section>
  );
}
