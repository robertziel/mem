interface Props {
  title: string;
  path: string;
  mtime: string;
  preview?: string;
  selected: boolean;
  onClick: () => void;
}

export function NoteListItem({ title, path, mtime, preview, selected, onClick }: Props) {
  return (
    <div className={`note-list-item ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="note-list-item-header">
        <span className="note-list-item-title">{title}</span>
        <span className="note-list-item-date">{mtime}</span>
      </div>
      <div className="note-list-item-path">{path}</div>
      {preview && <div className="note-list-item-preview">{preview}</div>}
    </div>
  );
}
