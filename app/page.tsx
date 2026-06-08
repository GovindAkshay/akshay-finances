"use client";
import { useState, useEffect, useRef } from 'react';
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

const ALLOWED_USERS = ['akshaygovind06@gmail.com','toshnilgovind@gmail.com','dsgovind10@gmail.com'];
const EMAILJS_SERVICE = 'service_8hw0whx';
const EMAILJS_TEMPLATE = 'template_ky8myvn';
const EMAILJS_KEY = 'Ay5q7gGs4QQyimuMN';

const CATEGORIES = ['Rent','Groceries','Utilities','Transport','Pizza','Food','Healthcare','Tuition','Books','Entertainment','Splitwise','Shopping','Subscriptions','Zelle','Other'];

const ACC_COLOR: Record<string,string> = { 'PNC':'#0068b5', 'Chase Checking':'#117aca', 'Chase Savings':'#1a9e6e' };
const ACC_LIGHT: Record<string,string> = { 'PNC':'#e8f1fb', 'Chase Checking':'#e8f3fc', 'Chase Savings':'#e6f7f1' };
const PRIORITY_COLOR: Record<string,string> = { High:'#ef4444', Medium:'#f59e0b', Low:'#10b981' };

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
  const [accountBalances, setAccountBalances] = useState<any>({ 'PNC':0,'Chase Checking':0,'Chase Savings':0 });
  const [accountDocs, setAccountDocs] = useState<any>({});
  const [accountUpdated, setAccountUpdated] = useState<any>({});

  const [newIncome, setNewIncome] = useState({ date:'', description:'', amount:'', account:'Chase Checking' });
  const [newExpense, setNewExpense] = useState({ date:'', category:'', description:'', amount:'', account:'Chase Checking' });
  const [newEmi, setNewEmi] = useState({ date:'', loanName:'', amount:'' });
  const [newSip, setNewSip] = useState({ date:'', name:'', amount:'' });
  const [newTransfer, setNewTransfer] = useState({ date:'', from:'PNC', to:'Chase Savings', amount:'', type:'Bank Transfer', person:'' });
  const [newGoal, setNewGoal] = useState({ name:'', target:'', saved:'', monthly:'', account:'Chase Savings', priority:'High' });
  const [newBudget, setNewBudget] = useState({ category:'', month: new Date().toISOString().slice(0,7), amount:'', account:'All' });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [emailSending, setEmailSending] = useState(false);
  const [editingBalance, setEditingBalance] = useState<string|null>(null);
  const [tempBalance, setTempBalance] = useState('');
  const [search, setSearch] = useState('');
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [showAddEmi, setShowAddEmi] = useState(false);
  const [showAddSip, setShowAddSip] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r=>r.json()).then(d=>setExchangeRate(d.rates?.INR||83)).catch(()=>{});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setIsAuthorized(!!(u && ALLOWED_USERS.includes(u.email||'')));
      setAuthChecking(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubs = [
      onSnapshot(collection(db,'income'), s => { setIncomeEntries(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }),
      onSnapshot(collection(db,'expenses'), s => setExpenseEntries(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'emiPayments'), s => setEmiPayments(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'sips'), s => setSips(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'transfers'), s => setTransfers(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'goals'), s => setGoals(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'budgets'), s => setBudgets(s.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,'accounts'), s => {
        const docs:any={}, bals:any={PNC:0,'Chase Checking':0,'Chase Savings':0}, updated:any={};
        s.docs.forEach(d=>{ const dt=d.data(); docs[dt.name]=d.id; bals[dt.name]=dt.balance||0; updated[dt.name]=dt.updatedAt||null; });
        setAccountDocs(docs); setAccountBalances(bals); setAccountUpdated(updated);
      }),
    ];
    return () => unsubs.forEach(u=>u());
  }, [isAuthorized]);

  const login = async () => {
    try {
      const r = await signInWithPopup(auth, provider);
      if (!ALLOWED_USERS.includes(r.user.email||'')) { await signOut(auth); alert('Access denied.'); }
    } catch(e:any) { if(e.code!=='auth/popup-closed-by-user') alert(e.message); }
  };
  const logout = () => signOut(auth);

  const now = new Date().toISOString().slice(0,7);
  const prevMonth = () => { const d=new Date(selectedMonth+'-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); };

  const byMonth = (arr:any[], m:string) => arr.filter(e=>e.date?.startsWith(m));
  const filtered = (arr:any[]) => {
    let r = selectedMonth ? byMonth(arr, selectedMonth) : arr;
    if (search) r = r.filter(e => JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));
    return r.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  };

  const fIncome = filtered(incomeEntries);
  const fExpenses = filtered(expenseEntries);
  const fEmi = filtered(emiPayments);
  const fSips = filtered(sips);
  const fTransfers = filtered(transfers);

  const sum = (arr:any[]) => arr.reduce((s,e)=>s+(e.amount||0),0);
  const totalIncome = sum(fIncome);
  const totalExpenses = sum(fExpenses);
  const totalEMI = sum(fEmi);
  const totalSIP = sum(fSips);
  const totalBalance = Object.values(accountBalances).reduce((s:number,v:any)=>s+v,0) as number;

  const prevIncome = sum(byMonth(incomeEntries, prevMonth()));
  const prevExpenses = sum(byMonth(expenseEntries, prevMonth()));

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const daysPassed = today.getDate();
  const projectedSpend = selectedMonth === now ? (totalExpenses/daysPassed)*daysInMonth : totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome-totalExpenses)/totalIncome)*100) : 0;
  const dailyAvg = daysPassed > 0 && selectedMonth === now ? totalExpenses/daysPassed : 0;

  const categoryTotals = fExpenses.reduce((acc:any,e)=>{ acc[e.category]=(acc[e.category]||0)+e.amount; return acc; },{});

  const daysSince = (ts:any) => {
    if (!ts) return null;
    const d = ts.seconds ? new Date(ts.seconds*1000) : new Date(ts);
    return Math.floor((Date.now()-d.getTime())/(1000*60*60*24));
  };

  const saveBalance = async (acc:string) => {
    const val = parseFloat(tempBalance);
    if (isNaN(val)) return;
    const data = { name:acc, balance:val, updatedAt: new Date().toISOString() };
    if (accountDocs[acc]) await updateDoc(doc(db,'accounts',accountDocs[acc]), data);
    else await addDoc(collection(db,'accounts'), data);
    setEditingBalance(null);
  };

  const addIncome = async () => {
    if (!newIncome.date||!newIncome.amount) return;
    await addDoc(collection(db,'income'),{...newIncome,amount:parseFloat(newIncome.amount)});
    setNewIncome({date:'',description:'',amount:'',account:'Chase Checking'}); setShowAddIncome(false);
  };
  const addExpense = async () => {
    if (!newExpense.date||!newExpense.amount||!newExpense.category) return;
    await addDoc(collection(db,'expenses'),{...newExpense,amount:parseFloat(newExpense.amount)});
    setNewExpense({date:'',category:'',description:'',amount:'',account:'Chase Checking'}); setShowAddExpense(false);
  };
  const addEmi = async () => {
    if (!newEmi.date||!newEmi.amount) return;
    await addDoc(collection(db,'emiPayments'),{...newEmi,amount:parseFloat(newEmi.amount)});
    setNewEmi({date:'',loanName:'',amount:''}); setShowAddEmi(false);
  };
  const addSip = async () => {
    if (!newSip.date||!newSip.amount) return;
    await addDoc(collection(db,'sips'),{...newSip,amount:parseFloat(newSip.amount)});
    setNewSip({date:'',name:'',amount:''}); setShowAddSip(false);
  };
  const addTransfer = async () => {
    if (!newTransfer.date||!newTransfer.amount) return;
    await addDoc(collection(db,'transfers'),{...newTransfer,amount:parseFloat(newTransfer.amount)});
    setNewTransfer({date:'',from:'PNC',to:'Chase Savings',amount:'',type:'Bank Transfer',person:''}); setShowAddTransfer(false);
  };
  const addGoal = async () => {
    if (!newGoal.name||!newGoal.target) return;
    await addDoc(collection(db,'goals'),{name:newGoal.name,target:parseFloat(newGoal.target),saved:parseFloat(newGoal.saved||'0'),monthly:parseFloat(newGoal.monthly||'0'),account:newGoal.account,priority:newGoal.priority,status:'Active'});
    setNewGoal({name:'',target:'',saved:'',monthly:'',account:'Chase Savings',priority:'High'}); setShowAddGoal(false);
  };
  const addBudget = async () => {
    if (!newBudget.category||!newBudget.amount) return;
    await addDoc(collection(db,'budgets'),{...newBudget,amount:parseFloat(newBudget.amount)});
    setNewBudget({category:'',month:new Date().toISOString().slice(0,7),amount:'',account:'All'}); setShowAddBudget(false);
  };
  const deleteItem = async (col:string, id:string) => { if(confirm('Delete this entry?')) await deleteDoc(doc(db,col,id)); };

  const usd = (n:number) => '$'+(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const inr = (n:number) => '₹'+Math.round((n||0)*exchangeRate).toLocaleString('en-IN');
  const pct = (a:number,b:number) => b===0?0:Math.round(((a-b)/b)*100);
  const monthName = (m:string) => { try{const[y,mo]=m.split('-');return new Date(+y,+mo-1,1).toLocaleString('default',{month:'long',year:'numeric'});}catch{return m;} };
  const getBudgetStatus = (spent:number,budget:number) => {
    const p=(spent/budget)*100;
    if(p>=100) return {label:'Over Budget',color:'#ef4444',bg:'#fef2f2'};
    if(p>=80) return {label:'Almost Over',color:'#f59e0b',bg:'#fffbeb'};
    return {label:'On Track',color:'#10b981',bg:'#f0fdf4'};
  };

  const sendEmail = async () => {
    setEmailSending(true);
    try {
      await emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{
        to_email:'akshaygovind06@gmail.com',to_name:'Akshay',month:monthName(selectedMonth),
        income:usd(totalIncome)+'('+inr(totalIncome)+')',expenses:usd(totalExpenses)+'('+inr(totalExpenses)+')',
        balance:usd(totalIncome-totalExpenses),emi:inr(totalEMI),sip:inr(totalSIP),
        rate:'1 USD = ₹'+exchangeRate.toFixed(2)
      },EMAILJS_KEY);
      alert('Email sent!');
    } catch { alert('Failed'); }
    setEmailSending(false);
  };

  const generatePDF = async () => {
    const jsPDF=(await import('jspdf')).default; await import('jspdf-autotable');
    const pdf=new jsPDF(); const pw=pdf.internal.pageSize.width;
    pdf.setFillColor(248,250,252); pdf.rect(0,0,pw,40,'F');
    pdf.setTextColor(15,23,42); pdf.setFontSize(20); pdf.setFont('helvetica','bold');
    pdf.text('Finance Report',pw/2,18,{align:'center'});
    pdf.setFontSize(10); pdf.setTextColor(100,116,139);
    pdf.text(`${monthName(selectedMonth)} · ${user?.email}`,pw/2,28,{align:'center'});
    pdf.text(`1 USD = ₹${exchangeRate.toFixed(2)} · ${new Date().toLocaleDateString()}`,pw/2,35,{align:'center'});
    (pdf as any).autoTable({startY:48,head:[['Account','USD','INR']],body:Object.entries(accountBalances).map(([n,b]:any)=>[n,usd(b),inr(b)]),headStyles:{fillColor:[15,23,42]},theme:'grid'});
    (pdf as any).autoTable({startY:(pdf as any).lastAutoTable.finalY+8,head:[['','USD','INR']],body:[['Income',usd(totalIncome),inr(totalIncome)],['Expenses',usd(totalExpenses),inr(totalExpenses)],['Net',usd(totalIncome-totalExpenses),inr(totalIncome-totalExpenses)]],headStyles:{fillColor:[30,64,175]},theme:'grid'});
    if(fExpenses.length)(pdf as any).autoTable({startY:(pdf as any).lastAutoTable.finalY+8,head:[['Date','Category','Description','Account','Amount']],body:fExpenses.map(e=>[e.date,e.category,e.description||'-',e.account||'-',usd(e.amount)]),headStyles:{fillColor:[220,38,38]},theme:'striped'});
    pdf.save(`finances-${selectedMonth}.pdf`);
  };

  const TABS = [
    {id:'dashboard',label:'Dashboard',icon:'▦'},
    {id:'income',label:'Income',icon:'↑'},
    {id:'expenses',label:'Expenses',icon:'↓'},
    {id:'transfers',label:'Transfers',icon:'⇄'},
    {id:'budget',label:'Budget',icon:'◎'},
    {id:'goals',label:'Goals',icon:'◈'},
    {id:'emi',label:'EMI',icon:'₹'},
    {id:'sip',label:'SIP',icon:'↗'},
  ];

  const s = {
    page: {minHeight:'100vh',background:'#f8fafc',color:'#0f172a',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
    nav: {background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',position:'sticky' as const,top:0,zIndex:100},
    navInner: {maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',height:60},
    tabBar: {background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',overflowX:'auto' as const},
    tabInner: {maxWidth:1200,margin:'0 auto',display:'flex',gap:2},
    main: {maxWidth:1200,margin:'0 auto',padding:'28px 24px 100px'},
    card: {background:'white',border:'1px solid #e2e8f0',borderRadius:16,padding:20},
    input: {width:'100%',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 12px',fontSize:14,outline:'none',background:'white',color:'#0f172a',fontFamily:'inherit'},
    btn: {border:'none',borderRadius:8,padding:'10px 18px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'},
    badge: {display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600},
    row: {display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f8fafc',border:'1px solid #f1f5f9',borderRadius:12,padding:'12px 16px',marginBottom:8},
  };

  const Trend = ({curr,prev}:{curr:number,prev:number}) => {
    const p=pct(curr,prev); if(!prev) return null;
    const up=p>=0;
    return <span style={{fontSize:11,fontWeight:600,color:up?'#ef4444':'#10b981',background:up?'#fef2f2':'#f0fdf4',padding:'2px 6px',borderRadius:4}}>{up?'↑':'↓'}{Math.abs(p)}% vs last month</span>;
  };

  const AddForm = ({show,onClose,title,color,children,onAdd}:{show:boolean,onClose:()=>void,title:string,color:string,children:any,onAdd:()=>void}) => {
    if(!show) return null;
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:'white',borderRadius:20,padding:28,width:'100%',maxWidth:520,boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:16,fontWeight:700,color}}>{title}</h3>
            <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>{children}</div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button onClick={onAdd} style={{...s.btn,background:color,color:'white',flex:1}}>Save</button>
            <button onClick={onClose} style={{...s.btn,background:'#f1f5f9',color:'#64748b'}}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const DelBtn = ({col,id}:{col:string,id:string}) => (
    <button onClick={()=>deleteItem(col,id)} style={{background:'#fef2f2',border:'none',color:'#ef4444',width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:13,flexShrink:0}}>✕</button>
  );

  if(authChecking) return <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,border:'3px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  if(!user||!isAuthorized) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,sans-serif'}}>
      <div style={{textAlign:'center',padding:40}}>
        <div style={{width:72,height:72,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:32}}>💰</div>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:8,color:'#0f172a'}}>Finance Dashboard</h1>
        <p style={{color:'#94a3b8',marginBottom:32,fontSize:14}}>Authorized access only</p>
        <button onClick={login} style={{background:'#0f172a',color:'white',border:'none',padding:'14px 32px',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:10,margin:'0 auto'}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
        {user&&!isAuthorized&&<p style={{color:'#ef4444',marginTop:16,fontSize:13}}>{user.email} is not authorized</p>}
      </div>
    </div>
  );

  if(loading) return <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:36,height:36,border:'3px solid #3b82f6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={s.page}>
      <style>{`
        *{box-sizing:border-box}
        input,select,button{font-family:inherit}
        input:focus,select:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
        .tab-btn{background:transparent;border:none;color:#94a3b8;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:500;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap;font-family:inherit}
        .tab-btn:hover{color:#64748b}
        .tab-btn.active{color:#3b82f6;border-bottom-color:#3b82f6;font-weight:600}
        .fade{animation:fadeUp 0.2s ease forwards}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .hover-row:hover{background:#f1f5f9!important}
        .mobile-nav{display:none}
        @media(max-width:768px){.mobile-nav{display:flex}.desktop-tabs{display:none}.desktop-nav-right{display:none}}
      `}</style>

      {/* NAV */}
      <div style={s.nav}>
        <div style={s.navInner}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>💰</div>
            <span style={{fontWeight:800,fontSize:16,color:'#0f172a'}}>Finances</span>
          </div>
          <div className="desktop-nav-right" style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{background:'#f1f5f9',borderRadius:20,padding:'5px 12px',fontSize:12,color:'#64748b',fontWeight:500}}>💱 ₹{exchangeRate.toFixed(2)}</div>
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{background:'#f1f5f9',border:'none',color:'#0f172a',borderRadius:20,padding:'6px 12px',fontSize:12,cursor:'pointer',outline:'none',fontWeight:500}}>
              {Array.from({length:24},(_,i)=>{const d=new Date(2025,i,1);const v=d.toISOString().slice(0,7);return <option key={i} value={v}>{d.toLocaleString('default',{month:'short',year:'numeric'})}</option>;})}
            </select>
            <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...s.input,width:160,padding:'6px 12px',fontSize:12}} />
            <button onClick={generatePDF} style={{background:'#f1f5f9',border:'none',color:'#64748b',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:500}}>PDF</button>
            <button onClick={sendEmail} disabled={emailSending} style={{background:'#f1f5f9',border:'none',color:'#64748b',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:500}}>{emailSending?'...':'Email'}</button>
            <div style={{width:1,height:20,background:'#e2e8f0'}}></div>
            <span style={{fontSize:12,color:'#94a3b8'}}>{user.email?.split('@')[0]}</span>
            <button onClick={logout} style={{background:'#fef2f2',border:'none',color:'#ef4444',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:500}}>Logout</button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={s.tabBar} className="desktop-tabs">
        <div style={s.tabInner}>
          {TABS.map(t=><button key={t.id} className={`tab-btn${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>{t.icon} {t.label}</button>)}
        </div>
      </div>

      <div style={s.main}>

        {/* ═══ DASHBOARD ═══ */}
        {activeTab==='dashboard' && (
          <div className="fade">
            {/* HERO */}
            <div style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)',borderRadius:24,padding:'32px 36px',marginBottom:24,color:'white',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20}}>
              <div>
                <p style={{fontSize:11,fontWeight:600,letterSpacing:'0.1em',color:'#93c5fd',marginBottom:8}}>TOTAL NET WORTH</p>
                <p style={{fontSize:48,fontWeight:800,letterSpacing:'-0.03em',lineHeight:1}}>{usd(totalBalance)}</p>
                <p style={{color:'#60a5fa',fontSize:13,marginTop:6}}>{inr(totalBalance)}</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px',fontSize:13}}>
                <div>
                  <p style={{color:'#93c5fd',fontSize:11,marginBottom:2}}>INCOME</p>
                  <p style={{color:'#4ade80',fontWeight:700,fontSize:18}}>{usd(totalIncome)}</p>
                  <Trend curr={totalIncome} prev={prevIncome}/>
                </div>
                <div>
                  <p style={{color:'#93c5fd',fontSize:11,marginBottom:2}}>SPENT</p>
                  <p style={{color:'#f87171',fontWeight:700,fontSize:18}}>{usd(totalExpenses)}</p>
                  <Trend curr={totalExpenses} prev={prevExpenses}/>
                </div>
                <div>
                  <p style={{color:'#93c5fd',fontSize:11,marginBottom:2}}>SAVINGS RATE</p>
                  <p style={{color:savingsRate>=20?'#4ade80':'#fbbf24',fontWeight:700,fontSize:18}}>{savingsRate}%</p>
                </div>
                <div>
                  <p style={{color:'#93c5fd',fontSize:11,marginBottom:2}}>PROJECTED SPEND</p>
                  <p style={{color:'#fbbf24',fontWeight:700,fontSize:18}}>{usd(projectedSpend)}</p>
                </div>
              </div>
            </div>

            {/* ACCOUNT BALANCES */}
            <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',color:'#94a3b8',marginBottom:12}}>ACCOUNT BALANCES</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14,marginBottom:28}}>
              {(['PNC','Chase Checking','Chase Savings'] as string[]).map(acc=>{
                const days = daysSince(accountUpdated[acc]);
                const stale = days !== null && days >= 7;
                return (
                  <div key={acc} style={{background:'white',border:`1px solid ${stale?'#fca5a5':'#e2e8f0'}`,borderRadius:16,padding:20,transition:'box-shadow 0.2s'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,background:ACC_COLOR[acc],borderRadius:'50%'}}></div>
                        <span style={{fontSize:13,fontWeight:600,color:'#64748b'}}>{acc}</span>
                      </div>
                      <button onClick={()=>{setEditingBalance(acc);setTempBalance(String(accountBalances[acc]));}} style={{background:'#f8fafc',border:'1px solid #e2e8f0',color:'#94a3b8',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',fontWeight:500}}>Edit</button>
                    </div>
                    {editingBalance===acc?(
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type="number" value={tempBalance} onChange={e=>setTempBalance(e.target.value)} style={{...s.input,fontSize:18,fontWeight:700,padding:'8px 12px'}} onKeyDown={e=>e.key==='Enter'&&saveBalance(acc)} autoFocus />
                        <button onClick={()=>saveBalance(acc)} style={{...s.btn,background:'#3b82f6',color:'white',padding:'10px 14px',borderRadius:8,whiteSpace:'nowrap'}}>Save</button>
                        <button onClick={()=>setEditingBalance(null)} style={{...s.btn,background:'#f1f5f9',color:'#64748b',padding:'10px 12px',borderRadius:8}}>✕</button>
                      </div>
                    ):(
                      <>
                        <p style={{fontSize:30,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em'}}>{usd(accountBalances[acc])}</p>
                        <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>{inr(accountBalances[acc])}</p>
                        <p style={{fontSize:11,marginTop:10,color:stale?'#ef4444':'#94a3b8',fontWeight:stale?600:400}}>
                          {days===null?'Never updated':stale?`⚠️ Updated ${days} days ago — refresh!`:`✓ Updated ${days===0?'today':`${days}d ago`}`}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* QUICK STATS */}
            <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',color:'#94a3b8',marginBottom:12}}>THIS MONTH — {monthName(selectedMonth).toUpperCase()}</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:28}}>
              {[
                {label:'Daily Avg Spend',value:usd(dailyAvg),color:'#f59e0b'},
                {label:'Net Cash Flow',value:usd(totalIncome-totalExpenses),color:totalIncome-totalExpenses>=0?'#10b981':'#ef4444'},
                {label:'EMI (India)',value:inr(totalEMI),color:'#8b5cf6'},
                {label:'SIP (India)',value:inr(totalSIP),color:'#3b82f6'},
                {label:'Transactions',value:String(fIncome.length+fExpenses.length),color:'#64748b'},
              ].map((c,i)=>(
                <div key={i} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:16}}>
                  <p style={{fontSize:10,color:'#94a3b8',fontWeight:600,letterSpacing:'0.05em',marginBottom:6}}>{c.label.toUpperCase()}</p>
                  <p style={{fontSize:18,fontWeight:800,color:c.color}}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* EXPENSE BREAKDOWN */}
            {Object.keys(categoryTotals).length>0&&(
              <>
                <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',color:'#94a3b8',marginBottom:12}}>EXPENSE BREAKDOWN</p>
                <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:16,padding:24,marginBottom:28}}>
                  {Object.entries(categoryTotals).sort((a:any,b:any)=>b[1]-a[1]).map(([cat,amt]:any)=>{
                    const p=Math.round((amt/totalExpenses)*100);
                    return (
                      <div key={cat} style={{marginBottom:14}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <span style={{fontSize:13,color:'#475569',fontWeight:500}}>{cat}</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{usd(amt)} <span style={{color:'#94a3b8',fontWeight:400,fontSize:12}}>({p}%)</span></span>
                        </div>
                        <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${p}%`,background:'linear-gradient(90deg,#3b82f6,#60a5fa)',borderRadius:3}}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* GOALS PREVIEW */}
            {goals.filter(g=>g.status==='Active').length>0&&(
              <>
                <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.1em',color:'#94a3b8',marginBottom:12}}>SAVINGS GOALS</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
                  {goals.filter(g=>g.status==='Active').map(g=>{
                    const p=Math.min(Math.round((g.saved/g.target)*100),100);
                    return (
                      <div key={g.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:18}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{g.name}</span>
                          <span style={{fontSize:11,fontWeight:700,color:'#3b82f6',background:'#eff6ff',padding:'3px 8px',borderRadius:20}}>{p}%</span>
                        </div>
                        <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden',marginBottom:10}}>
                          <div style={{height:'100%',width:`${p}%`,background:'linear-gradient(90deg,#10b981,#34d399)',borderRadius:3}}></div>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#94a3b8'}}>
                          <span>{usd(g.saved)} saved</span><span>{usd(g.target)} goal</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ INCOME ═══ */}
        {activeTab==='income'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Income</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>All entries · {fIncome.length} records · Total: <span style={{color:'#10b981',fontWeight:700}}>{usd(totalIncome)}</span></p>
              </div>
              <button onClick={()=>setShowAddIncome(true)} style={{...s.btn,background:'#0f172a',color:'white',display:'flex',alignItems:'center',gap:6}}>+ Add Income</button>
            </div>
            <AddForm show={showAddIncome} onClose={()=>setShowAddIncome(false)} title="Add Income" color="#10b981" onAdd={addIncome}>
              <input type="date" value={newIncome.date} onChange={e=>setNewIncome({...newIncome,date:e.target.value})} style={s.input} />
              <input placeholder="Description (e.g. On-campus paycheck)" value={newIncome.description} onChange={e=>setNewIncome({...newIncome,description:e.target.value})} style={s.input} />
              <input type="number" placeholder="Amount ($)" value={newIncome.amount} onChange={e=>setNewIncome({...newIncome,amount:e.target.value})} style={s.input} />
              <select value={newIncome.account} onChange={e=>setNewIncome({...newIncome,account:e.target.value})} style={s.input}>
                <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option>
              </select>
            </AddForm>
            {fIncome.map(e=>(
              <div key={e.id} className="hover-row" style={s.row}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#0f172a'}}>{e.description||'Income'}</span>
                    {e.account&&<span style={{...s.badge,background:ACC_LIGHT[e.account]||'#f1f5f9',color:ACC_COLOR[e.account]||'#64748b'}}>{e.account}</span>}
                  </div>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{e.date}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:15,fontWeight:700,color:'#10b981'}}>{usd(e.amount)}</p>
                    <p style={{fontSize:11,color:'#94a3b8'}}>{inr(e.amount)}</p>
                  </div>
                  <DelBtn col="income" id={e.id}/>
                </div>
              </div>
            ))}
            {fIncome.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No income entries yet. Click + Add Income to start.</div>}
          </div>
        )}

        {/* ═══ EXPENSES ═══ */}
        {activeTab==='expenses'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Expenses</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>All entries · {fExpenses.length} records · Total: <span style={{color:'#ef4444',fontWeight:700}}>{usd(totalExpenses)}</span></p>
              </div>
              <button onClick={()=>setShowAddExpense(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add Expense</button>
            </div>
            <AddForm show={showAddExpense} onClose={()=>setShowAddExpense(false)} title="Add Expense" color="#ef4444" onAdd={addExpense}>
              <input type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense,date:e.target.value})} style={s.input} />
              <select value={newExpense.category} onChange={e=>setNewExpense({...newExpense,category:e.target.value})} style={s.input}>
                <option value="">Select category</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <input placeholder="Description (optional)" value={newExpense.description} onChange={e=>setNewExpense({...newExpense,description:e.target.value})} style={s.input} />
              <input type="number" placeholder="Amount ($)" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:e.target.value})} style={s.input} />
              <select value={newExpense.account} onChange={e=>setNewExpense({...newExpense,account:e.target.value})} style={s.input}>
                <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option>
              </select>
            </AddForm>
            {fExpenses.map(e=>(
              <div key={e.id} className="hover-row" style={s.row}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:600,color:'#0f172a'}}>{e.description||e.category}</span>
                    <span style={{...s.badge,background:'#f5f3ff',color:'#7c3aed'}}>{e.category}</span>
                    {e.account&&<span style={{...s.badge,background:ACC_LIGHT[e.account]||'#f1f5f9',color:ACC_COLOR[e.account]||'#64748b'}}>{e.account}</span>}
                  </div>
                  <span style={{fontSize:12,color:'#94a3b8'}}>{e.date}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:15,fontWeight:700,color:'#ef4444'}}>{usd(e.amount)}</p>
                    <p style={{fontSize:11,color:'#94a3b8'}}>{inr(e.amount)}</p>
                  </div>
                  <DelBtn col="expenses" id={e.id}/>
                </div>
              </div>
            ))}
            {fExpenses.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No expenses yet.</div>}
          </div>
        )}

        {/* ═══ TRANSFERS ═══ */}
        {activeTab==='transfers'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Transfers & Zelle</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>{fTransfers.length} records</p>
              </div>
              <button onClick={()=>setShowAddTransfer(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add Transfer</button>
            </div>
            <AddForm show={showAddTransfer} onClose={()=>setShowAddTransfer(false)} title="Add Transfer / Zelle" color="#3b82f6" onAdd={addTransfer}>
              <input type="date" value={newTransfer.date} onChange={e=>setNewTransfer({...newTransfer,date:e.target.value})} style={s.input} />
              <select value={newTransfer.type} onChange={e=>setNewTransfer({...newTransfer,type:e.target.value})} style={s.input}>
                <option>Bank Transfer</option><option>Zelle Sent</option><option>Zelle Received</option><option>ACH</option><option>Cash</option>
              </select>
              <select value={newTransfer.from} onChange={e=>setNewTransfer({...newTransfer,from:e.target.value})} style={s.input}>
                <option>PNC</option><option>Chase Checking</option><option>Chase Savings</option><option>External</option>
              </select>
              <select value={newTransfer.to} onChange={e=>setNewTransfer({...newTransfer,to:e.target.value})} style={s.input}>
                <option>Chase Savings</option><option>PNC</option><option>Chase Checking</option><option>External</option>
              </select>
              <input type="number" placeholder="Amount ($)" value={newTransfer.amount} onChange={e=>setNewTransfer({...newTransfer,amount:e.target.value})} style={s.input} />
              <input placeholder="Person / Note (optional)" value={newTransfer.person} onChange={e=>setNewTransfer({...newTransfer,person:e.target.value})} style={s.input} />
            </AddForm>
            {fTransfers.map(e=>{
              const isZelle=e.type?.includes('Zelle');
              const isOut=e.type==='Zelle Sent';
              return (
                <div key={e.id} className="hover-row" style={s.row}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <span style={{...s.badge,background:isZelle?(isOut?'#fef2f2':'#f0fdf4'):'#eff6ff',color:isZelle?(isOut?'#ef4444':'#10b981'):'#3b82f6'}}>{e.type}</span>
                      <span style={{fontSize:13,color:'#475569',fontWeight:500}}>{e.from} → {e.to}</span>
                      {e.person&&<span style={{fontSize:12,color:'#94a3b8'}}>· {e.person}</span>}
                    </div>
                    <span style={{fontSize:12,color:'#94a3b8'}}>{e.date}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:15,fontWeight:700,color:isOut?'#ef4444':'#3b82f6'}}>{usd(e.amount)}</span>
                    <DelBtn col="transfers" id={e.id}/>
                  </div>
                </div>
              );
            })}
            {fTransfers.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No transfers yet.</div>}
          </div>
        )}

        {/* ═══ BUDGET ═══ */}
        {activeTab==='budget'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Budget vs Actual</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>{monthName(selectedMonth)}</p>
              </div>
              <button onClick={()=>setShowAddBudget(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add Budget</button>
            </div>
            <AddForm show={showAddBudget} onClose={()=>setShowAddBudget(false)} title="Set Budget" color="#f59e0b" onAdd={addBudget}>
              <select value={newBudget.category} onChange={e=>setNewBudget({...newBudget,category:e.target.value})} style={s.input}>
                <option value="">Select category</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <input type="month" value={newBudget.month} onChange={e=>setNewBudget({...newBudget,month:e.target.value})} style={s.input} />
              <input type="number" placeholder="Budget amount ($)" value={newBudget.amount} onChange={e=>setNewBudget({...newBudget,amount:e.target.value})} style={s.input} />
            </AddForm>
            <div style={{display:'grid',gap:12}}>
              {budgets.filter(b=>b.month===selectedMonth).map(b=>{
                const spent=categoryTotals[b.category]||0;
                const p=Math.min(Math.round((spent/b.amount)*100),100);
                const st=getBudgetStatus(spent,b.amount);
                return (
                  <div key={b.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <span style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{b.category}</span>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{...s.badge,background:st.bg,color:st.color}}>{st.label}</span>
                        <DelBtn col="budgets" id={b.id}/>
                      </div>
                    </div>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:10}}>
                      <div style={{height:'100%',width:`${p}%`,background:p>=100?'#ef4444':p>=80?'#f59e0b':'#10b981',borderRadius:4,transition:'width 0.5s'}}></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span style={{color:'#64748b'}}>Spent: <strong style={{color:'#0f172a'}}>{usd(spent)}</strong></span>
                      <span style={{color:'#64748b'}}>Budget: <strong style={{color:'#0f172a'}}>{usd(b.amount)}</strong></span>
                      <span style={{color:'#64748b'}}>Left: <strong style={{color:st.color}}>{usd(b.amount-spent)}</strong></span>
                    </div>
                  </div>
                );
              })}
              {budgets.filter(b=>b.month===selectedMonth).length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No budgets set for {monthName(selectedMonth)}.</div>}
            </div>
          </div>
        )}

        {/* ═══ GOALS ═══ */}
        {activeTab==='goals'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>Savings Goals</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>{goals.length} goals</p>
              </div>
              <button onClick={()=>setShowAddGoal(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add Goal</button>
            </div>
            <AddForm show={showAddGoal} onClose={()=>setShowAddGoal(false)} title="Add Savings Goal" color="#10b981" onAdd={addGoal}>
              <input placeholder="Goal name (e.g. Emergency Fund)" value={newGoal.name} onChange={e=>setNewGoal({...newGoal,name:e.target.value})} style={s.input}/>
              <input type="number" placeholder="Target amount ($)" value={newGoal.target} onChange={e=>setNewGoal({...newGoal,target:e.target.value})} style={s.input}/>
              <input type="number" placeholder="Already saved ($)" value={newGoal.saved} onChange={e=>setNewGoal({...newGoal,saved:e.target.value})} style={s.input}/>
              <input type="number" placeholder="Monthly contribution ($)" value={newGoal.monthly} onChange={e=>setNewGoal({...newGoal,monthly:e.target.value})} style={s.input}/>
              <select value={newGoal.account} onChange={e=>setNewGoal({...newGoal,account:e.target.value})} style={s.input}>
                <option>Chase Savings</option><option>PNC</option><option>Chase Checking</option>
              </select>
              <select value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})} style={s.input}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </AddForm>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
              {goals.map(g=>{
                const p=Math.min(Math.round((g.saved/g.target)*100),100);
                const rem=g.target-g.saved;
                const months=g.monthly>0?Math.ceil(rem/g.monthly):null;
                return (
                  <div key={g.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:16,padding:22}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{g.name}</span>
                      <DelBtn col="goals" id={g.id}/>
                    </div>
                    <div style={{display:'flex',gap:6,marginBottom:16}}>
                      <span style={{...s.badge,background:ACC_LIGHT[g.account]||'#f1f5f9',color:ACC_COLOR[g.account]||'#64748b'}}>{g.account}</span>
                      <span style={{...s.badge,background:`${PRIORITY_COLOR[g.priority]}18`,color:PRIORITY_COLOR[g.priority]}}>{g.priority} Priority</span>
                    </div>
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:12}}>
                      <div style={{height:'100%',width:`${p}%`,background:'linear-gradient(90deg,#10b981,#34d399)',borderRadius:4}}></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:10}}>
                      <span style={{color:'#64748b'}}>{usd(g.saved)} saved</span>
                      <span style={{fontWeight:700,color:'#10b981'}}>{p}%</span>
                      <span style={{color:'#64748b'}}>{usd(g.target)} goal</span>
                    </div>
                    <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#64748b'}}>
                      <span>Remaining: <strong style={{color:'#0f172a'}}>{usd(rem)}</strong></span>
                      {months&&<span style={{marginLeft:12}}>· ~<strong style={{color:'#0f172a'}}>{months} months</strong> at {usd(g.monthly)}/mo</span>}
                    </div>
                  </div>
                );
              })}
              {goals.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No goals yet. Add your first savings goal!</div>}
            </div>
          </div>
        )}

        {/* ═══ EMI ═══ */}
        {activeTab==='emi'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>EMI Payments</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>India loan payments · Total this month: <span style={{color:'#8b5cf6',fontWeight:700}}>{inr(totalEMI)}</span></p>
              </div>
              <button onClick={()=>setShowAddEmi(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add EMI</button>
            </div>
            <AddForm show={showAddEmi} onClose={()=>setShowAddEmi(false)} title="Add EMI Payment" color="#8b5cf6" onAdd={addEmi}>
              <input type="date" value={newEmi.date} onChange={e=>setNewEmi({...newEmi,date:e.target.value})} style={s.input}/>
              <input placeholder="Loan name (e.g. Dad's Home Loan)" value={newEmi.loanName} onChange={e=>setNewEmi({...newEmi,loanName:e.target.value})} style={s.input}/>
              <input type="number" placeholder="Amount (₹)" value={newEmi.amount} onChange={e=>setNewEmi({...newEmi,amount:e.target.value})} style={s.input}/>
            </AddForm>
            {fEmi.map(e=>(
              <div key={e.id} className="hover-row" style={s.row}>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:'#0f172a',marginBottom:3}}>{e.loanName||'EMI Payment'}</p>
                  <p style={{fontSize:12,color:'#94a3b8'}}>{e.date}</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:15,fontWeight:700,color:'#8b5cf6'}}>{inr(e.amount)}</span>
                  <DelBtn col="emiPayments" id={e.id}/>
                </div>
              </div>
            ))}
            {fEmi.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No EMI entries yet.</div>}
          </div>
        )}

        {/* ═══ SIP ═══ */}
        {activeTab==='sip'&&(
          <div className="fade">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a'}}>SIP Investments</h2>
                <p style={{fontSize:13,color:'#94a3b8',marginTop:2}}>India mutual funds · Total this month: <span style={{color:'#3b82f6',fontWeight:700}}>{inr(totalSIP)}</span></p>
              </div>
              <button onClick={()=>setShowAddSip(true)} style={{...s.btn,background:'#0f172a',color:'white'}}>+ Add SIP</button>
            </div>
            <AddForm show={showAddSip} onClose={()=>setShowAddSip(false)} title="Add SIP Investment" color="#3b82f6" onAdd={addSip}>
              <input type="date" value={newSip.date} onChange={e=>setNewSip({...newSip,date:e.target.value})} style={s.input}/>
              <input placeholder="Fund name" value={newSip.name} onChange={e=>setNewSip({...newSip,name:e.target.value})} style={s.input}/>
              <input type="number" placeholder="Amount (₹)" value={newSip.amount} onChange={e=>setNewSip({...newSip,amount:e.target.value})} style={s.input}/>
            </AddForm>
            {fSips.map(e=>(
              <div key={e.id} className="hover-row" style={s.row}>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:600,color:'#0f172a',marginBottom:3}}>{e.name||'SIP'}</p>
                  <p style={{fontSize:12,color:'#94a3b8'}}>{e.date}</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:15,fontWeight:700,color:'#3b82f6'}}>{inr(e.amount)}</span>
                  <DelBtn col="sips" id={e.id}/>
                </div>
              </div>
            ))}
            {fSips.length===0&&<div style={{textAlign:'center',padding:48,color:'#94a3b8',fontSize:14}}>No SIP entries yet.</div>}
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-nav" style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'space-around',padding:'8px 0 12px',zIndex:100}}>
        {TABS.slice(0,5).map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:'none',border:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 8px',cursor:'pointer',color:activeTab===t.id?'#3b82f6':'#94a3b8',fontFamily:'inherit'}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:600}}>{t.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <p style={{textAlign:'center',color:'#e2e8f0',fontSize:10,letterSpacing:'0.1em',paddingBottom:8}}>
        FINANCE DASHBOARD · {user?.email?.split('@')[0]?.toUpperCase()} · {new Date().getFullYear()}
      </p>
    </div>
  );
}
