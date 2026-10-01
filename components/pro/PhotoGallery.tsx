'use client';

import { useState } from 'react';

/**
 * Photos for projects without a 3D model: one large frame and a thumbnail strip. Until photos
 * are uploaded to public/projects/<id>/photos/, an empty frame says where they go.
 */
export default function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  if (!photos.length)
    return (
      <div className="gallery empty">
        <div className="gallery-frame">
          <span className="gallery-mark" aria-hidden>
            ▢
          </span>
          <b>Photos coming soon</b>
          <span className="muted small">{title}</span>
        </div>
      </div>
    );
  const cur = photos[Math.min(i, photos.length - 1)];
  return (
    <div className="gallery">
      <div className="gallery-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur} alt={`${title} — photo ${i + 1} of ${photos.length}`} />
      </div>
      {photos.length > 1 && (
        <div className="gallery-thumbs" role="group" aria-label="Choose a photo">
          {photos.map((p, n) => (
            <button key={p} aria-pressed={n === i} aria-label={`Photo ${n + 1}`} onClick={() => setI(n)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
