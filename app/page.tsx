import { useState, useEffect, useCallback, useMemo } from 'react';

// Demo Data
const DEMO_INCOME = [
  { id: '1', date: '2025-01-15', description: 'Campus Job', amount: 850 },
  { id: '2', date: '2025-01-01', description: 'Freelance', amount: 500 },
  { id: '3', date: '2024-12-15', description: 'Campus Job', amount: 850 },
  { id: '4', date: '2024-12-01', description: 'Family Gift', amount: 300 },
  { id: '5', date: '2024-11-15', description: 'Campus Job', amount: 850 },
];

const DEMO_EXPENSES = [
  { id: '1', date: '2025-01-18', category: 'Food', description: 'Chipotle', amount: 14 },
  { id: '2', date: '2025-01-17', category: 'Transport', description: 'Uber', amount: 22 },
  { id: '3', date: '2025-01-15', category: 'Groceries', description: 'Trader Joes', amount: 87 },
  { id: '4', date: '2025-01-14', category: 'Food', description: 'Starbucks', amount: 7 },
  { id: '5', date: '2025-01-12', category: 'Entertainment', description: 'Netflix', amount: 15 },
  { id: '6', date: '2025-01-10', category: 'Rent', description: 'January Rent', amount: 1200 },
  { id: '7', date: '2025-01-08', category: 'Utilities', description: 'Electric', amount: 65 },
  { id: '8', date: '2025-01-05', category: 'Transport', description: 'T Pass', amount: 90 },
  { id: '9', date: '2025-01-03', category: 'Food', description: 'Dominos', amount: 18 },
  { id: '10', date: '2024-12-28', category: 'Shopping', description: 'Amazon', amount: 45 },
  { id: '11', date: '2024-12-20', category: 'Food', description: 'McDonalds', amount: 12 },
  { id: '12', date: '2024-12-15', category: 'Rent', description: 'Dec Rent', amount: 1200 },
  { id: '13', date: '2024-12-10', category: 'Groceries', description: 'Whole Foods', amount: 95 },
  { id: '14', date: '2024-12-05', category: 'Healthcare', description: 'Pharmacy', amount: 25 },
  { id: '15', date: '2024-11-15', category: 'Rent', description: 'Nov Rent', amount: 1200 },
];

const DEMO_SIPS = [
  { id: '1', date: '2025-01-05', name: 'Nifty 50 Index', amount: 5000 },
  { id: '2', date: '2024-12-05', name: 'Nifty 50 Index', amount: 5000 },
];

const BATMAN_QUOTES = [
  { quote: "It's not who I am underneath, but what I do that defines me.", source: "Batman Begins" },
  { quote: "Why do we fall? So we can learn to pick ourselves up.", source: "Batman Begins" },
  { quote: "The night is darkest just before the dawn.", source: "The Dark Knight" },
  { quote: "A hero can be anyone, even saving money for a rainy day.", source: "TDKR" },
  { quote: "You either die broke, or live long enough to become financially stable.", source: "TDK" },
];

const BUDGET_LIMITS: Record<string, number> = {
  Rent: 1300, Groceries: 200, Utilities: 100, Transport: 150, Food: 200,
  Healthcare: 100, Entertainment: 100, Shopping: 150, Tuition: 5000, Books: 100, Other: 100
};

const QUICK_ADDS = [
  { label: '☕ Coffee', amount: 5, category: 'Food' },
  { label: '🍔 Lunch', amount: 15, category: 'Food' },
  { label: '🚗 Uber', amount: 20, category: 'Transport' },
  { label: '🛒 Groceries', amount: 50, category: 'Groceries' },
  { label: '🎬 Movie', amount: 18, category: 'Entertainment' },
];

const ACHIEVEMENTS = [
  { id: 'first_100', name: 'First $100 Saved', icon: '🥉', condition: (b: number) => b >= 100 },
  { id: 'first_500', name: '$500 Club', icon: '🥈', condition: (b: number) => b >= 500 },
  { id: 'first_1000', name: 'Millionaire Mindset', icon: '🥇', condition: (b: number) => b >= 1000 },
  { id: 'saver_20', name: '20% Saver', icon: '🦇', condition: (_: number, r: number) => r >= 20 },
  { id: 'saver_50', name: 'Half & Half', icon: '🏆', condition: (_: number, r: number) => r >= 50 },
];

const categoryColors: Record<string, string> = {
  Rent: '#dc2626', Groceries: '#ea580c', Utilities: '#ca8a04', Transport: '#65a30d',
  Food: '#16a34a', Healthcare: '#0d9488', Tuition: '#0891b2', Books: '#2563eb',
  Entertainment: '#7c3aed', Splitwise: '#c026d3', Shopping: '#db2777', Other: '#64748b'
};

