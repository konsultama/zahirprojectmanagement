import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { formatRupiah } from '../../lib/format';
import type { UpdateWbsPayload, WbsNode } from './types';

const UOM_TASK = ['hari', 'jam', 'ls', 'titik'];
const UOM_MATERIAL = ['pcs', 'kg', 'm', 'm²', 'm³', 'unit', 'dus'];

interface Props {
  node: WbsNode;
  depth: number;
  collapsed: boolean;
  hasChildren: boolean;
  editable: boolean;
  onToggle: () => void;
  onUpdate: (patch: UpdateWbsPayload) => void;
  onAddChild: () => void;
  onDelete: () => void;
}

/** One WBS tree-table row. Leaf rows are editable; group rows show rolled-up totals. */
export function WbsRow({
  node,
  depth,
  collapsed,
  hasChildren,
  editable,
  onToggle,
  onUpdate,
  onAddChild,
  onDelete,
}: Props) {
  const isGroup = node.itemType === 'GROUP' || hasChildren;

  const [name, setName] = useState(node.name);
  const [qty, setQty] = useState(node.qty?.toString() ?? '');
  const [unit, setUnit] = useState(node.unitBudget?.toString() ?? '');
  useEffect(() => {
    setName(node.name);
    setQty(node.qty?.toString() ?? '');
    setUnit(node.unitBudget?.toString() ?? '');
  }, [node.name, node.qty, node.unitBudget]);

  const commit = (patch: UpdateWbsPayload) => {
    if (!editable) return;
    onUpdate(patch);
  };

  const uomOptions = node.itemType === 'MATERIAL' ? UOM_MATERIAL : UOM_TASK;

  return (
    <tr className={isGroup ? 'wbs-row group' : 'wbs-row'}>
      <td className="wbs-num" style={{ paddingLeft: `${depth * 18 + 8}px` }}>
        {hasChildren ? (
          <button className="tree-toggle" onClick={onToggle} aria-label={collapsed ? 'Buka' : 'Tutup'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        ) : (
          <span className="tree-spacer" />
        )}
        {node.wbsNumber}
      </td>
      <td className="wbs-name">
        <input
          value={name}
          disabled={!editable}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== node.name && commit({ name })}
        />
      </td>
      <td>
        {isGroup ? (
          <span className="tag tag-group">Group</span>
        ) : (
          <select
            value={node.itemType}
            disabled={!editable}
            onChange={(e) => commit({ itemType: e.target.value as 'TASK' | 'MATERIAL' })}
          >
            <option value="TASK">Task</option>
            <option value="MATERIAL">Material</option>
          </select>
        )}
      </td>
      <td>
        {isGroup ? (
          <span className="muted">—</span>
        ) : (
          <select value={node.uom ?? ''} disabled={!editable} onChange={(e) => commit({ uom: e.target.value })}>
            <option value="">—</option>
            {uomOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="num">
        {isGroup ? (
          <span className="muted">—</span>
        ) : (
          <input
            className="cell-num"
            type="number"
            value={qty}
            disabled={!editable}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => {
              const v = qty === '' ? 0 : Number(qty);
              if (Number.isNaN(v)) {
                setQty(node.qty?.toString() ?? '');
                return;
              }
              if (v !== (node.qty ?? 0)) commit({ qty: v });
            }}
          />
        )}
      </td>
      <td className="num">
        {isGroup ? (
          <span className="muted">—</span>
        ) : (
          <input
            className="cell-num"
            type="number"
            value={unit}
            disabled={!editable}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setUnit(e.target.value)}
            onBlur={() => {
              const v = unit === '' ? 0 : Number(unit);
              if (Number.isNaN(v)) {
                setUnit(node.unitBudget?.toString() ?? '');
                return;
              }
              if (v !== (node.unitBudget ?? 0)) commit({ unitBudget: v });
            }}
          />
        )}
      </td>
      <td className="num total" title="Terhitung = Qty × Nilai Anggaran">
        {formatRupiah(node.totalBudget)}
      </td>
      <td className="wbs-actions">
        {editable && (
          <>
            {node.level < 4 && (
              <button className="row-icon" title="Tambah sub-baris" onClick={onAddChild}>
                <Plus size={15} />
              </button>
            )}
            <button className="row-icon danger" title="Hapus baris" onClick={onDelete}>
              <Trash2 size={15} />
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
