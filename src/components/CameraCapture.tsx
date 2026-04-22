import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Camera, X, Image as ImageIcon, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  onCapture: (dataUrl: string, mimeType: string) => void;
  onClose: () => void;
  onPickGallery: () => void;
}

/**
 * Full-screen in-app camera viewfinder built on the WebRTC mediaDevices API.
 *
 * Rendered through a React portal directly on document.body so it escapes the
 * `_app` layout (max-w-md container + sticky header + BottomNav). This makes
 * the viewfinder truly full-screen and prevents the bottom tab bar from
 * overlapping the shutter button.
 */
export function CameraCapture({ onCapture, onClose, onPickGallery }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while the viewfinder is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }, []);

  const startStream = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported on this device.");
      }
      // IMPORTANT: use plain `facingMode: "environment"` (NOT exact) so iOS
      // Safari falls back to the front camera instead of OverconstrainedError.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay can require a user gesture; ignore */
        });
      }
      setStreaming(true);
    } catch (err) {
      console.error("[camera] getUserMedia failed", err);
      const name = (err as { name?: string })?.name;
      let msg = "Could not access camera.";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        msg = "Camera permission denied. You can upload a photo from your gallery instead.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = "No suitable camera found. Try uploading from your gallery instead.";
      } else if (name === "NotReadableError") {
        msg = "Camera is in use by another app. Close it and try again.";
      }
      setError(msg);
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    void startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnap = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streaming) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      toast.error("Camera not ready yet — try again in a second.");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Could not capture photo on this device.");
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Free camera hardware immediately after capture.
    stopStream();
    onCapture(dataUrl, "image/jpeg");
  }, [streaming, stopStream, onCapture]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  const handleGallery = useCallback(() => {
    stopStream();
    onPickGallery();
  }, [stopStream, onPickGallery]);

  if (!mounted) return null;

  // High-contrast text shadow for overlay labels against arbitrary video bg.
  const textShadow = { textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)" };

  const ui = (
    <div
      className="fixed inset-0 flex flex-col bg-black"
      style={{ zIndex: 2147483647 }}
      role="dialog"
      aria-modal="true"
      aria-label="Camera viewfinder"
    >
      {/* Live video feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top letterbox bar (solid-ish for camera-app feel) */}
      <div className="relative z-10 flex items-center justify-between bg-black/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 active:scale-95"
          aria-label="Close camera"
        >
          <X className="h-5 w-5" />
        </button>
        <p
          className="text-base font-semibold tracking-wide text-white"
          style={textShadow}
        >
          Frame your plant
        </p>
        <div className="h-10 w-10" aria-hidden />
      </div>

      {/* Spacer that lets the video show through */}
      <div className="relative z-0 flex-1" />

      {/* Loading / error overlay */}
      {(starting || error) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6">
          <div className="pointer-events-auto max-w-sm rounded-2xl bg-background/95 p-5 text-center shadow-xl backdrop-blur">
            {starting && !error ? (
              <>
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Starting camera…</p>
              </>
            ) : (
              <>
                <Camera className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">{error}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button onClick={() => void startStream()} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </Button>
                  <Button onClick={handleGallery}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Upload from gallery
                  </Button>
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom letterbox + controls */}
      {!starting && !error && (
        <div
          className="relative z-10 flex items-center justify-between gap-4 bg-black/85 px-6 pt-5"
          style={{
            // 32px (2rem) clearance above any phone gesture inset.
            paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
          }}
        >
          <button
            type="button"
            onClick={handleGallery}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 active:scale-95"
            aria-label="Upload from gallery"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleSnap}
            disabled={!streaming}
            aria-label="Snap photo"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur transition-transform active:scale-95 disabled:opacity-50"
          >
            <span className="block h-14 w-14 rounded-full bg-white" />
          </button>

          <div className="h-12 w-12" aria-hidden />
        </div>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