export default function FinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomeEntries, setIncomeEntries] = useState(DEMO_INCOME);
  const [expenseEntries, setExpenseEntries] = useState(DEMO_EXPENSES);
  const [sips, setSips] = useState(DEMO_SIPS);
  const [newIncome, setNewIncome] = useState({ date: '', description: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ date: '', category: '', description: '', amount: '' });
  const [newSip, setNewSip] = useState({ date: '', name: '', amount: '' });
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const [exchangeRate] = useState(83.5);
  const [showBats, setShowBats] = useState(false);
  const [dailyQuote] = useState(BATMAN_QUOTES[Math.floor(Math.random() * BATMAN_QUOTES.length)]);
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);

  const categories = Object.keys(BUDGET_LIMITS);

  const triggerBats = useCallback(() => {
    setShowBats(true);
    setTimeout(() => setShowBats(false), 2500);
  }, []);

  // Filtering
  const filterByMonth = (entries: any[], month: string) =>
    month === 'all' ? entries : entries.filter(e => e.date?.startsWith(month));

  const searchFilter = (entries: any[]) =>
    searchQuery ? entries.filter(e =>
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : entries;

  const filteredIncome = searchFilter(filterByMonth(incomeEntries, selectedMonth));
  const filteredExpenses = searchFilter(filterByMonth(expenseEntries, selectedMonth));
  const filteredSips = searchFilter(filterByMonth(sips, selectedMonth));

  const totalIncome = filteredIncome.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalSIP = filteredSips.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((balance) / totalIncome) * 100 : 0;

  const categoryTotals = useMemo(() =>
    filteredExpenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {}), [filteredExpenses]);

  // Smart Insights
  const insights = useMemo(() => {
    const ins: string[] = [];
    const thisMonth = filterByMonth(expenseEntries, selectedMonth);
    const prevMonth = selectedMonth !== 'all' ? filterByMonth(expenseEntries,
      new Date(new Date(selectedMonth + '-01').setMonth(new Date(selectedMonth + '-01').getMonth() - 1)).toISOString().slice(0, 7)
    ) : [];

    const thisTotal = thisMonth.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevMonth.reduce((s, e) => s + e.amount, 0);

    if (prevTotal > 0) {
      const change = ((thisTotal - prevTotal) / prevTotal) * 100;
      if (change > 10) ins.push(`📈 Spending UP ${change.toFixed(0)}% vs last month`);
      else if (change < -10) ins.push(`📉 Spending DOWN ${Math.abs(change).toFixed(0)}% - Great job!`);
    }

    const topCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCat) ins.push(`💰 Top expense: ${topCat[0]} ($${topCat[1].toFixed(0)})`);

    if (savingsRate >= 30) ins.push(`🦇 Elite saver! ${savingsRate.toFixed(0)}% savings rate`);
    else if (savingsRate >= 20) ins.push(`✨ Solid ${savingsRate.toFixed(0)}% savings rate`);
    else if (savingsRate < 0) ins.push(`⚠️ Negative cash flow - spending > income`);

    const overBudget = Object.entries(categoryTotals).filter(([cat, amt]) => amt > (BUDGET_LIMITS[cat] || Infinity));
    if (overBudget.length > 0) ins.push(`🚨 Over budget: ${overBudget.map(([c]) => c).join(', ')}`);

    const avgDaily = thisTotal / (new Date().getDate() || 1);
    ins.push(`📊 Avg daily: $${avgDaily.toFixed(0)}`);

    return ins;
  }, [expenseEntries, selectedMonth, categoryTotals, savingsRate]);

  // Calendar Heatmap Data
  const calendarData = useMemo(() => {
    const data: Record<string, number> = {};
    expenseEntries.forEach(e => {
      if (e.date?.startsWith(selectedMonth === 'all' ? '2025' : selectedMonth)) {
        data[e.date] = (data[e.date] || 0) + e.amount;
      }
    });
    return data;
  }, [expenseEntries, selectedMonth]);

  // Achievements
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.condition(balance, savingsRate));

  // Actions
  const addIncome = () => {
    if (newIncome.date && newIncome.amount) {
      setIncomeEntries([...incomeEntries, { id: Date.now().toString(), ...newIncome, amount: parseFloat(newIncome.amount) }]);
      setNewIncome({ date: '', description: '', amount: '' });
      triggerBats();
    }
  };

  const addExpense = (date?: string, category?: string, amount?: number, description?: string) => {
    const d = date || newExpense.date;
    const c = category || newExpense.category;
    const a = amount || parseFloat(newExpense.amount);
    const desc = description || newExpense.description;
    if (d && c && a) {
      setExpenseEntries([...expenseEntries, { id: Date.now().toString(), date: d, category: c, amount: a, description: desc }]);
      setNewExpense({ date: '', category: '', description: '', amount: '' });
    }
  };

  const quickAdd = (item: typeof QUICK_ADDS[0]) => {
    const today = new Date().toISOString().slice(0, 10);
    addExpense(today, item.category, item.amount, item.label.split(' ')[1]);
  };

  const addSip = () => {
    if (newSip.date && newSip.amount) {
      setSips([...sips, { id: Date.now().toString(), ...newSip, amount: parseFloat(newSip.amount) }]);
      setNewSip({ date: '', name: '', amount: '' });
    }
  };

  const deleteItem = (type: string, id: string) => {
    if (type === 'income') setIncomeEntries(incomeEntries.filter(e => e.id !== id));
    else if (type === 'expenses') setExpenseEntries(expenseEntries.filter(e => e.id !== id));
    else if (type === 'sips') setSips(sips.filter(e => e.id !== id));
  };

  const formatUSD = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (n: number) => '₹' + Math.round(n * exchangeRate).toLocaleString();

  const theme = {
    bg: darkMode ? 'linear-gradient(180deg, #0a0000 0%, #1a0505 50%, #000 100%)' : 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
    card: darkMode ? 'bg-black/60 border-red-900/30' : 'bg-white/90 border-gray-300',
    cardInner: darkMode ? 'bg-black/40' : 'bg-gray-100',
    input: darkMode ? 'bg-black border-red-900/50 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-black',
    text: darkMode ? 'text-gray-100' : 'text-gray-800',
    muted: darkMode ? 'text-gray-400' : 'text-gray-600',
    muted2: darkMode ? 'text-gray-500' : 'text-gray-500',
  };

  // Calendar Heatmap Component
  const CalendarHeatmap = () => {
    const year = selectedMonth === 'all' ? 2025 : parseInt(selectedMonth.split('-')[0]);
    const month = selectedMonth === 'all' ? 0 : parseInt(selectedMonth.split('-')[1]) - 1;
    const daysInMonth = selectedMonth === 'all' ? 31 : new Date(year, month + 1, 0).getDate();
    const maxSpend = Math.max(...Object.values(calendarData), 1);

    const getIntensity = (amount: number) => {
      if (!amount) return darkMode ? 'bg-gray-800' : 'bg-gray-200';
      const pct = amount / maxSpend;
      if (pct > 0.8) return 'bg-red-600';
      if (pct > 0.5) return 'bg-red-500';
      if (pct > 0.3) return 'bg-orange-500';
      if (pct > 0.1) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = selectedMonth === 'all' ? `2025-01-${day}` : `${selectedMonth}-${day}`;
      return { day: i + 1, date: dateStr, amount: calendarData[dateStr] || 0 };
    });

    return (
      <div className={`${theme.card} border rounded-xl p-4`}>
        <p className="text-red-500 font-bold mb-3">📅 SPENDING HEATMAP</p>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className={`text-center text-xs ${theme.muted} font-bold`}>{d}</div>
          ))}
          {/* Empty cells for first day offset */}
          {Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(d => (
            <div
              key={d.day}
              className={`aspect-square rounded-md ${getIntensity(d.amount)} flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110`}
              title={`${d.date}: $${d.amount.toFixed(0)}`}
            >
              <span className={d.amount > 0 ? 'text-white' : theme.muted2}>{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-3 text-xs">
          <span className={theme.muted}>Less</span>
          <div className={`w-4 h-4 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <div className="w-4 h-4 rounded bg-orange-500"></div>
          <div className="w-4 h-4 rounded bg-red-600"></div>
          <span className={theme.muted}>More</span>
        </div>
      </div>
    );
  };

  // Budget Progress Component
  const BudgetProgress = () => (
    <div className={`${theme.card} border rounded-xl p-4`}>
      <p className="text-red-500 font-bold mb-3">🎯 BUDGET STATUS</p>
      <div className="space-y-3">
        {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, spent]) => {
          const limit = BUDGET_LIMITS[cat] || 100;
          const pct = Math.min((spent / limit) * 100, 100);
          const over = spent > limit;
          return (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1">
                <span className={theme.text}>{cat}</span>
                <span className={over ? 'text-red-500 font-bold animate-pulse' : theme.muted}>
                  ${spent.toFixed(0)} / ${limit}
                </span>
              </div>
              <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500 animate-pulse' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Savings Gauge Component
  const SavingsGauge = () => {
    const rate = Math.max(0, Math.min(savingsRate, 100));
    const color = rate >= 30 ? '#22c55e' : rate >= 15 ? '#eab308' : '#ef4444';
    return (
      <div className={`${theme.card} border rounded-xl p-4 text-center`}>
        <p className="text-red-500 font-bold mb-2">💪 SAVINGS RATE</p>
        <svg viewBox="0 0 100 60" className="w-32 h-20 mx-auto">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={darkMode ? '#333' : '#ddd'} strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${rate * 1.26} 126`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <text x="50" y="45" textAnchor="middle" className="text-2xl font-black" fill={color}>
            {rate.toFixed(0)}%
          </text>
        </svg>
        <p className={`${theme.muted} text-xs`}>
          {rate >= 30 ? '🦇 Elite Saver!' : rate >= 15 ? 'Good progress!' : 'Room to improve'}
        </p>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.text} relative`} style={{ background: theme.bg }}>
      {/* Animated Rain */}
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-gray-500/20 to-transparent"
              style={{
                left: `${Math.random() * 100}%`,
                height: `${15 + Math.random() * 25}px`,
                animation: `rain ${0.5 + Math.random() * 0.5}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes rain { 0% { transform: translateY(-100vh); } 100% { transform: translateY(100vh); } }
        @keyframes flyBat { 0% { transform: translateX(-50px) translateY(0); opacity: 1; } 100% { transform: translateX(100vw) translateY(-30px); opacity: 0; } }
      `}</style>

      {/* Flying Bats */}
      {showBats && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute text-3xl" style={{ left: '-50px', top: `${20 + Math.random() * 40}%`, animation: `flyBat ${0.7 + Math.random() * 0.4}s ease-out forwards`, animationDelay: `${i * 0.08}s` }}>🦇</div>
          ))}
        </div>
      )}

      {/* Red Glow */}
      {darkMode && (
        <>
          <div className="fixed top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="fixed bottom-0 left-0 w-48 h-48 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowAchievements(false)}>
          <div className={`${theme.card} border rounded-2xl p-6 max-w-sm w-full`} onClick={e => e.stopPropagation()}>
            <h3 className="text-yellow-500 font-bold text-xl mb-4 text-center">🏆 ACHIEVEMENTS</h3>
            <div className="space-y-3">
              {ACHIEVEMENTS.map(a => {
                const unlocked = a.condition(balance, savingsRate);
                return (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg ${unlocked ? 'bg-yellow-500/20' : theme.cardInner}`}>
                    <span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{a.icon}</span>
                    <span className={unlocked ? 'text-yellow-400 font-bold' : theme.muted}>{a.name}</span>
                    {unlocked && <span className="ml-auto text-green-500">✓</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowAchievements(false)} className="w-full mt-4 bg-red-600 text-white py-2 rounded-lg font-bold">Close</button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto relative z-10 p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className={`${darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600'} px-3 py-1 rounded-full text-sm font-medium`}>💱 ₹{exchangeRate}</span>
            <button onClick={() => setDarkMode(!darkMode)} className={`px-3 py-1 rounded-full text-sm font-medium ${darkMode ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <button onClick={() => setShowAchievements(true)} className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
            🏆 {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <svg viewBox="0 0 100 40" className="w-16 h-8 mx-auto mb-1" style={{ filter: darkMode ? 'drop-shadow(0 0 15px rgba(220,38,38,0.7))' : 'none' }}>
            <path d="M50 5 L30 20 L0 15 L15 25 L10 35 L30 28 L50 40 L70 28 L90 35 L85 25 L100 15 L70 20 Z" fill="#dc2626" />
          </svg>
          <h1 className="text-2xl md:text-4xl font-black tracking-wider" style={{ color: '#dc2626', textShadow: darkMode ? '0 0 20px rgba(220,38,38,0.5)' : 'none' }}>THE DARK WALLET</h1>
          <p className={`${theme.muted} italic text-xs mt-1`}>"{dailyQuote.quote}" — <span className="text-red-500">{dailyQuote.source}</span></p>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${theme.input} border rounded-lg px-3 py-2 text-sm`}>
            <option value="all">🦇 All Time</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2025, i, 1);
              return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>;
            })}
          </select>
          <div className="relative flex-1 min-w-[150px] max-w-[250px]">
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`${theme.input} border rounded-lg px-3 py-2 text-sm w-full`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">✕</button>
            )}
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {QUICK_ADDS.map(item => (
            <button
              key={item.label}
              onClick={() => quickAdd(item)}
              className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105`}
            >
              {item.label} ${item.amount}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {[
            { id: 'dashboard', icon: '🦇', name: 'Dashboard' },
            { id: 'calendar', icon: '📅', name: 'Calendar' },
            { id: 'income', icon: '💰', name: 'Income' },
            { id: 'expenses', icon: '💸', name: 'Expenses' },
            { id: 'sip', icon: '📈', name: 'SIP' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : darkMode ? 'bg-black/50 border border-red-900/30 text-red-400' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'INCOME', v: formatUSD(totalIncome), s: formatINR(totalIncome), c: 'text-green-500' },
                { l: 'EXPENSES', v: formatUSD(totalExpenses), s: formatINR(totalExpenses), c: 'text-red-500' },
                { l: 'BALANCE', v: formatUSD(balance), s: formatINR(balance), c: balance >= 0 ? 'text-green-500' : 'text-red-500' },
                { l: 'SIP', v: formatINR(totalSIP), s: '', c: 'text-blue-500' },
              ].map((card, i) => (
                <div key={i} className={`${theme.card} border rounded-xl p-3`}>
                  <p className={`${card.c} text-xs font-bold uppercase`}>{card.l}</p>
                  <p className={`text-xl font-black ${card.c}`}>{card.v}</p>
                  {card.s && <p className={`${theme.muted2} text-xs`}>{card.s}</p>}
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className={`${theme.card} border rounded-xl p-4`}>
              <p className="text-yellow-500 font-bold mb-2">🧠 SMART INSIGHTS</p>
              <div className="space-y-1">
                {insights.map((ins, i) => (
                  <p key={i} className={`${theme.muted} text-sm`}>{ins}</p>
                ))}
              </div>
            </div>

            {/* Budget + Savings */}
            <div className="grid md:grid-cols-2 gap-4">
              <BudgetProgress />
              <SavingsGauge />
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && <CalendarHeatmap />}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className={`${theme.card} border rounded-xl p-4`}>
            <p className="text-green-500 font-bold mb-3">💰 INCOME</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2 text-sm`} />
              <input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-3 py-2 text-sm flex-1 min-w-[100px]`} />
              <input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="$ Amount" className={`${theme.input} border rounded-lg px-3 py-2 text-sm w-24`} />
              <button onClick={addIncome} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Add</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredIncome.map(e => (
                <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg`}>
                  <div>
                    <p className={`${theme.text} font-bold text-sm`}>{e.date}</p>
                    <p className={`${theme.muted2} text-xs`}>{e.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">{formatUSD(e.amount)}</span>
                    <button onClick={() => deleteItem('income', e.id)} className="text-red-500 text-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className={`${theme.card} border rounded-xl p-4`}>
            <p className="text-red-500 font-bold mb-3">💸 EXPENSES</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2 text-sm`} />
              <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2 text-sm`}>
                <option value="">Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-3 py-2 text-sm flex-1 min-w-[80px]`} />
              <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="$" className={`${theme.input} border rounded-lg px-3 py-2 text-sm w-20`} />
              <button onClick={() => addExpense()} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Add</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredExpenses.map(e => (
                <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg`}>
                  <div>
                    <p className={`${theme.text} font-bold text-sm`}>{e.date}</p>
                    <p className={`${theme.muted2} text-xs`}>{e.description} • <span style={{ color: categoryColors[e.category] }}>{e.category}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">{formatUSD(e.amount)}</span>
                    <button onClick={() => deleteItem('expenses', e.id)} className="text-red-500 text-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIP Tab */}
        {activeTab === 'sip' && (
          <div className={`${theme.card} border rounded-xl p-4`}>
            <p className="text-blue-500 font-bold mb-3">📈 SIP INVESTMENTS</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2 text-sm`} />
              <input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="Fund Name" className={`${theme.input} border rounded-lg px-3 py-2 text-sm flex-1`} />
              <input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="₹ Amount" className={`${theme.input} border rounded-lg px-3 py-2 text-sm w-24`} />
              <button onClick={addSip} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">+ Add</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredSips.map(e => (
                <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg`}>
                  <div>
                    <p className={`${theme.text} font-bold text-sm`}>{e.date}</p>
                    <p className={`${theme.muted2} text-xs`}>{e.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">{formatINR(e.amount)}</span>
                    <button onClick={() => deleteItem('sips', e.id)} className="text-red-500 text-lg">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={`text-center ${theme.muted2} text-xs mt-6 tracking-widest`}>I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE</p>
      </div>
    </div>
  );
}
