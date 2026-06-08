"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

const ALLOWED_USERS = [
  'akshaygovind06@gmail.com',
  'toshnilgovind@gmail.com',
  'dsgovind10@gmail.com'
];

const EMAILJS_SERVICE = 'service_8hw0whx';
const EMAILJS_TEMPLATE = 'template_ky8myvn';
const EMAILJS_KEY = 'Ay5q7gGs4QQyimuMN';

const CATEGORIES = [
  'Rent','Groceries','Utilities','Transport','Pizza','Food','Healthcare',
  'Tuition','Books','Entertainment','Splitwise','Shopping','Subscriptions','Zelle','Other'
];

const ACCOUNT_COLORS: Record<string, string> = {
  'PNC': '#0068b5',
  'Chase Checking': '#117aca',
  'Chase Savings': '#1a9e6e',
};

const ACCOUNT_BG: Record<string, string> = {
  'PNC': 'rgba(0,104,181,0.08)',
  'Chase Checking': 'rgba(17,122,202,0.08)',
  'Chase Savings': 'rgba(26,158,110,0.08)',
};

export default function FinanceTracker() {
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<any[]>([]);
  const [emiPayments, setEmiPayments] = useState<any[]>([]);
  const [sips, setSips] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accountBalances, setAccountBalances] = useState<any>({
    'PNC': 0, 'Chase Checking': 0, 'Chase Savings': 0
  });
  const [accountDocs, setAccountDocs] = useState<any>({});

  const [newIncome, setNewIncome] = useState({ date: '', description: '', amount: '', account: 'Chase Checking' });
  const [newExpense, setNewExpense] = useState({ date: '', category: '', description: '', amount: '', account: 'Chase Checking' });
  const [newEmi, setNewEmi] = useState({ date: '', loanName: '', amount: '' });
  const [newSip, setNewSip] = useState({ date: '', name: '', amount: '' });
  const [newTransfer, setNewTransfer] = useState({ date: '', from: 'PNC', to: 'Chase Savings', amount: '', type: 'Bank Transfer', person: '', notes: '' });
  const [newGoal, setNewGoal] = useState({ name: '', target: '', saved: '', monthly: '', account: 'Chase Savings', priority: 'High' });
  const [newBudget, setNewBudget] = useState({ category: '', month: new Date().toISOString().slice(0,7), amount: '', account: 'All' });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [emailSending, setEmailSending] = useState(false);
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState('');

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(d => setExchangeRate(d.rates?.INR || 83))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthorized(!!(u && ALLOWED_USERS.includes(u.email || '')));
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubs = [
      onSnapshot(collection(db, 'income'), s => { setIncomeEntries(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'expenses'), s => setExpenseEntries(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'emiPayments'), s => setEmiPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'sips'), s => setSips(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'transfers'), s => setTransfers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'goals'), s => setGoals(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'budgets'), s => setBudgets(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'accounts'), s => {
        const docs: any = {};
        const balances: any = { 'PNC': 0, 'Chase Checking': 0, 'Chase Savings': 0 };
        s.docs.forEach(d => { const data = d.data(); docs[data.name] = d.id; balances[data.name] = data.balance || 0; });
        setAccountDocs(docs);
        setAccountBalances(balances);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [isAuthorized]);

  const login = async () => {
    try {
      const r = await signInWithPopup(auth, provider);
      if (!ALLOWED_USERS.includes(r.user.email || '')) { await signOut(auth); alert('Access denied.'); }
    } catch (e: any) { if (e.code !== 'auth/popup-closed-by-user') alert(e.message); }
  };
  const logout = () => signOut(auth);

  const filterByMonth = (entries: any[]) =>
    entries.filter(e => e.date?.startsWith(selectedMonth));

  const fIncome = filterByMonth(incomeEntries);
  const fExpenses = filterByMonth(expenseEntries);
  const fEmi = filterByMonth(emiPayments);
  const fSips = filterByMonth(sips);
  const fTransfers = filterByMonth(transfers);

  const totalIncome = fIncome.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = fExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalEMI = fEmi.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSIP = fSips.reduce((s, e) => s + (e.amount || 0), 0);
  const totalBalance = Object.values(accountBalances).reduce((s: number, v: any) => s + v, 0);
  const netWorth = (totalBalance as number);

  const addIncome = async () => {
    if (!newIncome.date || !newIncome.amount) return;
    await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount) });
    setNewIncome({ date: '', description: '', amount: '', account: 'Chase Checking' });
  };

  const addExpense = async () => {
    if (!newExpense.date || !newExpense.amount || !newExpense.category) return;
    await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount) });
    setNewExpense({ date: '', category: '', description: '', amount: '', account: 'Chase Checking' });
  };

  const addEmi = async () => {
    if (!newEmi.date || !newEmi.amount) return;
    await addDoc(collection(db, 'emiPayments'), { ...newEmi, amount: parseFloat(newEmi.amount) });
    setNewEmi({ date: '', loanName: '', amount: '' });
  };

  const addSip = async () => {
    if (!newSip.date || !newSip.amount) return;
    await addDoc(collection(db, 'sips'), { ...newSip, amount: parseFloat(newSip.amount) });
    setNewSip({ date: '', name: '', amount: '' });
  };

  const addTransfer = async () => {
    if (!newTransfer.date || !newTransfer.amount) return;
    await addDoc(collection(db, 'transfers'), { ...newTransfer, amount: parseFloat(newTransfer.amount) });
    setNewTransfer({ date: '', from: 'PNC', to: 'Chase Savings', amount: '', type: 'Bank Transfer', person: '', notes: '' });
  };

  const addGoal = async () => {
    if (!newGoal.name || !newGoal.target) return;
    await addDoc(collection(db, 'goals'), {
      name: newGoal.name, target: parseFloat(newGoal.target),
      saved: parseFloat(newGoal.saved || '0'), monthly: parseFloat(newGoal.monthly || '0'),
      account: newGoal.account, priority: newGoal.priority, status: 'Active'
    });
    setNewGoal({ name: '', target: '', saved: '', monthly: '', account: 'Chase Savings', priority: 'High' });
  };

  const addBudget = async () => {
    if (!newBudget.category || !newBudget.amount) return;
    await addDoc(collection(db, 'budgets'), { ...newBudget, amount: parseFloat(newBudget.amount) });
    setNewBudget({ category: '', month: new Date().toISOString().slice(0,7), amount: '', account: 'All' });
  };

  const deleteItem = async (col: string, id: string) => { await deleteDoc(doc(db, col, id)); };

  const saveBalance = async (accountName: string) => {
    const val = parseFloat(tempBalance);
    if (isNaN(val)) return;
    if (accountDocs[accountName]) {
      await updateDoc(doc(db, 'accounts', accountDocs[accountName]), { balance: val });
    } else {
      await addDoc(collection(db, 'accounts'), { name: accountName, balance: val });
    }
    setEditingBalance(null);
  };

  const formatUSD = (n: number) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatINR = (n: number) => '₹' + Math.round((n || 0) * exchangeRate).toLocaleString('en-IN');

  const getMonthName = (m: string) => {
    try { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }); }
    catch { return m; }
  };

  const categoryTotals = fExpenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount; return acc;
  }, {});

  const getBudgetStatus = (spent: number, budget: number) => {
    const pct = (spent / budget) * 100;
    if (pct >= 100) return { label: 'Over Budget', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (pct >= 80) return { label: 'Almost Over', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
  };

  const monthBudgets = budgets.filter(b => b.month === selectedMonth);

  const sendEmail = async () => {
    setEmailSending(true);
    try {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_email: 'akshaygovind06@gmail.com', to_name: 'Akshay',
        month: getMonthName(selectedMonth),
        income: formatUSD(totalIncome) + ' (' + formatINR(totalIncome) + ')',
        expenses: formatUSD(totalExpenses) + ' (' + formatINR(totalExpenses) + ')',
        balance: formatUSD(totalIncome - totalExpenses),
        emi: formatINR(totalEMI), sip: formatINR(totalSIP),
        rate: '1 USD = ₹' + exchangeRate.toFixed(2)
      }, EMAILJS_KEY);
      alert('Email sent!');
    } catch { alert('Failed to send email'); }
    setEmailSending(false);
  };

  const generatePDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    const pdf = new jsPDF();
    const pw = pdf.internal.pageSize.width;
    pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, pw, 40, 'F');
    pdf.setTextColor(255,255,255); pdf.setFontSize(22); pdf.setFont('helvetica','bold');
    pdf.text('FINANCE DASHBOARD', pw/2, 18, {align:'center'});
    pdf.setFontSize(10); pdf.setTextColor(148,163,184);
    pdf.text(`${getMonthName(selectedMonth)} | ${user?.email}`, pw/2, 28, {align:'center'});
    pdf.text(`1 USD = ₹${exchangeRate.toFixed(2)} | Generated: ${new Date().toLocaleDateString()}`, pw/2, 35, {align:'center'});
    (pdf as any).autoTable({
      startY: 48,
      head: [['Account', 'Balance (USD)', 'Balance (INR)']],
      body: Object.entries(accountBalances).map(([name, bal]: any) => [name, formatUSD(bal), formatINR(bal)]),
      headStyles: { fillColor: [15,23,42] }, theme: 'grid'
    });
    (pdf as any).autoTable({
      startY: (pdf as any).lastAutoTable.finalY + 8,
      head: [['', 'USD', 'INR']],
      body: [
        ['Total Income', formatUSD(totalIncome), formatINR(totalIncome)],
        ['Total Expenses', formatUSD(totalExpenses), formatINR(totalExpenses)],
        ['Net', formatUSD(totalIncome - totalExpenses), formatINR(totalIncome - totalExpenses)],
        ['EMI', '-', formatINR(totalEMI)],
        ['SIP', '-', formatINR(totalSIP)],
      ],
      headStyles: { fillColor: [30,64,175] }, theme: 'grid'
    });
    if (fExpenses.length) {
      (pdf as any).autoTable({
        startY: (pdf as any).lastAutoTable.finalY + 8,
        head: [['Date', 'Category', 'Description', 'Account', 'USD']],
        body: fExpenses.map(e => [e.date, e.category, e.description||'-', e.account||'-', formatUSD(e.amount)]),
        headStyles: { fillColor: [220,38,38] }, theme: 'striped'
      });
    }
    pdf.save(`finances-${selectedMonth}.pdf`);
  };

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '⬛' },
    { id: 'income', label: 'Income', icon: '↑' },
    { id: 'expenses', label: 'Expenses', icon: '↓' },
    { id: 'transfers', label: 'Transfers', icon: '⇄' },
    { id: 'budget', label: 'Budget', icon: '◎' },
    { id: 'goals', label: 'Goals', icon: '◈' },
    { id: 'emi', label: 'EMI', icon: '₹' },
    { id: 'sip', label: 'SIP', icon: '↗' },
  ];

  const inputCls = `w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors`;
  const selectCls = `w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors`;
  const btnPrimary = `bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors`;
  const card = `bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5`;

  if (authChecking) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'3px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}}></div>
        <p style={{color:'#64748b',fontSize:14}}>Loading...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!user || !isAuthorized) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{width:64,height:64,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:28}}>💰</div>
        <h1 style={{color:'white',fontSize:28,fontWeight:700,marginBottom:8}}>Finance Dashboard</h1>
        <p style={{color:'#64748b',marginBottom:32,fontSize:14}}>Personal money tracker — authorized access only</p>
        <button onClick={login} style={{background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'white',border:'none',padding:'14px 32px',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:10,margin:'0 auto'}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
        {user && !isAuthorized && <p style={{color:'#ef4444',marginTop:16,fontSize:13}}>{user.email} is not authorized</p>}
      </div>
    </div>
  );

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'3px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}}></div>
        <p style={{color:'#64748b',fontSize:14}}>Loading your finances...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'white',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        input,select{font-family:inherit}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.5}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#1e293b}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}
        .tab-btn{background:transparent;border:none;color:#64748b;padding:10px 16px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;white-space:nowrap;font-family:inherit}
        .tab-btn:hover{background:#1e293b;color:#94a3b8}
        .tab-btn.active{background:#1e40af;color:white}
        .action-btn{border:none;cursor:pointer;font-family:inherit;transition:all 0.2s}
        .row-item{display:flex;justify-content:space-between;align-items:center;background:#1e293b;border-radius:10px;padding:12px 14px;margin-bottom:8px}
        .del-btn{background:rgba(239,68,68,0.1);border:none;color:#ef4444;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .del-btn:hover{background:rgba(239,68,68,0.2)}
        .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .progress-bar{height:6px;background:#1e293b;border-radius:3px;overflow:hidden}
        .progress-fill{height:100%;border-radius:3px;transition:width 0.5s}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.25s ease forwards}
      `}</style>

      {/* TOP NAV */}
      <div style={{background:'#0f172a',borderBottom:'1px solid #1e293b',padding:'0 24px',position:'sticky',top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>💰</div>
            <span style={{fontWeight:700,fontSize:16}}>Finances</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:20,padding:'4px 12px',fontSize:12,color:'#94a3b8'}}>
              💱 1 USD = ₹{exchangeRate.toFixed(2)}
            </div>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{background:'#1e293b',border:'1px solid #334155',color:'white',borderRadius:20,padding:'6px 12px',fontSize:12,cursor:'pointer',outline:'none'}}
            >
              {Array.from({length:24},(_,i)=>{
                const d=new Date(2025,i,1);
                const v=d.toISOString().slice(0,7);
                return <option key={i} value={v}>{d.toLocaleString('default',{month:'short',year:'numeric'})}</option>;
              })}
            </select>
            <button onClick={generatePDF} style={{background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer'}}>PDF</button>
            <button onClick={sendEmail} disabled={emailSending} style={{background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer'}}>
              {emailSending ? '...' : 'Email'}
            </button>
            <div style={{width:1,height:24,background:'#1e293b'}}></div>
            <span style={{fontSize:12,color:'#64748b'}}>{user.email?.split('@')[0]}</span>
            <button onClick={logout} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#ef4444',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer'}}>Logout</button>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{background:'#0f172a',borderBottom:'1px solid #1e293b',padding:'0 24px',overflowX:'auto'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',gap:4,paddingBottom:1}}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>

        {/* ═══ DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">

            {/* NET WORTH HERO */}
            <div style={{background:'linear-gradient(135deg,#1e3a8a,#1e40af)',borderRadius:20,padding:28,marginBottom:24,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
              <div>
                <p style={{color:'#93c5fd',fontSize:12,fontWeight:600,letterSpacing:'0.08em',marginBottom:6}}>TOTAL NET WORTH</p>
                <p style={{fontSize:42,fontWeight:800,letterSpacing:'-0.02em'}}>{formatUSD(netWorth)}</p>
                <p style={{color:'#93c5fd',fontSize:13,marginTop:4}}>{formatINR(netWorth)}</p>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{color:'#93c5fd',fontSize:12,marginBottom:4}}>{getMonthName(selectedMonth)}</p>
                <p style={{fontSize:13,color:'#bfdbfe'}}>Income <span style={{color:'#4ade80',fontWeight:700}}>{formatUSD(totalIncome)}</span></p>
                <p style={{fontSize:13,color:'#bfdbfe',marginTop:2}}>Spent <span style={{color:'#f87171',fontWeight:700}}>{formatUSD(totalExpenses)}</span></p>
                <p style={{fontSize:13,color:'#bfdbfe',marginTop:2}}>Net <span style={{color: totalIncome-totalExpenses >= 0 ? '#4ade80':'#f87171',fontWeight:700}}>{formatUSD(totalIncome-totalExpenses)}</span></p>
              </div>
            </div>

            {/* ACCOUNT BALANCES */}
            <p style={{fontSize:12,fontWeight:600,letterSpacing:'0.08em',color:'#64748b',marginBottom:12}}>ACCOUNT BALANCES</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginBottom:28}}>
              {(['PNC','Chase Checking','Chase Savings'] as string[]).map(acc => (
                <div key={acc} style={{background:'#1e293b',border:`1px solid ${ACCOUNT_COLORS[acc]}40`,borderRadius:16,padding:20}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{width:8,height:8,background:ACCOUNT_COLORS[acc],borderRadius:'50%',display:'inline-block',marginRight:8}}></div>
                      <span style={{fontSize:13,fontWeight:600,color:'#94a3b8'}}>{acc}</span>
                    </div>
                    <button onClick={()=>{setEditingBalance(acc);setTempBalance(String(accountBalances[acc]));}}
                      style={{background:'transparent',border:'1px solid #334155',color:'#64748b',borderRadius:6,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>
                      Edit
                    </button>
                  </div>
                  {editingBalance === acc ? (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="number" value={tempBalance} onChange={e=>setTempBalance(e.target.value)}
                        style={{flex:1,background:'#0f172a',border:'1px solid #3b82f6',color:'white',borderRadius:8,padding:'8px 10px',fontSize:16,outline:'none'}}
                        onKeyDown={e=>e.key==='Enter'&&saveBalance(acc)} autoFocus />
                      <button onClick={()=>saveBalance(acc)} style={{background:'#3b82f6',border:'none',color:'white',borderRadius:8,padding:'8px 12px',cursor:'pointer',fontSize:12,fontWeight:600}}>Save</button>
                      <button onClick={()=>setEditingBalance(null)} style={{background:'#334155',border:'none',color:'#94a3b8',borderRadius:8,padding:'8px 10px',cursor:'pointer',fontSize:12}}>✕</button>
                    </div>
                  ) : (
                    <>
                      <p style={{fontSize:28,fontWeight:800,color:'white',letterSpacing:'-0.02em'}}>{formatUSD(accountBalances[acc])}</p>
                      <p style={{fontSize:12,color:'#64748b',marginTop:4}}>{formatINR(accountBalances[acc])}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* MONTHLY STATS */}
            <p style={{fontSize:12,fontWeight:600,letterSpacing:'0.08em',color:'#64748b',marginBottom:12}}>THIS MONTH — {getMonthName(selectedMonth).toUpperCase()}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:28}}>
              {[
                {label:'Income',value:formatUSD(totalIncome),sub:formatINR(totalIncome),color:'#4ade80'},
                {label:'Expenses',value:formatUSD(totalExpenses),sub:formatINR(totalExpenses),color:'#f87171'},
                {label:'Net Cash',value:formatUSD(totalIncome-totalExpenses),sub:formatINR(totalIncome-totalExpenses),color:totalIncome-totalExpenses>=0?'#4ade80':'#f87171'},
                {label:'EMI (₹)',value:formatINR(totalEMI),sub:'India',color:'#a78bfa'},
                {label:'SIP (₹)',value:formatINR(totalSIP),sub:'India',color:'#60a5fa'},
              ].map((c,i)=>(
                <div key={i} style={{background:'#1e293b',borderRadius:14,padding:16}}>
                  <p style={{fontSize:11,color:'#64748b',fontWeight:600,letterSpacing:'0.05em',marginBottom:8}}>{c.label.toUpperCase()}</p>
                  <p style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</p>
                  <p style={{fontSize:11,color:'#475569',marginTop:3}}>{c.sub}</p>
                </div>
              ))}
            </div>

            {/* EXPENSE BREAKDOWN */}
            {Object.keys(categoryTotals).length > 0 && (
              <>
                <p style={{fontSize:12,fontWeight:600,letterSpacing:'0.08em',color:'#64748b',marginBottom:12}}>EXPENSE BREAKDOWN</p>
                <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:28}}>
                  {Object.entries(categoryTotals).sort((a:any,b:any)=>b[1]-a[1]).map(([cat,amt]:any)=>{
                    const pct = Math.round((amt/totalExpenses)*100);
                    return (
                      <div key={cat} style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <span style={{fontSize:13,color:'#94a3b8'}}>{cat}</span>
                          <span style={{fontSize:13,fontWeight:600,color:'white'}}>{formatUSD(amt)} <span style={{color:'#64748b',fontWeight:400}}>({pct}%)</span></span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,#3b82f6,#60a5fa)'}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* SAVINGS GOALS PREVIEW */}
            {goals.filter(g=>g.status==='Active').length > 0 && (
              <>
                <p style={{fontSize:12,fontWeight:600,letterSpacing:'0.08em',color:'#64748b',marginBottom:12}}>SAVINGS GOALS</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
                  {goals.filter(g=>g.status==='Active').map(g=>{
                    const pct = Math.min(Math.round((g.saved/g.target)*100),100);
                    const remaining = g.target - g.saved;
                    const months = g.monthly > 0 ? Math.ceil(remaining/g.monthly) : '—';
                    return (
                      <div key={g.id} style={{background:'#1e293b',borderRadius:14,padding:18}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{fontSize:14,fontWeight:600}}>{g.name}</span>
                          <span className="badge" style={{background:'rgba(59,130,246,0.15)',color:'#60a5fa'}}>{pct}%</span>
                        </div>
                        <div className="progress-bar" style={{marginBottom:10}}>
                          <div className="progress-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,#10b981,#34d399)'}}></div>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b'}}>
                          <span>{formatUSD(g.saved)} saved</span>
                          <span>{formatUSD(g.target)} goal</span>
                        </div>
                        {months !== '—' && <p style={{fontSize:11,color:'#475569',marginTop:6}}>~{months} months to goal</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ INCOME ═══ */}
        {activeTab === 'income' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:14,color:'#4ade80'}}>Add Income</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                <input type="date" value={newIncome.date} onChange={e=>setNewIncome({...newIncome,date:e.target.value})} className={inputCls} />
                <input placeholder="Description" value={newIncome.description} onChange={e=>setNewIncome({...newIncome,description:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Amount $" value={newIncome.amount} onChange={e=>setNewIncome({...newIncome,amount:e.target.value})} className={inputCls} />
                <select value={newIncome.account} onChange={e=>setNewIncome({...newIncome,account:e.target.value})} className={selectCls}>
                  <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option>
                </select>
                <button onClick={addIncome} className={btnPrimary} style={{background:'#059669'}}>+ Add Income</button>
              </div>
            </div>
            <div style={{background:'#1e293b',borderRadius:16,padding:'14px 18px',marginBottom:16,display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#64748b',fontSize:13}}>Total for {getMonthName(selectedMonth)}</span>
              <span style={{color:'#4ade80',fontWeight:700,fontSize:16}}>{formatUSD(totalIncome)} <span style={{color:'#334155',fontSize:12}}>{formatINR(totalIncome)}</span></span>
            </div>
            <div>
              {fIncome.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>(
                <div key={e.id} className="row-item">
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:600}}>{e.description || 'Income'}</span>
                      {e.account && <span className="badge" style={{background:ACCOUNT_BG[e.account]||'#1e293b',color:ACCOUNT_COLORS[e.account]||'#94a3b8'}}>{e.account}</span>}
                    </div>
                    <span style={{fontSize:11,color:'#64748b'}}>{e.date}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'#4ade80',fontWeight:700}}>{formatUSD(e.amount)}</span>
                    <button className="del-btn" onClick={()=>deleteItem('income',e.id)}>✕</button>
                  </div>
                </div>
              ))}
              {fIncome.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No income entries for this month</p>}
            </div>
          </div>
        )}

        {/* ═══ EXPENSES ═══ */}
        {activeTab === 'expenses' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:14,color:'#f87171'}}>Add Expense</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
                <input type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense,date:e.target.value})} className={inputCls} />
                <select value={newExpense.category} onChange={e=>setNewExpense({...newExpense,category:e.target.value})} className={selectCls}>
                  <option value="">Category</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <input placeholder="Description" value={newExpense.description} onChange={e=>setNewExpense({...newExpense,description:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Amount $" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} className={inputCls} />
                <select value={newExpense.account} onChange={e=>setNewExpense({...newExpense,account:e.target.value})} className={selectCls}>
                  <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option>
                </select>
                <button onClick={addExpense} className={btnPrimary} style={{background:'#dc2626'}}>+ Add Expense</button>
              </div>
            </div>
            <div style={{background:'#1e293b',borderRadius:16,padding:'14px 18px',marginBottom:16,display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#64748b',fontSize:13}}>Total for {getMonthName(selectedMonth)}</span>
              <span style={{color:'#f87171',fontWeight:700,fontSize:16}}>{formatUSD(totalExpenses)} <span style={{color:'#334155',fontSize:12}}>{formatINR(totalExpenses)}</span></span>
            </div>
            <div>
              {fExpenses.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>(
                <div key={e.id} className="row-item">
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,fontWeight:600}}>{e.description || e.category}</span>
                      <span className="badge" style={{background:'rgba(99,102,241,0.12)',color:'#818cf8'}}>{e.category}</span>
                      {e.account && <span className="badge" style={{background:ACCOUNT_BG[e.account]||'#1e293b',color:ACCOUNT_COLORS[e.account]||'#94a3b8'}}>{e.account}</span>}
                    </div>
                    <span style={{fontSize:11,color:'#64748b'}}>{e.date}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'#f87171',fontWeight:700}}>{formatUSD(e.amount)}</span>
                    <button className="del-btn" onClick={()=>deleteItem('expenses',e.id)}>✕</button>
                  </div>
                </div>
              ))}
              {fExpenses.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No expenses for this month</p>}
            </div>
          </div>
        )}

        {/* ═══ TRANSFERS ═══ */}
        {activeTab === 'transfers' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:14,color:'#60a5fa'}}>Add Transfer / Zelle</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
                <input type="date" value={newTransfer.date} onChange={e=>setNewTransfer({...newTransfer,date:e.target.value})} className={inputCls} />
                <select value={newTransfer.type} onChange={e=>setNewTransfer({...newTransfer,type:e.target.value})} className={selectCls}>
                  <option>Bank Transfer</option><option>Zelle Sent</option><option>Zelle Received</option><option>ACH</option><option>Cash</option>
                </select>
                <select value={newTransfer.from} onChange={e=>setNewTransfer({...newTransfer,from:e.target.value})} className={selectCls}>
                  <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option><option>External</option>
                </select>
                <select value={newTransfer.to} onChange={e=>setNewTransfer({...newTransfer,to:e.target.value})} className={selectCls}>
                  <option>Chase Savings</option><option>PNC</option><option>Chase Checking</option><option>External</option>
                </select>
                <input type="number" placeholder="Amount $" value={newTransfer.amount} onChange={e=>setNewTransfer({...newTransfer,amount:e.target.value})} className={inputCls} />
                <input placeholder="Person / Note" value={newTransfer.person} onChange={e=>setNewTransfer({...newTransfer,person:e.target.value})} className={inputCls} />
                <button onClick={addTransfer} className={btnPrimary}>+ Add Transfer</button>
              </div>
            </div>
            <div>
              {fTransfers.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>{
                const isZelle = e.type?.includes('Zelle');
                const isOut = e.type === 'Zelle Sent';
                return (
                  <div key={e.id} className="row-item">
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3,flexWrap:'wrap'}}>
                        <span className="badge" style={{background:isZelle?(isOut?'rgba(239,68,68,0.1)':'rgba(16,185,129,0.1)'):'rgba(59,130,246,0.1)',color:isZelle?(isOut?'#f87171':'#4ade80'):'#60a5fa'}}>{e.type}</span>
                        <span style={{fontSize:13,color:'#94a3b8'}}>{e.from} → {e.to}</span>
                        {e.person && <span style={{fontSize:12,color:'#64748b'}}>· {e.person}</span>}
                      </div>
                      <span style={{fontSize:11,color:'#64748b'}}>{e.date}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontWeight:700,color:isOut?'#f87171':'#60a5fa'}}>{formatUSD(e.amount)}</span>
                      <button className="del-btn" onClick={()=>deleteItem('transfers',e.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
              {fTransfers.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No transfers for this month</p>}
            </div>
          </div>
        )}

        {/* ═══ BUDGET ═══ */}
        {activeTab === 'budget' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:14,color:'#fbbf24'}}>Add Budget</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                <select value={newBudget.category} onChange={e=>setNewBudget({...newBudget,category:e.target.value})} className={selectCls}>
                  <option value="">Category</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <input type="month" value={newBudget.month} onChange={e=>setNewBudget({...newBudget,month:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Budget $" value={newBudget.amount} onChange={e=>setNewBudget({...newBudget,amount:e.target.value})} className={inputCls} />
                <button onClick={addBudget} className={btnPrimary} style={{background:'#d97706'}}>+ Add Budget</button>
              </div>
            </div>
            <div style={{display:'grid',gap:12}}>
              {monthBudgets.map(b=>{
                const spent = categoryTotals[b.category] || 0;
                const pct = Math.min(Math.round((spent/b.amount)*100),100);
                const status = getBudgetStatus(spent, b.amount);
                return (
                  <div key={b.id} style={{background:'#1e293b',borderRadius:14,padding:18}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <div>
                        <span style={{fontSize:14,fontWeight:600}}>{b.category}</span>
                        {b.account && b.account !== 'All' && <span style={{fontSize:11,color:'#64748b',marginLeft:8}}>{b.account}</span>}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span className="badge" style={{background:status.bg,color:status.color}}>{status.label}</span>
                        <button className="del-btn" onClick={()=>deleteItem('budgets',b.id)}>✕</button>
                      </div>
                    </div>
                    <div className="progress-bar" style={{marginBottom:8}}>
                      <div className="progress-fill" style={{width:`${pct}%`,background:pct>=100?'#ef4444':pct>=80?'#f59e0b':'#10b981'}}></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b'}}>
                      <span>Spent: <span style={{color:'white',fontWeight:600}}>{formatUSD(spent)}</span></span>
                      <span>Budget: <span style={{color:'white',fontWeight:600}}>{formatUSD(b.amount)}</span></span>
                      <span>Left: <span style={{color:status.color,fontWeight:600}}>{formatUSD(b.amount-spent)}</span></span>
                    </div>
                  </div>
                );
              })}
              {monthBudgets.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No budgets set for {getMonthName(selectedMonth)}</p>}
            </div>
          </div>
        )}

        {/* ═══ GOALS ═══ */}
        {activeTab === 'goals' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:14,color:'#34d399'}}>Add Savings Goal</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
                <input placeholder="Goal name" value={newGoal.name} onChange={e=>setNewGoal({...newGoal,name:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Target $" value={newGoal.target} onChange={e=>setNewGoal({...newGoal,target:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Saved so far $" value={newGoal.saved} onChange={e=>setNewGoal({...newGoal,saved:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Monthly $ contribution" value={newGoal.monthly} onChange={e=>setNewGoal({...newGoal,monthly:e.target.value})} className={inputCls} />
                <select value={newGoal.account} onChange={e=>setNewGoal({...newGoal,account:e.target.value})} className={selectCls}>
                  <option>Chase Savings</option><option>PNC</option><option>Chase Checking</option>
                </select>
                <select value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})} className={selectCls}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
                <button onClick={addGoal} className={btnPrimary} style={{background:'#059669'}}>+ Add Goal</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
              {goals.map(g=>{
                const pct = Math.min(Math.round((g.saved/g.target)*100),100);
                const remaining = g.target - g.saved;
                const months = g.monthly > 0 ? Math.ceil(remaining/g.monthly) : null;
                const priorityColor: Record<string,string> = {High:'#f87171',Medium:'#fbbf24',Low:'#4ade80'};
                return (
                  <div key={g.id} style={{background:'#1e293b',borderRadius:16,padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:15,fontWeight:700}}>{g.name}</span>
                      <button className="del-btn" onClick={()=>deleteItem('goals',g.id)}>✕</button>
                    </div>
                    <div style={{display:'flex',gap:6,marginBottom:14}}>
                      <span className="badge" style={{background:'rgba(59,130,246,0.12)',color:'#60a5fa'}}>{g.account}</span>
                      <span className="badge" style={{background:`${priorityColor[g.priority]}18`,color:priorityColor[g.priority]}}>{g.priority}</span>
                    </div>
                    <div className="progress-bar" style={{marginBottom:10}}>
                      <div className="progress-fill" style={{width:`${pct}%`,background:'linear-gradient(90deg,#10b981,#34d399)'}}></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:8}}>
                      <span>{formatUSD(g.saved)} saved</span>
                      <span style={{color:'#34d399',fontWeight:700}}>{pct}%</span>
                      <span>{formatUSD(g.target)} goal</span>
                    </div>
                    <div style={{fontSize:12,color:'#475569'}}>
                      <span>Remaining: <span style={{color:'white'}}>{formatUSD(remaining)}</span></span>
                      {months && <span style={{marginLeft:12}}>~{months} months at {formatUSD(g.monthly)}/mo</span>}
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No savings goals yet</p>}
            </div>
          </div>
        )}

        {/* ═══ EMI ═══ */}
        {activeTab === 'emi' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:4,color:'#a78bfa'}}>EMI Payments</p>
              <p style={{fontSize:12,color:'#64748b',marginBottom:14}}>Track your dad's ₹5k monthly EMI and any other loans</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                <input type="date" value={newEmi.date} onChange={e=>setNewEmi({...newEmi,date:e.target.value})} className={inputCls} />
                <input placeholder="Loan name" value={newEmi.loanName} onChange={e=>setNewEmi({...newEmi,loanName:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Amount ₹" value={newEmi.amount} onChange={e=>setNewEmi({...newEmi,amount:e.target.value})} className={inputCls} />
                <button onClick={addEmi} className={btnPrimary} style={{background:'#7c3aed'}}>+ Add EMI</button>
              </div>
            </div>
            <div style={{background:'#1e293b',borderRadius:16,padding:'14px 18px',marginBottom:16,display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#64748b',fontSize:13}}>Total EMI this month</span>
              <span style={{color:'#a78bfa',fontWeight:700,fontSize:16}}>{formatINR(totalEMI)}</span>
            </div>
            <div>
              {fEmi.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>(
                <div key={e.id} className="row-item">
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,marginBottom:3}}>{e.loanName || 'EMI Payment'}</p>
                    <p style={{fontSize:11,color:'#64748b'}}>{e.date}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'#a78bfa',fontWeight:700}}>{formatINR(e.amount)}</span>
                    <button className="del-btn" onClick={()=>deleteItem('emiPayments',e.id)}>✕</button>
                  </div>
                </div>
              ))}
              {fEmi.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No EMI entries for this month</p>}
            </div>
          </div>
        )}

        {/* ═══ SIP ═══ */}
        {activeTab === 'sip' && (
          <div className="fade-in">
            <div style={{background:'#1e293b',borderRadius:16,padding:20,marginBottom:20}}>
              <p style={{fontSize:14,fontWeight:600,marginBottom:4,color:'#60a5fa'}}>SIP Investments</p>
              <p style={{fontSize:12,color:'#64748b',marginBottom:14}}>Track your monthly SIP investments in India</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                <input type="date" value={newSip.date} onChange={e=>setNewSip({...newSip,date:e.target.value})} className={inputCls} />
                <input placeholder="Fund name" value={newSip.name} onChange={e=>setNewSip({...newSip,name:e.target.value})} className={inputCls} />
                <input type="number" placeholder="Amount ₹" value={newSip.amount} onChange={e=>setNewSip({...newSip,amount:e.target.value})} className={inputCls} />
                <button onClick={addSip} className={btnPrimary} style={{background:'#1d4ed8'}}>+ Add SIP</button>
              </div>
            </div>
            <div style={{background:'#1e293b',borderRadius:16,padding:'14px 18px',marginBottom:16,display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'#64748b',fontSize:13}}>Total SIP this month</span>
              <span style={{color:'#60a5fa',fontWeight:700,fontSize:16}}>{formatINR(totalSIP)}</span>
            </div>
            <div>
              {fSips.sort((a,b)=>b.date?.localeCompare(a.date)).map(e=>(
                <div key={e.id} className="row-item">
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:600,marginBottom:3}}>{e.name || 'SIP'}</p>
                    <p style={{fontSize:11,color:'#64748b'}}>{e.date}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'#60a5fa',fontWeight:700}}>{formatINR(e.amount)}</span>
                    <button className="del-btn" onClick={()=>deleteItem('sips',e.id)}>✕</button>
                  </div>
                </div>
              ))}
              {fSips.length === 0 && <p style={{textAlign:'center',color:'#334155',padding:32,fontSize:13}}>No SIP entries for this month</p>}
            </div>
          </div>
        )}

      </div>

      <div style={{textAlign:'center',padding:'20px 0 32px',color:'#1e293b',fontSize:11,letterSpacing:'0.1em'}}>
        FINANCE DASHBOARD · {user?.email?.split('@')[0]?.toUpperCase()} · {new Date().getFullYear()}
      </div>
    </div>
  );
}
