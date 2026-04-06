export interface Note {
  path: string;
  title: string;
  mtime: string;
  mtime_epoch: number;
}

export interface SearchResult extends Note {
  score: number;
  preview: string;
}

export interface NoteDetail extends Note {
  content: string;
}

export interface NoteCreate {
  title: string;
  tags: string;
  body: string;
}
