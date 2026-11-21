export default function ModalShell({
  children,
  onClose,
  backdropClassName = "bg-gray-950/70",
  panelClassName = "",
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${backdropClassName}`}
      style={{ touchAction: "pan-x pan-y" }}
      onClick={onClose}
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl ${panelClassName}`}
        style={{ touchAction: "pan-x pan-y" }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
