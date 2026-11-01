import { useCallback, useEffect, useState } from "react";

import { isDocumentFullscreen, toggleDocumentFullscreen } from "./fullscreenUtils";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(isDocumentFullscreen);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isDocumentFullscreen());
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    await toggleDocumentFullscreen();
  }, []);

  return { isFullscreen, toggleFullscreen };
}
