import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Box, LogOut, User, History, AlertTriangle, LayoutGrid, ClipboardList } from 'lucide-react'

// --- CONFIGURATION ---
// Connects to Supabase using the secure keys in your .env file
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

export default function App() {
  const [session, setSession] = useState(null)

  // Manage Session (Keep user logged in)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // If not logged in, show Login Screen. Otherwise, show Dashboard.
  if (!session) return <AuthScreen />
  return <Dashboard session={session} />
}

// --- SCREEN 1: LOGIN / SIGNUP ---
function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (type) => {
    setLoading(true)
    setMsg('') // Clear previous messages
    
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password }) 
    
    if (error) {
      setMsg(error.message)
    } else if (type === 'signup') {
      // SECURITY FEATURE: Instructions for email verification
      setMsg("Success! Please check your email inbox to verify your account.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-3 rounded-full text-white">
            <LayoutGrid size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-1">LIKHA FabLab</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">Inventory Management System</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="engineer@fablab.edu" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>
          
          {msg && <p className={`text-sm text-center p-3 rounded border font-medium ${msg.includes('Success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{msg}</p>}
          
          <div className="flex gap-3 pt-2">
            <button onClick={() => handleAuth('login')} disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm">
              {loading ? '...' : 'Login'}
            </button>
            <button onClick={() => handleAuth('signup')} disabled={loading} className="flex-1 bg-white text-slate-700 border border-slate-300 py-3 rounded-lg font-semibold hover:bg-slate-50 transition">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SCREEN 2: MAIN DASHBOARD ---
function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [newItem, setNewItem] = useState({ name: '', qty: 0, cat: 'Consumable', loc: '' })
  const [view, setView] = useState('inventory') 

  // Load Data on Start
  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    // 1. Get Inventory
    const { data: inv } = await supabase.from('inventory').select('*').order('id')
    if (inv) setItems(inv)

    // 2. Get Logs (Relational Data for Reports) [cite: 17]
    const { data: lg } = await supabase.from('transaction_log')
      .select('*, inventory(item_name)') 
      .order('timestamp', { ascending: false })
      .limit(50)
    if (lg) setLogs(lg)
  }

  // --- CRUD OPERATIONS [cite: 16] ---

  // CREATE: Add new item + Log it
  async function addItem(e) {
    e.preventDefault()
    if (!newItem.name) return
    
    const { data, error } = await supabase.from('inventory').insert([{ 
      item_name: newItem.name, quantity: newItem.qty, category: newItem.cat, location: newItem.loc 
    }]).select()

    if (!error && data) {
      await logTransaction(data[0].id, newItem.qty, 'Initial Stock')
      setNewItem({ name: '', qty: 0, cat: 'Consumable', loc: '' })
      fetchData()
    }
  }

  // UPDATE: Change stock + Log it
  async function updateStock(id, currentQty, change) {
    const newQty = Math.max(0, currentQty + change)
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id)
    await logTransaction(id, change, change > 0 ? 'Restock' : 'Usage')
    fetchData()
  }

  // DELETE: Remove item
  async function deleteItem(id) {
    if (confirm('Are you sure? This will delete the item and its history.')) {
      await supabase.from('inventory').delete().eq('id', id)
      fetchData()
    }
  }

  // HELPER: Add entry to Transaction Log Table
  async function logTransaction(itemId, amount, type) {
    await supabase.from('transaction_log').insert([{
      item_id: itemId, change_amount: amount, action_type: type, user_email: session.user.email
    }])
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
              <LayoutGrid className="text-blue-600"/> LIKHA Inventory
            </h1>
            <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
              <User size={14}/> Logged in as: <span className="font-medium text-slate-700">{session.user.email}</span>
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button onClick={() => setView('inventory')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'inventory' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Box size={18}/> Inventory
            </button>
            <button onClick={() => setView('reports')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <ClipboardList size={18}/> Reports & Logs
            </button>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-100">
              <LogOut size={18}/> Sign Out
            </button>
          </div>
        </div>

        {/* VIEW 1: INVENTORY MANAGEMENT */}
        {view === 'inventory' ? (
          <>
            {/* ADD FORM */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-700"><Plus size={20}/> Add New Material</h3>
              <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 border rounded focus:border-blue-500 outline-none" placeholder="Item Name (e.g. PLA Filament)" />
                </div>
                <div className="md:col-span-3">
                  <select value={newItem.cat} onChange={e => setNewItem({...newItem, cat: e.target.value})} className="w-full p-2 border rounded bg-white focus:border-blue-500 outline-none">
                    <option>Consumable</option><option>Tool</option><option>Equipment</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input type="number" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value)})} className="w-full p-2 border rounded focus:border-blue-500 outline-none" placeholder="Qty" />
                </div>
                <div className="md:col-span-2">
                   <input value={newItem.loc} onChange={e => setNewItem({...newItem, loc: e.target.value})} className="w-full p-2 border rounded focus:border-blue-500 outline-none" placeholder="Location" />
                </div>
                <div className="md:col-span-1">
                  <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium h-full flex items-center justify-center"><Plus/></button>
                </div>
              </form>
            </div>

            {/* INVENTORY TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Item Name</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Category</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Location</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Stock Level</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-800">{item.item_name}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.category === 'Consumable' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{item.category}</span></td>
                      <td className="p-4 text-sm text-slate-500">{item.location || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateStock(item.id, item.quantity, -1)} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">-</button>
                          <span className={`font-bold w-8 text-center ${item.quantity < item.min_stock_level ? 'text-red-500' : 'text-slate-700'}`}>{item.quantity}</span>
                          <button onClick={() => updateStock(item.id, item.quantity, 1)} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">+</button>
                          {item.quantity < item.min_stock_level && <AlertTriangle size={16} className="text-red-500 animate-pulse" title="Low Stock Alert" />}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">No items found. Add one above!</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* VIEW 2: REPORTS & LOGS */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex items-center gap-2">
              <History size={18} className="text-blue-600"/> Transaction History Log
            </div>
            <table className="w-full text-left">
              <thead className="border-b">
                <tr>
                  <th className="p-4 text-sm font-semibold text-slate-500">Timestamp</th>
                  <th className="p-4 text-sm font-semibold text-slate-500">Item</th>
                  <th className="p-4 text-sm font-semibold text-slate-500">Action</th>
                  <th className="p-4 text-sm font-semibold text-slate-500">User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-sm text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-medium">{log.inventory?.item_name || 'Unknown Item'}</td>
                    <td className="p-4 text-sm">
                      <span className={`flex items-center gap-1 ${log.change_amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {log.action_type} 
                        <span className="font-bold bg-slate-100 px-1 rounded ml-1">
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                        </span>
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500 italic">{log.user_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}