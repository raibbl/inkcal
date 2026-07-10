export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-white text-black">
      <h1 className="text-2xl font-bold">inkcal</h1>
      <p className="text-sm text-neutral-600">
        Backend is running. Device feed: <code>/api/calendar.bmp</code>
      </p>
    </main>
  );
}
