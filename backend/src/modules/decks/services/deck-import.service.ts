import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MediaService } from "../../media/media.service";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import * as path from "path";

/**
 * DeckImportService — imports a .pptx (PowerPoint / Google Slides export)
 * into a native Deck with slides and free-form elements.
 *
 * Fidelity notes:
 * - Text boxes, pictures, and basic shapes (rect/ellipse/round-rect/line) are
 *   converted. Tables, charts, SmartArt, and animations are skipped (counted
 *   in `warnings`).
 * - Placeholder positions are resolved through the slide layout, then the
 *   slide master, mirroring OOXML inheritance. Theme colors are resolved from
 *   theme1.xml.
 * - Element geometry is stored as percentages of the slide (the editor's
 *   native unit). Font sizes are converted from points to the editor's
 *   reference canvas (deckWidth * 0.5), which for a standard 7.5in-tall deck
 *   makes 1pt ≈ 1px.
 */

const EMU_PER_PT = 12700;
const MAX_SLIDES = 150;

interface ParsedElement {
  type: "TEXT" | "IMAGE" | "SHAPE";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: Record<string, any>;
}

export interface ImportWarnings {
  skippedTables: number;
  skippedCharts: number;
  skippedOther: number;
  failedImages: number;
}

/** Rectangle in EMU. */
interface Box {
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot: number;
}

