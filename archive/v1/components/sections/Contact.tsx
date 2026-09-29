'use client';
import { useState } from 'react';
import { ChromaticText } from '@/components/playground/ChromaticText';
import { Magnetic } from './interactive';

export function Contact({
  title,
  intro,
  email,
  linkedin,
  github,
  resume,
}: {
  title: string;
  intro: string;
  email: string;
  linkedin: string;
  github: string;
  resume: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="contact-card" data-reveal>
      <h2 className="contact-title">
        <ChromaticText>{title}</ChromaticText>
      </h2>
      <p className="contact-intro">{intro}</p>
      <div className="contact-email">
        <a href={`mailto:${email}`}>{email}</a>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(email);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              window.location.href = `mailto:${email}`;
            }
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <div className="contact-links">
        <Magnetic>
          <a className="button button-primary" href={`mailto:${email}`}>
            Say hello
          </a>
        </Magnetic>
        <Magnetic>
          <a className="button" href={linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </Magnetic>
        <Magnetic>
          <a className="button" href={github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </Magnetic>
        <Magnetic>
          <a className="button" href={resume} target="_blank" rel="noreferrer">
            Résumé ↗
          </a>
        </Magnetic>
      </div>
    </div>
  );
}
