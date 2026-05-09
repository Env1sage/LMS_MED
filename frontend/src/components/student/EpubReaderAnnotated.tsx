import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  List,
  X,
  Settings,
  Maximize,
  Minimize,
  ArrowLeft,
  Highlighter,
  StickyNote,
  Trash2,
  Edit2,
  ZoomIn,
  ZoomOut,
  Underline,
  Bookmark,
  BookmarkCheck,
  Search,
  Info,
  RotateCcw,
  RotateCw,
  Check,
  Columns,
  Square,
  SquareStack,
  Navigation,
  Fullscreen,
  Undo2,
  ChevronUp,
  ChevronDown,
  SkipForward,
  BookMarked,
  SlidersHorizontal,
  GalleryHorizontal,
} from 'lucide-react';
import apiService from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import { formatDate } from '../../utils/dateUtils';

// Configure PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface EpubReaderAnnotatedProps {
  learningUnitId: string;
  accessToken: string;
  onBack?: () => void;
}

interface Chapter {
  id: string;
  chapterTitle: string;
  chapterOrder: number;
}

interface WatermarkData {
  text: string;
  style: {
    rotation: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  };
  forensicHash: string;
}

interface ReaderSettings {
  fontSize: number;
  lineSpacing: number;
  readingWidth: 'normal' | 'wide';
  focusMode: boolean;
}

interface Highlight {
  id: string;
  chapterId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  color: string;
  style?: string; // 'highlight' or 'underline'
  createdAt: string;
  notes?: Note[];
}

interface Note {
  id: string;
  chapterId: string;
  highlightId?: string;
  selectedText?: string;
  content: string;
  createdAt: string;
}

interface Flashcard {
  id: string;
  chapterId: string;
  question: string;
  answer: string;
  sourceText?: string;
  createdAt: string;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
  nextReviewAt?: string;
  lastQuality?: number;
  reviewedAt?: string;
}

interface BookmarkItem {
  id: string;
  learningUnitId: string;
  chapterId: string;
  pageLabel?: string;
  note?: string;
  createdAt: string;
}

interface Selection {
  text: string;
  startOffset: number;
  endOffset: number;
  range: Range;
}

// Helper component for Book Info Panel rows
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
    <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 500, textAlign: 'right' as const, maxWidth: '60%' }}>{value}</span>
  </div>
);

