import React, { useState, useEffect } from 'react';
import { 
  Search, RotateCcw, ChevronDown, ChevronUp, Plus, Trash2, 
  RefreshCw, Settings2, ShieldCheck, HelpCircle, ArrowUpDown,
  FileDown, Check, AlertOctagon, MapPin, X,
  Copy, Printer
} from 'lucide-react';
import { Waybill, SearchParams, OrderType, WaybillAttachment, WaybillChangeLog } from '../types';

interface TableSectionProps {
  waybills: Waybill[];
  waybillLogs: WaybillChangeLog[];
  onAddWaybillClick: (orderType: OrderType) => void;
  onDeleteWaybills: (ids: string[]) => void;
  onUpdateWaybillStatus: (id: string, nextStatus: Waybill['status']) => void;
  onUpdateWaybill: (id: string, patch: Partial<Waybill>) => void;
  addToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

interface SystemLabelShipment {
  orderNo: string;
  customerNo: string;
  service: string;
  recipient: string;
  pieces: number;
}

interface PickingTransferRow {
  systemBoxNo: string;
  fbaBoxNo: string;
  carrierCompany: string;
  transferNo: string;
}

const pdfText = (value: string | number) => String(value)
  .replace(/[^\x20-\x7E]/g, '?')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const createLabelPdf = (shipments: SystemLabelShipment[]) => {
  const pages = shipments.map((shipment, index) => {
    const y = 770;
    return [
      `BT /F1 18 Tf 50 ${y} Td (TIANTU SHIPPING LABEL) Tj ET`,
      `BT /F1 12 Tf 50 730 Td (Waybill No: ${pdfText(shipment.orderNo)}) Tj ET`,
      `BT /F1 12 Tf 50 705 Td (Customer No: ${pdfText(shipment.customerNo)}) Tj ET`,
      `BT /F1 12 Tf 50 680 Td (Service: ${pdfText(shipment.service)}) Tj ET`,
      `BT /F1 12 Tf 50 655 Td (Recipient: ${pdfText(shipment.recipient || '-')}) Tj ET`,
      `BT /F1 12 Tf 50 630 Td (Pieces: ${pdfText(shipment.pieces || 1)}) Tj ET`,
      `BT /F1 10 Tf 50 80 Td (Page ${index + 1} / ${shipments.length}) Tj ET`,
      '0.5 w 45 605 505 1 re S',
      '0.5 w 45 95 505 500 re S',
    ].join('\n');
  });

  const fontObjectNumber = 3 + pages.length * 2;
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
  ];

  pages.forEach((content, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

const crcTable = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value, true);
};

const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value >>> 0, true);
};

const concatBytes = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
};

const dosDateTime = (date = new Date()) => {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
};

const createZip = (entries: Array<{ name: string; data: Uint8Array }>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, stamp.time);
    writeUint16(localView, 12, stamp.date);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, stamp.time);
    writeUint16(centralView, 14, stamp.date);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  return concatBytes([...localParts, centralDirectory, end]);
};

