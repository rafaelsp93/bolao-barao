export default function Loading() {
  return (
    <section className="animate-pulse">
      <div className="mb-5 h-4 w-36 rounded bg-panel-2" />
      <div className="mb-6 h-9 w-56 rounded bg-panel-2" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="led-panel h-24 p-4">
            <div className="h-3 w-28 rounded bg-line" />
            <div className="mt-5 h-6 rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
