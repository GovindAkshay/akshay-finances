"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBC-zG5N_stJZ6fG8EsE9sj3J-mxDfBHgY",
  authDomain: "akshay-finances.firebaseapp.com",
  projectId: "akshay-finances",
  storageBucket: "akshay-finances.firebasestorage.app",
  messagingSenderId: "794161996701",
  appId: "1:794161996701:web:6f53c1632a3c9d9c9f4574"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Authorized editors
const EDITORS = ['akshaygovind@gmail.com', 'toshnilgovind@gmail.com'];

export default function FinanceTracker() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [emiPayments, setEmiPayments] = useState<any[]>([]);
  const [sips, setSips] = useState<any[]>([]);
  const [newIncome, setNewIncome] = useState({ date: '', description: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ date: '', category: '', description: '', amount: '' });
  const [newLoan, setNewLoan] = useState({ name: '', totalAmount: '', disbursedAmount: '', usedAmount: '' });
  const [newEmi, setNewEmi] = useState({ date: '', loanName: '', amount: '' });
  const [newSip, setNewSip] = useState({ date: '', name: '', amount: '' });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [rateLoading, setRateLoading] = useState(true);

  const canEdit = user && EDITORS.includes(user.email);

  // Fetch live exchange rate
  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => { setExchangeRate(data.rates.INR || 83); setRateLoading(false); })
      .catch(() => { setExchangeRate(83); setRateLoading(false); });
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); });
    return () => unsub();
  }, []);

  // Firestore listeners
  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'income'), (s) => { setIncomeEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'expenses'), (s) => setExpenseEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'loans'), (s) => setLoans(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'emiPayments'), (s) => setEmiPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'sips'), (s) => setSips(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const addIncome = async () => { if (canEdit && newIncome.date && newIncome.amount) { await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount) }); setNewIncome({ date: '', description: '', amount: '' }); }};
  const addExpense = async () => { if (canEdit && newExpense.date && newExpense.amount && newExpense.category) { await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount) }); setNewExpense({ date: '', category: '', description: '', amount: '' }); }};
  const addLoan = async () => { if (canEdit && newLoan.name && newLoan.totalAmount) { await addDoc(collection(db, 'loans'), { ...newLoan, totalAmount: parseFloat(newLoan.totalAmount), disbursedAmount: parseFloat(newLoan.disbursedAmount || '0'), usedAmount: parseFloat(newLoan.usedAmount || '0') }); setNewLoan({ name: '', totalAmount: '', disbursedAmount: '', usedAmount: '' }); }};
  const addEmi = async () => { if (canEdit && newEmi.date && newEmi.amount) { await addDoc(collection(db, 'emiPayments'), { ...newEmi, amount: parseFloat(newEmi.amount) }); setNewEmi({ date: '', loanName: '', amount: '' }); }};
  const addSip = async () => { if (canEdit && newSip.date && newSip.amount) { await addDoc(collection(db, 'sips'), { ...newSip, amount: parseFloat(newSip.amount) }); setNewSip({ date: '', name: '', amount: '' }); }};
  const deleteItem = async (col: string, id: string) => { if (canEdit) await deleteDoc(doc(db, col, id)); };

  const filterByMonth = (entries: any[]) => selectedMonth === 'all' ? entries : entries.filter(e => e.date?.startsWith(selectedMonth));
  const filteredIncome = filterByMonth(incomeEntries);
  const filteredExpenses = filterByMonth(expenseEntries);
  const filteredEmi = filterByMonth(emiPayments);
  const filteredSips = filterByMonth(sips);

  const totalIncome = filteredIncome.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalEMI = filteredEmi.reduce((s, e) => s + e.amount, 0);
  const totalSIP = filteredSips.reduce((s, e) => s + e.amount, 0);
  const totalLoanBalance = loans.reduce((s, l) => s + (l.disbursedAmount - l.usedAmount), 0);
  const balance = totalIncome - totalExpenses;

  const categoryTotals = filteredExpenses.reduce((acc: any, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});

  const getMonthlyData = () => {
    const months: any = {};
    incomeEntries.forEach(e => { const m = e.date?.slice(0, 7); if (m) { if (!months[m]) months[m] = { income: 0, expense: 0 }; months[m].income += e.amount; }});
    expenseEntries.forEach(e => { const m = e.date?.slice(0, 7); if (m) { if (!months[m]) months[m] = { income: 0, expense: 0 }; months[m].expense += e.amount; }});
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  };

  const groupByMonth = (entries: any[]) => {
    const sorted = [...entries].sort((a, b) => b.date?.localeCompare(a.date));
    const grouped: any = {};
    sorted.forEach(e => { const month = e.date?.slice(0, 7) || 'unknown'; if (!grouped[month]) grouped[month] = []; grouped[month].push(e); });
    return grouped;
  };

  const categories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Food', 'Healthcare', 'Tuition', 'Books', 'Entertainment', 'Splitwise', 'Shopping', 'Other'];
  const categoryColors: any = { Rent: '#dc2626', Groceries: '#ea580c', Utilities: '#ca8a04', Transport: '#65a30d', Food: '#16a34a', Healthcare: '#0d9488', Tuition: '#0891b2', Books: '#2563eb', Entertainment: '#7c3aed', Splitwise: '#c026d3', Shopping: '#db2777', Other: '#64748b' };

  const formatUSD = (amt: number) => '$' + (amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (amt: number) => '₹' + Math.round((amt || 0) * exchangeRate).toLocaleString();
  const getMonthName = (m: string) => new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

  // PDF Generation
  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;

    // Header
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, pageWidth, 45, 'F');
    pdf.setTextColor(220, 38, 38);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('THE DARK WALLET', pageWidth / 2, 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Financial Report | ' + (selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth)), pageWidth / 2, 30, { align: 'center' });
    pdf.text('Generated: ' + new Date().toLocaleDateString(), pageWidth / 2, 38, { align: 'center' });

    // Summary
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUMMARY', 14, 55);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const summaryData = [
      ['Total Income', formatUSD(totalIncome), formatINR(totalIncome)],
      ['Total Expenses', formatUSD(totalExpenses), formatINR(totalExpenses)],
      ['Balance', formatUSD(balance), formatINR(balance)],
      ['EMI Paid', '-', formatINR(totalEMI)],
      ['SIP Invested', '-', formatINR(totalSIP)],
      ['Exchange Rate', `1 USD = ₹${exchangeRate.toFixed(2)}`, '']
    ];
    (pdf as any).autoTable({ startY: 60, head: [['Item', 'USD', 'INR']], body: summaryData, theme: 'grid', headStyles: { fillColor: [220, 38, 38] }});

    // Income
    if (filteredIncome.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INCOME', 14, (pdf as any).lastAutoTable.finalY + 15);
      const incomeData = filteredIncome.map(e => [e.date, e.description || 'Income', formatUSD(e.amount)]);
      (pdf as any).autoTable({ startY: (pdf as any).lastAutoTable.finalY + 20, head: [['Date', 'Description', 'Amount']], body: incomeData, theme: 'grid', headStyles: { fillColor: [34, 197, 94] }});
    }

    // Expenses
    if (filteredExpenses.length > 0) {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXPENSES', 14, 20);
      const expenseData = filteredExpenses.map(e => [e.date, e.category, e.description, formatUSD(e.amount)]);
      (pdf as any).autoTable({ startY: 25, head: [['Date', 'Category', 'Description', 'Amount']], body: expenseData, theme: 'grid', headStyles: { fillColor: [220, 38, 38] }});
    }

    // Loans
    if (loans.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const loanY = (pdf as any).lastAutoTable.finalY + 15;
      pdf.text('LOANS', 14, loanY);
      const loanData = loans.map(l => [l.name, formatINR(l.totalAmount), formatINR(l.disbursedAmount), formatINR(l.disbursedAmount - l.usedAmount)]);
      (pdf as any).autoTable({ startY: loanY + 5, head: [['Loan', 'Sanctioned', 'Disbursed', 'Balance']], body: loanData, theme: 'grid', headStyles: { fillColor: [168, 85, 247] }});
    }

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text('THE DARK WALLET - I Am Vengeance, I Am The Night, I Am Financially Responsible', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
    }

    pdf.save(`dark-wallet-report-${selectedMonth === 'all' ? 'all-time' : selectedMonth}.pdf`);
  };

  // Pie Chart
  const PieChart = ({ data }: { data: any }) => {
    const total = Object.values(data).reduce((s: number, v: any) => s + v, 0);
    if (total === 0) return <p className="text-center text-gray-500 py-8">No expense data yet</p>;
    let cumulative = 0;
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg viewBox="0 0 100 100" className="w-48 h-48">
          {entries.map(([cat, amt]: any) => {
            const pct = (amt / total) * 100;
            const startAngle = (cumulative / 100) * 360;
            cumulative += pct;
            const endAngle = (cumulative / 100) * 360;
            const largeArc = pct > 50 ? 1 : 0;
            const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
            return <path key={cat} d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`} fill={categoryColors[cat] || '#666'} className="hover:opacity-80 transition-opacity" style={{ filter: 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.3))' }} />;
          })}
          <circle cx="50" cy="50" r="20" fill="#0a0a0a" />
          <text x="50" y="48" textAnchor="middle" className="fill-red-500 text-[6px] font-bold">TOTAL</text>
          <text x="50" y="56" textAnchor="middle" className="fill-white text-[5px]">{formatUSD(total)}</text>
        </svg>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {entries.map(([cat, amt]: any) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[cat], boxShadow: `0 0 10px ${categoryColors[cat]}` }}></div>
              <span className="text-gray-400">{cat}</span>
              <span className="text-white font-bold">{Math.round((amt / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Bar Chart
  const BarChart = ({ data }: { data: any[] }) => {
    if (data.length === 0) return <p className="text-center text-gray-500 py-8">No monthly data yet</p>;
    const maxVal = Math.max(...data.map(([, v]: any) => Math.max(v.income, v.expense)));
    return (
      <div className="flex items-end justify-around gap-2 h-48 px-4">
        {data.map(([month, values]: any) => (
          <div key={month} className="flex flex-col items-center gap-1 flex-1">
            <div className="flex gap-1 items-end h-36">
              <div className="w-4 bg-gradient-to-t from-green-700 to-green-500 rounded-t transition-all" style={{ height: `${(values.income / maxVal) * 100}%`, boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)' }}></div>
              <div className="w-4 bg-gradient-to-t from-red-800 to-red-500 rounded-t transition-all" style={{ height: `${(values.expense / maxVal) * 100}%`, boxShadow: '0 0 15px rgba(220, 38, 38, 0.5)' }}></div>
            </div>
            <span className="text-xs text-gray-500">{new Date(month + '-01').toLocaleString('default', { month: 'short' })}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(ellipse at center, #1a0000 0%, #000 70%)' }}>
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">🦇</div>
        <p className="text-red-500 text-xl font-bold tracking-widest">ACCESSING BATCAVE...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-gray-100 p-4 md:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0000 0%, #1a0505 50%, #0a0000 100%)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cline x1=\'10\' y1=\'0\' x2=\'10\' y2=\'100\' stroke=\'%23ffffff\' stroke-width=\'0.5\'/%3E%3Cline x1=\'30\' y1=\'0\' x2=\'30\' y2=\'100\' stroke=\'%23ffffff\' stroke-width=\'0.3\'/%3E%3Cline x1=\'50\' y1=\'0\' x2=\'50\' y2=\'100\' stroke=\'%23ffffff\' stroke-width=\'0.5\'/%3E%3Cline x1=\'70\' y1=\'0\' x2=\'70\' y2=\'100\' stroke=\'%23ffffff\' stroke-width=\'0.3\'/%3E%3Cline x1=\'90\' y1=\'0\' x2=\'90\' y2=\'100\' stroke=\'%23ffffff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '50px 50px' }}></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-red-900/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Auth Bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {!rateLoading && <span className="text-xs bg-red-900/50 px-2 py-1 rounded text-red-300">💱 1 USD = ₹{exchangeRate.toFixed(2)}</span>}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-400">{user.email}</span>
                {canEdit && <span className="text-xs bg-green-900/50 px-2 py-1 rounded text-green-400">✏️ Editor</span>}
                {!canEdit && <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">👁️ Viewer</span>}
                <button onClick={logout} className="text-xs bg-red-900/50 hover:bg-red-800 px-3 py-1 rounded text-red-300">Logout</button>
              </>
            ) : (
              <button onClick={login} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-medium hover:bg-gray-200 transition">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 100 40" className="w-32 h-12 mx-auto mb-2" style={{ filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.8))' }}>
            <path d="M50 5 L30 20 L0 15 L15 25 L10 35 L30 28 L50 40 L70 28 L90 35 L85 25 L100 15 L70 20 Z" fill="#dc2626" />
          </svg>
          <h1 className="text-5xl font-black tracking-wider mb-1" style={{ color: '#dc2626', textShadow: '0 0 30px rgba(220, 38, 38, 0.7)' }}>THE DARK WALLET</h1>
          <p className="text-gray-600 text-xs uppercase tracking-[0.3em]">Vengeance • Shadows • Savings</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-black/80 border-2 border-red-900/50 rounded px-4 py-2 text-red-400 font-medium">
            <option value="all">🦇 ALL TIME</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2025, i, 1);
              return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}</option>;
            })}
          </select>
          <button onClick={generatePDF} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold" style={{ boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)' }}>
            📄 Download PDF Report
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['dashboard', 'analytics', 'income', 'expenses', 'loans', 'sip'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded font-bold uppercase tracking-wider text-sm transition-all border ${activeTab === tab ? 'bg-red-600 border-red-500 text-white' : 'bg-black/50 border-red-900/30 text-red-400 hover:bg-red-900/20'}`} style={activeTab === tab ? { boxShadow: '0 0 25px rgba(220, 38, 38, 0.5)' } : {}}>
              {tab === 'dashboard' ? '🦇 BATCAVE' : tab === 'analytics' ? '📊 INTEL' : tab === 'income' ? '💰 CASH IN' : tab === 'expenses' ? '💸 CASH OUT' : tab === 'loans' ? '🏦 LOANS' : '📈 SIP'}
            </button>
          ))}
        </div>

        {/* Not logged in warning for editing */}
        {!canEdit && (
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 mb-6 text-center">
            <p className="text-yellow-400 text-sm">{user ? '👁️ View-only mode. Only authorized users can edit.' : '🔐 Sign in to add/edit entries'}</p>
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Income', value: formatUSD(totalIncome), sub: formatINR(totalIncome), color: 'green' },
                { label: 'Total Expenses', value: formatUSD(totalExpenses), sub: formatINR(totalExpenses), color: 'red' },
                { label: 'Balance', value: formatUSD(balance), sub: formatINR(balance), color: balance >= 0 ? 'emerald' : 'orange' },
                { label: 'EMI Paid', value: formatINR(totalEMI), sub: '', color: 'purple' },
                { label: 'SIP Invested', value: formatINR(totalSIP), sub: '', color: 'blue' },
              ].map((card, i) => (
                <div key={i} className="bg-black/60 border border-red-900/30 p-4 rounded-lg backdrop-blur">
                  <p className={`text-${card.color}-400 text-xs uppercase font-bold tracking-wide`}>{card.label}</p>
                  <p className={`text-2xl font-black text-${card.color}-300`}>{card.value}</p>
                  {card.sub && <p className={`text-${card.color}-500/60 text-xs`}>{card.sub}</p>}
                </div>
              ))}
            </div>
            <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg backdrop-blur">
              <h3 className="text-red-500 font-bold mb-3 tracking-wide">🦇 LOAN STATUS</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-red-950/30 rounded-lg"><p className="text-gray-500 text-xs uppercase">Sanctioned</p><p className="text-xl font-bold text-white">{formatINR(loans.reduce((s, l) => s + l.totalAmount, 0))}</p></div>
                <div className="text-center p-3 bg-red-950/30 rounded-lg"><p className="text-gray-500 text-xs uppercase">Disbursed</p><p className="text-xl font-bold text-green-400">{formatINR(loans.reduce((s, l) => s + l.disbursedAmount, 0))}</p></div>
                <div className="text-center p-3 bg-red-950/30 rounded-lg"><p className="text-gray-500 text-xs uppercase">Available</p><p className="text-xl font-bold text-red-400">{formatINR(totalLoanBalance)}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-black/60 border border-red-900/30 p-6 rounded-lg backdrop-blur">
              <h3 className="text-red-500 font-bold mb-4 tracking-wide text-lg">📊 EXPENSE BREAKDOWN</h3>
              <PieChart data={categoryTotals} />
            </div>
            <div className="bg-black/60 border border-red-900/30 p-6 rounded-lg backdrop-blur">
              <h3 className="text-red-500 font-bold mb-4 tracking-wide text-lg">📈 INCOME VS EXPENSES</h3>
              <BarChart data={getMonthlyData()} />
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500"></div><span className="text-gray-400 text-sm">Income</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500"></div><span className="text-gray-400 text-sm">Expenses</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg text-center"><p className="text-gray-500 text-xs uppercase">Avg Monthly Income</p><p className="text-xl font-bold text-green-400">{formatUSD(totalIncome / Math.max(Object.keys(groupByMonth(incomeEntries)).length, 1))}</p></div>
              <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg text-center"><p className="text-gray-500 text-xs uppercase">Avg Monthly Expense</p><p className="text-xl font-bold text-red-400">{formatUSD(totalExpenses / Math.max(Object.keys(groupByMonth(expenseEntries)).length, 1))}</p></div>
              <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg text-center"><p className="text-gray-500 text-xs uppercase">Total Transactions</p><p className="text-xl font-bold text-white">{incomeEntries.length + expenseEntries.length}</p></div>
              <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg text-center"><p className="text-gray-500 text-xs uppercase">Savings Rate</p><p className="text-xl font-bold text-yellow-400">{totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0}%</p></div>
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg backdrop-blur">
            <h2 className="text-red-500 font-bold text-xl mb-4 tracking-wide">💰 CASH IN</h2>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className="bg-black border border-red-900/50 rounded px-3 py-2 text-white" />
                <input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Description" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white flex-1 min-w-[150px]" />
                <input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="Amount $" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-28" />
                <button onClick={addIncome} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold">+ ADD</button>
              </div>
            )}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupByMonth(filteredIncome)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-green-900/20 border border-green-700/30 px-3 py-2 rounded mb-2">
                    <span className="text-green-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-green-300 font-bold">{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded mb-1 ml-2 border border-red-900/10">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-500">{e.description || 'Income'}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-400">{formatUSD(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('income', e.id)} className="text-red-600 hover:text-red-400">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded text-center">
              <p className="text-green-300">Total Cash In: <span className="font-black text-2xl">{formatUSD(totalIncome)}</span> <span className="text-green-500/60">({formatINR(totalIncome)})</span></p>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg backdrop-blur">
            <h2 className="text-red-500 font-bold text-xl mb-4 tracking-wide">💸 CASH OUT</h2>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="bg-black border border-red-900/50 rounded px-3 py-2 text-white" />
                <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="bg-black border border-red-900/50 rounded px-3 py-2 text-white">
                  <option value="">Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white flex-1 min-w-[150px]" />
                <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Amount $" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-28" />
                <button onClick={addExpense} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold">+ ADD</button>
              </div>
            )}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupByMonth(filteredExpenses)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-red-900/20 border border-red-700/30 px-3 py-2 rounded mb-2">
                    <span className="text-red-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-red-300 font-bold">{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded mb-1 ml-2 border border-red-900/10">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-500">{e.description} • <span className="text-red-400">{e.category}</span></p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-400">{formatUSD(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('expenses', e.id)} className="text-red-600 hover:text-red-400">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded text-center">
              <p className="text-red-300">Total Cash Out: <span className="font-black text-2xl">{formatUSD(totalExpenses)}</span> <span className="text-red-500/60">({formatINR(totalExpenses)})</span></p>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="bg-black/60 border border-red-900/30 p-4 rounded-lg backdrop-blur">
              <h2 className="text-red-500 font-bold text-xl mb-4 tracking-wide">🏦 LOAN DISBURSEMENT</h2>
              {canEdit && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <input value={newLoan.name} onChange={e => setNewLoan({ ...newLoan, name: e.target.value })} placeholder="Loan Name" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-36" />
                  <input type="number" value={newLoan.totalAmount} onChange={e => setNewLoan({ ...newLoan, totalAmount: e.target.value })} placeholder="Total ₹" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-32" />
                  <input type="number" value={newLoan.disbursedAmount} onChange={e => setNewLoan({ ...newLoan, disbursedAmount: e.target.value })} placeholder="Disbursed ₹" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-32" />
                  <input type="number" value={newLoan.usedAmount} onChange={e => setNewLoan({ ...newLoan, usedAmount: e.target.value })} placeholder="Used ₹" className="bg-black border border-red-900/50 rounded px-3 py-2 text-white w-28" />
                  <button onClick={addLoan} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold">+ ADD</button>
                </div>
              )}
              <div className="space-y-3">
                {loans.map(l => (
                  <div key={l.id} className="bg-black/50 p-4 rounded border border-red-900/20">
                    <div className="flex justify-between mb-3">
                      <p className="font-bold text-red-400 text-lg">{l.name}</p>
                      {canEdit && <button onClick={() => deleteItem('loans', l.id)} className="text-red-600 hover:text-red-400">✕</button>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-red-950/30 p-2 rounded"><p className="text-xs text-gray-500">Sanctioned</p><p className="font-bold text-white">{formatINR(l.totalAmount)}</p></div>
                      <div className="bg-red-950/30 p-2 rounded"><p className="text-xs text-gray-500">Disbursed</p><p className="font-bold text-green-400">{formatINR(l.disbursedAmount)}</p></div>
                      <div className="bg-red-950/30 p-2 rounded"><p className="text-xs text-gray-500">Balance</p><p className="font-bold text-red-400">{formatINR(l.disbursedAmount - l.usedAmount)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black/60 border border-purple-900/30 p-4 rounded-lg backdrop-blur">
              <h2 className="text-purple-400 font-bold text-xl mb-4 tracking-wide">💳 MONTHLY EMI</h2>
              {canEdit && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <input type="date" value={newEmi.date} onChange={e => setNewEmi({ ...newEmi, date: e.target.value })} className="bg-black border border-purple-900/50 rounded px-3 py-2 text-white" />
                  <input value={newEmi.loanName} onChange={e => setNewEmi({ ...newEmi, loanName: e.target.value })} placeholder="Loan Name" className="bg-black border border-purple-900/50 rounded px-3 py-2 text-white flex-1 min-w-[120px]" />
                  <input type="number" value={newEmi.amount} onChange={e => setNewEmi({ ...newEmi, amount: e.target.value })} placeholder="EMI ₹" className="bg-black border border-purple-900/50 rounded px-3 py-2 text-white w-28" />
                  <button onClick={addEmi} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold">+ ADD</button>
                </div>
              )}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {emiPayments.sort((a, b) => b.date?.localeCompare(a.date)).map(e => (
                  <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded border border-purple-900/20">
                    <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-500">{e.loanName}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-400">{formatINR(e.amount)}</span>
                      {canEdit && <button onClick={() => deleteItem('emiPayments', e.id)} className="text-red-600 hover:text-red-400">✕</button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/30 rounded text-center">
                <p className="text-purple-300">Total EMI Paid: <span className="font-black text-2xl">{formatINR(totalEMI)}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* SIP Tab */}
        {activeTab === 'sip' && (
          <div className="bg-black/60 border border-blue-900/30 p-4 rounded-lg backdrop-blur">
            <h2 className="text-blue-400 font-bold text-xl mb-4 tracking-wide">📈 MONTHLY SIP</h2>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className="bg-black border border-blue-900/50 rounded px-3 py-2 text-white" />
                <input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="SIP Name / Fund" className="bg-black border border-blue-900/50 rounded px-3 py-2 text-white flex-1 min-w-[150px]" />
                <input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="Amount ₹" className="bg-black border border-blue-900/50 rounded px-3 py-2 text-white w-28" />
                <button onClick={addSip} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold">+ ADD</button>
              </div>
            )}
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredSips)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-blue-900/20 border border-blue-700/30 px-3 py-2 rounded mb-2">
                    <span className="text-blue-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-blue-300 font-bold">{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded mb-1 ml-2 border border-blue-900/10">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-500">{e.name}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-400">{formatINR(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('sips', e.id)} className="text-red-600 hover:text-red-400">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-center">
              <p className="text-blue-300">Total SIP Invested: <span className="font-black text-2xl">{formatINR(totalSIP)}</span></p>
            </div>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-8 tracking-widest">I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE</p>
      </div>
    </div>
  );
}
