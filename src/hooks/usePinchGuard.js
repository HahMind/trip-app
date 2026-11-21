import { useEffect } from "react";

export default function usePinchGuard() {
  useEffect(() => {
    const preventPinchTouch = (event) => {
      if (event.touches?.length > 1) event.preventDefault();
    };
    const preventSafariGesture = (event) => event.preventDefault();

    document.addEventListener("touchmove", preventPinchTouch, { passive: false });
    document.addEventListener("gesturestart", preventSafariGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventSafariGesture, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", preventPinchTouch);
      document.removeEventListener("gesturestart", preventSafariGesture);
      document.removeEventListener("gesturechange", preventSafariGesture);
    };
  }, []);
}
