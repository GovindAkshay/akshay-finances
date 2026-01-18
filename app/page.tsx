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
  const [darkMode, setDarkMode] = useState(true);

  const canEdit = user && EDITORS.includes(user.email);

  useEffect(() => {
    const seed = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    setDailyQuote(BATMAN_QUOTES[seed % BATMAN_QUOTES.length]);
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');
  }, []);

  const toggleTheme = () => { setDarkMode(!darkMode); localStorage.setItem('darkMode', String(!darkMode)); };

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
        to_email: 'akshaygovind06@gmail.com', to_name: 'Akshay',
        month: selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth),
        income: formatUSD(totalIncome) + ' (' + formatINR(totalIncome) + ')',
        expenses: formatUSD(totalExpenses) + ' (' + formatINR(totalExpenses) + ')',
        balance: formatUSD(balance) + ' (' + formatINR(balance) + ')',
        emi: formatINR(totalEMI), sip: formatINR(totalSIP),
        rate: '1 USD = ₹' + exchangeRate.toFixed(2)
      }, EMAILJS_KEY);
      alert('📧 Email sent!');
    } catch { alert('Failed to send'); }
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
    pdf.text((selectedMonth === 'all' ? 'All Time' : getMonthName(selectedMonth)) + ' | 1 USD = ₹' + exchangeRate.toFixed(2), pw / 2, 28, { align: 'center' });
    const summaryData = [['Income', formatUSD(totalIncome), formatINR(totalIncome)], ['Expenses', formatUSD(totalExpenses), formatINR(totalExpenses)], ['Balance', formatUSD(balance), formatINR(balance)], ['EMI', '-', formatINR(totalEMI)], ['SIP', '-', formatINR(totalSIP)]];
    (pdf as any).autoTable({ startY: 45, head: [['', 'USD', 'INR']], body: summaryData, theme: 'grid', headStyles: { fillColor: [220, 38, 38] } });
    if (filteredIncome.length) { (pdf as any).autoTable({ startY: (pdf as any).lastAutoTable.finalY + 10, head: [['Date', 'Description', 'Amount']], body: filteredIncome.map(e => [e.date, e.description || '-', formatUSD(e.amount)]), theme: 'grid', headStyles: { fillColor: [34, 197, 94] } }); }
    if (filteredExpenses.length) { (pdf as any).autoTable({ startY: (pdf as any).lastAutoTable.finalY + 10, head: [['Date', 'Category', 'Amount']], body: filteredExpenses.map(e => [e.date, e.category, formatUSD(e.amount)]), theme: 'grid', headStyles: { fillColor: [220, 38, 38] } }); }
    pdf.save(`dark-wallet-${selectedMonth || 'all'}.pdf`);
  };

  // Theme colors
  const theme = {
    bg: darkMode ? 'linear-gradient(180deg, #0a0000 0%, #1a0505 50%, #000 100%)' : 'linear-gradient(180deg, #f5f5f5 0%, #e5e5e5 50%, #d5d5d5 100%)',
    text: darkMode ? 'text-gray-100' : 'text-gray-800',
    textMuted: darkMode ? 'text-gray-400' : 'text-gray-600',
    textMuted2: darkMode ? 'text-gray-500' : 'text-gray-500',
    card: darkMode ? 'bg-black/60 border-red-900/30' : 'bg-white/80 border-gray-300',
    cardInner: darkMode ? 'bg-black/40' : 'bg-gray-100',
    input: darkMode ? 'bg-black border-red-900/50 text-white' : 'bg-white border-gray-300 text-black',
    red: darkMode ? 'text-red-500' : 'text-red-600',
  };

  const PieChart = ({ data }: { data: any }) => {
    const total = Object.values(data).reduce((s: number, v: any) => s + v, 0);
    if (total === 0) return <p className={`${theme.textMuted} text-center py-4`}>No expense data yet</p>;
    let cum = 0;
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg viewBox="0 0 100 100" className="w-44 h-44">
          {entries.map(([cat, amt]: any) => {
            const pct = (amt / total) * 100, start = (cum / 100) * 360; cum += pct; const end = (cum / 100) * 360;
            const sx = 50 + 40 * Math.cos((start - 90) * Math.PI / 180), sy = 50 + 40 * Math.sin((start - 90) * Math.PI / 180);
            const ex = 50 + 40 * Math.cos((end - 90) * Math.PI / 180), ey = 50 + 40 * Math.sin((end - 90) * Math.PI / 180);
            return <path key={cat} d={`M 50 50 L ${sx} ${sy} A 40 40 0 ${pct > 50 ? 1 : 0} 1 ${ex} ${ey} Z`} fill={categoryColors[cat] || '#666'} className="hover:opacity-80 transition-opacity" />;
          })}
          <circle cx="50" cy="50" r="18" fill={darkMode ? "#0a0a0a" : "#fff"} />
        </svg>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {entries.map(([cat, amt]: any) => (
            <div key={cat} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColors[cat] }}></div>
              <span className={theme.textMuted}>{cat}</span>
              <span className={`${theme.text} font-bold`}>{Math.round((amt / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = ({ data }: { data: any[] }) => {
    if (!data.length) return <p className={`${theme.textMuted} text-center py-4`}>No data yet</p>;
    const max = Math.max(...data.map(([, v]: any) => Math.max(v.income, v.expense)));
    return (
      <div className="flex items-end justify-around gap-2 h-40">
        {data.map(([m, v]: any) => (
          <div key={m} className="flex flex-col items-center flex-1">
            <div className="flex gap-1 items-end h-32">
              <div className="w-5 bg-gradient-to-t from-green-700 to-green-500 rounded-t" style={{ height: `${(v.income / max) * 100}%` }}></div>
              <div className="w-5 bg-gradient-to-t from-red-700 to-red-500 rounded-t" style={{ height: `${(v.expense / max) * 100}%` }}></div>
            </div>
            <span className={`text-xs ${theme.textMuted2} mt-1`}>{new Date(m + '-01').toLocaleString('default', { month: 'short' })}</span>
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
    <div className={`min-h-screen ${theme.text} relative overflow-hidden`} style={{ background: theme.bg }}>
      {/* Rain - Only in Dark Mode */}
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(80)].map((_, i) => (
            <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-gray-400/30 to-transparent" style={{ left: `${Math.random() * 100}%`, height: `${20 + Math.random() * 30}px`, animation: `rain ${0.4 + Math.random() * 0.4}s linear infinite`, animationDelay: `${Math.random() * 2}s` }} />
          ))}
        </div>
      )}
      <style>{`@keyframes rain{0%{transform:translateY(-100vh)}100%{transform:translateY(100vh)}}@keyframes flyBat{0%{transform:translateX(-50px) translateY(0);opacity:1}100%{transform:translateX(100vw) translateY(-50px);opacity:0}}`}</style>

      {/* Gotham Skyline - Fixed & Bigger */}
      {darkMode && (
        <div className="fixed bottom-0 left-0 right-0 h-48 pointer-events-none z-0">
          <svg viewBox="0 0 1400 200" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
            <defs>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>
            </defs>
            <path fill="url(#skyGrad)" d="M0,200 L0,140 L50,140 L50,100 L70,100 L70,70 L90,70 L90,100 L130,100 L130,60 L150,60 L150,40 L180,40 L180,80 L220,80 L220,50 L250,50 L250,30 L280,30 L280,60 L320,60 L320,90 L370,90 L370,50 L400,50 L400,25 L430,25 L430,60 L480,60 L480,100 L530,100 L530,70 L560,70 L560,45 L590,45 L590,75 L640,75 L640,110 L700,110 L700,60 L740,60 L740,35 L770,35 L770,20 L800,20 L800,50 L850,50 L850,85 L900,85 L900,55 L940,55 L940,30 L970,30 L970,65 L1020,65 L1020,95 L1080,95 L1080,60 L1120,60 L1120,40 L1150,40 L1150,70 L1200,70 L1200,100 L1260,100 L1260,130 L1320,130 L1320,150 L1400,150 L1400,200 Z" />
            {/* Glowing windows */}
            {[...Array(60)].map((_, i) => (
              <rect key={i} x={30 + (i % 25) * 55 + Math.random() * 15} y={50 + Math.floor(i / 25) * 50 + Math.random() * 30} width="6" height="10" fill={Math.random() > 0.4 ? '#fbbf24' : '#78350f'} opacity={0.3 + Math.random() * 0.5}>
                <animate attributeName="opacity" values={`${0.3 + Math.random() * 0.4};${0.6 + Math.random() * 0.4};${0.3 + Math.random() * 0.4}`} dur={`${2 + Math.random() * 3}s`} repeatCount="indefinite" />
              </rect>
            ))}
          </svg>
        </div>
      )}

      {/* Flying Bats */}
      {showBats && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute text-4xl" style={{ left: '-50px', top: `${15 + Math.random() * 50}%`, animation: `flyBat ${0.8 + Math.random() * 0.5}s ease-out forwards`, animationDelay: `${i * 0.07}s` }}>🦇</div>
          ))}
        </div>
      )}

      {/* Red Glow - Only Dark Mode */}
      {darkMode && <>
        <div className="fixed top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 w-60 h-60 bg-red-900/20 rounded-full blur-3xl pointer-events-none"></div>
      </>}

      <div className="max-w-5xl mx-auto relative z-10 p-4 md:p-6">
        {/* Top Bar */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`${darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-600'} px-3 py-1 rounded-full font-medium`}>💱 ₹{exchangeRate.toFixed(2)}</span>
            {deferredPrompt && <button onClick={installPWA} className="bg-blue-600 text-white px-3 py-1 rounded-full font-medium">📱 Install App</button>}
            <button onClick={toggleTheme} className={`px-3 py-1 rounded-full font-medium ${darkMode ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'}`}>
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className={`${theme.textMuted} hidden sm:inline`}>{user.email?.split('@')[0]}</span>
                <span className={`px-3 py-1 rounded-full font-medium ${canEdit ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>{canEdit ? '✏️ Editor' : '👁️ Viewer'}</span>
                <button onClick={logout} className="bg-red-600 text-white px-3 py-1 rounded-full font-medium">Logout</button>
              </>
            ) : (
              <button onClick={login} className="bg-white text-black px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition">🔐 Sign In</button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <svg viewBox="0 0 100 40" className="w-20 h-10 mx-auto mb-2" style={{ filter: darkMode ? 'drop-shadow(0 0 20px rgba(220,38,38,0.8))' : 'none' }}>
            <path d="M50 5 L30 20 L0 15 L15 25 L10 35 L30 28 L50 40 L70 28 L90 35 L85 25 L100 15 L70 20 Z" fill="#dc2626" />
          </svg>
          <h1 className="text-3xl md:text-5xl font-black tracking-wider" style={{ color: '#dc2626', textShadow: darkMode ? '0 0 30px rgba(220,38,38,0.6)' : 'none' }}>THE DARK WALLET</h1>
          <p className={`${theme.textMuted} italic text-sm mt-3 max-w-lg mx-auto`}>&ldquo;{dailyQuote.quote}&rdquo; <span className="text-red-500 font-medium">— {dailyQuote.source}</span></p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${theme.input} border rounded-lg px-4 py-2 font-medium`}>
            <option value="all">🦇 ALL TIME</option>
            {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>; })}
          </select>
          <button onClick={generatePDF} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold">📄 PDF</button>
          <button onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold">📱 WhatsApp</button>
          <button onClick={sendEmail} disabled={emailSending} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">{emailSending ? '⏳ Sending...' : '📧 Email'}</button>
          <button onClick={() => setCompareMode(!compareMode)} className={`px-4 py-2 rounded-lg font-bold ${compareMode ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-yellow-400'}`}>📊 Compare</button>
        </div>

        {/* BIGGER Navigation Buttons with Names */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[
            { id: 'dashboard', icon: '🦇', name: 'Dashboard' },
            { id: 'analytics', icon: '📊', name: 'Analytics' },
            { id: 'income', icon: '💰', name: 'Income' },
            { id: 'expenses', icon: '💸', name: 'Expenses' },

            { id: 'sip', icon: '📈', name: 'SIP' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => { setActiveTab(tab.id); setCompareMode(false); }} 
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-105 ${
                activeTab === tab.id && !compareMode 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                  : darkMode 
                    ? 'bg-black/50 border-2 border-red-900/30 text-red-400 hover:bg-red-900/20' 
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg mr-1">{tab.icon}</span> {tab.name}
            </button>
          ))}
        </div>

        {!canEdit && <p className={`text-center text-yellow-500 text-sm mb-4 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'} py-2 rounded-lg`}>{user ? '👁️ View-only mode. Only authorized users can edit.' : '🔐 Sign in with Google to add/edit entries'}</p>}

        {/* Compare Mode */}
        {compareMode && (
          <div className={`${theme.card} border p-4 rounded-xl mb-6`}>
            <h3 className="text-yellow-500 font-bold text-lg mb-4 text-center">📊 Compare Months</h3>
            <div className="flex justify-center gap-4 mb-4">
              <select value={compareMonth1} onChange={e => setCompareMonth1(e.target.value)} className={`${theme.input} border rounded-lg px-3 py-2`}>
                {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>; })}
              </select>
              <span className="text-yellow-500 self-center font-black text-xl">VS</span>
              <select value={compareMonth2} onChange={e => setCompareMonth2(e.target.value)} className={`${theme.input} border rounded-lg px-3 py-2`}>
                {Array.from({ length: 12 }, (_, i) => { const d = new Date(2025, i, 1); return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>; })}
              </select>
            </div>
            {(() => { const d1 = getMonthData(compareMonth1), d2 = getMonthData(compareMonth2); return (
              <div className="grid grid-cols-4 gap-2 text-sm text-center">
                <div className={theme.textMuted}>Metric</div><div className="text-yellow-400 font-bold">{getMonthName(compareMonth1).split(' ')[0]}</div><div className="text-yellow-400 font-bold">{getMonthName(compareMonth2).split(' ')[0]}</div><div className={theme.textMuted}>Change</div>
                <div className={theme.textMuted}>Income</div><div className={theme.text}>{formatUSD(d1.income)}</div><div className={theme.text}>{formatUSD(d2.income)}</div><div className={d2.income >= d1.income ? 'text-green-500' : 'text-red-500'}>{d2.income >= d1.income ? '+' : ''}{formatUSD(d2.income - d1.income)}</div>
                <div className={theme.textMuted}>Expenses</div><div className={theme.text}>{formatUSD(d1.expenses)}</div><div className={theme.text}>{formatUSD(d2.expenses)}</div><div className={d2.expenses <= d1.expenses ? 'text-green-500' : 'text-red-500'}>{d2.expenses > d1.expenses ? '+' : ''}{formatUSD(d2.expenses - d1.expenses)}</div>
                <div className={theme.textMuted}>Balance</div><div className={d1.income - d1.expenses >= 0 ? 'text-green-500' : 'text-red-500'}>{formatUSD(d1.income - d1.expenses)}</div><div className={d2.income - d2.expenses >= 0 ? 'text-green-500' : 'text-red-500'}>{formatUSD(d2.income - d2.expenses)}</div><div></div>
              </div>
            );})()}
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && !compareMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l: 'INCOME', v: formatUSD(totalIncome), s: formatINR(totalIncome), c: 'green' },
                { l: 'EXPENSES', v: formatUSD(totalExpenses), s: formatINR(totalExpenses), c: 'red' },
                { l: 'BALANCE', v: formatUSD(balance), s: formatINR(balance), c: balance >= 0 ? 'green' : 'red' },
                { l: 'EMI', v: formatINR(totalEMI), s: '', c: 'purple' },
                { l: 'SIP', v: formatINR(totalSIP), s: '', c: 'blue' }
              ].map((c, i) => (
                <div key={i} className={`${theme.card} border p-4 rounded-xl`}>
                  <p className={`text-${c.c}-500 text-xs uppercase font-bold tracking-wide`}>{c.l}</p>
                  <p className={`text-2xl font-black text-${c.c}-${darkMode ? '400' : '600'}`}>{c.v}</p>
                  {c.s && <p className={`${theme.textMuted2} text-xs`}>{c.s}</p>}
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && !compareMode && (
          <div className="space-y-4">
            <div className={`${theme.card} border p-5 rounded-xl`}>
              <p className={`${theme.red} font-bold mb-4`}>📊 EXPENSE BREAKDOWN</p>
              <PieChart data={categoryTotals} />
            </div>
            <div className={`${theme.card} border p-5 rounded-xl`}>
              <p className={`${theme.red} font-bold mb-4`}>📈 INCOME VS EXPENSES TREND</p>
              <BarChart data={getMonthlyData()} />
              <div className="flex justify-center gap-6 mt-3 text-sm">
                <span className="text-green-500">● Income</span>
                <span className="text-red-500">● Expenses</span>
              </div>
            </div>
          </div>
        )}

        {/* Income */}
        {activeTab === 'income' && !compareMode && (
          <div className={`${theme.card} border p-4 rounded-xl`}>
            <p className="text-green-500 font-bold text-lg mb-3">💰 CASH IN</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2`} />
                <input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-3 py-2 flex-1 min-w-[120px]`} />
                <input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="Amount $" className={`${theme.input} border rounded-lg px-3 py-2 w-28`} />
                <button onClick={addIncome} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold">+ Add</button>
              </div>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredIncome)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-green-600/20 px-3 py-2 rounded-lg text-green-500 font-bold">
                    <span>{getMonthName(m)}</span>
                    <span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mt-1 ml-3`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.description || 'Income'}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-500 font-bold">{formatUSD(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('income', e.id)} className="text-red-500 hover:text-red-400 text-lg">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-600/20 rounded-lg text-center">
              <p className="text-green-500">Total Cash In: <span className="font-black text-2xl">{formatUSD(totalIncome)}</span> <span className={theme.textMuted}>({formatINR(totalIncome)})</span></p>
            </div>
          </div>
        )}

        {/* Expenses */}
        {activeTab === 'expenses' && !compareMode && (
          <div className={`${theme.card} border p-4 rounded-xl`}>
            <p className="text-red-500 font-bold text-lg mb-3">💸 CASH OUT</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2`} />
                <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2`}>
                  <option value="">Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-3 py-2 flex-1 min-w-[100px]`} />
                <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Amount $" className={`${theme.input} border rounded-lg px-3 py-2 w-28`} />
                <button onClick={addExpense} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold">+ Add</button>
              </div>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredExpenses)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-red-600/20 px-3 py-2 rounded-lg text-red-500 font-bold">
                    <span>{getMonthName(m)}</span>
                    <span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mt-1 ml-3`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.description} • <span className="text-red-400">{e.category}</span></p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-500 font-bold">{formatUSD(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('expenses', e.id)} className="text-red-500 hover:text-red-400 text-lg">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-red-600/20 rounded-lg text-center">
              <p className="text-red-500">Total Cash Out: <span className="font-black text-2xl">{formatUSD(totalExpenses)}</span> <span className={theme.textMuted}>({formatINR(totalExpenses)})</span></p>
            </div>
          </div>
        )}



        {/* SIP */}
        {activeTab === 'sip' && !compareMode && (
          <div className={`${theme.card} border p-4 rounded-xl`}>
            <p className="text-blue-500 font-bold text-lg mb-3">📈 MONTHLY SIP</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className={`${theme.input} border rounded-lg px-3 py-2`} />
                <input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="Fund Name" className={`${theme.input} border rounded-lg px-3 py-2 flex-1`} />
                <input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="Amount ₹" className={`${theme.input} border rounded-lg px-3 py-2 w-28`} />
                <button onClick={addSip} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">+ Add</button>
              </div>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredSips)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-blue-600/20 px-3 py-2 rounded-lg text-blue-500 font-bold">
                    <span>{getMonthName(m)}</span>
                    <span>{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mt-1 ml-3`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.name}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-500 font-bold">{formatINR(e.amount)}</span>
                        {canEdit && <button onClick={() => deleteItem('sips', e.id)} className="text-red-500 hover:text-red-400 text-lg">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-600/20 rounded-lg text-center">
              <p className="text-blue-500">Total SIP Invested: <span className="font-black text-2xl">{formatINR(totalSIP)}</span></p>
            </div>
          </div>
        )}

        <p className={`text-center ${theme.textMuted2} text-xs mt-8 tracking-widest`}>I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE</p>
      </div>
    </div>
  );
}
