import React, { useState } from 'react';
import {
  FileText, Warehouse, Box, ClipboardList, CreditCard,
  MessageSquareCode, BarChart3, Settings, Users,
  DownloadCloud, Cpu, Megaphone, ChevronDown, ChevronRight,
  TrendingUp, ArrowRightLeft, Layers, Wrench, Printer, Package,
  PackageOpen, SlidersHorizontal, UserCog, KeyRound
} from 'lucide-react';

interface SidebarProps {
  currentSubView: string;
  onSubViewChange: (view: string) => void;
}

export default function Sidebar({ currentSubView, onSubViewChange }: SidebarProps) {
  const [activeRail, setActiveRail] = useState('单据');
  const [waybillExpanded, setWaybillExpanded] = useState(true);
  const [printExpanded, setPrintExpanded] = useState(true);
  const [overseasTransitExpanded, setOverseasTransitExpanded] = useState(true);
  const [warehouseTransferExpanded, setWarehouseTransferExpanded] = useState(true);
  const [configExpanded, setConfigExpanded] = useState(true);
  const [accountSettingsExpanded, setAccountSettingsExpanded] = useState(true);

  // Outer rail menu items
  const railItems = [
    { name: '单据', icon: FileText },
    { name: '仓库', icon: Warehouse },
    { name: '产品', icon: Box },
    { name: '订单', icon: ClipboardList },
    { name: '财务', icon: CreditCard },
    { name: '询价', icon: MessageSquareCode },
    { name: '统计', icon: BarChart3 },
    { name: '配置', icon: Settings },
    { name: '管理', icon: Users },
    { name: '导出', icon: DownloadCloud },
    { name: '系统', icon: Cpu },
    { name: '营销', icon: Megaphone },
  ];

  return (
    <div className="flex h-screen select-none border-r border-[#e5e7eb] bg-white">
      {/* Outer Rail (Dark Blue / Steel Gray branding) */}
      <div className="flex w-16 flex-col items-center border-r border-slate-700 bg-slate-900 py-3 text-slate-400">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-blue-600 font-bold text-white shadow-md">
          TT
        </div>
        
        <div className="flex-1 space-y-3 overflow-y-auto px-1 scrollbar-none w-full">
          {railItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRail === item.name;
            return (
              <button
                key={item.name}
                id={`rail-item-${item.name}`}
                onClick={() => {
                  setActiveRail(item.name);
                  if (item.name === '仓库') {
                    onSubViewChange('仓库出货');
                  }
                  if (item.name === '配置') {
                    onSubViewChange('贸易方式配置');
                  }
                  if (item.name === '管理') {
                    onSubViewChange('用户');
                  }
                  if (item.name === '营销') {
                    onSubViewChange('营销数据看板');
                  }
                }}
                className={`group flex w-full flex-col items-center justify-center py-2 transition-all duration-150 relative ${
                  isActive 
                    ? 'text-white font-medium bg-slate-800' 
                    : 'hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                )}
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span className="mt-1 text-[10px] scale-90 tracking-wider font-sans">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inner Active Sidebar Panel */}
      <div className="flex w-[210px] flex-col bg-slate-50 text-slate-800">
        {/* Tiantu Logo Section */}
        <div className="flex flex-col border-b border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            {/* Custom SVG logo resembling the original Tiantu wing/shield logo */}
            <svg id="tiantu-logo" className="h-7 w-7 text-blue-600" viewBox="0 0 100 100" fill="currentColor">
              <path d="M10 20 L40 10 L75 35 L40 45 Z" fill="#2563EB" />
              <path d="M40 45 L75 35 L90 80 L45 90 Z" fill="#F59E0B" opacity="0.9" />
              <path d="M10 20 L40 45 L45 90 L20 60 Z" fill="#1D4ED8" />
            </svg>
            <div>
              <h1 className="font-sans font-bold text-[15px] leading-tight tracking-tight text-slate-900">
                Tiantu 天图通逊
              </h1>
              <p className="text-[10px] text-slate-500 scale-90 -translate-x-1 font-sans">
                聚焦美英 空海运专线
              </p>
            </div>
          </div>
        </div>

        {/* Submenu — dynamic based on activeRail */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {activeRail === '单据' && (
            <>
              {/* Group 1: 运单管理 (Collapsible) */}
              <div className="space-y-1">
                <button
                  id="btn-fold-waybills"
                  onClick={() => setWaybillExpanded(!waybillExpanded)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>运单</span>
                  </div>
                  {waybillExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {waybillExpanded && (
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                    {[
                      { name: '运单', count: 129 },
                      { name: '跟单运单', count: 0 },
                      { name: '业务运单', count: 2 },
                    ].map((subItem) => {
                      const isSelected = currentSubView === subItem.name;
                      return (
                        <button
                          key={subItem.name}
                          id={`submenu-item-${subItem.name}`}
                          onClick={() => onSubViewChange(subItem.name)}
                          className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-xs transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          <span>{subItem.name}</span>
                          {subItem.count > 0 && (
                            <span className={`rounded-full px-1.5 text-[9px] ${
                              isSelected ? 'bg-blue-150 text-blue-700 font-bold' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {subItem.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span>提单</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-slate-500" />
                    <span>工单</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <button
                  id="btn-fold-print"
                  onClick={() => setPrintExpanded(!printExpanded)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>打单</span>
                  </div>
                  {printExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {printExpanded && (
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                    {['快递单', '推送单'].map((name) => {
                      const isSelected = currentSubView === name;
                      return (
                        <button
                          key={name}
                          id={`submenu-item-${name}`}
                          onClick={() => onSubViewChange(name)}
                          className={`flex w-full items-center rounded px-3 py-1.5 text-xs transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-slate-500" />
                    <span>预留仓</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <button
                  id="btn-fold-overseas-transit"
                  onClick={() => setOverseasTransitExpanded(!overseasTransitExpanded)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    <span className="truncate">海外中转单管理</span>
                  </div>
                  {overseasTransitExpanded ? <ChevronDown className="h-3 w-3 text-blue-500" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                </button>

                {overseasTransitExpanded && (
                  <div className="ml-4 space-y-0.5 border-l border-slate-200 pl-2">
                    {['指令管理', '指令列表', '海外暂存', '创建客户指令', '海外中转单', '海外拦截'].map((name) => {
                      const isSelected = currentSubView === name;
                      return (
                        <button
                          key={name}
                          id={`submenu-item-${name}`}
                          onClick={() => onSubViewChange(name)}
                          className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span className="truncate">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-200/50">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-500" />
                    <span>货件管理</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>
            </>
          )}

          {activeRail === '产品' && (
            <div className="space-y-1">
              {/* 一级菜单：产品服务 */}
              <button
                id="submenu-item-产品服务"
                onClick={() => onSubViewChange('产品服务')}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  currentSubView === '产品服务'
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <PackageOpen className="h-4 w-4" />
                <span>产品服务</span>
              </button>

              {/* 一级菜单：产品配置 (collapsible → 二级：贸易方式) */}
              <div className="space-y-1">
                <button
                  id="btn-fold-config"
                  onClick={() => setConfigExpanded(!configExpanded)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                    <span>产品配置</span>
                  </div>
                  {configExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {configExpanded && (
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                    {[
                      { name: '贸易方式', viewKey: '贸易方式校验规则查询' },
                    ].map((subItem) => {
                      const isSelected = currentSubView === subItem.viewKey;
                      return (
                        <button
                          key={subItem.name}
                          id={`submenu-item-${subItem.name}`}
                          onClick={() => onSubViewChange(subItem.viewKey)}
                          className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-xs transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          <span>{subItem.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeRail === '仓库' && (
            <>
              <button
                id="submenu-item-仓库概览"
                onClick={() => onSubViewChange('仓库概览')}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  currentSubView === '仓库概览'
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Warehouse className="h-4 w-4" />
                <span>仓库概览</span>
              </button>

              {['仓库收货', '仓库出货', '配货单', 'TK-查验列表', '预打板报表'].map((name) => (
                <button
                  key={name}
                  id={`submenu-item-${name}`}
                  onClick={() => onSubViewChange(name)}
                  className={`flex w-full items-center rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    currentSubView === name
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <span>{name}</span>
                </button>
              ))}

              <div className="space-y-1">
                <button
                  id="btn-fold-warehouse-transfer"
                  onClick={() => setWarehouseTransferExpanded(!warehouseTransferExpanded)}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-slate-600" />
                    <span>中转管理</span>
                  </div>
                  {warehouseTransferExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                {warehouseTransferExpanded && (
                  <div className="ml-4 pl-2 border-l border-slate-200 space-y-0.5">
                    {[
                      '中转入库',
                      '中转出库',
                    ].map((name) => {
                      const isSelected = currentSubView === name;
                      return (
                        <button
                          key={name}
                          id={`submenu-item-${name}`}
                          onClick={() => onSubViewChange(name)}
                          className={`flex w-full items-center rounded px-3 py-1.5 text-xs transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {['仓库暂存', '仓库配置', '仓库费用', '仓库报表', '排队管理', '仓库统计'].map((name) => (
                <button
                  key={name}
                  id={`submenu-item-${name}`}
                  onClick={() => onSubViewChange(name)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    currentSubView === name
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <span>{name}</span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </>
          )}

          {activeRail === '管理' && (
            <div className='space-y-1'>
              <button id='btn-fold-account-settings' onClick={() => setAccountSettingsExpanded(!accountSettingsExpanded)} className='flex w-full items-center justify-between rounded px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/50'>
                <div className='flex items-center gap-2'><KeyRound className='h-4 w-4 text-blue-600'/><span>账号设置</span></div>
                {accountSettingsExpanded ? <ChevronDown className='h-3 w-3'/> : <ChevronRight className='h-3 w-3'/>}
              </button>
              {accountSettingsExpanded && <div className='ml-4 space-y-0.5 border-l border-slate-200 pl-2'>
                <button id='submenu-item-用户' onClick={() => onSubViewChange('用户')} className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${currentSubView === '用户' ? 'bg-blue-50 font-semibold text-blue-600' : 'text-slate-600 hover:bg-slate-200/50'}`}>
                  <UserCog className='h-3.5 w-3.5'/><span>用户</span>
                </button>
              </div>}
            </div>
          )}

          {activeRail === '营销' && (
            <div className='space-y-1'>
              <div className='flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700'>
                <Megaphone className='h-4 w-4 text-blue-600'/><span>营销管理</span>
              </div>
              <div className='ml-4 border-l border-slate-200 pl-2'>
                <button id='submenu-item-营销数据看板' onClick={() => onSubViewChange('营销数据看板')} className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors ${currentSubView === '营销数据看板' ? 'bg-blue-50 font-semibold text-blue-600' : 'text-slate-600 hover:bg-slate-200/50'}`}>
                  <BarChart3 className='h-3.5 w-3.5'/><span>营销数据看板</span>
                </button>
              </div>
            </div>
          )}

          {/* Fallback for other rails without a configured submenu */}
          {activeRail !== '单据' && activeRail !== '产品' && activeRail !== '仓库' && activeRail !== '管理' && activeRail !== '营销' && (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              暂无子菜单
            </div>
          )}
        </div>

        {/* Lower helpful tips */}
        <div className="p-3 border-t border-slate-200 bg-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 mb-1">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            <span>智能专线推荐</span>
          </div>
          美英空派专线时效保障，快至 3 日送达。
        </div>
      </div>
    </div>
  );
}