@Injectable()
export class DeckImportService {
  private readonly logger = new Logger(DeckImportService.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false,
    parseTagValue: false,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async importPptx(
    userId: string,
    file: Express.Multer.File,
    options: { title?: string; clientId?: string; projectId?: string } = {},
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No file uploaded");
    }
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext !== ".pptx") {
      throw new BadRequestException(
        "Only .pptx files are supported. In Google Slides use File → Download → Microsoft PowerPoint (.pptx).",
      );
    }

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file.buffer);
    } catch {
      throw new BadRequestException("File is not a valid .pptx archive");
    }

    const presentationXml = await this.readXml(zip, "ppt/presentation.xml");
    if (!presentationXml) {
      throw new BadRequestException(
        "File is not a valid PowerPoint presentation",
      );
    }

    // Slide size (EMU). Defaults to 16:9 (12192000 x 6858000).
    const sldSz = presentationXml["p:presentation"]?.["p:sldSz"];
    const slideCx = Number(sldSz?.["@_cx"]) || 12192000;
    const slideCy = Number(sldSz?.["@_cy"]) || 6858000;

    // Deck pixel size: 1920 wide, height follows the source aspect ratio.
    const deckWidth = 1920;
    const deckHeight = Math.round((deckWidth * slideCy) / slideCx);
    // Editor reference canvas is deckWidth * 0.5; fontSize is stored in those px.
    const ptToPx = (deckHeight * 0.5) / (slideCy / EMU_PER_PT);

    // Ordered slide list via presentation rels.
    const presRels = await this.readRels(zip, "ppt/_rels/presentation.xml.rels");
    const sldIdLst = this.asArray(
      presentationXml["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"],
    );
    const slidePaths = sldIdLst
      .map((s: any) => presRels[s?.["@_r:id"]])
      .filter(Boolean)
      .map((target: string) => this.resolvePath("ppt", target));

    if (slidePaths.length === 0) {
      throw new BadRequestException("Presentation contains no slides");
    }
    if (slidePaths.length > MAX_SLIDES) {
      throw new BadRequestException(
        `Presentation has ${slidePaths.length} slides; the import limit is ${MAX_SLIDES}`,
      );
    }

    const themeColors = await this.parseThemeColors(zip);
    const warnings: ImportWarnings = {
      skippedTables: 0,
      skippedCharts: 0,
      skippedOther: 0,
      failedImages: 0,
    };

    const slidesData: Array<{
      backgroundColor?: string;
      notes?: string;
      elements: ParsedElement[];
    }> = [];

    for (const slidePath of slidePaths) {
      const slideXml = await this.readXml(zip, slidePath);
      if (!slideXml) {
        slidesData.push({ elements: [] });
        continue;
      }
      const slideRels = await this.readRels(
        zip,
        this.relsPathFor(slidePath),
      );

      // Placeholder geometry inheritance: slide → layout → master.
      const layoutPath = this.findRelTarget(slideRels, "slideLayout");
      const placeholderBoxes = await this.collectPlaceholderBoxes(
        zip,
        layoutPath ? this.resolvePath(path.posix.dirname(slidePath), layoutPath) : undefined,
      );

      const elements: ParsedElement[] = [];
      const spTree = slideXml["p:sld"]?.["p:cSld"]?.["p:spTree"];
      if (spTree) {
        await this.walkShapeTree(spTree, {
          zip,
          slideRels,
          slideDir: path.posix.dirname(slidePath),
          slideCx,
          slideCy,
          ptToPx,
          themeColors,
          placeholderBoxes,
          elements,
          warnings,
          groupTransform: null,
        });
      }

      slidesData.push({
        backgroundColor: this.parseSlideBackground(slideXml, themeColors),
        notes: await this.parseNotes(zip, slidePath, slideRels),
        elements,
      });
    }

    const title =
      options.title?.trim() ||
      path.basename(file.originalname, ext) ||
      "Imported deck";

    const deck = await this.prisma.deck.create({
      data: {
        title,
        description: null,
        clientId: options.clientId || undefined,
        projectId: options.projectId || undefined,
        theme: {},
        slideWidth: deckWidth,
        slideHeight: deckHeight,
        createdById: userId,
        collaborators: {
          create: {
            userId,
            role: "OWNER",
            invitedBy: userId,
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        },
        slides: {
          create: slidesData.map((s, i) => ({
            order: i,
            template: "BLANK" as const,
            content: {},
            backgroundColor: s.backgroundColor || "#FFFFFF",
            notes: s.notes,
            elements: {
              create: s.elements.map((el) => ({
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                rotation: el.rotation,
                zIndex: el.zIndex,
                content: el.content,
              })),
            },
          })),
        },
      },
      include: {
        client: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        slides: { orderBy: { order: "asc" } },
        _count: { select: { slides: true, collaborators: true } },
      },
    });

    const totalElements = slidesData.reduce((n, s) => n + s.elements.length, 0);
    this.logger.log(
      `Imported pptx "${file.originalname}" → deck ${deck.id}: ${slidesData.length} slides, ${totalElements} elements`,
    );

    return { ...deck, importWarnings: warnings };
  }

  /* ------------------------------------------------------------------ */
  /*  Shape tree traversal                                               */
  /* ------------------------------------------------------------------ */

  private async walkShapeTree(
    tree: any,
    ctx: {
      zip: JSZip;
      slideRels: Record<string, string>;
      slideDir: string;
      slideCx: number;
      slideCy: number;
      ptToPx: number;
      themeColors: Record<string, string>;
      placeholderBoxes: Map<string, Box>;
      elements: ParsedElement[];
      warnings: ImportWarnings;
      groupTransform: ((b: Box) => Box) | null;
    },
  ) {
    // Pictures first (they usually sit behind text), then shapes, then groups.
    for (const pic of this.asArray(tree["p:pic"])) {
      await this.handlePicture(pic, ctx);
    }
    for (const sp of this.asArray(tree["p:sp"])) {
      this.handleShape(sp, ctx);
    }
    for (const frame of this.asArray(tree["p:graphicFrame"])) {
      const uri =
        frame?.["a:graphic"]?.["a:graphicData"]?.["@_uri"] || "";
      if (uri.includes("table")) ctx.warnings.skippedTables++;
      else if (uri.includes("chart")) ctx.warnings.skippedCharts++;
      else ctx.warnings.skippedOther++;
    }
    for (const grp of this.asArray(tree["p:grpSp"])) {
      const grpXfrm = grp?.["p:grpSpPr"]?.["a:xfrm"];
      const transform = this.composeGroupTransform(grpXfrm, ctx.groupTransform);
      await this.walkShapeTree(grp, { ...ctx, groupTransform: transform });
    }
  }

  /** Build a child→absolute coordinate mapper for a group shape. */
  private composeGroupTransform(
    grpXfrm: any,
    parent: ((b: Box) => Box) | null,
  ): ((b: Box) => Box) | null {
    if (!grpXfrm) return parent;
    const off = grpXfrm["a:off"];
    const ext = grpXfrm["a:ext"];
    const chOff = grpXfrm["a:chOff"] || off;
    const chExt = grpXfrm["a:chExt"] || ext;
    if (!off || !ext || !chOff || !chExt) return parent;

    const ox = Number(off["@_x"]) || 0;
    const oy = Number(off["@_y"]) || 0;
    const ecx = Number(ext["@_cx"]) || 1;
    const ecy = Number(ext["@_cy"]) || 1;
    const cox = Number(chOff["@_x"]) || 0;
    const coy = Number(chOff["@_y"]) || 0;
    const ccx = Number(chExt["@_cx"]) || ecx;
    const ccy = Number(chExt["@_cy"]) || ecy;
    const sx = ecx / (ccx || 1);
    const sy = ecy / (ccy || 1);

    const local = (b: Box): Box => ({
      x: ox + (b.x - cox) * sx,
      y: oy + (b.y - coy) * sy,
      cx: b.cx * sx,
      cy: b.cy * sy,
      rot: b.rot,
    });
    return parent ? (b: Box) => parent(local(b)) : local;
  }

  private handleShape(
    sp: any,
    ctx: Parameters<DeckImportService["walkShapeTree"]>[1],
  ) {
    const box = this.resolveShapeBox(sp, ctx);
    if (!box) return;

    const pct = this.boxToPercent(box, ctx.slideCx, ctx.slideCy);
    const text = this.extractText(sp["p:txBody"]);

    if (text.trim()) {
      const style = this.extractTextStyle(
        sp["p:txBody"],
        ctx.themeColors,
        ctx.ptToPx,
        this.placeholderType(sp),
      );
      ctx.elements.push({
        type: "TEXT",
        ...pct,
        zIndex: ctx.elements.length,
        content: { text, ...style },
      });
      return;
    }

    // No text: keep it only if it's a visible basic geometry.
    const spPr = sp["p:spPr"];
    const geom = spPr?.["a:prstGeom"]?.["@_prst"];
    if (!geom) return;
    const fill = this.parseFillColor(spPr, ctx.themeColors);
    const stroke = this.parseLineColor(spPr, ctx.themeColors);
    if (!fill && !stroke) return;

    const shapeType =
      geom === "ellipse"
        ? "CIRCLE"
        : geom === "line" || geom === "straightConnector1"
          ? "LINE"
          : "RECT";
    ctx.elements.push({
      type: "SHAPE",
      ...pct,
      zIndex: ctx.elements.length,
      content: {
        shapeType,
        fill: fill || "transparent",
        stroke: stroke || "transparent",
        strokeWidth: stroke ? 2 : 0,
        rx: geom === "roundRect" ? 8 : undefined,
      },
    });
  }

  private async handlePicture(
    pic: any,
    ctx: Parameters<DeckImportService["walkShapeTree"]>[1],
  ) {
    const xfrm = pic?.["p:spPr"]?.["a:xfrm"];
    let box = this.xfrmToBox(xfrm);
    if (!box) return;
    if (ctx.groupTransform) box = ctx.groupTransform(box);
    const pct = this.boxToPercent(box, ctx.slideCx, ctx.slideCy);

    const rId = pic?.["p:blipFill"]?.["a:blip"]?.["@_r:embed"];
    const target = rId ? ctx.slideRels[rId] : undefined;
    if (!target) return;

    const mediaPath = this.resolvePath(ctx.slideDir, target);
    const entry = ctx.zip.file(mediaPath);
    if (!entry) {
      ctx.warnings.failedImages++;
      return;
    }

    try {
      const buffer = await entry.async("nodebuffer");
      const filename = path.posix.basename(mediaPath);
      const uploaded = await this.mediaService.uploadFile(
        {
          buffer,
          originalname: filename,
          mimetype: this.mimeFor(filename),
          size: buffer.length,
        } as Express.Multer.File,
        "decks/imports",
      );
      ctx.elements.push({
        type: "IMAGE",
        ...pct,
        zIndex: ctx.elements.length,
        content: {
          url: uploaded.url,
          key: uploaded.key,
          alt: pic?.["p:nvPicPr"]?.["p:cNvPr"]?.["@_descr"] || filename,
        },
      });
    } catch (err) {
      ctx.warnings.failedImages++;
      this.logger.warn(`Failed to import image ${mediaPath}: ${err}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Geometry                                                           */
  /* ------------------------------------------------------------------ */

  private xfrmToBox(xfrm: any): Box | null {
    const off = xfrm?.["a:off"];
    const ext = xfrm?.["a:ext"];
    if (!off || !ext) return null;
    return {
      x: Number(off["@_x"]) || 0,
      y: Number(off["@_y"]) || 0,
      cx: Number(ext["@_cx"]) || 0,
      cy: Number(ext["@_cy"]) || 0,
      // rot is in 60000ths of a degree
      rot: (Number(xfrm?.["@_rot"]) || 0) / 60000,
    };
  }

  /** Shape geometry: own xfrm, else inherited placeholder box, else a default. */
  private resolveShapeBox(
    sp: any,
    ctx: Parameters<DeckImportService["walkShapeTree"]>[1],
  ): Box | null {
    let box = this.xfrmToBox(sp?.["p:spPr"]?.["a:xfrm"]);
    if (box) {
      return ctx.groupTransform ? ctx.groupTransform(box) : box;
    }
    const ph = this.placeholderKey(sp);
    if (ph && ctx.placeholderBoxes.has(ph)) {
      return ctx.placeholderBoxes.get(ph)!;
    }
    // Placeholder with no resolvable geometry: only keep it if it has text;
    // give title/body sensible default regions.
    const type = this.placeholderType(sp);
    if (!this.extractText(sp["p:txBody"]).trim()) return null;
    if (type === "title" || type === "ctrTitle") {
      return { x: ctx.slideCx * 0.05, y: ctx.slideCy * 0.08, cx: ctx.slideCx * 0.9, cy: ctx.slideCy * 0.18, rot: 0 };
    }
    return { x: ctx.slideCx * 0.05, y: ctx.slideCy * 0.3, cx: ctx.slideCx * 0.9, cy: ctx.slideCy * 0.55, rot: 0 };
  }

  private boxToPercent(box: Box, slideCx: number, slideCy: number) {
    const clamp = (v: number) => Math.round(v * 100) / 100;
    return {
      x: clamp((box.x / slideCx) * 100),
      y: clamp((box.y / slideCy) * 100),
      width: clamp(Math.max((box.cx / slideCx) * 100, 0.5)),
      height: clamp(Math.max((box.cy / slideCy) * 100, 0.5)),
      rotation: Math.round(box.rot * 100) / 100,
    };
  }

  private placeholderType(sp: any): string | undefined {
    return sp?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"]?.["@_type"];
  }

  /** Key used to match a placeholder between slide and layout: type + idx. */
  private placeholderKey(sp: any): string | undefined {
    const ph = sp?.["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"];
    if (!ph) return undefined;
    return `${ph["@_type"] || "body"}:${ph["@_idx"] || "0"}`;
  }

  /** Placeholder geometry from the slide layout (and its master as fallback). */
  private async collectPlaceholderBoxes(
    zip: JSZip,
    layoutPath?: string,
  ): Promise<Map<string, Box>> {
    const boxes = new Map<string, Box>();
    if (!layoutPath) return boxes;

    const addFrom = (xml: any, root: string) => {
      const tree = xml?.[root]?.["p:cSld"]?.["p:spTree"];
      for (const sp of this.asArray(tree?.["p:sp"])) {
        const key = this.placeholderKey(sp);
        const box = this.xfrmToBox(sp?.["p:spPr"]?.["a:xfrm"]);
        if (key && box && !boxes.has(key)) boxes.set(key, box);
      }
    };

    const layoutXml = await this.readXml(zip, layoutPath);
    if (layoutXml) addFrom(layoutXml, "p:sldLayout");

    const layoutRels = await this.readRels(zip, this.relsPathFor(layoutPath));
    const masterTarget = this.findRelTarget(layoutRels, "slideMaster");
    if (masterTarget) {
      const masterPath = this.resolvePath(
        path.posix.dirname(layoutPath),
        masterTarget,
      );
      const masterXml = await this.readXml(zip, masterPath);
      if (masterXml) addFrom(masterXml, "p:sldMaster");
    }
    return boxes;
  }

  /* ------------------------------------------------------------------ */
  /*  Text                                                               */
  /* ------------------------------------------------------------------ */

  /** Flatten all paragraphs/runs of a txBody into newline-joined text. */
  private extractText(txBody: any): string {
    if (!txBody) return "";
    const lines: string[] = [];
    for (const p of this.asArray(txBody["a:p"])) {
      const parts: string[] = [];
      for (const r of this.asArray(p?.["a:r"])) {
        const t = r?.["a:t"];
        if (t !== undefined && t !== null) parts.push(String(t));
      }
      // a:br inside paragraphs and field runs (slide numbers etc.) are rare;
      // fields still carry a:t which we already captured above.
      const fld = p?.["a:fld"];
      if (fld?.["a:t"]) parts.push(String(fld["a:t"]));
      lines.push(parts.join(""));
    }
    return lines.join("\n").replace(/\n+$/g, "");
  }

  /** Style from the first styled run; placeholder-type-aware defaults. */
  private extractTextStyle(
    txBody: any,
    themeColors: Record<string, string>,
    ptToPx: number,
    phType?: string,
  ): Record<string, any> {
    const isTitle = phType === "title" || phType === "ctrTitle";
    let fontSizePt = isTitle ? 36 : 18;
    let fontWeight: string = isTitle ? "bold" : "normal";
    let fontStyle = "normal";
    let fill = "#000000";
    let fontFamily: string | undefined;
    let textAlign: string | undefined;

    outer: for (const p of this.asArray(txBody?.["a:p"])) {
      const algn = p?.["a:pPr"]?.["@_algn"];
      if (algn && !textAlign) {
        textAlign =
          algn === "ctr" ? "center" : algn === "r" ? "right" : "left";
      }
      for (const r of this.asArray(p?.["a:r"])) {
        const rPr = r?.["a:rPr"];
        if (!rPr) continue;
        if (rPr["@_sz"]) fontSizePt = Number(rPr["@_sz"]) / 100;
        if (rPr["@_b"] !== undefined)
          fontWeight = rPr["@_b"] === "1" ? "bold" : "normal";
        if (rPr["@_i"] === "1") fontStyle = "italic";
        const color = this.parseColor(rPr["a:solidFill"], themeColors);
        if (color) fill = color;
        const latin = rPr["a:latin"]?.["@_typeface"];
        if (latin && !latin.startsWith("+")) fontFamily = latin;
        break outer; // first explicit run style wins
      }
    }

    return {
      fontSize: Math.round(fontSizePt * ptToPx),
      fontFamily: fontFamily || "Inter, sans-serif",
      fontWeight,
      fontStyle,
      fill,
      textAlign: textAlign || "left",
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Colors                                                             */
  /* ------------------------------------------------------------------ */

  /** Theme color scheme from ppt/theme/theme1.xml. */
  private async parseThemeColors(
    zip: JSZip,
  ): Promise<Record<string, string>> {
    const colors: Record<string, string> = {
      // OOXML maps tx1/bg1 → dk1/lt1 by default
      tx1: "#000000",
      bg1: "#FFFFFF",
      tx2: "#444444",
      bg2: "#EEEEEE",
    };
    const themeXml = await this.readXml(zip, "ppt/theme/theme1.xml");
    const scheme =
      themeXml?.["a:theme"]?.["a:themeElements"]?.["a:clrScheme"];
    if (!scheme) return colors;

    const mapping: Record<string, string[]> = {
      "a:dk1": ["dk1", "tx1"],
      "a:lt1": ["lt1", "bg1"],
      "a:dk2": ["dk2", "tx2"],
      "a:lt2": ["lt2", "bg2"],
      "a:accent1": ["accent1"],
      "a:accent2": ["accent2"],
      "a:accent3": ["accent3"],
      "a:accent4": ["accent4"],
      "a:accent5": ["accent5"],
      "a:accent6": ["accent6"],
      "a:hlink": ["hlink"],
      "a:folHlink": ["folHlink"],
    };
    for (const [tag, names] of Object.entries(mapping)) {
      const node = scheme[tag];
      const hex =
        node?.["a:srgbClr"]?.["@_val"] || node?.["a:sysClr"]?.["@_lastClr"];
      if (hex) for (const n of names) colors[n] = `#${hex}`;
    }
    return colors;
  }

  /** Resolve an <a:solidFill> (srgbClr or schemeClr) to a hex color. */
  private parseColor(
    solidFill: any,
    themeColors: Record<string, string>,
  ): string | undefined {
    if (!solidFill) return undefined;
    const srgb = solidFill["a:srgbClr"]?.["@_val"];
    if (srgb) return `#${srgb}`;
    const scheme = solidFill["a:schemeClr"]?.["@_val"];
    if (scheme) return themeColors[scheme];
    return undefined;
  }

  private parseFillColor(
    spPr: any,
    themeColors: Record<string, string>,
  ): string | undefined {
    if (spPr?.["a:noFill"] !== undefined) return undefined;
    return this.parseColor(spPr?.["a:solidFill"], themeColors);
  }

  private parseLineColor(
    spPr: any,
    themeColors: Record<string, string>,
  ): string | undefined {
    const ln = spPr?.["a:ln"];
    if (!ln || ln["a:noFill"] !== undefined) return undefined;
    return this.parseColor(ln["a:solidFill"], themeColors);
  }

  private parseSlideBackground(
    slideXml: any,
    themeColors: Record<string, string>,
  ): string | undefined {
    const bgPr = slideXml?.["p:sld"]?.["p:cSld"]?.["p:bg"]?.["p:bgPr"];
    return this.parseColor(bgPr?.["a:solidFill"], themeColors);
  }

  /* ------------------------------------------------------------------ */
  /*  Notes                                                              */
  /* ------------------------------------------------------------------ */

  private async parseNotes(
    zip: JSZip,
    slidePath: string,
    slideRels: Record<string, string>,
  ): Promise<string | undefined> {
    const target = this.findRelTarget(slideRels, "notesSlide");
    if (!target) return undefined;
    const notesPath = this.resolvePath(path.posix.dirname(slidePath), target);
    const notesXml = await this.readXml(zip, notesPath);
    const tree = notesXml?.["p:notes"]?.["p:cSld"]?.["p:spTree"];
    if (!tree) return undefined;
    const texts = this.asArray(tree["p:sp"])
      .filter((sp: any) => this.placeholderType(sp) === "body")
      .map((sp: any) => this.extractText(sp["p:txBody"]))
      .filter((t: string) => t.trim());
    return texts.length ? texts.join("\n") : undefined;
  }

  /* ------------------------------------------------------------------ */
  /*  Zip / XML helpers                                                  */
  /* ------------------------------------------------------------------ */

  private async readXml(zip: JSZip, filePath: string): Promise<any | null> {
    const entry = zip.file(filePath);
    if (!entry) return null;
    try {
      const content = await entry.async("string");
      return this.parser.parse(content);
    } catch {
      return null;
    }
  }

  /** Parse a .rels file into { rId: target } (targets are relative paths). */
  private async readRels(
    zip: JSZip,
    relsPath: string,
  ): Promise<Record<string, string>> {
    const xml = await this.readXml(zip, relsPath);
    const rels: Record<string, string> = {};
    for (const rel of this.asArray(xml?.Relationships?.Relationship)) {
      const id = rel?.["@_Id"];
      const target = rel?.["@_Target"];
      if (id && target) rels[id] = target;
    }
    return rels;
  }

  /** Find a rel target whose path mentions `kind` (e.g. "slideLayout"). */
  private findRelTarget(
    rels: Record<string, string>,
    kind: string,
  ): string | undefined {
    return Object.values(rels).find((t) => t.includes(kind));
  }

  private relsPathFor(filePath: string): string {
    return path.posix.join(
      path.posix.dirname(filePath),
      "_rels",
      `${path.posix.basename(filePath)}.rels`,
    );
  }

  /** Resolve a (possibly ../-relative) rel target against a base dir. */
  private resolvePath(baseDir: string, target: string): string {
    if (target.startsWith("/")) return target.slice(1);
    return path.posix.normalize(path.posix.join(baseDir, target));
  }

  private mimeFor(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".tiff": "image/tiff",
      ".emf": "image/emf",
      ".wmf": "image/wmf",
    };
    return map[ext] || "application/octet-stream";
  }

  private asArray(value: any): any[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
  }
}
