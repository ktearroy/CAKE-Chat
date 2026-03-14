import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Calendar,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface PeriodData {
  lastPeriodDate: string | null;
  cycleLength: number; // 平均周期长度（天）
  periodLength: number; // 月经持续天数
  history: Array<{
    startDate: string;
    endDate: string;
    cycleLength?: number;
  }>;
}

interface CyclePhase {
  name: string;
  startDay: number;
  endDay: number;
  color: string;
  icon: React.ReactElement;
  description: string;
  tips: string[];
}

const CYCLE_PHASES: CyclePhase[] = [
  {
    name: '月经期',
    startDay: 1,
    endDay: 5,
    color: 'bg-rose-500',
    icon: <Droplets className="w-4 h-4" />,
    description: '月经来潮期间，子宫内膜脱落',
    tips: [
      '保持充足休息，避免过度劳累',
      '注意个人卫生，使用卫生巾或卫生杯',
      '适量运动，如散步或瑜伽',
      '饮食清淡，避免生冷食物',
      '保持心情舒畅，避免情绪波动'
    ]
  },
  {
    name: '卵泡期',
    startDay: 6,
    endDay: 14,
    color: 'bg-pink-400',
    icon: <Heart className="w-4 h-4" />,
    description: '卵泡发育，雌激素水平上升',
    tips: [
      '适合学习新事物，记忆力较好',
      '可以进行适量运动，如跑步或游泳',
      '饮食均衡，多摄入蛋白质和蔬菜',
      '保持良好作息，保证睡眠质量',
      '适合社交活动，精力充沛'
    ]
  },
  {
    name: '排卵期',
    startDay: 15,
    endDay: 16,
    color: 'bg-purple-500',
    icon: <CheckCircle className="w-4 h-4" />,
    description: '卵子排出，最易受孕时期',
    tips: [
      '基础体温会略微升高',
      '可能出现少量透明分泌物',
      '适合进行重要工作，注意力集中',
      '保持规律作息，避免熬夜',
      '如果计划怀孕，这是最佳时期'
    ]
  },
  {
    name: '黄体期',
    startDay: 17,
    endDay: 28,
    color: 'bg-blue-500',
    icon: <Clock className="w-4 h-4" />,
    description: '孕激素分泌，黄体形成',
    tips: [
      '可能出现经前期综合征',
      '注意饮食，避免盐分过多',
      '适量运动，缓解不适症状',
      '保持心情放松，适当休息',
      '如果出现严重不适，请咨询医生'
    ]
  }
];

