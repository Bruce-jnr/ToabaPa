import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(active, { onEscape, allowEscape = true } = {}) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const onEscapeRef = useRef(onEscape);
  const allowEscapeRef = useRef(allowEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    allowEscapeRef.current = allowEscape;
  }, [allowEscape, onEscape]);

  useEffect(() => {
    if (!active) return undefined;

    triggerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const container = containerRef.current;
    const focusable = () =>
      Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
        (element) => !element.hasAttribute("hidden"),
      );
    const first = focusable()[0] || container;
    window.requestAnimationFrame(() => first?.focus());

    function handleKeyDown(event) {
      if (event.key === "Escape" && allowEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        container?.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const trigger = triggerRef.current;
      window.requestAnimationFrame(() => trigger?.focus?.());
    };
  }, [active]);

  return containerRef;
}
