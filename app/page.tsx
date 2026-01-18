"use client";
import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import emailjs from '@emailjs/browser';

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

const EDITORS = ['akshaygovind06@gmail.com', 'toshnilgovind@gmail.com'];
const EMAILJS_SERVICE = 'service_8hw0whx';
const EMAILJS_TEMPLATE = 'template_ky8myvn';
const EMAILJS_KEY = 'Ay5q7gGs4QQyimuMN';

const BATMAN_QUOTES = [
  { quote: "It's not who I am underneath, but what I do that defines me.", source: "Batman Begins" },
  { quote: "Why do we fall? So we can learn to pick ourselves up.", source: "Batman Begins" },
  { quote: "The night is darkest just before the dawn.", source: "The Dark Knight" },
  { quote: "A hero can be anyone, even a man doing something as simple as saving money.", source: "The Dark Knight Rises" },
  { quote: "You either die broke, or live long enough to see yourself become financially stable.", source: "The Dark Knight" },
  { quote: "I am vengeance. I am the night. I am financially responsible.", source: "Batman" },
];

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
  const [showBats, setShowBats] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(BATMAN_QUOTES[0]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareMonth1, setCompareMonth1] = useState('2025-01');
  const [compareMonth2, setCompareMonth2] = useState('2025-02');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [emailSending, setEmailSending] = useState(false);

  const canEdit = user && EDITORS.includes(user.email);

  useEffect(() => {
    const seed = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    setDailyQuote(BATMAN_QUOTES[seed % BATMAN_QUOTES.length]);
  }, []);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => setExchangeRate(data.rates.INR || 83))
      .catch(() => {});
  }, []);

  useEffect(() => { const unsub = onAuthStateChanged(auth, setUser); return () => unsub(); }, []);

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
  const installPWA = async () => { if (deferredPrompt) { deferredPrompt.prompt(); setDeferredPrompt(null); }};
  const triggerBats = useCallback(() => { setShowBats(true); setTimeout(() => setShowBats(false), 3000); }, []);

  const addIncome = async () => { if (canEdit && newIncome.date && newIncome.amount) { await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount) }); setNewIncome({ date: '', description: '', amount: '' }); triggerBats(); }};
  const addExpense = async () => { if (canEdit && newExpense.date && newExpense.amount && newExpense.category) { await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount) }); setNewExpense({ date: '', category: '', description: '', amount: '' }); }};
  const addLoan = async () => { if (canEdit && newLoan.name && newLoan.totalAmount) { await addDoc(collection(db, 'loans'), { ...newLoan, totalAmount: parseFloat(newLoan.totalAmount), disbursedAmount: parseFloat(newLoan.disbursedAmount || '0'), usedAmount: parseFloat(newLoan.usedAmount || '0') }); setNewLoan({ name: '', totalAmount: '', disbursedAmount: '', usedAmount: '' }); }};
  const addEmi = async () => { if (canEdit && newEmi.date && newEmi.amount) { await addDoc(collection(db, 'emiPayments'), { ...newEmi, amount: parseFloat(newEmi.amount) }); setNewEmi({ date: '', loanName: '', amount: '' }); }};
  const addSip = async () => { if (canEdit && newSip.date && newSip.amount) { await addDoc(collection(db, 'sips'), { ...newSip, amount: parseFloat(newSip.amount) }); setNewSip({ date: '', name: '', amount: '' }); }};
  const deleteItem = async (col: string, id: string) => { if (canEdit) await deleteDoc(doc(db, col, id)); };

  const filterByMonth = (entries: any[], month: string) => month === 'all' ? entries : entries.filter(e => e.date?.startsWith(month));
  const filteredIncome = filterByMonth(incomeEntries, selectedMonth);
  const filteredExpenses = filterByMonth(expenseEntries, selectedMonth);
  const filteredEmi = filterByMonth(emiPayments, selectedMonth);
  const filteredSips = filterByMonth(sips, selectedMonth);

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
    sorted.forEach(e => { const m = e.date?.slice(0, 7) || 'unknown'; if (!grouped[m]) grouped[m] = []; grouped[m].push(e); });
    return grouped;
  };

  const getMonthData = (month: string) => {
    const inc = filterByMonth(incomeEntries, month);
    const exp = filterByMonth(expenseEntries, month);
    return { income: inc.reduce((s, e) => s + e.amount, 0), expenses: exp.reduce((s, e) => s + e.amount, 0), emi: filterByMonth(emiPayments, month).reduce((s, e) => s + e.amount, 0), sip: filterByMonth(sips, month).reduce((s, e) => s + e.amount, 0) };
  };

  const categories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Food', 'Healthcare', 'Tuition', 'Books', 'Entertainment', 'Splitwise', 'Shopping', 'Other'];
  const categoryColors: any = { Rent: '#dc2626', Groceries: '#ea580c', Utilities: '#ca8a04', Transport: '#65a30d', Food: '#16a34a', Healthcare: '#0d9488', Tuition: '#0891b2', Books: '#2563eb', Entertainment: '#7c3aed', Splitwise: '#c026d3', Shopping: '#db2777', Other: '#64748b' };

  const formatUSD = (amt: number) => '$' + (amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (amt: number) => '₹' + Math.round((amt || 0) * exchangeRate).toLocaleString();
  const getMonthName = (m: string) => { try { return new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }); } catch { return m; }};

  const shareWhatsApp = () => {
    const msg = `🦇 *THE DARK WALLET* - ${selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth)}\n\n💰 Income: ${formatUSD(totalIncome)}\n💸 Expenses: ${formatUSD(totalExpenses)}\n📊 Balance: ${formatUSD(balance)}\n🏦 EMI: ${formatINR(totalEMI)}\n📈 SIP: ${formatINR(totalSIP)}\n\n💱 1 USD = ₹${exchangeRate.toFixed(2)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendEmail = async () => {
    setEmailSending(true);
    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: 'akshaygovind06@gmail.com',
        to_name: 'Akshay',
        month: selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth),
        income: formatUSD(totalIncome) + ' (' + formatINR(totalIncome) + ')',
        expenses: formatUSD(totalExpenses) + ' (' + formatINR(totalExpenses) + ')',
        balance: formatUSD(balance) + ' (' + formatINR(balance) + ')',
        emi: formatINR(totalEMI),
        sip: formatINR(totalSIP),
        rate: '1 USD = ₹' + exchangeRate.toFixed(2)
      }, EMAILJS_KEY);
      alert('📧 Email sent successfully!');
    } catch (err) { alert('Failed to send email'); }
    setEmailSending(false);
  };

  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    const pdf = new jsPDF();
    const pw = pdf.internal.pageSize.width;
    pdf.setFillColor(10, 10, 10); pdf.rect(0, 0, pw, 40, 'F');
    pdf.setTextColor(220, 38, 38); pdf.setFontSize(24); pdf.setFont('helvetica', 'bold');
    pdf.text('THE DARK WALLET', pw / 2, 18, { align: 'center' });
    pdf.setFontSize(10); pdf.setTextColor(150);
    pdf.text((selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth)) + ' | Rate: 1 USD = ₹' + exchangeRate.toFixed(2), pw / 2, 28, { align: 'center' });
    pdf.text('Generated: ' + new Date().toLocaleDateString(), pw / 2, 35, { align: 'center' });
    const summaryData = [['Income', formatUSD(totalIncome), formatINR(totalIncome)], ['Expenses', formatUSD(totalExpenses), formatINR(totalExpenses)], ['Balance', formatUSD(balance), formatINR(balance)], ['EMI Paid', '-', formatINR(totalEMI)], ['SIP', '-', formatINR(totalSIP)]];
    (pdf as any).autoTable({ startY: 45, head: [['', 'USD', 'INR']], body: summaryData, theme: 'grid', headStyles: { fillColor: [220, 38, 38] } });
    if (filteredIncome.length) { pdf.text('INCOME', 14, (pdf as any).lastAutoTable.finalY + 12); (pdf as any).autoTable({ startY: (pdf as any).lastAutoTable.finalY + 16, head: [['Date', 'Description', 'Amount']], body: filteredIncome.map(e => [e.date, e.description || '-', formatUSD(e.amount)]), theme: 'grid', headStyles: { fillColor: [34, 197, 94] } }); }
    if (filteredExpenses.length) { pdf.text('EXPENSES', 14, (pdf as any).lastAutoTable.finalY + 12); (pdf as any).autoTable({ startY: (pdf as any).lastAutoTable.finalY + 16, head: [['Date', 'Category', 'Desc', 'Amt']], body: filteredExpenses.map(e => [e.date, e.category, e.description || '-', formatUSD(e.amount)]), theme: 'grid', headStyles: { fillColor: [220, 38, 38] } }); }
    pdf.save(`dark-wallet-${selectedMonth || 'all'}.pdf`);
  };

// PART 2 - ADD THIS DIRECTLY AFTER PART 1

  const PieChart = ({ data }: { data: any }) => {
    const total = Object.values(data).reduce((s: number, v: any) => s + v, 0);
    if (total === 0) return <p className="text-gray-500 text-center py-4">No data</p>;
    let cum = 0;
    return (
      <div className="flex flex-col md:flex-row items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-40 h-40">
          {Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).map(([cat, amt]: any) => {
            const pct = (amt / total) * 100, start = (cum / 100) * 360; cum += pct; const end = (cum / 100) * 360;
            const sx = 50 + 40 * Math.cos((start - 90) * Math.PI / 180), sy = 50 + 40 * Math.sin((start - 90) * Math.PI / 180);
            const ex = 50 + 40 * Math.cos((end - 90) * Math.PI / 180), ey = 50 + 40 * Math.sin((end - 90) * Math.PI / 180);
            return <path key={cat} d={`M 50 50 L ${sx} ${sy} A 40 40 0 ${pct > 50 ? 1 : 0} 1 ${ex} ${ey} Z`} fill={categoryColors[cat] || '#666'} />;
          })}
          <circle cx="50" cy="50" r="18" fill="#0a0a0a" />
        </svg>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).map(([cat, amt]: any) => (
            <div key={cat} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[cat] }}></div><span className="text-gray-400">{cat}</span><span className="text-white font-bold">{Math.round((amt / total) * 100)}%</span></div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = ({ data }: { data: any[] }) => {
    if (!data.length) return <p className="text-gray-500 text-center py-4">No data</p>;
    const max = Math.max(...data.map(([, v]: any) => Math.max(v.income, v.expense)));
    return (
      <div className="flex items-end justify-around gap-1 h-32">
        {data.map(([m, v]: any) => (
          <div key={m} className="flex flex-col items-center flex-1">
            <div className="flex gap-0.5 items-end h-24">
              <div className="w-3 bg-green-500 rounded-t" style={{ height: `${(v.income / max) * 100}%` }}></div>
              <div className="w-3 bg-red-500 rounded-t" style={{ height: `${(v.expense / max) * 100}%` }}></div>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">{new Date(m + '-01').toLocaleString('default', { month: 'short' })}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-6xl animate-pulse">🦇</div>
    </div>
  );

  return (
    <div className="min-h-screen text-gray-100 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0000 0%, #1a0505 50%, #000 100%)' }}>
      {/* Rain */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(80)].map((_, i) => (
          <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-gray-400/30 to-transparent" style={{ left: `${Math.random() * 100}%`, height: `${20 + Math.random() * 30}px`, animation: `rain ${0.4 + Math.random() * 0.4}s linear infinite`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
      </div>
      <style>{`@keyframes rain{0%{transform:translateY(-100vh)}100%{transform:translateY(100vh)}}@keyframes flyBat{0%{transform:translateX(-50px) translateY(0);opacity:1}100%{transform:translateX(100vw) translateY(-50px);opacity:0}}`}</style>

      {/* Gotham Skyline */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none z-0 opacity-20">
        <svg viewBox="0 0 1200 150" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <path fill="#111" d="M0,150 L0,100 L40,100 L40,60 L60,60 L60,40 L80,40 L80,70 L120,70 L120,50 L150,50 L150,30 L170,30 L170,60 L200,60 L200,80 L250,80 L250,45 L280,45 L280,25 L300,25 L300,55 L350,55 L350,75 L400,75 L400,40 L430,40 L430,20 L450,20 L450,50 L500,50 L500,70 L550,70 L550,35 L580,35 L580,55 L620,55 L620,85 L680,85 L680,50 L720,50 L720,30 L750,30 L750,60 L800,60 L800,90 L850,90 L850,55 L900,55 L900,35 L930,35 L930,65 L980,65 L980,45 L1020,45 L1020,75 L1080,75 L1080,95 L1150,95 L1150,110 L1200,110 L1200,150 Z" />
        </svg>
      </div>

      {/* Flying Bats */}
      {showBats && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute text-3xl" style={{ left: '-40px', top: `${20 + Math.random() * 50}%`, animation: `flyBat ${1 + Math.random() * 0.5}s ease-out forwards`, animationDelay: `${i * 0.08}s` }}>🦇</div>
          ))}
        </div>
      )}

      {/* Red Glow */}
      <div className="fixed top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-48 h-48 bg-red-900/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10 p-3 md:p-6">
        {/* Top Bar */}
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-red-900/50 px-2 py-1 rounded text-red-300">💱 ₹{exchangeRate.toFixed(2)}</span>
            {deferredPrompt && <button onClick={installPWA} className="bg-blue-900/50 px-2 py-1 rounded text-blue-300">📱 Install</button>}
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-gray-500 hidden sm:inline">{user.email?.split('@')[0]}</span>
                <span className={`px-2 py-1 rounded ${canEdit ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}>{canEdit ? '✏️' : '👁️'}</span>
                <button onClick={logout} className="bg-red-900/50 px-2 py-1 rounded text-red-300">Exit</button>
              </>
            ) : (
              <button onClick={login} className="bg-white text-black px-3 py-1 rounded font-medium">Sign In</button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <svg viewBox="0 0 100 40" className="w-16 h-8 mx-auto mb-1" style={{ filter: 'drop-shadow(0 0 15px rgba(220,38,38,0.8))' }}>
            <path d="M50 5 L30 20 L0 15 L15 25 L10 35 L30 28 L50 40 L70 28 L90 35 L85 25 L100 15 L70 20 Z" fill="#dc2626" />
          </svg>
          <h1 className="text-2xl md:text-4xl font-black tracking-wider" style={{ color: '#dc2626', textShadow: '0 0 25px rgba(220,38,38,0.6)' }}>THE DARK WALLET</h1>
          <p className="text-gray-500 italic text-xs mt-2 max-w-md mx-auto">&ldquo;{dailyQuote.quote}&rdquo; <span className="text-red-500">— {dailyQuote.source}</span></p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-3 text-xs">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-black border border-red-900/50 rounded px-2 py-1 text-red-400">
            <option value="all">ALL TIME</option>
            {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short' })}</option>; })}
          </select>
          <button onClick={generatePDF} className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded font-bold">📄 PDF</button>
          <button onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded font-bold">📱 WhatsApp</button>
          <button onClick={sendEmail} disabled={emailSending} className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded font-bold disabled:opacity-50">{emailSending ? '⏳' : '📧'} Email</button>
          <button onClick={() => setCompareMode(!compareMode)} className={`px-3 py-1 rounded font-bold ${compareMode ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-yellow-400'}`}>📊 Compare</button>
        </div>

        {/* Nav */}
        <div className="flex flex-wrap justify-center gap-1 mb-4 text-xs">
          {['dashboard', 'analytics', 'income', 'expenses', 'loans', 'sip'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setCompareMode(false); }} className={`px-3 py-1.5 rounded font-bold uppercase ${activeTab === tab && !compareMode ? 'bg-red-600 text-white' : 'bg-black/50 border border-red-900/30 text-red-400'}`}>
              {tab === 'dashboard' ? '🦇' : tab === 'analytics' ? '📊' : tab === 'income' ? '💰' : tab === 'expenses' ? '💸' : tab === 'loans' ? '🏦' : '📈'}
            </button>
          ))}
        </div>

        {!canEdit && <p className="text-center text-yellow-400 text-xs mb-3">{user ? '👁️ View only' : '🔐 Sign in to edit'}</p>}

        {/* Compare Mode */}
        {compareMode && (
          <div className="bg-black/60 border border-yellow-500/30 p-3 rounded-lg mb-4">
            <div className="flex justify-center gap-2 mb-3 text-sm">
              <select value={compareMonth1} onChange={e => setCompareMonth1(e.target.value)} className="bg-black border border-yellow-500/30 rounded px-2 py-1 text-yellow-400">
                {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>; })}
              </select>
              <span className="text-yellow-400 self-center font-bold">VS</span>
              <select value={compareMonth2} onChange={e => setCompareMonth2(e.target.value)} className="bg-black border border-yellow-500/30 rounded px-2 py-1 text-yellow-400">
                {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>; })}
              </select>
            </div>
            {(() => { const d1 = getMonthData(compareMonth1), d2 = getMonthData(compareMonth2); return (
              <div className="grid grid-cols-4 gap-1 text-xs text-center">
                <div></div><div className="text-yellow-400 font-bold">{compareMonth1.slice(5)}</div><div className="text-yellow-400 font-bold">{compareMonth2.slice(5)}</div><div className="text-gray-500">Diff</div>
                <div className="text-gray-400">Income</div><div>{formatUSD(d1.income)}</div><div>{formatUSD(d2.income)}</div><div className={d2.income >= d1.income ? 'text-green-400' : 'text-red-400'}>{d2.income >= d1.income ? '+' : ''}{formatUSD(d2.income - d1.income)}</div>
                <div className="text-gray-400">Expense</div><div>{formatUSD(d1.expenses)}</div><div>{formatUSD(d2.expenses)}</div><div className={d2.expenses <= d1.expenses ? 'text-green-400' : 'text-red-400'}>{d2.expenses > d1.expenses ? '+' : ''}{formatUSD(d2.expenses - d1.expenses)}</div>
                <div className="text-gray-400">Balance</div><div className={d1.income - d1.expenses >= 0 ? 'text-green-400' : 'text-red-400'}>{formatUSD(d1.income - d1.expenses)}</div><div className={d2.income - d2.expenses >= 0 ? 'text-green-400' : 'text-red-400'}>{formatUSD(d2.income - d2.expenses)}</div><div></div>
              </div>
            );})()}
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && !compareMode && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[{ l: 'Income', v: formatUSD(totalIncome), s: formatINR(totalIncome), c: 'green' }, { l: 'Expenses', v: formatUSD(totalExpenses), s: formatINR(totalExpenses), c: 'red' }, { l: 'Balance', v: formatUSD(balance), s: formatINR(balance), c: balance >= 0 ? 'green' : 'red' }, { l: 'EMI', v: formatINR(totalEMI), s: '', c: 'purple' }, { l: 'SIP', v: formatINR(totalSIP), s: '', c: 'blue' }].map((c, i) => (
                <div key={i} className="bg-black/60 border border-red-900/30 p-2 rounded"><p className={`text-${c.c}-400 text-[10px] uppercase font-bold`}>{c.l}</p><p className={`text-lg font-black text-${c.c}-300`}>{c.v}</p>{c.s && <p className="text-gray-500 text-[10px]">{c.s}</p>}</div>
              ))}
            </div>
            <div className="bg-black/60 border border-red-900/30 p-2 rounded">
              <p className="text-red-500 font-bold text-xs mb-2">🏦 LOANS</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-red-950/30 p-2 rounded"><p className="text-gray-500 text-[10px]">Sanctioned</p><p className="font-bold">{formatINR(loans.reduce((s, l) => s + l.totalAmount, 0))}</p></div>
                <div className="bg-red-950/30 p-2 rounded"><p className="text-gray-500 text-[10px]">Disbursed</p><p className="font-bold text-green-400">{formatINR(loans.reduce((s, l) => s + l.disbursedAmount, 0))}</p></div>
                <div className="bg-red-950/30 p-2 rounded"><p className="text-gray-500 text-[10px]">Available</p><p className="font-bold text-red-400">{formatINR(totalLoanBalance)}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && !compareMode && (
          <div className="space-y-3">
            <div className="bg-black/60 border border-red-900/30 p-3 rounded"><p className="text-red-500 font-bold text-xs mb-2">EXPENSES</p><PieChart data={categoryTotals} /></div>
            <div className="bg-black/60 border border-red-900/30 p-3 rounded"><p className="text-red-500 font-bold text-xs mb-2">TREND</p><BarChart data={getMonthlyData()} /><div className="flex justify-center gap-3 mt-2 text-[10px]"><span className="text-green-400">● In</span><span className="text-red-400">● Out</span></div></div>
          </div>
        )}

        {/* Income */}
        {activeTab === 'income' && !compareMode && (
          <div className="bg-black/60 border border-red-900/30 p-3 rounded">
            <p className="text-green-500 font-bold text-sm mb-2">💰 CASH IN</p>
            {canEdit && <div className="flex flex-wrap gap-1 mb-2 text-xs"><input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className="bg-black border border-green-900/50 rounded px-2 py-1 text-white" /><input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Desc" className="bg-black border border-green-900/50 rounded px-2 py-1 text-white flex-1 min-w-[80px]" /><input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="$" className="bg-black border border-green-900/50 rounded px-2 py-1 text-white w-16" /><button onClick={addIncome} className="bg-green-600 px-2 py-1 rounded font-bold">+</button></div>}
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {Object.entries(groupByMonth(filteredIncome)).map(([m, entries]: any) => (
                <div key={m}><div className="flex justify-between bg-green-900/20 px-2 py-1 rounded text-green-400 font-bold"><span>{getMonthName(m)}</span><span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span></div>
                  {entries.map((e: any) => (<div key={e.id} className="flex justify-between bg-black/40 p-2 rounded mt-1 ml-2"><div><p className="font-bold">{e.date}</p><p className="text-gray-500 text-[10px]">{e.description || '-'}</p></div><div className="flex items-center gap-2"><span className="text-green-400 font-bold">{formatUSD(e.amount)}</span>{canEdit && <button onClick={() => deleteItem('income', e.id)} className="text-red-500">✕</button>}</div></div>))}
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 bg-green-900/20 rounded text-center text-green-300 text-sm">Total: <span className="font-black text-lg">{formatUSD(totalIncome)}</span></div>
          </div>
        )}

        {/* Expenses */}
        {activeTab === 'expenses' && !compareMode && (
          <div className="bg-black/60 border border-red-900/30 p-3 rounded">
            <p className="text-red-500 font-bold text-sm mb-2">💸 CASH OUT</p>
            {canEdit && <div className="flex flex-wrap gap-1 mb-2 text-xs"><input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="bg-black border border-red-900/50 rounded px-2 py-1 text-white" /><select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="bg-black border border-red-900/50 rounded px-2 py-1 text-white"><option value="">Cat</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Desc" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white flex-1 min-w-[60px]" /><input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="$" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white w-14" /><button onClick={addExpense} className="bg-red-600 px-2 py-1 rounded font-bold">+</button></div>}
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {Object.entries(groupByMonth(filteredExpenses)).map(([m, entries]: any) => (
                <div key={m}><div className="flex justify-between bg-red-900/20 px-2 py-1 rounded text-red-400 font-bold"><span>{getMonthName(m)}</span><span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span></div>
                  {entries.map((e: any) => (<div key={e.id} className="flex justify-between bg-black/40 p-2 rounded mt-1 ml-2"><div><p className="font-bold">{e.date}</p><p className="text-gray-500 text-[10px]">{e.description} • <span className="text-red-400">{e.category}</span></p></div><div className="flex items-center gap-2"><span className="text-red-400 font-bold">{formatUSD(e.amount)}</span>{canEdit && <button onClick={() => deleteItem('expenses', e.id)} className="text-red-500">✕</button>}</div></div>))}
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 bg-red-900/20 rounded text-center text-red-300 text-sm">Total: <span className="font-black text-lg">{formatUSD(totalExpenses)}</span></div>
          </div>
        )}

        {/* Loans */}
        {activeTab === 'loans' && !compareMode && (
          <div className="space-y-3">
            <div className="bg-black/60 border border-red-900/30 p-3 rounded">
              <p className="text-red-500 font-bold text-sm mb-2">🏦 LOANS</p>
              {canEdit && <div className="flex flex-wrap gap-1 mb-2 text-xs"><input value={newLoan.name} onChange={e => setNewLoan({ ...newLoan, name: e.target.value })} placeholder="Name" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white w-20" /><input type="number" value={newLoan.totalAmount} onChange={e => setNewLoan({ ...newLoan, totalAmount: e.target.value })} placeholder="Total₹" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white w-20" /><input type="number" value={newLoan.disbursedAmount} onChange={e => setNewLoan({ ...newLoan, disbursedAmount: e.target.value })} placeholder="Disb₹" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white w-20" /><input type="number" value={newLoan.usedAmount} onChange={e => setNewLoan({ ...newLoan, usedAmount: e.target.value })} placeholder="Used₹" className="bg-black border border-red-900/50 rounded px-2 py-1 text-white w-16" /><button onClick={addLoan} className="bg-red-600 px-2 py-1 rounded font-bold">+</button></div>}
              {loans.map(l => (<div key={l.id} className="bg-black/40 p-2 rounded mb-2 text-xs"><div className="flex justify-between mb-1"><span className="text-red-400 font-bold">{l.name}</span>{canEdit && <button onClick={() => deleteItem('loans', l.id)} className="text-red-500">✕</button>}</div><div className="grid grid-cols-3 gap-1 text-center"><div className="bg-red-950/30 p-1 rounded"><p className="text-[10px] text-gray-500">Sanc</p><p className="font-bold">{formatINR(l.totalAmount)}</p></div><div className="bg-red-950/30 p-1 rounded"><p className="text-[10px] text-gray-500">Disb</p><p className="font-bold text-green-400">{formatINR(l.disbursedAmount)}</p></div><div className="bg-red-950/30 p-1 rounded"><p className="text-[10px] text-gray-500">Bal</p><p className="font-bold text-red-400">{formatINR(l.disbursedAmount - l.usedAmount)}</p></div></div></div>))}
            </div>
            <div className="bg-black/60 border border-purple-900/30 p-3 rounded">
              <p className="text-purple-400 font-bold text-sm mb-2">💳 EMI</p>
              {canEdit && <div className="flex flex-wrap gap-1 mb-2 text-xs"><input type="date" value={newEmi.date} onChange={e => setNewEmi({ ...newEmi, date: e.target.value })} className="bg-black border border-purple-900/50 rounded px-2 py-1 text-white" /><input value={newEmi.loanName} onChange={e => setNewEmi({ ...newEmi, loanName: e.target.value })} placeholder="Loan" className="bg-black border border-purple-900/50 rounded px-2 py-1 text-white flex-1" /><input type="number" value={newEmi.amount} onChange={e => setNewEmi({ ...newEmi, amount: e.target.value })} placeholder="₹" className="bg-black border border-purple-900/50 rounded px-2 py-1 text-white w-16" /><button onClick={addEmi} className="bg-purple-600 px-2 py-1 rounded font-bold">+</button></div>}
              <div className="space-y-1 max-h-32 overflow-y-auto text-xs">{emiPayments.sort((a, b) => b.date?.localeCompare(a.date)).map(e => (<div key={e.id} className="flex justify-between bg-black/40 p-2 rounded"><span><b>{e.date}</b> {e.loanName}</span><span className="flex gap-2"><b className="text-purple-400">{formatINR(e.amount)}</b>{canEdit && <button onClick={() => deleteItem('emiPayments', e.id)} className="text-red-500">✕</button>}</span></div>))}</div>
              <div className="mt-2 p-2 bg-purple-900/20 rounded text-center text-purple-300 text-sm">Total: <span className="font-black">{formatINR(totalEMI)}</span></div>
            </div>
          </div>
        )}

        {/* SIP */}
        {activeTab === 'sip' && !compareMode && (
          <div className="bg-black/60 border border-blue-900/30 p-3 rounded">
            <p className="text-blue-400 font-bold text-sm mb-2">📈 SIP</p>
            {canEdit && <div className="flex flex-wrap gap-1 mb-2 text-xs"><input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className="bg-black border border-blue-900/50 rounded px-2 py-1 text-white" /><input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="Fund" className="bg-black border border-blue-900/50 rounded px-2 py-1 text-white flex-1" /><input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="₹" className="bg-black border border-blue-900/50 rounded px-2 py-1 text-white w-16" /><button onClick={addSip} className="bg-blue-600 px-2 py-1 rounded font-bold">+</button></div>}
            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {Object.entries(groupByMonth(filteredSips)).map(([m, entries]: any) => (
                <div key={m}><div className="flex justify-between bg-blue-900/20 px-2 py-1 rounded text-blue-400 font-bold"><span>{getMonthName(m)}</span><span>{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span></div>
                  {entries.map((e: any) => (<div key={e.id} className="flex justify-between bg-black/40 p-2 rounded mt-1 ml-2"><div><p className="font-bold">{e.date}</p><p className="text-gray-500 text-[10px]">{e.name}</p></div><div className="flex items-center gap-2"><span className="text-blue-400 font-bold">{formatINR(e.amount)}</span>{canEdit && <button onClick={() => deleteItem('sips', e.id)} className="text-red-500">✕</button>}</div></div>))}
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 bg-blue-900/20 rounded text-center text-blue-300 text-sm">Total: <span className="font-black text-lg">{formatINR(totalSIP)}</span></div>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-6 tracking-widest">I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE</p>
      </div>
    </div>
  );
}