export default function TableSection({
  waybills,
  waybillLogs,
  onAddWaybillClick,
  onDeleteWaybills,
  onUpdateWaybillStatus,
  onUpdateWaybill,
  addToast
}: TableSectionProps) {
  // Filters state
  const [keywords, setKeywords] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tradeMode, setTradeMode] = useState<string[]>([]);
  const [tradeModeDropdownOpen, setTradeModeDropdownOpen] = useState(false);
  const TRADE_MODE_OPTIONS = ['9610', '9710', '9810', '0110', '1039'];

  const [customsDeclarationType, setCustomsDeclarationType] = useState<string[]>([]);
  const [customsDeclarationTypeDropdownOpen, setCustomsDeclarationTypeDropdownOpen] = useState(false);
  const CUSTOMS_DECLARATION_OPTIONS = ['托管报关', '报关退税'];

  // Close trade mode dropdown on outside click
  useEffect(() => {
    if (!tradeModeDropdownOpen) return;
    const handler = () => setTradeModeDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [tradeModeDropdownOpen]);

  // Close customs declaration type dropdown on outside click
  useEffect(() => {
    if (!customsDeclarationTypeDropdownOpen) return;
    const handler = () => setCustomsDeclarationTypeDropdownOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [customsDeclarationTypeDropdownOpen]);

  const isTradeModeAllSelected = tradeMode.length === TRADE_MODE_OPTIONS.length + 1;
  const toggleTradeModeAll = () => {
    if (isTradeModeAllSelected) {
      setTradeMode([]);
    } else {
      setTradeMode([...TRADE_MODE_OPTIONS, '__EMPTY__']);
    }
  };
  const toggleTradeModeOpt = (code: string) => {
    setTradeMode(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };
  const removeTradeModeTag = (code: string) => {
    setTradeMode(prev => prev.filter(c => c !== code));
  };

  const isCustomsDeclAllSelected = customsDeclarationType.length === CUSTOMS_DECLARATION_OPTIONS.length + 1;
  const toggleCustomsDeclAll = () => {
    if (isCustomsDeclAllSelected) {
      setCustomsDeclarationType([]);
    } else {
      setCustomsDeclarationType([...CUSTOMS_DECLARATION_OPTIONS, '__EMPTY__']);
    }
  };
  const toggleCustomsDeclOpt = (code: string) => {
    setCustomsDeclarationType(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };
  const removeCustomsDeclTag = (code: string) => {
    setCustomsDeclarationType(prev => prev.filter(c => c !== code));
  };

  // Active status tab filter
  const [activeStatusTab, setActiveStatusTab] = useState<string>('全部');

  // Applied filters state for search matching
  const [appliedFilters, setAppliedFilters] = useState<SearchParams>({
    keywords: '',
    groupCode: '',
    carrier: '',
    tradeMode: [],
    customsDeclarationType: []
  });

  // Collapsible search block
  const [extraFiltersOpen, setExtraFiltersOpen] = useState(true);

  // Selected checkbox (single select only)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Waybill change log modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [printLabelMenuOpen, setPrintLabelMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [attachmentExportModalOpen, setAttachmentExportModalOpen] = useState(false);
  const [selectedAttachmentTypes, setSelectedAttachmentTypes] = useState<string[]>([]);
  const [systemLabelPanelOpen, setSystemLabelPanelOpen] = useState(false);
  const [systemLabelDownloadMode, setSystemLabelDownloadMode] = useState<'split' | 'continuous'>('continuous');
  const [batchMenuOpen, setBatchMenuOpen] = useState(false);
  const [batchTradePanelOpen, setBatchTradePanelOpen] = useState(false);
  const [batchTradeMode, setBatchTradeMode] = useState('');
  const [batchCustomsDeclPanelOpen, setBatchCustomsDeclPanelOpen] = useState(false);
  const [batchCustomsDeclarationType, setBatchCustomsDeclarationType] = useState('');
  const [systemPushModalOpen, setSystemPushModalOpen] = useState(false);
  const [systemPushAccount, setSystemPushAccount] = useState('');
  const [systemPushStep, setSystemPushStep] = useState<1 | 2>(1);
  const [systemPushProduct, setSystemPushProduct] = useState('');
  const [systemPushService, setSystemPushService] = useState('');
  const [transferNumberDrawerOpen, setTransferNumberDrawerOpen] = useState(false);

  const [activeDetailWaybill, setActiveDetailWaybill] = useState<Waybill | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState('基础信息');
  const [pickingPanelOpen, setPickingPanelOpen] = useState(false);
  const [pickingDrafts, setPickingDrafts] = useState<Record<string, PickingTransferRow[]>>({});
  const [savedPickingRows, setSavedPickingRows] = useState<Record<string, PickingTransferRow[]>>({});
  const [importInfoWaybill, setImportInfoWaybill] = useState<Waybill | null>(null);
  const [importInfoFileName, setImportInfoFileName] = useState('');
  const [importInfoAttachment, setImportInfoAttachment] = useState<WaybillAttachment | null>(null);
  const [editingWaybill, setEditingWaybill] = useState<Waybill | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Waybill>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Toggle sort order
  const [sortAsc, setSortAsc] = useState(false);

  // Filter and compute data
  const filteredWaybills = waybills.filter(item => {
    // Keyword match
    if (appliedFilters.keywords) {
      const keys = appliedFilters.keywords.toLowerCase().split(',');
      const matchKey = keys.some(k => 
        item.id.toLowerCase().includes(k.trim()) || 
        item.fbaCode.toLowerCase().includes(k.trim()) ||
        (item.remarks && item.remarks.toLowerCase().includes(k.trim()))
      );
      if (!matchKey) return false;
    }
    // Group code match
    if (appliedFilters.groupCode) {
      if (!item.groupCode.toLowerCase().includes(appliedFilters.groupCode.toLowerCase())) return false;
    }
    // Carrier/Service match
    if (appliedFilters.carrier) {
      if (!item.carrier.toLowerCase().includes(appliedFilters.carrier.toLowerCase())) return false;
    }
    // Trade mode match (multi-select)
    if (appliedFilters.tradeMode.length > 0) {
      const hasEmpty = appliedFilters.tradeMode.includes('__EMPTY__');
      const valueModes = appliedFilters.tradeMode.filter(m => m !== '__EMPTY__');
      const itemMode = item.tradeMode || '';
      // Match: either (empty selected AND item has no trade mode) OR (item's mode is in selected values)
      const matchEmpty = hasEmpty && !itemMode;
      const matchValue = valueModes.length > 0 && valueModes.includes(itemMode);
      if (!matchEmpty && !matchValue) return false;
    }

    // Customs declaration type match (multi-select)
    if (appliedFilters.customsDeclarationType.length > 0) {
      const hasEmpty = appliedFilters.customsDeclarationType.includes('__EMPTY__');
      const valueModes = appliedFilters.customsDeclarationType.filter(m => m !== '__EMPTY__');
      const itemDeclType = item.customsDeclarationType || '';
      const matchEmpty = hasEmpty && !itemDeclType;
      const matchValue = valueModes.length > 0 && valueModes.includes(itemDeclType);
      if (!matchEmpty && !matchValue) return false;
    }

    // Status Tab Match
    if (activeStatusTab === '已下单') {
      if (item.status !== '待揽收') return false;
    } else if (activeStatusTab === '已收货') {
      if (item.status !== '已收货') return false;
    } else if (activeStatusTab === '转运中') {
      if (item.status !== '转运中') return false;
    } else if (activeStatusTab === '退件') {
      if (item.status !== '异常件') return false;
    } else if (activeStatusTab === '已确认') {
      if (item.status !== '已收货') return false;
    } else if (activeStatusTab === '已签收') {
      return false;
    } else if (activeStatusTab === '已取消') {
      return false;
    } else if (activeStatusTab === '未确认') {
      return false;
    }

    return true;
  });

  // Apply sorting
  const sortedWaybills = [...filteredWaybills].sort((a, b) => {
    const timeA = new Date(a.createTime).getTime();
    const timeB = new Date(b.createTime).getTime();
    return sortAsc ? timeA - timeB : timeB - timeA;
  });
  const exportScopeWaybills = selectedIds.length > 0
    ? waybills.filter(item => selectedIds.includes(item.id))
    : sortedWaybills;
  const selectedPrintWaybills = waybills.filter(item => selectedIds.includes(item.id));
  const systemLabelWatermarks = Array.from({ length: 28 }, (_, index) => index);

  // Paginated partition
  const totalItems = sortedWaybills.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWaybills = sortedWaybills.slice(startIndex, startIndex + itemsPerPage);

  // Checkbox handlers (single select)
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && paginatedWaybills.length > 0) {
      setSelectedIds(paginatedWaybills.map(w => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Filter apply and reset
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({ keywords, groupCode, carrier, tradeMode, customsDeclarationType });
    setCurrentPage(1);
    setTradeModeDropdownOpen(false);
    setCustomsDeclarationTypeDropdownOpen(false);
    addToast('已根据输入条件重新检索匹配运单', 'success');
  };

  const handleReset = () => {
    setKeywords('');
    setGroupCode('');
    setCarrier('');
    setTradeMode([]);
    setCustomsDeclarationType([]);
    setAppliedFilters({ keywords: '', groupCode: '', carrier: '', tradeMode: [], customsDeclarationType: [] });
    setCurrentPage(1);
    setSelectedIds([]);
    addToast('搜索条件已重置，显示全量日志', 'info');
  };

  const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

  const downloadBlobFile = (fileName: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFileName(fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (fileName: string, content: string, type = 'text/csv;charset=utf-8') => {
    const blob = new Blob([content], { type });
    downloadBlobFile(fileName, blob);
  };

  const downloadDataUrlFile = (fileName: string, dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = safeFileName(fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  const csvCell = (value: string | number | boolean | undefined | null) => {
    const text = value === undefined || value === null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const handleExportWaybillCsv = () => {
    if (exportScopeWaybills.length === 0) {
      addToast('当前没有可导出的运单数据', 'warning');
      return;
    }

    const header = ['运单号', 'FBA编号', '客户名称', '渠道', '分组号', '国家', '仓库/货站', '件数', '状态', '创建时间', '备注'];
    const rows = exportScopeWaybills.map(item => [
      item.id,
      item.fbaCode,
      item.customerName || '',
      item.carrier,
      item.groupCode,
      item.country,
      item.station,
      item.packagesCount,
      item.status,
      item.createTime,
      item.remarks || '',
    ]);
    const csv = `\uFEFF${[header, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}`;
    downloadTextFile(`运单导出_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setExportMenuOpen(false);
    addToast(`已导出 ${exportScopeWaybills.length} 条运单 CSV`, 'success');
  };

  const openAttachmentExportModal = () => {
    setExportMenuOpen(false);
    setSelectedAttachmentTypes([]);
    setAttachmentExportModalOpen(true);
  };

  const toggleAttachmentType = (type: string) => {
    setSelectedAttachmentTypes(prev =>
      prev.includes(type) ? prev.filter(item => item !== type) : [...prev, type]
    );
  };

  const handleExportAttachments = () => {
    if (selectedAttachmentTypes.length === 0) {
      addToast('请选择附件类型', 'warning');
      return;
    }

    if (exportScopeWaybills.length === 0) {
      addToast('当前没有可导出的运单附件', 'warning');
      return;
    }

    const attachments = exportScopeWaybills.flatMap(waybill =>
      (waybill.attachments || []).map(attachment => ({ waybill, attachment }))
    );

    if (attachments.length === 0) {
      addToast('当前范围内没有已上传附件可导出', 'warning');
      setExportMenuOpen(false);
      return;
    }

    const attachmentTypeText = selectedAttachmentTypes.join('、');
    const manifestHeader = ['运单号', '导出附件类型', '附件名称', '文件类型', '文件大小', '上传时间', '是否包含文件内容'];
    const manifestRows = attachments.map(({ waybill, attachment }) => [
      waybill.id,
      attachmentTypeText,
      attachment.name,
      attachment.type || 'application/octet-stream',
      formatFileSize(attachment.size),
      attachment.uploadedAt,
      attachment.dataUrl ? '是' : '否',
    ]);
    const manifest = `\uFEFF${[manifestHeader, ...manifestRows].map(row => row.map(csvCell).join(',')).join('\n')}`;
    downloadTextFile(`附件导出清单_${new Date().toISOString().slice(0, 10)}.csv`, manifest);

    const downloadableAttachments = attachments.filter(({ attachment }) => Boolean(attachment.dataUrl));
    downloadableAttachments.forEach(({ waybill, attachment }) => {
      downloadDataUrlFile(`${waybill.id}_${attachment.name}`, attachment.dataUrl!);
    });

    setAttachmentExportModalOpen(false);
    setExportMenuOpen(false);
    setSelectedAttachmentTypes([]);
    addToast(`已导出 ${attachments.length} 个附件记录，${downloadableAttachments.length} 个原始附件文件`, 'success');
  };

  const handleImportInfoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const attachment: WaybillAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      };
      setImportInfoFileName(file.name);
      setImportInfoAttachment(attachment);
      addToast(`已读取附件：${file.name}`, 'info');
    };
    reader.onerror = () => {
      setImportInfoFileName('');
      setImportInfoAttachment(null);
      addToast('附件读取失败，请重新上传', 'warning');
    };
    reader.readAsDataURL(file);
  };

  // Actions
  const handleSyncFBA = () => {
    addToast('正在对接亚马逊 FBA 路由中心进行远端口径对账...', 'info');
    setTimeout(() => {
      addToast('成功同步 12 个海外仓仓位的集港 FBA 入库序列状态', 'success');
    }, 1200);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      addToast('请在列表中勾选要作废删除的运单', 'warning');
      return;
    }
    const ids = selectedIds.join(', ');
    if (confirm(`确认要彻底作废 ${selectedIds.length} 门运单 [${ids}] 吗？此操作无法撤销。`)) {
      onDeleteWaybills(selectedIds);
      setSelectedIds([]);
      addToast(`已作废 ${selectedIds.length} 门运单`, 'success');
    }
  };

  const selectedSystemPushWaybills = waybills.filter(item => selectedIds.includes(item.id));
  const selectedTransferWaybills = waybills.filter(item => selectedIds.includes(item.id));

  const getTransferSystemBoxNo = (waybill: Waybill, index: number) => {
    const sequence = String(index + 1).padStart(4, '0');
    return `${waybill.id}${sequence}`;
  };

  const getTransferNumber = (waybill: Waybill, index: number) => {
    const seed = `${waybill.id}${waybill.fbaCode}${index + 1}`;
    const value = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 1321634000);
    return String(value).slice(0, 10);
  };

  const handleTransferNumber = () => {
    if (selectedIds.length === 0) {
      addToast('请在下方列表中勾选要生成转单号的运单', 'warning');
      return;
    }

    setTransferNumberDrawerOpen(true);
  };

  const handleSaveTransferNumber = () => {
    setTransferNumberDrawerOpen(false);
    addToast(`已保存 ${selectedTransferWaybills.length} 条转单号`, 'success');
  };

  const handleSystemPushOrder = () => {
    if (selectedIds.length === 0) {
      addToast('请在下方列表中勾选要系统推单的运单', 'warning');
      return;
    }

    setSystemPushAccount('');
    setSystemPushProduct('');
    setSystemPushService('');
    setSystemPushStep(1);
    setSystemPushModalOpen(true);
  };

  const handleConfirmSystemPushOrder = () => {
    if (!systemPushAccount) {
      addToast('请选择系统推单账号', 'warning');
      return;
    }

    setSystemPushStep(2);
  };

  const handleSubmitSystemPushOrder = () => {
    if (!systemPushProduct) {
      addToast('请选择系统推单产品', 'warning');
      return;
    }

    if (!systemPushService) {
      addToast('请选择系统推单服务', 'warning');
      return;
    }

    const pushCount = selectedSystemPushWaybills.length;
    setSystemPushModalOpen(false);
    setSystemPushStep(1);
    addToast(`正在通过 ${systemPushAccount} / ${systemPushProduct} / ${systemPushService} 批量推送 ${pushCount} 门运单...`, 'info');
    setTimeout(() => {
      addToast(`系统推单完成，共推送 ${pushCount} 门运单`, 'success');
    }, 1000);
  };

  const handlePrintSystemLabel = () => {
    if (selectedIds.length === 0) {
      addToast('请在下方列表中勾选要打印系统标签的运单', 'warning');
      return;
    }

    setPrintLabelMenuOpen(false);
    setSystemLabelDownloadMode('split');
    setSystemLabelPanelOpen(true);
  };

  const handleBatchTradeModeUpdate = (nextTradeMode = batchTradeMode) => {
    if (selectedIds.length === 0) {
      addToast('请在下方列表中勾选目标运单进行操作！', 'warning');
      return;
    }
    if (!nextTradeMode) {
      addToast('请选择要修改的贸易方式', 'warning');
      return;
    }

    const blocked = selectedIds
      .map(id => waybills.find(w => w.id === id))
      .filter(w => w && (w.customsDeclarationType || '托管报关') === '托管报关');

    if (blocked.length > 0) {
      addToast(`[${blocked.map(w => w!.id).join(',')}] 报关方式为托管报关，不支持填写贸易方式，已跳过`, 'warning');
    }

    const allowed = selectedIds.filter(id => !blocked.some(w => w!.id === id));
    allowed.forEach(id => onUpdateWaybill(id, { tradeMode: nextTradeMode }));

    setBatchTradePanelOpen(false);
    setBatchMenuOpen(false);
    if (allowed.length > 0) {
      addToast(`已批量修改 ${allowed.length} 门运单贸易方式为 ${nextTradeMode}`, 'success');
    }
  };

  const handleBatchCustomsDeclarationUpdate = (nextDeclType = batchCustomsDeclarationType) => {
    if (selectedIds.length === 0) {
      addToast('请在下方列表中勾选目标运单进行操作！', 'warning');
      return;
    }
    if (!nextDeclType) {
      addToast('请选择要修改的报关方式', 'warning');
      return;
    }

    selectedIds.forEach(id => onUpdateWaybill(id, { customsDeclarationType: nextDeclType }));
    setBatchCustomsDeclPanelOpen(false);
    setBatchMenuOpen(false);
    addToast(`已批量修改 ${selectedIds.length} 门运单报关方式为 ${nextDeclType}`, 'success');
  };

  const handleConfirmImportInfo = () => {
    if (!importInfoWaybill) return;
    if (!importInfoFileName || !importInfoAttachment) {
      addToast('请先上传运单信息文件', 'warning');
      return;
    }

    const nextAttachments = [
      ...(importInfoWaybill.attachments || []).filter(item => item.name !== importInfoAttachment.name),
      importInfoAttachment,
    ];
    const patch = { hasUploadedInvoice: true, attachments: nextAttachments };
    onUpdateWaybill(importInfoWaybill.id, patch);
    if (activeDetailWaybill?.id === importInfoWaybill.id) {
      setActiveDetailWaybill({ ...activeDetailWaybill, ...patch });
    }
    addToast(`运单 ${importInfoWaybill.id} 信息导入成功`, 'success');
    setImportInfoWaybill(null);
    setImportInfoFileName('');
    setImportInfoAttachment(null);
  };

  const openWaybillDetail = (waybill: Waybill) => {
    setActiveDetailWaybill(waybill);
    setActiveDetailTab('基础信息');
    setPickingPanelOpen(false);
  };

  const getCustomerOrderNo = (waybill: Waybill) => waybill.customerOrderNo || `YP${waybill.id.replace(/^HD/, '')}000301`;

  const getConsignee = (waybill: Waybill) => waybill.consignee || (waybill.country === '美国' ? 'Fernando Ocana' : 'International Consignee');
  const getCity = (waybill: Waybill) => waybill.city || (waybill.country === '美国' ? 'Whitestone' : 'London');
  const getState = (waybill: Waybill) => waybill.state || (waybill.country === '美国' ? 'NY' : '-');
  const getPhone = (waybill: Waybill) => waybill.phone || '9177503147';
  const getAddress1 = (waybill: Waybill) => waybill.address1 || (waybill.country === '美国' ? '2406 169th Street' : 'Warehouse receiving address');
  const getWarehouseCode = (waybill: Waybill) => waybill.warehouseCode || '私人地址';

  const getSystemLabelShipments = (): SystemLabelShipment[] => selectedPrintWaybills.map(waybill => ({
    orderNo: waybill.id,
    customerNo: getCustomerOrderNo(waybill),
    service: waybill.carrier,
    recipient: getConsignee(waybill),
    pieces: waybill.packagesCount || 1,
  }));

  const handlePrintSystemLabelPdf = () => {
    const labelShipments = getSystemLabelShipments();
    if (labelShipments.length === 0) {
      addToast('请在下方列表中勾选要打印系统标签的运单', 'warning');
      return;
    }

    addToast(`正在打印 ${labelShipments.length} 张系统标签`, 'info');
  };

  const handleDownloadSystemLabels = () => {
    const labelShipments = getSystemLabelShipments();
    if (labelShipments.length === 0) {
      addToast('请在下方列表中勾选要下载系统标签的运单', 'warning');
      return;
    }

    const orderName = labelShipments.map(shipment => safeFileName(shipment.orderNo)).join(',');

    if (labelShipments.length > 1 && systemLabelDownloadMode === 'split') {
      const entries = labelShipments.map(shipment => ({
        name: `${safeFileName(shipment.orderNo)}+${safeFileName(shipment.customerNo)}.pdf`,
        data: createLabelPdf([shipment]),
      }));
      downloadBlobFile(`${orderName}.zip`, new Blob([createZip(entries)], { type: 'application/zip' }));
      addToast(`正在下载 ${labelShipments.length} 票分割标签ZIP`, 'success');
      return;
    }

    const filename = labelShipments.length === 1
      ? `${safeFileName(labelShipments[0].orderNo)}+${safeFileName(labelShipments[0].customerNo)}.pdf`
      : `${orderName}.pdf`;
    downloadBlobFile(filename, new Blob([createLabelPdf(labelShipments)], { type: 'application/pdf' }));
    addToast(`正在下载 ${labelShipments.length} 张系统标签PDF`, 'success');
  };

  const startEditingBasicInfo = (waybill: Waybill) => {
    setEditingWaybill(waybill);
    setEditDraft({
      customerName: waybill.customerName || '塘厦测试客户',
      customerOrderNo: getCustomerOrderNo(waybill),
      carrier: waybill.carrier,
      consignee: getConsignee(waybill),
      warehouseCode: getWarehouseCode(waybill),
      company: waybill.company || '',
      address1: getAddress1(waybill),
      address2: waybill.address2 || '',
      address3: waybill.address3 || '',
      city: getCity(waybill),
      state: getState(waybill),
      zipCode: waybill.zipCode,
      country: waybill.country,
      phone: getPhone(waybill),
      email: waybill.email || '',
      amazonReferenceId: waybill.amazonReferenceId || '',
      orderWeek: waybill.orderWeek || '2026-06-28 ~ 2026-07-04',
      associatedNo: waybill.associatedNo || '',
      delegatedPickup: waybill.delegatedPickup || '',
      combinedDeclaration: waybill.combinedDeclaration || '',
      combinedClearance: waybill.combinedClearance || '',
      poNumber: waybill.poNumber || '',
      referenceNo1: waybill.referenceNo1 || '',
      referenceNo2: waybill.referenceNo2 || '',
      internalNote: waybill.internalNote || '',
      remarks: waybill.remarks || '',
      taxMethod: waybill.taxMethod || '包税',
      customsDeclarationType: waybill.customsDeclarationType || '托管报关',
      tradeMode: waybill.tradeMode || '',
      clearanceMethod: waybill.clearanceMethod || '',
      vatNo: waybill.vatNo || '',
      iossNo: waybill.iossNo || '',
      eori: waybill.eori || '',
      currency: waybill.currency || 'USD',
      description: waybill.description,
      itemAttributes: waybill.itemAttributes || [],
      buyInsurance: waybill.buyInsurance ?? false,
      domesticInspection: waybill.domesticInspection ?? false,
    });
  };

  const editableInstructionFields = new Set<keyof Waybill>(['internalNote', 'remarks']);

  const updateEditDraft = <K extends keyof Waybill>(field: K, value: Waybill[K]) => {
    if (!editableInstructionFields.has(field)) return;
    setEditDraft(prev => ({ ...prev, [field]: value }));
  };

  const updateTextDraft = (field: keyof Waybill, value: string) => {
    if (!editableInstructionFields.has(field)) return;
    setEditDraft(prev => ({ ...prev, [field]: value }));
  };

  const updateBooleanDraft = (field: keyof Waybill, value: boolean) => {
    if (!editableInstructionFields.has(field)) return;
    setEditDraft(prev => ({ ...prev, [field]: value }));
  };

  const textDraftValue = (field: keyof Waybill) => {
    const value = editDraft[field];
    if (value === undefined || value === null || Array.isArray(value) || typeof value === 'boolean') return '';
    return String(value);
  };

  const toggleItemAttribute = (attribute: string) => {
    const current = editDraft.itemAttributes || [];
    const next = current.includes(attribute)
      ? current.filter(item => item !== attribute)
      : [...current, attribute];
    updateEditDraft('itemAttributes', next);
  };

  const saveBasicInfo = () => {
    if (!editingWaybill) return;
    const instructionDraft: Partial<Waybill> = {
      internalNote: textDraftValue('internalNote'),
      remarks: textDraftValue('remarks'),
    };
    onUpdateWaybill(editingWaybill.id, instructionDraft);
    const updatedWaybill = { ...editingWaybill, ...instructionDraft };
    setActiveDetailWaybill(updatedWaybill);
    setEditingWaybill(null);
    setEditDraft({});
    addToast(`运单 ${editingWaybill.id} 指令信息已保存`, 'success');
  };

  const cancelBasicInfoEdit = () => {
    setEditingWaybill(null);
    setEditDraft({});
  };

  const getDetailRows = (waybill: Waybill) => ([
    [
      ['服务商', waybill.carrier],
      ['目的地', waybill.country],
      ['费用', waybill.insurance ? '1432' : '0'],
      ['仓库代码', getWarehouseCode(waybill)],
    ],
    [
      ['收费重', String(Math.max(waybill.packagesCount * 6, 1))],
      ['实重', String(Math.max(waybill.packagesCount * 6, 1))],
      ['材积重', (waybill.packagesCount * 12.86).toFixed(1)],
      ['计泡系数', '6000'],
    ],
    [
      ['体积', `${(waybill.packagesCount * 0.078).toFixed(2)} m³`],
      ['箱数', String(waybill.packagesCount)],
      ['提单号', waybill.fbaCode],
      ['货站', waybill.station],
    ],
  ]);

  const basicInfoLeft = (waybill: Waybill) => ([
    ['客户名称', waybill.customerName || '塘厦测试客户'],
    ['服务商', waybill.carrier],
    ['收件人', getConsignee(waybill)],
    ['城市', getCity(waybill)],
    ['邮编', waybill.zipCode],
    ['电话', getPhone(waybill)],
    ['报关方式', waybill.customsDeclarationType || '托管报关'],
    ['收费重', String(Math.max(waybill.packagesCount * 6, 1))],
    ['主品名', waybill.description],
    ['是否购买国内查验宝', waybill.insurance ? '是' : '否'],
  ]);

  const basicInfoRight = (waybill: Waybill) => ([
    ['客户单号', getCustomerOrderNo(waybill)],
    ['服务商类型', '国际运输'],
    ['地址一', getAddress1(waybill)],
    ['州', getState(waybill)],
    ['目的地', waybill.country],
    ['交税方式', waybill.taxMethod || '包税'],
    ['贸易方式', waybill.tradeMode || '-'],
    ['申报币种', waybill.currency || 'USD'],
    ['仓库代码', getWarehouseCode(waybill)],
    ['预计送达周', waybill.orderWeek || '2026-06-28~2026-07-04'],
  ]);

  const getCargoBoxRows = (waybill: Waybill) => ([
    {
      boxNo: `${waybill.fbaCode}NTU000001`,
      customerTracking: `${waybill.groupCode}U0001`,
      systemWeight: `${Math.max(waybill.packagesCount * 6, 1)} / ${Math.max(waybill.packagesCount * 6, 1)}`,
      carrier: savedPickingRows[waybill.id]?.find(row => row.carrierCompany.trim())?.carrierCompany || waybill.carrier,
      transferNo: savedPickingRows[waybill.id]?.find(row => row.transferNo.trim())?.transferNo || '',
      expressLabel: '打印',
      warehouseReturnNo: waybill.associatedNo || '-',
      networkStatus: waybill.status === '待揽收' ? '待拣货' : '已下单',
      status: waybill.status === '异常件' ? '异常' : '查看',
    },
  ]);

  const getDefaultTransferNoRows = (waybill: Waybill): PickingTransferRow[] => ([
    {
      systemBoxNo: `${waybill.groupCode}U0001`,
      fbaBoxNo: `${waybill.fbaCode}U0001`,
      carrierCompany: '',
      transferNo: '',
    },
    ...Array.from({ length: 4 }, () => ({
      systemBoxNo: '',
      fbaBoxNo: '',
      carrierCompany: '',
      transferNo: '',
    })),
  ]);

  const getTransferNoRows = (waybill: Waybill) => pickingDrafts[waybill.id] || getDefaultTransferNoRows(waybill);

  const openPickingPanel = (waybill: Waybill) => {
    setPickingDrafts(prev => {
      const savedRows = savedPickingRows[waybill.id];
      if (prev[waybill.id]) return prev;
      return { ...prev, [waybill.id]: savedRows ? savedRows.map(row => ({ ...row })) : getDefaultTransferNoRows(waybill) };
    });
    setPickingPanelOpen(true);
  };

  const updatePickingDraft = (waybillId: string, rowIndex: number, field: 'carrierCompany' | 'transferNo', value: string) => {
    setPickingDrafts(prev => {
      const current = prev[waybillId] || (activeDetailWaybill ? getDefaultTransferNoRows(activeDetailWaybill) : []);
      const next = current.map((row, index) => index === rowIndex ? { ...row, [field]: value } : row);
      return { ...prev, [waybillId]: next };
    });
  };

  const getDeclarationRows = (waybill: Waybill) => ([
    {
      chineseName: waybill.description.includes('收纳盒') ? '收纳盒' : waybill.description.split(/[，,]/)[0] || '收纳盒',
      englishName: waybill.description.includes('耳机') ? 'Bluetooth Earphone Case' : 'Storage Box',
      declareValue: waybill.country === '美国' ? '1.3' : '2.1',
      quantity: Math.max(waybill.packagesCount * 50, 1),
      material: waybill.itemAttributes?.length ? waybill.itemAttributes.join('/') : '聚酯纤维/塑料',
      usage: waybill.description.includes('耳机') ? '电子配件' : '收纳用',
      brand: '无',
      model: '无',
      salesLink: '无',
      customsCode: waybill.country === '美国' ? '6307909000' : '3926909090',
    },
  ]);

  const getProductImageStyle = (waybill: Waybill) => {
    const isTextile = waybill.description.includes('收纳') || waybill.description.includes('纺织');
    return isTextile
      ? 'bg-[radial-gradient(circle_at_30%_30%,#a16207_0_8%,transparent_9%),radial-gradient(circle_at_70%_38%,#713f12_0_7%,transparent_8%),radial-gradient(circle_at_45%_72%,#92400e_0_6%,transparent_7%),linear-gradient(135deg,#fef3c7,#f8fafc)]'
      : 'bg-[linear-gradient(135deg,#e0f2fe,#f8fafc_48%,#dbeafe)]';
  };

  const financeAdditionalFeeOptions = [
    '超品名费',
    '服装、袜子、鞋子',
    '报关件木制品商检费',
    '纺织品',
    '玻璃制品',
    '成人用品',
    'FDA产品',
    '附加费（CH）',
    '高货值附加费',
    '带液体附加费',
    '非报关件木制品商检费',
    '急单附加费',
  ];
  const receivableFeeHeaders = ['费用名称', '单价', '计量单位', '汇率', '币种', '费用总价', '计费时间', '添加人', '添加时间', '费用备注', '费用内部备注', '操作'];

  const detailTabs = ['基础信息', '货物信息', '费用信息', '运踪信息', '其他信息', '中转信息'];
  const tradeModeOptions = ['9610', '9710', '9810', '0110', '1039'];
  const attachmentTypeOptions = ['报关', 'POD', '核对件', '其他', '底单', '税金单', 'ISA', '申报信息', '提单'];
  const itemAttributeOptions = ['带电', '带磁', '普货', '液体', '粉末', '木制品', '危险品', '纺织品', '木架', '钢铁铝', '冲货类', '电子类', '灯类', '自行车类', '鼠标键盘'];
  const fieldClass = "h-8 w-full cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 outline-none";
  const disabledFieldClass = "h-8 w-full rounded border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 outline-none";
  const labelClass = "w-32 shrink-0 text-right text-xs text-slate-600";
  const requiredMark = <span className="mr-0.5 text-red-500">*</span>;

  // Get status class for pills
  const getStatusStyle = (status: Waybill['status']) => {
    switch (status) {
      case '已收货': return 'bg-emerald-50 text-emerald-705 border-emerald-200';
      case '待揽收': return 'bg-amber-50 text-amber-705 border-amber-200';
      case '转运中': return 'bg-blue-50 text-blue-705 border-blue-200';
      case '异常件': return 'bg-rose-50 text-rose-705 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-100 p-4 space-y-4 font-sans max-h-[calc(100vh-3rem)]">
      
      {/* Search Header Form Block */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Search className="h-4 w-4 text-blue-600" />
              <span>数据检索过滤器</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExtraFiltersOpen(!extraFiltersOpen)}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span>{extraFiltersOpen ? '收起' : '展开'}</span>
                {extraFiltersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {extraFiltersOpen && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {/* Keywords Input */}
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    关键字 (单号/FBA)
                  </label>
                  <input
                    id="search-keywords"
                    type="text"
                    placeholder="输入查询单号，多个用','隔开"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Group Code */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    集团单号
                  </label>
                  <input
                    id="search-group"
                    type="text"
                    placeholder="支持批量搜索"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Operating Unit (Carrier/Service) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    经营单位 (渠道名称)
                  </label>
                  <input
                    id="search-carrier"
                    type="text"
                    placeholder="经营单位"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Customs Declaration Type — Multi-select */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    报关方式
                  </label>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setCustomsDeclarationTypeDropdownOpen(!customsDeclarationTypeDropdownOpen)}
                      className="flex items-center justify-between w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:border-blue-400 transition-colors"
                    >
                      <span className={customsDeclarationType.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                        {customsDeclarationType.length === 0
                          ? '全部报关方式'
                          : `已选 ${customsDeclarationType.length} 个`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    {customsDeclarationTypeDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1">
                        <button
                          type="button"
                          onClick={toggleCustomsDeclAll}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors font-semibold border-b border-slate-100 ${
                            isCustomsDeclAllSelected ? 'text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            isCustomsDeclAllSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300'
                          }`}>
                            {isCustomsDeclAllSelected && <Check className="h-3 w-3" />}
                          </span>
                          全选
                        </button>
                        {[
                          { code: '托管报关', name: '托管报关' },
                          { code: '报关退税', name: '报关退税' },
                          { code: '__EMPTY__', name: '未填写' },
                        ].map(opt => {
                          const isSelected = customsDeclarationType.includes(opt.code);
                          return (
                            <button
                              key={opt.code}
                              type="button"
                              onClick={() => toggleCustomsDeclOpt(opt.code)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors ${
                                isSelected ? 'text-blue-700 font-medium' : 'text-slate-600'
                              }`}
                            >
                              <span>{opt.name}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Selected customs declaration type tags */}
                  {customsDeclarationType.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {customsDeclarationType.map(code => {
                        const label = code === '__EMPTY__' ? '未填写' : code;
                        return (
                          <span key={code} className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700 font-medium">
                            {label}
                            <button
                              type="button"
                              onClick={() => removeCustomsDeclTag(code)}
                              className="text-blue-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Trade Mode — Multi-select */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    贸易方式
                  </label>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setTradeModeDropdownOpen(!tradeModeDropdownOpen)}
                      className="flex items-center justify-between w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs hover:border-blue-400 transition-colors"
                    >
                      <span className={tradeMode.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                        {tradeMode.length === 0
                          ? '全部贸易方式'
                          : `已选 ${tradeMode.length} 个`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    {tradeModeDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl py-1">
                        {/* 全选 option */}
                        <button
                          type="button"
                          onClick={toggleTradeModeAll}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors font-semibold border-b border-slate-100 ${
                            isTradeModeAllSelected ? 'text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            isTradeModeAllSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300'
                          }`}>
                            {isTradeModeAllSelected && <Check className="h-3 w-3" />}
                          </span>
                          全选
                        </button>
                        {[
                          { code: '9610', name: '9610' },
                          { code: '9710', name: '9710' },
                          { code: '9810', name: '9810' },
                          { code: '0110', name: '0110' },
                          { code: '1039', name: '1039' },
                          { code: '__EMPTY__', name: '未填写' },
                        ].map(opt => {
                          const isSelected = tradeMode.includes(opt.code);
                          return (
                            <button
                              key={opt.code}
                              type="button"
                              onClick={() => toggleTradeModeOpt(opt.code)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors ${
                                isSelected ? 'text-blue-700 font-medium' : 'text-slate-600'
                              }`}
                            >
                              <span>{opt.name}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Selected trade mode tags */}
                  {tradeMode.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tradeMode.map(code => {
                        const label = code === '__EMPTY__' ? '未填写' : code;
                        return (
                          <span key={code} className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] text-blue-700 font-medium">
                            {label}
                            <button
                              type="button"
                              onClick={() => removeTradeModeTag(code)}
                              className="text-blue-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  <Search className="h-3 w-3" />
                  <span>查询</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>重置</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Tab Row (Status filter + 4 Buttons) closer to top right, matching the screenshot */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between border border-slate-200 bg-white p-2.5 rounded-xl shadow-sm gap-4">
        {/* Left: Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: '已下单', label: '已下单', count: waybills.filter(w => w.status === '待揽收').length },
            { id: '已收货', label: '已收货', count: 142 + waybills.filter(w => w.status === '已收货').length },
            { id: '已确认', label: '已确认', count: 14 },
            { id: '转运中', label: '转运中', count: 12446 + waybills.filter(w => w.status === '转运中').length },
            { id: '已签收', label: '已签收', count: 12171 },
            { id: '退件', label: '退件', count: 246 + waybills.filter(w => w.status === '异常件').length },
            { id: '已取消', label: '已取消', count: 0 },
            { id: '全部', label: '全部', count: 25019 + waybills.length },
            { id: '未确认', label: '未确认', count: null }
          ].map((tab) => {
            const isActive = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveStatusTab(tab.id);
                  addToast(`已应用状态过滤: ${tab.label}`, 'info');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] px-1 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: The 3 Main Order Entry Buttons + System Push Order button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-fast-order"
            onClick={() => onAddWaybillClick('快捷下单')}
            className="rounded bg-[#004bb1] hover:bg-[#003b91] font-bold text-xs text-white px-4 py-1.5 shadow-sm transition-all text-center select-none cursor-pointer"
          >
            快捷下单
          </button>
          
          <button
            id="btn-excel-order"
            onClick={() => onAddWaybillClick('excel导入下单')}
            className="rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-1.5 shadow-sm transition-all text-center select-none cursor-pointer"
          >
            Excel导入下单
          </button>
          
          <button
            id="btn-ai-invoice-order"
            onClick={() => onAddWaybillClick('解析发票下单')}
            className="rounded bg-[#004bb1] hover:bg-[#003b91] font-bold text-xs text-white px-4 py-1.5 shadow-sm transition-all text-center select-none cursor-pointer"
          >
            解析发票下单(新星版)
          </button>
          
          <button
            id="btn-system-push-order"
            onClick={handleSystemPushOrder}
            className="rounded bg-[#004bb1] hover:bg-[#003b91] font-bold text-xs text-white px-4 py-1.5 shadow-sm transition-all text-center select-none cursor-pointer"
          >
            系统推单
          </button>
        </div>
      </div>

      {/* Operations Toolbar - Matches the exact look, feel and spacing of the screenshot buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* 其他 Dropdown */}
          <button
            type="button"
            onClick={() => addToast('展开更多平台管理运维工具...', 'info')}
            className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            <span>其他</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* 打印标签 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPrintLabelMenuOpen(prev => !prev);
                setExportMenuOpen(false);
                setBatchMenuOpen(false);
              }}
              className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
            >
              <span>打印标签</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {printLabelMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-32 rounded-sm border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPrintLabelMenuOpen(false);
                    addToast('正在生成货箱专属 FBA 揽收电子吊贴/面单...', 'info');
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <span>FBA标签</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintSystemLabel}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <span>系统标签</span>
                </button>
              </div>
            )}
          </div>

          {/* 批量操作 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPrintLabelMenuOpen(false);
                setExportMenuOpen(false);
                setBatchMenuOpen(prev => {
                  const nextOpen = !prev;
                  return nextOpen;
                });
              }}
              className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
            >
              <span>批量操作</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {batchMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-sm border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.length === 0) {
                      addToast('请在下方列表中勾选目标运单进行操作！', 'warning');
                      return;
                    }
                    setBatchMenuOpen(false);
                    setBatchCustomsDeclPanelOpen(true);
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <span>批量修改报关方式</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.length === 0) {
                      addToast('请在下方列表中勾选目标运单进行操作！', 'warning');
                      return;
                    }
                    setBatchMenuOpen(false);
                    setBatchTradePanelOpen(true);
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <span>批量修改贸易方式</span>
                </button>
              </div>
            )}
          </div>

          {/* 导出 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPrintLabelMenuOpen(false);
                setBatchMenuOpen(false);
                setExportMenuOpen(prev => !prev);
              }}
              className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
            >
              <span>导出</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {exportMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-sm border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  type="button"
                  onClick={handleExportWaybillCsv}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>运单明细导出</span>
                </button>
                <button
                  type="button"
                  onClick={openAttachmentExportModal}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-700 hover:bg-blue-50 hover:text-[#004bb1]"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>附件导出</span>
                </button>
              </div>
            )}
          </div>

          {/* 批量添加 */}
          <button
            type="button"
            onClick={() => addToast('启动卡板、托盘批量打包上板申报流程...', 'info')}
            className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            <span>批量添加</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* 转单号 */}
          <button
            type="button"
            onClick={handleTransferNumber}
            className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            <span>转单号</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* 查看统计 */}
          <button
            type="button"
            onClick={() => addToast('正在生成货仓实时吞吐、重泡积压统计统计大盘...', 'success')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            查看统计
          </button>

          {/* 查看日志 */}
          <button
            type="button"
            onClick={() => {
              if (selectedIds.length === 0) {
                addToast('请先在下方列表中勾选运单', 'warning');
                return;
              }
              setLogModalOpen(true);
            }}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            查看日志
          </button>

          {/* 打印入仓单 */}
          <button
            type="button"
            onClick={() => addToast('正在生成并下载天图物流标准报关/入仓指示单...', 'success')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            打印入仓单
          </button>

          {/* 欧线打单 */}
          <button
            type="button"
            onClick={() => addToast('正在针对欧洲自建中转仓位调配 DPD 联运打单程序...', 'info')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            欧线打单
          </button>

          {/* 同步FBA */}
          <button
            type="button"
            onClick={handleSyncFBA}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            同步FBA
          </button>

          {/* 推送报关 */}
          <button
            type="button"
            onClick={() => addToast('单票出口EDI无纸化申报资料已成功提交深圳皇岗口岸...', 'success')}
            className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            <span>推送报关</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* 抬头信息维护 */}
          <button
            type="button"
            onClick={() => addToast('查看企业、收货主体及海关备案抬头列表...', 'info')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            抬头信息维护
          </button>

          {/* 美线入库数据推送 */}
          <button
            type="button"
            onClick={() => addToast('调配洛杉矶/纽约中转货包直达卸货申报，EDI已对接完成...', 'success')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            美线入库数据推送
          </button>

          {/* Special Floating Route Push inside wrapper */}
          <button
            type="button"
            onClick={() => addToast('欧线卡排在仓预约信息与清标指令推送就绪...', 'success')}
            className="rounded bg-[#004bb1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003b91] transition-all"
          >
            欧线入库数据推送
          </button>

          {/* Show Delete button if items are selected */}
          {selectedIds.length > 0 && (
            <button
              id="btn-delete-selected"
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 rounded bg-red-650 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm shadow-red-100 animate-pulse"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>作废选中 ({selectedIds.length}门)</span>
            </button>
          )}
        </div>

        {/* Far Right: Gear settings block in a blue box precisely as in screenshot */}
        <button
          type="button"
          onClick={() => addToast('启动集港系统个性化列位置与显示自适应过滤板块...', 'info')}
          className="rounded bg-[#004bb1] p-2 text-white hover:bg-[#003b91] transition-all shrink-0"
          title="表头列定制"
        >
          <Settings2 className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Grid Layout containing Main Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        
        {/* Table Area */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm lg:col-span-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[1280px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
                  <th className="w-12 py-3 px-3.5 text-center">
                    <input
                      id="checkbox-all"
                      type="checkbox"
                      checked={selectedIds.length > 0 && paginatedWaybills.every(w => selectedIds.includes(w.id))}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="w-36 py-3 px-3 text-xs">运单号</th>
                  <th className="w-24 py-3 px-3 text-xs text-center">标识</th>
                  <th className="w-36 py-3 px-3 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSortAsc(!sortAsc)}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      <span>创建时间</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="w-36 py-3 px-3 text-xs">拣货时间</th>
                  <th className="w-36 py-3 px-3 text-xs">出货单</th>
                  <th className="w-32 py-3 px-3 text-xs">集团单号</th>
                  <th className="w-40 py-3 px-3 text-xs">客户</th>
                  <th className="w-32 py-3 px-3 text-xs">附加费申请</th>
                  <th className="w-28 py-3 px-3 text-xs">邮编</th>
                  <th className="w-36 py-3 px-3 text-xs font-semibold">经营单位</th>
                  <th className="w-28 py-3 px-3 text-xs">报关方式</th>
                  <th className="w-28 py-3 px-3 text-xs">贸易方式</th>
                  <th className="w-28 py-3 px-3 text-xs">客户类型</th>
                  <th className="w-32 py-3 px-3 text-xs text-center">运单状态</th>
                  <th className="w-28 py-3 px-3 text-xs text-center">动作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11.5px] text-slate-700">
                {paginatedWaybills.length > 0 ? (
                  paginatedWaybills.map((w) => {
                    const isSelected = selectedIds.includes(w.id);
                    return (
                      <tr 
                        key={w.id}
                        id={`waybill-row-${w.id}`}
                        onDoubleClick={() => openWaybillDetail(w)}
                        title="双击查看运单详情"
                        className={`transition-colors hover:bg-blue-50/20 ${
                          isSelected ? 'bg-blue-50/10' : ''
                        } cursor-default`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3.5 text-center">
                          <input
                            id={`checkbox-row-${w.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(w.id)}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>

                        {/* Waybill ID */}
                        <td className="py-2.5 px-3">
                          <span className="text-slate-900 font-mono font-bold block truncate">
                            {w.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate" title="FBA货物箱标">
                            {w.fbaCode}
                          </span>
                        </td>

                        {/* 标识 */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 select-none">
                            <span className="text-amber-500 font-bold" title="推荐星标">★</span>
                            {w.insurance ? (
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-extrabold px-1 rounded" title="已投查验保">保</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 text-[9px] font-extrabold px-1 rounded" title="普通货品">无</span>
                            )}
                          </div>
                        </td>

                        {/* 创建时间 */}
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {w.createTime}
                        </td>

                        {/* 拣货时间 */}
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {w.pickupTime}
                        </td>

                        {/* 出货单 */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[120px]" title={w.description}>
                          {w.description}
                        </td>

                        {/* 集团单号 */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 truncate max-w-[100px]">
                          {w.groupCode}
                        </td>

                        {/* 客户 */}
                        <td className="py-2.5 px-3 text-slate-800 font-semibold truncate max-w-[130px]" title={w.customerName || '付豪跨境电商群'}>
                          {w.customerName || '付豪跨境电商事业群'}
                        </td>

                        {/* 附加费申请 */}
                        <td className="py-2.5 px-3">
                          {w.insurance ? (
                            <span className="text-amber-600 font-bold">拼箱查验费</span>
                          ) : (
                            <span className="text-slate-400">无</span>
                          )}
                        </td>

                        {/* 邮编 */}
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {w.zipCode}
                        </td>

                        {/* 经营单位 */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800 truncate max-w-[120px]" title={w.carrier}>
                          {w.carrier}
                        </td>

                        {/* 报关方式 */}
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            w.customsDeclarationType === '报关退税'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : w.customsDeclarationType === '托管报关'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}>
                            {w.customsDeclarationType || '-'}
                          </span>
                        </td>

                        {/* 贸易方式 */}
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {w.tradeMode || '-'}
                        </td>

                        {/* 客户类型 */}
                        <td className="py-2.5 px-3">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            w.customerType === 'vip' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {w.customerType.toUpperCase()}
                          </span>
                        </td>

                        {/* 运单状态 select */}
                        <td className="py-2.5 px-2 text-center">
                          <select
                            id={`status-selector-${w.id}`}
                            value={w.status}
                            onChange={(e) => {
                              onUpdateWaybillStatus(w.id, e.target.value as Waybill['status']);
                              addToast(`运单 ${w.id} 状态已更新为 [${e.target.value}]`, 'success');
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${getStatusStyle(w.status)}`}
                          >
                            <option value="待揽收">待揽收</option>
                            <option value="转运中">转运中</option>
                            <option value="已收货">已收货</option>
                            <option value="异常件">异常件</option>
                          </select>
                        </td>

                        {/* 动作 */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`确认单独作废/删除运单 ${w.id} ？`)) {
                                  onDeleteWaybills([w.id]);
                                  addToast(`已作废运单 [${w.id}]`, 'success');
                                }
                              }}
                              onDoubleClick={(e) => e.stopPropagation()}
                              className="text-red-500 hover:text-red-700 font-semibold"
                              title="作废运单"
                            >
                              作废
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={16} className="py-12 text-center text-slate-400 text-xs font-sans">
                      <AlertOctagon className="h-6 w-6 text-slate-400 mx-auto mb-2 animate-bounce" />
                      当前检索条件下暂无匹配运单数据，请使用“重置”或重新录入。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Pagination controller */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-150 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>共 <strong className="text-slate-800">{totalItems}</strong> 条数据记录</span>
              <span className="text-slate-350">|</span>
              <div className="flex items-center gap-1">
                <select
                  id="select-items-limit"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600"
                >
                  <option value={5}>5 条/页</option>
                  <option value={10}>10 条/页</option>
                  <option value={20}>20 条/页</option>
                  <option value={50}>50 条/页</option>
                  <option value={100}>100 条/页</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="btn-prev-page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                &lt; 上一页
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isCurrent = pNum === currentPage;
                  return (
                    <button
                      key={pNum}
                      id={`page-btn-${pNum}`}
                      onClick={() => setCurrentPage(pNum)}
                      className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                id="btn-next-page"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                下一页 &gt;
              </button>
            </div>
          </div>
        </div>

      </div>

      {activeDetailWaybill && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
          <div className="relative h-full w-[calc(100vw-520px)] min-w-[840px] max-w-[1400px] overflow-y-auto bg-[#edf3fb] shadow-2xl">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
              <div className="flex h-[60px] items-center justify-between px-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-6 w-1 rounded bg-slate-900" />
                  <h2 className="truncate text-[15px] font-bold text-slate-950">
                    {activeDetailWaybill.groupCode}/{getCustomerOrderNo(activeDetailWaybill)}/{activeDetailWaybill.customerName || '塘厦测试客户'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addToast('详情区块已一键收起/展开', 'info')}
                    className="rounded bg-[#004bb1] px-3 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
                  >
                    一键收起/展开
                  </button>
                  {activeDetailWaybill.hasUploadedInvoice !== true && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportInfoWaybill(activeDetailWaybill);
                        setImportInfoFileName('');
                        setImportInfoAttachment(null);
                      }}
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      导入运单信息
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addToast(`正在生成运单 ${activeDetailWaybill.id} 打印标签`, 'info')}
                    className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>打印标签</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickingPanelOpen(false);
                      setActiveDetailWaybill(null);
                    }}
                    className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    aria-label="关闭详情"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="overflow-hidden border border-slate-200 bg-white">
                  <table className="w-full table-fixed border-collapse text-[11px]">
                    <tbody>
                      {getDetailRows(activeDetailWaybill).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map(([label, value]) => (
                            <React.Fragment key={label}>
                              <td className="w-[10%] border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500">
                                {label}
                              </td>
                              <td className="w-[15%] border border-slate-200 px-3 py-2 text-slate-800">
                                {value || '-'}
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center border-t border-slate-200 bg-[#eef4fb] px-4">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (tab === '基础信息' || tab === '货物信息' || tab === '费用信息') {
                        setActiveDetailTab(tab);
                        setPickingPanelOpen(false);
                      } else {
                        addToast(`${tab}模块已预留`, 'info');
                      }
                    }}
                    className={`relative px-3 py-3 text-xs font-semibold ${
                      activeDetailTab === tab ? 'text-[#004bb1]' : 'text-slate-700 hover:text-[#004bb1]'
                    }`}
                  >
                    {tab}
                    {activeDetailTab === tab && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#004bb1]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {activeDetailTab === '基础信息' ? (
                <>
                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">基础信息</h3>
                      <div className="flex items-center gap-3 text-xs font-semibold text-[#004bb1]">
                        <button
                          type="button"
                          onClick={() => addToast('基础信息已复制', 'success')}
                          className="flex items-center gap-1 hover:underline"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>复制</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingBasicInfo(activeDetailWaybill)}
                          className="hover:underline"
                        >
                          编辑
                        </button>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-20 gap-y-3 px-1 pb-3 text-[12px]">
                      <div className="space-y-3">
                        {basicInfoLeft(activeDetailWaybill).map(([label, value]) => (
                          <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-3">
                            <span className="text-right text-slate-600">{label}：</span>
                            <span className="min-w-0 text-slate-800">{value || '-'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {basicInfoRight(activeDetailWaybill).map(([label, value]) => (
                          <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-3">
                            <span className="text-right text-slate-600">{label}：</span>
                            <span className="min-w-0 text-slate-800">{value || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">VAT信息</h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#004bb1]">
                        <button type="button" className="hover:underline">编辑</button>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                    </div>
                  </section>
                </>
              ) : activeDetailTab === '费用信息' ? (
                <>
                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">产品附加费</h3>
                      <button
                        type="button"
                        onClick={() => addToast('确认材质功能为展示', 'info')}
                        className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <span>确认材质</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-slate-600">
                      {financeAdditionalFeeOptions.map((option) => (
                        <label key={option} className="flex h-5 items-center gap-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            readOnly
                            checked={false}
                            onClick={() => addToast(`${option}为展示项`, 'info')}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-800">应收费用</h3>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                        <span className="rounded bg-blue-50 px-2 py-1 font-bold text-blue-600">费用合计： 0.00</span>
                        <span className="px-1 font-bold text-blue-600">已申请: 0</span>
                        <button
                          type="button"
                          onClick={() => addToast('附加费申请功能为展示', 'info')}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          附加费申请
                        </button>
                        <button
                          type="button"
                          onClick={() => addToast('添加费用功能为展示', 'info')}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          添加费用
                        </button>
                        <button
                          type="button"
                          onClick={() => addToast('更新附加费功能为展示', 'info')}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          更新附加费
                        </button>
                        <button
                          type="button"
                          onClick={() => addToast('应收费用区块已展开', 'info')}
                          className="rounded border border-slate-300 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                          aria-label="展开应收费用"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200">
                      <table className="w-full min-w-[1160px] table-fixed border-collapse text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            {receivableFeeHeaders.map((header) => (
                              <th key={header} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                      <div className="flex h-44 items-center justify-center border-t border-slate-100 text-xs font-semibold text-slate-500">
                        暂无数据
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-slate-800">货箱信息</h3>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                        {[
                          '视频检查',
                          '查看拣货图片',
                          '复制图片链接',
                          '复制转单号',
                          '查看材积明细',
                          '拣货',
                          '系统箱号/FBA箱号',
                          '转单号',
                        ].map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (label === '拣货') {
                                openPickingPanel(activeDetailWaybill);
                                return;
                              }
                              addToast(`${label}功能为展示`, 'info');
                            }}
                            className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {label}
                          </button>
                        ))}
                        <input
                          readOnly
                          value=""
                          placeholder="输入转单号,多个用,分隔"
                          className="h-7 w-44 rounded border border-slate-300 bg-white px-3 text-xs text-slate-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200">
                      <table className="w-full min-w-[1120px] table-fixed border-collapse text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="w-10 border border-slate-200 px-2 py-2 text-center">
                              <input type="checkbox" readOnly className="h-3.5 w-3.5 rounded border-slate-300" />
                            </th>
                            <th className="w-36 border border-slate-200 px-3 py-2 text-left">货箱号</th>
                            <th className="w-36 border border-slate-200 px-3 py-2 text-left">客户数据</th>
                            <th className="w-36 border border-slate-200 px-3 py-2 text-left">系统拣货（材重/实重）</th>
                            <th className="w-28 border border-slate-200 px-3 py-2 text-left">承运商</th>
                            <th className="w-24 border border-slate-200 px-3 py-2 text-left">快递标</th>
                            <th className="w-36 border border-slate-200 px-3 py-2 text-left">仓库回填转单号</th>
                            <th className="w-28 border border-slate-200 px-3 py-2 text-left">17网状态</th>
                            <th className="w-28 border border-slate-200 px-3 py-2 text-left">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCargoBoxRows(activeDetailWaybill).map((row) => (
                            <tr key={row.boxNo} className="h-20 text-slate-700">
                              <td className="border border-slate-200 px-2 py-2 text-center align-middle">
                                <input type="checkbox" readOnly className="h-3.5 w-3.5 rounded border-slate-300" />
                              </td>
                              <td className="border border-slate-200 px-3 py-2 align-middle font-mono">
                                <div>{row.boxNo}</div>
                                <div className="mt-1 text-slate-500">{row.customerTracking}</div>
                              </td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">{getCustomerOrderNo(activeDetailWaybill)}</td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">{row.systemWeight}</td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">
                                <div>{row.carrier || '-'}</div>
                                {row.transferNo && (
                                  <div className="mt-1 font-mono text-slate-500">{row.transferNo}</div>
                                )}
                              </td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">
                                <button
                                  type="button"
                                  onClick={() => addToast('快递标打印功能为展示', 'info')}
                                  className="font-semibold text-blue-600 hover:underline"
                                >
                                  {row.expressLabel}
                                </button>
                              </td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">{row.warehouseReturnNo}</td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">{row.networkStatus}</td>
                              <td className="border border-slate-200 px-3 py-2 align-middle">
                                <span className={row.status === '异常' ? 'font-semibold text-rose-600' : 'text-slate-500'}>{row.networkStatus}</span>
                                <button
                                  type="button"
                                  onClick={() => addToast('拣货状态详情为展示', 'info')}
                                  className="ml-2 font-semibold text-blue-600 hover:underline"
                                >
                                  {row.status}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-md bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">报关信息</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <button type="button" onClick={() => addToast('税金单功能为展示', 'info')} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50">税金单</button>
                        <button type="button" onClick={() => addToast('更新申报信息功能为展示', 'info')} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50">更新申报信息</button>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-1">
                      <button type="button" className="rounded-sm bg-[#004bb1] px-4 py-1.5 text-xs font-bold text-white">品名</button>
                      <button type="button" className="rounded-sm border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-500">装箱</button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200">
                      <table className="w-full min-w-[1180px] table-fixed border-collapse text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            {['中文品名', '英文品名', '申报价值', '数量', '材质', '用途', '品牌', '型号', '销售链接', '海关编码', '税金单', '产品图片', '操作'].map((header) => (
                              <th key={header} className="border border-slate-200 px-3 py-2 text-left">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getDeclarationRows(activeDetailWaybill).map((row) => (
                            <tr key={`${row.chineseName}-${row.customsCode}`} className="h-16 text-slate-700">
                              <td className="border border-slate-200 px-3 py-2">{row.chineseName}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.englishName}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.declareValue}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.quantity}</td>
                              <td className="border border-slate-200 px-3 py-2 truncate" title={row.material}>{row.material}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.usage}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.brand}</td>
                              <td className="border border-slate-200 px-3 py-2">{row.model}</td>
                              <td className="border border-slate-200 px-3 py-2">
                                <button type="button" onClick={() => addToast('销售链接功能为展示', 'info')} className="font-semibold text-blue-600 hover:underline">{row.salesLink}</button>
                              </td>
                              <td className="border border-slate-200 px-3 py-2 font-mono">{row.customsCode}</td>
                              <td className="border border-slate-200 px-3 py-2"></td>
                              <td className="border border-slate-200 px-3 py-2">
                                <div className={`h-9 w-16 rounded-sm border border-slate-200 ${getProductImageStyle(activeDetailWaybill)}`} />
                              </td>
                              <td className="border border-slate-200 px-3 py-2">
                                <button type="button" onClick={() => addToast('上传图片功能为展示', 'info')} className="font-semibold text-blue-600 hover:underline">上传图片</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[#004bb1]">
                      <span>产品总数: {Math.max(activeDetailWaybill.packagesCount * 50, 1)}</span>
                      <span>申报总价值: {(Number(getDeclarationRows(activeDetailWaybill)[0].declareValue) * Math.max(activeDetailWaybill.packagesCount * 50, 1)).toFixed(0)}</span>
                      <span>品名数量: {getDeclarationRows(activeDetailWaybill).length}</span>
                      <span>平均货值: {getDeclarationRows(activeDetailWaybill)[0].declareValue}</span>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>

          {pickingPanelOpen && (
            <div className="absolute right-0 top-0 z-30 h-full w-[31vw] min-w-[560px] max-w-[680px] overflow-hidden bg-white shadow-2xl">
              <div className="flex h-10 items-center border-b border-slate-200 bg-white px-4">
                <span className="mr-2 h-5 w-1 rounded bg-slate-900" />
                <h3 className="text-[15px] font-bold text-slate-900">转单号</h3>
              </div>

              <div className="relative h-[calc(100%-40px)] bg-white px-5 py-4">
                <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-[12px] font-semibold text-slate-200/70">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span
                      key={index}
                      className="absolute -rotate-[22deg] whitespace-nowrap"
                      style={{
                        left: `${(index % 3) * 34 + 11}%`,
                        top: `${Math.floor(index / 3) * 14 + 7}%`,
                      }}
                    >
                      管理员2026-06-29
                    </span>
                  ))}
                </div>

                <div className="relative z-10 mb-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filledRows = getTransferNoRows(activeDetailWaybill).filter(row => row.systemBoxNo || row.fbaBoxNo);
                      const missingRequired = filledRows.some(row => !row.carrierCompany.trim() || !row.transferNo.trim());
                      if (missingRequired) {
                        addToast('请填写承运公司和转单号', 'warning');
                        return;
                      }
                      setSavedPickingRows(prev => ({
                        ...prev,
                        [activeDetailWaybill.id]: getTransferNoRows(activeDetailWaybill).map(row => ({ ...row })),
                      }));
                      addToast(`运单 ${activeDetailWaybill.id} 转单号已保存`, 'success');
                      setPickingPanelOpen(false);
                    }}
                    className="rounded bg-[#004bb1] px-8 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickingPanelOpen(false)}
                    className="rounded border border-slate-300 bg-white px-8 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    取消
                  </button>
                </div>

                <div className="relative z-10 overflow-hidden border border-slate-300 bg-white">
                  <table className="w-full table-fixed border-collapse text-[11px] text-slate-700">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="w-10 border border-slate-300 px-2 py-2 text-center font-semibold"></th>
                        <th className="border border-slate-300 px-3 py-2 text-center font-semibold">系统箱号</th>
                        <th className="border border-slate-300 px-3 py-2 text-center font-semibold">FBA箱号</th>
                        <th className="border border-slate-300 px-3 py-2 text-center font-semibold">承运公司</th>
                        <th className="border border-slate-300 px-3 py-2 text-center font-semibold">转单号</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTransferNoRows(activeDetailWaybill).map((row, index) => (
                        <tr key={index} className="h-7">
                          <td className="border border-slate-300 bg-slate-50 px-2 text-center font-mono text-slate-600">
                            {index + 1}
                          </td>
                          <td className="border border-slate-300 px-2">
                            <input
                              readOnly
                              value={row.systemBoxNo}
                              className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none"
                            />
                          </td>
                          <td className="border border-slate-300 px-2">
                            <input
                              readOnly
                              value={row.fbaBoxNo}
                              className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none"
                            />
                          </td>
                          <td className="border border-slate-300 px-2">
                            <input
                              value={row.carrierCompany}
                              onChange={(event) => updatePickingDraft(activeDetailWaybill.id, index, 'carrierCompany', event.target.value)}
                              placeholder={row.systemBoxNo || row.fbaBoxNo ? '请输入' : ''}
                              className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none focus:bg-blue-50"
                            />
                          </td>
                          <td className="border border-slate-300 px-2">
                            <input
                              value={row.transferNo}
                              onChange={(event) => updatePickingDraft(activeDetailWaybill.id, index, 'transferNo', event.target.value)}
                              placeholder={row.systemBoxNo || row.fbaBoxNo ? '请输入' : ''}
                              className="h-6 w-full border-0 bg-transparent px-1 text-[11px] font-semibold text-slate-700 outline-none focus:bg-blue-50"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {systemLabelPanelOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-start justify-center bg-slate-950/45 pt-[50px] text-slate-700"
          onClick={() => setSystemLabelPanelOpen(false)}
        >
          <div
            className="relative flex h-[505px] w-[920px] flex-col overflow-hidden rounded-sm bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative z-10 border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">打印标签</h3>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-[14px] font-semibold text-slate-200/60">
                {systemLabelWatermarks.map((item) => (
                  <span
                    key={item}
                    className="absolute -rotate-[22deg] whitespace-nowrap"
                    style={{
                      left: `${(item % 4) * 31 - 7}%`,
                      top: `${Math.floor(item / 4) * 20 + 3}%`,
                    }}
                  >
                    管理员2026-06-22
                  </span>
                ))}
              </div>

              <div className="relative z-10 px-5 py-8">
                <div className="space-y-3 text-sm">
                  {selectedPrintWaybills.map((waybill) => (
                    <div key={waybill.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="whitespace-nowrap">
                        <span className="text-slate-600">运单号：</span>
                        <span className="ml-1 font-medium text-slate-700">{waybill.id}</span>
                      </span>
                      <span className="whitespace-nowrap">
                        <span className="text-slate-600">服务：</span>
                        <span className="ml-1 font-medium text-slate-700">{waybill.carrier}</span>
                      </span>
                      <label className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-slate-600">标签显示服务：</span>
                        <select
                          value={waybill.carrier}
                          disabled
                          className="h-8 w-56 rounded border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-400 outline-none"
                        >
                          <option value={waybill.carrier}>{waybill.carrier}</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-white px-5 py-6">
              {selectedPrintWaybills.length > 1 && (
                <div className="mb-5 flex items-center justify-center gap-5 text-sm text-slate-600">
                  <span>下载方式：</span>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="systemLabelDownloadMode"
                      checked={systemLabelDownloadMode === 'continuous'}
                      onChange={() => setSystemLabelDownloadMode('continuous')}
                      className="h-3.5 w-3.5 text-blue-600"
                    />
                    <span>多票连续</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="systemLabelDownloadMode"
                      checked={systemLabelDownloadMode === 'split'}
                      onChange={() => setSystemLabelDownloadMode('split')}
                      className="h-3.5 w-3.5 text-blue-600"
                    />
                    <span>多票分割</span>
                  </label>
                </div>
              )}
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSystemLabelPanelOpen(false)}
                  className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handlePrintSystemLabelPdf}
                  className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                >
                  打印
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSystemLabels}
                  className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                >
                  下载PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {systemPushModalOpen && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center bg-slate-950/50 pt-16">
          <div className="relative w-[650px] overflow-hidden rounded-sm bg-white shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
              {Array.from({ length: 18 }, (_, index) => (
                <span
                  key={index}
                  className="absolute -rotate-20 text-lg font-semibold text-slate-500"
                  style={{
                    left: `${(index % 3) * 34 + 3}%`,
                    top: `${Math.floor(index / 3) * 18 + 5}%`,
                  }}
                >
                  2026-06-28 天朗（付豪）
                </span>
              ))}
            </div>
            <div className="relative flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900">系统推单</h3>
              <button
                type="button"
                onClick={() => setSystemPushModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭系统推单弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {systemPushStep === 1 ? (
              <>
            <div className="relative space-y-6 px-14 py-10 text-sm">
              <div className="flex items-start gap-4">
                <span className="w-20 pt-1 text-right text-slate-600">
                  <span className="mr-1 text-red-500">*</span>运单号:
                </span>
                <div className="flex-1 text-slate-700">
                  <div className="font-semibold">
                    {selectedSystemPushWaybills[0]?.id || selectedIds[0]}
                    {selectedSystemPushWaybills.length > 1 && (
                      <span className="ml-2 text-blue-600">
                        等 {selectedSystemPushWaybills.length} 门运单
                      </span>
                    )}
                  </div>
                  {selectedSystemPushWaybills.length > 1 && (
                    <div className="mt-2 max-h-16 overflow-y-auto rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                      {selectedSystemPushWaybills.map(item => item.id).join('、')}
                    </div>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-4">
                <span className="w-20 text-right text-slate-600">
                  <span className="mr-1 text-red-500">*</span>账号:
                </span>
                <select
                  value={systemPushAccount}
                  onChange={(e) => setSystemPushAccount(e.target.value)}
                  className="h-9 flex-1 rounded border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="天图主账号">天图主账号</option>
                  <option value="塘厦仓账号">塘厦仓账号</option>
                  <option value="华运达账号">华运达账号</option>
                  <option value="搏创">搏创</option>
                </select>
              </label>
            </div>
            <div className="relative flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setSystemPushModalOpen(false)}
                className="rounded border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSystemPushOrder}
                className="rounded bg-[#004bb1] px-6 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                下一步
              </button>
            </div>
              </>
            ) : (
              <>
                <div className="relative space-y-5 px-14 py-8 text-sm">
                  <div className="flex items-start gap-4">
                    <span className="w-20 pt-1 text-right text-slate-600">
                      <span className="mr-1 text-red-500">*</span>运单号:
                    </span>
                    <div className="flex-1 pt-1 text-slate-700">
                      {selectedSystemPushWaybills.map(item => item.id).join(',') || selectedIds.join(',')}
                    </div>
                  </div>
                  <label className="flex items-center gap-4">
                    <span className="w-20 text-right text-slate-600">
                      <span className="mr-1 text-red-500">*</span>产品:
                    </span>
                    <select
                      value={systemPushProduct}
                      onChange={(e) => setSystemPushProduct(e.target.value)}
                      className="h-9 flex-1 rounded border border-slate-300 bg-white px-4 text-sm text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="FBA头程">FBA头程</option>
                      <option value="美线海卡">美线海卡</option>
                      <option value="欧洲卡航">欧洲卡航</option>
                      <option value="海外仓一件代发">海外仓一件代发</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-4">
                    <span className="w-20 text-right text-slate-600">
                      <span className="mr-1 text-red-500">*</span>服务:
                    </span>
                    <select
                      value={systemPushService}
                      onChange={(e) => setSystemPushService(e.target.value)}
                      className="h-9 flex-1 rounded border border-slate-300 bg-white px-4 text-sm text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="基础价格">基础价格</option>
                      <option value="中欧专车25日达-HS">中欧专车25日达-HS</option>
                      <option value="欧洲卡航-德国">欧洲卡航-德国</option>
                      <option value="欧洲海卡-德国">欧洲海卡-德国</option>
                    </select>
                  </label>
                </div>
                <div className="relative flex justify-end gap-2 border-t border-slate-100 px-6 py-5">
                  <button
                    type="button"
                    onClick={() => setSystemPushStep(1)}
                    className="rounded border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitSystemPushOrder}
                    className="rounded bg-[#004bb1] px-6 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
                  >
                    提交
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {transferNumberDrawerOpen && (
        <div className="fixed inset-0 z-[85] bg-slate-950/50">
          <div className="absolute right-0 top-0 flex h-full w-[620px] max-w-[92vw] flex-col bg-white shadow-2xl">
            <div className="flex h-10 items-center justify-between border-b border-slate-100 px-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="h-4 w-1 rounded-full bg-slate-900" />
                <span>转单号</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveTransferNumber}
                  className="h-7 rounded-sm bg-[#004bb1] px-7 text-xs font-bold text-white hover:bg-[#003b91]"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setTransferNumberDrawerOpen(false)}
                  className="h-7 rounded-sm border border-slate-200 bg-white px-6 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto bg-white px-5 py-3">
              <div className="pointer-events-none absolute inset-0 opacity-[0.045]">
                {Array.from({ length: 30 }, (_, index) => (
                  <span
                    key={index}
                    className="absolute -rotate-20 text-[12px] font-semibold text-slate-500"
                    style={{
                      left: `${(index % 4) * 27 + 7}%`,
                      top: `${Math.floor(index / 4) * 13 + 5}%`,
                    }}
                  >
                    管理员2026-06-29
                  </span>
                ))}
              </div>

              <div className="relative z-10 overflow-hidden border border-slate-200 bg-white">
                <table className="w-full table-fixed border-collapse text-[11px] text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-center font-semibold text-slate-600">
                      <th className="w-10 border-b border-r border-slate-200 px-2 py-2"></th>
                      <th className="border-b border-r border-slate-200 px-2 py-2">系统箱号</th>
                      <th className="border-b border-r border-slate-200 px-2 py-2">FBA箱号</th>
                      <th className="border-b border-r border-slate-200 px-2 py-2">承运公司</th>
                      <th className="border-b border-slate-200 px-2 py-2">转单号</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransferWaybills.map((waybill, index) => (
                      <tr key={waybill.id}>
                        <td className="border-r border-slate-200 px-2 py-2 text-center text-slate-500">
                          {index + 1}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-mono">
                          {getTransferSystemBoxNo(waybill, index)}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2 font-mono">
                          {waybill.fbaCode}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2">
                          {waybill.carrier || 'UPS'}
                        </td>
                        <td className="px-2 py-2 font-mono">
                          {getTransferNumber(waybill, index)}
                        </td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - selectedTransferWaybills.length) }, (_, index) => (
                      <tr key={`empty-transfer-${index}`}>
                        <td className="border-r border-slate-200 px-2 py-2 text-center text-slate-500">
                          {selectedTransferWaybills.length + index + 1}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-2">&nbsp;</td>
                        <td className="border-r border-slate-200 px-2 py-2">&nbsp;</td>
                        <td className="border-r border-slate-200 px-2 py-2">&nbsp;</td>
                        <td className="px-2 py-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {batchCustomsDeclPanelOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 pt-16">
          <div className="w-[520px] rounded-sm bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">批量修改报关方式</h3>
            </div>
            <div className="space-y-4 px-7 py-5 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">运单号：</span>
                <span className="font-semibold text-slate-700">
                  {selectedIds.length} 门运单
                </span>
              </div>
              <label className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">
                  <span className="mr-0.5 text-red-500">*</span>报关方式：
                </span>
                <select
                  value={batchCustomsDeclarationType}
                  onChange={(e) => setBatchCustomsDeclarationType(e.target.value)}
                  className="h-9 flex-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">请选择报关方式</option>
                  <option value="托管报关">托管报关</option>
                  <option value="报关退税">报关退税</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setBatchCustomsDeclPanelOpen(false)}
                className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleBatchCustomsDeclarationUpdate()}
                className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {batchTradePanelOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 pt-16">
          <div className="w-[520px] rounded-sm bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-bold text-slate-900">批量修改贸易方式</h3>
            </div>
            <div className="space-y-4 px-7 py-5 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">运单号：</span>
                <span className="font-semibold text-slate-700">
                  {selectedIds.length} 门运单
                </span>
              </div>
              <label className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">
                  <span className="mr-0.5 text-red-500">*</span>贸易方式：
                </span>
                <select
                  value={batchTradeMode}
                  onChange={(e) => setBatchTradeMode(e.target.value)}
                  className="h-9 flex-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">请选择贸易方式</option>
                  {tradeModeOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setBatchTradePanelOpen(false)}
                className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleBatchTradeModeUpdate()}
                className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Waybill Change Log Modal ───────────────────────────────────── */}
      {logModalOpen && selectedIds.length > 0 && (() => {
        const primaryId = selectedIds[0];
        const logs = waybillLogs.filter(l => l.waybillId === primaryId);
        const selectedWaybill = waybills.find(w => w.id === primaryId);
        const actionColors: Record<string, string> = {
          '创建': 'bg-green-100 text-green-700 border-green-300',
          '修改': 'bg-blue-100 text-blue-700 border-blue-300',
          '删除': 'bg-red-100 text-red-700 border-red-300',
        };
        return (
          <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/50 pt-16">
            <div className="w-[720px] max-h-[80vh] flex flex-col rounded-sm bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    操作日志
                    {selectedWaybill && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        运单 {primaryId} | {selectedWaybill.fbaCode}
                        {selectedIds.length > 1 && <span className="ml-1 text-blue-500">(+{selectedIds.length - 1} 门其他运单)</span>}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedWaybill ? `贸易方式: ${selectedWaybill.tradeMode || '(空)'} | 状态: ${selectedWaybill.status}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <AlertOctagon className="h-10 w-10 mb-3 text-slate-300" />
                    <span className="text-xs">该运单暂无操作日志记录</span>
                    <span className="text-[10px] mt-1 text-slate-300">新建或编辑运单后将自动记录变更历史</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                      <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="w-16 py-3 px-4 text-center text-xs">#</th>
                        <th className="w-44 py-3 px-4 text-xs">时间</th>
                        <th className="w-20 py-3 px-4 text-xs text-center">操作</th>
                        <th className="w-28 py-3 px-4 text-xs">变更字段</th>
                        <th className="py-3 px-4 text-xs">变更详情</th>
                        <th className="w-28 py-3 px-4 text-xs">操作人</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11.5px]">
                      {logs.map((log, idx) => {
                        const badge = actionColors[log.action] || 'bg-slate-100 text-slate-600 border-slate-200';
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 text-center font-mono text-slate-400 text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono text-[10px] whitespace-nowrap">
                              {log.timestamp}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-medium">
                              {log.field}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              <span className="text-slate-400 line-through mr-1">{log.oldValue}</span>
                              <span className="text-slate-400 mx-1">→</span>
                              <span className="text-slate-800 font-medium">{log.newValue}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {log.operator}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 shrink-0">
                <span className="text-[11px] text-slate-400">
                  共 <strong className="text-slate-600">{logs.length}</strong> 条记录
                </span>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {attachmentExportModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 pt-24">
          <div className="w-[520px] rounded-sm bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">附件导出</h3>
            </div>
            <div className="px-6 py-7 text-xs">
              <div className="flex items-start gap-3">
                <span className="mt-1 w-20 shrink-0 text-right font-medium text-slate-700">
                  <span className="mr-1 text-red-500">*</span>附件类型：
                </span>
                <div className="grid flex-1 grid-cols-3 gap-x-12 gap-y-3">
                  {attachmentTypeOptions.map(type => (
                    <label key={type} className="flex cursor-pointer items-center gap-2 text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedAttachmentTypes.includes(type)}
                        onChange={() => toggleAttachmentType(type)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bb1] focus:ring-[#004bb1]"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={handleExportAttachments}
                className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                确定
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachmentExportModalOpen(false);
                  setSelectedAttachmentTypes([]);
                }}
                className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {importInfoWaybill && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 pt-32">
          <div className="w-[520px] rounded-sm bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-xl font-bold text-slate-900">导入运单信息</h3>
            </div>
            <div className="space-y-5 px-8 py-7 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">运单号：</span>
                <span className="font-semibold text-slate-700">{importInfoWaybill.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">
                  <span className="mr-0.5 text-red-500">*</span>导入文件：
                </span>
                <label className="inline-flex cursor-pointer items-center rounded bg-[#004bb1] px-5 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                  点击上传
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    className="hidden"
                    onChange={handleImportInfoFileChange}
                  />
                </label>
                {importInfoFileName && (
                  <span className="max-w-[180px] truncate text-slate-500" title={importInfoFileName}>
                    {importInfoFileName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-right text-slate-600">模板下载：</span>
                <button
                  type="button"
                  onClick={() => addToast('下载导入运单信息模板功能已预留', 'info')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  下载专用模板
                </button>
              </div>
              <p className="pl-[92px] text-sm font-semibold leading-7 text-red-500">
                美国亚马逊仓库 ORF2 / VGT2 / SWF2：UPS派送有<br />
                新旧地址，下单时请务必核对清楚。
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={handleConfirmImportInfo}
                className="rounded bg-[#004bb1] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                确定
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportInfoWaybill(null);
                  setImportInfoFileName('');
                  setImportInfoAttachment(null);
                }}
                className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {editingWaybill && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/45">
          <div className="h-full w-[calc(100vw-610px)] min-w-[980px] max-w-[1500px] overflow-y-auto bg-[#edf3fb] shadow-2xl">
            <div className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
              <div className="flex items-center gap-2">
                <span className="h-6 w-1 rounded bg-slate-900" />
                <h2 className="text-[15px] font-bold text-slate-950">编辑基础信息</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveBasicInfo}
                  className="rounded bg-[#004bb1] px-7 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={cancelBasicInfoEdit}
                  className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-md bg-white p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-x-14 gap-y-3">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}客户名称：</span>
                      <input
                        value={textDraftValue('customerName')}
                        onChange={(e) => updateTextDraft('customerName', e.target.value)}
                        className={disabledFieldClass}
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>客户单号：</span>
                      <input
                        value={textDraftValue('customerOrderNo')}
                        onChange={(e) => updateTextDraft('customerOrderNo', e.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}服务商：</span>
                      <input
                        value={textDraftValue('carrier')}
                        onChange={(e) => updateTextDraft('carrier', e.target.value)}
                        className="h-8 flex-1 cursor-not-allowed rounded border border-transparent bg-transparent px-0 text-xs font-bold text-slate-400 outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}收件人：</span>
                      <input
                        value={textDraftValue('consignee')}
                        onChange={(e) => updateTextDraft('consignee', e.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}仓库代码：</span>
                      <select
                        value={textDraftValue('warehouseCode')}
                        onChange={(e) => updateTextDraft('warehouseCode', e.target.value)}
                        className={fieldClass}
                      >
                        <option value="私人地址">私人地址</option>
                        <option value="塘厦仓">塘厦仓</option>
                        <option value="广州仓">广州仓</option>
                        <option value="义乌仓">义乌仓</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>公司：</span>
                      <input
                        value={textDraftValue('company')}
                        onChange={(e) => updateTextDraft('company', e.target.value)}
                        className={fieldClass}
                        placeholder="请输入"
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}地址一：</span>
                      <input
                        value={textDraftValue('address1')}
                        onChange={(e) => updateTextDraft('address1', e.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>地址二：</span>
                      <input
                        value={textDraftValue('address2')}
                        onChange={(e) => updateTextDraft('address2', e.target.value)}
                        className={fieldClass}
                        placeholder="请输入"
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>地址三：</span>
                      <input
                        value={textDraftValue('address3')}
                        onChange={(e) => updateTextDraft('address3', e.target.value)}
                        className={fieldClass}
                        placeholder="请输入"
                      />
                    </label>
                    <div className="flex items-center gap-3">
                      <span className={labelClass}>城市/州/邮编：</span>
                      <div className="grid flex-1 grid-cols-3 gap-2">
                        <input value={textDraftValue('city')} onChange={(e) => updateTextDraft('city', e.target.value)} className={fieldClass} />
                        <input value={textDraftValue('state')} onChange={(e) => updateTextDraft('state', e.target.value)} className={fieldClass} />
                        <input value={textDraftValue('zipCode')} onChange={(e) => updateTextDraft('zipCode', e.target.value)} className={fieldClass} />
                      </div>
                    </div>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>{requiredMark}目的地：</span>
                      <select
                        value={textDraftValue('country')}
                        onChange={(e) => updateTextDraft('country', e.target.value)}
                        className={fieldClass}
                      >
                        <option value="美国">美国</option>
                        <option value="英国">英国</option>
                        <option value="德国">德国</option>
                        <option value="加拿大">加拿大</option>
                        <option value="日本">日本</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>电话：</span>
                      <input value={textDraftValue('phone')} onChange={(e) => updateTextDraft('phone', e.target.value)} className={fieldClass} />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>邮箱：</span>
                      <input value={textDraftValue('email')} onChange={(e) => updateTextDraft('email', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>Amazon Reference ID：</span>
                      <input value={textDraftValue('amazonReferenceId')} onChange={(e) => updateTextDraft('amazonReferenceId', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <div className="flex items-center gap-3 pt-5">
                      <span className={labelClass}>系统预计送达周：</span>
                    </div>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>预计送达周：</span>
                      <input value={textDraftValue('orderWeek')} onChange={(e) => updateTextDraft('orderWeek', e.target.value)} className="h-8 w-48 rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>关联单号：</span>
                      <input value={textDraftValue('associatedNo')} onChange={(e) => updateTextDraft('associatedNo', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>委托抬头：</span>
                      <select value={textDraftValue('delegatedPickup')} onChange={(e) => updateTextDraft('delegatedPickup', e.target.value)} className={fieldClass}>
                        <option value="">请选择</option>
                        <option value="塘厦测试客户">塘厦测试客户</option>
                        <option value="深圳天图电子有限公司">深圳天图电子有限公司</option>
                      </select>
                    </label>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>合并报关：</span>
                      <span className="text-xs text-slate-400">{textDraftValue('combinedDeclaration')}</span>
                    </div>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>合并清关：</span>
                      <span className="text-xs text-slate-400">{textDraftValue('combinedClearance')}</span>
                    </div>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>PO Number：</span>
                      <input value={textDraftValue('poNumber')} onChange={(e) => updateTextDraft('poNumber', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>参考单号1：</span>
                      <input value={textDraftValue('referenceNo1')} onChange={(e) => updateTextDraft('referenceNo1', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>参考单号2：</span>
                      <input value={textDraftValue('referenceNo2')} onChange={(e) => updateTextDraft('referenceNo2', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-start gap-3">
                      <span className={`${labelClass} pt-2`}>内部备注：</span>
                      <textarea value={textDraftValue('internalNote')} onChange={(e) => updateTextDraft('internalNote', e.target.value)} className="h-12 w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="请输入内部备注" />
                    </label>
                    <label className="flex items-start gap-3">
                      <span className={`${labelClass} pt-2`}>备注：</span>
                      <textarea value={textDraftValue('remarks')} onChange={(e) => updateTextDraft('remarks', e.target.value)} className="h-12 w-full resize-none rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="请输入备注" />
                    </label>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>交税方式：</span>
                      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600">
                        {['自主税号', '自税递延', '包税', '不包税'].map(option => (
                          <label key={option} className="flex items-center gap-1.5">
                            <input type="radio" name="taxMethod" checked={textDraftValue('taxMethod') === option} onChange={() => updateTextDraft('taxMethod', option)} className="h-3 w-3 text-blue-600" />
                            <span className={option === '包税' ? 'font-bold text-blue-600' : ''}>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>报关方式：</span>
                      <select value={textDraftValue('customsDeclarationType')} onChange={(e) => updateTextDraft('customsDeclarationType', e.target.value)} className={fieldClass}>
                        <option value="托管报关">托管报关</option>
                        <option value="报关退税">报关退税</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>贸易方式：</span>
                      <select
                        value={textDraftValue('tradeMode')}
                        onChange={(e) => updateTextDraft('tradeMode', e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">请选择</option>
                        {tradeModeOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>清关方式：</span>
                      <select value={textDraftValue('clearanceMethod')} onChange={(e) => updateTextDraft('clearanceMethod', e.target.value)} className={fieldClass}>
                        <option value="">请选择</option>
                        <option value="普通清关">普通清关</option>
                        <option value="递延清关">递延清关</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>VAT号：</span>
                      <input value={textDraftValue('vatNo')} onChange={(e) => updateTextDraft('vatNo', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>IOSS号：</span>
                      <input value={textDraftValue('iossNo')} onChange={(e) => updateTextDraft('iossNo', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <label className="flex items-center gap-3">
                      <span className={labelClass}>EORI：</span>
                      <input value={textDraftValue('eori')} onChange={(e) => updateTextDraft('eori', e.target.value)} className={fieldClass} placeholder="请输入" />
                    </label>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>申报币种：</span>
                      <span className="text-xs font-semibold text-slate-700">{textDraftValue('currency') || 'USD'}</span>
                    </div>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>主品名：</span>
                      <span className="truncate text-xs font-semibold text-slate-700">{textDraftValue('description')}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className={`${labelClass} pt-0.5`}>物品属性：</span>
                      <div className="grid flex-1 grid-cols-7 gap-x-4 gap-y-3 text-xs text-slate-600">
                        {itemAttributeOptions.map(attribute => (
                          <label key={attribute} className="flex items-center gap-1.5 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={(editDraft.itemAttributes || []).includes(attribute)}
                              onChange={() => toggleItemAttribute(attribute)}
                              className="h-3 w-3 rounded border-slate-300 text-blue-600"
                            />
                            <span>{attribute}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex h-8 items-center gap-3 pt-3">
                      <span className={labelClass}>购买保险：</span>
                      <div className="flex items-center gap-6 text-xs text-slate-600">
                        {[true, false].map(value => (
                          <label key={String(value)} className="flex items-center gap-1.5">
                            <input type="radio" name="buyInsurance" checked={editDraft.buyInsurance === value} onChange={() => updateBooleanDraft('buyInsurance', value)} className="h-3 w-3 text-blue-600" />
                            <span>{value ? '是' : '否'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex h-8 items-center gap-3">
                      <span className={labelClass}>是否购买国内查验宝：</span>
                      <div className="flex items-center gap-6 text-xs text-slate-600">
                        {[true, false].map(value => (
                          <label key={String(value)} className="flex items-center gap-1.5">
                            <input type="radio" name="domesticInspection" checked={editDraft.domesticInspection === value} onChange={() => updateBooleanDraft('domesticInspection', value)} className="h-3 w-3 text-blue-600" />
                            <span>{value ? '是' : '否'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
