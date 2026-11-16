interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
