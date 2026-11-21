import { useRef, useState } from "react";

export default function useSwipeDrag({
  id,
  isOpen,
  setOpen,
  canDrag = true,
}) {
  const [drag, setDrag] = useState({
    active: false,
    startX: 0,
    startY: 0,
    offset: 0,
    scrolling: false,
  });
  const isMouse = useRef(false);
  const suppressClick = useRef(false);

  let currentOffset = isOpen ? -70 : 0;
  if (drag.active) {
    currentOffset = (isOpen ? -70 : 0) + drag.offset;
    currentOffset = Math.max(-90, Math.min(0, currentOffset));
  }

  const startDrag = (clientX, clientY) => {
    if (!canDrag) return;
    setDrag({
      active: true,
      startX: clientX,
      startY: clientY,
      offset: 0,
      scrolling: false,
    });
    if (!isOpen) setOpen(null);
  };

  const moveDrag = (clientX, clientY) => {
    if (!drag.active) return;
    const diffX = clientX - drag.startX;
    const diffY = Math.abs(clientY - drag.startY);

    if (!drag.scrolling && diffY > 15 && Math.abs(diffX) < 15) {
      setDrag((previous) => ({ ...previous, scrolling: true }));
      return;
    }
    if (!drag.scrolling) {
      setDrag((previous) => ({ ...previous, offset: diffX }));
    }
  };

  const endDrag = () => {
    if (!drag.active) return;
    suppressClick.current = Math.abs(drag.offset) > 5;
    isMouse.current = false;

    if (!drag.scrolling) {
      const baseOffset = isOpen ? -70 : 0;
      if (baseOffset + drag.offset < -35) setOpen(id);
      else setOpen(null);
    }

    setDrag({
      active: false,
      startX: 0,
      startY: 0,
      offset: 0,
      scrolling: false,
    });
  };

  const touchHandlers = {
    onTouchStart: (event) =>
      startDrag(
        event.targetTouches[0].clientX,
        event.targetTouches[0].clientY,
      ),
    onTouchMove: (event) =>
      moveDrag(
        event.targetTouches[0].clientX,
        event.targetTouches[0].clientY,
      ),
    onTouchEnd: endDrag,
  };

  const mouseHandlers = {
    onMouseDown: (event) => {
      isMouse.current = true;
      startDrag(event.clientX, event.clientY);
    },
    onMouseMove: (event) => {
      if (isMouse.current) moveDrag(event.clientX, event.clientY);
    },
    onMouseUp: () => {
      if (isMouse.current) endDrag();
    },
    onMouseLeave: () => {
      if (isMouse.current) endDrag();
    },
  };

  const consumeSuppressedClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  return {
    drag,
    currentOffset,
    isSwiped: currentOffset < -5,
    consumeSuppressedClick,
    touchHandlers,
    mouseHandlers,
  };
}
