import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Plus, Trash2, LogOut, User, LayoutGrid, Search, X, 
  ChevronRight, Edit3, Save, MoreVertical, Settings, AlertTriangle, ArrowLeft,
  Camera, Loader2, ChevronDown
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
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">LIKHA FabLab</h1>
        <p className="text-slate-500 text-center mb-6 text-sm uppercase tracking-wide">Inventory System</p>
        
        <div className="space-y-3">
          {/* Simple Email & Password for everyone */}
          <input required type="email" placeholder="Email" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          
          {msg && <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded text-center">{msg}</div>}

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Log In')}
          </button>
          
          <div className="text-center mt-4">
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-sm text-slate-500 hover:text-blue-600 underline">
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
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col h-screen overflow-hidden">
      
      {/* NAVBAR */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><LayoutGrid size={24}/></div>
          <div><h1 className="text-xl font-bold text-slate-900 leading-none">LIKHA FabLab</h1></div>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => {setView('inventory'); setSelectedItem(null)}} className={`px-6 py-2 rounded-md text-sm font-bold transition ${view === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Inventory</button>
          <button onClick={() => {setView('reports'); setSelectedItem(null)}} className={`px-6 py-2 rounded-md text-sm font-bold transition ${view === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Reports</button>
        </div>

      {/* User Profile Section */}
        <div className="relative">
            
          {/* 1. The Profile Button */}
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)} 
            className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-xl transition"
            >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm overflow-hidden">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                userProfile?.first_name?.[0] || <User size={18}/>
              )}
            </div>
              
            <div className="text-left hidden md:block">
              <p className="text-sm font-bold text-slate-700">{userProfile?.first_name || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize">{userProfile?.user_type || 'Student'}</p>
            </div>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}/>
          </button>

          {/* 2. The Dropdown Logic */}
          {isProfileOpen && (
            <>
              {/* A. INVISIBLE BACKDROP (Clicking this closes the menu) */}
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setIsProfileOpen(false)}
              ></div>

              {/* B. THE MENU (Sits on top of the backdrop) */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-fade-in-down origin-top-right">
                
                <div className="px-4 py-3 border-b border-slate-100 mb-2">
                  <p className="text-sm font-bold text-slate-900">Signed in as</p>
                  <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                </div>

                <button 
                  onClick={() => { setView('profile'); setIsProfileOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 font-medium transition flex items-center gap-2"
                >
                  <Settings size={16} /> Profile Settings
                </button>
                
                <button 
                  onClick={async () => { await supabase.auth.signOut(); window.location.reload() }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition flex items-center gap-2"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>      
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden relative flex bg-slate-100">
        
        {view === 'inventory' && (
          <>
            <div className={`flex-1 p-6 md:p-12 overflow-y-auto transition-all duration-300 ${selectedItem ? 'mr-[450px]' : ''}`}>
              <div className="max-w-7xl mx-auto">
                {/* TOOLBAR */}
                <div className="flex justify-between items-center mb-6">
                  <div className="relative w-96">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input className="w-full pl-12 pr-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white" 
                      placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition">
                    <Plus size={20} /> Add Item
                  </button>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="p-4 text-left font-bold">Item Name</th>
                        <th className="p-4 text-center font-bold">Category</th>
                        <th className="p-4 text-center font-bold">Stock Quantity</th>
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
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-8 rounded-full" style={{backgroundColor: item.color_code}}></div>
                                <div>
                                  <div className="font-bold text-slate-800">{item.item_name}</div>
                                  {isLow && <div className="text-[10px] text-red-500 font-bold uppercase tracking-wide flex items-center gap-1"><AlertTriangle size={10}/> Low Stock</div>}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">{item.category}</span></td>
                            <td className="p-4 text-center">
                              <span className={`font-bold text-lg ${item.quantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>{item.quantity}</span>
                            </td>
                            <td className="p-4 text-center text-sm text-slate-500">{item.location}</td>
                            <td className="p-4 text-center">
                              <button onClick={(e) => {e.stopPropagation(); handleDeleteItem(item.id)}} className="p-2 text-slate-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredItems.length === 0 && <div className="p-12 text-center text-slate-400">No items found matching your search.</div>}
                </div>
              </div>
            </div>

            {/* SIDE DETAILS PANEL (Slide Over) */}
            <div className={`fixed top-[88px] right-0 bottom-0 w-[450px] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 z-30 overflow-y-auto ${selectedItem ? 'translate-x-0' : 'translate-x-full'}`}>
              {selectedItem && (
                <div className="p-8 min-h-full flex flex-col pb-32">
                  <div className="flex justify-between items-start mb-6">
                    <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600"><ChevronRight size={24}/></button>
                    <div className="flex gap-2">
                       {isEditing ? (
                         <button onClick={handleUpdateItem} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"><Save size={16}/> Save</button>
                       ) : (
                         <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200"><Edit3 size={16}/> Edit</button>
                       )}
                    </div>
                  </div>
                  
                  {selectedItem.image_url ? (
                    <div className="w-full h-64 bg-white rounded-xl mb-6 border border-slate-200 flex items-center justify-center p-2 shadow-sm">
                      <img 
                        src={selectedItem.image_url} 
                        className="w-full h-full object-contain rounded-lg" 
                        alt="Item Preview"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-100 rounded-xl mb-6 flex items-center justify-center text-slate-400 italic text-sm border border-dashed border-slate-300">
                      No Image Available
                    </div>
                  )}

                  <div className="flex-1 space-y-6">
                    <div>
                      {isEditing ? <input className="text-2xl font-bold w-full border-b border-blue-500 outline-none" value={selectedItem.item_name} onChange={e => setSelectedItem({...selectedItem, item_name: e.target.value})} /> : <h2 className="text-3xl font-bold text-slate-900">{selectedItem.item_name}</h2>}
                      {isEditing ? (
                        <select className="mt-2 p-2 border rounded" value={selectedItem.category} onChange={e => setSelectedItem({...selectedItem, category: e.target.value})}>
                          <option>Consumable</option><option>Tool</option><option>Equipment</option>
                        </select>
                      ) : (
                        <span className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold uppercase">{selectedItem.category}</span>
                      )}
                    </div>

                    <div className="mb-8">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        {isEditing ? "Adjust Stock Level" : "Current Stock"}
                      </h3>
                      
                      <div className={`p-1 rounded-2xl border ${isEditing ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}>
                        {isEditing ? (
                          // EDIT MODE: Big Buttons
                          <div className="flex items-center gap-2 p-1">
                            <button 
                              onClick={() => setSelectedItem({...selectedItem, quantity: Math.max(0, selectedItem.quantity - 1)})} 
                              className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold text-slate-600 shadow-sm transition active:scale-95"
                            >
                              <Minus size={20} />
                            </button>
                            
                            <input 
                              type="number" 
                              value={selectedItem.quantity} 
                              onChange={(e) => setSelectedItem({...selectedItem, quantity: parseInt(e.target.value) || 0})}
                              className="flex-1 h-14 text-center border border-slate-200 rounded-xl font-bold text-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-inner"
                            />
                            
                            <button 
                              onClick={() => setSelectedItem({...selectedItem, quantity: selectedItem.quantity + 1})} 
                              className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-green-50 hover:text-green-600 hover:border-green-200 font-bold text-slate-600 shadow-sm transition active:scale-95"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        ) : (
                          // VIEW MODE: Stat Card with Badge
                          <div className="flex items-center justify-between p-4">
                            <div className="flex flex-col">
                              <span className="text-4xl font-bold text-slate-800 tracking-tight">
                                {selectedItem.quantity}
                              </span>
                              <span className="text-xs font-bold text-slate-400 uppercase">Units Available</span>
                            </div>

                            <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
                              selectedItem.quantity <= selectedItem.threshold 
                                ? 'bg-red-100 text-red-700 border-red-200' 
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                selectedItem.quantity <= selectedItem.threshold ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                              }`} />
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {selectedItem.quantity <= selectedItem.threshold ? 'Low Stock' : 'In Stock'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Description</h4>
                      {isEditing ? <textarea className="w-full p-3 border rounded h-24" value={selectedItem.description} onChange={e => setSelectedItem({...selectedItem, description: e.target.value})} /> : <p className="text-slate-600 text-sm leading-relaxed">{selectedItem.description || "No description."}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase">Location</h4>
                         {isEditing ? <input className="w-full border-b" value={selectedItem.location} onChange={e => setSelectedItem({...selectedItem, location: e.target.value})}/> : <p className="font-medium text-slate-800">{selectedItem.location}</p>}
                       </div>
                       <div>
                         <h4 className="text-xs font-bold text-slate-400 uppercase">Low Stock Limit</h4>
                         {isEditing ? <input type="number" className="w-full border-b" value={selectedItem.threshold} onChange={e => setSelectedItem({...selectedItem, threshold: parseInt(e.target.value)})}/> : <p className="font-medium text-red-500">{selectedItem.threshold} items</p>}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW: REPORTS */}
        {view === 'reports' && (
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics & Logs</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4">Stock Status Overview</h3>
                  <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={stockStatusData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} />
                         <YAxis axisLine={false} tickLine={false} />
                         <ChartTooltip cursor={{fill: 'transparent'}} />
                         <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                           {stockStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4">Top Used Items (Usage Frequency)</h3>
                  <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={usageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           {usageData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         </Pie>
                         <Legend verticalAlign="bottom" height={36}/>
                         <ChartTooltip />
                       </PieChart>
                     </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="p-4 border-b font-bold text-slate-700">History Logs</div>
                <table className="w-full text-left">
                  <thead className="text-xs uppercase text-slate-400 bg-slate-50"><tr><th className="p-4">Date</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Item</th></tr></thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-4 text-sm text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                        <td className="p-4 font-bold text-slate-700">
                          {log.profiles 
                            ? `${log.profiles.first_name} ${log.profiles.last_name}` 
                            : log.user_email // Fallback for old logs
                          }
                        </td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${log.change_amount > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{log.action_type} {log.change_amount > 0 ? '+' : ''}{log.change_amount}</span></td>
                        <td className="p-4 text-sm font-medium">{log.inventory?.item_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PROFILE SETTINGS */}
        {view === 'profile' && userProfile && (
          <div className="flex-1 p-8 flex justify-center bg-slate-100 overflow-y-auto pb-20">
            <div className="bg-white w-full max-w-lg p-8 rounded-2xl shadow-sm border border-slate-200 h-fit animate-fade-in my-auto">
              
              <button 
                onClick={() => setView('inventory')} 
                className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 mb-8 transition-colors font-bold text-sm"
              >
                <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" /> 
                Back to Dashboard
              </button>

              <h2 className="text-2xl font-bold mb-8 text-slate-900 text-center">Edit Profile</h2>
              
              {/* --- AVATAR UPLOADER --- */}
              <div className="flex justify-center mb-8">
                <div className="relative group cursor-pointer">
                    {/* 1. The Image Display */}
                    <div className="w-32 h-32 rounded-full border-4 border-slate-100 shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
                      {userProfile.avatar_url ? (
                        <img src={`${userProfile.avatar_url}?t=${new Date().getTime()}`} className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-slate-300"/>
                      )}
                    </div>

                    {/* 2. The Upload Overlay Button */}
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition cursor-pointer">
                      {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18}/>}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isSaving}
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return
                          
                          setIsSaving(true)
                          const file = e.target.files[0]
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${session.user.id}-${Math.random()}.${fileExt}`
                          const filePath = `${fileName}`

                          try {
                            // A. Upload to Supabase Storage
                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(filePath, file)

                            if (uploadError) throw uploadError

                            // B. Get the Public URL
                            const { data: { publicUrl } } = supabase.storage
                              .from('avatars')
                              .getPublicUrl(filePath)

                            // C. Update Profile Database
                            const { error: dbError } = await supabase
                              .from('profiles')
                              .update({ avatar_url: publicUrl })
                              .eq('id', session.user.id)

                            if (dbError) throw dbError

                            // D. Refresh UI
                            await refreshProfile()
                            alert("Profile picture updated!")
                            
                          } catch (error) {
                            alert("Error uploading image: " + error.message)
                          } finally {
                            setIsSaving(false)
                          }
                        }} 
                      />
                    </label>
                </div>
              </div>

              {/* --- TEXT FORM --- */}
              <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  
                  const { error } = await supabase.from('profiles').update({
                    first_name: formData.get('firstName'),
                    last_name: formData.get('lastName'),
                  }).eq('id', session.user.id)
                  
                  if (!error) {
                    alert("Profile Updated Successfully!")
                    refreshProfile()
                  }
              }} className="space-y-4">
                
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">First Name</label>
                    <input name="firstName" className="w-full p-3 border rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition" defaultValue={userProfile.first_name} />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Last Name</label>
                    <input name="lastName" className="w-full p-3 border rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition" defaultValue={userProfile.last_name} />
                </div>
                
                <div className="pt-4">
                    <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition">Save Changes</button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* MODAL: ADD ITEM */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Add New Material</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Item Name" className="p-3 border rounded-lg col-span-2 focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                  <select className="p-3 border rounded-lg bg-white" value={newItem.cat} onChange={e => setNewItem({...newItem, cat: e.target.value})}>
                    <option>Consumable</option><option>Tool</option><option>Equipment</option><option>Miscellaneous</option>
                  </select>
                  <input type="number" placeholder="Initial Qty" className="p-3 border rounded-lg" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value)})} />
                  <input placeholder="Location" className="p-3 border rounded-lg" value={newItem.loc} onChange={e => setNewItem({...newItem, loc: e.target.value})} />
                  <input placeholder="Tags (comma separated)" className="p-3 border rounded-lg" value={newItem.tags} onChange={e => setNewItem({...newItem, tags: e.target.value})} />
                  <div className="col-span-2">
                    <textarea placeholder="Item Description..." className="w-full p-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.desc} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Color Code</label>
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <div key={c} onClick={() => setNewItem({...newItem, color: c})} className={`w-8 h-8 rounded-full cursor-pointer ring-2 ring-offset-2 ${newItem.color === c ? 'ring-slate-400' : 'ring-transparent'}`} style={{backgroundColor: c}}></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Low Stock Limit</label>
                    <input type="number" className="w-full p-2 border rounded-lg" value={newItem.threshold} onChange={e => setNewItem({...newItem, threshold: parseInt(e.target.value)})} />
                  </div>
                   <div className="col-span-2">
                    <input placeholder="Image URL (Optional)" className="w-full p-3 border rounded-lg" value={newItem.img} onChange={e => setNewItem({...newItem, img: e.target.value})} />
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 mt-4 shadow-lg shadow-blue-200">Save to Inventory</button>
              </form>
            </div>
          </div>
        )}

        {/* ONBOARDING MODAL (Cannot be closed until saved) */}
        {isOnboarding && (
          <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Welcome to LIKHA!</h2>
                <p className="text-slate-500">Please complete your profile to continue.</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                
                const { error } = await supabase.from('profiles').update({
                  first_name: formData.get('firstName'),
                  last_name: formData.get('lastName'),
                  sr_code: formData.get('srCode'),
                  user_type: formData.get('userType')
                }).eq('id', session.user.id)

                if (!error) {
                  refreshProfile() // Reloads profile to close modal
                }
              }} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <input required name="firstName" placeholder="First Name" className="p-3 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input required name="lastName" placeholder="Last Name" className="p-3 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <input name="srCode" placeholder="SR Code (e.g. 21-00000)" className="w-full p-3 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                
                <select name="userType" className="w-full p-3 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Student Volunteer">Student Volunteer</option>
                  <option value="Intern">Intern</option>
                  <option value="Admin">Admin</option>
                </select>

                <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                  Complete Setup
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}