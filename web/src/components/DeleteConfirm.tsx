interface Props {
  notePath: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({ notePath, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Note</h3>
        <p>Are you sure you want to delete <strong>{notePath}</strong>?</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
