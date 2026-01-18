"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
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

// ALLOWED USERS - Only these emails can access
const ALLOWED_USERS = [
  'akshaygovind06@gmail.com',
  'toshnilgovind@gmail.com',
  'dsgovind10@gmail.com'
];

const EMAILJS_SERVICE = 'service_8hw0whx';
const EMAILJS_TEMPLATE = 'template_ky8myvn';
const EMAILJS_KEY = 'Ay5q7gGs4QQyimuMN';

const BATMAN_QUOTES = [
  { quote: "It's not who I am underneath, but what I do that defines me.", source: "Batman Begins" },
  { quote: "Why do we fall? So we can learn to pick ourselves up.", source: "Batman Begins" },
  { quote: "The night is darkest just before the dawn.", source: "The Dark Knight" },
  { quote: "A hero can be anyone, even a man doing something as simple as saving money.", source: "The Dark Knight Rises" },
  { quote: "You either die broke, or live long enough to see yourself become financially stable.", source: "The Dark Knight" },
];

const ALFRED_ADVICE = [
  "Perhaps a bit of restraint on dining out would serve you well, Master Wayne.",
  "I've noticed your entertainment expenses are rather... generous this month, sir.",
  "Excellent saving habits, sir. Your parents would be proud.",
  "Might I suggest setting aside more for emergencies, Master Wayne?",
  "Your grocery spending seems quite reasonable. Well done, sir.",
  "I see the transport costs are climbing. Perhaps the Batmobile needs fewer joyrides?",
  "A wise man once said: 'Save for a rainy day.' In Gotham, it's always raining, sir.",
  "Your financial discipline rivals your combat training, Master Wayne.",
  "If I may be so bold, sir - that subscription seems rather unnecessary.",
  "Splendid work on keeping the utilities in check this month.",
];

