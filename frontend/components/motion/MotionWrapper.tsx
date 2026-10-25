'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function MotionFadeIn({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 16,
  style,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div style={style} className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerContainer({
  children,
  staggerDelay = 0.08,
  style,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div style={style} className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div style={style} className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
}
