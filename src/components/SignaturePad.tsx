import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string) => void;
  initialDataUrl?: string;
  signerName: string;
  onSignerNameChange?: (name: string) => void;
  documentNumber?: string;
  onDocumentNumberChange?: (doc: string) => void;
  documentLabel?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  onSave,
  initialDataUrl,
  signerName,
  onSignerNameChange,
  documentNumber,
  onDocumentNumberChange,
  documentLabel = 'CPF / Documento',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(initialDataUrl));
  const [penColor, setPenColor] = useState('#1e3a8a'); // Professional dark navy ink

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = penColor;

    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, penColor]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onSave('');
  };

  return (
    <div id={`sigpad-container-${label.replace(/\s+/g, '-').toLowerCase()}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
            <PenTool className="w-3.5 h-3.5 text-amber-950" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">{label}</h4>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={clearCanvas}
            id={`btn-clear-${label.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 transition-colors font-medium"
          >
            <Eraser className="w-3 h-3" />
            Limpar
          </button>
        </div>
      </div>

      <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-slate-50 touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-32 cursor-crosshair block"
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
            <PenTool className="w-5 h-5 mb-1 opacity-40 text-slate-400" />
            <p className="text-xs font-medium">Assine com o dedo ou mouse aqui</p>
          </div>
        )}
        <div className="absolute bottom-2.5 left-4 pointer-events-none">
          <div className="w-44 border-b border-slate-300"></div>
          <span className="text-[9px] text-slate-400">Linha de assinatura</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div>
          <label className="block text-slate-600 mb-1 font-bold">Nome do Assinante:</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => onSignerNameChange?.(e.target.value)}
            placeholder="Nome Completo"
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-400 text-xs text-slate-800"
          />
        </div>
        {documentNumber !== undefined && (
          <div>
            <label className="block text-slate-600 mb-1 font-bold">{documentLabel}:</label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => onDocumentNumberChange?.(e.target.value)}
              placeholder="000.000.000-00 ou Registro"
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-400 text-xs text-slate-800"
            />
          </div>
        )}
      </div>
    </div>
  );
};
