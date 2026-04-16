export type PipelineStage = 'init' | 'scout' | 'ingest' | 'compile' | 'present' | 'serve';

export interface PipelineOptions {
  readonly guided: boolean;
  readonly reviewAngles: boolean;
  readonly sequential: boolean;
  readonly from: string | null;
  readonly noPresent: boolean;
  readonly palette: string | null;
}

export interface PipelineStageResult {
  readonly stage: PipelineStage;
  readonly success: boolean;
  readonly filesWritten: readonly string[];
  readonly errors: readonly string[];
}

export type CheckpointType = 'source-curation' | 'final-review';

export interface PipelineCheckpoint {
  readonly type: CheckpointType;
  readonly stage: PipelineStage;
  readonly description: string;
}

export const DEFAULT_OPTIONS: PipelineOptions = {
  guided: false,
  reviewAngles: false,
  sequential: false,
  from: null,
  noPresent: false,
  palette: null,
} as const;

export const TASTE_CHECKPOINTS: readonly PipelineCheckpoint[] = [
  {
    type: 'source-curation',
    stage: 'scout',
    description: 'Review and approve scouted sources before ingestion',
  },
  {
    type: 'final-review',
    stage: 'present',
    description: 'Review the generated site and approve or request changes',
  },
] as const;
