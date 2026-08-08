import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';

import DecisionDesk from './decision-desk';
import OpenSpread from './open-spread';
import StartingPointEngine from './starting-point-engine';
import RoomAndPeople from './room-and-people';
import CoastalInterval from './coastal-interval';

/**
 * The comparison surface for the Phase 1 design tournament.
 *
 * Emil's prototype principle, and the reason this exists rather than five
 * separate URLs mailed over one at a time: eliminate terminal memory design.
 * Nobody can hold what candidate three looked like in their head while looking
 * at candidate five, and a reviewer forced to do that ends up choosing the one
 * they saw most recently rather than the one that is best.
 *
 * So the switcher is persistent, the candidate under it swaps in place, and the
 * dials for each are on screen while you look at it. The dials matter because
 * they are the assigned spread that forced the five apart: if the density 7
 * candidate and the density 2 candidate do not look obviously different with
 * the labels covered, the tournament failed to diverge and the weaker one gets
 * rebuilt rather than presented.
 *
 * This shell is scaffolding for the decision, not part of the product. It is
 * excluded from the sitemap, carries noindex, and comes out when a winner is
 * chosen.
 */

export const CANDIDATES = [
  {
    slug: 'decision-desk',
    number: 1,
    name: 'The Decision Desk',
    principle: 'The homepage as a decision environment',
    dials: { variance: 5, motion: 3, density: 7 },
    Component: DecisionDesk,
  },
  {
    slug: 'open-spread',
    number: 2,
    name: 'The Open Spread',
    principle: 'The homepage as an editorial story',
    dials: { variance: 7, motion: 4, density: 3 },
    Component: OpenSpread,
  },
  {
    slug: 'starting-point-engine',
    number: 3,
    name: 'The Starting Point Engine',
    principle: 'The homepage as guided self selection',
    dials: { variance: 6, motion: 6, density: 4 },
    Component: StartingPointEngine,
  },
  {
    slug: 'room-and-people',
    number: 4,
    name: 'The Room, The People',
    principle: 'The homepage as documentary evidence of place and humanity',
    dials: { variance: 8, motion: 5, density: 2 },
    Component: RoomAndPeople,
  },
  {
    slug: 'coastal-interval',
    number: 5,
    name: 'The Coastal Interval',
    principle: 'The homepage as atmospheric spatial rhythm, without coastal cliche',
    dials: { variance: 9, motion: 7, density: 2 },
    Component: CoastalInterval,
  },
];

function Switcher({ active }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: '#0C0C0B',
        borderBottom: '1px solid #2a2a27',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ color: '#8E867A', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Phase 1 tournament
        </span>
        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CANDIDATES.map((candidate) => {
            const current = candidate.slug === active;
            return (
              <Link
                key={candidate.slug}
                to={`/tournament/${candidate.slug}`}
                style={{
                  padding: '5px 10px',
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  background: current ? '#A5543B' : 'transparent',
                  color: current ? '#E8E1D6' : '#8E867A',
                  border: `1px solid ${current ? '#A5543B' : '#2a2a27'}`,
                }}
              >
                {candidate.number}. {candidate.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Meta({ candidate }) {
  const { variance, motion, density } = candidate.dials;
  return (
    <div style={{ background: '#242321', borderBottom: '1px solid #2a2a27', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span style={{ color: '#E8E1D6', fontSize: 13 }}>{candidate.principle}</span>
        <span style={{ color: '#8E867A', fontSize: 12 }}>
          variance {variance} · motion {motion} · density {density}
        </span>
      </div>
    </div>
  );
}

export function TournamentIndex() {
  return <Navigate to={`/tournament/${CANDIDATES[0].slug}`} replace />;
}

export default function TournamentShell() {
  const { slug } = useParams();
  const candidate = CANDIDATES.find((entry) => entry.slug === slug);

  if (!candidate) return <Navigate to={`/tournament/${CANDIDATES[0].slug}`} replace />;

  const { Component } = candidate;

  return (
    <div>
      <Switcher active={candidate.slug} />
      <Meta candidate={candidate} />
      <Component />
    </div>
  );
}
