import { CalendarDays, ChevronDown, Download, ImageIcon, RotateCcw, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Tab = '待确认' | '已确认' | '已推送海外仓' | '处理中' | '已完成' | '驳回' | '取消' | '全部';
type Status = '已处理' | '待处理' | '已取消' | '已驳回';
type ProcessingResult = '拦截成功' | '拦截失败' | '已处理';
type Row = {
  id: string; tab: Tab; waybill: string; instructionNo: string; names: string[]; created: string; updated: string;
  shipment: string; reference: string; status: Status; processingResult?: ProcessingResult; photo?: string; customer: string; warehouse: string; zip: string;
  orderType: string; instructionType: string; destination: string; salesman: string; merchandiser: string; fee: string;
  packages: string; weight: string; volume: string; arrived: '是' | '否'; overseasTime: string;
};
type Filters = {
  instructionNo: string; waybill: string; shipment: string; reference: string; customer: string; salesman: string;
  merchandiser: string; warehouse: string; orderType: string; instructionType: string; arrived: string; dateFrom: string; dateTo: string;
};

const emptyFilters: Filters = { instructionNo: '', waybill: '', shipment: '', reference: '', customer: '', salesman: '', merchandiser: '', warehouse: '', orderType: '', instructionType: '', arrived: '', dateFrom: '', dateTo: '' };

// Local fixtures mirror the two reference screenshots and keep the static GitHub Pages build usable without an API.
const rawRows: Row[] = [
  { id: '1', tab: '待确认', waybill: 'USSZ202608160010', instructionNo: 'CI20260816212041676418', names: ['拍照5', '拍照4', '换单2'], created: '2026-08-16 21:20:41', updated: '2026-08-16 21:23:46', shipment: 'FBA19KBC16CK', reference: '-', status: '已处理', photo: '拍照5', customer: '郑志强', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '144', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 21:19:38' },
  { id: '2', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816204724154817', names: ['拍照4'], created: '2026-08-16 20:47:24', updated: '2026-08-17 12:14:31', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '3', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816203326240194', names: ['拍照4'], created: '2026-08-16 20:33:26', updated: '2026-08-16 20:33:36', shipment: 'FBA19BBA16CK', reference: '-', status: '待处理', photo: '拍照4', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '4', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816202855497409', names: ['拍照5'], created: '2026-08-16 20:28:56', updated: '2026-08-16 20:29:03', shipment: 'FBA19BBA16CK', reference: '-', status: '待处理', photo: '拍照5', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '56', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '5', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816202623348225', names: ['拦截照片8.16'], created: '2026-08-16 20:26:23', updated: '2026-08-16 20:39:01', shipment: 'FBA19ABA16CK', reference: '-', status: '已处理', photo: '拦截照片8.16', customer: '郑志强', warehouse: 'AVP3', zip: '18424-9492', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3.05', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '6', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816193802324353', names: ['拦截照片8.16'], created: '2026-08-16 19:38:02', updated: '2026-08-16 19:38:12', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '7', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816195234275586', names: ['拦截照片8.16'], created: '2026-08-16 19:52:34', updated: '2026-08-16 19:52:43', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '8', tab: '待确认', waybill: 'USSZ202608160006', instructionNo: 'CI20260816184242053121', names: ['拦截照片8.16'], created: '2026-08-16 18:42:42', updated: '2026-08-16 19:39:40', shipment: 'FBA19AAB16CK', reference: '-', status: '已处理', photo: '拦截照片8.16', customer: '郑志强', warehouse: 'RDU2', zip: '27577', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 17:01:00' },
  { id: '9', tab: '待确认', waybill: 'USSZ202608160006', instructionNo: 'CI20260816184014763649', names: ['人工照片8.16'], created: '2026-08-16 18:41:04', updated: '2026-08-16 18:47:19', shipment: 'FBA19AAB16CK', reference: '-', status: '已处理', photo: '人工照片8.16', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 17:01:00' },
  { id: '10', tab: '待确认', waybill: 'USSZ202608130006', instructionNo: 'CI202608161612771649', names: ['人工照片8.16'], created: '2026-08-16 16:16:12', updated: '2026-08-16 16:16:30', shipment: 'FBAFPXRWE32K', reference: 'ABCDEFG12345', status: '待处理', customer: '福奈测试客户', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-13 16:18:01' },
  { id: '13', tab: '待确认', waybill: 'USSZ202608180013', instructionNo: 'CI20260818103028623540', names: ['拦截-退回仓库'], created: '2026-08-18 10:30:28', updated: '2026-08-18 10:31:12', shipment: 'FBA1INTERCEPT01', reference: 'INT-20260818-01', status: '待处理', customer: '郑志强', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '拦截', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-18 10:15:06' },
  { id: '14', tab: '待确认', waybill: 'USSZ202608180014', instructionNo: 'CI20260818094516178205', names: ['销毁-整票销毁'], created: '2026-08-18 09:45:16', updated: '2026-08-18 09:48:36', shipment: 'FBA1DESTROY01', reference: 'DES-20260818-01', status: '待处理', customer: '福奈测试客户', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '销毁', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '5', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-18 09:30:00' },
  { id: '11', tab: '已确认', waybill: 'USSZ202608120002', instructionNo: 'CI202608151005320118', names: ['贴标'], created: '2026-08-15 10:05:32', updated: '2026-08-15 10:20:01', shipment: 'FBA1CONF16CK', reference: '-', status: '已处理', photo: '贴标', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '12', packages: '2', weight: '20', volume: '0.0480', arrived: '是', overseasTime: '2026-08-15 09:58:10' },
  { id: '12', tab: '已推送海外仓', waybill: 'USSZ202608110001', instructionNo: 'CI202608141024190021', names: ['换单'], created: '2026-08-14 10:24:19', updated: '2026-08-14 10:40:18', shipment: 'FBA1ORDER16CK', reference: '-', status: '已处理', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '20', packages: '1', weight: '12', volume: '0.0250', arrived: '是', overseasTime: '2026-08-14 10:20:03' },

  // --- 已确认 ---
  { id: '15', tab: '已确认', waybill: 'USSZ202608120003', instructionNo: 'CI202608151130450102', names: ['贴标', '换单'], created: '2026-08-15 11:30:45', updated: '2026-08-15 11:45:20', shipment: 'FBA1CONF16CK02', reference: '-', status: '已处理', photo: '贴标', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '18', packages: '3', weight: '26', volume: '0.0720', arrived: '是', overseasTime: '2026-08-15 11:22:08' },
  { id: '16', tab: '已确认', waybill: 'USSZ202608120004', instructionNo: 'CI202608151402338719', names: ['换单'], created: '2026-08-15 14:02:33', updated: '2026-08-15 14:20:11', shipment: 'FBA1CONF16CK03', reference: '-', status: '已处理', photo: '换单', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW006', salesman: '公司', merchandiser: '天惠', fee: '20', packages: '2', weight: '18', volume: '0.0420', arrived: '是', overseasTime: '2026-08-15 13:50:44' },
  { id: '17', tab: '已确认', waybill: 'USSZ202608120005', instructionNo: 'CI202608160910156642', names: ['拍照4', '拍照5'], created: '2026-08-16 09:10:15', updated: '2026-08-16 09:35:02', shipment: 'FBA1CONF16CK04', reference: 'REF-CONF-0005', status: '已处理', photo: '拍照4', customer: '福奈测试客户', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '96', packages: '4', weight: '52', volume: '0.1240', arrived: '是', overseasTime: '2026-08-16 08:55:30' },
  { id: '18', tab: '已完成', waybill: 'USSZ202608120006', instructionNo: 'CI202608161120337788', names: ['拦截-退回仓库'], created: '2026-08-16 11:20:33', updated: '2026-08-16 11:52:41', shipment: '-', reference: '-', status: '已处理', processingResult: '拦截失败', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW006', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-16 11:05:19' },

  // --- 已下单 ---
  { id: '19', tab: '已推送海外仓', waybill: 'USSZ202608110002', instructionNo: 'CI202608141210336655', names: ['换单'], created: '2026-08-14 12:10:33', updated: '2026-08-14 12:30:55', shipment: 'FBA1ORDER16CK02', reference: '-', status: '已处理', photo: '换单', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '20', packages: '1', weight: '12', volume: '0.0250', arrived: '是', overseasTime: '2026-08-14 12:02:19' },
  { id: '20', tab: '已推送海外仓', waybill: 'USSZ202608110003', instructionNo: 'CI202608141530276612', names: ['贴标', '拍照5'], created: '2026-08-14 15:30:27', updated: '2026-08-14 15:52:44', shipment: 'FBA1ORDER16CK03', reference: '-', status: '已处理', photo: '贴标', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '30', packages: '2', weight: '22', volume: '0.0560', arrived: '是', overseasTime: '2026-08-14 15:20:03' },
  { id: '21', tab: '已推送海外仓', waybill: 'USSZ202608110004', instructionNo: 'CI202608150945128803', names: ['不放货'], created: '2026-08-15 09:45:12', updated: '2026-08-15 10:05:38', shipment: '-', reference: '-', status: '已处理', customer: '福奈测试客户', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-15 09:30:41' },
  { id: '22', tab: '已完成', waybill: 'USSZ202608110005', instructionNo: 'CI202608151610447755', names: ['拦截-整票拦截'], created: '2026-08-15 16:10:44', updated: '2026-08-15 16:20:33', shipment: '-', reference: '-', status: '已处理', processingResult: '拦截成功', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW009', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-15 15:58:12' },

  // --- 转运中 ---
  { id: '23', tab: '处理中', waybill: 'USSZ202608090001', instructionNo: 'CI202608121045332201', names: ['发货'], created: '2026-08-12 10:45:33', updated: '2026-08-13 08:20:15', shipment: 'FBA1TRANS16CK1', reference: 'TR-20260812-01', status: '已处理', photo: '发货', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '150', packages: '5', weight: '68', volume: '0.1820', arrived: '是', overseasTime: '2026-08-12 10:30:22' },
  { id: '24', tab: '处理中', waybill: 'USSZ202608090002', instructionNo: 'CI202608121420556677', names: ['发货', '贴标'], created: '2026-08-12 14:20:55', updated: '2026-08-13 09:15:40', shipment: 'FBA1TRANS16CK2', reference: 'TR-20260812-02', status: '已处理', photo: '发货', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW006', salesman: '公司', merchandiser: '天惠', fee: '180', packages: '6', weight: '82', volume: '0.2160', arrived: '是', overseasTime: '2026-08-12 14:05:11' },
  { id: '25', tab: '处理中', waybill: 'USSZ202608090003', instructionNo: 'CI202608130910334488', names: ['发货'], created: '2026-08-13 09:10:33', updated: '2026-08-14 07:42:29', shipment: 'FBA1TRANS16CK3', reference: 'TR-20260813-01', status: '已处理', photo: '发货', customer: '福奈测试客户', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW009', salesman: '管理员', merchandiser: '天顺', fee: '120', packages: '4', weight: '55', volume: '0.1430', arrived: '是', overseasTime: '2026-08-13 08:58:47' },
  // 拦截指令处理中：海外仓尚未回传拦截结果
  { id: '35', tab: '处理中', waybill: 'USSZ202608090004', instructionNo: 'CI202608131520117799', names: ['拦截-退回仓库'], created: '2026-08-13 15:20:11', updated: '2026-08-14 09:05:22', shipment: '-', reference: '-', status: '已处理', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-13 15:05:48' },

  // --- 签收 ---
  { id: '26', tab: '已完成', waybill: 'USSZ202608050001', instructionNo: 'CI202608080930112233', names: ['发货'], created: '2026-08-08 09:30:11', updated: '2026-08-11 16:05:33', shipment: 'FBA1SIGN16CK01', reference: 'SG-20260808-01', status: '已处理', photo: '发货', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '160', packages: '5', weight: '70', volume: '0.1860', arrived: '是', overseasTime: '2026-08-08 09:15:02' },
  { id: '27', tab: '已完成', waybill: 'USSZ202608050002', instructionNo: 'CI202608081510445566', names: ['换单'], created: '2026-08-08 15:10:44', updated: '2026-08-12 10:22:18', shipment: 'FBA1SIGN16CK02', reference: 'SG-20260808-02', status: '已处理', photo: '换单', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '24', packages: '2', weight: '24', volume: '0.0620', arrived: '是', overseasTime: '2026-08-08 14:55:30' },

  // --- 取消 ---
  { id: '28', tab: '取消', waybill: 'USSZ202608070001', instructionNo: 'CI202608101020304050', names: ['拦截-退回仓库'], created: '2026-08-10 10:20:30', updated: '2026-08-10 11:05:12', shipment: '-', reference: '-', status: '已取消', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-10 10:05:44' },
  { id: '29', tab: '取消', waybill: 'USSZ202608070002', instructionNo: 'CI202608101430556677', names: ['换单'], created: '2026-08-10 14:30:55', updated: '2026-08-10 15:12:08', shipment: '-', reference: '-', status: '已取消', customer: '福奈测试客户', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-10 14:18:20' },
  { id: '30', tab: '取消', waybill: 'USSZ202608070003', instructionNo: 'CI202608110910223344', names: ['销毁-整票销毁'], created: '2026-08-11 09:10:22', updated: '2026-08-11 09:40:50', shipment: '-', reference: '-', status: '已取消', customer: '深圳天图', warehouse: '-', zip: '-', orderType: '-', instructionType: '销毁', destination: 'MW006', salesman: '公司', merchandiser: '天惠', fee: '5', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-11 08:55:10' },
  { id: '31', tab: '取消', waybill: 'USSZ202608070004', instructionNo: 'CI202608111610556699', names: ['拍照5'], created: '2026-08-11 16:10:55', updated: '2026-08-11 16:48:03', shipment: '-', reference: '-', status: '已取消', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '56', packages: '1', weight: '15', volume: '0.0358', arrived: '否', overseasTime: '-' },

  // --- 已完成 · 拦截指令海外仓回传结果 ---
  { id: '36', tab: '已完成', waybill: 'USSZ202608040001', instructionNo: 'CI202608071015223344', names: ['拦截-整票拦截'], created: '2026-08-07 10:15:22', updated: '2026-08-07 14:38:09', shipment: '-', reference: '-', status: '已处理', processingResult: '拦截失败', customer: '福奈测试客户', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW006', salesman: '管理员', merchandiser: '天顺', fee: '8', packages: '3', weight: '42', volume: '0.0960', arrived: '是', overseasTime: '2026-08-07 09:58:31' },
  { id: '37', tab: '已完成', waybill: 'USSZ202608040002', instructionNo: 'CI202608071430551122', names: ['拦截-退回仓库'], created: '2026-08-07 14:30:55', updated: '2026-08-08 09:12:40', shipment: '-', reference: '-', status: '已处理', processingResult: '拦截成功', customer: '深圳天图', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW009', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '1', weight: '14', volume: '0.0320', arrived: '是', overseasTime: '2026-08-07 14:15:18' },

  // --- 驳回 ---
  { id: '32', tab: '驳回', waybill: 'USSZ202608060001', instructionNo: 'CI202608091030445511', names: ['拦截-退回仓库'], created: '2026-08-09 10:30:44', updated: '2026-08-09 15:20:18', shipment: '-', reference: '-', status: '已驳回', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '拦截', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-09 10:15:02' },
  { id: '33', tab: '驳回', waybill: 'USSZ202608060002', instructionNo: 'CI202608091425336622', names: ['不放货'], created: '2026-08-09 14:25:33', updated: '2026-08-10 09:12:47', shipment: '-', reference: '-', status: '已驳回', customer: '福奈测试客户', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW006', salesman: '管理员', merchandiser: '天顺', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-09 14:10:21' },
  { id: '34', tab: '驳回', waybill: 'USSZ202608060003', instructionNo: 'CI202608101615227733', names: ['销毁-整票销毁'], created: '2026-08-10 16:15:22', updated: '2026-08-11 11:38:05', shipment: '-', reference: '-', status: '已驳回', customer: '深圳天图', warehouse: '-', zip: '-', orderType: '-', instructionType: '销毁', destination: 'MW009', salesman: '公司', merchandiser: '天惠', fee: '5', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-10 16:02:39' },
];

// 仅“放货”需要在创建页填写收件地址；其它指令类型不产生地址/货件标识字段。
const rows: Row[] = rawRows.map((row) => {
  if (row.instructionType === '放货') return row;
  return {
    ...row,
    shipment: '-',
    reference: '-',
    warehouse: '-',
    zip: '-',
    orderType: '-',
  };
});

// 计数直接由数据算出，避免写死的数字与列表实际条数不一致。
const tabKeys: Tab[] = ['待确认', '已确认', '已推送海外仓', '处理中', '已完成', '驳回', '取消', '全部'];
const tabs: Array<{ key: Tab; count: number }> = tabKeys.map((key) => ({
  key,
  count: key === '全部' ? rows.length : rows.filter((row) => row.tab === key).length,
}));
const inputClass = 'h-8 min-w-0 flex-1 rounded border border-[#dfe5ee] bg-white px-2 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-[#0759b6] focus:ring-1 focus:ring-[#0759b6]';

const getProcessingResult = (row: Row): ProcessingResult | '' => {
  if (row.status !== '已处理') return '';
  if (row.instructionType !== '拦截') return '已处理';
  return row.processingResult === '拦截成功' || row.processingResult === '拦截失败'
    ? row.processingResult
    : '';
};

const isInterceptResult = (value: string): value is '拦截成功' | '拦截失败' =>
  value === '拦截成功' || value === '拦截失败';

// 拦截类指令的处理状态由海外仓回传，只有「拦截成功 / 拦截失败」，不写通用的「已完成」。
const getStatusText = (row: Row): string => {
  if (row.instructionType === '拦截' && row.status === '已处理') {
    return isInterceptResult(row.processingResult ?? '') ? (row.processingResult as string) : '待海外仓回传';
  }
  return row.status === '已处理' ? '已完成' : row.status;
};

// 拦截失败的行整行标红，便于在列表中一眼定位异常单。
const isInterceptFailed = (row: Row, statusText: string): boolean =>
  row.instructionType === '拦截' && statusText === '拦截失败';

const getRowBackground = (checked: boolean, interceptFailed: boolean): string => {
  if (interceptFailed) return checked ? 'bg-rose-100' : 'bg-rose-50';
  return checked ? 'bg-[#f0f6ff]' : 'bg-white';
};

const getStatusColor = (row: Row, statusText: string): string => {
  if (statusText === '拦截成功') return 'text-emerald-600';
  if (statusText === '拦截失败') return 'text-rose-600';
  if (statusText === '待海外仓回传') return 'text-[#b8c3d4]';
  if (row.status === '待处理') return 'text-amber-600';
  if (row.status === '已取消') return 'text-slate-400';
  if (row.status === '已驳回') return 'text-rose-600';
  return '';
};

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-xs font-semibold text-slate-700">{label}</span><span className="relative flex min-w-0 flex-1">{children}</span></label>;
}
function Select({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: string[] }) {
  return <><select className={`${inputClass} appearance-none pr-7`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" /></>;
}
function Photo({ label }: { label?: string }) {
  return label ? <div className="mx-auto flex h-12 w-[118px] items-center gap-2 overflow-hidden rounded border border-slate-200 bg-slate-50 px-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-200 text-slate-500"><ImageIcon className="h-4 w-4" /></div><span className="line-clamp-2 text-left text-[11px] leading-4">{label}</span></div> : <span className="text-slate-400">-</span>;
}

export default function InstructionListPage({ addToast }: { addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void }) {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState<Tab>('待确认');
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [data, setData] = useState(rows);
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const visible = useMemo(() => data.filter((row) => {
    const includes = (source: string, filter: string) => !filter || source.toLowerCase().includes(filter.trim().toLowerCase());
    const inDate = (!applied.dateFrom || row.created.slice(0, 10) >= applied.dateFrom) && (!applied.dateTo || row.created.slice(0, 10) <= applied.dateTo);
    return (tab === '全部' || row.tab === tab) && includes(row.instructionNo, applied.instructionNo) && includes(row.waybill, applied.waybill) && includes(row.shipment, applied.shipment) && includes(row.reference, applied.reference) && includes(row.customer, applied.customer) && includes(row.salesman, applied.salesman) && includes(row.merchandiser, applied.merchandiser) && includes(row.warehouse, applied.warehouse) && (!applied.orderType || row.orderType === applied.orderType) && (!applied.instructionType || row.instructionType === applied.instructionType) && (!applied.arrived || row.arrived === applied.arrived) && inDate;
  }), [applied, data, tab]);
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const applyQuery = () => { setApplied(draft); setSelected([]); addToast?.('已按筛选条件查询', 'success'); };
  const reset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setSelected([]); addToast?.('筛选条件已重置', 'info'); };
  const toggleAll = () => setSelected((current) => allSelected ? current.filter((id) => !visible.some((row) => row.id === id)) : Array.from(new Set([...current, ...visible.map((row) => row.id)])));
  const updateStatus = (status: Status, message: string) => {
    if (!selected.length) { addToast?.('请先勾选需要处理的指令', 'warning'); return; }
    setData((current) => current.map((row) => selected.includes(row.id) ? { ...row, status, updated: '2026-08-28 09:30:00' } : row));
    addToast?.(message.replace('{count}', String(selected.length)), 'success'); setSelected([]);
  };
  const exportRows = () => {
    const picked = selected.length ? visible.filter((row) => selected.includes(row.id)) : visible;
    const csv = [['运单号', '指令单号', '指令名称', '创建时间', '指令处理状态', '处理结果', '客户简称', '仓库代码', '下单类型', '指令单类型'].join(','), ...picked.map((row) => [row.waybill, row.instructionNo, row.names.join(' / '), row.created, row.status, getProcessingResult(row), row.customer, row.warehouse, row.orderType, row.instructionType].map((value) => `"${value.replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); link.download = '指令列表.csv'; link.click(); addToast?.(`已导出 ${picked.length} 条指令`, 'success');
  };

  return <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f6fa] p-3 text-slate-700">
    <section className="shrink-0 rounded border border-[#e7ebf1] bg-white px-3 py-3 shadow-sm">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 xl:grid-cols-4">
        <Filter label="指令单号"><input className={inputClass} value={draft.instructionNo} onChange={(event) => setFilter('instructionNo', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="运单号"><input className={inputClass} value={draft.waybill} onChange={(event) => setFilter('waybill', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="Shipment ID"><input className={inputClass} value={draft.shipment} onChange={(event) => setFilter('shipment', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="Reference ID"><input className={inputClass} value={draft.reference} onChange={(event) => setFilter('reference', event.target.value)} placeholder="支持批量搜索" /></Filter>
        {expanded && <>
          <Filter label="客户简称"><input className={inputClass} value={draft.customer} onChange={(event) => setFilter('customer', event.target.value)} placeholder="客户简称" /></Filter>
          <Filter label="业务员"><Select value={draft.salesman} onChange={(value) => setFilter('salesman', value)} placeholder="请选择" options={['公司', '管理员']} /></Filter>
          <Filter label="跟单代表"><input className={inputClass} value={draft.merchandiser} onChange={(event) => setFilter('merchandiser', event.target.value)} placeholder="跟单代表" /></Filter>
          <Filter label="仓库代码"><input className={inputClass} value={draft.warehouse} onChange={(event) => setFilter('warehouse', event.target.value)} placeholder="仓库代码" /></Filter>
          <Filter label="下单类型"><Select value={draft.orderType} onChange={(value) => setFilter('orderType', value)} placeholder="下单类型" options={['亚马逊', '沃尔玛']} /></Filter>
          <Filter label="指令单类型"><Select value={draft.instructionType} onChange={(value) => setFilter('instructionType', value)} placeholder="指令单类型" options={['放货', '不放货', '拦截', '销毁']} /></Filter>
          <Filter label="入仓时间"><span className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded border border-[#dfe5ee] px-2"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-300" /><input aria-label="开始日期" className="min-w-0 flex-1 text-center text-xs outline-none placeholder:text-slate-300" value={draft.dateFrom} onChange={(event) => setFilter('dateFrom', event.target.value)} placeholder="开始日期" /><span className="text-slate-400">-</span><input aria-label="结束日期" className="min-w-0 flex-1 text-center text-xs outline-none placeholder:text-slate-300" value={draft.dateTo} onChange={(event) => setFilter('dateTo', event.target.value)} placeholder="结束日期" /></span></Filter>
          <Filter label="是否到达海外仓"><Select value={draft.arrived} onChange={(value) => setFilter('arrived', value)} placeholder="是否到达海外仓" options={['是', '否']} /></Filter>
        </>}
      </div>
      <div className="mt-3 flex items-center gap-3"><button type="button" onClick={applyQuery} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded bg-[#0759b6] text-xs font-semibold text-white hover:bg-[#00479a]"><Search className="h-3.5 w-3.5" />查询</button><button type="button" onClick={reset} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded border border-[#dfe5ee] bg-white text-xs font-semibold text-slate-600"><RotateCcw className="h-3.5 w-3.5" />重置</button><button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded border border-[#dfe5ee] bg-white text-xs font-semibold text-slate-600"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />{expanded ? '收起' : '展开'}</button></div>
    </section>
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[#e7ebf1] bg-white shadow-sm">
      <div className="flex shrink-0 items-end gap-6 border-b border-[#dfe5ee] px-3 pt-2">{tabs.map((item) => <button key={item.key} type="button" onClick={() => { setTab(item.key); setSelected([]); }} className={`relative h-8 whitespace-nowrap text-xs font-medium ${tab === item.key ? 'text-[#0759b6]' : 'text-slate-600'}`}>{item.key}({item.count}){tab === item.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#0759b6]" />}</button>)}</div>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#edf0f4] px-3"><div className="flex items-center gap-3"><button type="button" onClick={() => updateStatus('已取消', '已取消 {count} 条待确认指令')} className="h-7 rounded bg-[#0759b6] px-4 text-xs font-semibold text-white">取消下单</button><button type="button" onClick={() => updateStatus('已处理', '已确认 {count} 条指令')} className="h-7 rounded bg-[#0759b6] px-4 text-xs font-semibold text-white">已确认</button><button type="button" onClick={exportRows} className="inline-flex h-7 items-center gap-1 rounded border border-[#dfe5ee] bg-white px-4 text-xs font-semibold text-slate-600"><Download className="h-3.5 w-3.5" />导出</button><button type="button" onClick={() => addToast?.('当前列表暂无新的操作日志', 'info')} className="h-7 rounded border border-[#dfe5ee] bg-white px-4 text-xs font-semibold text-slate-600">查看日志</button></div><button type="button" aria-label="列表设置" onClick={() => addToast?.('列表支持横向滚动查看全部字段', 'info')} className="flex h-7 w-7 items-center justify-center rounded bg-[#0759b6] text-white"><Settings2 className="h-3.5 w-3.5" /></button></div>
      <div className="min-h-0 flex-1 overflow-auto"><table className="min-w-[2720px] table-fixed border-collapse text-[11px] text-slate-600"><thead className="sticky top-0 z-20 bg-[#f7f9fc]"><tr className="h-8"><th className="sticky left-0 z-30 w-10 border border-[#e5e9ef] bg-[#f7f9fc] text-center"><input aria-label="全选" type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-[#0759b6]" /></th><th className="sticky left-10 z-30 w-40 border border-[#e5e9ef] bg-[#f7f9fc] text-center">运单号</th><th className="sticky left-[200px] z-30 w-40 border border-[#e5e9ef] bg-[#f7f9fc] text-center shadow-[5px_0_8px_-7px_rgba(15,23,42,0.55)]">指令单号</th>{['指令名称', '创建时间', '修改时间', 'Shipment ID', 'Reference ID', '指令处理状态', '指令操作图片', '客户简称', '仓库代码', '邮编', '下单类型', '指令单类型', '目的地', '业务员', '跟单员', '指令费用(CNY)', '发货件数', '重量', '方数', '是否到达海外仓', '入仓时间（海外仓）'].map((head) => <th key={head} className="w-32 border border-[#e5e9ef] px-2 text-center font-semibold">{head}</th>)}</tr></thead><tbody>{visible.map((row) => { const checked = selected.includes(row.id); const statusText = getStatusText(row); const processingResult = getProcessingResult(row); const interceptFailed = isInterceptFailed(row, statusText); return <tr key={row.id} className={`h-[80px] ${getRowBackground(checked, interceptFailed)}`}><td className="sticky left-0 z-10 border border-[#eef1f5] bg-inherit text-center"><input aria-label={`选择${row.instructionNo}`} type="checkbox" checked={checked} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} className="h-3.5 w-3.5 accent-[#0759b6]" /></td><td className="sticky left-10 z-10 border border-[#eef1f5] bg-inherit px-2 text-center whitespace-nowrap">{row.waybill}</td><td className="sticky left-[200px] z-10 border border-[#eef1f5] bg-inherit px-2 text-center text-[#3885d6] shadow-[5px_0_8px_-7px_rgba(15,23,42,0.55)]"><button type="button" onClick={() => addToast?.(`已打开指令单 ${row.instructionNo}`, 'info')} className="whitespace-nowrap hover:underline">{row.instructionNo}</button></td><td className="border border-[#eef1f5] px-2 text-center leading-5">{row.names.map((name) => <div key={name}>{name}</div>)}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.created}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.updated}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.shipment}</td><td className="border border-[#eef1f5] px-2 text-center">{row.reference}</td><td className={`border border-[#eef1f5] px-2 text-center ${getStatusColor(row, statusText)}`}><div className="whitespace-nowrap">{statusText}</div>{processingResult && processingResult !== statusText && <div className="mt-1 whitespace-nowrap text-[10px] text-slate-500">处理结果：{processingResult}</div>}</td><td className="border border-[#eef1f5] px-2 text-center"><Photo label={row.photo} /></td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.customer}</td><td className="border border-[#eef1f5] px-2 text-center">{row.warehouse}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.zip}</td><td className="border border-[#eef1f5] px-2 text-center">{row.orderType}</td><td className="border border-[#eef1f5] px-2 text-center">{row.instructionType}</td><td className="border border-[#eef1f5] px-2 text-center">{row.destination}</td><td className="border border-[#eef1f5] px-2 text-center">{row.salesman}</td><td className="border border-[#eef1f5] px-2 text-center">{row.merchandiser}</td><td className="border border-[#eef1f5] px-2 text-center">{row.fee}</td><td className="border border-[#eef1f5] px-2 text-center">{row.packages}</td><td className="border border-[#eef1f5] px-2 text-center">{row.weight}</td><td className="border border-[#eef1f5] px-2 text-center">{row.volume}</td><td className="border border-[#eef1f5] px-2 text-center">{row.arrived}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.overseasTime}</td></tr>; })}{visible.length === 0 && <tr><td colSpan={24} className="h-48 border border-[#eef1f5] text-center text-slate-400">暂无符合筛选条件的指令数据</td></tr>}</tbody></table></div>
      <footer className="flex h-10 shrink-0 items-center justify-end gap-4 border-t border-[#edf0f4] px-4 text-xs text-slate-500"><span>共 {visible.length} 条</span><select aria-label="每页条数" className="h-6 rounded border border-slate-200 bg-white px-2 text-xs"><option>100条/页</option></select><button type="button">‹</button><span className="text-[#0759b6]">1</span><button type="button">›</button><span>前往</span><input aria-label="页码" className="h-6 w-9 rounded border border-slate-200 text-center text-xs" value="1" readOnly /><span>页</span></footer>
    </section>
  </main>;
}
