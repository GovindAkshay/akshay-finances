"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

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

export default function FinanceTracker() {
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

  const addIncome = async () => { if (newIncome.date && newIncome.amount) { await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount) }); setNewIncome({ date: '', description: '', amount: '' }); }};
  const addExpense = async () => { if (newExpense.date && newExpense.amount && newExpense.category) { await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount) }); setNewExpense({ date: '', category: '', description: '', amount: '' }); }};
  const addLoan = async () => { if (newLoan.name && newLoan.totalAmount) { await addDoc(collection(db, 'loans'), { ...newLoan, totalAmount: parseFloat(newLoan.totalAmount), disbursedAmount: parseFloat(newLoan.disbursedAmount || '0'), usedAmount: parseFloat(newLoan.usedAmount || '0') }); setNewLoan({ name: '', totalAmount: '', disbursedAmount: '', usedAmount: '' }); }};
  const addEmi = async () => { if (newEmi.date && newEmi.amount) { await addDoc(collection(db, 'emiPayments'), { ...newEmi, amount: parseFloat(newEmi.amount) }); setNewEmi({ date: '', loanName: '', amount: '' }); }};
  const addSip = async () => { if (newSip.date && newSip.amount) { await addDoc(collection(db, 'sips'), { ...newSip, amount: parseFloat(newSip.amount) }); setNewSip({ date: '', name: '', amount: '' }); }};

  const deleteItem = async (col: string, id: string) => await deleteDoc(doc(db, col, id));

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

  const groupByMonth = (entries: any[]) => {
    const sorted = [...entries].sort((a, b) => b.date?.localeCompare(a.date));
    const grouped: any = {};
    sorted.forEach(e => {
      const month = e.date?.slice(0, 7) || 'unknown';
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(e);
    });
    return grouped;
  };

  const categories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Food', 'Healthcare', 'Tuition', 'Books', 'Entertainment', 'Splitwise', 'Shopping', 'Other'];
  const formatUSD = (amt: number) => '$' + (amt || 0).toLocaleString();
  const formatINR = (amt: number) => '₹' + Math.round((amt || 0) * 83).toLocaleString();
  const getMonthName = (m: string) => { const d = new Date(m + '-01'); return d.toLocaleString('default', { month: 'long', year: 'numeric' }); };

  if (loading) return <div className="min-h-screen bg-black text-yellow-400 flex items-center justify-center"><p className="text-xl">🦇 Summoning the Batcave...</p></div>;

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 md:p-8" style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a1a2e 0%, #000 70%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🦇</div>
          <h1 className="text-4xl font-black text-yellow-400 tracking-wider" style={{ textShadow: '0 0 20px rgba(250, 204, 21, 0.5)' }}>THE DARK WALLET</h1>
          <p className="text-gray-500 text-sm mt-1">Because even Batman tracks his expenses</p>
        </div>

        {/* Month Filter */}
        <div className="flex justify-center mb-6">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-gray-900 border-2 border-yellow-500/50 rounded-lg px-4 py-2 text-yellow-400 font-medium">
            <option value="all">🦇 All Time</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2025, i, 1);
              return <option key={i} value={d.toISOString().slice(0, 7)}>{d.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
            })}
          </select>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['dashboard', 'income', 'expenses', 'loans', 'sip'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg font-bold uppercase tracking-wide text-sm transition-all ${activeTab === tab ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-gray-900 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'}`}>
              {tab === 'dashboard' ? '🦇 Batcave' : tab === 'income' ? '💰 Cash In' : tab === 'expenses' ? '💸 Cash Out' : tab === 'loans' ? '🏦 Loans' : '📈 SIP'}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-900/40 to-green-950/40 border border-green-500/30 p-4 rounded-xl">
                <p className="text-green-400 text-xs uppercase font-bold">Total Income</p>
                <p className="text-2xl font-black text-green-300">{formatUSD(totalIncome)}</p>
                <p className="text-green-500/60 text-xs">{formatINR(totalIncome)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-900/40 to-red-950/40 border border-red-500/30 p-4 rounded-xl">
                <p className="text-red-400 text-xs uppercase font-bold">Total Expenses</p>
                <p className="text-2xl font-black text-red-300">{formatUSD(totalExpenses)}</p>
                <p className="text-red-500/60 text-xs">{formatINR(totalExpenses)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/40 border border-yellow-500/30 p-4 rounded-xl">
                <p className="text-yellow-400 text-xs uppercase font-bold">Balance</p>
                <p className={`text-2xl font-black ${balance >= 0 ? 'text-yellow-300' : 'text-orange-400'}`}>{formatUSD(balance)}</p>
                <p className="text-yellow-500/60 text-xs">{formatINR(balance)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-950/40 border border-purple-500/30 p-4 rounded-xl">
                <p className="text-purple-400 text-xs uppercase font-bold">EMI Paid</p>
                <p className="text-2xl font-black text-purple-300">{formatINR(totalEMI)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-500/30 p-4 rounded-xl">
                <p className="text-blue-400 text-xs uppercase font-bold">SIP Invested</p>
                <p className="text-2xl font-black text-blue-300">{formatINR(totalSIP)}</p>
              </div>
            </div>
            <div className="bg-gray-900/50 border border-yellow-500/20 p-4 rounded-xl">
              <h3 className="text-yellow-400 font-bold mb-3">🦇 Loan Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-black/50 rounded-lg"><p className="text-gray-400 text-xs">Total Sanctioned</p><p className="text-xl font-bold text-white">{formatINR(loans.reduce((s, l) => s + l.totalAmount, 0))}</p></div>
                <div className="text-center p-3 bg-black/50 rounded-lg"><p className="text-gray-400 text-xs">Disbursed</p><p className="text-xl font-bold text-green-400">{formatINR(loans.reduce((s, l) => s + l.disbursedAmount, 0))}</p></div>
                <div className="text-center p-3 bg-black/50 rounded-lg"><p className="text-gray-400 text-xs">Available Balance</p><p className="text-xl font-bold text-yellow-400">{formatINR(totalLoanBalance)}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div className="bg-gray-900/50 border border-yellow-500/20 p-4 rounded-xl">
            <h2 className="text-yellow-400 font-bold text-xl mb-4">💰 Cash In</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white" />
              <input value={newIncome.description} onChange={e => setNewIncome({ ...newIncome, description: e.target.value })} placeholder="Description" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white flex-1 min-w-[150px]" />
              <input type="number" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })} placeholder="Amount $" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-28" />
              <button onClick={addIncome} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold">+ ADD</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupByMonth(filteredIncome)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 rounded-lg mb-2">
                    <span className="text-yellow-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-yellow-300 font-bold">{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded-lg mb-1 ml-2">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-400">{e.description || 'Income'}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-400">{formatUSD(e.amount)}</span>
                        <button onClick={() => deleteItem('income', e.id)} className="text-red-500 hover:text-red-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-center">
              <p className="text-green-300">Total Cash In: <span className="font-black text-2xl">{formatUSD(totalIncome)}</span> <span className="text-green-400/60">({formatINR(totalIncome)})</span></p>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="bg-gray-900/50 border border-yellow-500/20 p-4 rounded-xl">
            <h2 className="text-yellow-400 font-bold text-xl mb-4">💸 Cash Out</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white" />
              <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white">
                <option value="">Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white flex-1 min-w-[150px]" />
              <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Amount $" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-28" />
              <button onClick={addExpense} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold">+ ADD</button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupByMonth(filteredExpenses)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-lg mb-2">
                    <span className="text-red-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-red-300 font-bold">{formatUSD(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded-lg mb-1 ml-2">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-400">{e.description} • <span className="text-yellow-500">{e.category}</span></p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-400">{formatUSD(e.amount)}</span>
                        <button onClick={() => deleteItem('expenses', e.id)} className="text-red-500 hover:text-red-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
              <p className="text-red-300">Total Cash Out: <span className="font-black text-2xl">{formatUSD(totalExpenses)}</span> <span className="text-red-400/60">({formatINR(totalExpenses)})</span></p>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            {/* Loan Disbursement Section */}
            <div className="bg-gray-900/50 border border-yellow-500/20 p-4 rounded-xl">
              <h2 className="text-yellow-400 font-bold text-xl mb-4">🏦 Loan Disbursement</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <input value={newLoan.name} onChange={e => setNewLoan({ ...newLoan, name: e.target.value })} placeholder="Loan Name" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-36" />
                <input type="number" value={newLoan.totalAmount} onChange={e => setNewLoan({ ...newLoan, totalAmount: e.target.value })} placeholder="Total Sanctioned ₹" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-40" />
                <input type="number" value={newLoan.disbursedAmount} onChange={e => setNewLoan({ ...newLoan, disbursedAmount: e.target.value })} placeholder="Disbursed ₹" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-32" />
                <input type="number" value={newLoan.usedAmount} onChange={e => setNewLoan({ ...newLoan, usedAmount: e.target.value })} placeholder="Used ₹" className="bg-black border border-yellow-500/30 rounded-lg px-3 py-2 text-white w-28" />
                <button onClick={addLoan} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold">+ ADD</button>
              </div>
              <div className="space-y-3">
                {loans.map(l => (
                  <div key={l.id} className="bg-black/50 p-4 rounded-lg border border-yellow-500/20">
                    <div className="flex justify-between mb-3">
                      <p className="font-bold text-yellow-400 text-lg">{l.name}</p>
                      <button onClick={() => deleteItem('loans', l.id)} className="text-red-500 hover:text-red-400">✕</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800 p-2 rounded"><p className="text-xs text-gray-400">Sanctioned</p><p className="font-bold text-white">{formatINR(l.totalAmount)}</p></div>
                      <div className="bg-gray-800 p-2 rounded"><p className="text-xs text-gray-400">Disbursed</p><p className="font-bold text-green-400">{formatINR(l.disbursedAmount)}</p></div>
                      <div className="bg-gray-800 p-2 rounded"><p className="text-xs text-gray-400">Balance</p><p className="font-bold text-yellow-400">{formatINR(l.disbursedAmount - l.usedAmount)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EMI Payments Section */}
            <div className="bg-gray-900/50 border border-purple-500/20 p-4 rounded-xl">
              <h2 className="text-purple-400 font-bold text-xl mb-4">💳 Monthly EMI Payments</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <input type="date" value={newEmi.date} onChange={e => setNewEmi({ ...newEmi, date: e.target.value })} className="bg-black border border-purple-500/30 rounded-lg px-3 py-2 text-white" />
                <input value={newEmi.loanName} onChange={e => setNewEmi({ ...newEmi, loanName: e.target.value })} placeholder="Loan Name" className="bg-black border border-purple-500/30 rounded-lg px-3 py-2 text-white flex-1 min-w-[120px]" />
                <input type="number" value={newEmi.amount} onChange={e => setNewEmi({ ...newEmi, amount: e.target.value })} placeholder="EMI Amount ₹" className="bg-black border border-purple-500/30 rounded-lg px-3 py-2 text-white w-32" />
                <button onClick={addEmi} className="bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-lg font-bold">+ ADD EMI</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {emiPayments.sort((a, b) => b.date?.localeCompare(a.date)).map(e => (
                  <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded-lg">
                    <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-400">{e.loanName}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-purple-400">{formatINR(e.amount)}</span>
                      <button onClick={() => deleteItem('emiPayments', e.id)} className="text-red-500 hover:text-red-400">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-center">
                <p className="text-purple-300">Total EMI Paid: <span className="font-black text-2xl">{formatINR(totalEMI)}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* SIP Tab */}
        {activeTab === 'sip' && (
          <div className="bg-gray-900/50 border border-blue-500/20 p-4 rounded-xl">
            <h2 className="text-blue-400 font-bold text-xl mb-4">📈 Monthly SIP Investments</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newSip.date} onChange={e => setNewSip({ ...newSip, date: e.target.value })} className="bg-black border border-blue-500/30 rounded-lg px-3 py-2 text-white" />
              <input value={newSip.name} onChange={e => setNewSip({ ...newSip, name: e.target.value })} placeholder="SIP Name / Fund" className="bg-black border border-blue-500/30 rounded-lg px-3 py-2 text-white flex-1 min-w-[150px]" />
              <input type="number" value={newSip.amount} onChange={e => setNewSip({ ...newSip, amount: e.target.value })} placeholder="Amount ₹" className="bg-black border border-blue-500/30 rounded-lg px-3 py-2 text-white w-28" />
              <button onClick={addSip} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg font-bold">+ ADD SIP</button>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(groupByMonth(filteredSips)).map(([month, entries]: any) => (
                <div key={month}>
                  <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-lg mb-2">
                    <span className="text-blue-400 font-bold">{getMonthName(month)}</span>
                    <span className="text-blue-300 font-bold">{formatINR(entries.reduce((s: number, e: any) => s + e.amount, 0))}</span>
                  </div>
                  {entries.map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center bg-black/50 p-3 rounded-lg mb-1 ml-2">
                      <div><p className="font-bold text-white">{e.date}</p><p className="text-sm text-gray-400">{e.name}</p></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-400">{formatINR(e.amount)}</span>
                        <button onClick={() => deleteItem('sips', e.id)} className="text-red-500 hover:text-red-400">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-center">
              <p className="text-blue-300">Total SIP Invested: <span className="font-black text-2xl">{formatINR(totalSIP)}</span></p>
            </div>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-8">🦇 Gotham&apos;s finest financial tracking system</p>
      </div>
    </div>
  );
}
