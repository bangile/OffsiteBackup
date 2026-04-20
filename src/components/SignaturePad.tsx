import React, { useEffect, useRef } from 'react';
import SignaturePadStatic from 'signature_pad';
import { Button } from './ui/button';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadStatic | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePadStatic(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });

      const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const canvas = canvasRef.current!;
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')?.scale(ratio, ratio);
        signaturePadRef.current?.clear();
      };

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    onClear?.();
  };

  const handleSave = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    const dataUrl = signaturePadRef.current?.toDataURL();
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 cursor-crosshair touch-none"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
        >
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