export default function PeriodApp() {
  const [data, setData] = useState<PeriodData>({
    lastPeriodDate: null,
    cycleLength: 28,
    periodLength: 5,
    history: []
  });

  const [currentView, setCurrentView] = useState<'overview' | 'calendar' | 'settings'>('overview');
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [newPeriodDate, setNewPeriodDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 从localStorage加载数据
  useEffect(() => {
    const saved = localStorage.getItem('periodData');
    if (saved) {
      setData(JSON.parse(saved));
    }
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('periodData', JSON.stringify(data));
  }, [data]);

  const addPeriodRecord = () => {
    if (!newPeriodDate) return;

    const startDate = new Date(newPeriodDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + data.periodLength - 1);

    const newRecord = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };

    // 计算周期长度
    let cycleLength = data.cycleLength;
    if (data.history.length > 0) {
      const lastPeriod = new Date(data.history[data.history.length - 1].startDate);
      const daysDiff = Math.round((startDate.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
      cycleLength = daysDiff;
    }

    setData(prev => ({
      ...prev,
      lastPeriodDate: newRecord.startDate,
      cycleLength: cycleLength,
      history: [...prev.history, { ...newRecord, cycleLength }]
    }));

    setNewPeriodDate('');
    setShowAddPeriod(false);
  };

  const getCurrentPhase = () => {
    if (!data.lastPeriodDate) return null;

    const lastPeriod = new Date(data.lastPeriodDate);
    const today = new Date();
    const daysSinceLastPeriod = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));

    const currentDay = (daysSinceLastPeriod % data.cycleLength) + 1;

    return CYCLE_PHASES.find(phase =>
      currentDay >= phase.startDay && currentDay <= phase.endDay
    ) || CYCLE_PHASES[0];
  };

  const getNextPeriodDate = () => {
    if (!data.lastPeriodDate) return null;

    const lastPeriod = new Date(data.lastPeriodDate);
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setDate(nextPeriod.getDate() + data.cycleLength);

    return nextPeriod;
  };

  const getDaysUntilNextPeriod = () => {
    const nextPeriod = getNextPeriodDate();
    if (!nextPeriod) return null;

    const today = new Date();
    const days = Math.ceil((nextPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
  };

  const getOvulationDate = () => {
    if (!data.lastPeriodDate) return null;

    const lastPeriod = new Date(data.lastPeriodDate);
    const ovulation = new Date(lastPeriod);
    ovulation.setDate(ovulation.getDate() + 14); // 通常在周期第14天

    return ovulation;
  };

  const renderOverview = () => {
    const currentPhase = getCurrentPhase();
    const daysUntilNext = getDaysUntilNextPeriod();
    const nextPeriod = getNextPeriodDate();
    const ovulationDate = getOvulationDate();

    return (
      <div className="h-full bg-gradient-to-br from-rose-50 to-pink-50 p-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">经期助手</h1>
          <button
            onClick={() => setCurrentView('settings')}
            className="p-2 rounded-full bg-white/80 shadow-sm"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Current Phase Card */}
        {currentPhase && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${currentPhase.color} text-white`}>
                {currentPhase.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{currentPhase.name}</h2>
                <p className="text-gray-600 text-sm">{currentPhase.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800 mb-2">生活建议：</h3>
              {currentPhase.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-700 text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-medium text-gray-600">距离下次月经</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {daysUntilNext !== null ? `${daysUntilNext}天` : '未设置'}
            </div>
            {nextPeriod && (
              <div className="text-xs text-gray-500 mt-1">
                {nextPeriod.toLocaleDateString('zh-CN')}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">排卵日</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {ovulationDate ? ovulationDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未设置'}
            </div>
            <div className="text-xs text-gray-500 mt-1">易孕期</div>
          </motion.div>
        </div>

        {/* Cycle Visualization */}
        {data.lastPeriodDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-lg mb-6"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">本周期进度</h3>
            <div className="space-y-3">
              {CYCLE_PHASES.map((phase, index) => {
                const isCurrent = currentPhase?.name === phase.name;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${phase.color} ${isCurrent ? 'ring-2 ring-gray-400' : ''}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isCurrent ? 'text-gray-800' : 'text-gray-600'}`}>
                          {phase.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {phase.startDay}-{phase.endDay}天
                        </span>
                      </div>
                      {isCurrent && (
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${phase.color}`} style={{ width: '60%' }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowAddPeriod(true)}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            记录月经开始
          </button>

          <button
            onClick={() => setCurrentView('calendar')}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 py-3 rounded-xl font-medium transition-colors border border-gray-200"
          >
            查看日历
          </button>
        </div>

        {/* Add Period Modal */}
        <AnimatePresence>
          {showAddPeriod && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowAddPeriod(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">记录月经开始日期</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择日期
                    </label>
                    <input
                      type="date"
                      value={newPeriodDate}
                      onChange={(e) => setNewPeriodDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAddPeriod(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={addPeriodRecord}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      确认
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const calendarDays = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      calendarDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const getDayType = (date: Date) => {
      if (!data.lastPeriodDate) return null;

      const lastPeriod = new Date(data.lastPeriodDate);
      const daysSinceLastPeriod = Math.floor((date.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
      const cycleDay = (daysSinceLastPeriod % data.cycleLength) + 1;

      if (cycleDay >= 1 && cycleDay <= data.periodLength) return 'period';
      if (cycleDay >= 13 && cycleDay <= 16) return 'fertile';
      if (cycleDay === 15) return 'ovulation';

      return null;
    };

    return (
      <div className="h-full bg-white p-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentView('overview')}
            className="p-2 rounded-full bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
          </h1>
          <div className="w-9" />
        </div>

        {/* Calendar */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}

          {calendarDays.map((date, index) => {
            const dayType = getDayType(date);
            const isToday = date.toDateString() === today.toDateString();
            const isCurrentMonth = date.getMonth() === currentMonth;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={`
                  p-2 text-center text-sm relative
                  ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                  ${isToday ? 'bg-blue-100 rounded-lg' : ''}
                `}
              >
                <span className={`font-medium ${isToday ? 'text-blue-600' : ''}`}>
                  {date.getDate()}
                </span>

                {/* Period indicator */}
                {dayType === 'period' && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full" />
                )}

                {/* Fertile window indicator */}
                {dayType === 'fertile' && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-500 rounded-full" />
                )}

                {/* Ovulation indicator */}
                {dayType === 'ovulation' && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-rose-500 rounded-full" />
            <span>月经期</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span>易孕期</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-pink-500 rounded-full" />
            <span>排卵日</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="h-full bg-gray-50 p-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentView('overview')}
            className="p-2 rounded-full bg-white shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">设置</h1>
          <div className="w-9" />
        </div>

        <div className="space-y-6">
          {/* Cycle Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">周期设置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  平均周期长度（天）
                </label>
                <input
                  type="number"
                  value={data.cycleLength}
                  onChange={(e) => setData(prev => ({ ...prev, cycleLength: parseInt(e.target.value) || 28 }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  min="21"
                  max="35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月经持续天数
                </label>
                <input
                  type="number"
                  value={data.periodLength}
                  onChange={(e) => setData(prev => ({ ...prev, periodLength: parseInt(e.target.value) || 5 }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  min="3"
                  max="7"
                />
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">历史记录</h3>

            {data.history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无记录</p>
            ) : (
              <div className="space-y-3">
                {data.history.slice(-5).reverse().map((record, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">
                        {new Date(record.startDate).toLocaleDateString('zh-CN')} - {new Date(record.endDate).toLocaleDateString('zh-CN')}
                      </div>
                      {record.cycleLength && (
                        <div className="text-sm text-gray-500">周期: {record.cycleLength}天</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Data */}
          <button
            onClick={() => {
              setData({
                lastPeriodDate: null,
                cycleLength: 28,
                periodLength: 5,
                history: []
              });
              localStorage.removeItem('periodData');
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition-colors"
          >
            重置所有数据
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <AnimatePresence mode="wait">
        {currentView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {renderOverview()}
          </motion.div>
        )}

        {currentView === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderCalendar()}
          </motion.div>
        )}

        {currentView === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSettings()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}