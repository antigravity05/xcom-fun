export default function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-accent-secondary" />
      </div>
    </div>
  );
}
