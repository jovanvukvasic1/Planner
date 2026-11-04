import { useState } from "react";
import type { FolderNode } from "../lib/format";
import type { Folder } from "../lib/types";

export type Selection = { kind: "all" } | { kind: "none" } | { kind: "folder"; id: number };

interface Props {
  tree: FolderNode[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAdd: (parentId: number | null) => void;
  onEdit: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

export default function FolderTree({ tree, selection, onSelect, onAdd, onEdit, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (node: FolderNode) => {
    const selected = selection.kind === "folder" && selection.id === node.id;
    const isCollapsed = collapsed.has(node.id);
    return (
      <li key={node.id}>
        <div
          className={`tree-item${selected ? " selected" : ""}`}
          style={{ paddingLeft: 8 + node.depth * 16 }}
          onClick={() => onSelect({ kind: "folder", id: node.id })}
        >
          <button
            className={`tree-toggle${node.children.length ? "" : " invisible"}`}
            onClick={(e) => {
              e.stopPropagation();
              toggle(node.id);
            }}
            aria-label={isCollapsed ? "Proširi" : "Skupi"}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
          <span className="folder-dot" style={{ background: node.color }} />
          <span className="tree-label">{node.name}</span>
          {!!node._count?.activities && <span className="tree-count">{node._count.activities}</span>}
          <span className="tree-actions" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" title="Novi podfolder" onClick={() => onAdd(node.id)}>
              +
            </button>
            <button className="icon-btn" title="Izmijeni" onClick={() => onEdit(node)}>
              ✎
            </button>
            <button className="icon-btn" title="Obriši" onClick={() => onDelete(node)}>
              🗑
            </button>
          </span>
        </div>
        {!isCollapsed && node.children.length > 0 && <ul>{node.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <nav className="folder-tree">
      <div className="tree-header">
        <span>Folderi</span>
        <button className="icon-btn" title="Novi folder" onClick={() => onAdd(null)}>
          +
        </button>
      </div>
      <ul>
        <li>
          <div className={`tree-item${selection.kind === "all" ? " selected" : ""}`} onClick={() => onSelect({ kind: "all" })}>
            <span className="tree-toggle invisible" />
            <span className="tree-label">📋 Sve aktivnosti</span>
          </div>
        </li>
        {tree.map(renderNode)}
        <li>
          <div className={`tree-item${selection.kind === "none" ? " selected" : ""}`} onClick={() => onSelect({ kind: "none" })}>
            <span className="tree-toggle invisible" />
            <span className="tree-label muted">Bez foldera</span>
          </div>
        </li>
      </ul>
      {tree.length === 0 && <p className="muted small tree-empty">Napravi prvi folder, npr. "Fakultet".</p>}
    </nav>
  );
}
