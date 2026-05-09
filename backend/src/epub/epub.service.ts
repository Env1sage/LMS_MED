import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import AdmZip from 'adm-zip';
import sanitizeHtml from 'sanitize-html';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString } from 'pdf-lib';
import { EpubStatus } from '@prisma/client';

@Injectable()
export class EpubService {
  private readonly logger = new Logger(EpubService.name);
  private readonly uploadPath = path.join(process.cwd(), 'uploads', 'epub');
  private readonly extractPath = path.join(process.cwd(), 'uploads', 'epub-extracted');

  constructor(private readonly prisma: PrismaService) {
    // Ensure directories exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
    if (!fs.existsSync(this.extractPath)) {
      fs.mkdirSync(this.extractPath, { recursive: true });
    }
  }

  /**
   * Process an uploaded EPUB file
   * Extracts chapters and stores them with checksums
   */
  async processEpubFile(
    learningUnitId: string,
    epubFilePath: string,
  ): Promise<void> {
    try {
      this.logger.log(`Processing EPUB for learning unit: ${learningUnitId}`);

      // Update status to PROCESSING
      await this.prisma.learning_units.update({
        where: { id: learningUnitId },
        data: { epubStatus: EpubStatus.PROCESSING },
      });

      // Extract EPUB
      const zip = new AdmZip(epubFilePath);
      const extractDir = path.join(this.extractPath, learningUnitId);

      // Create extract directory
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }

      zip.extractAllTo(extractDir, true);

      // Parse EPUB structure (simplified - looks for HTML files)
      const chapters = await this.extractChapters(extractDir, learningUnitId);

      // Save chapter info to database
      let chapterOrder = 1;
      for (const chapter of chapters) {
        const htmlPath = chapter.htmlPath;
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

        // Sanitize HTML to prevent XSS
        const sanitizedHtml = this.sanitizeChapterHtml(htmlContent);

        // Save sanitized HTML
        const sanitizedPath = htmlPath.replace('.html', '.sanitized.html');
        fs.writeFileSync(sanitizedPath, sanitizedHtml);

        // Calculate checksum
        const checksum = this.calculateChecksum(sanitizedHtml);

        // Save to database
        await this.prisma.epub_chapters.create({
          data: {
            learningUnitId,
            chapterTitle: chapter.title || `Chapter ${chapterOrder}`,
            chapterOrder,
            htmlPath: sanitizedPath,
            checksum,
          },
        });

        chapterOrder++;
      }

      // Update learning unit status
      await this.prisma.learning_units.update({
        where: { id: learningUnitId },
        data: {
          epubStatus: EpubStatus.PROCESSED,
          chapterCount: chapters.length,
          storagePath: extractDir,
          fileFormat: 'EPUB',
        },
      });

      this.logger.log(`EPUB processed successfully: ${chapters.length} chapters`);
    } catch (error) {
      this.logger.error(`EPUB processing failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);

      // Update status to FAILED
      await this.prisma.learning_units.update({
        where: { id: learningUnitId },
        data: { epubStatus: EpubStatus.FAILED },
      });

      throw new InternalServerErrorException('Failed to process EPUB file');
    }
  }

  /**
   * Extract chapter information from EPUB structure
   * Parses container.xml → content.opf → spine for proper reading order
   */
  private async extractChapters(
    extractDir: string,
    learningUnitId: string,
  ): Promise<Array<{ title: string; htmlPath: string }>> {
    const chapters: Array<{ title: string; htmlPath: string }> = [];

    try {
      // Step 1: Parse container.xml to find content.opf location
      const containerPath = path.join(extractDir, 'META-INF', 'container.xml');
      if (fs.existsSync(containerPath)) {
        const containerXml = fs.readFileSync(containerPath, 'utf-8');
        const $container = cheerio.load(containerXml, { xmlMode: true });
        const opfRelativePath = $container('rootfile').attr('full-path');

        if (opfRelativePath) {
          const opfPath = path.join(extractDir, opfRelativePath);
          const opfDir = path.dirname(opfPath);

          if (fs.existsSync(opfPath)) {
            const opfXml = fs.readFileSync(opfPath, 'utf-8');
            const $opf = cheerio.load(opfXml, { xmlMode: true });

            // Step 2: Build manifest map (id → href + media-type)
            const manifest: Record<string, { href: string; mediaType: string }> = {};
            $opf('manifest item').each((_, el) => {
              const id = $opf(el).attr('id');
              const href = $opf(el).attr('href');
              const mediaType = $opf(el).attr('media-type') || '';
              if (id && href) {
                manifest[id] = { href, mediaType };
              }
            });

            // Step 3: Read spine for reading order
            const spineItems: string[] = [];
            $opf('spine itemref').each((_, el) => {
              const idref = $opf(el).attr('idref');
              if (idref) spineItems.push(idref);
            });

            // Step 4: Build TOC title map from NCX (if present)
            const titleMap: Record<string, string> = {};
            const tocId = $opf('spine').attr('toc');
            if (tocId && manifest[tocId]) {
              const ncxPath = path.join(opfDir, manifest[tocId].href);
              if (fs.existsSync(ncxPath)) {
                try {
                  const ncxXml = fs.readFileSync(ncxPath, 'utf-8');
                  const $ncx = cheerio.load(ncxXml, { xmlMode: true });
                  $ncx('navPoint').each((_, el) => {
                    const label = $ncx(el).find('> navLabel > text').first().text().trim();
                    const src = $ncx(el).find('> content').first().attr('src');
                    if (label && src) {
                      // Strip fragment (#section1) from src for matching
                      const srcBase = src.split('#')[0];
                      titleMap[srcBase] = label;
                    }
                  });
                } catch (e) {
                  this.logger.warn(`Failed to parse NCX: ${e instanceof Error ? e.message : String(e)}`);
                }
              }
            }

            // Step 5: Resolve spine items to file paths with titles
            for (const itemId of spineItems) {
              const item = manifest[itemId];
              if (!item) continue;
              // Only include HTML/XHTML content documents
              if (!item.mediaType.includes('html') && !item.mediaType.includes('xml')) continue;

              const filePath = path.join(opfDir, item.href);
              if (fs.existsSync(filePath)) {
                const title = titleMap[item.href]
                  || path.basename(item.href, path.extname(item.href));
                chapters.push({ title, htmlPath: filePath });
              }
            }

            if (chapters.length > 0) {
              this.logger.log(`Parsed ${chapters.length} chapters from OPF spine`);
              return chapters;
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn(`OPF parsing failed, falling back to file scan: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Fallback: search for HTML/XHTML files if OPF parsing failed
    this.logger.log('Falling back to HTML file scan for chapter extraction');
    const searchDirs = [
      path.join(extractDir, 'OEBPS'),
      path.join(extractDir, 'OPS'),
      extractDir,
    ];

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = this.findHtmlFiles(dir);
        for (const file of files) {
          chapters.push({
            title: path.basename(file, path.extname(file)),
            htmlPath: file,
          });
        }
        if (chapters.length > 0) break;
      }
    }

