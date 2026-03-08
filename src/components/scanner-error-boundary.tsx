"use client";

import { Component, type ReactNode } from "react";
import { X, Camera } from "lucide-react";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ScannerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
          <button
            onClick={this.props.onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close scanner"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center justify-center px-6 text-center">
            <Camera className="h-10 w-10 text-white/30 mb-3" />
            <p className="text-white/80 text-sm">
              Barcode scanner isn&apos;t available on this device or browser.
            </p>
            <button
              onClick={this.props.onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
