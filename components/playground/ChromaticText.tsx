/**
 * STAND-IN for the Playground Original "Chromatic type".
 * Replace the body with the studio's code; keep the export name and props.
 */
import type { ReactNode } from 'react';

export function ChromaticText({
  as: Tag = 'span',
  children,
  className = '',
}: {
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3';
  children: ReactNode;
  className?: string;
}) {
  return <Tag className={`chromatic ${className}`}>{children}</Tag>;
}
