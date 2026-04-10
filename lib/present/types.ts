/**
 * present — Type definitions
 */

export interface DesignConfig {
  readonly palette: string;
  readonly typography: string;
  readonly motion: string;
  readonly density: string;
  readonly overrides?: {
    readonly accent?: string;
    readonly fontDisplay?: string;
    readonly fontMono?: string;
  };
}

export interface PaletteColors {
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
}

export interface PaletteDef {
  readonly light: PaletteColors;
  readonly dark: PaletteColors;
}

export interface ArticleData {
  readonly slug: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly html: string;
  readonly wordCount: number;
  readonly readingTime: number;
  readonly linksTo: readonly string[];
  readonly headings: readonly { readonly level: number; readonly text: string }[];
  readonly confidence: string;
  readonly sources: readonly { readonly url: string; readonly title: string }[];
}

export interface GraphNodeData {
  readonly id: string;
  readonly label: string;
  readonly linkCount: number;
  readonly backlinkCount: number;
  readonly forwardLinkCount: number;
  readonly tags: readonly string[];
  readonly wordCount: number;
}

export interface GraphEdgeData {
  readonly source: string;
  readonly target: string;
}

export interface GraphData {
  readonly nodes: readonly GraphNodeData[];
  readonly edges: readonly GraphEdgeData[];
}

export interface LogEntry {
  readonly date: string;
  readonly action: string;
  readonly details: readonly string[];
}

export interface SiteData {
  readonly articles: readonly ArticleData[];
  readonly graphData: GraphData;
  readonly analytics: unknown;
  readonly logEntries: readonly LogEntry[];
  readonly schema: {
    readonly topic: string;
    readonly scope: unknown;
    readonly audience: string;
  };
}

export type ModeGenerator = (data: SiteData, config: DesignConfig) => string;
