
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  TRUE_FALSE = 'TRUE_FALSE',
  DRAG_AND_DROP = 'DRAG_AND_DROP',
  IMAGE_DRAG_AND_DROP = 'IMAGE_DRAG_AND_DROP',
  TIMELINE = 'TIMELINE',
  COMPARATIVE_CHART = 'COMPARATIVE_CHART',
  OPEN_ENDED = 'OPEN_ENDED',
}

export interface AnswerOption {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface DragItem {
  id: string;
  text: string;
}

export interface DropTarget {
  id: string;
  text: string;
}

export interface ImageDropTarget {
  id: string;
  top: number;
  left: number;
}

export interface TimelineEvent {
  id: string;
  text: string;
  correctOrder: number;
}

export interface ChartItem {
  id: string;
  category: string;
  description: string;
}

export interface Question {
  id: number;
  type: QuestionType;
  questionText: string;
  points: number;
  imageUrl?: string; // For side-by-side layout
  caseStudy?: string; // For ABP case studies
  options?: AnswerOption[];
  correctAnswer?: string; // For fill-in-the-blank
  correctBoolean?: boolean; // For true/false
  keywords?: string[]; // For open-ended
  dragItems?: DragItem[]; // For drag-and-drop
  dropTargets?: DropTarget[]; // For drag-and-drop
  imageDropTargets?: ImageDropTarget[]; // For image drag-and-drop
  timelineEvents?: TimelineEvent[]; // For timeline
  chartItems?: ChartItem[]; // For comparative chart
  chartCategories?: string[]; // For comparative chart
}

export type UserAnswer = string | string[] | boolean | { [key: string]: string } | null;