    if (chapters.length === 0) {
      throw new BadRequestException('No valid chapters found in EPUB');
    }

    return chapters;
  }

  /**
   * Recursively find HTML/XHTML files
   */
  private findHtmlFiles(dir: string): string[] {
    const htmlFiles: string[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        htmlFiles.push(...this.findHtmlFiles(filePath));
      } else if (/\.(html|xhtml)$/i.test(file)) {
        htmlFiles.push(filePath);
      }
    }

    return htmlFiles.sort();
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  private sanitizeChapterHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'svg',
        'path',
        'style',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'id', 'style'],
        img: ['src', 'alt', 'width', 'height'],
        a: ['href', 'target'],
      },
      allowedSchemes: ['http', 'https', 'data'],
    });
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get chapter content by ID
   * Validates checksum before serving
   */
  async getChapterContent(
    chapterId: string,
    learningUnitId: string,
  ): Promise<{ content: string; title: string }> {
    const chapter = await this.prisma.epub_chapters.findFirst({
      where: {
        id: chapterId,
        learningUnitId,
      },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    // Read HTML content
    if (!fs.existsSync(chapter.htmlPath)) {
      throw new NotFoundException('Chapter file not found');
    }

    const content = fs.readFileSync(chapter.htmlPath, 'utf-8');

    // Verify checksum
    const checksum = this.calculateChecksum(content);
    if (checksum !== chapter.checksum) {
      this.logger.error(
        `Checksum mismatch for chapter ${chapterId}. Possible tampering.`,
      );
      throw new BadRequestException('Chapter content integrity check failed');
    }

    return {
      content,
      title: chapter.chapterTitle,
    };
  }

  /**
   * Get all chapters for a learning unit
   */
  async getChaptersList(learningUnitId: string) {
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
      select: {
        id: true,
        title: true,
        epubStatus: true,
        chapterCount: true,
        secureAccessUrl: true,
        type: true,
      },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    // For PDF content (secureAccessUrl ends in .pdf), return early with empty chapters
    // so the frontend can detect PDF mode from the secureAccessUrl and switch viewers.
    if (learningUnit.secureAccessUrl?.toLowerCase().endsWith('.pdf')) {
      return { learningUnit, chapters: [] };
    }

    if (learningUnit.epubStatus !== EpubStatus.PROCESSED) {
      throw new BadRequestException('EPUB not yet processed');
    }

    const chapters = await this.prisma.epub_chapters.findMany({
      where: { learningUnitId },
      orderBy: { chapterOrder: 'asc' },
      select: {
        id: true,
        chapterTitle: true,
        chapterOrder: true,
      },
    });

    return {
      learningUnit,
      chapters,
    };
  }

  /**
   * Delete EPUB and all its chapters
   */
  async deleteEpub(learningUnitId: string): Promise<void> {
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    // Delete extracted files
    if (learningUnit.storagePath && fs.existsSync(learningUnit.storagePath)) {
      fs.rmSync(learningUnit.storagePath, { recursive: true, force: true });
    }

    // Delete chapters from database
    await this.prisma.epub_chapters.deleteMany({
      where: { learningUnitId },
    });

    // Reset learning unit EPUB fields
    await this.prisma.learning_units.update({
      where: { id: learningUnitId },
      data: {
        fileFormat: null,
        epubStatus: null,
        chapterCount: null,
        storagePath: null,
      },
    });

    this.logger.log(`Deleted EPUB for learning unit: ${learningUnitId}`);
  }

  /**
   * Resolve the PDF file path for a learning unit
   */
  private async resolvePdfPath(learningUnitId: string): Promise<string> {
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
      select: { secureAccessUrl: true, title: true },
    });

    if (!learningUnit?.secureAccessUrl) {
      throw new NotFoundException('No file found for this learning unit');
    }

    let filePath = learningUnit.secureAccessUrl;
    // Handle full URLs (e.g. http://localhost:3001/uploads/...) by extracting the path
    try {
      const parsed = new URL(filePath);
      filePath = parsed.pathname; // strips host, keeps /uploads/...
    } catch {
      // Not a full URL — use as-is (relative path like uploads/books/uuid.pdf)
    }
    // Handle both /uploads/... and uploads/... (no leading slash)
    if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
      filePath = path.join(process.cwd(), filePath);
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('PDF file not found on disk');
    }

    return filePath;
  }

  /**
   * Get PDF metadata: total page count and title
   */
  async getPdfInfo(learningUnitId: string): Promise<{ totalPages: number; title: string }> {
    const filePath = await this.resolvePdfPath(learningUnitId);
    const fileBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
      select: { title: true },
    });

    return {
      totalPages: pdfDoc.getPageCount(),
      title: learningUnit?.title || 'Document',
    };
  }

  /**
   * Extract the PDF's built-in outline (bookmarks) and return as a flat list.
   * Returns an empty array if no outline exists or extraction fails.
   */
  async getPdfOutline(learningUnitId: string): Promise<Array<{ title: string; page: number; level: number }>> {
    const filePath = await this.resolvePdfPath(learningUnitId);
    try {
      const fileBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (pdfDoc as any).context;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catalog = (pdfDoc as any).catalog;

      // Build objectNumber → 1-based page number map
      const pageNumByObjId = new Map<number, number>();
      pdfDoc.getPages().forEach((page, idx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ref = (page as any).ref;
        if (ref?.objectNumber !== undefined) {
          pageNumByObjId.set(ref.objectNumber, idx + 1);
        }
      });

      // Helper: safely lookup a PDF object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeGet = (ref: any, type?: any): any => {
        if (!ref) return null;
        try {
          return type ? ctx.lookupMaybe(ref, type) : ctx.lookup(ref);
        } catch {
          return null;
        }
      };

      // Resolve a Dest value (PDFArray, PDFName, PDFString, or ref) to a 1-based page number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolveDestToPage = (destVal: any): number => {
        if (!destVal) return 1;
        try {
          // Dereference refs
          let dest = destVal?.objectNumber !== undefined ? (safeGet(destVal) ?? destVal) : destVal;
          const tag = dest?.constructor?.name;

          // PDFArray → direct destination [pageRef, /FitH, ...]
          if (tag === 'PDFArray' || typeof dest?.size === 'function') {
            const pageRef = safeGet(dest.lookup?.(0)) ?? dest.lookup?.(0);
            const objNum = pageRef?.objectNumber ?? (safeGet(dest.lookup?.(0)) as any)?.objectNumber;
            if (objNum !== undefined && pageNumByObjId.has(objNum)) {
              return pageNumByObjId.get(objNum)!;
            }
            return 1;
          }

          // Named destination (PDFName / PDFString / PDFHexString)
          if (tag === 'PDFName' || tag === 'PDFString' || tag === 'PDFHexString') {
            let nameStr = '';
            try { nameStr = (dest as any).decodeText?.() ?? (dest as any).asString?.() ?? ''; } catch { /* */ }

            // Try /Dests dictionary
            const destsRef = catalog.get(PDFName.of('Dests'));
            if (destsRef) {
              const destsDict = safeGet(destsRef, PDFDict) as PDFDict | null;
              const entryRef = destsDict?.get(PDFName.of(nameStr));
              if (entryRef) {
                const entryArr = safeGet(entryRef, PDFArray) ?? safeGet(entryRef);
                if (entryArr) return resolveDestToPage(entryArr);
              }
            }

            // Try /Names → /Dests name tree (flat only)
            const namesRef = catalog.get(PDFName.of('Names'));
            if (namesRef) {
              const namesDict = safeGet(namesRef, PDFDict) as PDFDict | null;
              const destTreeRef = namesDict?.get(PDFName.of('Dests'));
              if (destTreeRef) {
                const destTree = safeGet(destTreeRef, PDFDict) as PDFDict | null;
                const namesArrRef = destTree?.get(PDFName.of('Names'));
                if (namesArrRef) {
                  const na = safeGet(namesArrRef, PDFArray) as PDFArray | null;
                  if (na) {
                    for (let i = 0; i < na.size() - 1; i += 2) {
                      const key = na.lookup(i);
                      let keyStr = '';
                      try { keyStr = (key as any).decodeText?.() ?? (key as any).asString?.() ?? ''; } catch { /* */ }
                      if (keyStr === nameStr) {
                        const val = safeGet(na.lookup(i + 1), PDFArray) ?? safeGet(na.lookup(i + 1));
                        if (val) return resolveDestToPage(val);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch { /* ignore */ }
        return 1;
      };

      // Check if outline exists
      const outlinesRef = catalog.get(PDFName.of('Outlines'));
      if (!outlinesRef) return [];
      const outlines = safeGet(outlinesRef, PDFDict) as PDFDict | null;
      if (!outlines) return [];
      const rootFirst = outlines.get(PDFName.of('First'));
      if (!rootFirst) return [];

      // Iterative DFS walk: push { ref, level } on a stack
      const results: Array<{ title: string; page: number; level: number }> = [];
      const visited = new Set<string>();
      // Stack processes leaves before siblings (push Next first, then First)
      const stack: Array<{ ref: any; level: number }> = [{ ref: rootFirst, level: 0 }];

      while (stack.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { ref, level } = stack.pop()!;
        const refKey = ref?.toString?.();
        if (!refKey || visited.has(refKey)) continue;
        visited.add(refKey);

        const item = safeGet(ref, PDFDict) as PDFDict | null;
        if (!item) continue;

        // Extract title
        const titleObj = item.get(PDFName.of('Title'));
        let title = '';
        try {
          if (titleObj instanceof PDFHexString) title = titleObj.decodeText();
          else if (titleObj instanceof PDFString) title = titleObj.asString();
          else if (titleObj) title = titleObj.toString().replace(/[()/<>]/g, '');
        } catch { title = ''; }

        // Extract destination → page number
        let page = 1;
        try {
          const destRef = item.get(PDFName.of('Dest'));
          if (destRef) {
            const dest = safeGet(destRef, PDFArray) ?? safeGet(destRef) ?? destRef;
            page = resolveDestToPage(dest);
          } else {
            const actionRef = item.get(PDFName.of('A'));
            if (actionRef) {
              const action = safeGet(actionRef, PDFDict) as PDFDict | null;
              const d = action?.get(PDFName.of('D'));
              if (d) {
                const dest = safeGet(d, PDFArray) ?? safeGet(d) ?? d;
                page = resolveDestToPage(dest);
              }
            }
          }
        } catch { page = 1; }

        if (title.trim()) {
          results.push({ title: title.trim().slice(0, 150), page, level });
        }

        // Push Next sibling first (processed after children), then First child
        const nextRef = item.get(PDFName.of('Next'));
        if (nextRef) stack.push({ ref: nextRef, level });
        const firstChildRef = item.get(PDFName.of('First'));
        if (firstChildRef) stack.push({ ref: firstChildRef, level: level + 1 });
      }

      // Sort by page then level to guarantee reading order
      results.sort((a, b) => a.page - b.page || a.level - b.level);
      return results;
    } catch (err) {
      this.logger.warn(`PDF outline extraction failed for ${learningUnitId}: ${err}`);
      return [];
    }
  }

  /**
   * Extract a single page from a PDF and return it as a Buffer
   * This ensures the full document is never sent to the client
   */
  async getPdfPage(learningUnitId: string, pageNum: number): Promise<Buffer> {
    const filePath = await this.resolvePdfPath(learningUnitId);
    const fileBytes = fs.readFileSync(filePath);
    const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    if (pageNum < 1 || pageNum > totalPages) {
      throw new BadRequestException(`Invalid page number. Document has ${totalPages} pages.`);
    }

    // Create a new single-page PDF
    const singlePageDoc = await PDFDocument.create();
    const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [pageNum - 1]);
    singlePageDoc.addPage(copiedPage);

    const pdfBytes = await singlePageDoc.save();
    return Buffer.from(pdfBytes);
  }
}
