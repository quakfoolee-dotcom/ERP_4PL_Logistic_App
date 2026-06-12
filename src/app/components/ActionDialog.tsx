import { useState } from "react";
import { X } from "lucide-react";

type PendingDialog =
  | {
      kind: "prompt";
      title: string;
      message?: string;
      defaultValue?: string;
      resolve: (value: string | null) => void;
    }
  | {
      kind: "confirm";
      title: string;
      message?: string;
      resolve: (value: boolean) => void;
    };

export function useActionDialog() {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const [value, setValue] = useState("");

  function promptDialog(title: string, options: { message?: string; defaultValue?: string } = {}) {
    setValue(options.defaultValue ?? "");
    return new Promise<string | null>((resolve) => {
      setPending({ kind: "prompt", title, message: options.message, defaultValue: options.defaultValue, resolve });
    });
  }

  function confirmDialog(title: string, options: { message?: string } = {}) {
    return new Promise<boolean>((resolve) => {
      setPending({ kind: "confirm", title, message: options.message, resolve });
    });
  }

  function close(result: string | boolean | null) {
    if (!pending) return;
    pending.resolve(result as never);
    setPending(null);
    setValue("");
  }

  const ActionDialog = () => {
    if (!pending) return null;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4" onClick={() => close(pending.kind === "confirm" ? false : null)}>
        <div
          className="w-full max-w-md rounded-xl border bg-card shadow-2xl"
          style={{ borderColor: "var(--border)" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{pending.title}</div>
              {pending.message && <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{pending.message}</div>}
            </div>
            <button onClick={() => close(pending.kind === "confirm" ? false : null)} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: "var(--muted-foreground)" }}>
              <X size={16} />
            </button>
          </div>

          {pending.kind === "prompt" && (
            <div className="px-5 py-4">
              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") close(value.trim());
                  if (event.key === "Escape") close(null);
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--input-background)" }}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => close(pending.kind === "confirm" ? false : null)} className="rounded-lg border px-4 py-2 text-xs hover:bg-muted" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              Cancel
            </button>
            <button onClick={() => close(pending.kind === "prompt" ? value.trim() : true)} className="rounded-lg px-4 py-2 text-xs" style={{ background: "var(--primary)", color: "white", fontWeight: 600 }}>
              {pending.kind === "confirm" ? "Confirm" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { promptDialog, confirmDialog, ActionDialog };
}