export const EpubReaderAnnotated: React.FC<EpubReaderAnnotatedProps> = ({
  learningUnitId,
  accessToken,
  onBack,
}) => {
  const { user } = useAuth();
  const userWatermarkText = user ? `${user.fullName} • ${user.email}` : 'BITFLOW LMS • SECURE';
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [watermark, setWatermark] = useState<WatermarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChapterPanel, setShowChapterPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotebookPanel, setShowNotebookPanel] = useState(false);
  const [notebookTab, setNotebookTab] = useState<'highlights' | 'notes' | 'flashcards' | 'bookmarks'>('highlights');
  const [highlightFilter, setHighlightFilter] = useState<'all' | 'highlight' | 'underline'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // PDF content state
  const [isPdfContent, setIsPdfContent] = useState(false);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1.5);
  // Keep a ref in sync so effects can read current page without stale closure
  useEffect(() => { currentPdfPageRef.current = currentPdfPage; }, [currentPdfPage]);
  const renderGenerationRef = useRef(0);
  const loadedPageNumRef = useRef<number>(0);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);
  const pdfDoc2Ref = useRef<any>(null);
  const loadedPageNum2Ref = useRef<number>(0);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfTextLayerRef = useRef<HTMLDivElement>(null);
  const [pdfTocEntries, setPdfTocEntries] = useState<Array<{title: string; page: number; level: number}>>([]);
  const tocScanStarted = useRef(false);
  const tocCancelledRef = useRef(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  
  // PDF viewer advanced features
  const [pdfRotation, setPdfRotation] = useState(0); // 0, 90, 180, 270
  const [pdfPageView, setPdfPageView] = useState<'single' | 'double'>('single');
  const [pdfBgColor, setPdfBgColor] = useState('#4A4A4A');
  const [showPdfSettings, setShowPdfSettings] = useState(false);
  const [jumpToPageInput, setJumpToPageInput] = useState('');
  const [showJumpToPage, setShowJumpToPage] = useState(false);
  const pdfCanvas2Ref = useRef<HTMLCanvasElement>(null);
  const pdfTextLayer2Ref = useRef<HTMLDivElement>(null);
  const pdfPageDimensionsRef = useRef<{width: number; height: number}>({width: 612, height: 792});
  
  // Page history for backtracking
  const [pageHistory, setPageHistory] = useState<number[]>([]);
  const skipHistoryRef = useRef(false);

  // Continuous scroll view mode
  const [pdfViewMode, setPdfViewMode] = useState<'page' | 'scroll'>('page');
  const scrollCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const scrollTextLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedScrollPages = useRef<Set<number>>(new Set());
  const scrollRenderingPages = useRef<Set<number>>(new Set());
  const currentPdfPageRef = useRef<number>(1);
  
  // Page-by-page loading: cache single-page PDF ArrayBuffers
  const pdfPageCache = useRef<Map<number, ArrayBuffer>>(new Map());
  const pdfPageFetching = useRef<Set<number>>(new Set());
  const [pdfPageLoading, setPdfPageLoading] = useState(false);
  
  // Annotation states
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const highlightsRef = useRef<Highlight[]>([]);
  useEffect(() => { highlightsRef.current = highlights; }, [highlights]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const selectionPageRef = useRef<number>(0); // Track which page the selection is on (for scroll mode)
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionToolbarPosition, setSelectionToolbarPosition] = useState({ x: 0, y: 0 });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [flashcardQuestion, setFlashcardQuestion] = useState('');
  const [flashcardError, setFlashcardError] = useState('');
  const [flashcardCreating, setFlashcardCreating] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  
  // New feature states
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [showBookInfoPanel, setShowBookInfoPanel] = useState(false);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchResults, setSearchResults] = useState<number>(0);
  const [searchCurrentIndex, setSearchCurrentIndex] = useState<number>(0);
  const searchMatchesRef = useRef<HTMLElement[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [quizMode, setQuizMode] = useState(false);

  // Expanded note popover — shown when clicking a note icon in the text layer
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [notePopoverPos, setNotePopoverPos] = useState<{x: number; y: number} | null>(null);

  // Note icon positions: noteId → {xPct, yPct} as % of page wrapper (pinned at selection, not draggable)
  const [noteIconPositions, setNoteIconPositions] = useState<Record<string, {xPct: number; yPct: number}>>(() => {
    try { return JSON.parse(localStorage.getItem('bf_note_positions') || '{}'); } catch { return {}; }
  });
  // Saves selection toolbar viewport position at time of opening the note modal
  const noteCreationPosRef = useRef<{x: number; y: number}>({ x: 0, y: 0 });
  // Tracks where mousedown happened for selection-start validation
  const mouseDownPosRef = useRef<{x: number; y: number} | null>(null);
  // Zoom manual input state
  const [zoomInputEditing, setZoomInputEditing] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState('');

  // Persist note positions to localStorage
  useEffect(() => {
    localStorage.setItem('bf_note_positions', JSON.stringify(noteIconPositions));
  }, [noteIconPositions]);

  // Close note popover when clicking outside
  useEffect(() => {
    if (!expandedNoteId) return;
    const handleClick = () => { setExpandedNoteId(null); setNotePopoverPos(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [expandedNoteId]);

  const [quizCards, setQuizCards] = useState<Flashcard[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizShowAnswer, setQuizShowAnswer] = useState(false);
  
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    lineSpacing: 1.85,
    readingWidth: 'normal',
    focusMode: false,
  });
  
  const watermarkRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionToolbarRef = useRef<HTMLDivElement>(null);

  // Load chapters
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setLoading(true);
        console.log('[EPUB] Loading chapters for unit:', learningUnitId, 'token length:', accessToken?.length);
        const response = await apiService.get(
          `/epub/chapters/${learningUnitId}?token=${encodeURIComponent(accessToken)}`
        );
        
        console.log('[EPUB] Chapters loaded:', response.data?.chapters?.length);
        console.log('[EPUB] Learning unit data:', response.data?.learningUnit);
        
        // Check if the content is a PDF file
        const lu = response.data?.learningUnit;
        if (lu?.secureAccessUrl && lu.secureAccessUrl.toLowerCase().endsWith('.pdf')) {
          console.log('[EPUB] Detected PDF content, switching to PDF viewer mode');
          setIsPdfContent(true);
        }
        
        setChapters(response.data.chapters);
        
        if (response.data.chapters.length > 0) {
          setCurrentChapter(response.data.chapters[0]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('[EPUB] Failed to load chapters:', err?.response?.status, err?.response?.data);
        setError(err.response?.data?.message || 'Failed to load EPUB chapters');
      } finally {
        setLoading(false);
      }
    };

    loadChapters();
  }, [learningUnitId, accessToken]);

  // Load PDF info (page count, title) when PDF content is detected — no full PDF download
  useEffect(() => {
    if (!isPdfContent) return;

    const loadPdfInfo = async () => {
      try {
        setLoading(true);
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const infoUrl = `${apiBase}/epub/pdf/${learningUnitId}/info?token=${encodeURIComponent(accessToken)}`;
        console.log('[PDF] Fetching PDF info from:', infoUrl);
        const res = await fetch(infoUrl);
        if (!res.ok) throw new Error(`PDF info failed: ${res.status}`);
        const info = await res.json();
        setTotalPdfPages(info.totalPages);
        setCurrentPdfPage(1);
        console.log('[PDF] PDF info loaded — pages:', info.totalPages, 'title:', info.title);
        setError(null);
      } catch (err: any) {
        console.error('[PDF] Failed to load PDF info:', err);
        setError('Failed to load PDF document info');
      } finally {
        setLoading(false);
      }
    };

    loadPdfInfo();

    const cacheRef = pdfPageCache.current;
    const fetchingRef = pdfPageFetching.current;
    return () => {
      cacheRef.clear();
      fetchingRef.clear();
      tocCancelledRef.current = true;
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      if (pdfDoc2Ref.current) {
        pdfDoc2Ref.current.destroy();
        pdfDoc2Ref.current = null;
      }

    };
  }, [isPdfContent, learningUnitId, accessToken]);

  // Helper: fetch a single-page PDF from the backend, with caching
  const fetchSinglePagePdf = useCallback(async (pageNum: number): Promise<ArrayBuffer> => {
    // Return from cache if available
    if (pdfPageCache.current.has(pageNum)) {
      return pdfPageCache.current.get(pageNum)!;
    }

    // Prevent duplicate fetches for the same page
    if (pdfPageFetching.current.has(pageNum)) {
      // Wait for the ongoing fetch to complete
      while (pdfPageFetching.current.has(pageNum)) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (pdfPageCache.current.has(pageNum)) {
        return pdfPageCache.current.get(pageNum)!;
      }
    }

    pdfPageFetching.current.add(pageNum);
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const pageUrl = `${apiBase}/epub/pdf/${learningUnitId}/page/${pageNum}?token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(pageUrl);
      if (!res.ok) throw new Error(`Failed to fetch page ${pageNum}: ${res.status}`);
      const buf = await res.arrayBuffer();
      pdfPageCache.current.set(pageNum, buf);
      // LRU eviction — keep at most 30 pages cached to limit memory
      if (pdfPageCache.current.size > 30) {
        const oldest = pdfPageCache.current.keys().next().value;
        if (oldest !== undefined) pdfPageCache.current.delete(oldest);
      }
      return buf;
    } finally {
      pdfPageFetching.current.delete(pageNum);
    }
  }, [learningUnitId, accessToken]);

  // Prefetch adjacent pages for smooth navigation
  const prefetchAdjacentPages = useCallback((pageNum: number) => {
    const pagesToPrefetch = [pageNum - 1, pageNum + 1, pageNum + 2];
    pagesToPrefetch.forEach(p => {
      if (p >= 1 && p <= totalPdfPages && !pdfPageCache.current.has(p)) {
        fetchSinglePagePdf(p).catch(() => {}); // fire-and-forget
      }
    });
  }, [totalPdfPages, fetchSinglePagePdf]);



  // ===================== PDF HIGHLIGHT SYSTEM =====================
  // Injects <span class="bf-hl-mark"> INSIDE the pdf.js text spans,
  // wrapping the highlighted characters.  Because the mark span is a
  // child of the pdf.js span it inherits every CSS transform the span
  // has (rotation, scaleX, translate) — so highlights follow the text
  // at ANY rotation, zoom, or layout automatically.
  const applyPdfHighlightsToLayer = useCallback((textLayer: HTMLDivElement, hlList: Highlight[]) => {
    if (!textLayer) return;

    // Clean up leftover overlay divs from previous approaches
    const wrapper = textLayer.parentElement;
    if (wrapper) wrapper.querySelectorAll('.bf-hl-rect').forEach(el => el.remove());
    textLayer.querySelectorAll('.bf-hl-rect').forEach(el => el.remove());

    const currentHighlights = hlList;

    // 1) Restore every span to a single, clean text node.
    //    Use live querySelectorAll inside forEach so detached bf-hl-mark children are
    //    never captured into a stale array — their parent flattening removes them from
    //    the DOM and they won't appear in subsequent queries.
    textLayer.querySelectorAll('span').forEach(s => {
      (s as HTMLElement).style.background = '';
      (s as HTMLElement).style.borderBottom = '';
      (s as HTMLElement).style.paddingBottom = '';
      if (s.querySelector('.bf-hl-mark')) {
        s.textContent = s.textContent || '';  // replaces DOM tree with one clean text node
      }
    });

    if (currentHighlights.length === 0) return;

    const COLORS: Record<string, string> = {
      yellow: 'rgba(255, 220, 0, 0.50)',
      green:  'rgba(80,  200,  80, 0.50)',
      blue:   'rgba(80,  160, 255, 0.50)',
      pink:   'rgba(255, 100, 170, 0.50)',
      orange: 'rgba(255, 150,  30, 0.50)',
    };

    // 2) Build full-text index — re-query AFTER cleanup so no detached bf-hl-mark are present.
    //    Sort by data-orig-idx (stamped by the render rAF in pdf.js emission order BEFORE any
    //    visual reordering) so fullText is always in content-stream order, keeping offset-based
    //    highlight matching correct regardless of page rotation or DOM reordering.
    const spans = (Array.from(textLayer.querySelectorAll('span')) as HTMLSpanElement[]).filter(s =>
      !s.classList.contains('markedContent') &&
      !s.classList.contains('bf-note-icon')
    );
    spans.sort((a, b) =>
      parseInt(a.getAttribute('data-orig-idx') || '0', 10) -
      parseInt(b.getAttribute('data-orig-idx') || '0', 10)
    );
    if (spans.length === 0) return;

    interface SpanEntry { span: HTMLSpanElement; text: string; gStart: number; gEnd: number; }
    const entries: SpanEntry[] = [];
    let fullText = '';
    for (const span of spans) {
      const t = span.textContent || '';
      if (t.length === 0) continue;
      entries.push({ span, text: t, gStart: fullText.length, gEnd: fullText.length + t.length });
      fullText += t;
    }
    if (fullText.length === 0) return;
    const lowerFull = fullText.toLowerCase();

    // 3) For each highlight find matching char range & collect per-span regions
    //    key = entry index, value = sorted array of { start, end, color, ul }
    const spanRegions = new Map<number, Array<{ start: number; end: number; color: string; ul: boolean }>>();

    for (const hl of currentHighlights) {
      const target = hl.selectedText?.trim();
      if (!target) continue;
      const lowerTarget = target.toLowerCase();

      let mStart = -1;
      let mEnd = -1;

      if (hl.startOffset >= 0 && hl.endOffset > 0 && hl.endOffset <= fullText.length) {
        const slice = fullText.slice(hl.startOffset, hl.endOffset);
        if (slice.toLowerCase() === lowerTarget) { mStart = hl.startOffset; mEnd = hl.endOffset; }
      }
      if (mStart < 0) {
        const hits: number[] = [];
        let idx = 0;
        while ((idx = lowerFull.indexOf(lowerTarget, idx)) >= 0) { hits.push(idx); idx += 1; }
        if (hits.length === 0) continue;
        if (hl.startOffset >= 0) hits.sort((a, b) => Math.abs(a - hl.startOffset) - Math.abs(b - hl.startOffset));
        mStart = hits[0]; mEnd = mStart + target.length;
      }

      const bgColor = COLORS[hl.color || 'yellow'] || COLORS.yellow;
      const isUnderline = hl.style === 'underline';

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const oStart = Math.max(e.gStart, mStart);
        const oEnd   = Math.min(e.gEnd, mEnd);
        if (oStart >= oEnd) continue;
        if (!spanRegions.has(i)) spanRegions.set(i, []);
        // Underlines carry no fill color — only the border-bottom stroke
        spanRegions.get(i)!.push({ start: oStart - e.gStart, end: oEnd - e.gStart, color: isUnderline ? '' : bgColor, ul: isUnderline });
      }
    }

    // 4) For each affected span, split its text into plain / highlighted segments
    spanRegions.forEach((regions, idx) => {
      const entry = entries[idx];
      if (!entry) return;
      const text = entry.text;

      // Build a list of "paint events" so multiple overlapping highlights merge
      interface Evt { pos: number; delta: number; color: string; ul: boolean; }
      const evts: Evt[] = [];
      for (const r of regions) {
        evts.push({ pos: r.start, delta: +1, color: r.color, ul: r.ul });
        evts.push({ pos: r.end,   delta: -1, color: r.color, ul: r.ul });
      }
      evts.sort((a, b) => a.pos - b.pos || a.delta - b.delta);

      // Walk events and build fragments
      const frag = document.createDocumentFragment();
      let cursor = 0;
      const activeColors = new Map<string, number>();
      let activeUl = 0;

      const flushSegment = (upTo: number) => {
        if (upTo <= cursor) return;
        const seg = text.substring(cursor, upTo);
        if (activeColors.size > 0 || activeUl > 0) {
          const mark = document.createElement('span');
          mark.className = 'bf-hl-mark';
          mark.textContent = seg;
          if (activeColors.size > 0) {
            mark.style.backgroundColor = activeColors.keys().next().value!;
          }
          if (activeUl > 0) {
            mark.style.borderBottom = '2px solid #3B82F6';
            mark.style.paddingBottom = '1px';
          }
          frag.appendChild(mark);
        } else {
          frag.appendChild(document.createTextNode(seg));
        }
        cursor = upTo;
      };

      for (const ev of evts) {
        flushSegment(ev.pos);
        if (ev.delta > 0) {
          if (ev.color) activeColors.set(ev.color, (activeColors.get(ev.color) || 0) + 1);
          if (ev.ul) activeUl++;
        } else {
          if (ev.color) {
            const cnt = (activeColors.get(ev.color) || 1) - 1;
            if (cnt <= 0) activeColors.delete(ev.color); else activeColors.set(ev.color, cnt);
          }
          if (ev.ul) activeUl--;
        }
      }
      // Remaining un-highlighted text
      if (cursor < text.length) {
        frag.appendChild(document.createTextNode(text.substring(cursor)));
      }

      // Replace span contents with the new fragment
      entry.span.textContent = '';
      entry.span.appendChild(frag);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // pure function — all data passed as arguments

  // Apply note icons to PDF text layer — REMOVED: notes now rendered as draggable React overlays
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applyNoteIconsToLayer = useCallback((_textLayer: HTMLDivElement) => {
    // Clean up any stale DOM icons from previous sessions
    _textLayer.querySelectorAll('.bf-note-icon').forEach(el => el.remove());
  }, []);

  // Store the highlight & note appliers in refs so renderPdfPage doesn't re-create when data changes
  const applyPdfHighlightsRef = useRef(applyPdfHighlightsToLayer);
  const applyNoteIconsRef = useRef(applyNoteIconsToLayer);
  useEffect(() => {
    applyPdfHighlightsRef.current = applyPdfHighlightsToLayer;
  }, [applyPdfHighlightsToLayer]);
  useEffect(() => {
    applyNoteIconsRef.current = applyNoteIconsToLayer;
  }, [applyNoteIconsToLayer]);

  // Sort all direct children of a pdf.js text layer by visual position (top→bottom, left→right).
  // pdf.js emits spans in PDF content-stream order which is NOT always reading order.
  // Reordering DOM children to match visual order makes browser text selection predictable —
  // the user can select only a single paragraph without the browser jumping across the page.
  // Reorder text layer children into screen reading order so browser text-selection
  // follows visual top→bottom, left→right regardless of pdf.js emission order.
  // data-orig-idx is NOT stamped here — it must be stamped from outside (render rAF)
  // in pdf.js content-stream order so highlight offset matching is never broken by rotation.
  const sortTextLayerByVisualOrder = (textLayer: HTMLDivElement) => {
    const children = Array.from(textLayer.children) as HTMLElement[];
    if (children.length < 2) return;
    const withRect = children.map(el => ({ el, r: el.getBoundingClientRect() }));
    withRect.sort((a, b) => {
      const dy = a.r.top - b.r.top;
      if (Math.abs(dy) > 4) return dy;        // different rows
      return a.r.left - b.r.left;             // same row: left to right
    });
    const frag = document.createDocumentFragment();
    for (const { el } of withRect) frag.appendChild(el);
    textLayer.appendChild(frag);
  };

  // Render current PDF page — fetches single-page PDF from backend on demand
  const renderPdfPage = useCallback(async (pageNum: number) => {
    if (!pdfCanvasRef.current) return;

    // Increment generation to cancel any in-progress stale render
    const generation = ++renderGenerationRef.current;

    // Cancel previous pdf.js render task if still running
    if (currentRenderTaskRef.current) {
      try { currentRenderTaskRef.current.cancel(); } catch (e) { /* ignore */ }
      currentRenderTaskRef.current = null;
    }

    try {
      setPdfPageLoading(true);

      // Only re-fetch & re-create doc when the page number actually changes
      // For zoom/rotation changes on the SAME page, reuse existing doc (huge perf win)
      if (loadedPageNumRef.current !== pageNum || !pdfDocRef.current) {
        const pageBuffer = await fetchSinglePagePdf(pageNum);
        if (renderGenerationRef.current !== generation) return;

        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        const loadingTask = pdfjsLib.getDocument({ data: pageBuffer.slice(0) });
        const doc = await loadingTask.promise;
        if (renderGenerationRef.current !== generation) { doc.destroy(); return; }
        pdfDocRef.current = doc;
        loadedPageNumRef.current = pageNum;
      }

      const doc = pdfDocRef.current;
      if (!doc) return;

      const page = await doc.getPage(1);
      if (renderGenerationRef.current !== generation) return;

      // Store actual unscaled page dimensions for accurate fit-to-page
      const rawViewport = page.getViewport({ scale: 1, rotation: 0 });
      pdfPageDimensionsRef.current = { width: rawViewport.width, height: rawViewport.height };

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
      const scaledViewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });

      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      // Give the page wrapper explicit pixel dimensions so height:100% on the text layer resolves correctly
      if (canvas.parentElement) {
        (canvas.parentElement as HTMLElement).style.width = `${viewport.width}px`;
        (canvas.parentElement as HTMLElement).style.height = `${viewport.height}px`;
      }

      const renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
      currentRenderTaskRef.current = renderTask;
      await renderTask.promise;
      currentRenderTaskRef.current = null;
      if (renderGenerationRef.current !== generation) return;

      if (pdfTextLayerRef.current) {
        const textLayer = pdfTextLayerRef.current;
        textLayer.innerHTML = '';
        // DON'T set width/height here — renderTextLayer's setLayerDimensions
        // will set them to UNROTATED page dimensions using --scale-factor.
        textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);

        const textContent = await page.getTextContent();
        if (renderGenerationRef.current !== generation) return;

        const textLayerTask = (pdfjsLib as any).renderTextLayer({
          textContentSource: textContent,
          container: textLayer,
          viewport,
          textDivs: [],
        });

        if (textLayerTask && 'promise' in textLayerTask) {
          await textLayerTask.promise;
        }

        // Apply CSS transform to rotate the text layer to match the canvas.
        // renderTextLayer positions spans in UNROTATED page coordinates.
        // The canvas is rendered with the ROTATED viewport.  We bridge the gap
        // by CSS-rotating the text layer container.
        const rot = pdfRotation % 360;
        const pw = rawViewport.width * pdfScale;   // unrotated page width in CSS px
        const ph = rawViewport.height * pdfScale;   // unrotated page height in CSS px
        textLayer.style.transformOrigin = '0 0';
        if (rot === 90) {
          textLayer.style.transform = `rotate(90deg) translateY(-${ph}px)`;
        } else if (rot === 180) {
          textLayer.style.transform = `rotate(180deg) translate(-${pw}px, -${ph}px)`;
        } else if (rot === 270) {
          textLayer.style.transform = `rotate(270deg) translateX(-${pw}px)`;
        } else {
          textLayer.style.transform = '';
        }

        if (textLayerTask && 'promise' in textLayerTask) {
          await textLayerTask.promise;
        }

        // Double-rAF: pdf.js may schedule its own rAF internally to finalise span
        // CSS transforms after its promise resolves.  Waiting for TWO animation frames
        // guarantees we measure AFTER pdf.js's internal rAF has painted the transforms.
        const capturedGen = generation;
        requestAnimationFrame(() => {
          if (renderGenerationRef.current !== capturedGen) return;
          requestAnimationFrame(() => {
            if (renderGenerationRef.current !== capturedGen) return;
            // Stamp original pdf.js emission order BEFORE visual sort so that
            // applyPdfHighlightsToLayer can always rebuild fullText in content-stream
            // order (correct for offset matching) regardless of rotation.
            Array.from(textLayer.children).forEach((el, idx) =>
              (el as HTMLElement).setAttribute('data-orig-idx', String(idx))
            );
            sortTextLayerByVisualOrder(textLayer);
            applyPdfHighlightsRef.current(textLayer, highlightsRef.current);
            applyNoteIconsRef.current(textLayer);
          });
        });
      }

      // Prefetch adjacent pages
      prefetchAdjacentPages(pageNum);

      // Update progress bar
      setScrollProgress((pageNum / totalPdfPages) * 100);
    } catch (err: any) {
      // Ignore cancellation errors from stale renders
      if (err?.name === 'RenderingCancelledException' || renderGenerationRef.current !== generation) return;
      console.error('[PDF] Failed to render page:', err);
    } finally {
      if (renderGenerationRef.current === generation) {
        setPdfPageLoading(false);
      }
    }
  }, [pdfScale, pdfRotation, totalPdfPages, fetchSinglePagePdf, prefetchAdjacentPages]);

  // Debounced render trigger — prevents rapid re-renders on zoom/rotate (page mode only)
  // Preserve scroll center point across zoom changes
  const prevScaleRef = useRef(pdfScale);
  useEffect(() => {
    if (!isPdfContent || totalPdfPages <= 0 || currentPdfPage <= 0 || pdfViewMode !== 'page') return;

    const container = pdfContainerRef.current;
    // Capture scroll ratios before re-render so we can restore center point after zoom
    let scrollRatioX = 0.5;
    let scrollRatioY = 0.5;
    if (container && prevScaleRef.current !== pdfScale) {
      const maxScrollX = Math.max(container.scrollWidth - container.clientWidth, 1);
      const maxScrollY = Math.max(container.scrollHeight - container.clientHeight, 1);
      scrollRatioX = (container.scrollLeft + container.clientWidth / 2) / (container.scrollWidth || 1);
      scrollRatioY = (container.scrollTop + container.clientHeight / 2) / (container.scrollHeight || 1);
    }

    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    renderTimeoutRef.current = setTimeout(() => {
      renderPdfPage(currentPdfPage).then(() => {
        // Restore scroll center point after zoom-induced re-render
        if (container && prevScaleRef.current !== pdfScale) {
          requestAnimationFrame(() => {
            const newScrollX = scrollRatioX * container.scrollWidth - container.clientWidth / 2;
            const newScrollY = scrollRatioY * container.scrollHeight - container.clientHeight / 2;
            container.scrollLeft = Math.max(0, newScrollX);
            container.scrollTop = Math.max(0, newScrollY);
            prevScaleRef.current = pdfScale;
          });
        }
      });
    }, 30);
    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [currentPdfPage, pdfScale, pdfRotation, isPdfContent, totalPdfPages, renderPdfPage, pdfViewMode]);

  // --- Continuous Scroll View Mode ---
  // Render a single page into its canvas element (for scroll mode)
  const renderScrollPage = useCallback(async (pageNum: number) => {
    if (scrollRenderingPages.current.has(pageNum) || renderedScrollPages.current.has(pageNum)) return;
    const canvas = scrollCanvasRefs.current.get(pageNum);
    if (!canvas) return;
    scrollRenderingPages.current.add(pageNum);
    try {
      const pageBuffer = await fetchSinglePagePdf(pageNum);
      const loadingTask = pdfjsLib.getDocument({ data: pageBuffer.slice(0) });
      const doc = await loadingTask.promise;
      try {
        const page = await doc.getPage(1);
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
        const scaledViewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
        if (pageNum === 1) {
          const rawVp = page.getViewport({ scale: 1, rotation: 0 });
          pdfPageDimensionsRef.current = { width: rawVp.width, height: rawVp.height };
        }
        const ctx = canvas.getContext('2d')!;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const wrapper = canvas.closest('[data-scroll-page]') as HTMLElement | null;
        if (wrapper) {
          wrapper.style.width = `${viewport.width}px`;
          wrapper.style.height = `${viewport.height}px`;
          wrapper.style.minHeight = '0';
        }
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        const textLayer = scrollTextLayerRefs.current.get(pageNum);
        if (textLayer) {
          textLayer.innerHTML = '';
          textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);
          const tc = await page.getTextContent();
          const task = (pdfjsLib as any).renderTextLayer({
            textContentSource: tc, container: textLayer, viewport, textDivs: [],
          });
          if (task && 'promise' in task) await task.promise;

          // Apply rotation CSS transform to text layer
          const rawVp = page.getViewport({ scale: pdfScale, rotation: 0 });
          const rot = pdfRotation % 360;
          textLayer.style.transformOrigin = '0 0';
          if (rot === 90) {
            textLayer.style.transform = `rotate(90deg) translateY(-${rawVp.height}px)`;
          } else if (rot === 180) {
            textLayer.style.transform = `rotate(180deg) translate(-${rawVp.width}px, -${rawVp.height}px)`;
          } else if (rot === 270) {
            textLayer.style.transform = `rotate(270deg) translateX(-${rawVp.width}px)`;
          } else {
            textLayer.style.transform = '';
          }
          if (task && 'promise' in task) await task.promise;
          // Double-rAF: ensure pdf.js internal transforms are finalized before measuring
          const capturedTextLayer = textLayer;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              Array.from(capturedTextLayer.children).forEach((el, idx) =>
                (el as HTMLElement).setAttribute('data-orig-idx', String(idx))
              );
              sortTextLayerByVisualOrder(capturedTextLayer);
              applyPdfHighlightsRef.current(capturedTextLayer, highlightsRef.current);
              applyNoteIconsRef.current(capturedTextLayer);
            });
          });
        }
        renderedScrollPages.current.add(pageNum);
      } finally {
        doc.destroy();
      }
    } catch (err) {
      console.error(`[PDF] Scroll page ${pageNum} render error:`, err);
    } finally {
      scrollRenderingPages.current.delete(pageNum);
    }
  }, [pdfScale, pdfRotation, fetchSinglePagePdf]);

  // IntersectionObserver: lazy-render pages as they scroll into view
  useEffect(() => {
    if (!isPdfContent || pdfViewMode !== 'scroll' || totalPdfPages <= 0) return;
    const container = pdfContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const p = parseInt(entry.target.getAttribute('data-scroll-page') || '0');
          if (p > 0) renderScrollPage(p);
        }
      });
    }, { root: container, rootMargin: '600px 0px' });
    const timer = setTimeout(() => {
      container.querySelectorAll('[data-scroll-page]').forEach(el => observer.observe(el));
    }, 120);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [isPdfContent, pdfViewMode, totalPdfPages, renderScrollPage]);

  // Track scroll position → update currentPdfPage in scroll mode
  useEffect(() => {
    if (!isPdfContent || pdfViewMode !== 'scroll') return;
    const container = pdfContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const midY = containerRect.top + containerRect.height / 2;
      const pages = container.querySelectorAll('[data-scroll-page]');
      for (const el of Array.from(pages)) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= midY && rect.bottom >= midY) {
          const p = parseInt(el.getAttribute('data-scroll-page') || '0');
          if (p > 0) {
            setCurrentPdfPage(p);
            setScrollProgress((p / totalPdfPages) * 100);
          }
          break;
        }
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isPdfContent, pdfViewMode, totalPdfPages]);

  // Re-render visible pages when scale/rotation changes in scroll mode
  useEffect(() => {
    if (!isPdfContent || pdfViewMode !== 'scroll') return;
    const container = pdfContainerRef.current;
    if (!container) return;

    // Capture current page before clearing so we can restore after re-render
    const pageToRestore = currentPdfPageRef.current;

    renderedScrollPages.current.clear();
    scrollRenderingPages.current.clear();
    const timer = setTimeout(() => {
      const cr = container.getBoundingClientRect();
      container.querySelectorAll('[data-scroll-page]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom > cr.top - 800 && r.top < cr.bottom + 800) {
          const p = parseInt(el.getAttribute('data-scroll-page') || '0');
          if (p > 0) renderScrollPage(p);
        }
      });
      // Restore scroll to the same page (not ratio-based, so zoom doesn't cause page jumps)
      requestAnimationFrame(() => {
        const el = container.querySelector(`[data-scroll-page="${pageToRestore}"]`);
        if (el) (el as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [pdfScale, pdfRotation, isPdfContent, pdfViewMode, renderScrollPage]);

  // Scroll to current page when entering scroll mode
  useEffect(() => {
    if (pdfViewMode !== 'scroll' || !isPdfContent) return;
    const timer = setTimeout(() => {
      const container = pdfContainerRef.current;
      if (!container) return;
      const el = container.querySelector(`[data-scroll-page="${currentPdfPage}"]`);
      if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfViewMode, isPdfContent]);

  // Cleanup scroll refs when leaving scroll mode
  useEffect(() => {
    if (pdfViewMode !== 'scroll') {
      renderedScrollPages.current.clear();
      scrollRenderingPages.current.clear();
    }
  }, [pdfViewMode]);

  // Lazy TOC scanner: scan pages for headings when user opens the TOC panel
  const scanPdfToc = useCallback(async () => {
    if (tocScanStarted.current || totalPdfPages <= 0) return;
    tocScanStarted.current = true;
    tocCancelledRef.current = false;

    // ── Phase 1: Scan pages and collect ALL text items with font sizes ──
    const rawPages: Array<{
      page: number;
      items: Array<{ str: string; fontSize: number; y: number }>;
    }> = [];
    const maxScanPages = Math.min(totalPdfPages, 100);

    for (let pageNum = 1; pageNum <= maxScanPages; pageNum++) {
      if (tocCancelledRef.current) return;
      try {
        const pageBuffer = await fetchSinglePagePdf(pageNum);
        if (tocCancelledRef.current) return;
        const loadingTask = pdfjsLib.getDocument({ data: pageBuffer.slice(0) });
        const doc = await loadingTask.promise;
        try {
          const pdfPage = await doc.getPage(1);
          const tc = await pdfPage.getTextContent();
          const pageItems = tc.items
            .filter((it: any) => it.str && it.str.trim().length > 1)
            .map((it: any) => ({
              str: it.str.trim(),
              fontSize: Math.abs(it.transform?.[0] || 12),
              y: it.transform?.[5] || 0,
            }));
          rawPages.push({ page: pageNum, items: pageItems });
        } finally {
          doc.destroy();
        }
      } catch {
        rawPages.push({ page: pageNum, items: [] });
      }
      if (pageNum % 10 === 0) await new Promise(r => setTimeout(r, 80));
      else await new Promise(r => setTimeout(r, 10));
    }

    // ── Phase 2: Compute global body font size (median across all pages) ──
    const allFontSizes: number[] = [];
    for (const pg of rawPages) {
      for (const it of pg.items) allFontSizes.push(it.fontSize);
    }
    allFontSizes.sort((a, b) => a - b);
    const bodyFontSize = allFontSizes[Math.floor(allFontSizes.length / 2)] || 12;

    // ── Phase 3: Identify running headers/footers (text that repeats on many pages) ──
    const textPageCount = new Map<string, number>();
    for (const pg of rawPages) {
      const seen = new Set<string>();
      for (const it of pg.items) {
        const k = it.str.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!seen.has(k)) { seen.add(k); textPageCount.set(k, (textPageCount.get(k) || 0) + 1); }
      }
    }
    const repeatThreshold = Math.max(3, rawPages.length * 0.20);
    const runningHeaders = new Set<string>();
    textPageCount.forEach((count, text) => { if (count >= repeatThreshold) runningHeaders.add(text); });

    // ── Phase 4: Extract ONLY heading lines — font must be meaningfully larger than body ──
    // A line is a heading if its fontSize ≥ bodyFontSize * 1.15
    const headingThreshold = bodyFontSize * 1.15;
    const tocEntries: Array<{ title: string; page: number; level: number }> = [];

    for (const pg of rawPages) {
      if (pg.items.length === 0) continue;
      const maxPageFs = Math.max(...pg.items.map((i: {fontSize: number}) => i.fontSize));

      // Group items by their y-position (same y ± 2pt = same line)
      type PgItem = { str: string; fontSize: number; y: number };
      const lines = new Map<number, PgItem[]>();
      for (const it of pg.items) {
        let matched = false;
        const lineKeys = Array.from(lines.keys());
        for (const lineY of lineKeys) {
          if (Math.abs(it.y - lineY) <= 2) {
            lines.get(lineY)!.push(it);
            matched = true;
            break;
          }
        }
        if (!matched) lines.set(it.y, [it]);
      }

      // For each line, check if it qualifies as a heading
      // Collect candidate heading lines with their y-positions first
      type HeadingCandidate = { text: string; y: number; fs: number; level: number };
      const pageHeadings: HeadingCandidate[] = [];

      lines.forEach((lineItems: PgItem[], lineY: number) => {
        const lineFs = Math.max(...lineItems.map((i: PgItem) => i.fontSize));
        if (lineFs < headingThreshold) return;     // body-sized → skip

        const lineText = lineItems.map((i: PgItem) => i.str).join(' ').trim();
        const lineTextLower = lineText.toLowerCase().replace(/\s+/g, ' ');

        if (runningHeaders.has(lineTextLower)) return;  // running header → skip
        if (lineText.length < 2) return;               // too short
        if (/^\d+$/.test(lineText)) return;            // page number → skip

        const level = lineFs >= maxPageFs * 0.90 ? 0 : 1;
        pageHeadings.push({ text: lineText, y: lineY, fs: lineFs, level });
      });

      // Sort by y descending (PDF y=0 is at bottom, so larger y = higher on page)
      pageHeadings.sort((a, b) => b.y - a.y);

      // Merge consecutive lines that belong to the same wrapped heading
      // Two lines merge when: same level AND vertical gap ≤ 2.5× font size
      const mergedHeadings: { title: string; level: number }[] = [];
      for (const h of pageHeadings) {
        const prev = mergedHeadings[mergedHeadings.length - 1] as any;
        if (prev && prev.level === h.level && (prev._lastY - h.y) <= h.fs * 2.5 && (prev._lastY - h.y) >= 0) {
          prev.title = prev.title + ' ' + h.text;
          prev._lastY = h.y;
        } else {
          mergedHeadings.push({ title: h.text, level: h.level, _lastY: h.y } as any);
        }
      }

      for (const mh of mergedHeadings) {
        const title = mh.title.replace(/\s+/g, ' ').trim().slice(0, 120);
        const prevEntry = tocEntries[tocEntries.length - 1];
        if (prevEntry && prevEntry.page === pg.page && prevEntry.title.toLowerCase() === title.toLowerCase()) continue;
        tocEntries.push({ title, page: pg.page, level: mh.level });
      }
    }

    // Add remaining unscanned pages not covered as headings — omit (user only wants real headings)
    // Sort by page number
    tocEntries.sort((a, b) => a.page - b.page || a.level - b.level);

    // De-duplicate: remove entries where same title appears on consecutive pages
    const deduped: typeof tocEntries = [];
    for (const entry of tocEntries) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.title.toLowerCase() === entry.title.toLowerCase() && Math.abs(prev.page - entry.page) <= 1) continue;
      deduped.push(entry);
    }

    setPdfTocEntries(deduped);
  }, [totalPdfPages, fetchSinglePagePdf]);

  // Auto-start TOC — first try the PDF's built-in outline, fall back to font-size scan
  useEffect(() => {
    if (!isPdfContent || totalPdfPages <= 0) return;

    tocScanStarted.current = false;
    tocCancelledRef.current = false;
    setPdfTocEntries([]);

    const loadToc = async () => {
      // 1) Try built-in PDF outline (bookmarks)
      try {
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const res = await fetch(
          `${apiBase}/epub/pdf/${learningUnitId}/outline?token=${encodeURIComponent(accessToken)}`
        );
        if (res.ok) {
          const data = await res.json();
          const outline: Array<{ title: string; page: number; level: number }> = data.outline || [];
          if (outline.length >= 3) {
            // The PDF has a proper index — use it directly
            setPdfTocEntries(outline);
            return;
          }
        }
      } catch { /* network/parse error — fall through to scan */ }

      // 2) No usable outline → scan pages by font size
      scanPdfToc();
    };

    loadToc();
  }, [isPdfContent, totalPdfPages, learningUnitId, accessToken, scanPdfToc]);

  // Re-apply highlights and note icons when data changes (NOT on page change — renderPdfPage handles that)
  useEffect(() => {
    if (!isPdfContent) return;

    // Use rAF so that any in-progress CSS transforms on the text layer spans
    // are fully resolved before we measure getBoundingClientRect().
    // Use double-RAF so pdf.js CSS transforms are finalized before we inject overlays
    // Capture highlights at the moment this effect runs — no rAF needed since the
    // text layer is already rendered; calling synchronously prevents any cancellation race.
    const capturedHighlights = highlights;
    if (pdfViewMode === 'scroll') {
      scrollTextLayerRefs.current.forEach((textLayer) => {
        applyPdfHighlightsToLayer(textLayer, capturedHighlights);
        applyNoteIconsToLayer(textLayer);
      });
    } else {
      if (pdfTextLayerRef.current) {
        applyPdfHighlightsToLayer(pdfTextLayerRef.current, capturedHighlights);
        applyNoteIconsToLayer(pdfTextLayerRef.current);
      }
      if (pdfTextLayer2Ref.current) {
        applyPdfHighlightsToLayer(pdfTextLayer2Ref.current, capturedHighlights);
        applyNoteIconsToLayer(pdfTextLayer2Ref.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlights, notes, isPdfContent, pdfViewMode]);

  // Convert a chapterId to a human-readable page/chapter label
  const getPageLabel = useCallback((chapterId: string): string => {
    const pageMatch = chapterId.match(/pdf-page-(\d+)/);
    if (pageMatch) return `Page ${pageMatch[1]}`;
    // For EPUB chapters, find the chapter title
    const ch = chapters.find(c => c.id === chapterId);
    if (ch) return ch.chapterTitle || `Chapter`;
    // UUID or unknown — generic label
    return isPdfContent ? 'PDF Page' : 'Chapter';
  }, [chapters, isPdfContent]);

  // Navigate to a page/chapter from an annotation's chapterId
  const navigateToAnnotation = useCallback((chapterId: string) => {
    if (isPdfContent) {
      const pageMatch = chapterId.match(/pdf-page-(\d+)/);
      if (pageMatch) {
        const targetPage = parseInt(pageMatch[1]);
        setCurrentPdfPage(targetPage);
        if (pdfViewMode === 'scroll') {
          setTimeout(() => {
            const el = pdfContainerRef.current?.querySelector(`[data-scroll-page="${targetPage}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        } else {
          pdfContainerRef.current?.scrollTo(0, 0);
        }
        // Flash-highlight the annotation row in the panel
        setTimeout(() => {
          const hlEls = document.querySelectorAll(`[data-annotation-chapter="${chapterId}"]`);
          hlEls.forEach(el => {
            (el as HTMLElement).style.transition = 'background 0.3s';
            (el as HTMLElement).style.background = '#EFF6FF';
            setTimeout(() => { (el as HTMLElement).style.background = ''; }, 1200);
          });
        }, 300);
      }
    } else {
      const ch = chapters.find(c => c.id === chapterId);
      if (ch) {
        setCurrentChapter(ch);
        contentRef.current?.scrollTo(0, 0);
      }
    }
  }, [isPdfContent, pdfViewMode, chapters]);

  // PDF page navigation — use functional updaters to avoid stale closure issues
  const goToPreviousPdfPage = useCallback(() => {
    setCurrentPdfPage(prev => {
      const step = pdfPageView === 'double' ? 2 : 1;
      if (prev > 1) {
        pdfContainerRef.current?.scrollTo(0, 0);
        return Math.max(1, prev - step);
      }
      return prev;
    });
  }, [pdfPageView]);

  const goToNextPdfPage = useCallback(() => {
    setCurrentPdfPage(prev => {
      const step = pdfPageView === 'double' ? 2 : 1;
      if (prev < totalPdfPages) {
        pdfContainerRef.current?.scrollTo(0, 0);
        return Math.min(totalPdfPages, prev + step);
      }
      return prev;
    });
  }, [totalPdfPages, pdfPageView]);

  const handlePdfZoomIn = () => setPdfScale(prev => Math.min(prev + 0.25, 4.0));
  const handlePdfZoomOut = () => setPdfScale(prev => Math.max(prev - 0.25, 0.5));

  // Track page history for backtracking
  useEffect(() => {
    if (isPdfContent && currentPdfPage > 0) {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      setPageHistory(prev => {
        if (prev[prev.length - 1] === currentPdfPage) return prev;
        return [...prev.slice(-50), currentPdfPage];
      });
    }
  }, [currentPdfPage, isPdfContent]);

  // Go back to previous page
  const handleGoBack = useCallback(() => {
    if (pageHistory.length < 2) return;
    const newHistory = [...pageHistory];
    newHistory.pop(); // remove current
    const prevPage = newHistory[newHistory.length - 1];
    if (prevPage) {
      skipHistoryRef.current = true;
      setPageHistory(newHistory);
      setCurrentPdfPage(prevPage);
      if (pdfViewMode === 'scroll') {
        setTimeout(() => {
          const el = pdfContainerRef.current?.querySelector(`[data-scroll-page="${prevPage}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  }, [pageHistory, pdfViewMode]);

  // Fit to page — uses real page dimensions and accounts for rotation
  const handleFitToPage = useCallback(() => {
    if (!pdfContainerRef.current) return;
    const containerWidth = pdfContainerRef.current.clientWidth - 60;
    const containerHeight = pdfContainerRef.current.clientHeight - 100;
    const { width, height } = pdfPageDimensionsRef.current;
    // When rotated 90° or 270°, the rendered page width/height swap
    const isRotated = pdfRotation === 90 || pdfRotation === 270;
    const pageWidth = isRotated ? height : width;
    const pageHeight = isRotated ? width : height;
    // In double-page view, two pages sit side by side
    const effectiveWidth = pdfPageView === 'double' ? (containerWidth - 4) / 2 : containerWidth;
    const scaleW = effectiveWidth / pageWidth;
    const scaleH = containerHeight / pageHeight;
    const newScale = Math.min(scaleW, scaleH);
    setPdfScale(Math.max(0.5, Math.min(newScale, 4.0)));
  }, [pdfRotation, pdfPageView]);

  const handleRotateClockwise = () => setPdfRotation(prev => (prev + 90) % 360);
  const handleRotateCounterClockwise = () => setPdfRotation(prev => (prev + 270) % 360);

  // Jump to page
  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPdfPages) {
      setCurrentPdfPage(pageNum);
      setShowJumpToPage(false);
      setJumpToPageInput('');
      if (pdfViewMode === 'scroll') {
        setTimeout(() => {
          const el = pdfContainerRef.current?.querySelector(`[data-scroll-page="${pageNum}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      } else {
        pdfContainerRef.current?.scrollTo(0, 0);
      }
    }
  };

  // Render second page for double-page view — reuses document
  const renderSecondPage = useCallback(async (pageNum: number) => {
    if (!pdfCanvas2Ref.current || pageNum > totalPdfPages) return;
    const generation = renderGenerationRef.current;
    try {
      // Only re-fetch & re-create doc when page number changes
      if (loadedPageNum2Ref.current !== pageNum || !pdfDoc2Ref.current) {
        const pageBuffer = await fetchSinglePagePdf(pageNum);
        if (renderGenerationRef.current !== generation) return;
        if (pdfDoc2Ref.current) {
          pdfDoc2Ref.current.destroy();
          pdfDoc2Ref.current = null;
        }
        const loadingTask = pdfjsLib.getDocument({ data: pageBuffer.slice(0) });
        const doc = await loadingTask.promise;
        if (renderGenerationRef.current !== generation) { doc.destroy(); return; }
        pdfDoc2Ref.current = doc;
        loadedPageNum2Ref.current = pageNum;
      }
      const doc = pdfDoc2Ref.current;
      if (!doc) return;
      const page = await doc.getPage(1);
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: pdfScale, rotation: pdfRotation });
      const scaledViewport = page.getViewport({ scale: pdfScale * dpr, rotation: pdfRotation });
      const canvas = pdfCanvas2Ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      if (canvas.parentElement) {
        (canvas.parentElement as HTMLElement).style.width = `${viewport.width}px`;
        (canvas.parentElement as HTMLElement).style.height = `${viewport.height}px`;
      }
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      if (pdfTextLayer2Ref.current) {
        const tl = pdfTextLayer2Ref.current;
        tl.innerHTML = '';
        tl.style.setProperty('--scale-factor', `${viewport.scale}`);
        const tc = await page.getTextContent();
        const task = (pdfjsLib as any).renderTextLayer({ textContentSource: tc, container: tl, viewport, textDivs: [] });
        if (task && 'promise' in task) await task.promise;

        // Apply rotation CSS transform to text layer
        const rawVp = page.getViewport({ scale: pdfScale, rotation: 0 });
        const rot = pdfRotation % 360;
        tl.style.transformOrigin = '0 0';
        if (rot === 90) {
          tl.style.transform = `rotate(90deg) translateY(-${rawVp.height}px)`;
        } else if (rot === 180) {
          tl.style.transform = `rotate(180deg) translate(-${rawVp.width}px, -${rawVp.height}px)`;
        } else if (rot === 270) {
          tl.style.transform = `rotate(270deg) translateX(-${rawVp.width}px)`;
        } else {
          tl.style.transform = '';
        }
        if (task && 'promise' in task) await task.promise;
        // Double-rAF: ensure pdf.js internal transforms are finalized before measuring
        const capturedTl = tl;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            Array.from(capturedTl.children).forEach((el, idx) =>
              (el as HTMLElement).setAttribute('data-orig-idx', String(idx))
            );
            sortTextLayerByVisualOrder(capturedTl);
            applyPdfHighlightsRef.current(capturedTl, highlightsRef.current);
            applyNoteIconsRef.current(capturedTl);
          });
        });
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error('[PDF] Second page render error:', err);
    }
  }, [pdfScale, pdfRotation, totalPdfPages, fetchSinglePagePdf]);

  // Second page render — debounced to prevent rapid re-renders (page mode only)
  useEffect(() => {
    if (!isPdfContent || pdfPageView !== 'double' || currentPdfPage + 1 > totalPdfPages || pdfViewMode === 'scroll') return;
    const timer = setTimeout(() => {
      renderSecondPage(currentPdfPage + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, [isPdfContent, pdfPageView, currentPdfPage, pdfScale, pdfRotation, totalPdfPages, renderSecondPage]);

  // Clear second canvas and destroy doc2 when switching back to single view
  useEffect(() => {
    if (pdfPageView === 'single') {
      if (pdfCanvas2Ref.current) {
        const canvas = pdfCanvas2Ref.current;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        canvas.style.width = '0px';
        canvas.style.height = '0px';
      }
      if (pdfDoc2Ref.current) {
        pdfDoc2Ref.current.destroy();
        pdfDoc2Ref.current = null;
        loadedPageNum2Ref.current = 0;
      }
    }
  }, [pdfPageView]);

  // Ctrl+scroll wheel zoom for PDF
  useEffect(() => {
    if (!isPdfContent) return;
    const container = pdfContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setPdfScale(prev => {
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          return Math.max(0.3, Math.min(prev + delta, 4.0));
        });
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isPdfContent]);

  // Keyboard navigation for PDF pages
  useEffect(() => {
    if (!isPdfContent) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard shortcuts when user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // In scroll mode, use keyboard to scroll the container
      if (pdfViewMode === 'scroll') {
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          pdfContainerRef.current?.scrollBy({ top: 500, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          e.preventDefault();
          pdfContainerRef.current?.scrollBy({ top: -500, behavior: 'smooth' });
        } else if (e.key === 'Home') {
          e.preventDefault();
          pdfContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (e.key === 'End') {
          e.preventDefault();
          pdfContainerRef.current?.scrollTo({ top: pdfContainerRef.current.scrollHeight, behavior: 'smooth' });
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handlePdfZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handlePdfZoomOut();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPreviousPdfPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPdfPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPdfPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPdfPage(totalPdfPages);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handlePdfZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handlePdfZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPdfContent, totalPdfPages, goToPreviousPdfPage, goToNextPdfPage, pdfViewMode]);

  // Load chapter content and annotations
  useEffect(() => {
    if (!currentChapter || isPdfContent) return;

    const loadChapterContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.get(
          `/epub/chapter/${currentChapter.id}?token=${encodeURIComponent(accessToken)}&learningUnitId=${learningUnitId}`
        );
        
        setChapterContent(response.data.content);
        // Override watermark with logged-in user info
        const apiWatermark = response.data.watermark;
        if (apiWatermark) {
          setWatermark({ ...apiWatermark, text: userWatermarkText });
        } else {
          setWatermark({
            text: userWatermarkText,
            style: { rotation: -35, offsetX: 15, offsetY: 40, opacity: 0.08 },
            forensicHash: '',
          });
        }
        
        // Load annotations for this chapter
        await loadAnnotations();
        
        setError(null);
      } catch (err: any) {
        console.error('Failed to load chapter:', err);
        setError(err.response?.data?.message || 'Failed to load chapter content');
      } finally {
        setLoading(false);
      }
    };

    loadChapterContent();
  }, [currentChapter, accessToken, isPdfContent]);

  // Load annotations (memoized to avoid stale closures)
  const loadAnnotations = useCallback(async () => {
    try {
      // For PDF content, load ALL annotations (no chapterId filter) since each page has its own chapterId (pdf-page-N)
      // For EPUB content, filter by the current chapter
      const chapterQuery = (!isPdfContent && currentChapter) ? `?chapterId=${currentChapter.id}` : '';
      const [highlightsRes, notesRes, flashcardsRes] = await Promise.all([
        apiService.get(`/annotations/highlights/${learningUnitId}${chapterQuery}`),
        apiService.get(`/annotations/notes/${learningUnitId}${chapterQuery}`),
        apiService.get(`/annotations/flashcards/${learningUnitId}`),
      ]);

      setHighlights(Array.isArray(highlightsRes.data) ? highlightsRes.data : []);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setFlashcards(Array.isArray(flashcardsRes.data) ? flashcardsRes.data : []);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  }, [currentChapter, learningUnitId, isPdfContent]);

  // Load annotations for PDF content
  useEffect(() => {
    if (isPdfContent && totalPdfPages > 0) {
      loadAnnotations();
    }
  }, [isPdfContent, totalPdfPages]);

  // Apply highlights AND note icons to content (EPUB mode)
  useEffect(() => {
    if (isPdfContent || !chapterContent || !contentRef.current) return;
    if (highlights.length === 0 && notes.length === 0) return;

    const applyAnnotations = () => {
      if (!contentRef.current) return;
      
      // Always start from the original chapter HTML to avoid double-wrapping
      let html = chapterContent;
      
      // Sort highlights by startOffset (descending) to apply from end to start
      const sortedHighlights = [...highlights].sort((a, b) => b.startOffset - a.startOffset);
      
      sortedHighlights.forEach((highlight) => {
        const regex = new RegExp(escapeRegExp(highlight.selectedText), 'i');
        const isUnderline = highlight.style === 'underline';
        html = html.replace(regex, (match) => {
          if (isUnderline) {
            return `<span class="bf-underline" data-highlight-id="${highlight.id}">${match}</span>`;
          }
          return `<span class="bf-highlight bf-highlight-${highlight.color}" data-highlight-id="${highlight.id}">${match}</span>`;
        });
      });

      // Add note icons: insert a 📝 icon after each noted text selection
      const notesWithText = notes.filter(n => n.selectedText?.trim());
      notesWithText.forEach((note) => {
        const escapedText = escapeRegExp(note.selectedText!.trim());
        const noteRegex = new RegExp(`(${escapedText})`, 'i');
        // Only add icon once — check if icon for this note is not already present
        if (html.includes(`data-note-id="${note.id}"`)) return;
        const tooltip = note.content.replace(/"/g, '&quot;').slice(0, 80) + (note.content.length > 80 ? '…' : '');
        html = html.replace(noteRegex, `$1<span class="bf-note-icon" data-note-id="${note.id}" title="${tooltip}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>`);
      });
      
      contentRef.current.innerHTML = DOMPurify.sanitize(html);
    };

    // Delay to ensure content is rendered
    setTimeout(applyAnnotations, 100);
  }, [chapterContent, highlights, notes, isPdfContent]);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Check if a note icon was clicked — open notebook panel to Notes tab
      const target = e.target as HTMLElement;
      // Use closest() so clicks on SVG children of the icon also work
      const noteIconEl = target?.closest?.('.bf-note-icon') as HTMLElement | null;
      if (noteIconEl) {
        setNotebookTab('notes');
        setShowNotebookPanel(true);
        return;
      }

      // If the click is inside the selection toolbar, leave it alone — the button onClick will fire next
      if (selectionToolbarRef.current?.contains(target)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowSelectionToolbar(false);
        return;
      }

      // Find the correct active container based on mode
      let activeContainer: HTMLElement | null = null;
      let detectedPage = currentPdfPage;

      if (isPdfContent && pdfViewMode === 'scroll') {
        // In scroll mode, find which page's text layer contains the selection
        const anchorNode = selection.anchorNode;
        if (anchorNode) {
          scrollTextLayerRefs.current.forEach((textLayer, pageNum) => {
            if (textLayer.contains(anchorNode)) {
              activeContainer = textLayer;
              detectedPage = pageNum;
            }
          });
        }
        // Fallback: check pdfContainerRef
        if (!activeContainer && pdfContainerRef.current?.contains(anchorNode as Node)) {
          // Try to find closest text layer
          const closest = (anchorNode as HTMLElement)?.closest?.('.pdf-text-layer') as HTMLElement;
          if (closest) activeContainer = closest;
        }
      } else if (isPdfContent) {
        // In page mode, check both page 1 and page 2 (double-page view)
        const anchorNode = selection.anchorNode;
        if (pdfTextLayer2Ref.current && pdfTextLayer2Ref.current.contains(anchorNode as Node)) {
          activeContainer = pdfTextLayer2Ref.current;
          detectedPage = currentPdfPage + 1;
        } else {
          activeContainer = pdfTextLayerRef.current;
          detectedPage = currentPdfPage;
        }
      } else {
        activeContainer = contentRef.current;
      }

      if (!activeContainer) {
        setShowSelectionToolbar(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) {
        setShowSelectionToolbar(false);
        return;
      }

      // Store which page the selection is on
      selectionPageRef.current = detectedPage;

      // Calculate start and end offsets
      const range = selection.getRangeAt(0);
      const startOffset = getTextOffset(activeContainer, range.startContainer, range.startOffset);
      const endOffset = startOffset + selectedText.length;

      setCurrentSelection({
        text: selectedText,
        startOffset,
        endOffset,
        range,
      });

      // Position the selection toolbar above the selection
      const rect = range.getBoundingClientRect();
      const toolbarWidth = 280;
      let x = rect.left + rect.width / 2;
      let y = rect.top - 12;

      // Clamp horizontally so toolbar doesn't overflow viewport
      x = Math.max(toolbarWidth / 2 + 8, Math.min(window.innerWidth - toolbarWidth / 2 - 8, x));
      // If too close to top, show below selection instead
      if (y < 60) {
        y = rect.bottom + 12;
      }

      setSelectionToolbarPosition({ x, y });
      setShowSelectionToolbar(true);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.bf-toolbar') || target.closest('.bf-modal') || target.closest('[class*="notebook"]')) return;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPdfContent, pdfViewMode, currentPdfPage]);

  // Get text offset within container
  const getTextOffset = (container: Node, node: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    
    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
    }
    
    return textOffset;
  };

  // Escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Create highlight
  const handleCreateHighlight = async (color: string = 'yellow', style: string = 'highlight') => {
    if (!currentSelection) return;
    const effectivePage = (isPdfContent && pdfViewMode === 'scroll' && selectionPageRef.current > 0)
      ? selectionPageRef.current : currentPdfPage;
    const chapterId = isPdfContent ? `pdf-page-${effectivePage}` : (currentChapter?.id || 'unknown');

    try {
      const response = await apiService.post('/annotations/highlights', {
        learningUnitId,
        chapterId,
        selectedText: currentSelection.text,
        startOffset: currentSelection.startOffset,
        endOffset: currentSelection.endOffset,
        color,
        style,
      });

      setHighlights([...highlights, response.data]);
      setShowSelectionToolbar(false);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  // Create underline
  const handleCreateUnderline = async () => {
    await handleCreateHighlight('blue', 'underline');
  };

  // Open note modal
  const handleOpenNoteModal = () => {
    // Capture the right edge of the selection for accurate icon placement
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      noteCreationPosRef.current = { x: r.right, y: r.top };
    } else {
      noteCreationPosRef.current = { x: selectionToolbarPosition.x, y: selectionToolbarPosition.y };
    }
    setShowSelectionToolbar(false);
    setShowNoteModal(true);
  };

  // Create note
  const handleCreateNote = async () => {
    if (!noteContent.trim()) return;
    const effectivePage = (isPdfContent && pdfViewMode === 'scroll' && selectionPageRef.current > 0)
      ? selectionPageRef.current : currentPdfPage;
    const chapterId = isPdfContent ? `pdf-page-${effectivePage}` : (currentChapter?.id || 'unknown');

    try {
      const response = await apiService.post('/annotations/notes', {
        learningUnitId,
        chapterId,
        selectedText: currentSelection?.text,
        content: noteContent,
      });

      const newNote = response.data;
      setNotes([...notes, newNote]);
      // Pin the note icon at the selection position within the PDF page wrapper
      if (isPdfContent && pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const xPct = ((noteCreationPosRef.current.x - rect.left) / rect.width) * 100;
        const yPct = ((noteCreationPosRef.current.y - rect.top) / rect.height) * 100;
        setNoteIconPositions(prev => ({
          ...prev,
          [newNote.id]: {
            xPct: Math.max(1, Math.min(96, xPct)),
            yPct: Math.max(1, Math.min(95, yPct)),
          },
        }));
      }
      setNoteContent('');
      setShowNoteModal(false);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Open flashcard modal
  const handleOpenFlashcardModal = () => {
    setShowSelectionToolbar(false);
    setShowFlashcardModal(true);
    setFlashcardError('');
  };

  // Create flashcard
  const handleCreateFlashcard = async () => {
    if (!flashcardQuestion.trim() || !currentSelection) {
      setFlashcardError('Please type a question and ensure text is selected.');
      return;
    }
    const effectivePage = (isPdfContent && pdfViewMode === 'scroll' && selectionPageRef.current > 0)
      ? selectionPageRef.current : currentPdfPage;
    const chapterId = isPdfContent ? `pdf-page-${effectivePage}` : (currentChapter?.id || 'unknown');

    try {
      setFlashcardCreating(true);
      setFlashcardError('');
      // Strip null bytes that PDF text layers may contain (PostgreSQL rejects 0x00 in UTF-8)
      const cleanText = (s: string) => s.replace(/\0/g, '');
      const response = await apiService.post('/annotations/flashcards', {
        learningUnitId,
        chapterId,
        question: cleanText(flashcardQuestion),
        answer: cleanText(currentSelection.text),
        sourceText: cleanText(currentSelection.text),
      });

      setFlashcards([...flashcards, response.data]);
      setFlashcardQuestion('');
      setShowFlashcardModal(false);
      window.getSelection()?.removeAllRanges();
    } catch (error: any) {
      console.error('Failed to create flashcard:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create flashcard. Please try again.';
      setFlashcardError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setFlashcardCreating(false);
    }
  };

  // Delete highlight
  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      await apiService.delete(`/annotations/highlights/${highlightId}`);
      setHighlights(highlights.filter(h => h.id !== highlightId));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await apiService.delete(`/annotations/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Delete flashcard
  const handleDeleteFlashcard = async (flashcardId: string) => {
    try {
      await apiService.delete(`/annotations/flashcards/${flashcardId}`);
      setFlashcards(flashcards.filter(f => f.id !== flashcardId));
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
    }
  };

  // ==================== BOOKMARKS ====================
  
  const loadBookmarks = async () => {
    try {
      const res = await apiService.get(`/annotations/bookmarks/${learningUnitId}`);
      setBookmarks(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
    }
  };

  const handleToggleBookmark = async () => {
    const chapterId = isPdfContent ? `pdf-page-${currentPdfPage}` : (currentChapter?.id || 'unknown');
    const pageLabel = isPdfContent ? `Page ${currentPdfPage}` : currentChapter?.chapterTitle;
    
    const existing = bookmarks.find(b => b.chapterId === chapterId);
    if (existing) {
      try {
        await apiService.delete(`/annotations/bookmarks/${existing.id}`);
        setBookmarks(bookmarks.filter(b => b.id !== existing.id));
      } catch (e) {
        console.error('Failed to remove bookmark:', e);
      }
    } else {
      try {
        const res = await apiService.post('/annotations/bookmarks', {
          learningUnitId,
          chapterId,
          pageLabel,
        });
        setBookmarks([...bookmarks, res.data]);
      } catch (e) {
        console.error('Failed to create bookmark:', e);
      }
    }
  };

  const isCurrentPageBookmarked = () => {
    const chapterId = isPdfContent ? `pdf-page-${currentPdfPage}` : (currentChapter?.id || 'unknown');
    return bookmarks.some(b => b.chapterId === chapterId);
  };

  // Load bookmarks on mount
  useEffect(() => {
    loadBookmarks();
  }, [learningUnitId]);

  // ==================== NOTE EDIT ====================

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditNoteContent(note.content);
  };

  const handleSaveEditedNote = async () => {
    if (!editingNote || !editNoteContent.trim()) return;
    try {
      const res = await apiService.put(`/annotations/notes/${editingNote.id}`, {
        content: editNoteContent,
      });
      setNotes(notes.map(n => n.id === editingNote.id ? { ...n, content: editNoteContent } : n));
      setEditingNote(null);
      setEditNoteContent('');
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  // ==================== IN-BOOK SEARCH ====================

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    if (isPdfContent) {
      // Helper to search and highlight in a text layer element
      const searchInTextLayer = (textLayer: HTMLDivElement): number => {
        // Clear previous search highlights (restore text nodes)
        const prevMarks = textLayer.querySelectorAll('.search-highlight');
        prevMarks.forEach(m => {
          const parent = m.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(m.textContent || ''), m);
            parent.normalize();
          }
        });
        
        // Walk ALL text nodes (including inside .bf-highlight / .bf-underline)
        const query = searchQuery.toLowerCase();
        const getTextNodes = (): Text[] => {
          const nodes: Text[] = [];
          const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
          let n: Node | null;
          while ((n = walker.nextNode())) nodes.push(n as Text);
          return nodes;
        };

        let count = 0;
        // Collect all text nodes first (snapshot), then mutate
        const textNodes = getTextNodes();
        for (const tNode of textNodes) {
          const nodeText = tNode.nodeValue || '';
          const lowerText = nodeText.toLowerCase();
          // Find all match indices in this text node
          const matches: Array<{ start: number; end: number }> = [];
          let searchFrom = 0;
          let idx: number;
          while ((idx = lowerText.indexOf(query, searchFrom)) >= 0) {
            matches.push({ start: idx, end: idx + query.length });
            count++;
            searchFrom = idx + query.length;
          }
          if (matches.length === 0) continue;

          // Build a fragment: split text around all matches
          const parent = tNode.parentNode;
          if (!parent) continue;
          const frag = document.createDocumentFragment();
          let lastEnd = 0;
          for (const m of matches) {
            if (m.start > lastEnd) {
              frag.appendChild(document.createTextNode(nodeText.slice(lastEnd, m.start)));
            }
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.appendChild(document.createTextNode(nodeText.slice(m.start, m.end)));
            frag.appendChild(mark);
            lastEnd = m.end;
          }
          if (lastEnd < nodeText.length) {
            frag.appendChild(document.createTextNode(nodeText.slice(lastEnd)));
          }
          parent.replaceChild(frag, tNode);
        }
        return count;
      };

      let totalCount = 0;
      
      if (pdfViewMode === 'scroll') {
        // In scroll mode, search across all rendered page text layers
        scrollTextLayerRefs.current.forEach((textLayer) => {
          totalCount += searchInTextLayer(textLayer);
        });
      } else {
        // In page mode, search in current page's text layer
        const textLayer = pdfTextLayerRef.current;
        if (textLayer) {
          totalCount = searchInTextLayer(textLayer);
        }
        // Also search in second page text layer (double-page view)
        if (pdfTextLayer2Ref.current) {
          totalCount += searchInTextLayer(pdfTextLayer2Ref.current);
        }
      }
      setSearchResults(totalCount);
      // Collect all search match elements for prev/next navigation
      const container = pdfContainerRef.current;
      if (container) {
        searchMatchesRef.current = Array.from(container.querySelectorAll('.search-highlight'));
      }
      if (searchMatchesRef.current.length > 0) {
        setSearchCurrentIndex(0);
        searchMatchesRef.current[0].classList.add('search-highlight-active');
        searchMatchesRef.current[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // For EPUB content
      const contentEl = document.querySelector('[data-epub-content]') || document.body;
      const text = contentEl.textContent || '';
      const query = searchQuery.toLowerCase();
      let count = 0;
      let idx = 0;
      while ((idx = text.toLowerCase().indexOf(query, idx)) >= 0) {
        count++;
        idx += query.length;
      }
      // Also use window.find for visual selection
      (window as any).find(searchQuery, false, false, true, false, false, false);
      setSearchResults(count);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(0);
    setSearchCurrentIndex(0);
    searchMatchesRef.current = [];
    setShowSearchBar(false);
    // Clear PDF search highlights in all modes
    if (isPdfContent) {
      const clearTextLayer = (tl: HTMLDivElement) => {
        const marks = tl.querySelectorAll('.search-highlight');
        marks.forEach(m => {
          const parent = m.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(m.textContent || ''), m);
            parent.normalize();
          }
        });
      };
      if (pdfTextLayerRef.current) clearTextLayer(pdfTextLayerRef.current);
      if (pdfTextLayer2Ref.current) clearTextLayer(pdfTextLayer2Ref.current);
      scrollTextLayerRefs.current.forEach((tl) => clearTextLayer(tl));
    }
  };

  const navigateSearchResult = (direction: 'next' | 'prev') => {
    const matches = searchMatchesRef.current;
    if (matches.length === 0) return;
    // Remove active class from current
    matches[searchCurrentIndex]?.classList.remove('search-highlight-active');
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (searchCurrentIndex + 1) % matches.length;
    } else {
      newIndex = (searchCurrentIndex - 1 + matches.length) % matches.length;
    }
    setSearchCurrentIndex(newIndex);
    matches[newIndex]?.classList.add('search-highlight-active');
    matches[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ==================== FLASHCARD QUIZ MODE ====================

  const startQuizMode = async () => {
    try {
      // Fetch due flashcards (SRS)
      const res = await apiService.get(`/annotations/flashcards/${learningUnitId}/due`);
      const due = Array.isArray(res.data) ? res.data : [];
      if (due.length === 0) {
        // Fall back to all flashcards
        setQuizCards(flashcards);
      } else {
        setQuizCards(due);
      }
      setQuizIndex(0);
      setQuizShowAnswer(false);
      setQuizMode(true);
    } catch (e) {
      // Fall back to all flashcards
      setQuizCards(flashcards);
      setQuizIndex(0);
      setQuizShowAnswer(false);
      setQuizMode(true);
    }
  };

  const handleSrsRating = async (quality: number) => {
    if (!quizCards[quizIndex]) return;
    try {
      await apiService.put(`/annotations/flashcards/${quizCards[quizIndex].id}/srs-review`, {
        quality,
      });
    } catch (e) {
      console.error('Failed to submit SRS rating:', e);
    }

    // Move to next card
    if (quizIndex < quizCards.length - 1) {
      setQuizIndex(quizIndex + 1);
      setQuizShowAnswer(false);
    } else {
      // Quiz complete
      setQuizMode(false);
      loadAnnotations(); // Refresh flashcard data
    }
  };

  // ==================== BOOK INFO ====================

  const loadBookInfo = async () => {
    try {
      const res = await apiService.get(`/learning-units/${learningUnitId}/info`);
      setBookInfo(res.data);
    } catch (e) {
      console.error('Failed to load book info:', e);
    }
  };

  useEffect(() => {
    loadBookInfo();
  }, [learningUnitId]);

  // Security Monitoring — Tamper Detection (MutationObserver)
  // Watches watermark element for removal/hiding attempts
  useEffect(() => {
    // Only activate once watermark is rendered
    if (!watermarkRef.current) return;

    const handleTamperDetected = async (tamperType: string) => {
      console.warn(`[SECURITY] Tamper detected: ${tamperType}`);
      try {
        const token = localStorage.getItem('token');
        const deviceId = localStorage.getItem('bitflow_device_id') || 'unknown';
        if (token) {
          await apiService.post('/security/tamper-detected', {
            learningUnitId,
            chapterId: isPdfContent ? `pdf-page-${currentPdfPage}` : (currentChapter?.id || 'unknown'),
            deviceId,
            tamperType,
          });
        }
      } catch (e) {
        // Tamper report failed — still force logout
      }
      // Force logout
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      alert('Security violation detected. This session has been terminated.');
      window.location.href = '/login';
    };

    let tamperCount = 0;
    const TAMPER_THRESHOLD = 3; // Require multiple detections to avoid false positives

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check removed nodes
        if (mutation.type === 'childList') {
          for (const removed of Array.from(mutation.removedNodes)) {
            if (removed === watermarkRef.current ||
                (removed instanceof HTMLElement && removed.contains(watermarkRef.current as Node))) {
              tamperCount++;
              if (tamperCount >= TAMPER_THRESHOLD) {
                handleTamperDetected('WATERMARK_REMOVED');
                return;
              }
            }
          }
        }
        // Check attribute changes on the watermark itself
        if (mutation.type === 'attributes' && mutation.target === watermarkRef.current) {
          const el = watermarkRef.current;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' ||
              parseFloat(style.opacity) < 0.01 || style.zIndex === '-1') {
            tamperCount++;
            if (tamperCount >= TAMPER_THRESHOLD) {
              handleTamperDetected('WATERMARK_HIDDEN');
              return;
            }
          }
        }
      }
    });

    // Observe parent of watermark (so we catch removal)
    const parent = watermarkRef.current.parentElement;
    if (parent) {
      observer.observe(parent, {
        childList: true,
        subtree: false,
      });
    }
    // Observe watermark itself for attribute changes
    observer.observe(watermarkRef.current, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [watermark, currentChapter, isPdfContent, currentPdfPage]);

  // Auto-hide toolbar
  const resetToolbarTimeout = () => {
    setToolbarVisible(true);
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    toolbarTimeoutRef.current = setTimeout(() => {
      if (!showSettings && !showChapterPanel && !showNotebookPanel) {
        setToolbarVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const handleMouseMove = () => resetToolbarTimeout();
    const handleScroll = () => {
      if (!contentRef.current) return;
      const scrollTop = contentRef.current.scrollTop;
      const scrollHeight = contentRef.current.scrollHeight;
      const clientHeight = contentRef.current.clientHeight;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
      resetToolbarTimeout();
    };

    document.addEventListener('mousemove', handleMouseMove);
    contentRef.current?.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      contentRef.current?.removeEventListener('scroll', handleScroll);
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, [showSettings, showChapterPanel, showNotebookPanel]);

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Chapter navigation
  const goToPreviousChapter = () => {
    if (!currentChapter) return;
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex > 0) {
      setCurrentChapter(chapters[currentIndex - 1]);
      contentRef.current?.scrollTo(0, 0);
    }
  };

  const goToNextChapter = () => {
    if (!currentChapter) return;
    const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
    if (currentIndex < chapters.length - 1) {
      setCurrentChapter(chapters[currentIndex + 1]);
      contentRef.current?.scrollTo(0, 0);
    }
  };

  if (loading && ((isPdfContent && totalPdfPages <= 0) || (!isPdfContent && !chapterContent))) {
    return (
      <div style={styles.loadingContainer as React.CSSProperties}>
        <div style={styles.spinner as React.CSSProperties}></div>
        <p style={styles.loadingText as React.CSSProperties}>Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer as React.CSSProperties}>
        <span style={styles.errorIcon as React.CSSProperties}>⚠️</span>
        <h2 style={styles.errorTitle as React.CSSProperties}>Error Loading EPUB</h2>
        <p style={styles.errorMessage as React.CSSProperties}>{error}</p>
        {onBack && (
          <button onClick={onBack} style={styles.backButton as React.CSSProperties}>
            <ArrowLeft size={16} />
            Back to Library
          </button>
        )}
      </div>
    );
  }

  const readingWidth = settings.readingWidth === 'wide' ? '960px' : '760px';

  return (
    <div style={styles.container as React.CSSProperties}>
      {/* Toolbar */}
      <div
        className="bf-toolbar"
        style={{
          ...styles.toolbar,
          transform: toolbarVisible ? 'translateY(0)' : 'translateY(-100%)',
        } as React.CSSProperties}
      >
        <div style={styles.toolbarLeft as React.CSSProperties}>
          {onBack && (
            <button onClick={onBack} style={styles.toolbarButton as React.CSSProperties} data-tip="Go Back to Library">
              <ArrowLeft size={20} />
            </button>
          )}
          <button
            onClick={() => {
              setShowChapterPanel(prev => !prev);
            }}
            style={styles.toolbarButton as React.CSSProperties}
            data-tip="Table of Contents"
          >
            <List size={20} />
          </button>
          <span className="bf-chapter-title" style={styles.chapterTitle as React.CSSProperties}>
            {isPdfContent
              ? `Page ${currentPdfPage} of ${totalPdfPages}`
              : (currentChapter?.chapterTitle || 'Loading...')}
          </span>
        </div>
        
        <div style={styles.toolbarRight as React.CSSProperties}>
          {/* Bookmark toggle */}
          <button
            onClick={handleToggleBookmark}
            style={{
              ...styles.toolbarButton,
              color: isCurrentPageBookmarked() ? '#F59E0B' : undefined,
            } as React.CSSProperties}
            data-tip={isCurrentPageBookmarked() ? 'Remove Bookmark' : 'Add Bookmark'}
          >
            {isCurrentPageBookmarked() ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
          {isPdfContent && (
            <>
              {/* Zoom controls */}
              <button onClick={handlePdfZoomOut} style={styles.toolbarButton as React.CSSProperties} data-tip="Zoom Out">
                <ZoomOut size={18} />
              </button>
              {zoomInputEditing ? (
                <input
                  type="number"
                  autoFocus
                  min={50} max={400}
                  value={zoomInputValue}
                  onChange={e => setZoomInputValue(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(zoomInputValue, 10);
                    if (!isNaN(val)) setPdfScale(Math.max(0.5, Math.min(val / 100, 4.0)));
                    setZoomInputEditing(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = parseInt(zoomInputValue, 10);
                      if (!isNaN(val)) setPdfScale(Math.max(0.5, Math.min(val / 100, 4.0)));
                      setZoomInputEditing(false);
                    }
                    if (e.key === 'Escape') setZoomInputEditing(false);
                  }}
                  style={{
                    width: '54px', padding: '2px 4px', fontSize: '12px', textAlign: 'center' as const,
                    border: '1px solid #3B82F6', borderRadius: '4px', outline: 'none',
                  }}
                />
              ) : (
                <span
                  style={{ fontSize: '12px', color: '#374151', minWidth: '42px', textAlign: 'center', cursor: 'text',
                    padding: '2px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#F9FAFB' }}
                  onClick={() => { setZoomInputValue(String(Math.round(pdfScale * 100))); setZoomInputEditing(true); }}
                  title="Click to enter zoom %"
                >
                  {Math.round(pdfScale * 100)}%
                </span>
              )}
              <button onClick={handlePdfZoomIn} style={styles.toolbarButton as React.CSSProperties} data-tip="Zoom In">
                <ZoomIn size={18} />
              </button>
              <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB', margin: '0 2px' }} />
              {/* Fit to page */}
              <button onClick={handleFitToPage} style={{ ...styles.toolbarButton, display: 'flex', alignItems: 'center', gap: '4px' } as React.CSSProperties} data-tip="Fit Page to Screen">
                <Fullscreen size={18} />
                <span style={{ fontSize: '11px', fontWeight: 500 }}>Fit</span>
              </button>
              <button onClick={handleRotateCounterClockwise} style={styles.toolbarButton as React.CSSProperties} data-tip="Rotate Counter-Clockwise">
                <RotateCcw size={18} />
              </button>
              <button onClick={handleRotateClockwise} style={styles.toolbarButton as React.CSSProperties} data-tip="Rotate Clockwise">
                <RotateCw size={18} />
              </button>
              <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB', margin: '0 2px' }} />
              {/* Page View Toggle — icon dynamically shows current mode */}
              <div style={{ position: 'relative' as const, display: 'inline-flex' }}>
              <button
                onClick={() => {
                  if (pdfPageView === 'single') {
                    // Switching to double: force horizontal mode
                    if (pdfViewMode === 'scroll') setPdfViewMode('page');
                    setPdfPageView('double');
                  } else {
                    setPdfPageView('single');
                  }
                }}
                style={{
                  ...styles.toolbarButton,
                  backgroundColor: pdfPageView === 'double' ? '#EFF6FF' : 'transparent',
                  position: 'relative' as const,
                } as React.CSSProperties}
                data-tip={pdfPageView === 'single' ? 'Switch to Double Page View' : 'Switch to Single Page View'}
              >
                {pdfPageView === 'double' ? <Columns size={18} style={{ color: '#3B82F6' }} /> : <Square size={18} />}
              </button>
              </div>
              {/* Reading Mode Dropdown */}
              <select
                value={pdfViewMode}
                onChange={(e) => {
                  const mode = e.target.value as 'page' | 'scroll';
                  if (mode === 'scroll' && pdfPageView === 'double') {
                    setPdfPageView('single');
                  }
                  setPdfViewMode(mode);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  color: '#374151',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Scroll Direction"
              >
                <option value="page">Horizontal</option>
                <option value="scroll">Vertical</option>
              </select>
              <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB', margin: '0 2px' }} />
              {/* Backtrack (Go Back) */}
              <button
                onClick={handleGoBack}
                style={{
                  ...styles.toolbarButton,
                  opacity: pageHistory.length < 2 ? 0.4 : 1,
                } as React.CSSProperties}
                data-tip="Go Back"
                disabled={pageHistory.length < 2}
              >
                <Undo2 size={18} />
              </button>
              {/* Jump to Page */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowJumpToPage(!showJumpToPage)}
                  style={{
                    ...styles.toolbarButton,
                    backgroundColor: showJumpToPage ? '#EFF6FF' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  } as React.CSSProperties}
                  data-tip="Jump to Page"
                >
                  <Navigation size={18} />
                </button>
                {showJumpToPage && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    zIndex: 1200,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    border: '1px solid #E5E7EB',
                  }}>
                    <input
                      type="number"
                      min={1}
                      max={totalPdfPages}
                      value={jumpToPageInput}
                      onChange={(e) => setJumpToPageInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleJumpToPage(); if (e.key === 'Escape') setShowJumpToPage(false); }}
                      placeholder={`1-${totalPdfPages}`}
                      autoFocus
                      style={{
                        width: '70px',
                        padding: '4px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleJumpToPage}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >Go</button>
                  </div>
                )}
              </div>
              {/* Page Theme (background color) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPdfSettings(!showPdfSettings)}
                  style={{
                    ...styles.toolbarButton,
                    backgroundColor: showPdfSettings ? '#EFF6FF' : 'transparent',
                  } as React.CSSProperties}
                  data-tip="Page Theme"
                >
                  <SlidersHorizontal size={18} />
                </button>
                {showPdfSettings && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    zIndex: 1200,
                    padding: '14px 16px',
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: '1px solid #E5E7EB',
                    minWidth: '200px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>Page Theme</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Color</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '220px' }}>
                      {[
                        { color: '#4A4A4A', label: 'Dark Gray' },
                        { color: '#1a1a2e', label: 'Dark Blue' },
                        { color: '#ffffff', label: 'White' },
                        { color: '#f5f0e1', label: 'Sepia' },
                        { color: '#DBEAFE', label: 'Pastel Blue' },
                        { color: '#DCFCE7', label: 'Pastel Green' },
                        { color: '#FEF9C3', label: 'Pastel Yellow' },
                        { color: '#FFE4E6', label: 'Pastel Pink' },
                        { color: '#EDE9FE', label: 'Lavender' },
                        { color: '#FED7AA', label: 'Peach' },
                        { color: '#E0E7FF', label: 'Indigo Light' },
                        { color: '#0d1117', label: 'Night' },
                      ].map(({ color, label }) => (
                        <button
                          key={color}
                          onClick={() => setPdfBgColor(color)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: pdfBgColor === color ? '3px solid #3B82F6' : '2px solid #D1D5DB',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          title={label}
                        />
                      ))}
                    </div>
                    <div style={{ marginTop: '14px', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                      <button
                        onClick={() => { setPdfBgColor('#4A4A4A'); setShowPdfSettings(false); }}
                        style={{
                          width: '100%', padding: '6px 0', fontSize: '12px', fontWeight: 500,
                          color: '#374151', background: '#F9FAFB', border: '1px solid #D1D5DB',
                          borderRadius: '6px', cursor: 'pointer',
                        }}
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <button
            onClick={() => setShowNotebookPanel(!showNotebookPanel)}
            style={{
              ...styles.toolbarButton,
              backgroundColor: showNotebookPanel ? '#EFF6FF' : 'transparent',
            } as React.CSSProperties}
            data-tip="Notebook"
          >
            <BookMarked size={20} />
          </button>
          {/* Book Info */}
          <button
            onClick={() => setShowBookInfoPanel(!showBookInfoPanel)}
            style={{
              ...styles.toolbarButton,
              backgroundColor: showBookInfoPanel ? '#EFF6FF' : 'transparent',
            } as React.CSSProperties}
            data-tip="Book Info"
          >
            <Info size={20} />
          </button>
          {!isPdfContent && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={styles.toolbarButton as React.CSSProperties}
              data-tip="Reader Settings"
            >
              <Settings size={20} />
            </button>
          )}
          <button onClick={toggleFullscreen} style={styles.toolbarButton as React.CSSProperties} data-tip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          {/* Search button — right-most */}
          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            style={{
              ...styles.toolbarButton,
              backgroundColor: showSearchBar ? '#EFF6FF' : 'transparent',
            } as React.CSSProperties}
            data-tip="Search in Book"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer as React.CSSProperties}>
        <div
          style={{
            ...styles.progressBar,
            width: `${scrollProgress}%`,
          } as React.CSSProperties}
        ></div>
      </div>

      {/* Search Bar */}
      {showSearchBar && (
        <div style={{
          position: 'absolute',
          top: '56px',
          right: '16px',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#F8FAFF',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(59,130,246,0.12)',
          border: '1px solid #DBEAFE',
        }}>
          <Search size={16} color="#3B82F6" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); if (e.key === 'Escape') clearSearch(); }}
            placeholder="Search in book…"
            autoFocus
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              width: '200px',
              padding: '4px',
              backgroundColor: 'transparent',
            }}
          />
          {searchResults > 0 && (
            <span style={{ fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
              {searchCurrentIndex + 1}/{searchResults}
            </span>
          )}
          <button onClick={() => navigateSearchResult('prev')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: searchResults > 0 ? '#3B82F6' : '#D1D5DB', padding: '4px' }} title="Previous Result" disabled={searchResults === 0}>
            <ChevronUp size={16} />
          </button>
          <button onClick={() => navigateSearchResult('next')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: searchResults > 0 ? '#3B82F6' : '#D1D5DB', padding: '4px' }} title="Next Result" disabled={searchResults === 0}>
            <ChevronDown size={16} />
          </button>
          <button onClick={handleSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', padding: '4px' }}>
            <Search size={16} />
          </button>
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Chapter / TOC Panel */}
      {showChapterPanel && (
        <div className="bf-chapter-panel" style={styles.chapterPanel as React.CSSProperties}>
          <div style={styles.chapterPanelHeader as React.CSSProperties}>
            <h3 style={styles.chapterPanelTitle as React.CSSProperties}>
              <BookOpen size={20} />
              Table of Contents
            </h3>
            <button
              onClick={() => setShowChapterPanel(false)}
              style={styles.closeButton as React.CSSProperties}
            >
              <X size={20} />
            </button>
          </div>
          <div style={styles.chapterList as React.CSSProperties}>
            {isPdfContent ? (
              /* PDF TOC */
              <>
                {pdfTocEntries.length > 0 ? pdfTocEntries.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentPdfPage(entry.page);
                      setShowChapterPanel(false);
                      if (pdfViewMode === 'scroll') {
                        setTimeout(() => {
                          const el = pdfContainerRef.current?.querySelector(`[data-scroll-page="${entry.page}"]`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      } else {
                        pdfContainerRef.current?.scrollTo(0, 0);
                      }
                    }}
                    style={{
                      ...styles.chapterItem,
                      paddingLeft: entry.level === 1 ? '2rem' : '1rem',
                      ...(currentPdfPage === entry.page ? styles.chapterItemActive : {}),
                    } as React.CSSProperties}
                  >
                    <span style={{
                      ...styles.chapterNumber,
                      minWidth: '36px',
                      fontSize: '0.75rem',
                      color: '#6B7280',
                    } as React.CSSProperties}>
                      p.{entry.page}
                    </span>
                    <span style={{
                      ...styles.chapterItemTitle,
                      fontWeight: entry.level === 0 ? 600 : 400,
                      fontSize: entry.level === 0 ? '0.875rem' : '0.8125rem',
                    } as React.CSSProperties}>
                      {entry.title}
                    </span>
                  </button>
                )) : (
                  /* Fallback: show page buttons while TOC loads (limited) */
                  Array.from({ length: Math.min(totalPdfPages, 200) }, (_, i) => i + 1).map(pg => (
                    <button
                      key={pg}
                      onClick={() => {
                        setCurrentPdfPage(pg);
                        setShowChapterPanel(false);
                        if (pdfViewMode === 'scroll') {
                          setTimeout(() => {
                            const el = pdfContainerRef.current?.querySelector(`[data-scroll-page="${pg}"]`);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        } else {
                          pdfContainerRef.current?.scrollTo(0, 0);
                        }
                      }}
                      style={{
                        ...styles.chapterItem,
                        ...(currentPdfPage === pg ? styles.chapterItemActive : {}),
                      } as React.CSSProperties}
                    >
                      <span style={styles.chapterNumber as React.CSSProperties}>{pg}</span>
                      <span style={styles.chapterItemTitle as React.CSSProperties}>Page {pg}</span>
                    </button>
                  ))
                )}
              </>
            ) : (
              /* EPUB chapters */
              chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    setCurrentChapter(chapter);
                    setShowChapterPanel(false);
                    contentRef.current?.scrollTo(0, 0);
                  }}
                  style={{
                    ...styles.chapterItem,
                    ...(currentChapter?.id === chapter.id ? styles.chapterItemActive : {}),
                  } as React.CSSProperties}
                >
                  <span style={styles.chapterNumber as React.CSSProperties}>
                    {chapter.chapterOrder}
                  </span>
                  <span style={styles.chapterItemTitle as React.CSSProperties}>
                    {chapter.chapterTitle}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notebook Panel */}
      {showNotebookPanel && (
        <div className="bf-notebook-panel" style={styles.notebookPanel as React.CSSProperties}>
          <div style={styles.notebookHeader as React.CSSProperties}>
            <h3 style={styles.notebookTitle as React.CSSProperties}>
              <BookOpen size={18} />
              My Notebook
            </h3>
            <button
              onClick={() => setShowNotebookPanel(false)}
              style={{ ...styles.closeButton, color: '#FFFFFF', opacity: 0.85 } as React.CSSProperties}
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Notebook Tabs */}
          <div style={styles.notebookTabs as React.CSSProperties}>
            <button
              onClick={() => setNotebookTab('highlights')}
              style={{
                ...styles.notebookTab,
                ...(notebookTab === 'highlights' ? styles.notebookTabActive : {}),
              } as React.CSSProperties}
            >
              <Highlighter size={14} style={{ flexShrink: 0 }} />
              {highlights.length}
            </button>
            <button
              onClick={() => setNotebookTab('notes')}
              style={{
                ...styles.notebookTab,
                ...(notebookTab === 'notes' ? styles.notebookTabActive : {}),
              } as React.CSSProperties}
            >
              <StickyNote size={14} style={{ flexShrink: 0 }} />
              Notes {notes.length}
            </button>
            <button
              onClick={() => setNotebookTab('flashcards')}
              style={{
                ...styles.notebookTab,
                ...(notebookTab === 'flashcards' ? styles.notebookTabActive : {}),
              } as React.CSSProperties}
            >
              <SquareStack size={14} style={{ flexShrink: 0 }} />
              Cards {flashcards.length}
            </button>
            <button
              onClick={() => setNotebookTab('bookmarks' as any)}
              style={{
                ...styles.notebookTab,
                ...(notebookTab === ('bookmarks' as any) ? styles.notebookTabActive : {}),
              } as React.CSSProperties}
            >
              <Bookmark size={14} style={{ flexShrink: 0 }} />
              Bookmarks {bookmarks.length}
            </button>
          </div>

          {/* Notebook Content */}
          <div style={styles.notebookContent as React.CSSProperties}>
            {notebookTab === 'highlights' && (
              <div>
                {/* Filter: All / Highlights / Underlines */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', padding: '0 4px' }}>
                  {[
                    { key: 'all' as const, label: 'All' },
                    { key: 'highlight' as const, label: 'Highlights' },
                    { key: 'underline' as const, label: 'Underlines' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setHighlightFilter(f.key)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: highlightFilter === f.key ? '1px solid #3B82F6' : '1px solid #E5E7EB',
                        backgroundColor: highlightFilter === f.key ? '#EFF6FF' : '#fff',
                        color: highlightFilter === f.key ? '#3B82F6' : '#6B7280',
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {highlights
                  .filter(h => highlightFilter === 'all' ? true : h.style === highlightFilter)
                  .map((highlight) => {
                  const pageLabel = getPageLabel(highlight.chapterId);
                  return (
                  <div
                    key={highlight.id}
                    style={{
                      ...styles.notebookItem,
                      cursor: 'pointer',
                      borderLeft: `4px solid ${highlight.color === 'yellow' ? '#FBBF24' : highlight.color}`,
                    } as React.CSSProperties}
                    onClick={() => navigateToAnnotation(highlight.chapterId)}
                    title={`Go to ${pageLabel}`}
                  >
                    <div style={styles.notebookItemHeader as React.CSSProperties}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            ...styles.highlightColorDot,
                            backgroundColor: highlight.color === 'yellow' ? '#FDE68A' : highlight.color,
                          } as React.CSSProperties}
                        ></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {highlight.style === 'underline' ? 'Underline' : 'Highlight'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(highlight.id); }}
                        style={styles.deleteButton as React.CSSProperties}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={styles.notebookItemText as React.CSSProperties}>
                      {highlight.selectedText}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.375rem' } as React.CSSProperties}>
                      <span style={styles.notebookItemDate as React.CSSProperties}>{formatDate(highlight.createdAt)}</span>
                      <span style={{ color: '#6366F1', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>{pageLabel} →</span>
                    </div>
                  </div>
                  );
                })}
                {highlights.length === 0 && (
                  <p style={styles.emptyState as React.CSSProperties}>
                    No highlights yet. Select text to create your first highlight.
                  </p>
                )}
              </div>
            )}

            {notebookTab === 'notes' && (
              <div>
                {notes.map((note) => {
                  const pageLabel = getPageLabel(note.chapterId);
                  return (
                  <div
                    key={note.id}
                    style={{
                      ...styles.notebookItem,
                      cursor: 'pointer',
                      borderLeft: '4px solid #6366F1',
                    } as React.CSSProperties}
                    onClick={() => navigateToAnnotation(note.chapterId)}
                    title={`Go to ${pageLabel}`}
                  >
                    <div style={styles.notebookItemHeader as React.CSSProperties}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <StickyNote size={14} color="#FFFFFF" />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note</span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditNote(note); }}
                          style={styles.deleteButton as React.CSSProperties}
                          title="Edit note"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                          style={styles.deleteButton as React.CSSProperties}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {note.selectedText && (
                      <p style={styles.noteSelection as React.CSSProperties}>
                        "{note.selectedText}"
                      </p>
                    )}
                    <p style={styles.notebookItemText as React.CSSProperties}>{note.content}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.375rem' } as React.CSSProperties}>
                      <span style={styles.notebookItemDate as React.CSSProperties}>{formatDate(note.createdAt)}</span>
                      <span style={{ color: '#6366F1', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>{pageLabel} →</span>
                    </div>
                  </div>
                  );
                })}
                {notes.length === 0 && (
                  <p style={styles.emptyState as React.CSSProperties}>
                    No notes yet. Select text and add a note to get started.
                  </p>
                )}
              </div>
            )}

            {notebookTab === 'flashcards' && (
              <div>
                {/* Quiz Mode Button */}
                {flashcards.length > 0 && !quizMode && (
                  <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={startQuizMode}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#7C3AED',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <SquareStack size={16} />
                    Quiz ({flashcards.length})
                  </button>
                  </div>
                )}
                {flashcards.map((flashcard) => {
                  const isFlipped = flippedCards.has(flashcard.id);
                  const fcPageMatch = flashcard.chapterId.match(/pdf-page-(\d+)/);
                  const fcPageLabel = getPageLabel(flashcard.chapterId);
                  return (
                    <div key={flashcard.id} style={{ marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          display: 'flex', justifyContent: 'flex-end', marginBottom: '4px',
                        }}
                      >
                        <button
                          onClick={() => navigateToAnnotation(flashcard.chapterId)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#3B82F6', fontSize: '0.7rem', padding: '2px 4px',
                            display: 'flex', alignItems: 'center', gap: '2px',
                          }}
                          title={`Go to ${fcPageLabel}`}
                        >
                          {fcPageLabel} →
                        </button>
                      </div>
                    <div
                      onClick={() => {
                        setFlippedCards(prev => {
                          const next = new Set(prev);
                          if (next.has(flashcard.id)) next.delete(flashcard.id);
                          else next.add(flashcard.id);
                          return next;
                        });
                      }}
                      style={{
                        perspective: '600px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: '120px',
                        transition: 'transform 0.5s',
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      } as React.CSSProperties}>
                        {/* FRONT - Question */}
                        <div style={{
                          position: isFlipped ? 'absolute' : 'relative',
                          width: '100%',
                          minHeight: '120px',
                          backfaceVisibility: 'hidden',
                          backgroundColor: '#EFF6FF',
                          borderRadius: '12px',
                          border: '1px solid #BFDBFE',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box',
                        } as React.CSSProperties}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px' }}>FRONT</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFlashcard(flashcard.id); }}
                              style={{ ...styles.deleteButton, padding: '2px' } as React.CSSProperties}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: '#1E3A5F', fontWeight: 500, flex: 1, display: 'flex', alignItems: 'center' }}>
                            {flashcard.question}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: '#93C5FD', marginTop: '0.5rem', textAlign: 'center' }}>tap to flip</p>
                        </div>
                        {/* BACK - Answer */}
                        <div style={{
                          position: isFlipped ? 'relative' : 'absolute',
                          top: isFlipped ? undefined : 0,
                          left: isFlipped ? undefined : 0,
                          width: '100%',
                          minHeight: '120px',
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          backgroundColor: '#F0FDF4',
                          borderRadius: '12px',
                          border: '1px solid #BBF7D0',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box',
                        } as React.CSSProperties}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', flexShrink: 0 }}>BACK</span>
                          <p style={{ fontSize: '0.875rem', color: '#14532D', flex: 1, lineHeight: 1.5, overflowY: 'auto', maxHeight: '160px', minHeight: 0, paddingRight: '4px' }}>
                            {flashcard.answer}
                          </p>
                          <p style={{ fontSize: '0.7rem', color: '#86EFAC', marginTop: '0.5rem', textAlign: 'center', flexShrink: 0 }}>tap to flip</p>
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })}
                {flashcards.length === 0 && (
                  <p style={styles.emptyState as React.CSSProperties}>
                    No flashcards yet. Select text and create a flashcard to study later.
                  </p>
                )}
              </div>
            )}

            {notebookTab === 'bookmarks' && (
              <div>
                {bookmarks.map((bookmark) => {
                  const bmPageLabel = bookmark.pageLabel || getPageLabel(bookmark.chapterId);
                  return (
                  <div
                    key={bookmark.id}
                    style={{
                      ...styles.notebookItem,
                      cursor: 'pointer',
                      borderLeft: '4px solid #F59E0B',
                    } as React.CSSProperties}
                    onClick={() => navigateToAnnotation(bookmark.chapterId)}
                    title={`Go to ${bmPageLabel}`}
                  >
                    <div style={styles.notebookItemHeader as React.CSSProperties}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BookmarkCheck size={14} color="#FFFFFF" />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bookmark</span>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await apiService.delete(`/annotations/bookmarks/${bookmark.id}`);
                            setBookmarks(bookmarks.filter(b => b.id !== bookmark.id));
                          } catch (err) {
                            console.error('Failed to delete bookmark:', err);
                          }
                        }}
                        style={styles.deleteButton as React.CSSProperties}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ ...styles.notebookItemText, color: '#1E293B', fontWeight: 500 } as React.CSSProperties}>
                      {bookmark.pageLabel || bmPageLabel}
                    </p>
                    {bookmark.note && (
                      <p style={{ ...styles.notebookItemDate, color: '#64748B', fontSize: '0.8rem', marginTop: '0.25rem' } as React.CSSProperties}>{bookmark.note}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.375rem' } as React.CSSProperties}>
                      <span style={styles.notebookItemDate as React.CSSProperties}>{formatDate(bookmark.createdAt)}</span>
                      <span style={{ color: '#6366F1', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>{bmPageLabel} →</span>
                    </div>
                  </div>
                  );
                })}
                {bookmarks.length === 0 && (
                  <p style={styles.emptyState as React.CSSProperties}>
                    No bookmarks yet. Click the bookmark icon in the toolbar to bookmark a page.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bf-settings-panel" style={styles.settingsPanel as React.CSSProperties}>
          <div style={styles.settingsPanelHeader as React.CSSProperties}>
            <h3 style={styles.settingsTitle as React.CSSProperties}>
              <Settings size={20} />
              Reader Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              style={styles.closeButton as React.CSSProperties}
            >
              <X size={20} />
            </button>
          </div>

          <div style={styles.settingsContent as React.CSSProperties}>
            {/* Font Size */}
            <div style={styles.settingItem as React.CSSProperties}>
              <label style={styles.settingLabel as React.CSSProperties}>
                Font Size: {settings.fontSize}px
              </label>
              <input
                type="range"
                min="14"
                max="24"
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                style={styles.slider as React.CSSProperties}
              />
            </div>

            {/* Line Spacing */}
            <div style={styles.settingItem as React.CSSProperties}>
              <label style={styles.settingLabel as React.CSSProperties}>
                Line Spacing: {settings.lineSpacing.toFixed(2)}
              </label>
              <input
                type="range"
                min="1.4"
                max="2.2"
                step="0.1"
                value={settings.lineSpacing}
                onChange={(e) =>
                  setSettings({ ...settings, lineSpacing: parseFloat(e.target.value) })
                }
                style={styles.slider as React.CSSProperties}
              />
            </div>

            {/* Reading Width */}
            <div style={styles.settingItem as React.CSSProperties}>
              <label style={styles.settingLabel as React.CSSProperties}>Reading Width</label>
              <div style={styles.buttonGroup as React.CSSProperties}>
                <button
                  onClick={() => setSettings({ ...settings, readingWidth: 'normal' })}
                  style={{
                    ...styles.toggleButton,
                    ...(settings.readingWidth === 'normal' ? styles.toggleButtonActive : {}),
                  } as React.CSSProperties}
                >
                  Normal
                </button>
                <button
                  onClick={() => setSettings({ ...settings, readingWidth: 'wide' })}
                  style={{
                    ...styles.toggleButton,
                    ...(settings.readingWidth === 'wide' ? styles.toggleButtonActive : {}),
                  } as React.CSSProperties}
                >
                  Wide
                </button>
              </div>
            </div>

            {/* Focus Mode */}
            <div style={styles.settingItem as React.CSSProperties}>
              <label style={styles.settingLabel as React.CSSProperties}>Focus Mode</label>
              <button
                onClick={() => setSettings({ ...settings, focusMode: !settings.focusMode })}
                style={{
                  ...styles.toggleButton,
                  ...(settings.focusMode ? styles.toggleButtonActive : {}),
                  width: '100%',
                } as React.CSSProperties}
              >
                {settings.focusMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlight CSS Styles */}
      <style>{`
        /* Custom tooltip for toolbar buttons */
        .bf-toolbar [data-tip] { position: relative; }
        .bf-toolbar [data-tip]:hover::after {
          content: attr(data-tip);
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 10px;
          background: #1F2937;
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          border-radius: 6px;
          z-index: 9999;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          letter-spacing: 0.01em;
        }
        .bf-toolbar [data-tip]:hover::before {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-bottom-color: #1F2937;
          z-index: 9999;
          pointer-events: none;
        }
        .bf-highlight { cursor: pointer; display: inline; line-height: inherit; transition: background-color 0.2s, filter 0.2s; box-decoration-break: clone; -webkit-box-decoration-break: clone; border-radius: 2px; padding: 0 1px; }
        .bf-highlight-yellow { background-color: rgba(255, 220, 0, 0.50); }
        .bf-highlight-green { background-color: rgba(80, 200, 80, 0.50); }
        .bf-highlight-blue { background-color: rgba(80, 160, 255, 0.50); }
        .bf-highlight-pink { background-color: rgba(255, 100, 170, 0.50); }
        .bf-highlight-orange { background-color: rgba(255, 150, 30, 0.50); }
        .bf-highlight:hover { filter: brightness(0.88); }
        
        /* Underline style */
        .bf-underline { background-color: transparent !important; text-decoration: underline; text-decoration-style: solid; text-decoration-color: #3B82F6; text-decoration-thickness: 0.1em; text-underline-offset: 0.15em; cursor: pointer; transition: text-decoration-color 0.2s; }
        .bf-underline:hover { text-decoration-color: #1D4ED8; text-decoration-thickness: 0.15em; }

        /* Clean text selection styling */
        .bf-reading-content ::selection { background: rgba(10, 132, 255, 0.2); color: inherit; }
        .bf-reading-content ::-moz-selection { background: rgba(10, 132, 255, 0.2); color: inherit; }

        /* PDF text layer — invisible text aligned over the canvas for selection */
        .pdf-text-layer { line-height: 1.0; z-index: 2; transform-origin: 0 0; }
        .pdf-text-layer > span { color: transparent !important; position: absolute; white-space: pre; transform-origin: 0% 0%; cursor: text; line-height: 1.0; }
        .pdf-text-layer br { display: none; }

        .pdf-text-layer ::selection { background: rgba(10, 132, 255, 0.25) !important; color: transparent !important; }
        .pdf-text-layer ::-moz-selection { background: rgba(10, 132, 255, 0.25) !important; color: transparent !important; }
        .pdf-text-layer span::selection { background: rgba(10, 132, 255, 0.25) !important; }
        .pdf-text-layer span::-moz-selection { background: rgba(10, 132, 255, 0.25) !important; }

        /* Highlight marks — injected inside pdf.js text spans.
           The parent text-layer has mix-blend-mode:multiply, so these
           highlight backgrounds blend with the canvas text below. */
        .bf-hl-mark {
          color: transparent !important;
          border-radius: 2px;
          padding: 3px 0;
          margin: -3px 0;
        }
        .bf-hl-mark::selection { background: rgba(10, 132, 255, 0.25) !important; color: transparent !important; }
        .bf-hl-mark::-moz-selection { background: rgba(10, 132, 255, 0.25) !important; color: transparent !important; }
        
        /* Search highlights */
        .search-highlight { background: rgba(255, 200, 0, 0.5) !important; color: inherit !important; }
        .search-highlight-active { background: rgba(255, 120, 0, 0.8) !important; outline: 2px solid #F97316; }

        /* Note icons — sticky note style indicator on noted text */
        .bf-note-icon {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          line-height: 1;
          vertical-align: middle;
          cursor: pointer;
          margin-left: 2px;
          margin-right: 1px;
          position: relative !important;
          z-index: 5;
          border-radius: 2px;
          background: linear-gradient(135deg, #FDE68A 60%, #F59E0B);
          color: #92400E !important;
          box-shadow: 0 1px 3px rgba(245, 158, 11, 0.3), 1px 1px 0 rgba(0,0,0,0.05);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          -webkit-user-select: none;
        }
        .bf-note-icon::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 6px;
          height: 6px;
          background: linear-gradient(135deg, transparent 50%, #D97706 50%);
          border-radius: 0 3px 0 0;
        }
        .bf-note-icon:hover {
          transform: scale(1.15);
          background: linear-gradient(135deg, #FCD34D 60%, #F59E0B);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
        }
        .bf-note-icon svg {
          display: block;
          flex-shrink: 0;
        }
        .pdf-text-layer .bf-note-icon {
          color: #92400E !important;
          display: inline-flex !important;
          position: relative !important;
          width: 14px;
          height: 14px;
        }

        /* Notebook panel hover effects */
        .bf-notebook-panel > div:nth-child(3) > div > div:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: #C7D2FE;
        }

        /* Custom scrollbar for notebook content */
        .bf-notebook-panel > div:nth-child(3) {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E1 transparent;
        }
        .bf-notebook-panel > div:nth-child(3)::-webkit-scrollbar {
          width: 5px;
        }
        .bf-notebook-panel > div:nth-child(3)::-webkit-scrollbar-track {
          background: transparent;
        }
        .bf-notebook-panel > div:nth-child(3)::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 10px;
        }
        .bf-notebook-panel > div:nth-child(3)::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>

      {/* Selection Toolbar */}
      {showSelectionToolbar && currentSelection && (
        <div
          ref={selectionToolbarRef}
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'fixed',
            left: `${selectionToolbarPosition.x}px`,
            top: `${selectionToolbarPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 2000,
          } as React.CSSProperties}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '6px 10px',
            backgroundColor: '#1F2937',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
          }}>
            {/* Highlight color buttons */}
            {[
              { color: 'yellow', bg: '#FACC15' },
              { color: 'green', bg: '#22C55E' },
              { color: 'blue', bg: '#3B82F6' },
              { color: 'pink', bg: '#EC4899' },
              { color: 'orange', bg: '#F97316' },
            ].map((c) => (
              <button
                key={c.color}
                onClick={() => handleCreateHighlight(c.color)}
                title={`Highlight ${c.color}`}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.2)',
                  backgroundColor: c.bg,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  padding: 0,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.25)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              />
            ))}
            {/* Divider */}
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px', flexShrink: 0 }} />
            {/* Underline button */}
            <button
              onClick={handleCreateUnderline}
              title="Underline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.15s',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D1D5DB';
              }}
            >
              <Underline size={15} />
            </button>
            {/* Note button */}
            <button
              onClick={handleOpenNoteModal}
              title="Add Note"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.15s',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D1D5DB';
              }}
            >
              <StickyNote size={15} />
            </button>
            {/* Flashcard button */}
            <button
              onClick={handleOpenFlashcardModal}
              title="Create Flashcard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#D1D5DB',
                cursor: 'pointer',
                transition: 'all 0.15s',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#D1D5DB';
              }}
            >
              <GalleryHorizontal size={15} />
            </button>
          </div>
          {/* Arrow pointing down */}
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid #1F2937',
            margin: '0 auto',
          }} />
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div style={styles.modalOverlay as React.CSSProperties}>
          <div className="bf-modal" style={styles.modal as React.CSSProperties}>
            <div style={styles.modalHeader as React.CSSProperties}>
              <h3 style={styles.modalTitle as React.CSSProperties}>Add Note</h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteContent('');
                }}
                style={styles.closeButton as React.CSSProperties}
              >
                <X size={20} />
              </button>
            </div>
            {currentSelection && (
              <p style={styles.selectedTextPreview as React.CSSProperties}>
                "{currentSelection.text}"
              </p>
            )}
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Type your note here..."
              style={styles.textarea as React.CSSProperties}
              autoFocus
            />
            <div style={styles.modalActions as React.CSSProperties}>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteContent('');
                }}
                style={styles.cancelButton as React.CSSProperties}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                style={styles.primaryButton as React.CSSProperties}
                disabled={!noteContent.trim()}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Popover — shown when clicking a note icon in text layer */}
      {expandedNoteId && notePopoverPos && (() => {
        const note = notes.find(n => n.id === expandedNoteId);
        if (!note) return null;
        return (
          <div
            style={{
              position: 'fixed',
              top: notePopoverPos.y - 8,
              left: notePopoverPos.x,
              transform: 'translate(-50%, -100%)',
              zIndex: 10000,
              width: 280,
              background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
              border: '1px solid #F59E0B',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(245,158,11,0.2)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#FFFBEB',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>Note</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => { handleDeleteNote(expandedNoteId); setExpandedNoteId(null); setNotePopoverPos(null); }}
                  title="Delete note"
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                    cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center',
                    color: '#FFFBEB',
                  }}
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => { setExpandedNoteId(null); setNotePopoverPos(null); }}
                  title="Close"
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                    cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center',
                    color: '#FFFBEB',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            {/* Quoted text */}
            {note.selectedText && (
              <div style={{
                padding: '8px 10px', fontSize: 11, color: '#92400E',
                borderBottom: '1px solid #FDE68A', fontStyle: 'italic',
                lineHeight: 1.4, maxHeight: 60, overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                "{note.selectedText.slice(0, 120)}{note.selectedText.length > 120 ? '…' : ''}"
              </div>
            )}
            {/* Note content */}
            <div style={{
              padding: '8px 10px', fontSize: 12, color: '#78350F',
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {note.content}
            </div>
            {/* Arrow pointing down */}
            <div style={{
              position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
              borderTop: '6px solid #FEF3C7',
            }} />
          </div>
        );
      })()}

      {/* Flashcard Modal */}
      {showFlashcardModal && (
        <div style={styles.modalOverlay as React.CSSProperties}>
          <div className="bf-modal" style={{ ...styles.modal, display: 'flex', flexDirection: 'column', maxHeight: '90vh' } as React.CSSProperties}>
            {/* Sticky header */}
            <div style={{ ...styles.modalHeader, flexShrink: 0 } as React.CSSProperties}>
              <h3 style={styles.modalTitle as React.CSSProperties}>Create Flashcard</h3>
              <button
                onClick={() => { setShowFlashcardModal(false); setFlashcardQuestion(''); setFlashcardError(''); }}
                style={styles.closeButton as React.CSSProperties}
              >
                <X size={20} />
              </button>
            </div>
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* Answer preview */}
              <div style={{ padding: '12px 20px', backgroundColor: '#EFF6FF', borderBottom: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Answer (selected text)</p>
                <div style={{
                  maxHeight: '120px', overflowY: 'auto', fontSize: '0.875rem', color: '#374151',
                  lineHeight: 1.6, background: '#fff', borderRadius: 6, padding: '8px 10px',
                  border: '1px solid #BFDBFE',
                }}>
                  {currentSelection?.text}
                </div>
              </div>
              {/* Question input */}
              <div style={{ padding: '16px 20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Question *
                </label>
                <input
                  type="text"
                  value={flashcardQuestion}
                  onChange={(e) => { setFlashcardQuestion(e.target.value); setFlashcardError(''); }}
                  placeholder="Type the question for this flashcard..."
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: '0.875rem',
                    border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && flashcardQuestion.trim()) handleCreateFlashcard(); }}
                />
                {flashcardError && (
                  <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0 0', padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>
                    {flashcardError}
                  </p>
                )}
              </div>
            </div>
            {/* Sticky footer */}
            <div style={{ ...styles.modalActions, flexShrink: 0 } as React.CSSProperties}>
              <button
                onClick={() => { setShowFlashcardModal(false); setFlashcardQuestion(''); setFlashcardError(''); }}
                style={styles.cancelButton as React.CSSProperties}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFlashcard}
                style={styles.primaryButton as React.CSSProperties}
                disabled={!flashcardQuestion.trim() || flashcardCreating}
              >
                {flashcardCreating ? 'Creating...' : 'Create Flashcard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Edit Modal */}
      {editingNote && (
        <div style={styles.modalOverlay as React.CSSProperties}>
          <div className="bf-modal" style={styles.modal as React.CSSProperties}>
            <div style={styles.modalHeader as React.CSSProperties}>
              <h3 style={styles.modalTitle as React.CSSProperties}>Edit Note</h3>
              <button
                onClick={() => { setEditingNote(null); setEditNoteContent(''); }}
                style={styles.closeButton as React.CSSProperties}
              >
                <X size={20} />
              </button>
            </div>
            {editingNote.selectedText && (
              <p style={styles.selectedTextPreview as React.CSSProperties}>
                "{editingNote.selectedText}"
              </p>
            )}
            <textarea
              value={editNoteContent}
              onChange={(e) => setEditNoteContent(e.target.value)}
              placeholder="Edit your note..."
              style={styles.textarea as React.CSSProperties}
              autoFocus
            />
            <div style={styles.modalActions as React.CSSProperties}>
              <button
                onClick={() => { setEditingNote(null); setEditNoteContent(''); }}
                style={styles.cancelButton as React.CSSProperties}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedNote}
                style={styles.primaryButton as React.CSSProperties}
                disabled={!editNoteContent.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Mode Modal */}
      {quizMode && quizCards.length > 0 && (
        <div style={styles.modalOverlay as React.CSSProperties}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>
                Quiz Mode — Card {quizIndex + 1} / {quizCards.length}
              </h3>
              <button
                onClick={() => { setQuizMode(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {quizCards.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: i < quizIndex ? '#22C55E' : i === quizIndex ? '#3B82F6' : '#E5E7EB',
                }} />
              ))}
            </div>

            {/* Question */}
            <div style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid #BFDBFE',
            }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>QUESTION</p>
              <p style={{ fontSize: '1rem', color: '#1E3A5F', fontWeight: 500, margin: 0 }}>
                {quizCards[quizIndex]?.question}
              </p>
            </div>

            {/* Answer (hidden until revealed) */}
            {!quizShowAnswer ? (
              <button
                onClick={() => setQuizShowAnswer(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#F1F5F9',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#64748B',
                  fontWeight: 500,
                }}
              >
                Tap to reveal answer
              </button>
            ) : (
              <>
                <div style={{
                  backgroundColor: '#F0FDF4',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid #BBF7D0',
                }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16A34A', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>ANSWER</p>
                  <p style={{ fontSize: '0.925rem', color: '#14532D', margin: 0, lineHeight: 1.5, maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {quizCards[quizIndex]?.answer}
                  </p>
                </div>

                {/* Next / Done button */}
                  <button
                    onClick={() => {
                      if (quizIndex < quizCards.length - 1) {
                        setQuizIndex(quizIndex + 1);
                        setQuizShowAnswer(false);
                      } else {
                        setQuizMode(false);
                        loadAnnotations();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#7C3AED',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {quizIndex < quizCards.length - 1 ? <><SkipForward size={16} /> Next Card</> : <><Check size={16} /> Finish Quiz</>}
                  </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Book Info Panel */}
      {showBookInfoPanel && (
        <div className="bf-book-info-panel" style={{
          position: 'absolute',
          top: '48px',
          right: 0,
          bottom: 0,
          width: '340px',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E5E7EB',
          zIndex: 1000,
          overflowY: 'auto' as const,
          boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B' }}>
              <Info size={18} />
              Book Info
            </h3>
            <button onClick={() => setShowBookInfoPanel(false)} style={styles.closeButton as React.CSSProperties}>
              <X size={18} />
            </button>
          </div>
          <div style={{ padding: '20px' }}>
            {bookInfo ? (
              <>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>{bookInfo.title}</h4>
                {bookInfo.description && (
                  <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.6, marginBottom: '16px' }}>{bookInfo.description}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                  {bookInfo.author && <InfoRow label="Author" value={bookInfo.author} />}
                  {bookInfo.edition && <InfoRow label="Edition" value={bookInfo.edition} />}
                  {bookInfo.version && <InfoRow label="Version" value={bookInfo.version} />}
                  {bookInfo.publisher && <InfoRow label="Publisher" value={bookInfo.publisher} />}
                  {bookInfo.subject && <InfoRow label="Subject" value={bookInfo.subject} />}
                  {bookInfo.topic && <InfoRow label="Topic" value={bookInfo.topic} />}
                  {bookInfo.difficultyLevel && <InfoRow label="Difficulty" value={bookInfo.difficultyLevel} />}
                  {bookInfo.estimatedDuration && <InfoRow label="Duration" value={`${bookInfo.estimatedDuration} min`} />}
                  <InfoRow label="Views" value={String(bookInfo.viewCount || 0)} />
                  <InfoRow label="Unique Readers" value={String(bookInfo.uniqueViewers || 0)} />
                  {bookInfo.updatedAt && <InfoRow label="Last Updated" value={formatDate(bookInfo.updatedAt)} />}
                </div>

                {bookInfo.courses?.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Courses</h5>
                    {bookInfo.courses.map((c: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.85rem', color: '#374151', padding: '4px 0' }}>
                        {c.name} {c.college && <span style={{ color: '#9CA3AF' }}>— {c.college}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {bookInfo.competencies?.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Competencies</h5>
                    {bookInfo.competencies.map((c: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.85rem', color: '#374151', padding: '4px 0' }}>
                        {c.code && <span style={{ fontWeight: 600, color: '#3B82F6' }}>{c.code} </span>}
                        {c.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'center' as const }}>Loading book info…</p>
            )}
          </div>
        </div>
      )}

      {/* Main Reading Area */}
      {isPdfContent ? (
        /* PDF Viewer Mode - Render PDF pages on canvas inside EPUB reader shell */
        <>
          <div
            ref={pdfContainerRef}
            style={{
              position: 'absolute',
              top: toolbarVisible ? '68px' : '4px',
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'auto',
              backgroundColor: pdfBgColor,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '20px',
              paddingBottom: '80px',
              transition: 'top 0.3s ease, background-color 0.3s ease',
            }}
          >
            {/* Continuous scroll view */}
            {pdfViewMode === 'scroll' && (
              <>
                {Array.from({ length: totalPdfPages }, (_, i) => i + 1).map(pageNum => (
                  <div
                    key={pageNum}
                    data-scroll-page={pageNum}
                    style={{
                      position: 'relative',
                      boxShadow: '0 4px 25px rgba(0,0,0,0.5)',
                      borderRadius: '2px',
                      backgroundColor: '#fff',
                      marginBottom: '16px',
                      flexShrink: 0,
                      overflow: 'hidden',
                      width: `${(pdfRotation === 90 || pdfRotation === 270
                        ? pdfPageDimensionsRef.current.height
                        : pdfPageDimensionsRef.current.width) * pdfScale}px`,
                      minHeight: `${(pdfRotation === 90 || pdfRotation === 270
                        ? pdfPageDimensionsRef.current.width
                        : pdfPageDimensionsRef.current.height) * pdfScale}px`,
                    }}
                  >
                    {/* Loading placeholder */}
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#bbb', fontSize: '13px', zIndex: 0,
                    }}>
                      Page {pageNum}
                    </div>
                    <canvas
                      ref={el => {
                        if (el) scrollCanvasRefs.current.set(pageNum, el);
                        else scrollCanvasRefs.current.delete(pageNum);
                      }}
                      style={{ display: 'block', userSelect: 'none', WebkitUserSelect: 'none' as const, position: 'relative', zIndex: 1 }}
                    />
                    <div
                      ref={el => {
                        if (el) scrollTextLayerRefs.current.set(pageNum, el);
                        else scrollTextLayerRefs.current.delete(pageNum);
                      }}
                      className="pdf-text-layer"
                      style={{
                        position: 'absolute', left: 0, top: 0,
                        width: '100%', height: '100%',
                        zIndex: 2,
                        userSelect: 'text', WebkitUserSelect: 'text' as const, cursor: 'text',
                        mixBlendMode: 'multiply' as const,
                      }}
                    />
                    {/* Watermark — tiled repeating grid */}
                    <div style={{
                      position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                      pointerEvents: 'none', zIndex: 3,
                      display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center',
                      transform: 'rotate(-35deg)',
                      gap: '60px 40px',
                    }}>
                      {Array.from({ length: 12 }).map((_, wi) => (
                        <span key={wi} style={{
                          color: 'rgba(0, 0, 0, 0.06)', fontSize: '16px', fontWeight: 700,
                          whiteSpace: 'nowrap' as const, userSelect: 'none', letterSpacing: '2px',
                        }}>
                          {userWatermarkText}
                        </span>
                      ))}
                    </div>
                    {/* Page number label */}
                    <div style={{
                      position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', padding: '2px 10px',
                      borderRadius: '10px', fontSize: '11px', zIndex: 4, pointerEvents: 'none',
                    }}>
                      Page {pageNum}
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* Pages wrapper — row layout for double-page view */}
            {pdfViewMode !== 'scroll' && (
            <div style={{
              display: 'flex',
              flexDirection: pdfPageView === 'double' ? 'row' : 'column',
              alignItems: 'center',
              gap: pdfPageView === 'double' ? '4px' : '0',
              flexShrink: 0,
            }}>
            {/* PDF Page Canvas (Page 1) */}
            <div style={{
              position: 'relative',
              boxShadow: '0 4px 25px rgba(0,0,0,0.5)',
              borderRadius: '2px',
              backgroundColor: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              <canvas
                ref={pdfCanvasRef}
                style={{
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
              {/* Text layer for selectable text & highlights */}
              <div
                ref={pdfTextLayerRef}
                className="pdf-text-layer"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2,
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  cursor: 'text',
                  mixBlendMode: 'multiply' as const,
                }}
              />
              {/* Page loading overlay */}
              {pdfPageLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  zIndex: 10,
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: '36px', height: '36px',
                      border: '3px solid #e0e0e0',
                      borderTopColor: '#1a73e8',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: '13px', color: '#666' }}>Loading page {currentPdfPage}…</span>
                  </div>
                </div>
              )}
              {/* Watermark overlay on PDF page — tiled repeating grid */}
              <div style={{
                position: 'absolute',
                top: '-50%', left: '-50%', width: '200%', height: '200%',
                pointerEvents: 'none',
                zIndex: 3,
                display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center',
                transform: 'rotate(-35deg)',
                gap: '60px 40px',
              }}>
                {Array.from({ length: 12 }).map((_, wi) => (
                  <span key={wi} style={{
                    color: 'rgba(0, 0, 0, 0.06)', fontSize: '16px', fontWeight: 700,
                    whiteSpace: 'nowrap', userSelect: 'none', letterSpacing: '2px',
                  }}>
                    {userWatermarkText}
                  </span>
                ))}
              </div>
              {/* Note icons — pinned at selection position, not draggable */}
              {notes.filter(n => isPdfContent
                ? n.chapterId === `pdf-page-${currentPdfPage}`
                : n.chapterId === currentChapter?.id
              ).map((note, idx) => {
                const pos = noteIconPositions[note.id] || { xPct: 96, yPct: 5 + idx * 6 };
                return (
                  <div
                    key={note.id}
                    style={{
                      position: 'absolute',
                      left: `${pos.xPct}%`,
                      top: `${pos.yPct}%`,
                      zIndex: 8,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setExpandedNoteId(prev => prev === note.id ? null : note.id);
                      setNotePopoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                    }}
                    title={note.content.slice(0, 80)}
                  >
                    <div style={{
                      width: 20, height: 20,
                      background: 'linear-gradient(135deg, #FDE68A 60%, #F59E0B)',
                      borderRadius: 3,
                      boxShadow: '1px 2px 4px rgba(0,0,0,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#92400E',
                      position: 'relative',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h9l5-5V5a2 2 0 00-2-2zm-7 11H7v-2h5v2zm5-4H7V8h10v2z"/>
                      </svg>
                      <div style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 5, height: 5,
                        background: 'linear-gradient(135deg, transparent 50%, #D97706 50%)',
                        borderRadius: '0 3px 0 0',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Second page canvas for double-page view */}
            {pdfPageView === 'double' && currentPdfPage + 1 <= totalPdfPages && (
              <div style={{
                position: 'relative',
                boxShadow: '0 4px 25px rgba(0,0,0,0.5)',
                borderRadius: '2px',
                backgroundColor: '#fff',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                <canvas
                  ref={pdfCanvas2Ref}
                  style={{
                    display: 'block',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                />
                <div
                  ref={pdfTextLayer2Ref}
                  className="pdf-text-layer"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 2,
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    cursor: 'text',
                    mixBlendMode: 'multiply' as const,
                  }}
                />
                {/* Watermark overlay on second page — tiled repeating grid */}
                <div style={{
                  position: 'absolute',
                  top: '-50%', left: '-50%', width: '200%', height: '200%',
                  pointerEvents: 'none',
                  zIndex: 3,
                  display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center',
                  transform: 'rotate(-35deg)',
                  gap: '60px 40px',
                }}>
                  {Array.from({ length: 12 }).map((_, wi) => (
                    <span key={wi} style={{
                      color: 'rgba(0, 0, 0, 0.06)', fontSize: '16px', fontWeight: 700,
                      whiteSpace: 'nowrap', userSelect: 'none', letterSpacing: '2px',
                    }}>
                      {userWatermarkText}
                    </span>
                  ))}
                </div>
              </div>
            )}
            </div>
            )}

            {/* Page info bar — fixed at bottom center */}
            <div style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 900,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: '25px',
              padding: '8px 20px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              backdropFilter: 'blur(8px)',
            }}>
              {pdfViewMode !== 'scroll' && (
                <button
                  onClick={goToPreviousPdfPage}
                  disabled={currentPdfPage <= 1}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: currentPdfPage <= 1 ? '#666' : '#fff',
                    cursor: currentPdfPage <= 1 ? 'default' : 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <span>
                {pdfViewMode === 'scroll'
                  ? `Page ${currentPdfPage} of ${totalPdfPages}`
                  : pdfPageView === 'double' && currentPdfPage + 1 <= totalPdfPages
                    ? `Pages ${currentPdfPage}-${currentPdfPage + 1} of ${totalPdfPages}`
                    : `Page ${currentPdfPage} of ${totalPdfPages}`}
              </span>
              {pdfViewMode !== 'scroll' && (
                <button
                  onClick={goToNextPdfPage}
                  disabled={currentPdfPage >= totalPdfPages}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: currentPdfPage >= totalPdfPages ? '#666' : '#fff',
                    cursor: currentPdfPage >= totalPdfPages ? 'default' : 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Side navigation buttons for PDF — page mode only */}
          {pdfViewMode !== 'scroll' && (
            <>
              <button
                onClick={goToPreviousPdfPage}
                disabled={currentPdfPage <= 1}
                style={{
                  ...styles.navButton,
                  ...styles.navButtonLeft,
                  opacity: currentPdfPage <= 1 ? 0.3 : 1,
                } as React.CSSProperties}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goToNextPdfPage}
                disabled={currentPdfPage >= totalPdfPages}
                style={{
                  ...styles.navButton,
                  ...styles.navButtonRight,
                  opacity: currentPdfPage >= totalPdfPages ? 0.3 : 1,
                } as React.CSSProperties}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </>
      ) : (
        /* EPUB/HTML Chapter Mode */
        <>
          <div
            ref={contentRef}
            className="bf-reading-container"
            style={{
              ...styles.readingContainer,
              opacity: settings.focusMode ? 0.95 : 1,
            } as React.CSSProperties}
          >
            <div
              className="bf-reading-content"
              data-epub-content
              style={{
                ...styles.readingContent,
                maxWidth: readingWidth,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineSpacing,
              } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(chapterContent) }}
            />

            {/* Watermark — tiled repeating grid */}
            {watermark && (
              <div
                ref={watermarkRef}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  pointerEvents: 'none',
                  zIndex: 9999,
                  display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center',
                  transform: `rotate(${watermark.style.rotation}deg)`,
                  opacity: watermark.style.opacity,
                  gap: '60px 40px',
                  userSelect: 'none',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {Array.from({ length: 12 }).map((_, wi) => (
                  <span key={wi} style={{
                    color: 'rgba(0, 0, 0, 0.15)', fontSize: '16px', fontWeight: 700,
                    whiteSpace: 'nowrap', letterSpacing: '2px', fontFamily: 'monospace',
                  }}>
                    {watermark.text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={goToPreviousChapter}
            disabled={!currentChapter || chapters.findIndex(ch => ch.id === currentChapter.id) === 0}
            style={{
              ...styles.navButton,
              ...styles.navButtonLeft,
              opacity: !currentChapter || chapters.findIndex(ch => ch.id === currentChapter.id) === 0 ? 0.3 : 1,
            } as React.CSSProperties}
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={goToNextChapter}
            disabled={
              !currentChapter ||
              chapters.findIndex(ch => ch.id === currentChapter.id) === chapters.length - 1
            }
            style={{
              ...styles.navButton,
              ...styles.navButtonRight,
              opacity:
                !currentChapter ||
                chapters.findIndex(ch => ch.id === currentChapter.id) === chapters.length - 1
                  ? 0.3
                  : 1,
            } as React.CSSProperties}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
    backgroundColor: '#FAFBFD',
    overflow: 'hidden',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  toolbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '64px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    zIndex: 1000,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  toolbarButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chapterTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },
  progressContainer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: '#E6EEF8',
    zIndex: 999,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0A84FF',
    transition: 'width 0.1s ease-out',
  },
  chapterPanel: {
    position: 'fixed',
    left: 0,
    top: '64px',
    bottom: 0,
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E5E7EB',
    zIndex: 900,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 16px rgba(0, 0, 0, 0.08)',
  },
  chapterPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
  },
  chapterPanelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  chapterList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem',
  },
  chapterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.875rem',
    marginBottom: '0.5rem',
    border: 'none',
    borderLeft: '3px solid transparent',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chapterItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#0A84FF',
  },
  chapterNumber: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6B7280',
    minWidth: '24px',
  },
  chapterItemTitle: {
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: 500,
  },
  notebookPanel: {
    position: 'fixed',
    right: 0,
    top: '64px',
    bottom: 0,
    width: '380px',
    backgroundColor: '#F8FAFC',
    borderLeft: '1px solid #E2E8F0',
    zIndex: 900,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.06)',
  },
  notebookHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
    borderBottom: 'none',
  },
  notebookTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '0.01em',
  },
  notebookTabs: {
    display: 'flex',
    gap: '3px',
    padding: '0.625rem 0.5rem',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  notebookTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.4rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#64748B',
    backgroundColor: 'transparent',
    border: '1.5px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    flex: 1,
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    minWidth: 0,
    overflow: 'hidden',
  },
  notebookTabActive: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    border: '1.5px solid #C7D2FE',
    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.12)',
  },
  notebookContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
  },
  notebookItem: {
    padding: '0.875rem 1rem',
    marginBottom: '0.625rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  notebookItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  highlightColorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.12)',
  },
  deleteButton: {
    padding: '0.3rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  notebookItemText: {
    fontSize: '0.835rem',
    color: '#1E293B',
    lineHeight: 1.65,
    margin: '0.375rem 0',
    fontWeight: 400,
  },
  notebookItemDate: {
    fontSize: '0.7rem',
    color: '#94A3B8',
    margin: 0,
    fontWeight: 500,
  },
  noteSelection: {
    fontSize: '0.8rem',
    color: '#475569',
    fontStyle: 'italic',
    marginBottom: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#F1F5F9',
    borderLeft: '3px solid #6366F1',
    borderRadius: '0 6px 6px 0',
    lineHeight: 1.5,
  },
  flashcardItem: {
    padding: '1rem',
    marginBottom: '0.75rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  flashcardQuestion: {
    fontSize: '0.875rem',
    color: '#111827',
    fontWeight: 500,
    marginBottom: '0.5rem',
  },
  flashcardAnswer: {
    fontSize: '0.875rem',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  emptyState: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    textAlign: 'center',
    padding: '3rem 1.5rem',
    lineHeight: 1.7,
    fontWeight: 400,
  },
  settingsPanel: {
    position: 'fixed',
    right: '1rem',
    top: '80px',
    width: '320px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    zIndex: 1001,
  },
  settingsPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem',
    borderBottom: '1px solid #E5E7EB',
  },
  settingsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  settingsContent: {
    padding: '1.25rem',
  },
  settingItem: {
    marginBottom: '1.5rem',
  },
  settingLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.75rem',
  },
  slider: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    outline: 'none',
    background: '#E5E7EB',
    WebkitAppearance: 'none',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  toggleButton: {
    flex: 1,
    padding: '0.625rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    backgroundColor: '#EFF6FF',
    color: '#0A84FF',
    borderColor: '#0A84FF',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  selectionToolbar: {
    position: 'fixed',
    transform: 'translate(-50%, -100%)',
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
    zIndex: 2000,
  },
  selectionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#0A84FF',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  modal: {
    width: '500px',
    maxWidth: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  selectedTextPreview: {
    padding: '1rem 1.5rem',
    backgroundColor: '#FFF3B0',
    fontSize: '0.875rem',
    color: '#374151',
    fontStyle: 'italic',
    margin: 0,
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  flashcardPreview: {
    padding: '1rem 1.5rem',
    backgroundColor: '#EFF6FF',
    borderBottom: '1px solid #E5E7EB',
  },
  flashcardLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
  },
  flashcardAnswerPreview: {
    fontSize: '0.875rem',
    color: '#374151',
    margin: 0,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1.5rem',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#FFFFFF',
    backgroundColor: '#0A84FF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  readingContainer: {
    position: 'absolute',
    top: '67px',
    left: 0,
    right: 0,
    bottom: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '3rem 2rem',
    backgroundColor: '#FAFBFD',
  },
  readingContent: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '3rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: '0 2px 16px rgba(0, 0, 0, 0.04)',
    fontSize: '18px',
    lineHeight: 1.85,
    color: '#111827',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    cursor: 'text',
  },
  watermark: {
    position: 'fixed',
    fontSize: '0.75rem',
    color: 'rgba(0, 0, 0, 0.15)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 9999,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  navButton: {
    position: 'fixed',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '36px',
    height: '72px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.45)',
    color: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    zIndex: 800,
    backdropFilter: 'blur(4px)',
  },
  navButtonLeft: {
    left: '0.5rem',
  },
  navButtonRight: {
    right: '0.5rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#FAFBFD',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #E5E7EB',
    borderTopColor: '#0A84FF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: '#6B7280',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#FAFBFD',
    padding: '2rem',
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    fontSize: '1rem',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// Add CSS for highlight class and mobile responsiveness
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .bf-highlight {
    cursor: pointer;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Mobile Responsive Breakpoints */
  @media (max-width: 768px) {
    /* Chapter panel becomes full-width overlay */
    .bf-chapter-panel {
      width: 100% !important;
    }
    /* Notebook panel becomes full-width overlay */
    .bf-notebook-panel {
      width: 100% !important;
    }
    /* Settings panel full-width */
    .bf-settings-panel {
      width: calc(100% - 2rem) !important;
      right: 1rem !important;
      left: 1rem !important;
    }
    /* Reading content uses full width with reduced padding */
    .bf-reading-content {
      max-width: 100% !important;
      padding: 1.5rem 1rem !important;
      border-radius: 0 !important;
    }
    /* Toolbar simplified */
    .bf-toolbar {
      padding: 0 0.75rem !important;
      height: 56px !important;
    }
    /* Chapter title truncated shorter */
    .bf-chapter-title {
      max-width: 160px !important;
    }
    /* Nav buttons smaller on mobile */
    .bf-nav-button {
      width: 40px !important;
      height: 40px !important;
    }
    /* Reading container reduced padding */
    .bf-reading-container {
      padding: 1.5rem 0.5rem !important;
    }
    /* Modal full-width on mobile */
    .bf-modal {
      width: calc(100% - 2rem) !important;
      max-width: 100% !important;
    }
  }

  @media (max-width: 480px) {
    .bf-reading-content {
      padding: 1rem 0.75rem !important;
    }
    .bf-chapter-title {
      max-width: 100px !important;
      font-size: 0.75rem !important;
    }
    .bf-toolbar {
      height: 48px !important;
    }
    .bf-toolbar-button {
      width: 32px !important;
      height: 32px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default EpubReaderAnnotated;
