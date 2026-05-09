import React from 'react';

/**
 * Dynamic book cover generator component.
 * Creates visually appealing, colorful covers from metadata
 * when no real cover image is available.
 */

interface BookCoverProps {
  title: string;
  subtitle?: string;
  type?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

// Curated color palettes for medical subjects — each is [bg, accent, text]
const PALETTES: [string, string, string][] = [
  ['#1a237e', '#42a5f5', '#ffffff'],  // Deep blue
  ['#0d47a1', '#29b6f6', '#ffffff'],  // Royal blue
  ['#004d40', '#26a69a', '#ffffff'],  // Teal
  ['#1b5e20', '#66bb6a', '#ffffff'],  // Green
  ['#b71c1c', '#ef5350', '#ffffff'],  // Red
  ['#880e4f', '#ec407a', '#ffffff'],  // Pink
  ['#4a148c', '#ab47bc', '#ffffff'],  // Purple
  ['#311b92', '#7c4dff', '#ffffff'],  // Indigo
  ['#e65100', '#ff9800', '#ffffff'],  // Orange
  ['#263238', '#78909c', '#ffffff'],  // Slate
  ['#3e2723', '#8d6e63', '#ffffff'],  // Brown
  ['#006064', '#00bcd4', '#ffffff'],  // Cyan
];

// Deterministic hash from string to pick consistent colors per title
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(title: string): string {
  const words = title.replace(/[-–—]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  // Skip common words
  const skip = new Set(['the', 'a', 'an', 'of', 'in', 'for', 'and', 'to', 'from', '-']);
  const meaningful = words.filter(w => !skip.has(w.toLowerCase()));
  if (meaningful.length === 0) return words[0]?.[0]?.toUpperCase() || '?';
  if (meaningful.length === 1) return meaningful[0].substring(0, 2).toUpperCase();
  return (meaningful[0][0] + meaningful[1][0]).toUpperCase();
}

// Get a short display title (first 2-3 words)
function getShortTitle(title: string): string {
  // Remove publisher suffix like "- ELSEVIER", "- SPRINGER"
  const clean = title.replace(/\s*[-–]\s*(ELSEVIER|SPRINGER|WILEY|OXFORD|THIEME|JAYPEE|CBS).*$/i, '').trim();
  const words = clean.split(/\s+/);
  if (words.length <= 3) return clean;
  return words.slice(0, 3).join(' ');
}

function getPublisher(title: string): string {
  const match = title.match(/[-–]\s*(ELSEVIER|SPRINGER|WILEY|OXFORD|THIEME|JAYPEE|CBS|BIT101)\s*$/i);
  return match ? match[1].toUpperCase() : '';
}

const BookCover: React.FC<BookCoverProps> = ({
  title,
  subtitle,
  type = 'BOOK',
  width = 56,
  height = 72,
  style,
}) => {
  const hash = hashString(title);
  const palette = PALETTES[hash % PALETTES.length];
  const [bg, accent, textColor] = palette;
  const initials = getInitials(title);
  const shortTitle = getShortTitle(title);
  const publisher = getPublisher(title);

  const isVideo = type === 'VIDEO';

  // Scale factor based on size
  const scale = Math.min(width, height) / 72;
  const isLarge = width >= 100;

  // Decorative pattern variant
  const pattern = hash % 4;

  // ── VIDEO cover ──
  if (isVideo) {
    const playSize = Math.max(18, Math.min(width, height) * 0.35);
    return (
      <div
        style={{
          width,
          height,
          borderRadius: Math.max(4, 6 * scale),
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          background: `linear-gradient(135deg, ${bg} 0%, #0d0d1a 100%)`,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {/* Film-strip accent top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(3, 4 * scale),
          background: accent, opacity: 0.6,
        }} />
        {/* Film-strip accent bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.max(3, 4 * scale),
          background: accent, opacity: 0.6,
        }} />

        {/* Play button circle */}
        <div style={{
          width: playSize, height: playSize, borderRadius: '50%',
          background: `${accent}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 12px ${accent}40`,
          zIndex: 1,
        }}>
          {/* Play triangle */}
          <svg width={playSize * 0.45} height={playSize * 0.45} viewBox="0 0 24 24" fill={textColor}>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Title below play button (large covers only) */}
        {isLarge && (
          <div style={{
            marginTop: 8 * scale, fontSize: Math.max(9, 11 * scale), fontWeight: 600,
            color: `${textColor}dd`, textAlign: 'center', lineHeight: 1.2,
            padding: '0 8px', zIndex: 1,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {shortTitle}
          </div>
        )}

        {/* Small label */}
        {!isLarge && (
          <div style={{
            marginTop: 3 * scale, fontSize: Math.max(6, 7 * scale),
            color: accent, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', zIndex: 1,
          }}>
            VID
          </div>
        )}
      </div>
    );
  }

  // ── BOOK / other cover ──

  return (
    <div
      style={{
        width,
        height,
        borderRadius: Math.max(4, 6 * scale),
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        background: bg,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        ...style,
      }}
    >
      {/* Decorative accent pattern */}
      {pattern === 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: height * 0.35,
          background: `linear-gradient(135deg, ${accent}40 0%, ${accent}10 100%)`,
        }} />
      )}
      {pattern === 1 && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: height * 0.3,
          background: `linear-gradient(0deg, ${accent}30 0%, transparent 100%)`,
        }} />
      )}
      {pattern === 2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: width * 0.15,
          height: '100%',
          background: accent,
          opacity: 0.4,
        }} />
      )}
      {pattern === 3 && (
        <>
          <div style={{
            position: 'absolute', top: height * 0.15, left: '10%', right: '10%',
            height: 1, background: `${accent}50`,
          }} />
          <div style={{
            position: 'absolute', bottom: height * 0.15, left: '10%', right: '10%',
            height: 1, background: `${accent}50`,
          }} />
        </>
      )}

      {/* Content */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isLarge ? 12 : 4,
        zIndex: 1,
      }}>
        {isLarge ? (
          <>
            {/* Large cover: show short title + publisher */}
            <div style={{
              fontSize: Math.max(10, 13 * scale),
              fontWeight: 700,
              color: textColor,
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: 0.5,
              marginBottom: 6 * scale,
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {shortTitle}
            </div>
            {subtitle && (
              <div style={{
                fontSize: Math.max(8, 9 * scale),
                color: `${textColor}bb`,
                textAlign: 'center',
                lineHeight: 1.2,
                marginBottom: 4 * scale,
              }}>
                {subtitle}
              </div>
            )}
            {publisher && (
              <div style={{
                fontSize: Math.max(7, 8 * scale),
                color: accent,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginTop: 'auto',
              }}>
                {publisher}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Small cover: show initials */}
            <div style={{
              fontSize: Math.max(14, 20 * scale),
              fontWeight: 800,
              color: textColor,
              letterSpacing: 1,
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              lineHeight: 1,
            }}>
              {initials}
            </div>
            {/* Tiny type indicator */}
            <div style={{
              fontSize: Math.max(6, 7 * scale),
              color: accent,
              fontWeight: 600,
              marginTop: 2 * scale,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
              {type === 'EBOOK' || type === 'BOOK' ? 'BOOK' : type === 'VIDEO' ? 'VID' : type === 'MCQ' ? 'MCQ' : 'DOC'}
            </div>
          </>
        )}
      </div>

      {/* Spine edge effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: Math.max(2, 3 * scale),
        height: '100%',
        background: `linear-gradient(180deg, ${accent}60 0%, ${accent}20 100%)`,
        zIndex: 2,
      }} />
    </div>
  );
};

export default BookCover;
