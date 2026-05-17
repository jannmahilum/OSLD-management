import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
// React needed for JSX in component arrays
import React from "react";
import { renderAsync } from "docx-preview";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Pen,
  Type,
  Eraser,
  Trash2,
  Undo2,
  Minus,
  Plus,
  Square,
  Circle,
  Save,
  CheckCircle,
} from "lucide-react";
// PDF.js loaded dynamically from CDN
const PDFJS_VERSION = "3.11.174";
let pdfjsLib: any = null;

async function getPDFJS() {
  if (pdfjsLib) return pdfjsLib;
  // @ts-ignore
  const mod = await import(
    /* @vite-ignore */
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
  );
  // globalThis.pdfjsLib is set by the UMD script
  pdfjsLib = (globalThis as any).pdfjsLib || mod;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
  return pdfjsLib;
}

type Tool = "pen" | "text" | "eraser" | "rectangle" | "circle" | "line";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: Tool;
  page: number; // 1-based page number
  points?: Point[];
  x?: number;
  y?: number;
  text?: string;
  color: string;
  size: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
}

const PDF_SCALE = 1.5;

interface FileAnnotationViewerProps {
  url: string;
  fileName: string;
  submissionId?: string;
  /** If true, annotation mode is activated immediately on open */
  initialAnnotateMode?: boolean;
  /** Called after annotations are successfully saved to DB */
  onAnnotationSaved?: () => void;
  onSaveAnnotation?: (dataUrl: string) => void;
  /** If true, hides the annotation toolbar — viewer only shows existing annotations */
  readOnly?: boolean;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#000000"];

// ─── Draw helper (shared by per-page canvas and image layer) ─────────────────

function drawAnnotations(ctx: CanvasRenderingContext2D, annots: Annotation[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  annots.forEach((ann) => {
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    if (ann.type === "pen" && ann.points && ann.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (ann.type === "eraser" && ann.points && ann.points.length > 1) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = ann.size * 4;
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (ann.type === "text" && ann.x !== undefined && ann.y !== undefined && ann.text) {
      ctx.font = `${ann.size * 5 + 10}px sans-serif`;
      ctx.fillText(ann.text, ann.x, ann.y);
    } else if (ann.type === "rectangle" && ann.x !== undefined && ann.y !== undefined && ann.width !== undefined && ann.height !== undefined) {
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
    } else if (ann.type === "circle" && ann.x !== undefined && ann.y !== undefined && ann.width !== undefined && ann.height !== undefined) {
      ctx.beginPath();
      ctx.ellipse(ann.x + ann.width / 2, ann.y + ann.height / 2, Math.abs(ann.width / 2), Math.abs(ann.height / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ann.type === "line" && ann.x !== undefined && ann.y !== undefined && ann.endX !== undefined && ann.endY !== undefined) {
      ctx.beginPath();
      ctx.moveTo(ann.x, ann.y);
      ctx.lineTo(ann.endX, ann.endY);
      ctx.stroke();
    }
  });
}

// ─── Per-page annotation canvas ─────────────────────────────────────────────

interface PageAnnotationCanvasProps {
  pageNumber: number;
  width: number;
  height: number;
  annotations: Annotation[];
  annotationMode: boolean;
  tool: Tool;
  color: string;
  brushSize: number;
  onAnnotationAdded: (ann: Annotation) => void;
  onTextRequest: (pos: Point, page: number) => void;
}

function PageAnnotationCanvas({
  pageNumber, width, height, annotations, annotationMode,
  tool, color, brushSize, onAnnotationAdded, onTextRequest,
}: PageAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentRef = useRef<Annotation | null>(null);

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.page === pageNumber),
    [annotations, pageNumber]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) drawAnnotations(ctx, pageAnnotations);
  }, [pageAnnotations]);

  const getLocalPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationMode) return;
    e.preventDefault();
    const pos = getLocalPos(e);
    if (tool === "text") { onTextRequest(pos, pageNumber); return; }
    currentRef.current = {
      id: Date.now().toString(), type: tool, page: pageNumber,
      color, size: brushSize,
      points: tool === "pen" || tool === "eraser" ? [pos] : undefined,
      x: pos.x, y: pos.y,
    };
    isDrawingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentRef.current || !annotationMode) return;
    e.preventDefault();
    const pos = getLocalPos(e);
    const cur = currentRef.current;
    if (tool === "pen" || tool === "eraser") {
      currentRef.current = { ...cur, points: [...(cur.points || []), pos] };
    } else if (tool === "rectangle" || tool === "circle") {
      currentRef.current = { ...cur, width: pos.x - (cur.x || 0), height: pos.y - (cur.y || 0) };
    } else if (tool === "line") {
      currentRef.current = { ...cur, endX: pos.x, endY: pos.y };
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawAnnotations(ctx, [...pageAnnotations, currentRef.current]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current || !currentRef.current) return;
    onAnnotationAdded(currentRef.current);
    isDrawingRef.current = false;
    currentRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={annotationMode ? "cursor-crosshair" : "pointer-events-none"}
      style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        opacity: annotationMode ? 1 : pageAnnotations.length > 0 ? 0.9 : 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

// ─── Single PDF page ──────────────────────────────────────────────────────────

interface PdfPageProps {
  pdf: any; // PDFDocumentProxy
  pageNumber: number;
  scale: number;
  annotations: Annotation[];
  annotationMode: boolean;
  tool: Tool;
  color: string;
  brushSize: number;
  onAnnotationAdded: (ann: Annotation) => void;
  onTextRequest: (pos: Point, page: number) => void;
}

function PdfPage({ pdf, pageNumber, scale, annotations, annotationMode, tool, color, brushSize, onAnnotationAdded, onTextRequest }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderTask: any = null;
    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setDims({ width: viewport.width, height: viewport.height });
      const ctx = canvas.getContext("2d")!;
      renderTask = page.render({ canvasContext: ctx, viewport });
      try {
        await renderTask.promise;
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") {
          console.warn("PDF render error:", e);
        }
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdf, pageNumber, scale]);

  return (
    <div
      className="relative mx-auto shadow-lg mb-6"
      style={{ width: dims?.width ?? "auto", background: "#fff" }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {dims && (
        <PageAnnotationCanvas
          pageNumber={pageNumber}
          width={dims.width}
          height={dims.height}
          annotations={annotations}
          annotationMode={annotationMode}
          tool={tool}
          color={color}
          brushSize={brushSize}
          onAnnotationAdded={onAnnotationAdded}
          onTextRequest={onTextRequest}
        />
      )}
    </div>
  );
}

