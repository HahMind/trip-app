import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const THEMES = [
  { id: "dark", color: "#111827", label: "ธีมเขียวดำ", transform: "translate(-8px, -132px)" },
  { id: "light", color: "#55423d", label: "ธีม Brown", transform: "translate(-74px, -112px)" },
  { id: "purple", color: "#ff8ba7", label: "ธีมครีม-คอรัล", transform: "translate(-126px, -70px)" },
  { id: "pink", color: "#fec7d7", label: "ธีมชมพู", transform: "translate(-166px, -10px)" },
];

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const closeMenu = () => setOpen(false);
    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("scroll", closeMenu, { passive: true });
    window.addEventListener("touchmove", closeMenu, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("touchmove", closeMenu);
    };
  }, [open]);

  return (
    <div
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 h-14 w-14"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {THEMES.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => {
            setTheme(option.id);
            setOpen(false);
          }}
          className="absolute bottom-0 right-0 h-11 w-11 rounded-full border-2 border-white/80 shadow-lg transition-all duration-300"
          style={{
            backgroundColor: option.color,
            transform: open ? option.transform : "translate(0, 0) scale(0)",
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
          }}
          title={option.label}
          aria-label={option.label}
        />
      ))}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="absolute bottom-0 right-0 flex h-14 w-14 items-center justify-center rounded-full border border-lime-400/40 bg-lime-400 text-gray-950 shadow-xl transition-all duration-200 hover:scale-105"
        aria-label="เปลี่ยนธีม"
      >
        <Palette size={24} />
      </button>
    </div>
  );
}
