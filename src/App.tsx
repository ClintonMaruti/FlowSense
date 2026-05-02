import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Home, 
  History,
  Play,
  Pause,
  RefreshCw,
  Info,
  X,
  Gauge
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfDay, addDays, subHours, startOfHour, eachHourOfInterval, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { createHousehold, UNIT_PRICE_KSH, LITERS_PER_UNIT } from './constants';
import { WaterAppliance, UsageRecord, ApplianceType, DiscreteAppliance, ContinuousAppliance } from './models';

// -- Components --

const StatCard = ({ title, value, unit, icon: Icon, color, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">
        {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </h3>
    </div>
  </motion.div>
);

export default function App() {
  const [appliances] = useState<WaterAppliance[]>(createHousehold());
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 5x, 10x
  const [activeLeaks, setActiveLeaks] = useState<string[]>([]);
  const [liveFlow, setLiveFlow] = useState<{time: string, flow: number}[]>([]);
  const [simulatedDate, setSimulatedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'home' | 'flow' | 'history'>('home');

  // Sync appliance leak states
  useEffect(() => {
    appliances.forEach(app => {
      app.setLeak(activeLeaks.includes(app.id));
    });
  }, [activeLeaks, appliances]);

  const resetData = () => {
    setUsageHistory([]);
    setLiveFlow([]);
    setSimulatedDate(new Date());
  };

  // Simulation Logic
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      interval = setInterval(() => {
        setSimulatedDate(prev => {
          // Advance simulated time by 1 hour every tick for demo purposes
          const nextDate = addDays(prev, 0);
          nextDate.setHours(prev.getHours() + 1);
          
          const newRecords: UsageRecord[] = [];
          let currentTickFlow = 0;

          appliances.forEach(app => {
            // Randomly trigger a leak during simulation
            if (!activeLeaks.includes(app.id) && Math.random() < 0.005) {
              setActiveLeaks(prev => [...prev, app.id]);
            }

            let used = false;
            let amount = 0;

            const hour = nextDate.getHours();
            const isPeak = (hour >= 6 && hour <= 9) || (hour >= 18 && hour <= 21);
            const baseProb = isPeak ? 0.15 : 0.05;

            if (app instanceof DiscreteAppliance) {
              if (Math.random() < baseProb * 0.2) {
                used = true;
                amount = app.use();
              }
            } else if (app instanceof ContinuousAppliance) {
              if (Math.random() < baseProb) {
                used = true;
                const duration = Math.random() * 0.5 + 0.1;
                amount = app.use(duration);
              }
            }

            if (used) {
              newRecords.push({
                timestamp: nextDate,
                applianceId: app.id,
                applianceName: app.name,
                amount,
                isLeak: false
              });
              currentTickFlow += amount;
            }

            if (activeLeaks.includes(app.id)) {
              const leakAmount = app.getLeakUsage(1); // 1 hour tick
              newRecords.push({
                timestamp: nextDate,
                applianceId: app.id,
                applianceName: app.name,
                amount: leakAmount,
                isLeak: true
              });
              currentTickFlow += leakAmount;
            }
          });

          if (newRecords.length > 0) {
            setUsageHistory(prevHist => [...prevHist, ...newRecords].slice(-5000)); 
          }

          setLiveFlow(prevFlow => {
            const newData = [...prevFlow, { time: format(nextDate, 'HH:mm'), flow: Math.round(currentTickFlow * 100) / 100 }];
            return newData.slice(-30);
          });

          return nextDate;
        });
      }, 1000 / simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, activeLeaks, appliances]);

  // Data Analysis
  const totalUsage = useMemo(() => {
    return usageHistory.reduce((acc, rec) => acc + rec.amount, 0);
  }, [usageHistory]);

  const leakUsage = useMemo(() => {
    return usageHistory.filter(r => r.isLeak).reduce((acc, r) => acc + r.amount, 0);
  }, [usageHistory]);

  const projectedWeeklyBill = useMemo(() => {
    const units = (totalUsage / LITERS_PER_UNIT) * 7; 
    return units * UNIT_PRICE_KSH;
  }, [totalUsage]);

  const projectedMonthlyBill = useMemo(() => {
    const units = (totalUsage / LITERS_PER_UNIT) * 30; 
    return units * UNIT_PRICE_KSH;
  }, [totalUsage]);

  const applianceLeakStats = useMemo(() => {
    const stats: Record<string, { rate: number, total: number }> = {};
    activeLeaks.forEach(id => {
      const applianceUsage = usageHistory.filter(r => r.applianceId === id && r.isLeak);
      const totalLost = applianceUsage.reduce((acc, r) => acc + r.amount, 0);
      const lastRecord = applianceUsage[applianceUsage.length - 1];
      const rate = lastRecord ? lastRecord.amount : 0;
      stats[id] = { rate, total: totalLost };
    });
    return stats;
  }, [usageHistory, activeLeaks]);

  const getChartData = (view: 'hourly' | 'daily' | 'weekly' | 'monthly') => {
    const data = [];
    if (view === 'hourly') {
      for (let i = 23; i >= 0; i--) {
        const time = subHours(simulatedDate, i);
        const hourStr = format(time, 'HH:mm');
        const hourUsage = usageHistory
          .filter(r => format(r.timestamp, 'yyyy-MM-dd HH') === format(time, 'yyyy-MM-dd HH'))
          .reduce((acc, r) => acc + r.amount, 0);
        data.push({ label: hourStr, usage: Math.round(hourUsage * 10) / 10 });
      }
    } else if (view === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const time = subDays(simulatedDate, i);
        const dayStr = format(time, 'EEE');
        const dayUsage = usageHistory
          .filter(r => format(r.timestamp, 'yyyy-MM-dd') === format(time, 'yyyy-MM-dd'))
          .reduce((acc, r) => acc + r.amount, 0);
        data.push({ label: dayStr, usage: Math.round(dayUsage * 10) / 10 });
      }
    } else if (view === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const time = subDays(simulatedDate, i * 7);
        const weekStr = `Week ${format(time, 'w')}`;
        const weekUsage = usageHistory
          .filter(r => format(r.timestamp, 'yyyy-w') === format(time, 'yyyy-w'))
          .reduce((acc, r) => acc + r.amount, 0);
        data.push({ label: weekStr, usage: Math.round(weekUsage * 10) / 10 });
      }
    } else if (view === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const time = subDays(simulatedDate, i * 30);
        const monthStr = format(time, 'MMM');
        const monthUsage = usageHistory
          .filter(r => format(r.timestamp, 'yyyy-MM') === format(time, 'yyyy-MM'))
          .reduce((acc, r) => acc + r.amount, 0);
        data.push({ label: monthStr, usage: Math.round(monthUsage * 10) / 10 });
      }
    }
    return data;
  };

  const hourlyData = useMemo(() => getChartData('hourly'), [usageHistory, simulatedDate]);
  const dailyData = useMemo(() => getChartData('daily'), [usageHistory, simulatedDate]);
  const weeklyData = useMemo(() => getChartData('weekly'), [usageHistory, simulatedDate]);
  const monthlyData = useMemo(() => getChartData('monthly'), [usageHistory, simulatedDate]);

  const toggleLeak = (id: string) => {
    setActiveLeaks(prev => {
      const isActivating = !prev.includes(id);
      return isActivating ? [...prev, id] : prev.filter(l => l !== id);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar / Nav */}
      <nav className="fixed left-0 top-0 h-full w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 space-y-8 z-50 hidden md:flex">
        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
          <Droplets size={28} />
        </div>
        <div className="flex flex-col space-y-6 text-slate-400">
          <Home 
            size={24} 
            onClick={() => setCurrentView('home')}
            className={`cursor-pointer transition-colors ${currentView === 'home' ? 'text-blue-600' : 'hover:text-blue-600'}`} 
          />
          <Activity 
            size={24} 
            onClick={() => setCurrentView('flow')}
            className={`cursor-pointer transition-colors ${currentView === 'flow' ? 'text-blue-600' : 'hover:text-blue-600'}`} 
          />
          <History 
            size={24} 
            onClick={() => setCurrentView('history')}
            className={`cursor-pointer transition-colors ${currentView === 'history' ? 'text-blue-600' : 'hover:text-blue-600'}`} 
          />
        </div>
      </nav>

      {/* Global State Layer */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
      </div>

      {/* Main Content */}
      <main className="md:ml-20 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">FlowSense</h1>
            <p className="text-slate-400 text-sm font-normal">Waste less, Save more</p>
            <div className="mt-2 space-y-0.5">
              <p className="text-slate-500 text-sm">
                Date: <span className="font-mono font-bold text-blue-600">{format(simulatedDate, 'PPP')}</span>
              </p>
              <p className="text-slate-500 text-sm">
                Time: <span className="font-mono font-bold text-blue-600">{format(simulatedDate, 'HH:mm')}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={resetData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <RefreshCw size={18} className={isSimulating ? "animate-spin" : ""} />
              Reset Data
            </button>
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                isSimulating 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
              }`}
            >
              {isSimulating ? <Pause size={18} /> : <Play size={18} />}
              {isSimulating ? 'Pause Simulation' : 'Start Simulation'}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-1" />
            <select 
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer px-2"
            >
              <option value={1}>1x Speed</option>
              <option value={5}>5x Speed</option>
              <option value={10}>10x Speed</option>
            </select>
          </div>
        </header>

        {/* Stats Grid */}
        {(currentView === 'home') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
              title="Total Consumption" 
              value={totalUsage.toFixed(1)} 
              unit="Liters" 
              icon={Droplets} 
              color="bg-blue-500"
            />
            <StatCard 
              title="Active Leaks" 
              value={activeLeaks.length} 
              unit="Sensors" 
              icon={AlertTriangle} 
              color={activeLeaks.length > 0 ? "bg-red-500" : "bg-green-500"}
            />
            <StatCard 
              title="Projected Monthly Bill" 
              value={projectedMonthlyBill.toLocaleString()} 
              unit="Ksh / month" 
              icon={DollarSign} 
              color="bg-emerald-600"
            />
            <StatCard 
              title="Weekly Estimate" 
              value={projectedWeeklyBill.toLocaleString()} 
              unit="Ksh" 
              icon={TrendingUp} 
              color="bg-indigo-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            {(currentView === 'home' || currentView === 'flow') && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-blue-600" />
                    Live Flow Rate (L/s)
                  </h2>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /> Real-time
                    </span>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={liveFlow}>
                      <defs>
                        <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 10}}
                        interval={5}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="flow" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorFlow)" 
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {currentView === 'home' && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <History size={20} className="text-slate-400" />
                    Recent Usage (Hourly)
                  </h2>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12}}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="usage" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {currentView === 'history' && (
              <div className="space-y-8">
                {/* Hourly Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Hourly Usage History</h2>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                        <Line type="monotone" dataKey="usage" stroke="#6366f1" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Daily Usage History</h2>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                        <Bar dataKey="usage" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Monthly Usage History</h2>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                        <Bar dataKey="usage" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {(currentView === 'home' || currentView === 'flow') && (
              <>
                {/* Monthly Bill Section */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-lg text-white">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <DollarSign size={24} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                      Billing
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-emerald-100">Projected Monthly Bill</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold">Ksh {projectedMonthlyBill.toLocaleString()}</span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-100">Usage Units</span>
                      <span className="font-bold">{(totalUsage / LITERS_PER_UNIT * 30).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-100">Price per Unit</span>
                      <span className="font-bold">Ksh {UNIT_PRICE_KSH}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-100">Leak Cost Est.</span>
                      <span className="text-red-200 font-bold">Ksh {(leakUsage / LITERS_PER_UNIT * 30).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Appliance Control */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Gauge size={20} className="text-slate-400" />
                    Appliance Sensors
                  </h2>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {appliances.map((app) => (
                      <div 
                        key={app.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          activeLeaks.includes(app.id) 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-800">{app.name}</p>
                            </div>
                            <p className="text-xs text-slate-500">{app.location}</p>
                          </div>
                          <button 
                            onClick={() => toggleLeak(app.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              activeLeaks.includes(app.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-200 text-slate-400 hover:bg-red-100 hover:text-red-500'
                            }`}
                            title={activeLeaks.includes(app.id) ? "Fix Leak" : "Simulate Leak"}
                          >
                            <AlertTriangle size={18} />
                          </button>
                        </div>
                        {activeLeaks.includes(app.id) && applianceLeakStats[app.id] && (
                          <div className="mt-4 pt-4 border-t border-red-100 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold">Leak Rate</p>
                              <p className="text-sm font-bold text-red-600">
                                {applianceLeakStats[app.id].rate.toFixed(1)} <span className="text-[10px] font-normal">L/h</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold">Volume Lost</p>
                              <p className="text-sm font-bold text-red-600">
                                {applianceLeakStats[app.id].total.toFixed(1)} <span className="text-[10px] font-normal">Liters</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Live Sensor Feed</h2>
          <div className="overflow-x-auto overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-sm border-b border-slate-100">
                  <th className="pb-4 font-medium">Timestamp</th>
                  <th className="pb-4 font-medium">Appliance</th>
                  <th className="pb-4 font-medium">Amount</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.slice(-5).reverse().map((record, idx) => (
                  <tr 
                    key={`${record.timestamp.getTime()}-${idx}`}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-4 text-sm text-slate-500">{format(record.timestamp, 'HH:mm:ss')}</td>
                    <td className="py-4 font-medium text-slate-800">{record.applianceName}</td>
                    <td className="py-4 text-sm font-bold text-blue-600">{record.amount.toFixed(1)} L</td>
                    <td className="py-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
                        record.isLeak ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {record.isLeak ? 'Leak' : 'Usage'}
                      </span>
                    </td>
                  </tr>
                ))}
                <AnimatePresence mode="popLayout">
                  {usageHistory.slice(-5).reverse().map((record, idx) => (
                    <motion.tr 
                      key={`${record.timestamp.getTime()}-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-4 text-sm text-slate-500">{format(record.timestamp, 'HH:mm:ss')}</td>
                      <td className="py-4 font-medium text-slate-800">{record.applianceName}</td>
                      <td className="py-4 text-sm font-bold text-blue-600">{record.amount.toFixed(1)} L</td>
                      <td className="py-4">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${
                          record.isLeak ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {record.isLeak ? 'Leak' : 'Usage'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {usageHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                      No activity recorded. Start simulation to see data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-12 mb-8 flex flex-col md:flex-row justify-between items-center text-slate-400 text-sm gap-4">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span>1 Unit = 1,000 Liters = 200 Ksh</span>
          </div>
          <p>© 2026 FlowSense Smart Systems. All rights reserved.</p>
        </footer>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