export default function FinanceTracker() {
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('batcave');
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<any[]>([]);
  const [emiPayments, setEmiPayments] = useState<any[]>([]);
  const [sips, setSips] = useState<any[]>([]);
  const [newIncome, setNewIncome] = useState({ date: '', description: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ date: '', category: '', description: '', amount: '' });
  const [newEmi, setNewEmi] = useState({ date: '', loanName: '', amount: '' });
  const [newSip, setNewSip] = useState({ date: '', name: '', amount: '' });
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [showBats, setShowBats] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(BATMAN_QUOTES[0]);
  const [emailSending, setEmailSending] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [alfredAdvice, setAlfredAdvice] = useState('');
  const [showLightning, setShowLightning] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [showMusicPrompt, setShowMusicPrompt] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const seed = new Date().toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    setDailyQuote(BATMAN_QUOTES[seed % BATMAN_QUOTES.length]);
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');
  }, []);

  // Lightning effect
  useEffect(() => {
    if (!darkMode) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setShowLightning(true);
        setTimeout(() => setShowLightning(false), 150);
        setTimeout(() => {
          if (Math.random() > 0.5) {
            setShowLightning(true);
            setTimeout(() => setShowLightning(false), 100);
          }
        }, 200);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [darkMode]);

  // Alfred advice generator
  useEffect(() => {
    if (expenseEntries.length > 0) {
      const advice = ALFRED_ADVICE[Math.floor(Math.random() * ALFRED_ADVICE.length)];
      setAlfredAdvice(advice);
    }
  }, [expenseEntries]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', String(!darkMode));
  };

  // Music functions
  const playMusic = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
      setMusicPlaying(true);
    }
    setShowMusicPrompt(false);
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (musicPlaying) {
        audioRef.current.pause();
        setMusicPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setMusicPlaying(true);
      }
    }
  };

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => setExchangeRate(data.rates.INR || 83))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_USERS.includes(currentUser.email || '')) {
        setIsAuthorized(true);
        setShowMusicPrompt(true);
      } else {
        setIsAuthorized(false);
      }
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubs = [
      onSnapshot(collection(db, 'income'), (s) => { setIncomeEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'expenses'), (s) => setExpenseEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'emiPayments'), (s) => setEmiPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'sips'), (s) => setSips(s.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsubs.forEach(u => u());
  }, [isAuthorized]);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (!ALLOWED_USERS.includes(result.user.email || '')) {
        await signOut(auth);
        alert('❌ Access Denied!\n\nYou are not authorized to access The Dark Wallet.\n\nOnly the Bat-Family can enter.');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      alert(`Login failed: ${error.message}`);
    }
  };

  const logout = () => signOut(auth);
  const triggerBats = useCallback(() => { setShowBats(true); setTimeout(() => setShowBats(false), 3000); }, []);

  const addIncome = async () => {
    if (newIncome.date && newIncome.amount) {
      await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount) });
      setNewIncome({ date: '', description: '', amount: '' });
      triggerBats();
    }
  };

  const addExpense = async () => {
    if (newExpense.date && newExpense.amount && newExpense.category) {
      await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount) });
      setNewExpense({ date: '', category: '', description: '', amount: '' });
    }
  };

  const addEmi = async () => {
    if (newEmi.date && newEmi.amount) {
      await addDoc(collection(db, 'emiPayments'), { ...newEmi, amount: parseFloat(newEmi.amount) });
      setNewEmi({ date: '', loanName: '', amount: '' });
    }
  };

  const addSip = async () => {
    if (newSip.date && newSip.amount) {
      await addDoc(collection(db, 'sips'), { ...newSip, amount: parseFloat(newSip.amount) });
      setNewSip({ date: '', name: '', amount: '' });
    }
  };

  const deleteItem = async (col: string, id: string) => {
    await deleteDoc(doc(db, col, id));
  };

  const filterByMonth = (entries: any[], month: string) =>
    month === 'all' ? entries : entries.filter(e => e.date?.startsWith(month));

  const filteredIncome = filterByMonth(incomeEntries, selectedMonth);
  const filteredExpenses = filterByMonth(expenseEntries, selectedMonth);
  const filteredEmi = filterByMonth(emiPayments, selectedMonth);
  const filteredSips = filterByMonth(sips, selectedMonth);

  const totalIncome = filteredIncome.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalEMI = filteredEmi.reduce((s, e) => s + e.amount, 0);
  const totalSIP = filteredSips.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  const categoryTotals = filteredExpenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const groupByMonth = (entries: any[]) => {
    const sorted = [...entries].sort((a, b) => b.date?.localeCompare(a.date));
    const grouped: any = {};
    sorted.forEach(e => {
      const m = e.date?.slice(0, 7) || 'unknown';
      if (!grouped[m]) grouped[m] = [];
      grouped[m].push(e);
    });
    return grouped;
  };

  const getMonthlyTotals = (entries: any[]) => {
    const totals: Record<string, number> = {};
    entries.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (m) totals[m] = (totals[m] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const categories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Food', 'Healthcare', 'Tuition', 'Books', 'Entertainment', 'Splitwise', 'Shopping', 'Other'];
  const categoryColors: any = {
    Rent: '#dc2626', Groceries: '#ea580c', Utilities: '#ca8a04', Transport: '#65a30d',
    Food: '#16a34a', Healthcare: '#0d9488', Tuition: '#0891b2', Books: '#2563eb',
    Entertainment: '#7c3aed', Splitwise: '#c026d3', Shopping: '#db2777', Other: '#64748b'
  };

  const formatUSD = (amt: number) => '$' + (amt || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (amt: number) => '₹' + Math.round((amt || 0) * exchangeRate).toLocaleString();
  
  const getMonthName = (m: string) => {
    try {
      const [year, month] = m.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch { return m; }
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
    } catch { alert('Failed to send email'); }
    setEmailSending(false);
  };

  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    const pdf = new jsPDF();
    const pw = pdf.internal.pageSize.width;

    // Header
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, pw, 45, 'F');
    pdf.setTextColor(220, 38, 38);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('THE DARK WALLET', pw / 2, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.setTextColor(150);
    pdf.text('VENGEANCE • SHADOWS • SAVINGS', pw / 2, 30, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`${selectedMonth === 'all' ? 'All Time Report' : getMonthName(selectedMonth)} | Generated: ${new Date().toLocaleDateString()}`, pw / 2, 38, { align: 'center' });

    // Summary
    const summaryData = [
      ['💰 Total Income', formatUSD(totalIncome), formatINR(totalIncome)],
      ['💸 Total Expenses', formatUSD(totalExpenses), formatINR(totalExpenses)],
      ['📊 Balance', formatUSD(balance), formatINR(balance)],
      ['🏦 EMI Paid', '-', formatINR(totalEMI)],
      ['📈 SIP Invested', '-', formatINR(totalSIP)]
    ];

    (pdf as any).autoTable({
      startY: 52,
      head: [['Category', 'USD', 'INR']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11 }
    });

    // Alfred's Advice
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    const adviceY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(`🎩 Alfred says: "${alfredAdvice}"`, 14, adviceY);

    // Income Table
    if (filteredIncome.length) {
      pdf.setFontSize(14);
      pdf.setTextColor(34, 197, 94);
      pdf.text('💰 INCOME', 14, adviceY + 15);
      (pdf as any).autoTable({
        startY: adviceY + 20,
        head: [['Date', 'Description', 'Amount (USD)', 'Amount (INR)']],
        body: filteredIncome.map(e => [e.date, e.description || '-', formatUSD(e.amount), formatINR(e.amount)]),
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] }
      });
    }

    // Expense Table
    if (filteredExpenses.length) {
      pdf.setFontSize(14);
      pdf.setTextColor(220, 38, 38);
      pdf.text('💸 EXPENSES', 14, (pdf as any).lastAutoTable.finalY + 15);
      (pdf as any).autoTable({
        startY: (pdf as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Category', 'Description', 'Amount (USD)']],
        body: filteredExpenses.map(e => [e.date, e.category, e.description || '-', formatUSD(e.amount)]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] }
      });
    }

    // Category Breakdown
    if (Object.keys(categoryTotals).length) {
      pdf.setFontSize(14);
      pdf.setTextColor(124, 58, 237);
      pdf.text('📊 CATEGORY BREAKDOWN', 14, (pdf as any).lastAutoTable.finalY + 15);
      (pdf as any).autoTable({
        startY: (pdf as any).lastAutoTable.finalY + 20,
        head: [['Category', 'Amount (USD)', 'Percentage']],
        body: Object.entries(categoryTotals).sort((a: any, b: any) => b[1] - a[1]).map(([cat, amt]: any) => [
          cat, formatUSD(amt), `${((amt / totalExpenses) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] }
      });
    }

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100);
      pdf.text('I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE', pw / 2, pdf.internal.pageSize.height - 10, { align: 'center' });
      pdf.text(`Page ${i} of ${pageCount}`, pw - 20, pdf.internal.pageSize.height - 10);
    }

    pdf.save(`dark-wallet-${selectedMonth || 'all'}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Auto Monthly Report (check on load)
  useEffect(() => {
    if (!isAuthorized) return;
    const lastReport = localStorage.getItem('lastMonthlyReport');
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (lastReport !== currentMonth && new Date().getDate() === 1) {
      // It's the 1st of a new month - generate report
      localStorage.setItem('lastMonthlyReport', currentMonth);
      // Auto-send email report
      setTimeout(() => {
        sendEmail();
      }, 3000);
    }
  }, [isAuthorized]);

  const theme = {
    bg: darkMode
      ? 'linear-gradient(180deg, #1a0000 0%, #0d0000 50%, #000 100%)'
      : 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    card: darkMode ? 'bg-gradient-to-br from-black/80 to-red-950/20 border-red-900/30' : 'bg-white border-gray-300',
    cardInner: darkMode ? 'bg-black/50' : 'bg-gray-50',
    input: darkMode ? 'bg-black/80 border-red-900/50 text-white' : 'bg-white border-gray-300 text-gray-900',
    text: darkMode ? 'text-gray-100' : 'text-gray-900',
    textMuted: darkMode ? 'text-gray-400' : 'text-gray-600',
    textMuted2: darkMode ? 'text-gray-500' : 'text-gray-500',
  };

  // Pie Chart Component
  const PieChart = ({ data }: { data: any }) => {
    const total = Object.values(data).reduce((s: number, v: any) => s + v, 0);
    if (total === 0) return <p className={`${theme.textMuted} text-center py-8`}>No expense data yet</p>;
    let cum = 0;
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg viewBox="0 0 100 100" className="w-48 h-48">
          {entries.map(([cat, amt]: any) => {
            const pct = (amt / total) * 100;
            const start = (cum / 100) * 360;
            cum += pct;
            const end = (cum / 100) * 360;
            const sx = 50 + 40 * Math.cos((start - 90) * Math.PI / 180);
            const sy = 50 + 40 * Math.sin((start - 90) * Math.PI / 180);
            const ex = 50 + 40 * Math.cos((end - 90) * Math.PI / 180);
            const ey = 50 + 40 * Math.sin((end - 90) * Math.PI / 180);
            return (
              <path key={cat} d={`M 50 50 L ${sx} ${sy} A 40 40 0 ${pct > 50 ? 1 : 0} 1 ${ex} ${ey} Z`}
                fill={categoryColors[cat] || '#666'} className="hover:opacity-80 transition-opacity cursor-pointer" />
            );
          })}
          <circle cx="50" cy="50" r="20" fill={darkMode ? "#0a0a0a" : "#fff"} />
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

  // ==================== LOGIN SCREEN ====================
  if (authChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-6xl animate-pulse">🦇</div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
        {/* Animated Rain */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-red-500/20 to-transparent"
              style={{ left: `${Math.random() * 100}%`, height: `${20 + Math.random() * 30}px`,
                animation: `rain ${0.4 + Math.random() * 0.4}s linear infinite`, animationDelay: `${Math.random() * 2}s` }} />
          ))}
        </div>

        {/* Lightning */}
        {showLightning && <div className="fixed inset-0 bg-white/20 z-40 pointer-events-none" />}

        {/* Red Glow */}
        <div className="fixed top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 w-72 h-72 bg-red-900/30 rounded-full blur-3xl pointer-events-none"></div>

        <style>{`
          @keyframes rain { 0% { transform: translateY(-100vh); } 100% { transform: translateY(100vh); } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(220,38,38,0.8)); } 50% { filter: drop-shadow(0 0 40px rgba(220,38,38,1)); } }
        `}</style>

        <div className="relative z-10 text-center p-8">
          {/* Batman Symbol */}
          <svg viewBox="0 0 100 32" className="w-48 h-20 mx-auto mb-6" style={{ animation: 'glow 2s ease-in-out infinite, float 3s ease-in-out infinite' }}>
            <path fill="#dc2626" d="M50 0 C50 0 45 8 40 10 C35 12 25 8 20 12 C15 16 12 14 8 16 C4 18 0 16 0 16 C0 16 8 20 12 22 C16 24 20 32 25 32 C30 32 38 24 42 22 C46 20 50 28 50 28 C50 28 54 20 58 22 C62 24 70 32 75 32 C80 32 84 24 88 22 C92 20 100 16 100 16 C100 16 96 18 92 16 C88 14 85 16 80 12 C75 8 65 12 60 10 C55 8 50 0 50 0 Z" />
          </svg>

          <h1 className="text-5xl md:text-7xl font-black tracking-wider mb-4" style={{ color: '#dc2626', textShadow: '0 0 50px rgba(220,38,38,0.8)' }}>
            THE DARK WALLET
          </h1>
          <p className="text-gray-500 tracking-[0.4em] text-sm mb-12">VENGEANCE • SHADOWS • SAVINGS</p>

          <button onClick={login}
            className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-red-900/50 hover:scale-105 transition-all flex items-center gap-3 mx-auto border border-red-600/50">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Enter the Batcave
          </button>

          <p className="text-gray-600 text-sm mt-8">🔒 Authorized Bat-Family Members Only</p>

          {user && !isAuthorized && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-800 rounded-xl">
              <p className="text-red-400">❌ Access Denied</p>
              <p className="text-gray-500 text-sm mt-1">{user.email} is not authorized</p>
              <button onClick={logout} className="mt-3 text-red-500 underline text-sm">Try another account</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== MAIN APP ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-pulse mb-4">🦇</div>
          <p className="text-gray-500">Loading the Batcave...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.text} relative overflow-hidden`} style={{ background: theme.bg }}>
      {/* Audio Element for Batman Theme */}
      <audio ref={audioRef} loop>
        <source src="/YTDown.com_YouTube_The-Batman-Official-Soundtrack-It-s-Rain_Media_IhHvaR1hFYs_001_1080p.mp3" type="audio/mpeg" />
      </audio>

      {/* Music Prompt Modal */}
      {showMusicPrompt && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-red-900/50 rounded-2xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">🎵</div>
            <h3 className="text-xl font-bold text-red-500 mb-2">Enable Dark Atmosphere?</h3>
            <p className="text-gray-400 mb-6">Play background music for the full Gotham experience</p>
            <div className="flex gap-4 justify-center">
              <button onClick={playMusic} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                🎵 Enable Music
              </button>
              <button onClick={() => setShowMusicPrompt(false)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-bold transition-colors">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightning Flash */}
      {showLightning && <div className="fixed inset-0 bg-white/30 z-40 pointer-events-none" />}

      {/* Animated Rain */}
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-red-500/20 to-transparent"
              style={{ left: `${Math.random() * 100}%`, height: `${20 + Math.random() * 30}px`,
                animation: `rain ${0.4 + Math.random() * 0.4}s linear infinite`, animationDelay: `${Math.random() * 2}s` }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes rain { 0% { transform: translateY(-100vh); } 100% { transform: translateY(100vh); } }
        @keyframes flyBat { 0% { transform: translateX(-50px) translateY(0); opacity: 1; } 100% { transform: translateX(100vw) translateY(-50px); opacity: 0; } }
      `}</style>

      {/* Flying Bats */}
      {showBats && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="absolute text-4xl" style={{ left: '-50px', top: `${15 + Math.random() * 50}%`,
              animation: `flyBat ${0.8 + Math.random() * 0.5}s ease-out forwards`, animationDelay: `${i * 0.07}s` }}>🦇</div>
          ))}
        </div>
      )}

      {/* Red Glow */}
      {darkMode && (
        <>
          <div className="fixed top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-72 h-72 bg-red-900/15 rounded-full blur-3xl pointer-events-none"></div>
        </>
      )}

      <div className="max-w-6xl mx-auto relative z-10 p-4 md:p-6">
        {/* Top Bar */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <div className="flex items-center gap-3">
            <span className={`${darkMode ? 'bg-red-900/60 text-red-300 border border-red-800/50' : 'bg-red-100 text-red-700 border border-red-200'} px-4 py-2 rounded-full font-medium text-sm`}>
              💱 ₹{exchangeRate.toFixed(2)}
            </span>
            <button onClick={toggleTheme} className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${darkMode ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={toggleMusic} className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${musicPlaying ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {musicPlaying ? '🔊 Music On' : '🔇 Music Off'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${theme.textMuted} hidden sm:inline text-sm`}>{user.email?.split('@')[0]}</span>
            <button onClick={logout} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 100 32" className="w-36 h-14 mx-auto mb-3" style={{ filter: darkMode ? 'drop-shadow(0 0 20px rgba(220,38,38,0.9))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))' }}>
            <path fill="#dc2626" d="M50 0 C50 0 45 8 40 10 C35 12 25 8 20 12 C15 16 12 14 8 16 C4 18 0 16 0 16 C0 16 8 20 12 22 C16 24 20 32 25 32 C30 32 38 24 42 22 C46 20 50 28 50 28 C50 28 54 20 58 22 C62 24 70 32 75 32 C80 32 84 24 88 22 C92 20 100 16 100 16 C100 16 96 18 92 16 C88 14 85 16 80 12 C75 8 65 12 60 10 C55 8 50 0 50 0 Z" />
          </svg>
          <h1 className="text-4xl md:text-6xl font-black tracking-wider mb-2" style={{ color: '#dc2626', textShadow: darkMode ? '0 0 40px rgba(220,38,38,0.6)' : 'none' }}>
            THE DARK WALLET
          </h1>
          <p className={`${theme.textMuted} tracking-[0.3em] text-sm font-medium`}>VENGEANCE • SHADOWS • SAVINGS</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${theme.input} border rounded-xl px-5 py-3 font-medium text-sm min-w-[180px]`}>
            <option value="all">🦇 ALL TIME</option>
            {Array.from({ length: 24 }, (_, i) => {
              const d = new Date(2025, i, 1);
              return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
            })}
          </select>
          <button onClick={generatePDF} className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors">
            📄 Download PDF
          </button>
          <button onClick={sendEmail} disabled={emailSending} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
            {emailSending ? '⏳...' : '📧 Email Report'}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {[
            { id: 'batcave', icon: '🦇', name: 'BATCAVE' },
            { id: 'intel', icon: '📊', name: 'INTEL' },
            { id: 'income', icon: '💰', name: 'CASH IN' },
            { id: 'expenses', icon: '💸', name: 'CASH OUT' },
            { id: 'emi', icon: '🏦', name: 'EMI' },
            { id: 'sip', icon: '📈', name: 'SIP' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : darkMode ? 'bg-black/60 border border-red-900/30 text-gray-300 hover:bg-red-900/20' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>

        {/* Alfred's Advice */}
        {activeTab === 'batcave' && alfredAdvice && (
          <div className={`${theme.card} border rounded-2xl p-4 mb-6 flex items-start gap-4`}>
            <div className="text-4xl">🎩</div>
            <div>
              <p className="text-yellow-500 font-bold text-sm mb-1">ALFRED SAYS:</p>
              <p className={`${theme.textMuted} italic`}>"{alfredAdvice}"</p>
            </div>
          </div>
        )}

        {/* BATCAVE */}
        {activeTab === 'batcave' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'TOTAL INCOME', value: formatUSD(totalIncome), sub: formatINR(totalIncome), color: 'text-green-500' },
                { label: 'TOTAL EXPENSES', value: formatUSD(totalExpenses), sub: formatINR(totalExpenses), color: 'text-red-500' },
                { label: 'BALANCE', value: formatUSD(balance), sub: formatINR(balance), color: balance >= 0 ? 'text-green-500' : 'text-red-500' },
                { label: 'EMI PAID', value: formatINR(totalEMI), sub: '', color: 'text-purple-500' },
                { label: 'SIP INVESTED', value: formatINR(totalSIP), sub: '', color: 'text-blue-500' }
              ].map((card, i) => (
                <div key={i} className={`${theme.card} border rounded-2xl p-5`}>
                  <p className={`${card.color} text-xs font-bold uppercase tracking-wide mb-1`}>{card.label}</p>
                  <p className={`text-2xl md:text-3xl font-black ${card.color}`}>{card.value}</p>
                  {card.sub && <p className={`${theme.textMuted2} text-sm`}>{card.sub}</p>}
                </div>
              ))}
            </div>
            <div className={`${theme.card} border rounded-2xl p-6 text-center`}>
              <p className={`${theme.textMuted} italic text-lg`}>"{dailyQuote.quote}"</p>
              <p className="text-red-500 font-bold mt-2">— {dailyQuote.source}</p>
            </div>
          </div>
        )}

        {/* INTEL */}
        {activeTab === 'intel' && (
          <div className={`${theme.card} border rounded-2xl p-6`}>
            <p className="text-red-500 font-bold text-xl mb-6">📊 EXPENSE BREAKDOWN</p>
            <PieChart data={categoryTotals} />
          </div>
        )}

        {/* INCOME */}
        {activeTab === 'income' && (
          <div className={`${theme.card} border rounded-2xl p-6`}>
            <p className="text-green-500 font-bold text-xl mb-4">💰 CASH IN</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className={`${theme.input} border rounded-lg px-4 py-2.5`} />
              <input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-4 py-2.5 flex-1 min-w-[150px]`} />
              <input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="Amount $" className={`${theme.input} border rounded-lg px-4 py-2.5 w-32`} />
              <button onClick={addIncome} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-lg font-bold">+ Add</button>
            </div>
            <div className={`${theme.cardInner} rounded-xl p-4 mb-6`}>
              <p className={`${theme.text} font-bold mb-3`}>📊 Monthly Summary</p>
              <table className="w-full text-sm">
                <thead><tr className={`${theme.textMuted} border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  <th className="text-left py-2 px-3">Month</th><th className="text-right py-2 px-3">USD</th><th className="text-right py-2 px-3">INR</th>
                </tr></thead>
                <tbody>{getMonthlyTotals(filteredIncome).map(([month, total]) => (
                  <tr key={month} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <td className={`${theme.text} py-2 px-3`}>{getMonthName(month)}</td>
                    <td className="text-green-500 py-2 px-3 text-right font-bold">{formatUSD(total)}</td>
                    <td className={`${theme.textMuted} py-2 px-3 text-right`}>{formatINR(total)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr className={darkMode ? 'bg-green-900/20' : 'bg-green-100'}>
                  <td className="text-green-500 py-3 px-3 font-bold">TOTAL</td>
                  <td className="text-green-500 py-3 px-3 text-right font-black">{formatUSD(totalIncome)}</td>
                  <td className={`${theme.textMuted} py-3 px-3 text-right font-bold`}>{formatINR(totalIncome)}</td>
                </tr></tfoot>
              </table>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredIncome)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-green-600/20 px-4 py-2 rounded-lg text-green-500 font-bold mb-2">
                    <span>{getMonthName(m)}</span><span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mb-2 ml-4`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.description}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-500 font-bold">{formatUSD(e.amount)}</span>
                        <button onClick={() => deleteItem('income', e.id)} className="text-red-500 hover:text-red-400 text-xl">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {activeTab === 'expenses' && (
          <div className={`${theme.card} border rounded-2xl p-6`}>
            <p className="text-red-500 font-bold text-xl mb-4">💸 CASH OUT</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className={`${theme.input} border rounded-lg px-4 py-2.5`} />
              <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className={`${theme.input} border rounded-lg px-4 py-2.5`}>
                <option value="">Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className={`${theme.input} border rounded-lg px-4 py-2.5 flex-1 min-w-[120px]`} />
              <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="$" className={`${theme.input} border rounded-lg px-4 py-2.5 w-28`} />
              <button onClick={addExpense} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-lg font-bold">+ Add</button>
            </div>
            <div className={`${theme.cardInner} rounded-xl p-4 mb-6`}>
              <p className={`${theme.text} font-bold mb-3`}>📊 Monthly Summary</p>
              <table className="w-full text-sm">
                <thead><tr className={`${theme.textMuted} border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  <th className="text-left py-2 px-3">Month</th><th className="text-right py-2 px-3">USD</th><th className="text-right py-2 px-3">INR</th>
                </tr></thead>
                <tbody>{getMonthlyTotals(filteredExpenses).map(([month, total]) => (
                  <tr key={month} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <td className={`${theme.text} py-2 px-3`}>{getMonthName(month)}</td>
                    <td className="text-red-500 py-2 px-3 text-right font-bold">{formatUSD(total)}</td>
                    <td className={`${theme.textMuted} py-2 px-3 text-right`}>{formatINR(total)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr className={darkMode ? 'bg-red-900/20' : 'bg-red-100'}>
                  <td className="text-red-500 py-3 px-3 font-bold">TOTAL</td>
                  <td className="text-red-500 py-3 px-3 text-right font-black">{formatUSD(totalExpenses)}</td>
                  <td className={`${theme.textMuted} py-3 px-3 text-right font-bold`}>{formatINR(totalExpenses)}</td>
                </tr></tfoot>
              </table>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredExpenses)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-red-600/20 px-4 py-2 rounded-lg text-red-500 font-bold mb-2">
                    <span>{getMonthName(m)}</span><span>{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mb-2 ml-4`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.description} • <span style={{ color: categoryColors[e.category] }}>{e.category}</span></p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-500 font-bold">{formatUSD(e.amount)}</span>
                        <button onClick={() => deleteItem('expenses', e.id)} className="text-red-500 hover:text-red-400 text-xl">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMI */}
        {activeTab === 'emi' && (
          <div className={`${theme.card} border rounded-2xl p-6`}>
            <p className="text-purple-500 font-bold text-xl mb-4">🏦 EMI PAYMENTS</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="date" value={newEmi.date} onChange={e => setNewEmi({ ...newEmi, date: e.target.value })} className={`${theme.input} border rounded-lg px-4 py-2.5`} />
              <input value={newEmi.loanName} onChange={e => setNewEmi({ ...newEmi, loanName: e.target.value })} placeholder="Loan Name" className={`${theme.input} border rounded-lg px-4 py-2.5 flex-1`} />
              <input type="number" value={newEmi.amount} onChange={e => setNewEmi({ ...newEmi, amount: e.target.value })} placeholder="₹" className={`${theme.input} border rounded-lg px-4 py-2.5 w-28`} />
              <button onClick={addEmi} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-bold">+ Add</button>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredEmi)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-purple-600/20 px-4 py-2 rounded-lg text-purple-500 font-bold mb-2">
                    <span>{getMonthName(m)}</span><span>{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mb-2 ml-4`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.loanName}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-bold">{formatINR(e.amount)}</span>
                        <button onClick={() => deleteItem('emiPayments', e.id)} className="text-red-500 hover:text-red-400 text-xl">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-purple-600/20 rounded-xl text-center">
              <p className="text-purple-500">Total EMI: <span className="font-black text-2xl">{formatINR(totalEMI)}</span></p>
            </div>
          </div>
        )}

        {/* SIP */}
        {activeTab === 'sip' && (
          <div className={`${theme.card} border rounded-2xl p-6`}>
            <p className="text-blue-500 font-bold text-xl mb-4">📈 SIP INVESTMENTS</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className={`${theme.input} border rounded-lg px-4 py-2.5`} />
              <input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="Fund Name" className={`${theme.input} border rounded-lg px-4 py-2.5 flex-1`} />
              <input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="₹" className={`${theme.input} border rounded-lg px-4 py-2.5 w-28`} />
              <button onClick={addSip} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold">+ Add</button>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredSips)).map(([m, entries]: any) => (
                <div key={m}>
                  <div className="flex justify-between bg-blue-600/20 px-4 py-2 rounded-lg text-blue-500 font-bold mb-2">
                    <span>{getMonthName(m)}</span><span>{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className={`flex justify-between ${theme.cardInner} p-3 rounded-lg mb-2 ml-4`}>
                      <div><p className={`${theme.text} font-bold`}>{e.date}</p><p className={`${theme.textMuted2} text-sm`}>{e.name}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-500 font-bold">{formatINR(e.amount)}</span>
                        <button onClick={() => deleteItem('sips', e.id)} className="text-red-500 hover:text-red-400 text-xl">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-600/20 rounded-xl text-center">
              <p className="text-blue-500">Total SIP: <span className="font-black text-2xl">{formatINR(totalSIP)}</span></p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className={`text-center ${theme.textMuted2} text-xs mt-10 tracking-[0.2em]`}>
          I AM VENGEANCE • I AM THE NIGHT • I AM FINANCIALLY RESPONSIBLE
        </p>
      </div>
    </div>
  );
}
