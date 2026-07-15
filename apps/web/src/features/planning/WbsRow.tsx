import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { formatRupiah } from '../../lib/format';
import type { UpdateWbsPayload, WbsNode } from './types';

const UOM_TASK = ['hari', 'jam', 'ls', 'titik'];
const UOM_MATERIAL = ['pcs', 'kg', 'm', 'm²', 'm³', 'unit', 'dus'];

export interface RowOption {
  id: string;
  label: string;
}

interface Props {
  node: WbsNode;
  depth: number;
  collapsed: boolean;
  hasChildren: boolean;
  editable: boolean;
  picOptions: RowOption[];
  vendorOptions: RowOption[];
  predecessorOptions: RowOption[];
  locationOptions: RowOption[];
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
  picOptions,
  vendorOptions,
  predecessorOptions,
  locationOptions,
  onToggle,
  onUpdate,
  onAddChild,
  onDelete,
}: Props) {
  const isGroup = node.itemType === 'GROUP' || hasChildren;

  const [name, setName] = useState(node.name);
  const [qty, setQty] = useState(node.qty?.toString() ?? '');
  const [unit, setUnit] = useState(node.unitBudget?.toString() ?? '');
  const [weight, setWeight] = useState(node.weightPct?.toString() ?? '');
  const [notes, setNotes] = useState(node.notes ?? '');
  const [showDetail, setShowDetail] = useState(false);
  useEffect(() => {
    setName(node.name);
    setQty(node.qty?.toString() ?? '');
    setUnit(node.unitBudget?.toString() ?? '');
    setWeight(node.weightPct?.toString() ?? '');
    setNotes(node.notes ?? '');
  }, [node.name, node.qty, node.unitBudget, node.weightPct, node.notes]);

  const commit = (patch: UpdateWbsPayload) => {
    if (!editable) return;
    onUpdate(patch);
  };

  const uomOptions = node.itemType === 'MATERIAL' ? UOM_MATERIAL : UOM_TASK;

  return (
    <Fragment>
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
      <td>
        <select
          className="rel-select"
          value={node.picId ?? ''}
          disabled={!editable}
          onChange={(e) => commit({ picId: e.target.value })}
        >
          <option value="">—</option>
          {picOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="rel-select"
          value={node.vendorId ?? ''}
          disabled={!editable}
          onChange={(e) => commit({ vendorId: e.target.value })}
        >
          <option value="">—</option>
          {vendorOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="rel-select"
          value={node.predecessorId ?? ''}
          disabled={!editable}
          onChange={(e) => commit({ predecessorId: e.target.value })}
        >
          <option value="">—</option>
          {predecessorOptions
            .filter((o) => o.id !== node.id)
            .map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
        </select>
      </td>
      <td className="wbs-actions">
        <button
          className={showDetail ? 'row-icon active' : 'row-icon'}
          title="Tanggal, bobot, catatan, QC"
          onClick={() => setShowDetail((s) => !s)}
        >
          <SlidersHorizontal size={15} />
        </button>
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
    {showDetail && (
      <tr className="wbs-detail-row">
        <td colSpan={11}>
          <div className="wbs-detail">
            <div className="field">
              <label className="field-label">Lokasi</label>
              <select
                value={node.locationId ?? ''}
                disabled={!editable}
                onChange={(e) => commit({ locationId: e.target.value })}
              >
                {locationOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Tanggal Mulai</label>
              <input
                type="date"
                value={node.startDate?.slice(0, 10) ?? ''}
                disabled={!editable}
                onChange={(e) => commit({ startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Tanggal Selesai</label>
              <input
                type="date"
                value={node.endDate?.slice(0, 10) ?? ''}
                disabled={!editable}
                onChange={(e) => commit({ endDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="field-label">Bobot (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                placeholder="proporsional"
                value={weight}
                disabled={!editable}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWeight(e.target.value)}
                onBlur={() => {
                  if (weight === '') return;
                  const v = Number(weight);
                  if (!Number.isNaN(v) && v !== (node.weightPct ?? 0)) commit({ weightPct: v });
                }}
              />
            </div>
            <label className="field wbs-qc">
              <span className="field-label">Wajib QC</span>
              <input
                type="checkbox"
                checked={node.isQcRequired}
                disabled={!editable}
                onChange={(e) => commit({ isQcRequired: e.target.checked })}
              />
            </label>
            <div className="field wbs-notes">
              <label className="field-label">Catatan</label>
              <input
                value={notes}
                disabled={!editable}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== (node.notes ?? '') && commit({ notes })}
              />
            </div>
          </div>
        </td>
      </tr>
    )}
    </Fragment>
  );
}
