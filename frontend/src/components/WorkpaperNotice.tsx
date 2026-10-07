export function WorkpaperNotice({ loading, saving, error, saved, status }: {
  loading: boolean; saving: boolean; error: string; saved: boolean; status: string;
}) {
  return <div aria-live="polite" className="rounded-lg border bg-white p-3 text-sm">
    {error ? <p role="alert" className="text-red-700">{error}</p>
      : loading ? "Loading database workpaper..."
        : saving ? "Saving to database..."
          : saved ? `Database workpaper saved — ${status}.`
            : "Unsaved workpaper changes."}
  </div>;
}
