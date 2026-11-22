export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-4 py-2">
      <div className="h-4 w-32 rounded-full bg-paper-deep" />
      <div className="h-11 w-3/4 rounded-xl bg-paper-deep" />
      <div className="h-28 rounded-card bg-paper-deep" />
      <div className="h-52 rounded-card bg-paper-deep" />
    </div>
  );
}
