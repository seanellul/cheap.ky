"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode, Camera, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const hasScanned = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode("barcode-reader", {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
          ],
        });
        html5QrcodeRef.current = scanner;

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(viewfinderHeight * 0.4),
          }),
          aspectRatio: 1.5,
          disableFlip: true,
        };

        const onSuccess = (decodedText: string) => {
          if (hasScanned.current) return;
          hasScanned.current = true;
          if (navigator.vibrate) navigator.vibrate(100);
          onScan(decodedText);
          scanner.stop().catch(() => {});
        };

        const onFailure = () => {
          // No barcode found in frame — ignore
        };

        // Request high resolution for iOS WebKit which defaults to low res
        try {
          await scanner.start(
            {
              facingMode: { exact: "environment" },
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
            },
            scanConfig,
            onSuccess,
            onFailure
          );
        } catch {
          // Fallback: some devices reject exact facingMode or resolution constraints
          await scanner.start(
            { facingMode: "environment" },
            scanConfig,
            onSuccess,
            onFailure
          );
        }

        if (mounted) setStarting(false);
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Camera permission denied. Please allow camera access and try again.");
        } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
          setError("No camera found on this device.");
        } else {
          setError(`Could not start camera: ${msg}`);
        }
        setStarting(false);
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close scanner"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Header */}
      <div className="text-center mb-4 px-4">
        <div className="flex items-center justify-center gap-2 text-white mb-1">
          <ScanBarcode className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Scan a Barcode</h2>
        </div>
        <p className="text-white/60 text-sm">
          Point your camera at a product barcode to compare prices
        </p>
      </div>

      {/* Scanner viewport */}
      <div className="relative w-full max-w-sm mx-4">
        <div
          id="barcode-reader"
          ref={scannerRef}
          className="w-full rounded-2xl overflow-hidden bg-black"
        />

        {starting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl">
            <Camera className="h-10 w-10 text-white/40 mb-3" />
            <Loader2 className="h-5 w-5 text-white animate-spin mb-2" />
            <p className="text-white/60 text-sm">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl px-6">
            <Camera className="h-10 w-10 text-white/30 mb-3" />
            <p className="text-white/80 text-sm text-center">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Tip */}
      <p className="text-white/40 text-xs mt-4 px-4 text-center">
        Hold steady. Works with UPC, EAN, and most grocery barcodes.
      </p>
    </div>
  );
}
