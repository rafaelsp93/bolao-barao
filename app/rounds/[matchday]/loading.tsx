export default function RoundLoading() {
  return (
    <section className="animate-pulse">
      <div className="mb-3 h-4 w-24 rounded bg-panel-2" />
      <div className="mb-5 h-9 w-44 rounded bg-panel-2" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="led-panel h-44 p-4">
            <div className="flex justify-between">
              <div className="h-3 w-24 rounded bg-line" />
              <div className="h-3 w-20 rounded bg-line" />
            </div>
            <div className="mt-8 h-8 rounded bg-panel-2" />
            <div className="mt-8 h-12 rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </section>
  );
}
