/** Global SVG filter definitions — renders invisible, referenced by CSS classes. */
export function WobbleDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="wobble">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={2} seed={3} />
          <feDisplacementMap in="SourceGraphic" scale={1.6} />
        </filter>
        <filter id="wobble-strong">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={2.6} />
        </filter>
        <filter id="blob" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
    </svg>
  );
}
