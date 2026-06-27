import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cropImageToWebP, loadImageFromFile } from '../utils/imageUtils.ts';

const MAX_ZOOM = 4;

interface Props {
  /** When non-null, the dialog is open and crops this file. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

interface Offset {
  x: number;
  y: number;
}

/**
 * Lets the user pan and zoom a selected image within a circular viewport before
 * uploading. Output is a 128×128 WebP matching the visible crop. Built on a
 * canvas rather than a library — the interaction is a single square crop.
 */
export function AvatarCropDialog({ file, onCancel, onConfirm }: Props): React.JSX.Element {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [viewport, setViewport] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // baseScale fits the image's shorter side exactly to the viewport at zoom 1,
  // so the image always covers the circle.
  const baseScale = img && viewport ? viewport / Math.min(img.naturalWidth, img.naturalHeight) : 1;

  function clampOffset(o: Offset, z: number): Offset {
    if (!img || !viewport) return o;
    const ds = baseScale * z;
    const dw = img.naturalWidth * ds;
    const dh = img.naturalHeight * ds;
    return {
      x: Math.min(0, Math.max(viewport - dw, o.x)),
      y: Math.min(0, Math.max(viewport - dh, o.y)),
    };
  }

  // Load the image whenever the file changes.
  useEffect(() => {
    if (!file) {
      setImg(null);
      return;
    }
    let cancelled = false;
    let objectURL: string | null = null;
    setError('');
    setSaving(false);
    loadImageFromFile(file)
      .then((image) => {
        objectURL = image.src;
        if (cancelled) {
          URL.revokeObjectURL(image.src);
          return;
        }
        setImg(image);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load that image. Try another.');
      });
    return () => {
      cancelled = true;
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [file]);

  // Measure the viewport once it's in the DOM and track resizes.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = (): void => setViewport(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  // Center the image and reset zoom whenever a new image or size is ready.
  useEffect(() => {
    if (!img || !viewport) return;
    const ds = baseScale;
    setZoom(1);
    setOffset({
      x: (viewport - img.naturalWidth * ds) / 2,
      y: (viewport - img.naturalHeight * ds) / 2,
    });
    // baseScale is derived from img + viewport, so those deps cover it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, viewport]);

  function applyZoom(next: number): void {
    if (!img || !viewport) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next));
    const c = viewport / 2;
    setOffset((prev) => {
      const oldDs = baseScale * zoom;
      const newDs = baseScale * clamped;
      // Keep whatever sits under the viewport center fixed while zooming.
      const imgX = (c - prev.x) / oldDs;
      const imgY = (c - prev.y) / oldDs;
      return clampOffset({ x: c - imgX * newDs, y: c - imgY * newDs }, clamped);
    });
    setZoom(clamped);
  }

  function onPointerDown(e: React.PointerEvent): void {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent): void {
    const d = drag.current;
    if (!d) return;
    setOffset(clampOffset({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }, zoom));
  }

  function onPointerUp(e: React.PointerEvent): void {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onWheel(e: React.WheelEvent): void {
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92));
  }

  async function handleConfirm(): Promise<void> {
    if (!img || !viewport) return;
    setSaving(true);
    setError('');
    try {
      const ds = baseScale * zoom;
      const blob = await cropImageToWebP(img, {
        sx: -offset.x / ds,
        sy: -offset.y / ds,
        size: viewport / ds,
      });
      await onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save photo');
      setSaving(false);
    }
  }

  const dispW = img ? img.naturalWidth * baseScale * zoom : 0;
  const dispH = img ? img.naturalHeight * baseScale * zoom : 0;

  return (
    <Dialog.Root
      open={file !== null}
      onOpenChange={(o) => {
        if (!o && !saving) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm
                     bg-white dark:bg-slate-800 shadow-2xl rounded-2xl flex flex-col gap-4 p-5
                     focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Adjust photo
          </Dialog.Title>

          {/* Crop viewport */}
          <div className="flex flex-col items-center gap-4">
            <div
              ref={viewportRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              className="relative w-64 max-w-full aspect-square overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900 touch-none cursor-grab active:cursor-grabbing select-none"
            >
              {img && (
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none pointer-events-none"
                  style={{
                    width: dispW,
                    height: dispH,
                    left: offset.x,
                    top: offset.y,
                  }}
                />
              )}
              <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/70" />
            </div>

            {/* Zoom slider */}
            <label className="flex items-center gap-3 w-64 max-w-full">
              <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value))}
                disabled={!img}
                aria-label="Zoom"
                className="w-full accent-nf-blue dark:accent-nf-blue-d cursor-pointer"
              />
            </label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Dialog.Close
              type="button"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-none disabled:opacity-50"
            >
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!img || saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save photo'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
