function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main>
      <Sk className="h-9 w-64" />
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Sk className="h-28" /><Sk className="h-28" /><Sk className="h-28" /><Sk className="h-28" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Sk className="h-72 lg:col-span-3" />
        <Sk className="h-72 lg:col-span-2" />
      </div>
    </main>
  );
}
