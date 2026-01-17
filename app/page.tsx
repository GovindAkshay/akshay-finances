"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBC-zG5N_stJZ6fG8EsE9sj3J-mxDfBHgY",
  authDomain: "akshay-finances.firebaseapp.com",
  projectId: "akshay-finances",
  storageBucket: "akshay-finances.firebasestorage.app",
  messagingSenderId: "794161996701",
  appId: "1:794161996701:web:6f53c1632a3c9d9c9f4574"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function FinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [newIncome, setNewIncome] = useState({ date: '', source: 'Elder Brother', description: '', amount: '' });
  const [newExpense, setNewExpense] = useState({ date: '', category: '', description: '', amount: '' });
  const [newLoan, setNewLoan] = useState({ name: '', principal: '', emi: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  // Real-time listeners
  useEffect(() => {
    const unsubIncome = onSnapshot(collection(db, 'income'), (snapshot) => {
      setIncomeEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      setExpenseEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubLoans = onSnapshot(collection(db, 'loans'), (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubIncome(); unsubExpenses(); unsubLoans(); };
  }, []);

  const addIncome = async () => {
    if (newIncome.date && newIncome.amount) {
      await addDoc(collection(db, 'income'), { ...newIncome, amount: parseFloat(newIncome.amount), createdAt: new Date() });
      setNewIncome({ date: '', source: 'Elder Brother', description: '', amount: '' });
    }
  };

  const addExpense = async () => {
    if (newExpense.date && newExpense.amount && newExpense.category) {
      await addDoc(collection(db, 'expenses'), { ...newExpense, amount: parseFloat(newExpense.amount), createdAt: new Date() });
      setNewExpense({ date: '', category: '', description: '', amount: '' });
    }
  };

  const addLoan = async () => {
    if (newLoan.name && newLoan.emi) {
      await addDoc(collection(db, 'loans'), { ...newLoan, principal: parseFloat(newLoan.principal || '0'), emi: parseFloat(newLoan.emi), createdAt: new Date() });
      setNewLoan({ name: '', principal: '', emi: '' });
    }
  };

  const deleteIncome = async (id: string) => await deleteDoc(doc(db, 'income', id));
  const deleteExpense = async (id: string) => await deleteDoc(doc(db, 'expenses', id));
  const deleteLoan = async (id: string) => await deleteDoc(doc(db, 'loans', id));

  const monthlyIncome = incomeEntries.filter(e => e.date?.startsWith(selectedMonth));
  const monthlyExpenses = expenseEntries.filter(e => e.date?.startsWith(selectedMonth));
  const totalMonthlyIncome = monthlyIncome.reduce((sum, e) => sum + e.amount, 0);
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEMI = loans.reduce((sum, l) => sum + l.emi, 0);
  const balance = totalMonthlyIncome - totalMonthlyExpenses;

  const categoryTotals = monthlyExpenses.reduce((acc: any, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const categories = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Food', 'Healthcare', 'Tuition', 'Books', 'Entertainment', 'Other'];
  const formatUSD = (amt: number) => '$' + amt.toLocaleString();
  const formatINR = (amt: number) => '₹' + Math.round(amt * 83).toLocaleString();

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center"><p className="text-xl">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">💰 Akshay&apos;s Finance Tracker</h1>
        <p className="text-slate-400 mb-6">Track income from brother, expenses &amp; dad&apos;s EMI • <span className="text-green-400">🔄 Synced in real-time</span></p>

        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 mb-6">
          {Array.from({length: 12}, (_, i) => {
            const d = new Date(2025, i, 1);
            return <option key={i} value={d.toISOString().slice(0,7)}>{d.toLocaleString('default', {month: 'long', year: 'numeric'})}</option>;
          })}
        </select>

        <div className="flex flex-wrap gap-2 mb-6">
          {['dashboard', 'income', 'expenses', 'loans'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
              {tab === 'dashboard' ? '📊 Dashboard' : tab === 'income' ? '💰 Income' : tab === 'expenses' ? '💸 Expenses' : '🏦 Loans'}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-900/30 border border-green-700/50 p-4 rounded-xl">
                <p className="text-green-400 text-xs uppercase">Monthly Income</p>
                <p className="text-2xl font-bold text-green-300">{formatUSD(totalMonthlyIncome)}</p>
                <p className="text-green-400/60 text-xs">{formatINR(totalMonthlyIncome)}</p>
              </div>
              <div className="bg-red-900/30 border border-red-700/50 p-4 rounded-xl">
                <p className="text-red-400 text-xs uppercase">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-300">{formatUSD(totalMonthlyExpenses)}</p>
                <p className="text-red-400/60 text-xs">{formatINR(totalMonthlyExpenses)}</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-700/50 p-4 rounded-xl">
                <p className="text-blue-400 text-xs uppercase">Balance</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>{formatUSD(balance)}</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-700/50 p-4 rounded-xl">
                <p className="text-purple-400 text-xs uppercase">Dad&apos;s EMI/Month</p>
                <p className="text-2xl font-bold text-purple-300">{formatINR(totalEMI)}</p>
              </div>
            </div>
            {Object.keys(categoryTotals).length > 0 && (
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <h3 className="font-semibold mb-3">Expense Breakdown</h3>
                {Object.entries(categoryTotals).sort((a: any, b: any) => b[1] - a[1]).map(([cat, amt]: any) => (
                  <div key={cat} className="flex items-center gap-3 mb-2">
                    <span className="w-20 text-sm text-slate-400">{cat}</span>
                    <div className="flex-1 bg-slate-700 rounded h-2"><div className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded" style={{width: `${(amt/totalMonthlyExpenses)*100}%`}}></div></div>
                    <span className="w-16 text-right text-sm">{formatUSD(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'income' && (
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <h2 className="font-semibold mb-4">💰 Income from Brother</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newIncome.date} onChange={e => setNewIncome({...newIncome, date: e.target.value})} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
              <input value={newIncome.description} onChange={e => setNewIncome({...newIncome, description: e.target.value})} placeholder="Description" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 flex-1 min-w-[150px]" />
              <input type="number" value={newIncome.amount} onChange={e => setNewIncome({...newIncome, amount: e.target.value})} placeholder="Amount $" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-28" />
              <button onClick={addIncome} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-medium">+ Add</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {incomeEntries.length === 0 ? <p className="text-slate-500 text-center py-8">No income recorded yet</p> :
                incomeEntries.sort((a,b) => b.date?.localeCompare(a.date)).map(e => (
                <div key={e.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                  <div><p className="font-medium">{e.description || 'Living Expenses'}</p><p className="text-xs text-slate-400">{e.date}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-400">{formatUSD(e.amount)}</span>
                    <button onClick={() => deleteIncome(e.id)} className="text-red-400 hover:text-red-300">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <h2 className="font-semibold mb-4">💸 Expenses</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2" />
              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2">
                <option value="">Category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Description" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 flex-1 min-w-[150px]" />
              <input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} placeholder="Amount $" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-28" />
              <button onClick={addExpense} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-medium">+ Add</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expenseEntries.length === 0 ? <p className="text-slate-500 text-center py-8">No expenses recorded yet</p> :
                expenseEntries.sort((a,b) => b.date?.localeCompare(a.date)).map(e => (
                <div key={e.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                  <div><p className="font-medium">{e.description}</p><p className="text-xs text-slate-400">{e.date} • {e.category}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-400">{formatUSD(e.amount)}</span>
                    <button onClick={() => deleteExpense(e.id)} className="text-red-400 hover:text-red-300">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="bg-slate-800/50 p-4 rounded-xl">
            <h2 className="font-semibold mb-4">🏦 Education Loans (EMI paid by Dad)</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <input value={newLoan.name} onChange={e => setNewLoan({...newLoan, name: e.target.value})} placeholder="Loan Name" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-36" />
              <input type="number" value={newLoan.principal} onChange={e => setNewLoan({...newLoan, principal: e.target.value})} placeholder="Principal ₹" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-32" />
              <input type="number" value={newLoan.emi} onChange={e => setNewLoan({...newLoan, emi: e.target.value})} placeholder="EMI ₹" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 w-28" />
              <button onClick={addLoan} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-medium">+ Add</button>
            </div>
            <div className="space-y-3">
              {loans.length === 0 ? <p className="text-slate-500 text-center py-8">No loans added yet</p> :
                loans.map(l => (
                <div key={l.id} className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <p className="font-semibold">{l.name}</p>
                    <button onClick={() => deleteLoan(l.id)} className="text-red-400 hover:text-red-300">✕</button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Principal: {formatINR(l.principal)}</span>
                    <span className="text-purple-400 font-bold">EMI: {formatINR(l.emi)}/month</span>
                  </div>
                </div>
              ))}
            </div>
            {loans.length > 0 && (
              <div className="mt-4 p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg text-center">
                <p className="text-purple-300">Total Monthly EMI: <span className="font-bold text-xl">{formatINR(totalEMI)}</span></p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-8">🔄 Data syncs automatically with Firebase</p>
      </div>
    </div>
  );
}
