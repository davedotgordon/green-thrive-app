import { useEffect, useRef, useState, useCallback } from "react";
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
 * We deliberately avoid `<input type="file" capture="environment">` because on
 * Android the OS often evicts the background browser tab while the native
 * camera app is open, and the `change` event never fires when the user
 * returns. Streaming directly to a <video> element keeps the page alive.
 */
export function CameraCapture({ onCapture, onClose, onPickGallery }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Close camera"
        >
          <X className="h-6 w-6" />
        </Button>
        <p className="text-sm font-medium text-white/90">Frame your plant</p>
        <div className="w-10" />
      </div>

      {/* Loading / error overlay */}
      {(starting || error) && (
        <div className="relative z-10 flex flex-1 items-center justify-center px-6">
          <div className="max-w-sm rounded-2xl bg-background/95 p-5 text-center shadow-xl backdrop-blur">
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

      {/* Bottom controls */}
      {!starting && !error && (
        <div className="relative z-10 mt-auto flex items-center justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGallery}
            className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
            aria-label="Upload from gallery"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <button
            type="button"
            onClick={handleSnap}
            disabled={!streaming}
            aria-label="Snap photo"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur transition-transform active:scale-95 disabled:opacity-50"
          >
            <span className="block h-14 w-14 rounded-full bg-white" />
          </button>

          <div className="h-12 w-12" />
        </div>
      )}
    </div>
  );
}