// ─── Image annotation layer ───────────────────────────────────────────────────

interface ImageAnnotationLayerProps {
  annotations: Annotation[];
  annotationMode: boolean;
  tool: Tool;
  color: string;
  brushSize: number;
  onAnnotationAdded: (ann: Annotation) => void;
  onTextRequest: (pos: Point, page: number) => void;
}

function ImageAnnotationLayer({ annotations, annotationMode, tool, color, brushSize, onAnnotationAdded, onTextRequest }: ImageAnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const isDrawingRef = useRef(false);
  const currentRef = useRef<Annotation | null>(null);

  const pageAnnotations = useMemo(() => annotations.filter((a) => a.page === 1), [annotations]);

  useEffect(() => {
    const parent = wrapRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      setDims({ width: parent.clientWidth, height: parent.clientHeight });
    });
    ro.observe(parent);
    setDims({ width: parent.clientWidth, height: parent.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) drawAnnotations(ctx, pageAnnotations);
  }, [pageAnnotations]);

  const getLocalPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationMode) return;
    e.preventDefault();
    const pos = getLocalPos(e);
    if (tool === "text") { onTextRequest(pos, 1); return; }
    currentRef.current = {
      id: Date.now().toString(), type: tool, page: 1,
      color, size: brushSize,
      points: tool === "pen" || tool === "eraser" ? [pos] : undefined,
      x: pos.x, y: pos.y,
    };
    isDrawingRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentRef.current || !annotationMode) return;
    e.preventDefault();
    const pos = getLocalPos(e);
    const cur = currentRef.current;
    if (tool === "pen" || tool === "eraser") {
      currentRef.current = { ...cur, points: [...(cur.points || []), pos] };
    } else if (tool === "rectangle" || tool === "circle") {
      currentRef.current = { ...cur, width: pos.x - (cur.x || 0), height: pos.y - (cur.y || 0) };
    } else if (tool === "line") {
      currentRef.current = { ...cur, endX: pos.x, endY: pos.y };
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawAnnotations(ctx, [...pageAnnotations, currentRef.current]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current || !currentRef.current) return;
    onAnnotationAdded(currentRef.current);
    isDrawingRef.current = false;
    currentRef.current = null;
  };

  if (dims.width === 0) return <div ref={wrapRef} />;

  return (
    <div ref={wrapRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className={annotationMode ? "cursor-crosshair" : "pointer-events-none"}
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          opacity: annotationMode ? 1 : pageAnnotations.length > 0 ? 0.9 : 0,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function FileAnnotationViewer({ url, fileName, submissionId, initialAnnotateMode, onAnnotationSaved, onSaveAnnotation, readOnly }: FileAnnotationViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pdfError, setPdfError] = useState(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [brushSize, setBrushSize] = useState(3);
  // annotations state is local to THIS file only — never shared across file instances
  // The `key` prop on the parent ensures full state reset when url or submissionId changes
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState(!!initialAnnotateMode);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasSavedAnnotations, setHasSavedAnnotations] = useState(false);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [annotationsError, setAnnotationsError] = useState<string | null>(null);

  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState(false);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [pendingText, setPendingText] = useState<{ pos: Point; page: number } | null>(null);

  const lowerUrl = url.toLowerCase().split("?")[0];
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerUrl);
  const isPdf = lowerUrl.endsWith(".pdf");
  const isDocx = lowerUrl.endsWith(".docx");
  const canonicalUrl = useMemo(() => url.split("?")[0].trim(), [url]);

  useEffect(() => {
    if (!submissionId || !url) {
      setAnnotations([]);
      setHasSavedAnnotations(false);
      setIsLoadingAnnotations(false);
      setAnnotationsError(null);
      return;
    }
    let cancelled = false;
    setIsLoadingAnnotations(true);
    setAnnotationsError(null);

    (async () => {
      const { data, error } = await supabase
        .from("annotations")
        .select("file_url,data,updated_at")
        .eq("submission_id", submissionId);

      if (cancelled) return;

      if (error) {
        setIsLoadingAnnotations(false);
        setAnnotationsError(error.message || "Failed to fetch annotations.");
        return;
      }

      const normalize = (u: string) => String(u || "").trim().split("?")[0];
      console.log("submissionId", submissionId);
      console.log("file.url", url);
      console.log("canonicalUrl", canonicalUrl);
      console.log("annotations rows", data);
      const matches = (data || []).filter((row: any) => normalize(String(row.file_url || "")) === canonicalUrl);
      console.log("matched annotations", matches);
      const best = matches.sort((a: any, b: any) => {
        const at = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bt = b.updated_at ? Date.parse(b.updated_at) : 0;
        return bt - at;
      })[0];

      const loadedRaw = best?.data;
      let loaded: Annotation[] = [];
      if (Array.isArray(loadedRaw)) {
        loaded = loadedRaw as Annotation[];
      } else if (typeof loadedRaw === "string") {
        try {
          const parsed = JSON.parse(loadedRaw);
          if (Array.isArray(parsed)) loaded = parsed as Annotation[];
        } catch {
          loaded = [];
        }
      }
      console.log("loaded annotations", loaded);
      setAnnotations(loaded);
      setHasSavedAnnotations(loaded.length > 0);
      setIsLoadingAnnotations(false);
    })().catch((e) => {
      if (cancelled) return;
      setIsLoadingAnnotations(false);
      setAnnotationsError(e instanceof Error ? e.message : "Failed to fetch annotations.");
    });

    return () => {
      cancelled = true;
    };
  }, [url, canonicalUrl, submissionId]);

  useEffect(() => {
    if (!isDocx) {
      setIsLoadingDoc(false);
      setDocError(false);
      return;
    }
    setIsLoadingDoc(true);
    setDocError(false);

    let cancelled = false;
    (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
      const buf = await res.arrayBuffer();
      if (cancelled) return;
      const container = docxContainerRef.current;
      if (!container) return;
      container.innerHTML = "";
      await renderAsync(buf, container, undefined, { inWrapper: false });
      if (cancelled) return;
      setIsLoadingDoc(false);
    })().catch(() => {
      if (cancelled) return;
      setIsLoadingDoc(false);
      setDocError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isDocx, url]);

  useEffect(() => {
    if (!isPdf) return;
    setPdfDoc(null);
    setPdfError(false);
    getPDFJS().then((lib) => {
      lib.getDocument({ url }).promise.then(
        (doc: any) => { setPdfDoc(doc); setNumPages(doc.numPages); },
        () => setPdfError(true)
      );
    });
  }, [url, isPdf]);

  const handleAnnotationAdded = useCallback((ann: Annotation) => {
    setAnnotations((prev) => [...prev, ann]);
  }, []);

  const handleTextRequest = useCallback((pos: Point, page: number) => {
    setPendingText({ pos, page });
    setShowTextInput(true);
  }, []);

  const handleAddText = () => {
    if (!textInput.trim() || !pendingText) return;
    setAnnotations((prev) => [...prev, {
      id: Date.now().toString(), type: "text",
      page: pendingText.page, x: pendingText.pos.x, y: pendingText.pos.y,
      text: textInput, color, size: brushSize,
    }]);
    setTextInput(""); setShowTextInput(false); setPendingText(null);
  };

  const handleSave = async () => {
    if (!submissionId || !url) {
      if (onSaveAnnotation) onSaveAnnotation("");
      setAnnotationMode(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      return;
    }
    const { error } = await supabase
      .from("annotations")
      .upsert(
        { submission_id: submissionId, file_url: canonicalUrl, data: annotations, updated_at: new Date().toISOString() },
        { onConflict: "submission_id,file_url" }
      );
    if (error) {
      console.error("Failed to save annotations:", error);
      return;
    }
    setHasSavedAnnotations(annotations.length > 0);
    if (onSaveAnnotation) onSaveAnnotation("");
    // Notify parent that annotations were saved (so it can refresh "Annotated" badge)
    if (onAnnotationSaved) onAnnotationSaved();
    setAnnotationMode(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — hidden in read-only mode */}
      {!readOnly && (
      <div className="border-b bg-gray-50 px-3 py-2 flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={annotationMode ? "default" : "outline"}
          className={annotationMode ? "bg-[#003b27] text-white hover:bg-[#002d1e]" : "border-[#003b27] text-[#003b27]"}
          onClick={() => setAnnotationMode((v) => !v)}
        >
          <Pen className="h-3.5 w-3.5 mr-1" />
          {annotationMode ? "Annotating" : "Annotate"}
        </Button>

        {annotationMode && (
          <>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "pen" as Tool, icon: <Pen className="h-3.5 w-3.5" />, label: "Pen" },
                  { id: "text" as Tool, icon: <Type className="h-3.5 w-3.5" />, label: "Text" },
                  { id: "rectangle" as Tool, icon: <Square className="h-3.5 w-3.5" />, label: "Rectangle" },
                  { id: "circle" as Tool, icon: <Circle className="h-3.5 w-3.5" />, label: "Circle" },
                  { id: "line" as Tool, icon: <Minus className="h-3.5 w-3.5" />, label: "Line" },
                  { id: "eraser" as Tool, icon: <Eraser className="h-3.5 w-3.5" />, label: "Eraser" },
                ] as { id: Tool; icon: React.ReactNode; label: string }[]
              ).map((t) => (
                <button key={t.id} title={t.label} onClick={() => setTool(t.id)}
                  className={`p-1.5 rounded transition-colors ${tool === t.id ? "bg-[#003b27] text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"}`}>
                  {t.icon}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button key={c} title={c} onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "border-gray-800 scale-125" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-1">
              <button onClick={() => setBrushSize((s) => Math.max(1, s - 1))} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
              <span className="text-xs w-6 text-center font-medium">{brushSize}</span>
              <button onClick={() => setBrushSize((s) => Math.min(20, s + 1))} className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <button title="Undo" onClick={() => setAnnotations((p) => p.slice(0, -1))} className="p-1.5 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"><Undo2 className="h-3.5 w-3.5" /></button>
            <button title="Clear all" onClick={async () => {
              setAnnotations([]);
              setHasSavedAnnotations(false);
              if (submissionId && url) {
                await supabase
                  .from("annotations")
                  .upsert(
                    { submission_id: submissionId, file_url: canonicalUrl, data: [], updated_at: new Date().toISOString() },
                    { onConflict: "submission_id,file_url" }
                  );
              }
            }} className="p-1.5 rounded bg-white border border-gray-300 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
            {annotations.length > 0 && (
              <span className="text-xs text-gray-500 ml-1">{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}</span>
            )}
          </>
        )}

        {/* Save button - always on the right side when in annotation mode */}
        {annotationMode && (
          <button
            title="Save annotations"
            onClick={handleSave}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-colors ${savedSuccess ? "bg-green-100 border-green-400 text-green-700" : "bg-[#003b27] border-[#003b27] text-white hover:bg-[#002d1e]"}`}
          >
            {savedSuccess ? <><CheckCircle className="h-3.5 w-3.5" />Saved!</> : <><Save className="h-3.5 w-3.5" />Save</>}
          </button>
        )}

        {/* Saved badge when not in annotation mode but annotations exist */}
        {!annotationMode && hasSavedAnnotations && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
            <CheckCircle className="h-3 w-3" />
            Annotated
          </span>
        )}
      </div>
      )} {/* end !readOnly toolbar */}

      {/* Read-only annotation indicator */}
      {readOnly && (
        <div className={`border-b px-3 py-2 flex items-center gap-2 ${annotationsError ? "bg-red-50" : hasSavedAnnotations ? "bg-purple-50" : "bg-amber-50"}`}>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${annotationsError ? "text-red-700" : hasSavedAnnotations ? "text-purple-700" : "text-amber-700"}`}>
            <Pen className="h-3.5 w-3.5" />
            {isLoadingAnnotations
              ? "Loading reviewer annotations…"
              : annotationsError
                ? "Failed to load reviewer annotations"
                : hasSavedAnnotations
                  ? "Reviewer annotations are shown on the file below"
                  : "No annotations from reviewer yet — the file is shown as-is"}
          </span>
        </div>
      )}

      {/* Text input popup */}
      {showTextInput && pendingText && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20">
          <div className="bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3 w-72">
            <p className="text-sm font-semibold text-gray-800">Add Text Annotation</p>
            <input autoFocus type="text" value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddText(); if (e.key === "Escape") { setShowTextInput(false); setTextInput(""); setPendingText(null); } }}
              placeholder="Type annotation..."
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003b27]" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowTextInput(false); setTextInput(""); setPendingText(null); }}>Cancel</Button>
              <Button size="sm" className="bg-[#003b27] hover:bg-[#002d1e] text-white" onClick={handleAddText}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-gray-200 px-4 py-4">
        {isPdf && (
          <>
            {pdfError && <div className="text-red-600 text-sm p-4 bg-white rounded shadow">Failed to load PDF.</div>}
            {!pdfDoc && !pdfError && <div className="text-gray-500 text-sm p-4 text-center">Loading PDF…</div>}
            {pdfDoc && Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPage key={pageNum} pdf={pdfDoc} pageNumber={pageNum} scale={PDF_SCALE}
                annotations={annotations} annotationMode={annotationMode}
                tool={tool} color={color} brushSize={brushSize}
                onAnnotationAdded={handleAnnotationAdded} onTextRequest={handleTextRequest} />
            ))}
            {annotationMode && pdfDoc && (
              <div className="flex justify-center mt-2 mb-4 pointer-events-none">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full select-none">
                  {tool === "text" ? "Click a page to place text" : `Draw with ${tool} tool · Scroll to navigate`}
                </div>
              </div>
            )}
          </>
        )}

        {isImage && (
          <div className="relative mx-auto w-fit shadow-lg">
            <img src={url} alt={fileName} className="max-w-full object-contain rounded block" />
            <ImageAnnotationLayer
              annotations={annotations} annotationMode={annotationMode}
              tool={tool} color={color} brushSize={brushSize}
              onAnnotationAdded={handleAnnotationAdded} onTextRequest={handleTextRequest} />
          </div>
        )}

        {!isPdf && !isImage && (
          <div className="bg-white rounded shadow overflow-auto" style={{ height: "calc(92vh - 90px)" }}>
            {isDocx ? (
              <div className="p-3">
                {isLoadingDoc && <div className="text-gray-500 text-sm p-4 text-center">Loading document…</div>}
                {docError && <div className="text-red-600 text-sm p-4 bg-white rounded shadow">Failed to load document.</div>}
                <div ref={docxContainerRef} />
              </div>
            ) : (
              <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                className="w-full h-full border-0 rounded" title={fileName} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
