// Re-mounts on navigation: gives every route a soft entrance transition.
// Opacity only — a transform here would become the containing block for position:fixed children (studio, overlays).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fadeIn">{children}</div>;
}
