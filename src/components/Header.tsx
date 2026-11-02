import React, { useState, useEffect } from 'react';
import HeaderHelpEntry from './HeaderHelpEntry';
import { 
  Bell, Download, MapPin, Globe, ChevronDown, Check, X,
  LogOut, User, ShieldAlert, FileClock
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  selectedWarehouse: string;
  onWarehouseChange: (wh: string) => void;
  openTabs: string[];
  onCloseTab: (tab: string) => void;
  addToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export default function Header({ 
  currentTab, 
  onTabChange, 
  selectedWarehouse, 
  onWarehouseChange,
  openTabs,
  onCloseTab,
  addToast
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // format: YYYY-MM-DD HH:MM:SS
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const dy = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const sc = String(now.getSeconds()).padStart(2, '0');
      setUtcTime(`${yr}-${mo}-${dy} ${hr}:${mi}:${sc}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const warehouseOptions = ['塘厦仓', '广州仓', '义乌仓'];

  const simulatedNotifications = [
    { id: 1, text: '运单 FBA19G6M4C7B 货物已顺利进仓', time: '刚才', type: 'success' },
    { id: 2, text: '系统于 2026-06-16 02:39 成功启动', time: '10分钟前', type: 'info' },
    { id: 3, text: '有一张运单需要补充申报品名要素', time: '1小时前', type: 'warning' },
  ];

  return (
    <div className="relative flex h-12 w-full items-center justify-between border-b border-slate-200 bg-white px-4 selection:bg-blue-200">
      {/* Left Area: Tabs */}
      <div className="flex h-full min-w-0 items-end gap-1 overflow-x-auto scrollbar-none">
        {openTabs.map((tab) => {
          const isActive = currentTab === tab;
          return (
            <div
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`group relative flex h-9 items-center gap-1.5 rounded-t-md px-4 text-xs font-medium cursor-pointer transition-all duration-150 border-t ${
                isActive
                  ? 'border-t-blue-600 bg-slate-100 text-blue-600 shadow-[0_-2px_6px_rgba(0,0,0,0.03)]'
                  : 'border-t-transparent bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span className="font-sans">{tab}</span>
              {openTabs.length > 1 && (
                <button
                  id={`btn-close-tab-${tab}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab);
                  }}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </div>
          );
        })}
      </div>

      {/* Right Area: Controls & User Info */}
      <div className="flex shrink-0 items-center gap-3 text-xs text-slate-600">
        {/* UTC Time Clock */}
        <div className="hidden items-center gap-1.5 font-mono text-slate-500 md:flex">
          <FileClock className="h-3.5 w-3.5 text-slate-450" />
          <span>{utcTime}</span>
        </div>

        {/* Warehouse Selection Badge */}
        <div className="relative">
          <button
            id="btn-warehouse-trigger"
            onClick={() => {
              setShowWarehouseMenu(!showWarehouseMenu);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-sans text-blue-700 font-medium hover:bg-blue-105 transition-all duration-150"
          >
            <MapPin className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
            <span>{selectedWarehouse}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {showWarehouseMenu && (
            <div className="absolute right-0 mt-1.5 w-36 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-30 font-sans">
              {warehouseOptions.map((wh) => (
                <button
                  key={wh}
                  onClick={() => {
                    onWarehouseChange(wh);
                    setShowWarehouseMenu(false);
                    addToast(`切换至 [${wh}] 成功`, 'info');
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors duration-100"
                >
                  <span className={selectedWarehouse === wh ? 'text-blue-600 font-medium' : 'text-slate-600'}>
                    {wh}
                  </span>
                  {selectedWarehouse === wh && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <HeaderHelpEntry href="about:blank" />

        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            id="btn-bell-trigger"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowWarehouseMenu(false);
              setShowProfileMenu(false);
            }}
            className="relative rounded-full p-1.5 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-4.5 w-4.5 text-slate-600" />
            <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-mono text-[9px] font-bold text-white leading-none scale-90">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-slate-200 bg-white shadow-xl py-2 z-30 font-sans">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-150">
                <span className="font-semibold text-slate-800">系统消息</span>
                <button 
                  onClick={() => addToast('通知已全部标记已读', 'success')}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  全部设为已读
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {simulatedNotifications.map((notif) => (
                  <div key={notif.id} className="p-2.5 hover:bg-slate-50 transition-colors">
                    <p className="text-slate-700 text-xs leading-relaxed">{notif.text}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{notif.time}</span>
                      <span className={`inline-block rounded-full px-1.5 text-[8px] font-medium ${
                        notif.type === 'success' ? 'bg-green-105 text-green-700' :
                        notif.type === 'warning' ? 'bg-orange-105 text-orange-700' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {notif.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Downloads list button */}
        <button
          id="btn-downloads"
          onClick={() => addToast('暂无进行中的下载任务', 'info')}
          className="rounded-full p-1.5 hover:bg-slate-100 transition-colors text-slate-600"
          title="下载任务"
        >
          <Download className="h-4.5 w-4.5" />
        </button>

        {/* Separation vertical line */}
        <div className="h-4 w-px bg-slate-200" />

        {/* Active operator username profile dropdown */}
        <div className="relative">
          <button
            id="btn-profile-trigger"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowWarehouseMenu(false);
            }}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow-sm border border-slate-300">
              天
            </div>
            <div className="flex flex-col items-start leading-none text-left">
              <span className="font-medium text-slate-800">天朗（付豪）</span>
              <span className="text-[10px] text-slate-400 font-mono scale-90 -translate-x-1.5">Operator</span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-xl py-1.5 z-30 font-sans">
              <div className="px-3 py-2 border-b border-slate-100 text-slate-500 mb-1">
                <span className="block text-[10px] text-slate-400">登录账号</span>
                <span className="block font-medium text-slate-700">xingyuzhang65@gmail.com</span>
              </div>
              <button 
                onClick={() => addToast('操作人：天朗（付豪） | 用户权限：高级管理员配置', 'info')}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>权限等级</span>
              </button>
              <button 
                onClick={() => addToast('数据安全加固已启用：全站数据均含付豪操作水印。', 'warning')}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>水印设置</span>
              </button>
              <div className="h-px bg-slate-100 my-1.5" />
              <button 
                onClick={() => alert('已安全退出登录。')}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>安全退出</span>
              </button>
            </div>
          )}
        </div>

        {/* Language option switch */}
        <div className="flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer" title="切换语言">
          <Globe className="h-4 w-4 text-slate-500" />
          <span className="font-sans text-[11px] font-medium">ZH</span>
        </div>
      </div>
    </div>
  );
}
