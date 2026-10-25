'use client';

import confetti from 'canvas-confetti';

export function triggerTaskCompletionConfetti() {
  if (typeof window === 'undefined') return;

  // Multi-burst celebration for ACID transaction payout settlement
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Emerald, Gold, Cyan palette representing academic achievement & financial payout
  const colors = ['#10b981', '#38bdf8', '#fbbf24', '#ffffff'];

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors,
  });
  fire(0.2, {
    spread: 60,
    colors,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors,
  });
}
