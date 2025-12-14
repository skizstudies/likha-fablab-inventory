import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Plus, Trash2, LogOut, User, LayoutGrid, Search, X, 
  ChevronRight, Edit3, Save, MoreVertical, Settings, AlertTriangle, ArrowLeft,
  Camera, Loader2, ChevronDown, FileText, Minus
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts'

// --- CONFIGURATION ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setUserProfile(data)
  }

  if (!session) return <AuthScreen />
  return <MainApp session={session} userProfile={userProfile} refreshProfile={() => fetchProfile(session.user.id)} />
}

// --- AUTH SCREEN ---
function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [srCode, setSrCode] = useState('')
  const [userType, setUserType] = useState('Student')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setMsg(error.message); setLoading(false); return }
      if (data?.user) {
        await supabase.from('profiles').update({
          first_name: firstName, last_name: lastName, sr_code: srCode, user_type: userType
        }).eq('id', data.user.id)
        setMsg("Account created! Check email to verify.")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
    }
    setLoading(false)
  }

  // Inside AuthScreen function...
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <form onSubmit={handleAuth} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h1 className="text-3xl font-bold text-center text-red-900 mb-2">LIKHA FabLab</h1>
        <p className="text-slate-500 text-center mb-6 text-sm uppercase tracking-wide">Inventory System</p>
        
        <div className="space-y-3">
          {/* Simple Email & Password for everyone */}
          <input required type="email" placeholder="Email" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          
          {msg && <div className="p-3 bg-red-50 text-red-700 text-sm rounded text-center">{msg}</div>}

          <button disabled={loading} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Log In')}
          </button>
          
          <div className="text-center mt-4">
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-500 hover:text-red-600 underline">
              {isRegister ? "Already have an account? Login" : "New here? Create Account"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// --- MAIN APP ---
function MainApp({ session, userProfile, refreshProfile }) {
  const [view, setView] = useState('inventory') 
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false) // Dropdown state
  const [isEditing, setIsEditing] = useState(false) // Side panel edit state
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // New Item State
  const [newItem, setNewItem] = useState({ name: '', cat: 'Consumable', qty: 0, loc: '', desc: '', color: '#3b82f6', tags: '', threshold: 5, img: '' })

  useEffect(() => { fetchData() }, [])

  // 3. Onboarding Check Effect (The one we updated)
  useEffect(() => {
    // Safe check: If profile exists, AND (name is missing OR name is "New User")
    if (userProfile && (!userProfile.first_name || userProfile.first_name === 'New User')) {
      setIsOnboarding(true)
    } else {
      setIsOnboarding(false)
    }
  }, [userProfile])

  async function fetchData() {
    console.log("Fetching data...") // Check console to see if this runs

    // 1. GET INVENTORY (Isolated - so it always works)
    const { data: inv, error: invError } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name')
    
    if (invError) {
      console.error("Inventory Error:", invError)
    } else {
      setItems(inv)
    }

    // 2. GET LOGS (Now with Profiles!)
    const { data: lg, error: logError } = await supabase
      .from('transaction_log')
      .select(`
        *,
        inventory ( item_name ),
        profiles ( first_name, last_name ) 
      `) // <--- We now fetch the Profile Name too
      .order('timestamp', { ascending: false })
      
    if (logError) {
      console.error("Log Error:", logError)
    } else {
      setLogs(lg)
    }
  }

  // --- ACTIONS ---
  async function handleAddItem(e) {
    e.preventDefault()
    setIsSaving(true)

    try {
      // 1. CLEAN THE DATA (The "Sanitization" Step)
      // If the user types nothing, we force it to be 0 or an empty array.
      
      const safeQty = parseInt(newItem.qty) || 0
      const safeThreshold = parseInt(newItem.threshold) || 5
      
      // Handle tags: If empty, send [], otherwise split by comma
      const safeTags = newItem.tags 
        ? newItem.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : []

      // 2. CREATE THE PAYLOAD
      const itemPayload = { 
        item_name: newItem.name || 'Untitled Item', // Fallback name
        category: newItem.cat, 
        quantity: safeQty, 
        location: newItem.loc || '',
        description: newItem.desc || '', 
        color_code: newItem.color, 
        tags: safeTags, 
        threshold: safeThreshold, 
        image_url: newItem.img || null // Send null if empty, not ""
      }

      console.log("Sending to Supabase:", itemPayload) // <--- Check Console if it fails again!

      // 3. SEND TO DATABASE
      const { data, error } = await supabase.from('inventory').insert([itemPayload]).select()
  
      if (error) throw error

      // 4. SUCCESS!
      await logTransaction(data[0].id, safeQty, 'Initial Stock')
      setIsModalOpen(false)
      fetchData()
      
      // 5. RESET FORM
      setNewItem({ name: '', cat: 'Consumable', qty: 0, loc: '', desc: '', color: '#3b82f6', tags: '', threshold: 5, img: '' })
      
    } catch (error) {
      alert("Database Error: " + error.message)
      console.error("Full Error Details:", error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateItem() {
    // 1. Find the original item to compare values (Before the edit)
    const originalItem = items.find(i => i.id === selectedItem.id)
    if (!originalItem) return

    // 2. Calculate the difference for the Log
    const stockDifference = selectedItem.quantity - originalItem.quantity

    // 3. Update the Item in Database (Everything: Stock, Name, Desc, etc.)
    const { error } = await supabase.from('inventory').update({
      item_name: selectedItem.item_name,
      category: selectedItem.category,
      quantity: selectedItem.quantity, // Save the new quantity here
      location: selectedItem.location,
      description: selectedItem.description,
      threshold: selectedItem.threshold
    }).eq('id', selectedItem.id)
    
    // 4. If Stock changed, Save the Log
    if (!error && stockDifference !== 0) {
      const type = stockDifference > 0 ? 'Restock' : 'Usage'
      await logTransaction(selectedItem.id, stockDifference, type)
    }

    if (!error) {
      setIsEditing(false)
      fetchData() // Refresh the table
    }
  }

  async function handleDeleteItem(id) {
    if(!confirm("Are you sure you want to delete this item?")) return;
    await supabase.from('inventory').delete().eq('id', id)
    setSelectedItem(null)
    fetchData()
  }

  async function handleStockChange(id, currentQty, newQty) {
    const change = newQty - currentQty
    if (change === 0) return
    
    // 1. Update Inventory
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id)
    
    // 2. Log Transaction
    await logTransaction(id, change, change > 0 ? 'Restock' : 'Usage')
    
    // 3. Update UI
    fetchData()
    if (selectedItem?.id === id) setSelectedItem(prev => ({...prev, quantity: newQty}))
  }

  async function logTransaction(itemId, amount, type) {
    // We now save the user_id (for the Name) AND user_email (as backup)
    const { error } = await supabase.from('transaction_log').insert([{
      item_id: itemId, 
      change_amount: amount, 
      action_type: type, 
      user_email: session.user.email,
      user_id: session.user.id // <--- THIS IS NEW
    }])

    if (error) console.error("Log Error:", error)
  }

  // --- CHART DATA PREP ---
  // Bar Chart: Stock Status (Red, Yellow, Green)
  const stockStatusData = [
    { name: 'In Stock', value: items.filter(i => i.quantity > i.threshold).length, fill: '#10b981' },
    { name: 'Low Stock', value: items.filter(i => i.quantity <= i.threshold && i.quantity > 0).length, fill: '#f59e0b' },
    { name: 'Out of Stock', value: items.filter(i => i.quantity === 0).length, fill: '#ef4444' },
  ]

  // Pie Chart: Usage Frequency (Top 5 Items Used)
  const usageData = logs
    .filter(l => l.action_type === 'Usage')
    .reduce((acc, log) => {
      const name = log.inventory?.item_name || 'Unknown'
      const existing = acc.find(x => x.name === name)
      if (existing) existing.value += Math.abs(log.change_amount)
      else acc.push({ name, value: Math.abs(log.change_amount) })
      return acc
    }, [])
    .sort((a,b) => b.value - a.value)
    .slice(0, 5)

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  )

return (
    // 1. GLOBAL RED BACKGROUND (The Canvas)
    <div className="flex h-screen bg-red-900 p-4 gap-4 overflow-hidden font-sans">
      
      {/* 2. FLOATING SIDEBAR (White Pill) */}
      <aside className="w-64 bg-white rounded-[2rem] shadow-2xl flex flex-col py-6 md:flex z-20">
        
        {/* Logo Area */}
        <div className="px-8 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-red-200 shadow-lg">
            <LayoutGrid size={22} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold text-slate-800 tracking-tight">LIKHA<span className="text-red-600">FabLab</span></span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => {setView('inventory'); setSelectedItem(null)}}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${view === 'inventory' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <LayoutGrid size={20} />
            <span className="font-bold text-sm tracking-wide">Inventory</span>
          </button>

          <button 
            onClick={() => {setView('reports'); setSelectedItem(null)}}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${view === 'reports' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <FileText size={20} />
            <span className="font-bold text-sm tracking-wide">Reports</span>
          </button>
        </nav>

        {/* User Profile Snippet (Bottom of Sidebar) */}
        <div className="px-6 mt-auto">
          <button onClick={() => setView('profile')} className="w-full bg-slate-50 p-3 rounded-2xl flex items-center gap-3 hover:bg-slate-100 transition border border-slate-100 group">
             <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm overflow-hidden">
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} className="w-full h-full object-cover"/> : (userProfile?.first_name?.[0] || 'U')}
             </div>
             <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-slate-700 truncate group-hover:text-red-600 transition">{userProfile?.first_name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{userProfile?.user_type || 'Student'}</p>
             </div>
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE (The White Sheet) */}
      <main className="flex-1 bg-slate-50 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Top Header Bar */}
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-10">
           
           {/* Search Bar - Only visible in Inventory */}
           {view === 'inventory' ? (
             <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 w-96 focus-within:ring-2 focus-within:ring-red-100 transition">
               <Search size={18} className="text-slate-400"/>
               <input 
                 type="text" 
                 placeholder="Search inventory..." 
                 className="bg-transparent outline-none text-sm font-bold text-slate-600 w-full placeholder:text-slate-300"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
           ) : (
             /* Empty spacer to keep the Profile/Logout buttons on the right side */
             <div></div>
           )}

           {/* Header Controls */}
           <div className="flex items-center gap-4">
             {/* Add Item Button (Moved to Header) */}
             {view === 'inventory' && (
                <button onClick={() => setIsModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 transition text-sm">
                    <Plus size={18} /> Add Item
                </button>
             )}

             <button 
                onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}
                className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Sign Out"
             >
               <LogOut size={18} />
             </button>
           </div>
        </header>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8 relative scroll-smooth">
           
           {/* --- VIEW: INVENTORY --- */}
           {view === 'inventory' && (
              <div className={`animate-pop transition-all duration-300 ${selectedItem ? 'mr-[450px]' : ''}`}>
                 {/* Stats Row (Optional Visuals) */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-6 text-white shadow-xl shadow-red-200 relative overflow-hidden">
                       <h3 className="text-red-100 font-medium mb-1">Total Items</h3>
                       <p className="text-4xl font-bold tracking-tight">{items.length}</p>
                       <LayoutGrid className="absolute bottom-[-10px] right-[-10px] opacity-20 text-white" size={100}/>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-center">
                       <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Low Stock Alerts</h3>
                       <div className="flex items-end gap-2">
                          <p className="text-4xl font-bold text-slate-800">{items.filter(i => i.quantity <= i.threshold).length}</p>
                          <span className="text-sm text-red-500 font-bold mb-2 bg-red-50 px-2 py-1 rounded-lg">Needs Attention</span>
                       </div>
                    </div>
                 </div>

                 {/* The Table */}
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full">
                     <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                       <tr>
                         <th className="p-4 text-left font-bold pl-8">Item Name</th>
                         <th className="p-4 text-center font-bold">Category</th>
                         <th className="p-4 text-center font-bold">Stock</th>
                         <th className="p-4 text-center font-bold">Location</th>
                         <th className="p-4 text-center font-bold">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredItems.map(item => {
                         const isLow = item.quantity <= item.threshold
                         return (
                           <tr key={item.id} onClick={() => {setSelectedItem(item); setIsEditing(false)}} 
                             className={`cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 transition group ${isLow ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                             <td className="p-4 pl-8">
                               <div className="flex items-center gap-4">
                                 <div className="w-3 h-10 rounded-full" style={{backgroundColor: item.color_code}}></div>
                                 <div>
                                   <div className="font-bold text-slate-800 text-base">{item.item_name}</div>
                                   {isLow && <div className="text-[10px] text-red-500 font-bold uppercase tracking-wide flex items-center gap-1 mt-0.5"><AlertTriangle size={10}/> Low Stock</div>}
                                 </div>
                               </div>
                             </td>
                             <td className="p-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 uppercase tracking-wide">{item.category}</span></td>
                             <td className="p-4 text-center">
                               <span className={`font-mono font-bold text-lg ${item.quantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>{item.quantity}</span>
                             </td>
                             <td className="p-4 text-center text-sm font-medium text-slate-500">{item.location}</td>
                             <td className="p-4 text-center">
                               <button onClick={(e) => {e.stopPropagation(); handleDeleteItem(item.id)}} className="p-2 text-slate-300 hover:text-red-500 transition hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                             </td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
                   {filteredItems.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No items found matching "{search}"</div>}
                 </div>
              </div>
           )}

           {/* --- VIEW: REPORTS --- */}
           {view === 'reports' && (
              <div className="max-w-6xl mx-auto animate-pop">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics & Logs</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-700 mb-4">Stock Status Overview</h3>
                     <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={stockStatusData}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                             <ChartTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                             <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                               {stockStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                             </Bar>
                           </BarChart>
                         </ResponsiveContainer>
                     </div>
                   </div>

                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-700 mb-4">Usage Frequency</h3>
                     <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                             <Pie data={usageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                               {usageData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Pie>
                             <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                             <ChartTooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                           </PieChart>
                         </ResponsiveContainer>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-6 border-b border-slate-100 font-bold text-slate-800">History Logs</div>
                   <table className="w-full text-left">
                     <thead className="text-xs uppercase text-slate-400 bg-slate-50"><tr><th className="p-4 pl-6">Date</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Item</th></tr></thead>
                     <tbody>
                       {logs.map(log => (
                         <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                           <td className="p-4 pl-6 text-sm text-slate-500 font-medium">{new Date(log.timestamp).toLocaleDateString()}</td>
                           <td className="p-4 font-bold text-slate-700">
                             {log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : log.user_email}
                           </td>
                           <td className="p-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${log.change_amount > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{log.action_type} {log.change_amount > 0 ? '+' : ''}{log.change_amount}</span></td>
                           <td className="p-4 text-sm font-medium text-slate-600">{log.inventory?.item_name}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
           )}

           {/* --- VIEW: PROFILE (Compacted & Centered) --- */}
           {view === 'profile' && userProfile && (
              // 1. h-full + items-center centers it perfectly in the white sheet
              <div className="h-full flex items-center justify-center animate-pop p-2">
                
                {/* 2. Reduced padding (p-8 -> p-6) to save height */}
                <div className="bg-white w-full max-w-lg p-6 rounded-3xl shadow-sm border border-slate-200">
                  
                  {/* Header: Back Button & Title */}
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={() => setView('inventory')} 
                      className="group flex items-center gap-2 text-slate-400 hover:text-red-600 transition-colors font-bold text-sm"
                    >
                      <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" /> 
                      Back
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
                    <div className="w-8"></div> {/* Spacer to center title */}
                  </div>
                  
                  {/* Avatar Uploader (Compact) */}
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                       <div className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-inner overflow-hidden bg-slate-100 flex items-center justify-center">
                         {userProfile.avatar_url ? <img src={`${userProfile.avatar_url}?t=${new Date().getTime()}`} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300"/>}
                       </div>
                       <label className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition cursor-pointer hover:scale-105 active:scale-95">
                         {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
                         <input type="file" accept="image/*" className="hidden" disabled={isSaving}
                           onChange={async (e) => {
                             if (!e.target.files || e.target.files.length === 0) return
                             setIsSaving(true)
                             try {
                               const file = e.target.files[0]
                               const fileName = `${session.user.id}-${Math.random()}.${file.name.split('.').pop()}`
                               const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file)
                               if (uploadError) throw uploadError
                               const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
                               await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id)
                               await refreshProfile()
                               alert("Profile picture updated!")
                             } catch (error) { alert("Error: " + error.message) } finally { setIsSaving(false) }
                           }} 
                         />
                       </label>
                    </div>
                  </div>

                  {/* Form (Reduced vertical space) */}
                  <form onSubmit={async (e) => {
                      e.preventDefault()
                      const formData = new FormData(e.target)
                      const { error } = await supabase.from('profiles').update({
                        first_name: formData.get('firstName'),
                        last_name: formData.get('lastName'),
                      }).eq('id', session.user.id)
                      if (!error) { alert("Profile Updated!"); refreshProfile() }
                  }} className="space-y-12">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">First Name</label>
                        <input name="firstName" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-red-500 transition font-medium text-sm" defaultValue={userProfile.first_name} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Last Name</label>
                        <input name="lastName" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-red-500 transition font-medium text-sm" defaultValue={userProfile.last_name} />
                      </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">User Role</label>
                       <div className="w-full p-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-medium text-sm cursor-not-allowed">
                         {userProfile.user_type || 'Student'}
                       </div>
                    </div>

                    <div className="pt-2">
                       <button className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition active:scale-[0.98] text-sm">Save Changes</button>
                    </div>
                  </form>

                </div>
              </div>
           )}

        </div>

      </main>

      {/* 4. SLIDE-OVER PANEL (Fixed on right, but styled to float) */}
      <div className={`fixed top-4 bottom-4 right-4 w-[450px] bg-white rounded-3xl shadow-2xl transform transition-transform duration-300 z-50 overflow-hidden flex flex-col border border-slate-100 ${selectedItem ? 'translate-x-0' : 'translate-x-[120%]'}`}>
          {selectedItem && (
             <div className="flex-1 flex flex-col overflow-y-auto p-8 pb-32">
                <div className="flex justify-between items-start mb-6">
                  <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24}/></button>
                  <div className="flex gap-2">
                     {isEditing ? (
                       <button onClick={handleUpdateItem} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition"><Save size={18}/> Save</button>
                     ) : (
                       <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition"><Edit3 size={18}/> Edit</button>
                     )}
                  </div>
                </div>
                
                {selectedItem.image_url ? (
                  <div className="w-full h-64 bg-slate-50 rounded-2xl mb-8 border border-slate-100 flex items-center justify-center p-4">
                    <img src={selectedItem.image_url} className="w-full h-full object-contain mix-blend-multiply" alt="Item Preview"/>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-slate-50 rounded-2xl mb-8 flex items-center justify-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200">No Image Available</div>
                )}

                <div className="space-y-8">
                   <div>
                     {isEditing ? <input className="text-3xl font-bold w-full border-b-2 border-red-500 outline-none pb-2 bg-transparent" value={selectedItem.item_name} onChange={e => setSelectedItem({...selectedItem, item_name: e.target.value})} /> : <h2 className="text-3xl font-bold text-slate-900">{selectedItem.item_name}</h2>}
                     {isEditing ? (
                       <select className="mt-4 p-3 border rounded-xl w-full bg-slate-50" value={selectedItem.category} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})}><option>Consumable</option><option>Tool</option><option>Equipment</option></select>
                     ) : (
                       <span className="mt-3 inline-block px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase tracking-wide">{selectedItem.category}</span>
                     )}
                   </div>

                   {/* Stock Card (Using your updated code) */}
                   <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{isEditing ? "Adjust Stock Level" : "Current Stock"}</h3>
                      <div className={`p-1.5 rounded-3xl border ${isEditing ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50'}`}>
                        {isEditing ? (
                          <div className="flex items-center gap-2 p-1">
                            <button onClick={() => setSelectedItem({...selectedItem, quantity: Math.max(0, selectedItem.quantity - 1)})} className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-600 font-bold text-slate-600 shadow-sm transition"><Minus size={20} /></button>
                            <input type="number" value={selectedItem.quantity} onChange={(e) => setSelectedItem({...selectedItem, quantity: parseInt(e.target.value) || 0})} className="flex-1 h-14 text-center border border-slate-200 rounded-2xl font-bold text-2xl outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-inner"/>
                            <button onClick={() => setSelectedItem({...selectedItem, quantity: selectedItem.quantity + 1})} className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-green-50 hover:text-green-600 font-bold text-slate-600 shadow-sm transition"><Plus size={20} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-6">
                            <div className="flex flex-col">
                              <span className="text-5xl font-bold text-slate-800 tracking-tight">{selectedItem.quantity}</span>
                              <span className="text-xs font-bold text-slate-400 uppercase mt-1">Units Available</span>
                            </div>
                            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${selectedItem.quantity <= selectedItem.threshold ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${selectedItem.quantity <= selectedItem.threshold ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                              <span className="text-xs font-bold uppercase tracking-wide">{selectedItem.quantity <= selectedItem.threshold ? 'Low Stock' : 'In Stock'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>

                   <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Description</h4>
                     {isEditing ? <textarea className="w-full p-4 border border-slate-200 rounded-xl h-32 bg-slate-50 focus:bg-white transition" value={selectedItem.description} onChange={e => setSelectedItem({...selectedItem, description: e.target.value})} /> : <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.description || "No description."}</p>}
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                       <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Location</h4>
                         {isEditing ? <input className="w-full border-b py-1 border-slate-300 focus:border-red-500 outline-none bg-transparent" value={selectedItem.location} onChange={e => setSelectedItem({...selectedItem, location: e.target.value})}/> : <p className="font-bold text-slate-800">{selectedItem.location}</p>}
                       </div>
                       <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Low Stock Limit</h4>
                         {isEditing ? <input type="number" className="w-full border-b py-1 border-slate-300 focus:border-red-500 outline-none bg-transparent" value={selectedItem.threshold} onChange={e => setSelectedItem({...selectedItem, threshold: parseInt(e.target.value)})}/> : <p className="font-bold text-red-500">{selectedItem.threshold} items</p>}
                       </div>
                   </div>
                </div>
             </div>
          )}
      </div>

      {/* 5. MODALS (Add Item & Onboarding) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Add New Material</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <input required placeholder="Item Name" className="p-4 border border-slate-200 rounded-xl col-span-2 focus:ring-2 focus:ring-red-500 outline-none font-medium" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <select className="p-4 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500 outline-none" value={newItem.cat} onChange={e => setNewItem({...newItem, cat: e.target.value})}><option>Consumable</option><option>Tool</option><option>Equipment</option><option>Miscellaneous</option></select>
                <input type="number" placeholder="Initial Qty" className="p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value)})} />
                <input placeholder="Location" className="p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={newItem.loc} onChange={e => setNewItem({...newItem, loc: e.target.value})} />
                <div className="col-span-2">
                  <textarea placeholder="Item Description..." className="w-full p-4 border border-slate-200 rounded-xl h-24 focus:ring-2 focus:ring-red-500 outline-none" value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Color Code</label>
                  <div className="flex gap-3">
                    {COLORS.map(c => <div key={c} onClick={() => setNewItem({...newItem, color: c})} className={`w-8 h-8 rounded-full cursor-pointer ring-2 ring-offset-2 transition-all ${newItem.color === c ? 'ring-slate-400 scale-110' : 'ring-transparent'}`} style={{backgroundColor: c}}></div>)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Low Stock Limit</label>
                  <input type="number" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={newItem.threshold} onChange={e => setNewItem({...newItem, threshold: parseInt(e.target.value)})} />
                </div>
                 <div className="col-span-2">
                  <input placeholder="Image URL (Optional)" className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={newItem.img} onChange={e => setNewItem({...newItem, img: e.target.value})} />
                </div>
              </div>
              <button className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 mt-4 shadow-lg shadow-red-200 transition active:scale-[0.98]">Save to Inventory</button>
            </form>
          </div>
        </div>
      )}

      {isOnboarding && (
        <div className="fixed inset-0 bg-slate-900/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-scale-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome to LIKHA!</h2>
              <p className="text-slate-500 mt-2">Please complete your profile.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault(); const formData = new FormData(e.target);
              const { error } = await supabase.from('profiles').update({ first_name: formData.get('firstName'), last_name: formData.get('lastName'), sr_code: formData.get('srCode'), user_type: formData.get('userType') }).eq('id', session.user.id);
              if (!error) refreshProfile();
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required name="firstName" placeholder="First Name" className="p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" />
                <input required name="lastName" placeholder="Last Name" className="p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <input name="srCode" placeholder="SR Code" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" />
              <select name="userType" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none">
                <option value="Student Volunteer">Student Volunteer</option><option value="Intern">Intern</option><option value="Admin">Admin</option>
              </select>
              <button className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 active:scale-[0.98]">Complete Setup</button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
} // Trigger Vercel build