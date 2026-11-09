import { Toaster as SonnerToaster } from "sonner";

export function Toast() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        className:
          "font-sans font-medium text-sm rounded-2xl border-2 border-border bg-surface-1 text-text-primary shadow-xl p-4 gap-3",
        style: {
          borderRadius: "1rem",
        },
      }}
    />
  );
}

export { toast } from "sonner";

