import type { DomainScore } from "@/lib/read";

// Wider than tall: corner labels sit outside the ring and need room to the sides.
const W = 440;
const H = 350;
const CX = W / 2;
const CY = 164;
const R = 104;
const LABEL_GAP = 26;
/** -1..1 never collapses to a dot: the floor keeps a low shape readable. */
const FLOOR = 0.22;

/** Radius for a -1..1 score. 0 lands exactly on the "your average" ring. */
const radiusFor = (score: number) => R * (FLOOR + ((score + 1) / 2) * (1 - FLOOR));
const AVERAGE_R = radiusFor(0);

/** 0-100, where 50 is your own average. */
export const asHundred = (score: number) => Math.round(((score + 1) / 2) * 100);

function point(i: number, count: number, radius: number) {
  const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
  return [CX + Math.cos(angle) * radius, CY + Math.sin(angle) * radius] as const;
}

const path = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + "Z";

/**
 * Five domains, one shape. The dashed ring is the reference: outside it is above your
 * own average, inside it is below. Without that ring the shape has nothing to mean
 * anything against.
 */
export function DomainRadar({ domains }: { domains: DomainScore[] }) {
  const n = domains.length;
  const shape = domains.map((d, i) => point(i, n, radiusFor(d.score)));

  return (
    <figure className="flex flex-col items-center gap-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Your five domains, where 50 is your own average: ${domains
          .map((d) => `${d.name} ${asHundred(d.score)}`)
          .join(", ")}`}
      >
        {[0.45, 0.72, 1].map((ring) => (
          <path
            key={ring}
            d={path(domains.map((_, i) => point(i, n, R * ring)))}
            fill="none"
            stroke="var(--color-edge)"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {domains.map((d, i) => {
          const [x, y] = point(i, n, R);
          return (
            <line key={d.id} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--color-edge)" strokeWidth={1} opacity={0.5} />
          );
        })}

        {/* The anchor: your own average. */}
        <path
          d={path(domains.map((_, i) => point(i, n, AVERAGE_R)))}
          fill="none"
          stroke="var(--color-dim)"
          strokeWidth={1.25}
          strokeDasharray="3 4"
          opacity={0.85}
        />

        <path
          d={path(shape)}
          fill="var(--color-more)"
          fillOpacity={0.2}
          stroke="var(--color-more)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {shape.map(([x, y], i) => (
          <circle key={domains[i].id} cx={x} cy={y} r={3.5} fill="var(--color-more)" />
        ))}

        {domains.map((d, i) => {
          const [x, y] = point(i, n, R + LABEL_GAP);
          const anchor = x > CX + 2 ? "start" : x < CX - 2 ? "end" : "middle";
          return (
            <text key={d.id} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={13.5}>
              <tspan fill="var(--color-text)">{d.name}</tspan>
              <tspan fill="var(--color-more)" dx={6} fontSize={12.5}>
                {asHundred(d.score)}
              </tspan>
            </text>
          );
        })}
      </svg>

      <figcaption className="flex flex-col gap-1.5 text-[0.8125rem] leading-snug text-dim">
        <span className="flex items-center gap-2">
          <svg width="22" height="2" aria-hidden="true" className="shrink-0">
            <line x1="0" y1="1" x2="22" y2="1" stroke="var(--color-dim)" strokeWidth="1.5" strokeDasharray="3 4" />
          </svg>
          Your own average, which is 50
        </span>
        <span>Outside that ring is more like you, inside is less. Nobody else is in this picture.</span>
      </figcaption>
    </figure>
  );
}
