"use client";
import { useState } from "react";

interface IconProps {
  /** query params for /api/icon, e.g. {art}, {gem,support}, {item}, {unique} */
  q: Record<string, string>;
  alt: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Resolves PoE2 art through the /api/icon proxy. On miss it degrades to a
 * labelled placeholder tile instead of a broken image.
 */
export default function Icon({ q, alt, size = 40, className = "", rounded }: IconProps) {
  const [failed, setFailed] = useState(false);
  const src = `/api/icon?${new URLSearchParams(q).toString()}`;
  const initials = alt
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (failed) {
    return (
      <div
        title={alt}
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        className={`flex items-center justify-center bg-ink-700 text-gold-300/80 ${
          rounded ? "rounded-full" : "rounded-md"
        } ${className}`}
      >
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`object-contain ${rounded ? "rounded-full" : "rounded-md"} ${className}`}
    />
  );
}
