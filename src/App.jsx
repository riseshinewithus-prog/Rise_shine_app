// src/App.jsx  —  Rise & Shine Workforce Management System
// Full app with User Profile Dashboard, photo upload, Supabase DB
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase Config ──────────────────────────────────────────
onst SUPABASE_URL = 'https://vljgzcnjpcxsmbifrawk.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Y2cKkkTA26OHy0GAKZV6Mw_Em_A8aS3'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Constants ────────────────────────────────────────────────
const DEPTS = ['Management','Engineering','Design','Marketing','Operations','HR','Finance','Sales','Intern']
const PRIORITY_META = {
  low:    { label:'Low',    bg:'#dcfce7', color:'#166534' },
  medium: { label:'Medium', bg:'#fef9c3', color:'#713f12' },
  high:   { label:'High',   bg:'#fee2e2', color:'#991b1b' },
  urgent: { label:'Urgent', bg:'#fce7f3', color:'#9d174d' },
}
const STATUS_META = {
  pending:     { label:'Pending',     bg:'#f1f5f9', color:'#475569' },
  in_progress: { label:'In Progress', bg:'#ede9fe', color:'#5b21b6' },
  completed:   { label:'Completed',   bg:'#dcfce7', color:'#166534' },
  delayed:     { label:'Delayed',     bg:'#fee2e2', color:'#991b1b' },
}


const LEAVE_TYPES = ['annual','sick','casual','unpaid']
const LEAVE_COLORS = { annual:'#6366f1', sick:'#ef4444', casual:'#f59e0b', unpaid:'#94a3b8' }
const DOC_TYPES = ['nid','contract','certificate','photo_id','other']
const DOC_LABELS = { nid:'National ID', contract:'Contract', certificate:'Certificate', photo_id:'Photo ID', other:'Other' }
const NPR = v => `Rs ${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:0})}`
const fmtTime = ts => { if (!ts) return '—'; return new Date(ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) }
const monthName = m => ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]

// ─── Helpers ──────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const today = () => new Date().toISOString().split('T')[0]
const daysLeft = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null
const initials = name => name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '??'
const avatarBg = name => {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
  let h = 0; for (const c of (name||'')) h = (h*31+c.charCodeAt(0))&0xffffffff
  return palette[Math.abs(h)%palette.length]
}
const calcScore = tasks => {
  if (!tasks.length) return 80
  const done = tasks.filter(t=>t.status==='completed').length
  const delayed = tasks.filter(t=>t.status==='delayed').length
  const rate = done / tasks.length
  const penalty = delayed / tasks.length
  return Math.min(100, Math.round((rate*65 + (1-penalty)*35)*100))
}

// ─── UI Atoms ─────────────────────────────────────────────────
const Avatar = ({name, photo, size=36}) => (
  photo
    ? <img src={photo} alt={name} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:'2px solid var(--border)'}}/>
    : <div style={{width:size,height:size,borderRadius:'50%',background:avatarBg(name),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:size*0.36,flexShrink:0,letterSpacing:'0.01em'}}>
        {initials(name)}
      </div>
)

const Badge = ({type, label}) => {
  const s = PRIORITY_META[type] || STATUS_META[type] || {bg:'#f1f5f9',color:'#475569'}
  return <span style={{background:s.bg,color:s.color,padding:'2px 10px',borderRadius:99,fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>{label||s.label}</span>
}

const ProgressBar = ({value, color='#6366f1', height=6}) => (
  <div style={{height,background:'var(--border)',borderRadius:99,overflow:'hidden',minWidth:60}}>
    <div style={{height:'100%',width:`${Math.min(value||0,100)}%`,background:color,borderRadius:99,transition:'width .4s'}}/>
  </div>
)

const Spinner = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60}}>
    <div style={{width:36,height:36,border:'3px solid var(--border)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
  </div>
)

const Empty = ({msg='No data found',icon='📭',action,onAction}) => (
  <div style={{textAlign:'center',padding:'52px 24px'}}>
    <div style={{fontSize:40,marginBottom:12}}>{icon}</div>
    <div style={{fontWeight:600,fontSize:15,color:'var(--text)',marginBottom:4}}>{msg}</div>
    {action && <button className="btn-primary" style={{marginTop:14}} onClick={onAction}>{action}</button>}
  </div>
)

const Field = ({label,required,hint,children}) => (
  <div style={{marginBottom:16}}>
    <label style={{display:'block',marginBottom:5,fontSize:13,fontWeight:600,color:'var(--muted)'}}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
    {children}
    {hint && <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{hint}</div>}
  </div>
)

function Modal({open,onClose,title,width=540,children}) {
  if (!open) return null
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'var(--card)',borderRadius:20,width:'100%',maxWidth:width,maxHeight:'92vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid var(--border)'}}>
          <div style={{fontSize:17,fontWeight:800,color:'var(--text)'}}>{title}</div>
          <button className="icon-btn" onClick={onClose} style={{fontSize:18}}>✕</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  )
}

function Toast({toasts,remove}) {
  const C = {success:'#10b981',error:'#ef4444',info:'#6366f1',warning:'#f59e0b'}
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,display:'flex',flexDirection:'column',gap:10}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:'var(--card)',border:`1.5px solid ${C[t.type]||C.info}`,borderRadius:12,padding:'13px 18px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 30px rgba(0,0,0,.15)',minWidth:260,animation:'slideUp .25s ease'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:C[t.type]||C.info,flexShrink:0}}/>
          <span style={{fontSize:14,fontWeight:500,color:'var(--text)',flex:1}}>{t.msg}</span>
          <button className="icon-btn" onClick={()=>remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ─── DB Layer ─────────────────────────────────────────────────
const DB = {
  async getEmployees() {
    const {data,error} = await sb.from('employees').select('*').order('name')
    if (error) throw error; return data
  },
  async addEmployee(emp) {
    const {data,error} = await sb.from('employees').insert([emp]).select().single()
    if (error) throw error; return data
  },
  async updateEmployee(id,updates) {
    const {data,error} = await sb.from('employees').update(updates).eq('id',id).select().single()
    if (error) throw error; return data
  },
  async deleteEmployee(id) {
    const {error} = await sb.from('employees').delete().eq('id',id)
    if (error) throw error
  },
  async getTasks() {
    const {data,error} = await sb.from('tasks').select('*').order('created_at',{ascending:false})
    if (error) throw error; return data
  },
  async addTask(task) {
    const {data,error} = await sb.from('tasks').insert([task]).select().single()
    if (error) throw error; return data
  },
  async updateTask(id,updates) {
    const {data,error} = await sb.from('tasks').update(updates).eq('id',id).select().single()
    if (error) throw error; return data
  },
  async deleteTask(id) {
    const {error} = await sb.from('tasks').delete().eq('id',id)
    if (error) throw error
  },
  async getUpdates() {
    const {data,error} = await sb.from('daily_updates').select('*').order('created_at',{ascending:false})
    if (error) throw error; return data
  },
  async addUpdate(update) {
    const {data,error} = await sb.from('daily_updates').upsert([update],{onConflict:'employee_id,date'}).select().single()
    if (error) throw error; return data
  },
  async getNotifications(empId) {
    const {data,error} = await sb.from('notifications').select('*').eq('employee_id',empId).order('created_at',{ascending:false}).limit(20)
    if (error) throw error; return data
  },
  async markRead(id) {
    await sb.from('notifications').update({is_read:true}).eq('id',id)
  },
  async markAllRead(empId) {
    await sb.from('notifications').update({is_read:true}).eq('employee_id',empId)
  },
  // ── Attendance ──
  async getAttendance(filters={}) {
    let q = sb.from('attendance').select('*').order('date',{ascending:false})
    // employee_id: single id (string) → eq filter
    // employee_ids: array of ids → in filter (for team lead dept scope)
    if (filters.employee_id)  q = q.eq('employee_id', filters.employee_id)
    if (filters.employee_ids) q = q.in('employee_id', filters.employee_ids)
    if (filters.month && filters.year) {
      const pad = m => String(m).padStart(2,'0')
      q = q.gte('date',`${filters.year}-${pad(filters.month)}-01`).lte('date',`${filters.year}-${pad(filters.month)}-31`)
    }
    const {data,error} = await q; if (error) throw error; return data
  },
  async getTodayAttendance(employeeId) {
    const {data,error} = await sb.from('attendance').select('*').eq('employee_id',employeeId).eq('date',today()).maybeSingle()
    if (error) throw error; return data
  },
  async checkIn(employeeId) {
    const {data,error} = await sb.from('attendance').upsert({employee_id:employeeId,date:today(),check_in:new Date().toISOString(),status:'present'},{onConflict:'employee_id,date'}).select().single()
    if (error) throw error; return data
  },
  async checkOut(id) {
    const {data,error} = await sb.from('attendance').update({check_out:new Date().toISOString()}).eq('id',id).select().single()
    if (error) throw error; return data
  },
  async upsertAttendance(record) {
    const {data,error} = await sb.from('attendance').upsert(record,{onConflict:'employee_id,date'}).select().single()
    if (error) throw error; return data
  },
  // ── Leaves ──
  async getLeaves(filters={}) {
    let q = sb.from('leaves').select('*').order('created_at',{ascending:false})
    if (filters.employee_id) q = q.eq('employee_id',filters.employee_id)
    if (filters.status) q = q.eq('status',filters.status)
    const {data,error} = await q; if (error) throw error; return data
  },
  async addLeave(leave) {
    const {data,error} = await sb.from('leaves').insert([leave]).select().single()
    if (error) throw error; return data
  },
  async updateLeave(id,updates) {
    const {data,error} = await sb.from('leaves').update(updates).eq('id',id).select().single()
    if (error) throw error; return data
  },
  async getLeaveBalances(employeeId) {
    const {data,error} = await sb.from('leave_balances').select('*').eq('employee_id',employeeId).maybeSingle()
    if (error) throw error; return data
  },
  async getAllLeaveBalances() {
    const {data,error} = await sb.from('leave_balances').select('*')
    if (error) throw error; return data
  },
  async upsertLeaveBalance(record) {
    const {data,error} = await sb.from('leave_balances').upsert(record,{onConflict:'employee_id'}).select().single()
    if (error) throw error; return data
  },
  async getLeaveSettings() {
    const {data,error} = await sb.from('leave_settings').select('*').eq('id',1).single()
    if (error) throw error; return data
  },
  async saveLeaveSettings(s) {
    const {data,error} = await sb.from('leave_settings').update(s).eq('id',1).select().single()
    if (error) throw error; return data
  },
  // ── Payroll ──
  async getPayroll(filters={}) {
    let q = sb.from('payroll').select('*').order('year',{ascending:false}).order('month',{ascending:false})
    if (filters.employee_id) q = q.eq('employee_id',filters.employee_id)
    if (filters.month) q = q.eq('month',filters.month)
    if (filters.year) q = q.eq('year',filters.year)
    const {data,error} = await q; if (error) throw error; return data
  },
  async upsertPayroll(record) {
    const {data,error} = await sb.from('payroll').upsert(record,{onConflict:'employee_id,month,year'}).select().single()
    if (error) throw error; return data
  },
  async updatePayroll(id,updates) {
    const {data,error} = await sb.from('payroll').update(updates).eq('id',id).select().single()
    if (error) throw error; return data
  },
  // ── Documents ──
  async getDocuments(employeeId) {
    const {data,error} = await sb.from('documents').select('*').eq('employee_id',employeeId).order('created_at',{ascending:false})
    if (error) throw error; return data
  },
  async getAllDocuments() {
    const {data,error} = await sb.from('documents').select('*').order('created_at',{ascending:false})
    if (error) throw error; return data
  },
  async addDocument(doc) {
    const {data,error} = await sb.from('documents').insert([doc]).select().single()
    if (error) throw error; return data
  },
  async deleteDocument(id) {
    const {error} = await sb.from('documents').delete().eq('id',id)
    if (error) throw error
  },

}

// ─── Login Screen ─────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [loading,setLoading] = useState(false)
  const [err,setErr] = useState('')
  const [showPw,setShowPw] = useState(false)

  const handle = async () => {
    if (!email||!password) return setErr('Please fill in both fields')
    setLoading(true); setErr('')
    try {
      const {data,error} = await sb.from('employees').select('*').eq('email',email.trim().toLowerCase()).single()
      if (error||!data) { setErr('No account found with that email'); setLoading(false); return }
      if (data.password !== password) { setErr('Incorrect password'); setLoading(false); return }
      if (data.status === 'inactive') { setErr('Your account is inactive. Contact your admin.'); setLoading(false); return }
      onLogin(data)
    } catch(e) {
      setErr('Cannot connect — check your Supabase config in App.jsx (lines 8–9)')
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'var(--bg)'}}>
      {/* Left panel */}
      <div style={{flex:1,background:'linear-gradient(145deg,#0f172a,#1e1b4b)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:48,display:'flex'}}>
        <div style={{maxWidth:400,width:'100%'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:48}}>
            <div style={{width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,#f59e0b,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>RS</div>
            <div>
              <div style={{color:'#f1f5f9',fontWeight:900,fontSize:20,letterSpacing:'-0.02em'}}>Rise & Shine</div>
              <div style={{color:'#475569',fontSize:12}}>Workforce Management</div>
            </div>
          </div>
          <div style={{color:'#f1f5f9',fontSize:32,fontWeight:900,lineHeight:1.2,marginBottom:16,letterSpacing:'-0.03em'}}>
            Manage your team,<br/>
            <span style={{background:'linear-gradient(90deg,#f59e0b,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>effortlessly.</span>
          </div>
          <p style={{color:'#64748b',fontSize:15,lineHeight:1.7}}>
            Track tasks, daily updates, performance, and team productivityall in one place.
          </p>
          <div style={{marginTop:40,display:'flex',flexDirection:'column',gap:14}}>
            {[
              {icon:'✅', text:'Assign & track tasks with deadlines'},
              {icon:'📝', text:'Daily stand-up reports in seconds'},
              {icon:'📊', text:'Automatic performance scoring'},
            ].map(f=>(
              <div key={f.text} style={{display:'flex',gap:12,alignItems:'center'}}>
                <span style={{fontSize:18}}>{f.icon}</span>
                <span style={{color:'#94a3b8',fontSize:14}}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{width:'100%',maxWidth:460,display:'flex',alignItems:'center',justifyContent:'center',padding:32,background:'var(--bg)'}}>
        <div style={{width:'100%',maxWidth:380}}>
          <div style={{marginBottom:32}}>
            <h2 style={{fontSize:26,fontWeight:900,color:'var(--text)',letterSpacing:'-0.02em'}}>Sign in</h2>
            <p style={{color:'var(--muted)',fontSize:14,marginTop:4}}>Enter your credentials to continue</p>
          </div>
          <Field label="Work Email">
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@riseandshine.io" autoFocus style={{fontSize:15,padding:'11px 14px'}}/>
          </Field>
          <Field label="Password">
            <div style={{position:'relative'}}>
              <input className="input" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} placeholder="••••••••" style={{fontSize:15,padding:'11px 14px',paddingRight:44}}/>
              <button onClick={()=>setShowPw(p=>!p)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)'}}>
                {showPw?'🙈':'👁️'}
              </button>
            </div>
          </Field>
          {err && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'11px 14px',borderRadius:10,fontSize:13,marginBottom:16,display:'flex',gap:8,alignItems:'flex-start'}}>
              <span>⚠️</span><span>{err}</span>
            </div>
          )}
          <button className="btn-primary" style={{width:'100%',padding:'13px',fontSize:15,justifyContent:'center',borderRadius:12,marginTop:4}} onClick={handle} disabled={loading}>
            {loading
              ? <span style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/> Signing in…</span>
              : 'Sign In →'
            }
          </button>
          <div style={{marginTop:20,padding:'14px',background:'var(--card)',borderRadius:12,border:'1px solid var(--border)',fontSize:12,color:'var(--muted)',lineHeight:1.8}}>
            {/* <div style={{fontWeight:700,color:'var(--sub)',marginBottom:4}}>Demo accounts</div>
            <div>🔑 <strong>Admin:</strong> admin@riseandshine.io / admin123</div>
            <div>👤 <strong>Staff:</strong> arjun@riseandshine.io / pass123</div> */}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── User Profile Page ────────────────────────────────────────
function ProfilePage({user, setUser, employees, setEmployees, tasks, updates, toast}) {
  const [tab, setTab] = useState('overview')
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const fileRef = useRef()

  // Editable fields
  const [form, setForm] = useState({
    name: user.name||'',
    email: user.email||'',
    phone: user.phone||'',
    department: user.department||'',
    role: user.role||'employee',
    emergency_contact_name: user.emergency_contact_name||'',
    emergency_contact_phone: user.emergency_contact_phone||'',
    address: user.address||'',
    bank_account: user.bank_account||'',
    employment_type: user.employment_type||'full-time',
  })
  const [pwForm, setPwForm] = useState({current:'', newpw:'', confirm:''})
  const [pwErr, setPwErr] = useState('')
  const [showPw, setShowPw] = useState({current:false, newpw:false, confirm:false})

  // Derived stats
  const myTasks = tasks.filter(t=>t.assignee_id===user.id)
  const done     = myTasks.filter(t=>t.status==='completed').length
  const inProg   = myTasks.filter(t=>t.status==='in_progress').length
  const delayed  = myTasks.filter(t=>t.status==='delayed').length
  const pending  = myTasks.filter(t=>t.status==='pending').length
  const myUpdates = updates.filter(u=>u.employee_id===user.id)
  const score    = calcScore(myTasks)
  const streak   = myUpdates.slice(0,7).length // last 7 days updates

  // Photo upload — store as base64 locally (and in DB if column exists)
  const handlePhoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2*1024*1024) return toast('Photo must be under 2MB','error')
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const b64 = ev.target.result
      try {
        await DB.updateEmployee(user.id, {avatar_url: b64})
        const updated = {...user, avatar_url: b64}
        setUser(updated)
        setEmployees(p=>p.map(e=>e.id===user.id?updated:e))
        toast('Profile photo updated','success')
      } catch(err) {
        // avatar_url column may not exist yet — save locally only
        const updated = {...user, avatar_url: b64}
        setUser(updated)
        toast('Photo updated (add avatar_url column to DB to persist)','info')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    if (!form.name||!form.email) return toast('Name and email are required','error')
    setSaving(true)
    try {
      const updated = await DB.updateEmployee(user.id, form)
      setUser({...user,...updated})
      setEmployees(p=>p.map(e=>e.id===user.id?{...e,...updated}:e))
      toast('Profile saved successfully','success')
    } catch(e) { toast('Save failed: '+e.message,'error') }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setPwErr('')
    if (!pwForm.current) return setPwErr('Enter your current password')
    if (pwForm.current !== user.password) return setPwErr('Current password is incorrect')
    if (pwForm.newpw.length < 6) return setPwErr('New password must be at least 6 characters')
    if (pwForm.newpw !== pwForm.confirm) return setPwErr('Passwords do not match')
    setPwSaving(true)
    try {
      await DB.updateEmployee(user.id, {password: pwForm.newpw})
      setUser({...user, password: pwForm.newpw})
      setPwForm({current:'',newpw:'',confirm:''})
      toast('Password changed successfully','success')
    } catch(e) { toast('Failed: '+e.message,'error') }
    setPwSaving(false)
  }

  const tabs = [
    {id:'overview', label:'Overview',  icon:'📊'},
    {id:'edit',     label:'Edit Profile', icon:'✏️'},
    {id:'security', label:'Security',  icon:'🔒'},
    {id:'activity', label:'Activity',  icon:'📋'},
  ]

  const scoreColor = score>=88?'#10b981':score>=70?'#6366f1':'#f59e0b'

  return (
    <div className="page">
      {/* Profile Hero */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {/* Cover */}
        <div style={{height:110,background:`linear-gradient(135deg, ${avatarBg(user.name)}cc, #6366f1)`,position:'relative'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 20% 50%, rgba(255,255,255,.08) 0%, transparent 60%)'}}/>
        </div>
        {/* Info Row */}
        <div style={{padding:'0 28px 24px',display:'flex',gap:20,alignItems:'flex-end',flexWrap:'wrap'}}>
          {/* Avatar with upload */}
          <div style={{position:'relative',marginTop:-44,flexShrink:0}}>
            <div style={{border:'4px solid var(--card)',borderRadius:'50%',display:'inline-block',lineHeight:0}}>
              <Avatar name={user.name} photo={user.avatar_url} size={88}/>
            </div>
            <button
              onClick={()=>fileRef.current.click()}
              style={{position:'absolute',bottom:4,right:4,width:28,height:28,borderRadius:'50%',background:'#6366f1',border:'2px solid var(--card)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:13,color:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
              📷
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
          </div>
          <div style={{flex:1,paddingTop:12,minWidth:200}}>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <h2 style={{fontSize:22,fontWeight:900,color:'var(--text)',letterSpacing:'-0.02em'}}>{user.name}</h2>
              <Badge type={user.role==='admin'?'urgent':user.role==='team_lead'?'high':'in_progress'} label={user.role.replace('_',' ')}/>
            </div>
            <div style={{color:'var(--muted)',fontSize:14,marginTop:3,display:'flex',gap:16,flexWrap:'wrap'}}>
              <span>📧 {user.email}</span>
              {user.phone && <span>📞 {user.phone}</span>}
              <span>🏢 {user.department}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:10,paddingTop:8}}>
            <div style={{textAlign:'center',padding:'10px 18px',background:'var(--bg)',borderRadius:12,minWidth:70}}>
              <div style={{fontSize:22,fontWeight:900,color:scoreColor}}>{score}%</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Score</div>
            </div>
            <div style={{textAlign:'center',padding:'10px 18px',background:'var(--bg)',borderRadius:12,minWidth:70}}>
              <div style={{fontSize:22,fontWeight:900,color:'#6366f1'}}>{done}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Done</div>
            </div>
            <div style={{textAlign:'center',padding:'10px 18px',background:'var(--bg)',borderRadius:12,minWidth:70}}>
              <div style={{fontSize:22,fontWeight:900,color:'#f59e0b'}}>{myUpdates.length}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Reports</div>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,borderTop:'1px solid var(--border)',paddingLeft:24}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'13px 18px',border:'none',background:'transparent',cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?'#6366f1':'var(--muted)',borderBottom:tab===t.id?'2px solid #6366f1':'2px solid transparent',display:'flex',alignItems:'center',gap:6,transition:'all .15s',fontFamily:'inherit'}}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab==='overview' && (
        <div className="grid-2">
          {/* Task breakdown */}
          <div className="card">
            <div className="card-head"><span className="card-title">My Task Summary</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[
                {label:'Completed', val:done,    color:'#10b981', icon:'✅'},
                {label:'In Progress',val:inProg, color:'#6366f1', icon:'⚙️'},
                {label:'Pending',   val:pending, color:'#f59e0b', icon:'⏳'},
                {label:'Delayed',   val:delayed, color:'#ef4444', icon:'⚠️'},
              ].map(s=>(
                <div key={s.label}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:13,color:'var(--sub)',display:'flex',gap:6,alignItems:'center'}}><span>{s.icon}</span>{s.label}</span>
                    <span style={{fontWeight:700,color:s.color}}>{s.val}</span>
                  </div>
                  <ProgressBar value={myTasks.length ? (s.val/myTasks.length)*100 : 0} color={s.color}/>
                </div>
              ))}
              {!myTasks.length && <Empty msg="No tasks assigned yet" icon="📋"/>}
            </div>
          </div>

          {/* Performance card */}
          <div className="card">
            <div className="card-head"><span className="card-title">Performance Score</span></div>
            {/* Circular progress */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0 20px'}}>
              <svg width="140" height="140" style={{transform:'rotate(-90deg)'}}>
                <circle cx="70" cy="70" r="56" fill="none" stroke="var(--border)" strokeWidth="10"/>
                <circle cx="70" cy="70" r="56" fill="none" stroke={scoreColor} strokeWidth="10"
                  strokeDasharray={`${2*Math.PI*56}`}
                  strokeDashoffset={`${2*Math.PI*56*(1-score/100)}`}
                  strokeLinecap="round" style={{transition:'stroke-dashoffset .8s ease'}}/>
              </svg>
              <div style={{marginTop:-86,textAlign:'center',position:'relative',zIndex:1}}>
                <div style={{fontSize:30,fontWeight:900,color:scoreColor}}>{score}%</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>performance</div>
              </div>
              <div style={{marginTop:24,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%'}}>
                {[
                  {label:'Tasks Assigned',val:myTasks.length},
                  {label:'Completed',     val:done},
                  {label:'Delayed',       val:delayed},
                  {label:'Reports Filed', val:myUpdates.length},
                ].map(s=>(
                  <div key={s.label} style={{background:'var(--bg)',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
                    <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{s.val}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My recent tasks */}
          <div className="card" style={{gridColumn:'1/-1'}}>
            <div className="card-head"><span className="card-title">My Tasks</span><Badge type="in_progress" label={`${myTasks.length} total`}/></div>
            {!myTasks.length ? <Empty msg="No tasks assigned yet" icon="📋"/> : (
              <div style={{overflowX:'auto'}}>
                <table className="tbl">
                  <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Progress</th></tr></thead>
                  <tbody>
                    {myTasks.slice(0,8).map(t=>{
                      const dl = daysLeft(t.deadline)
                      return (
                        <tr key={t.id}>
                          <td><div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{t.title}</div><div style={{fontSize:11,color:'var(--muted)'}}>{t.department}</div></td>
                          <td><Badge type={t.priority}/></td>
                          <td><Badge type={t.status}/></td>
                          <td style={{fontSize:13,color:t.status!=='completed'&&dl!==null&&dl<0?'#ef4444':dl!==null&&dl<=2?'#f59e0b':'var(--sub)'}}>{fmt(t.deadline)}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <ProgressBar value={t.progress} color={t.status==='completed'?'#10b981':t.status==='delayed'?'#ef4444':'#6366f1'}/>
                              <span style={{fontSize:12,color:'var(--muted)',minWidth:28}}>{t.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='edit' && (
        <div className="card" style={{maxWidth:640}}>
          <div className="card-head"><span className="card-title">Edit Profile</span></div>
          {/* Photo section */}
          <div style={{display:'flex',gap:16,alignItems:'center',padding:'16px 0 20px',borderBottom:'1px solid var(--border)',marginBottom:20}}>
            <Avatar name={user.name} photo={user.avatar_url} size={68}/>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:'var(--text)',marginBottom:4}}>Profile Photo</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>JPG or PNG, max 2MB. Click the camera icon on your photo above.</div>
              <button className="btn-sec" style={{fontSize:13,padding:'7px 14px'}} onClick={()=>fileRef.current.click()}>📷 Change Photo</button>
            </div>
          </div>

          <div style={{fontWeight:700,fontSize:13,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12,marginTop:4}}>Basic Info</div>
          <div className="grid-2" style={{gap:12}}>
            <Field label="Full Name" required>
              <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Your full name"/>
            </Field>
            <Field label="Email Address" required>
              <input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"/>
            </Field>
            <Field label="Phone Number">
              <input className="input" value={form.phone||''} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+977 98XXXXXXXX"/>
            </Field>
            <Field label="Department">
              {user.role==='admin'
                ? <select className="input" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>{DEPTS.map(d=><option key={d}>{d}</option>)}</select>
                : <input className="input" value={form.department} disabled style={{opacity:.6,cursor:'not-allowed'}}/>
              }
            </Field>
          </div>
          <div style={{fontWeight:700,fontSize:13,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12,marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>Extended Profile</div>
          <div className="grid-2" style={{gap:12}}>
            <Field label="Employment Type">
              <select className="input" value={form.employment_type||'full-time'} onChange={e=>setForm(p=>({...p,employment_type:e.target.value}))}>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="contract">Contract</option>
              </select>
            </Field>
            <Field label="Address">
              <input className="input" value={form.address||''} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="City, Street"/>
            </Field>
            <Field label="Bank Account (for payroll)">
              <input className="input" value={form.bank_account||''} onChange={e=>setForm(p=>({...p,bank_account:e.target.value}))} placeholder="Account number"/>
            </Field>
          </div>
          <div style={{fontWeight:700,fontSize:13,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:12,marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>Emergency Contact</div>
          <div className="grid-2" style={{gap:12}}>
            <Field label="Contact Name">
              <input className="input" value={form.emergency_contact_name||''} onChange={e=>setForm(p=>({...p,emergency_contact_name:e.target.value}))} placeholder="Full name"/>
            </Field>
            <Field label="Contact Phone">
              <input className="input" value={form.emergency_contact_phone||''} onChange={e=>setForm(p=>({...p,emergency_contact_phone:e.target.value}))} placeholder="+977 98XXXXXXXX"/>
            </Field>
          </div>
          <div style={{marginTop:8,display:'flex',justifyContent:'flex-end',gap:10}}>
            <button className="btn-sec" onClick={()=>setForm({name:user.name,email:user.email,phone:user.phone||'',department:user.department,role:user.role})}>Reset</button>
            <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving?'Saving…':'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {tab==='security' && (
        <div className="card" style={{maxWidth:480}}>
          <div className="card-head"><span className="card-title">Change Password</span></div>
          <div style={{padding:'4px 0 16px',color:'var(--muted)',fontSize:13,lineHeight:1.6,borderBottom:'1px solid var(--border)',marginBottom:20}}>
            Choose a strong password with at least 6 characters. You'll be prompted to log in again if needed.
          </div>
          {[
            {key:'current', label:'Current Password'},
            {key:'newpw',   label:'New Password'},
            {key:'confirm', label:'Confirm New Password'},
          ].map(f=>(
            <Field key={f.key} label={f.label}>
              <div style={{position:'relative'}}>
                <input className="input" type={showPw[f.key]?'text':'password'} value={pwForm[f.key]}
                  onChange={e=>setPwForm(p=>({...p,[f.key]:e.target.value}))}
                  placeholder="••••••••" style={{paddingRight:42}}/>
                <button onClick={()=>setShowPw(p=>({...p,[f.key]:!p[f.key]}))}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)'}}>
                  {showPw[f.key]?'🙈':'👁️'}
                </button>
              </div>
            </Field>
          ))}
          {pwErr && (
            <div style={{background:'#fee2e2',color:'#991b1b',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:12,display:'flex',gap:8}}>
              <span>⚠️</span><span>{pwErr}</span>
            </div>
          )}
          <button className="btn-primary" onClick={handleChangePassword} disabled={pwSaving} style={{marginTop:4}}>
            {pwSaving?'Updating…':'Update Password'}
          </button>

          <div style={{marginTop:28,padding:'16px',background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)'}}>
            <div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:8}}>🔐 Account Info</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,fontSize:13,color:'var(--sub)'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--muted)'}}>Email</span><span>{user.email}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--muted)'}}>Role</span>
                <Badge type={user.role==='admin'?'urgent':user.role==='team_lead'?'high':'in_progress'} label={user.role.replace('_',' ')}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--muted)'}}>Joined</span><span>{fmt(user.join_date)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--muted)'}}>Status</span>
                <span style={{color:'#10b981',fontWeight:600}}>● Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==='activity' && (
        <div className="card">
          <div className="card-head"><span className="card-title">My Daily Updates</span><Badge type="completed" label={`${myUpdates.length} reports`}/></div>
          {!myUpdates.length ? <Empty msg="You haven't submitted any updates yet" icon="📝"/> : (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {myUpdates.map(u=>(
                <div key={u.id} style={{border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
                  <div style={{background:'var(--bg)',padding:'11px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>📅 {fmt(u.date)}</span>
                    <span style={{fontSize:12,color:'var(--muted)'}}>Stand-up report</span>
                  </div>
                  <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'#10b981',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>✓ Completed</div>
                      <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.completed}</div>
                    </div>
                    {u.pending && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>⏳ Pending</div>
                        <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.pending}</div>
                      </div>
                    )}
                    {u.challenges && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#ef4444',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>⚠ Blockers</div>
                        <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.challenges}</div>
                      </div>
                    )}
                    {u.notes && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#6366f1',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>📝 Notes</div>
                        <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({employees,tasks,updates,user}) {
  const completed = tasks.filter(t=>t.status==='completed').length
  const pending   = tasks.filter(t=>t.status==='pending').length
  const delayed   = tasks.filter(t=>t.status==='delayed').length
  const inProg    = tasks.filter(t=>t.status==='in_progress').length
  const rate      = tasks.length ? Math.round((completed/tasks.length)*100) : 0
  const top       = [...employees].sort((a,b)=>b.score-a.score).slice(0,5)
  const todayUpdates = updates.filter(u=>u.date===today())
  const myTasks   = tasks.filter(t=>t.assignee_id===user.id && t.status!=='completed')

  const stats = [
    {label:'Active Members',  val:employees.filter(e=>e.status==='active').length, icon:'👥', color:'#6366f1'},
    {label:'Tasks Completed', val:completed, icon:'✅', color:'#10b981'},
    {label:'In Progress',     val:inProg,    icon:'⚙️',  color:'#8b5cf6'},
    {label:'Delayed',         val:delayed,   icon:'⚠️',  color:'#ef4444'},
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {new Date().getHours()<12?'morning':'afternoon'}, {user.name.split(' ')[0]} 👋</h1>
          <p className="page-sub">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
      </div>

      <div className="grid-4">
        {stats.map(s=>(
          <div key={s.label} className="card" style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:50,height:50,borderRadius:14,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{s.icon}</div>
            <div>
              <div style={{fontSize:30,fontWeight:900,color:'var(--text)',lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">{user.role==='admin'?'High Priority Tasks':'My Open Tasks'}</span>
            <Badge type="in_progress" label={`${user.role==='admin'? tasks.filter(t=>['urgent','high'].includes(t.priority)&&t.status!=='completed').length : myTasks.length} tasks`}/>
          </div>
          {(() => {
            const list = user.role==='admin'
              ? tasks.filter(t=>['urgent','high'].includes(t.priority)&&t.status!=='completed').slice(0,6)
              : myTasks.slice(0,6)
            if (!list.length) return <Empty msg="All caught up! 🎉" icon="✅"/>
            return list.map(t=>{
              const dl = daysLeft(t.deadline)
              const emp = employees.find(e=>e.id===t.assignee_id)
              return (
                <div key={t.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{t.title}</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:3,display:'flex',gap:10,flexWrap:'wrap'}}>
                      {user.role==='admin'&&emp&&<span>→ {emp.name}</span>}
                      {t.deadline&&<span style={{color:dl!==null&&dl<0?'#ef4444':dl!==null&&dl<=2?'#f59e0b':'var(--muted)'}}>
                        {dl!==null&&dl<0?`${Math.abs(dl)}d overdue`:dl!==null?`${dl}d left`:''}
                      </span>}
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                    <Badge type={t.priority}/><span style={{fontSize:11,color:'var(--muted)'}}>{t.progress}%</span>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">🏆 Leaderboard</span></div>
          {top.map((emp,i)=>(
            <div key={emp.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<top.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:26,textAlign:'center',fontWeight:800,fontSize:16}}>{['🥇','🥈','🥉','4','5'][i]}</div>
              <Avatar name={emp.name} photo={emp.avatar_url} size={36}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{emp.name}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{emp.department}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:800,fontSize:16,color:'#6366f1'}}>{emp.score}%</div>
                <ProgressBar value={emp.score} color={i===0?'#f59e0b':'#6366f1'}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Today's Stand-up Reports</span>
          <Badge type="completed" label={`${todayUpdates.length} submitted`}/>
        </div>
        {!todayUpdates.length ? <Empty msg="No updates submitted yet today" icon="📝"/> : (
          <div className="grid-2">
            {todayUpdates.map(u=>{
              const emp = employees.find(e=>e.id===u.employee_id)
              return (
                <div key={u.id} style={{background:'var(--bg)',borderRadius:12,padding:14}}>
                  <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                    <Avatar name={emp?.name||'?'} photo={emp?.avatar_url} size={32}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{emp?.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{emp?.department}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>
                    <span style={{color:'#10b981',fontWeight:600}}>✓ </span>{u.completed}
                  </div>
                  {u.pending&&<div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>⏳ {u.pending}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none'}}>
        <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
          <div>
            <div style={{color:'rgba(255,255,255,.7)',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Team Productivity</div>
            <div style={{color:'#fff',fontSize:44,fontWeight:900,lineHeight:1,marginTop:4}}>{rate}%</div>
            <div style={{color:'rgba(255,255,255,.65)',fontSize:13,marginTop:4}}>{completed} of {tasks.length} tasks completed</div>
          </div>
          <div style={{flex:1,minWidth:180}}>
            <div style={{height:12,background:'rgba(255,255,255,.2)',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${rate}%`,background:'rgba(255,255,255,.85)',borderRadius:99,transition:'width .6s'}}/>
            </div>
            <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap'}}>
              {[{l:'Completed',v:completed,c:'#86efac'},{l:'In Progress',v:inProg,c:'#c4b5fd'},{l:'Pending',v:pending,c:'#fde68a'},{l:'Delayed',v:delayed,c:'#fca5a5'}].map(s=>(
                <div key={s.l}><div style={{color:s.c,fontWeight:800,fontSize:20}}>{s.v}</div><div style={{color:'rgba(255,255,255,.55)',fontSize:11}}>{s.l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Employees ────────────────────────────────────────────────
function Employees({employees,tasks,loading,onAdd,onEdit,onDelete,user}) {
  const [search,setSearch] = useState('')
  const [dept,setDept] = useState('All')
  const [modal,setModal] = useState(false)
  const [editTarget,setEditTarget] = useState(null)
  const [delConfirm,setDelConfirm] = useState(null)
  const blank = {name:'',email:'',password:'pass123',department:'Engineering',role:'employee',phone:'',join_date:today(),score:80,status:'active'}
  const [form,setForm] = useState(blank)
  const [saving,setSaving] = useState(false)

  const filtered = employees.filter(e=>
    (dept==='All'||e.department===dept)&&
    (e.name.toLowerCase().includes(search.toLowerCase())||e.email.toLowerCase().includes(search.toLowerCase()))
  )
  const openAdd = () => {setForm(blank);setEditTarget(null);setModal(true)}
  const openEdit = emp => {setForm({...emp});setEditTarget(emp.id);setModal(true)}
  const handleSave = async () => {
    if (!form.name||!form.email) return
    setSaving(true)
    if (editTarget) await onEdit(editTarget,form); else await onAdd(form)
    setSaving(false); setModal(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-sub">{employees.filter(e=>e.status==='active').length} active · {employees.length} total</p>
        </div>
        {user.role==='admin'&&<button className="btn-primary" onClick={openAdd}>+ Add Employee</button>}
      </div>
      <div className="card" style={{padding:'12px 18px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:180}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:14}}>🔍</span>
            <input className="input" style={{paddingLeft:34}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="input" style={{width:'auto'}} value={dept} onChange={e=>setDept(e.target.value)}>
            <option value="All">All Depts</option>
            {DEPTS.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      {loading?<Spinner/>:(
        <div className="grid-3">
          {filtered.map(emp=>{
            const empTasks=tasks.filter(t=>t.assignee_id===emp.id)
            const done=empTasks.filter(t=>t.status==='completed').length
            return (
              <div key={emp.id} className="card emp-card">
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <Avatar name={emp.name} photo={emp.avatar_url} size={48}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{emp.name}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{emp.department}</div>
                    </div>
                  </div>
                  {user.role==='admin'&&(
                    <div style={{display:'flex',gap:4}}>
                      <button className="icon-btn" onClick={()=>openEdit(emp)}>✏️</button>
                      <button className="icon-btn" style={{color:'#ef4444'}} onClick={()=>setDelConfirm(emp.id)}>🗑</button>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:7,fontSize:13}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>Email</span><span style={{color:'var(--sub)',fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.email}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>Role</span><Badge type="in_progress" label={emp.role.replace('_',' ')}/></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'var(--muted)'}}>Tasks done</span><span style={{fontWeight:600,color:'var(--text)'}}>{done}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'var(--muted)'}}>Score</span><span style={{fontWeight:800,color:'#6366f1'}}>{emp.score}%</span></div>
                  <ProgressBar value={emp.score} color={emp.score>=88?'#10b981':emp.score>=70?'#6366f1':'#f59e0b'}/>
                </div>
                <div style={{marginTop:12}}>
                  <span style={{background:emp.status==='active'?'#dcfce7':'#f1f5f9',color:emp.status==='active'?'#166534':'#475569',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>
                    {emp.status==='active'?'● Active':'○ Inactive'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editTarget?'Edit Employee':'Add Employee'}>
        <div className="grid-2" style={{gap:10}}>
          <Field label="Full Name" required><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Jane Doe"/></Field>
          <Field label="Email" required><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="jane@company.io"/></Field>
          <Field label="Password" hint="Employee uses this to log in"><input className="input" value={form.password||''} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></Field>
          <Field label="Phone"><input className="input" value={form.phone||''} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="+1 234 5678"/></Field>
          <Field label="Department"><select className="input" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></Field>
          <Field label="Role"><select className="input" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}><option value="employee">Employee</option><option value="team_lead">Team Lead</option><option value="admin">Admin</option></select></Field>
          <Field label="Join Date"><input className="input" type="date" value={form.join_date||''} onChange={e=>setForm(p=>({...p,join_date:e.target.value}))}/></Field>
          <Field label="Status"><select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editTarget?'Save Changes':'Add Employee'}</button>
        </div>
      </Modal>
      <Modal open={!!delConfirm} onClose={()=>setDelConfirm(null)} title="Remove Employee?" width={380}>
        <p style={{color:'var(--sub)',marginBottom:20}}>This will permanently delete the employee and all their data. This cannot be undone.</p>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setDelConfirm(null)}>Cancel</button>
          <button className="btn-primary" style={{background:'#ef4444'}} onClick={()=>{onDelete(delConfirm);setDelConfirm(null)}}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tasks ────────────────────────────────────────────────────
function Tasks({tasks,employees,loading,onAdd,onUpdate,onDelete,user}) {
  const [modal,setModal] = useState(false)
  const [detail,setDetail] = useState(null)
  const [statusF,setStatusF] = useState('All')
  const [priF,setPriF] = useState('All')
  const [search,setSearch] = useState('')
  const [saving,setSaving] = useState(false)
  const blank = {title:'',description:'',assignee_id:employees[0]?.id||'',department:'Engineering',priority:'medium',status:'pending',progress:0,deadline:''}
  const [form,setForm] = useState(blank)
  const [editId,setEditId] = useState(null)

  const isAdmin = user.role==='admin'||user.role==='team_lead'
  const visible = tasks.filter(t=>
    (user.role==='employee'?t.assignee_id===user.id:true)&&
    (statusF==='All'||t.status===statusF)&&
    (priF==='All'||t.priority===priF)&&
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {setForm({...blank,assignee_id:employees[0]?.id||''});setEditId(null);setModal(true)}
  const openEdit = t => {setForm({...t});setEditId(t.id);setModal(true)}
  const handleSave = async () => {
    if (!form.title) return
    setSaving(true)
    if (editId) await onUpdate(editId,form); else await onAdd(form)
    setSaving(false); setModal(false)
  }
  const updateProgress = async (id,progress) => {
    const status=progress===100?'completed':progress>0?'in_progress':'pending'
    const completed_at=progress===100?today():null
    await onUpdate(id,{progress,status,completed_at})
    if (detail?.id===id) setDetail(p=>({...p,progress,status,completed_at}))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Tasks</h1><p className="page-sub">{tasks.filter(t=>t.status==='delayed').length} delayed · {tasks.filter(t=>t.status==='in_progress').length} in progress</p></div>
        {isAdmin&&<button className="btn-primary" onClick={openAdd}>+ New Task</button>}
      </div>
      <div className="card" style={{padding:'12px 18px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <div style={{position:'relative',flex:1,minWidth:160}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:14}}>🔍</span>
            <input className="input" style={{paddingLeft:34}} placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="input" style={{width:'auto'}} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="All">All Statuses</option>
            {['pending','in_progress','completed','delayed'].map(s=><option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select className="input" style={{width:'auto'}} value={priF} onChange={e=>setPriF(e.target.value)}>
            <option value="All">All Priorities</option>
            {['low','medium','high','urgent'].map(p=><option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </select>
        </div>
      </div>
      {loading?<Spinner/>:!visible.length?<div className="card"><Empty msg="No tasks found" action={isAdmin?"Create First Task":undefined} onAction={openAdd}/></div>:(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Deadline</th><th>Progress</th><th>Actions</th></tr></thead>
              <tbody>
                {visible.map(t=>{
                  const emp=employees.find(e=>e.id===t.assignee_id)
                  const dl=daysLeft(t.deadline)
                  return (
                    <tr key={t.id} onClick={()=>setDetail(t)} style={{cursor:'pointer'}}>
                      <td><div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{t.title}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{t.department}</div></td>
                      <td>{emp?<div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={emp.name} photo={emp.avatar_url} size={28}/><span style={{fontSize:13,color:'var(--sub)'}}>{emp.name}</span></div>:<span style={{color:'var(--muted)'}}>Unassigned</span>}</td>
                      <td><Badge type={t.priority}/></td>
                      <td><Badge type={t.status}/></td>
                      <td><div style={{fontSize:13,color:t.status!=='completed'&&dl!==null&&dl<0?'#ef4444':dl!==null&&dl<=2?'#f59e0b':'var(--sub)'}}>{fmt(t.deadline)}{t.status!=='completed'&&dl!==null&&<div style={{fontSize:11,color:'var(--muted)'}}>{dl<0?`${Math.abs(dl)}d overdue`:`${dl}d left`}</div>}</div></td>
                      <td><div style={{display:'flex',alignItems:'center',gap:7}}><ProgressBar value={t.progress} color={t.status==='completed'?'#10b981':t.status==='delayed'?'#ef4444':'#6366f1'}/><span style={{fontSize:12,color:'var(--muted)',minWidth:28}}>{t.progress}%</span></div></td>
                      <td onClick={e=>e.stopPropagation()}><div style={{display:'flex',gap:4}}>{(isAdmin||(user.id===t.assignee_id))&&<button className="icon-btn" onClick={()=>openEdit(t)}>✏️</button>}{isAdmin&&<button className="icon-btn" style={{color:'#ef4444'}} onClick={()=>onDelete(t.id)}>🗑</button>}</div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {detail&&(
        <Modal open={true} onClose={()=>setDetail(null)} title="Task Details" width={580}>
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}><Badge type={detail.priority}/><Badge type={detail.status}/></div>
          <h2 style={{fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:8}}>{detail.title}</h2>
          <p style={{color:'var(--sub)',lineHeight:1.7,marginBottom:16}}>{detail.description||<span style={{color:'var(--muted)'}}>No description provided.</span>}</p>
          <div className="grid-2" style={{gap:10,marginBottom:16}}>
            {[
              {l:'Assigned To',v:(()=>{const e=employees.find(x=>x.id===detail.assignee_id);return e?<div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={e.name} photo={e.avatar_url} size={24}/><span>{e.name}</span></div>:'—'})()},
              {l:'Department',v:detail.department},{l:'Deadline',v:fmt(detail.deadline)},{l:'Completed',v:fmt(detail.completed_at)},
            ].map(item=>(
              <div key={item.l} style={{background:'var(--bg)',borderRadius:10,padding:12}}>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>{item.l}</div>
                <div style={{fontWeight:600,color:'var(--text)',fontSize:14}}>{item.v}</div>
              </div>
            ))}
          </div>
          {(isAdmin||(user.id===detail.assignee_id))&&(
            <div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:600}}>UPDATE PROGRESS — {detail.progress}%</div>
              <input type="range" min={0} max={100} value={detail.progress} onChange={e=>{const v=Number(e.target.value);setDetail(p=>({...p,progress:v}));updateProgress(detail.id,v)}} style={{width:'100%',accentColor:'#6366f1'}}/>
            </div>
          )}
        </Modal>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?'Edit Task':'New Task'}>
        <Field label="Title" required><input className="input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="What needs to be done?"/></Field>
        <Field label="Description"><textarea className="input" rows={3} value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="More details…" style={{resize:'vertical'}}/></Field>
        <div className="grid-2" style={{gap:10}}>
          <Field label="Assign To"><select className="input" value={form.assignee_id||''} onChange={e=>setForm(p=>({...p,assignee_id:e.target.value}))}>{employees.filter(e=>e.status==='active').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
          <Field label="Department"><select className="input" value={form.department||''} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}>{['low','medium','high','urgent'].map(x=><option key={x} value={x}>{PRIORITY_META[x].label}</option>)}</select></Field>
          <Field label="Status"><select className="input" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>{['pending','in_progress','completed','delayed'].map(x=><option key={x} value={x}>{STATUS_META[x].label}</option>)}</select></Field>
          <Field label="Deadline"><input className="input" type="date" value={form.deadline||''} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))}/></Field>
          <Field label="Progress %"><input className="input" type="number" min={0} max={100} value={form.progress} onChange={e=>setForm(p=>({...p,progress:Number(e.target.value)}))}/></Field>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editId?'Save Changes':'Create Task'}</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Daily Updates ────────────────────────────────────────────
function DailyUpdates({updates,employees,loading,onAdd,user}) {
  const [modal,setModal] = useState(false)
  const [saving,setSaving] = useState(false)
  const [form,setForm] = useState({employee_id:user.id,date:today(),completed:'',pending:'',challenges:'',notes:''})
  const [dateF,setDateF] = useState(today())
  const filtered = updates.filter(u=>(!dateF||u.date===dateF))
  const alreadySubmitted = updates.find(u=>u.employee_id===user.id&&u.date===today())

  const handleSubmit = async () => {
    if (!form.completed.trim()) return
    setSaving(true)
    await onAdd({...form,employee_id:user.role==='employee'?user.id:form.employee_id})
    setSaving(false); setModal(false)
    setForm(p=>({...p,completed:'',pending:'',challenges:'',notes:''}))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Daily Updates</h1><p className="page-sub">Stand-up reports & work logs</p></div>
        <button className="btn-primary" onClick={()=>setModal(true)}>{alreadySubmitted?'📝 Edit Today\'s Update':'+ Submit Update'}</button>
      </div>
      <div className="card" style={{padding:'12px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <label style={{fontSize:13,color:'var(--muted)',fontWeight:600,whiteSpace:'nowrap'}}>Filter by date:</label>
          <input className="input" type="date" value={dateF} onChange={e=>setDateF(e.target.value)} style={{width:'auto'}}/>
          {dateF&&<button className="btn-sec" onClick={()=>setDateF('')}>Clear</button>}
          <span style={{fontSize:13,color:'var(--muted)',marginLeft:'auto'}}>{filtered.length} report{filtered.length!==1?'s':''}</span>
        </div>
      </div>
      {loading?<Spinner/>:!filtered.length?<div className="card"><Empty msg="No updates for this date" icon="📝"/></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {filtered.map(u=>{
            const emp=employees.find(e=>e.id===u.employee_id)
            return (
              <div key={u.id} className="card" style={{padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <Avatar name={emp?.name||'?'} photo={emp?.avatar_url} size={44}/>
                    <div><div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{emp?.name||'Unknown'}</div><div style={{fontSize:12,color:'var(--muted)'}}>{emp?.department} · {fmt(u.date)}</div></div>
                  </div>
                </div>
                <div className="grid-2" style={{gap:10}}>
                  <div style={{background:'var(--bg)',borderRadius:10,padding:14}}><div style={{fontSize:11,fontWeight:700,color:'#10b981',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>✓ Completed</div><div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.completed}</div></div>
                  {u.pending&&<div style={{background:'var(--bg)',borderRadius:10,padding:14}}><div style={{fontSize:11,fontWeight:700,color:'#f59e0b',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>⏳ Pending</div><div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.pending}</div></div>}
                  {u.challenges&&<div style={{background:'var(--bg)',borderRadius:10,padding:14}}><div style={{fontSize:11,fontWeight:700,color:'#ef4444',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>⚠ Blockers</div><div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.challenges}</div></div>}
                  {u.notes&&<div style={{background:'var(--bg)',borderRadius:10,padding:14}}><div style={{fontSize:11,fontWeight:700,color:'#6366f1',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>📝 Notes</div><div style={{fontSize:13,color:'var(--sub)',lineHeight:1.6}}>{u.notes}</div></div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title="Submit Daily Update">
        <div className="grid-2" style={{gap:10}}>
          {user.role!=='employee'&&<Field label="Employee"><select className="input" value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))}>{employees.filter(e=>e.status==='active').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>}
          <Field label="Date"><input className="input" type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></Field>
        </div>
        <Field label="Work completed today" required><textarea className="input" rows={3} value={form.completed} onChange={e=>setForm(p=>({...p,completed:e.target.value}))} placeholder="What did you accomplish today?" style={{resize:'vertical'}}/></Field>
        <Field label="Pending / tomorrow's plan"><textarea className="input" rows={2} value={form.pending} onChange={e=>setForm(p=>({...p,pending:e.target.value}))} placeholder="What's still in progress?" style={{resize:'vertical'}}/></Field>
        <Field label="Blockers / challenges"><textarea className="input" rows={2} value={form.challenges} onChange={e=>setForm(p=>({...p,challenges:e.target.value}))} placeholder="Any blockers?" style={{resize:'vertical'}}/></Field>
        <Field label="Notes"><input className="input" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Anything else…"/></Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Submitting…':'Submit Update'}</button>
        </div>
      </Modal>
    </div>
  )
}


// ─── Attendance ───────────────────────────────────────────────
function Attendance({user, employees, toast}) {
  const [attendance, setAttendance] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const nowDate = new Date()
  const [filterMonth, setFilterMonth] = useState(nowDate.getMonth()+1)
  const [filterYear, setFilterYear] = useState(nowDate.getFullYear())
  // team lead: filter by dept employee; admin: 'all' or specific emp
  const [filterEmp, setFilterEmp] = useState('all')
  const [adminModal, setAdminModal] = useState(false)
  const [adminForm, setAdminForm] = useState({employee_id:employees[0]?.id||'',date:today(),status:'present',notes:''})
  const [saving, setSaving] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const isAdmin    = user.role === 'admin'
  const isTeamLead = user.role === 'team_lead'
  const isEmployee = user.role === 'employee'

  // employees this user is allowed to see
  const deptEmployees = isTeamLead
    ? employees.filter(e => e.department === user.department)
    : employees
  const deptEmpIds = deptEmployees.map(e => e.id)

  // ── live timer ──────────────────────────────────────────────
  const startTimer = (checkInTs) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(checkInTs).getTime()) / 1000))
    }, 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }
  useEffect(() => () => stopTimer(), [])

  const fmtElapsed = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const load = useCallback(async () => {
    setLoading(true)
    // build filter inline — always uses latest state
    let filter = { month: filterMonth, year: filterYear }
    if (isEmployee) {
      filter.employee_id = user.id
    } else if (isTeamLead) {
      const ids = filterEmp === 'all' ? deptEmpIds : [filterEmp]
      filter.employee_ids = ids.length ? ids : [user.id]
    } else {
      if (filterEmp !== 'all') filter.employee_id = filterEmp
    }
    try {
      const [rec, all] = await Promise.all([
        DB.getTodayAttendance(user.id),
        DB.getAttendance(filter)
      ])
      setTodayRecord(rec)
      setAttendance(all || [])
      if (rec?.check_in && !rec?.check_out) {
        setElapsed(Math.floor((Date.now() - new Date(rec.check_in).getTime()) / 1000))
        startTimer(rec.check_in)
      }
    } catch(e) {
      toast('Failed to load attendance: ' + e.message, 'error')
    }
    setLoading(false)
  }, [filterEmp, filterMonth, filterYear, isEmployee, isTeamLead, JSON.stringify(deptEmpIds), user.id])

  useEffect(() => { load() }, [load])

  const handleCheckIn = async () => {
    setSaving(true)
    try {
      const rec = await DB.checkIn(user.id)
      setTodayRecord(rec); setElapsed(0); startTimer(rec.check_in)
      toast('Checked in at '+fmtTime(rec.check_in),'success')
      load()
    } catch(e) { toast('Check-in failed: '+e.message,'error') }
    setSaving(false)
  }

  const handleCheckOut = async () => {
    if (!todayRecord) return
    setSaving(true)
    try {
      const rec = await DB.checkOut(todayRecord.id)
      stopTimer(); setTodayRecord(rec)
      toast(`Checked out at ${fmtTime(rec.check_out)} — ${rec.hours_worked}h worked`,'success')
      load()
    } catch(e) { toast('Check-out failed: '+e.message,'error') }
    setSaving(false)
  }

  const handleAdminSave = async () => {
    setSaving(true)
    try {
      await DB.upsertAttendance(adminForm)
      toast('Attendance saved','success'); setAdminModal(false); load()
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const checkedIn  = !!todayRecord?.check_in
  const checkedOut = !!todayRecord?.check_out
  const summary = attendance.reduce((acc,r)=>{ acc[r.status]=(acc[r.status]||0)+1; return acc },{})

  // employees available in the filter dropdown
  const filterableEmployees = isAdmin ? employees : deptEmployees

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-sub">
            {isEmployee ? 'My attendance' : isTeamLead ? `${user.department} dept` : 'All employees'} · {monthName(filterMonth)} {filterYear}
          </p>
        </div>
        {(isAdmin || isTeamLead) && <button className="btn-primary" onClick={()=>setAdminModal(true)}>+ Log Attendance</button>}
      </div>

      {/* ── Today hero widget ── */}
      <div className="card" style={{background:'linear-gradient(135deg,#0f172a,#1e1b4b)',border:'none',padding:'28px 32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:32,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>
              {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
            {checkedOut ? (
              <>
                <div style={{color:'#86efac',fontSize:22,fontWeight:900}}>✅ Day Complete</div>
                <div style={{color:'rgba(255,255,255,.6)',fontSize:14,marginTop:4}}>{fmtTime(todayRecord.check_in)} → {fmtTime(todayRecord.check_out)}</div>
                <div style={{color:'#fff',fontSize:15,marginTop:2,fontWeight:600}}>Total: {todayRecord.hours_worked}h worked</div>
              </>
            ) : checkedIn ? (
              <>
                <div style={{color:'#fde68a',fontSize:22,fontWeight:900}}>⚙️ Currently Working</div>
                <div style={{color:'rgba(255,255,255,.6)',fontSize:14,marginTop:4}}>Checked in at {fmtTime(todayRecord.check_in)}</div>
              </>
            ) : (
              <>
                <div style={{color:'#fff',fontSize:22,fontWeight:900}}>☀️ Ready to start?</div>
                <div style={{color:'rgba(255,255,255,.5)',fontSize:14,marginTop:4}}>Click Check In to begin your shift</div>
              </>
            )}
          </div>

          {checkedIn && !checkedOut && (
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'monospace',fontSize:48,fontWeight:900,color:'#fff',letterSpacing:'0.05em',lineHeight:1,textShadow:'0 0 40px rgba(99,102,241,.6)'}}>
                {fmtElapsed(elapsed)}
              </div>
              <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginTop:6,textTransform:'uppercase',letterSpacing:'.1em'}}>hrs : min : sec</div>
            </div>
          )}

          {checkedOut && (
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'monospace',fontSize:48,fontWeight:900,color:'#86efac',letterSpacing:'0.05em',lineHeight:1}}>{todayRecord.hours_worked}h</div>
              <div style={{color:'rgba(255,255,255,.4)',fontSize:11,marginTop:6,textTransform:'uppercase',letterSpacing:'.1em'}}>total worked</div>
            </div>
          )}

          <div>
            {!checkedIn && (
              <button onClick={handleCheckIn} disabled={saving} style={{background:'#10b981',color:'#fff',border:'none',borderRadius:16,padding:'16px 36px',fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 24px rgba(16,185,129,.4)',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit'}}>
                <span style={{fontSize:22}}>🟢</span> Check In
              </button>
            )}
            {checkedIn && !checkedOut && (
              <button onClick={handleCheckOut} disabled={saving} style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:16,padding:'16px 36px',fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 24px rgba(239,68,68,.4)',display:'flex',alignItems:'center',gap:10,fontFamily:'inherit'}}>
                <span style={{fontSize:22}}>🔴</span> Check Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-4">
        {[
          {label:'Present',  val:summary.present||0,  color:'#10b981', icon:'✅'},
          {label:'Absent',   val:summary.absent||0,   color:'#ef4444', icon:'❌'},
          {label:'On Leave', val:summary.on_leave||0, color:'#f59e0b', icon:'🏖️'},
          {label:'Half Day', val:summary.half_day||0, color:'#8b5cf6', icon:'⏰'},
        ].map(s=>(
          <div key={s.label} className="card" style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{s.icon}</div>
            <div><div style={{fontSize:26,fontWeight:900,color:s.color}}>{s.val}</div><div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters — employees see no dropdown, team leads see dept only, admin sees all */}
      <div className="card" style={{padding:'12px 18px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {!isEmployee && (
            <select className="input" style={{width:'auto'}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
              <option value="all">{isTeamLead ? `All — ${user.department}` : 'All Employees'}</option>
              {filterableEmployees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
          <select className="input" style={{width:'auto'}} value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{monthName(i+1)}</option>)}
          </select>
          <input className="input" type="number" style={{width:90}} value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} min={2020} max={2099}/>
          <button className="btn-sec" onClick={load}>Refresh</button>
          {isTeamLead && (
            <span style={{fontSize:12,color:'var(--muted)',marginLeft:4}}>
              🔒 Showing {user.department} department only
            </span>
          )}
          {isEmployee && (
            <span style={{fontSize:12,color:'var(--muted)',marginLeft:4}}>
              🔒 Showing your records only
            </span>
          )}
        </div>
      </div>

      {/* Log table */}
      {loading ? <Spinner/> : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {!attendance.length ? <Empty msg="No attendance records for this period" icon="📅"/> : (
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr>
                  {!isEmployee && <th>Employee</th>}
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr></thead>
                <tbody>
                  {attendance.map(r=>{
                    const emp = employees.find(e=>e.id===r.employee_id)
                    const isActiveRow = r.employee_id===user.id && r.check_in && !r.check_out
                    return (
                      <tr key={r.id} style={{background:isActiveRow?'rgba(99,102,241,.04)':''}}>
                        {!isEmployee && (
                          <td><div style={{display:'flex',alignItems:'center',gap:8}}>
                            <Avatar name={emp?.name||'?'} size={28}/>
                            <span style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{emp?.name||'?'}</span>
                          </div></td>
                        )}
                        <td style={{fontWeight:600,color:'var(--text)',fontSize:13}}>{fmt(r.date)}</td>
                        <td style={{color:'#10b981',fontWeight:700,fontFamily:'monospace'}}>{fmtTime(r.check_in)}</td>
                        <td style={{color:r.check_out?'#ef4444':'var(--muted)',fontWeight:700,fontFamily:'monospace'}}>
                          {r.check_out ? fmtTime(r.check_out) : isActiveRow ? <span style={{color:'#f59e0b',fontSize:12}}>● In progress</span> : '—'}
                        </td>
                        <td style={{fontWeight:800,color:'var(--text)',fontFamily:'monospace'}}>
                          {r.hours_worked ? <span style={{color:'#6366f1'}}>{r.hours_worked}h</span> : isActiveRow ? <span style={{color:'#f59e0b',fontSize:12}}>Live ↑</span> : '—'}
                        </td>
                        <td>
                          <span style={{
                            background:r.status==='present'?'#dcfce7':r.status==='absent'?'#fee2e2':r.status==='on_leave'?'#fef9c3':'#ede9fe',
                            color:r.status==='present'?'#166534':r.status==='absent'?'#991b1b':r.status==='on_leave'?'#713f12':'#5b21b6',
                            padding:'2px 10px',borderRadius:99,fontSize:12,fontWeight:600,textTransform:'capitalize'
                          }}>{r.status.replace('_',' ')}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin/team_lead log modal */}
      <Modal open={adminModal} onClose={()=>setAdminModal(false)} title="Log Attendance">
        <Field label="Employee">
          <select className="input" value={adminForm.employee_id} onChange={e=>setAdminForm(p=>({...p,employee_id:e.target.value}))}>
            {(isTeamLead ? deptEmployees : employees).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input className="input" type="date" value={adminForm.date} onChange={e=>setAdminForm(p=>({...p,date:e.target.value}))}/></Field>
        <div className="grid-2" style={{gap:10}}>
          <Field label="Check In Time"><input className="input" type="time" value={adminForm.check_in||''} onChange={e=>setAdminForm(p=>({...p,check_in:e.target.value?`${adminForm.date}T${e.target.value}:00`:null}))}/></Field>
          <Field label="Check Out Time"><input className="input" type="time" value={adminForm.check_out||''} onChange={e=>setAdminForm(p=>({...p,check_out:e.target.value?`${adminForm.date}T${e.target.value}:00`:null}))}/></Field>
        </div>
        <Field label="Status">
          <select className="input" value={adminForm.status} onChange={e=>setAdminForm(p=>({...p,status:e.target.value}))}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="on_leave">On Leave</option>
          </select>
        </Field>
        <Field label="Notes"><input className="input" value={adminForm.notes||''} onChange={e=>setAdminForm(p=>({...p,notes:e.target.value}))} placeholder="Optional note"/></Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setAdminModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleAdminSave} disabled={saving}>{saving?'Saving…':'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}
// ─── Leave Management ──────────────────────────────────────────
function LeaveManagement({user, employees, toast}) {
  const [leaves, setLeaves] = useState([])
  const [balances, setBalances] = useState([])
  const [myBalance, setMyBalance] = useState(null)
  const [settings, setSettings] = useState({annual_default:12,sick_default:10,casual_default:6})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('my')
  const [modal, setModal] = useState(false)
  const [balanceModal, setBalanceModal] = useState(false)
  const [settingsModal, setSettingsModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selEmployee, setSelEmployee] = useState(null)
  const blank = {employee_id:user.id, leave_type:'annual', start_date:today(), end_date:today(), reason:''}
  const [form, setForm] = useState(blank)
  const [balForm, setBalForm] = useState({annual_total:12,sick_total:10,casual_total:6})
  const [setForm2, setSettForm] = useState({annual_default:12,sick_default:10,casual_default:6})
  const isAdmin = user.role==='admin'

  const load = async () => {
    setLoading(true)
    try {
      const [lv, bal, mb, st] = await Promise.all([
        DB.getLeaves(isAdmin?{}:{employee_id:user.id}),
        isAdmin ? DB.getAllLeaveBalances() : Promise.resolve([]),
        DB.getLeaveBalances(user.id),
        DB.getLeaveSettings()
      ])
      setLeaves(lv||[]); setBalances(bal||[]); setMyBalance(mb); setSettings(st||settings)
    } catch(e) { toast('Failed to load leaves','error') }
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const handleSubmit = async () => {
    if (!form.reason) return toast('Please enter a reason','error')
    setSaving(true)
    try {
      const data = await DB.addLeave({...form, employee_id:user.id, status:'pending'})
      setLeaves(p=>[data,...p])
      toast('Leave request submitted','success'); setModal(false); setForm(blank)
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const handleApprove = async (id, approve) => {
    try {
      const updated = await DB.updateLeave(id,{
        status: approve?'approved':'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      setLeaves(p=>p.map(l=>l.id===id?updated:l))
      if (approve) {
        // update balance
        const leave = leaves.find(l=>l.id===id)
        if (leave) {
          const bal = await DB.getLeaveBalances(leave.employee_id)
          if (bal) {
            const field = leave.leave_type+'_used'
            if (bal[field] !== undefined) {
              await DB.upsertLeaveBalance({...bal, [field]: (bal[field]||0)+leave.days})
            }
          }
        }
      }
      toast(approve?'Leave approved':'Leave rejected', approve?'success':'info')
    } catch(e) { toast('Error: '+e.message,'error') }
  }

  const handleSaveBalance = async () => {
    if (!selEmployee) return
    setSaving(true)
    try {
      await DB.upsertLeaveBalance({...balForm, employee_id:selEmployee.id})
      toast('Leave balance updated','success'); setBalanceModal(false)
      load()
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const updated = await DB.saveLeaveSettings(settings)
      setSettings(updated||settings)
      toast('Leave settings saved','success'); setSettingsModal(false)
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const pending = leaves.filter(l=>l.status==='pending')
  const myLeaves = leaves.filter(l=>l.employee_id===user.id)

  const LeaveTypeBadge = ({type}) => (
    <span style={{background:LEAVE_COLORS[type]+'20',color:LEAVE_COLORS[type],padding:'2px 10px',borderRadius:99,fontSize:12,fontWeight:700,textTransform:'capitalize'}}>{type}</span>
  )
  const StatusBadge = ({status}) => {
    const c = status==='approved'?'#10b981':status==='rejected'?'#ef4444':'#f59e0b'
    return <span style={{background:c+'18',color:c,padding:'2px 10px',borderRadius:99,fontSize:12,fontWeight:700,textTransform:'capitalize'}}>{status}</span>
  }

  const tabs = isAdmin
    ? [{id:'my',label:'My Leaves'},{id:'all',label:'All Requests'},{id:'pending',label:`Pending (${pending.length})`},{id:'balances',label:'Balances'}]
    : [{id:'my',label:'My Leaves'}]

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Leave Management</h1><p className="page-sub">{pending.length} pending approval</p></div>
        <div style={{display:'flex',gap:10}}>
          {isAdmin && <button className="btn-sec" onClick={()=>setSettingsModal(true)}>⚙ Settings</button>}
          <button className="btn-primary" onClick={()=>{setForm(blank);setModal(true)}}>+ Request Leave</button>
        </div>
      </div>

      {/* My balance widget */}
      {myBalance && (
        <div className="card">
          <div className="card-head"><span className="card-title">My Leave Balance</span><span style={{fontSize:12,color:'var(--muted)'}}>This Year</span></div>
          <div className="grid-4">
            {[
              {type:'annual',total:myBalance.annual_total,used:myBalance.annual_used},
              {type:'sick',total:myBalance.sick_total,used:myBalance.sick_used},
              {type:'casual',total:myBalance.casual_total,used:myBalance.casual_used},
              {type:'unpaid',total:'∞',used:myBalance.unpaid_used},
            ].map(b=>(
              <div key={b.type} style={{background:'var(--bg)',borderRadius:12,padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:LEAVE_COLORS[b.type],textTransform:'capitalize'}}>{b.type}</span>
                  <span style={{fontSize:12,color:'var(--muted)'}}>{b.used} used</span>
                </div>
                <div style={{fontSize:24,fontWeight:900,color:'var(--text)'}}>{b.type==='unpaid'?b.used:b.total-b.used}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{b.type==='unpaid'?'days taken':'days remaining'}</div>
                {b.type!=='unpaid' && <ProgressBar value={(b.used/b.total)*100} color={LEAVE_COLORS[b.type]} height={4}/>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',paddingLeft:4}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:'12px 18px',border:'none',background:'transparent',cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?'#6366f1':'var(--muted)',borderBottom:tab===t.id?'2px solid #6366f1':'2px solid transparent',fontFamily:'inherit'}}>
              {t.label}
            </button>
          ))}
        </div>
        {loading?<Spinner/>:(()=>{
          const list = tab==='my'?myLeaves:tab==='pending'?pending:tab==='all'?leaves:[]
          if (tab==='balances') return (
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Annual</th><th>Sick</th><th>Casual</th><th>Unpaid Used</th><th></th></tr></thead>
                <tbody>
                  {employees.filter(e=>e.status==='active').map(emp=>{
                    const bal = balances.find(b=>b.employee_id===emp.id)
                    return (
                      <tr key={emp.id}>
                        <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={emp.name} size={28}/><span style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{emp.name}</span></div></td>
                        <td style={{color:'#6366f1',fontWeight:700}}>{bal?(bal.annual_total-bal.annual_used)+'/'+bal.annual_total:'—'}</td>
                        <td style={{color:'#ef4444',fontWeight:700}}>{bal?(bal.sick_total-bal.sick_used)+'/'+bal.sick_total:'—'}</td>
                        <td style={{color:'#f59e0b',fontWeight:700}}>{bal?(bal.casual_total-bal.casual_used)+'/'+bal.casual_total:'—'}</td>
                        <td style={{color:'var(--muted)',fontWeight:600}}>{bal?.unpaid_used||0}</td>
                        <td><button className="btn-sec" style={{fontSize:12,padding:'5px 12px'}} onClick={()=>{setSelEmployee(emp);setBalForm({annual_total:bal?.annual_total||12,sick_total:bal?.sick_total||10,casual_total:bal?.casual_total||6});setBalanceModal(true)}}>Edit</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
          if (!list.length) return <Empty msg="No leave requests found" icon="🏖️"/>
          return (
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr>
                  {tab!=='my'&&<th>Employee</th>}
                  <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>
                  {tab==='pending'&&<th>Actions</th>}
                </tr></thead>
                <tbody>
                  {list.map(l=>{
                    const emp = employees.find(e=>e.id===l.employee_id)
                    return (
                      <tr key={l.id}>
                        {tab!=='my'&&<td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={emp?.name||'?'} size={28}/><span style={{fontWeight:600,fontSize:13}}>{emp?.name}</span></div></td>}
                        <td><LeaveTypeBadge type={l.leave_type}/></td>
                        <td style={{fontSize:13,color:'var(--sub)'}}>{fmt(l.start_date)}</td>
                        <td style={{fontSize:13,color:'var(--sub)'}}>{fmt(l.end_date)}</td>
                        <td style={{fontWeight:700,color:'var(--text)'}}>{l.days}d</td>
                        <td style={{fontSize:13,color:'var(--sub)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.reason||'—'}</td>
                        <td><StatusBadge status={l.status}/></td>
                        {tab==='pending'&&<td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn-primary" style={{fontSize:12,padding:'5px 12px',background:'#10b981'}} onClick={()=>handleApprove(l.id,true)}>✓ Approve</button>
                            <button className="btn-sec" style={{fontSize:12,padding:'5px 12px',color:'#ef4444',borderColor:'#ef4444'}} onClick={()=>handleApprove(l.id,false)}>✗ Reject</button>
                          </div>
                        </td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Request modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Request Leave">
        <div className="grid-2" style={{gap:10}}>
          <Field label="Leave Type"><select className="input" value={form.leave_type} onChange={e=>setForm(p=>({...p,leave_type:e.target.value}))}>{LEAVE_TYPES.map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></Field>
          <Field label="Start Date"><input className="input" type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}/></Field>
          <Field label="End Date"><input className="input" type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/></Field>
        </div>
        <Field label="Reason" required><textarea className="input" rows={3} value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Briefly explain your reason…" style={{resize:'vertical'}}/></Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Submitting…':'Submit Request'}</button>
        </div>
      </Modal>

      {/* Balance edit modal */}
      <Modal open={balanceModal} onClose={()=>setBalanceModal(false)} title={`Edit Leave Balance — ${selEmployee?.name}`} width={420}>
        <Field label="Annual Leave Total (days)"><input className="input" type="number" value={balForm.annual_total} onChange={e=>setBalForm(p=>({...p,annual_total:Number(e.target.value)}))}/></Field>
        <Field label="Sick Leave Total (days)"><input className="input" type="number" value={balForm.sick_total} onChange={e=>setBalForm(p=>({...p,sick_total:Number(e.target.value)}))}/></Field>
        <Field label="Casual Leave Total (days)"><input className="input" type="number" value={balForm.casual_total} onChange={e=>setBalForm(p=>({...p,casual_total:Number(e.target.value)}))}/></Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setBalanceModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveBalance} disabled={saving}>{saving?'Saving…':'Save'}</button>
        </div>
      </Modal>

      {/* Settings modal */}
      <Modal open={settingsModal} onClose={()=>setSettingsModal(false)} title="Global Leave Defaults" width={420}>
        <p style={{color:'var(--muted)',fontSize:13,marginBottom:16}}>New employees will start with these allowances. You can override per-employee from the Balances tab.</p>
        <Field label="Annual Leave Default"><input className="input" type="number" value={settings.annual_default} onChange={e=>setSettings(p=>({...p,annual_default:Number(e.target.value)}))}/></Field>
        <Field label="Sick Leave Default"><input className="input" type="number" value={settings.sick_default} onChange={e=>setSettings(p=>({...p,sick_default:Number(e.target.value)}))}/></Field>
        <Field label="Casual Leave Default"><input className="input" type="number" value={settings.casual_default} onChange={e=>setSettings(p=>({...p,casual_default:Number(e.target.value)}))}/></Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setSettingsModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving?'Saving…':'Save Defaults'}</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Payroll ───────────────────────────────────────────────────
function Payroll({user, employees, toast}) {
  const [payroll, setPayroll] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [payslipModal, setPayslipModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth()+1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const blank = {employee_id:employees[0]?.id||'',base_salary:0,working_days:22,days_present:0,days_on_leave:0,days_absent:0,deductions:0,month:filterMonth,year:filterYear}
  const [form, setForm] = useState(blank)
  const isAdmin = user.role==='admin'

  const load = async () => {
    setLoading(true)
    try {
      const data = await DB.getPayroll({month:filterMonth,year:filterYear})
      setPayroll(data||[])
    } catch(e) { toast('Failed to load payroll','error') }
    setLoading(false)
  }
  useEffect(()=>{load()},[filterMonth,filterYear])

  const handleSave = async () => {
    setSaving(true)
    try {
      await DB.upsertPayroll({...form,month:filterMonth,year:filterYear})
      toast('Payroll record saved','success'); setModal(false); load()
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const handleMarkPaid = async (id) => {
    try {
      await DB.updatePayroll(id,{is_paid:true,paid_at:new Date().toISOString()})
      setPayroll(p=>p.map(r=>r.id===id?{...r,is_paid:true,paid_at:new Date().toISOString()}:r))
      toast('Marked as paid','success')
    } catch(e) { toast('Error','error') }
  }

  const total = payroll.reduce((s,r)=>s+(r.net_salary||0),0)
  const paid  = payroll.filter(r=>r.is_paid).length

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Payroll</h1><p className="page-sub">{monthName(filterMonth)} {filterYear} — {paid}/{payroll.length} paid</p></div>
        {isAdmin && <button className="btn-primary" onClick={()=>{setForm({...blank,month:filterMonth,year:filterYear});setModal(true)}}>+ Add Record</button>}
      </div>

      {/* Summary */}
      <div className="grid-4">
        {[
          {label:'Total Payroll',val:NPR(total),icon:'💰',color:'#10b981'},
          {label:'Records',val:payroll.length,icon:'📋',color:'#6366f1'},
          {label:'Paid',val:paid,icon:'✅',color:'#10b981'},
          {label:'Pending',val:payroll.length-paid,icon:'⏳',color:'#f59e0b'},
        ].map(s=>(
          <div key={s.label} className="card" style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:s.color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{s.icon}</div>
            <div><div style={{fontSize:s.label==='Total Payroll'?17:26,fontWeight:900,color:s.color,lineHeight:1.1}}>{s.val}</div><div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{padding:'12px 18px'}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <select className="input" style={{width:'auto'}} value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{monthName(i+1)}</option>)}
          </select>
          <input className="input" type="number" style={{width:90}} value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} min={2020} max={2099}/>
          <button className="btn-sec" onClick={load}>Refresh</button>
        </div>
      </div>

      {loading?<Spinner/>:(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {!payroll.length ? <Empty msg="No payroll records for this period" icon="💰" action={isAdmin?'Add Records':undefined} onAction={()=>setModal(true)}/> : (
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead><tr><th>Employee</th><th>Base Salary</th><th>Days Present</th><th>Deductions</th><th>Net Salary</th><th>Status</th>{isAdmin&&<th>Actions</th>}</tr></thead>
                <tbody>
                  {payroll.map(r=>{
                    const emp = employees.find(e=>e.id===r.employee_id)
                    return (
                      <tr key={r.id}>
                        <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={emp?.name||'?'} size={30}/><div><div style={{fontWeight:600,fontSize:13,color:'var(--text)'}}>{emp?.name||'?'}</div><div style={{fontSize:11,color:'var(--muted)'}}>{emp?.department}</div></div></div></td>
                        <td style={{fontWeight:600,color:'var(--sub)'}}>{NPR(r.base_salary)}</td>
                        <td><span style={{fontWeight:700,color:'var(--text)'}}>{r.days_present}</span><span style={{color:'var(--muted)',fontSize:12}}>/{r.working_days}</span></td>
                        <td style={{color:'#ef4444',fontWeight:600}}>{NPR(r.deductions)}</td>
                        <td style={{fontWeight:900,fontSize:16,color:'#10b981'}}>{NPR(r.net_salary)}</td>
                        <td><span style={{background:r.is_paid?'#dcfce7':'#fef9c3',color:r.is_paid?'#166534':'#713f12',padding:'2px 10px',borderRadius:99,fontSize:12,fontWeight:700}}>{r.is_paid?'Paid':'Pending'}</span></td>
                        {isAdmin&&<td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn-sec" style={{fontSize:12,padding:'5px 12px'}} onClick={()=>setPayslipModal(r)}>Payslip</button>
                            {!r.is_paid && <button className="btn-primary" style={{fontSize:12,padding:'5px 12px',background:'#10b981'}} onClick={()=>handleMarkPaid(r.id)}>Mark Paid</button>}
                          </div>
                        </td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add record modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Add Payroll Record">
        <Field label="Employee"><select className="input" value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))}>{employees.filter(e=>e.status==='active').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
        <div className="grid-2" style={{gap:10}}>
          <Field label="Base Salary (NPR)"><input className="input" type="number" value={form.base_salary} onChange={e=>setForm(p=>({...p,base_salary:Number(e.target.value)}))}/></Field>
          <Field label="Working Days"><input className="input" type="number" value={form.working_days} onChange={e=>setForm(p=>({...p,working_days:Number(e.target.value)}))}/></Field>
          <Field label="Days Present"><input className="input" type="number" value={form.days_present} onChange={e=>setForm(p=>({...p,days_present:Number(e.target.value)}))}/></Field>
          <Field label="Days on Leave"><input className="input" type="number" value={form.days_on_leave} onChange={e=>setForm(p=>({...p,days_on_leave:Number(e.target.value)}))}/></Field>
          <Field label="Days Absent"><input className="input" type="number" value={form.days_absent} onChange={e=>setForm(p=>({...p,days_absent:Number(e.target.value)}))}/></Field>
          <Field label="Deductions (NPR)"><input className="input" type="number" value={form.deductions} onChange={e=>setForm(p=>({...p,deductions:Number(e.target.value)}))}/></Field>
        </div>
        <div style={{background:'var(--bg)',borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:4}}>Estimated Net Salary</div>
          <div style={{fontSize:22,fontWeight:900,color:'#10b981'}}>{NPR(form.working_days>0?Math.round(form.base_salary*(form.days_present/form.working_days))-form.deductions:0)}</div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</button>
        </div>
      </Modal>

      {/* Payslip modal */}
      {payslipModal && (() => {
        const emp = employees.find(e=>e.id===payslipModal.employee_id)
        return (
          <Modal open={true} onClose={()=>setPayslipModal(null)} title="Payslip" width={480}>
            <div style={{border:'2px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
              <div style={{background:'linear-gradient(135deg,#0f172a,#1e1b4b)',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{color:'#f1f5f9',fontWeight:900,fontSize:18}}>Rise & Shine</div>
                  <div style={{color:'#475569',fontSize:12}}>Payslip — {monthName(payslipModal.month)} {payslipModal.year}</div>
                </div>
                <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#f59e0b,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>RS</div>
              </div>
              <div style={{padding:20}}>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16,paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
                  <Avatar name={emp?.name||'?'} photo={emp?.avatar_url} size={48}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>{emp?.name}</div>
                    <div style={{color:'var(--muted)',fontSize:13}}>{emp?.department} · {emp?.role?.replace('_',' ')}</div>
                  </div>
                </div>
                {[
                  {l:'Base Salary',v:NPR(payslipModal.base_salary)},
                  {l:'Working Days',v:payslipModal.working_days},
                  {l:'Days Present',v:payslipModal.days_present},
                  {l:'Days on Leave',v:payslipModal.days_on_leave},
                  {l:'Days Absent',v:payslipModal.days_absent},
                  {l:'Deductions',v:NPR(payslipModal.deductions),neg:true},
                ].map(row=>(
                  <div key={row.l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:14}}>
                    <span style={{color:'var(--muted)'}}>{row.l}</span>
                    <span style={{fontWeight:600,color:row.neg?'#ef4444':'var(--text)'}}>{row.v}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 0',marginTop:4}}>
                  <span style={{fontWeight:800,fontSize:16,color:'var(--text)'}}>Net Salary</span>
                  <span style={{fontWeight:900,fontSize:22,color:'#10b981'}}>{NPR(payslipModal.net_salary)}</span>
                </div>
                <div style={{marginTop:14,padding:'10px 14px',background:payslipModal.is_paid?'#dcfce7':'#fef9c3',borderRadius:10,display:'flex',justifyContent:'center',fontWeight:700,fontSize:14,color:payslipModal.is_paid?'#166534':'#713f12'}}>
                  {payslipModal.is_paid?`✅ Paid on ${fmt(payslipModal.paid_at?.split('T')[0])}`:'⏳ Payment Pending'}
                </div>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

// ─── Documents ────────────────────────────────────────────────
function Documents({user, employees, toast}) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterEmp, setFilterEmp] = useState(user.role==='employee'?user.id:'all')
  const fileRef = useRef()
  const [form, setForm] = useState({employee_id:user.id, doc_type:'nid', file_name:'', file_url:''})
  const isAdmin = user.role==='admin'

  const load = async () => {
    setLoading(true)
    try {
      const data = isAdmin ? await DB.getAllDocuments() : await DB.getDocuments(user.id)
      setDocs(data||[])
    } catch(e) { toast('Failed to load documents','error') }
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 5*1024*1024) return toast('File must be under 5MB','error')
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(p=>({...p, file_name:file.name, file_url:ev.target.result, file_size:file.size}))
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!form.file_url) return toast('Please select a file','error')
    setSaving(true)
    try {
      const doc = await DB.addDocument({...form, uploaded_by:user.id, employee_id:isAdmin?form.employee_id:user.id})
      setDocs(p=>[doc,...p])
      toast('Document uploaded','success'); setModal(false)
      setForm({employee_id:user.id,doc_type:'nid',file_name:'',file_url:''})
    } catch(e) { toast('Error: '+e.message,'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await DB.deleteDocument(id); setDocs(p=>p.filter(d=>d.id!==id))
      toast('Document deleted','success')
    } catch(e) { toast('Error','error') }
  }

  const filtered = filterEmp==='all' ? docs : docs.filter(d=>d.employee_id===filterEmp)
  const docIcons = {nid:'🪪',contract:'📄',certificate:'🎓',photo_id:'🖼️',other:'📎'}

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Documents</h1><p className="page-sub">{filtered.length} file{filtered.length!==1?'s':''}</p></div>
        <button className="btn-primary" onClick={()=>setModal(true)}>+ Upload Document</button>
      </div>

      {isAdmin && (
        <div className="card" style={{padding:'12px 18px'}}>
          <select className="input" style={{width:'auto'}} value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
            <option value="all">All Employees</option>
            {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}

      {loading?<Spinner/>:!filtered.length?<Empty msg="No documents found" icon="📁" action="Upload Document" onAction={()=>setModal(true)}/>:(
        <div className="grid-3">
          {filtered.map(doc=>{
            const emp = employees.find(e=>e.id===doc.employee_id)
            return (
              <div key={doc.id} className="card" style={{display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{width:48,height:48,borderRadius:12,background:'#6366f120',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{docIcons[doc.doc_type]||'📎'}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:'var(--text)',wordBreak:'break-all'}}>{doc.file_name}</div>
                      <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{DOC_LABELS[doc.doc_type]||doc.doc_type}</div>
                    </div>
                  </div>
                  {(isAdmin||doc.uploaded_by===user.id) && (
                    <button className="icon-btn" style={{color:'#ef4444',flexShrink:0}} onClick={()=>handleDelete(doc.id)}>🗑</button>
                  )}
                </div>
                {isAdmin && emp && (
                  <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 10px',background:'var(--bg)',borderRadius:8}}>
                    <Avatar name={emp.name} size={22}/>
                    <span style={{fontSize:12,color:'var(--sub)',fontWeight:600}}>{emp.name}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'var(--muted)'}}>
                  <span>{fmt(doc.created_at?.split('T')[0])}</span>
                  {doc.file_size && <span>{(doc.file_size/1024).toFixed(0)} KB</span>}
                </div>
                <a href={doc.file_url} download={doc.file_name} className="btn-sec" style={{fontSize:13,justifyContent:'center',textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
                  ⬇ Download
                </a>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title="Upload Document">
        {isAdmin && <Field label="Employee"><select className="input" value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))}>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>}
        <Field label="Document Type"><select className="input" value={form.doc_type} onChange={e=>setForm(p=>({...p,doc_type:e.target.value}))}>{DOC_TYPES.map(t=><option key={t} value={t}>{DOC_LABELS[t]}</option>)}</select></Field>
        <Field label="File" hint="PDF, JPG, PNG — max 5MB">
          <div style={{border:'2px dashed var(--border)',borderRadius:12,padding:24,textAlign:'center',cursor:'pointer',transition:'border-color .15s'}} onClick={()=>fileRef.current.click()}>
            {form.file_name ? (
              <div><div style={{fontSize:24,marginBottom:6}}>📄</div><div style={{fontWeight:600,color:'var(--text)',fontSize:14}}>{form.file_name}</div><div style={{color:'var(--muted)',fontSize:12,marginTop:3}}>Click to replace</div></div>
            ) : (
              <div><div style={{fontSize:32,marginBottom:8}}>📁</div><div style={{fontWeight:600,color:'var(--text)'}}>Click to select file</div><div style={{color:'var(--muted)',fontSize:13,marginTop:3}}>PDF, JPG, PNG up to 5MB</div></div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={handleFileSelect}/>
        </Field>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button className="btn-sec" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleUpload} disabled={saving||!form.file_url}>{saving?'Uploading…':'Upload'}</button>
        </div>
      </Modal>
    </div>
  )
}


// ─── Performance ──────────────────────────────────────────────
function Performance({employees,tasks}) {
  const enriched = employees.map(emp=>{
    const et=tasks.filter(t=>t.assignee_id===emp.id)
    return {...emp,total:et.length,done:et.filter(t=>t.status==='completed').length,delayed:et.filter(t=>t.status==='delayed').length,inProg:et.filter(t=>t.status==='in_progress').length}
  }).sort((a,b)=>b.score-a.score)
  const best=enriched[0]
  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Performance</h1></div>
      {best&&(
        <div className="card" style={{background:'linear-gradient(135deg,#f59e0b,#f97316)',border:'none'}}>
          <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
            <div style={{fontSize:52}}>🏆</div>
            <div><div style={{color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em'}}>Employee of the Month</div><div style={{color:'#fff',fontSize:26,fontWeight:900,marginTop:2}}>{best.name}</div><div style={{color:'rgba(255,255,255,.75)',marginTop:3}}>{best.department} · {best.done} tasks completed</div></div>
            <div style={{marginLeft:'auto',textAlign:'right'}}><div style={{color:'#fff',fontSize:52,fontWeight:900,lineHeight:1}}>{best.score}%</div><div style={{color:'rgba(255,255,255,.65)',fontSize:13}}>performance score</div></div>
          </div>
        </div>
      )}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}><div className="card-title">Full Rankings</div></div>
        <table className="tbl">
          <thead><tr><th>Rank</th><th>Employee</th><th>Dept</th><th>Done</th><th>In Progress</th><th>Delayed</th><th>Score</th><th>Rating</th></tr></thead>
          <tbody>
            {enriched.map((emp,i)=>(
              <tr key={emp.id}>
                <td><span style={{fontWeight:800,fontSize:16}}>{['🥇','🥈','🥉'][i]||`#${i+1}`}</span></td>
                <td><div style={{display:'flex',alignItems:'center',gap:10}}><Avatar name={emp.name} photo={emp.avatar_url} size={34}/><div><div style={{fontWeight:600,fontSize:14,color:'var(--text)'}}>{emp.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{emp.email}</div></div></div></td>
                <td style={{fontSize:13,color:'var(--sub)'}}>{emp.department}</td>
                <td><Badge type="completed" label={String(emp.done)}/></td>
                <td><span style={{fontWeight:600,color:'#6366f1'}}>{emp.inProg}</span></td>
                <td><span style={{fontWeight:emp.delayed>0?700:400,color:emp.delayed>0?'#ef4444':'var(--muted)'}}>{emp.delayed}</span></td>
                <td><span style={{fontWeight:900,fontSize:18,color:'#6366f1'}}>{emp.score}</span></td>
                <td><div style={{display:'flex',gap:1}}>{[1,2,3,4,5].map(s=><span key={s} style={{color:s<=Math.round(emp.score/20)?'#f59e0b':'var(--border)',fontSize:16}}>★</span>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────
function NotifPanel({notifs,onMarkRead,onMarkAll,empId}) {
  const unread=notifs.filter(n=>!n.is_read).length
  const typeIcon={info:'ℹ️',warning:'⚠️',success:'✅'}
  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Notifications</h1><p className="page-sub">{unread} unread</p></div>
        {unread>0&&<button className="btn-sec" onClick={()=>onMarkAll(empId)}>Mark all read</button>}
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {!notifs.length?<Empty msg="You're all caught up!" icon="🔔"/>:notifs.map((n,i)=>(
          <div key={n.id} style={{display:'flex',gap:14,padding:'14px 20px',borderBottom:i<notifs.length-1?'1px solid var(--border)':'none',background:n.is_read?'transparent':'var(--bg)',cursor:'pointer',transition:'background .15s'}} onClick={()=>!n.is_read&&onMarkRead(n.id)}>
            <span style={{fontSize:20,flexShrink:0}}>{typeIcon[n.type]||'📌'}</span>
            <div style={{flex:1}}><div style={{fontSize:14,color:'var(--text)',fontWeight:n.is_read?400:600}}>{n.message}</div><div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{fmt(n.created_at?.split('T')[0])}</div></div>
            {!n.is_read&&<div style={{width:8,height:8,borderRadius:'50%',background:'#6366f1',flexShrink:0,marginTop:6}}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Topbar Avatar Dropdown ───────────────────────────────────
function AvatarDropdown({user, setPage, onLogout, dark, setDark}) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(()=>{
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  },[])

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button onClick={()=>setOpen(p=>!p)}
        style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px 5px 5px',borderRadius:99,border:'1.5px solid var(--border)',background:'var(--card)',cursor:'pointer',transition:'all .15s'}}>
        <Avatar name={user.name} photo={user.avatar_url} size={30}/>
        <div style={{textAlign:'left',lineHeight:1.2}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name.split(' ')[0]}</div>
          <div style={{fontSize:10,color:'var(--muted)',textTransform:'capitalize'}}>{user.role.replace('_',' ')}</div>
        </div>
        <span style={{color:'var(--muted)',fontSize:10,marginLeft:2}}>{open?'▲':'▼'}</span>
      </button>

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'var(--card)',border:'1px solid var(--border)',borderRadius:16,width:220,boxShadow:'0 16px 48px rgba(0,0,0,.16)',zIndex:200,overflow:'hidden',animation:'slideUp .18s ease'}}>
          {/* User info header */}
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'center'}}>
            <Avatar name={user.name} photo={user.avatar_url} size={40}/>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
              <div style={{fontSize:11,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
            </div>
          </div>
          {/* Menu items */}
          {[
            {icon:'👤', label:'My Profile',    action:()=>{setPage('profile');setOpen(false)}},
            {icon:'✏️', label:'Edit Profile',  action:()=>{setPage('profile');setOpen(false)}},
            {icon:'🔒', label:'Change Password',action:()=>{setPage('profile');setOpen(false)}},
          ].map(item=>(
            <button key={item.label} onClick={item.action}
              style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:14,color:'var(--sub)',fontFamily:'inherit',transition:'background .12s',textAlign:'left'}}>
              <span style={{fontSize:16}}>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{height:1,background:'var(--border)',margin:'4px 0'}}/>
          <button onClick={()=>{setDark(p=>!p);setOpen(false)}}
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:14,color:'var(--sub)',fontFamily:'inherit',transition:'background .12s'}}>
            <span style={{fontSize:16}}>{dark?'☀️':'🌙'}</span>{dark?'Light Mode':'Dark Mode'}
          </button>
          <div style={{height:1,background:'var(--border)',margin:'4px 0'}}/>
          <button onClick={onLogout}
            style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 16px',border:'none',background:'transparent',cursor:'pointer',fontSize:14,color:'#ef4444',fontFamily:'inherit',fontWeight:600}}>
            <span style={{fontSize:16}}>🚪</span>Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [dark,setDark] = useState(false)
  const [user,setUser] = useState(null)
  const [page,setPage] = useState('dashboard')
  const [sideOpen,setSideOpen] = useState(true)
  const [employees,setEmployees] = useState([])
  const [tasks,setTasks] = useState([])
  const [updates,setUpdates] = useState([])
  const [notifs,setNotifs] = useState([])
  const [loading,setLoading] = useState(false)
  const [toasts,setToasts] = useState([])

  const toast = (msg,type='info') => {
    const id=Date.now()
    setToasts(p=>[...p,{id,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500)
  }
  const removeToast = id => setToasts(p=>p.filter(t=>t.id!==id))

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [e,t,u,n] = await Promise.all([DB.getEmployees(),DB.getTasks(),DB.getUpdates(),DB.getNotifications(user.id)])
      setEmployees(e||[]); setTasks(t||[]); setUpdates(u||[]); setNotifs(n||[])
    } catch(err) { toast('Failed to load: '+err.message,'error') }
    setLoading(false)
  },[user])

  useEffect(()=>{loadAll()},[loadAll])

  const handleAddEmployee = async emp => {
    try { const d=await DB.addEmployee(emp); setEmployees(p=>[...p,d]); toast('Employee added','success') }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleEditEmployee = async (id,upd) => {
    try { const d=await DB.updateEmployee(id,upd); setEmployees(p=>p.map(e=>e.id===id?d:e)); toast('Employee updated','success') }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleDeleteEmployee = async id => {
    try { await DB.deleteEmployee(id); setEmployees(p=>p.filter(e=>e.id!==id)); toast('Employee removed','success') }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleAddTask = async task => {
    try { const d=await DB.addTask(task); setTasks(p=>[d,...p]); toast('Task created','success') }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleUpdateTask = async (id,upd) => {
    try { const d=await DB.updateTask(id,upd); setTasks(p=>p.map(t=>t.id===id?d:t)) }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleDeleteTask = async id => {
    try { await DB.deleteTask(id); setTasks(p=>p.filter(t=>t.id!==id)); toast('Task deleted','success') }
    catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleAddUpdate = async update => {
    try {
      const d=await DB.addUpdate(update)
      setUpdates(p=>{const w=p.filter(u=>!(u.employee_id===d.employee_id&&u.date===d.date));return [d,...w]})
      const empTasks=tasks.filter(t=>t.assignee_id===update.employee_id)
      const newScore=calcScore(empTasks)
      await DB.updateEmployee(update.employee_id,{score:newScore})
      setEmployees(p=>p.map(e=>e.id===update.employee_id?{...e,score:newScore}:e))
      if (user.id===update.employee_id) setUser(p=>({...p,score:newScore}))
      toast('Update submitted','success')
    } catch(e) { toast('Error: '+e.message,'error') }
  }
  const handleMarkRead = async id => { await DB.markRead(id); setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:true}:n)) }
  const handleMarkAllRead = async empId => { await DB.markAllRead(empId); setNotifs(p=>p.map(n=>({...n,is_read:true}))) }

  const unreadCount = notifs.filter(n=>!n.is_read).length

  const nav = [
    {id:'dashboard',    icon:'🏠', label:'Dashboard'},
    {id:'employees',    icon:'👥', label:'Employees'},
    {id:'tasks',        icon:'📋', label:'Tasks'},
    {id:'updates',      icon:'📝', label:'Daily Updates'},
    {id:'attendance',   icon:'⏰', label:'Attendance'},
    {id:'leaves',       icon:'🏖️', label:'Leave'},
    {id:'payroll',      icon:'💰', label:'Payroll'},
    {id:'documents',    icon:'📁', label:'Documents'},
    {id:'performance',  icon:'📊', label:'Performance'},
    {id:'notifications',icon:'🔔', label:'Notifications', badge:unreadCount},
    {id:'profile',      icon:'👤', label:'My Profile'},
  ]

  const T = {
    '--bg':   dark?'#0f0f15':'#f1f5f9',
    '--card': dark?'#1a1a26':'#ffffff',
    '--border':dark?'#2a2a3a':'#e2e8f0',
    '--text': dark?'#f1f5f9':'#0f172a',
    '--sub':  dark?'#94a3b8':'#334155',
    '--muted':dark?'#64748b':'#94a3b8',
    '--side': dark?'#111118':'#0f172a',
    '--inp':  dark?'#22222f':'#f8fafc',
  }

  if (!user) return (
    <div style={T}>
      <style>{CSS}</style>
      <LoginScreen onLogin={u=>{setUser(u);setPage('dashboard')}}/>
    </div>
  )

  return (
    <div style={{...T,minHeight:'100vh',display:'flex',fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{CSS}</style>

      {/* Sidebar */}
      <aside style={{width:sideOpen?240:68,background:'var(--side)',display:'flex',flexDirection:'column',transition:'width .22s',flexShrink:0,zIndex:10}}>
        <div style={{padding:sideOpen?'20px 18px 16px':'20px 0 16px',display:'flex',alignItems:'center',gap:10,justifyContent:sideOpen?'flex-start':'center'}}>
          <div style={{width:38,height:38,borderRadius:12,background:'linear-gradient(135deg,#f59e0b,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>☀️</div>
          {sideOpen&&<div><div style={{color:'#f1f5f9',fontWeight:900,fontSize:15,letterSpacing:'-0.02em'}}>Rise & Shine</div><div style={{color:'#475569',fontSize:11}}>Workforce</div></div>}
        </div>
        <nav style={{flex:1,padding:'4px 8px'}}>
          {nav.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)}
              style={{display:'flex',alignItems:'center',gap:11,width:'100%',padding:sideOpen?'10px 11px':'10px 0',borderRadius:10,border:'none',background:page===item.id?'#6366f120':'transparent',color:page===item.id?'#818cf8':'#64748b',cursor:'pointer',transition:'all .15s',marginBottom:2,justifyContent:sideOpen?'flex-start':'center',fontWeight:page===item.id?700:500,fontSize:14,position:'relative'}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              {sideOpen&&<span style={{flex:1,textAlign:'left'}}>{item.label}</span>}
              {item.badge>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:99,fontSize:11,fontWeight:700,padding:'1px 6px',position:sideOpen?'static':'absolute',top:6,right:6}}>{item.badge}</span>}
              {page===item.id&&sideOpen&&<div style={{width:6,height:6,borderRadius:'50%',background:'#818cf8'}}/>}
            </button>
          ))}
        </nav>
        {/* Sidebar user card */}
        <div style={{padding:'10px 8px',borderTop:'1px solid #ffffff10'}}>
          {sideOpen?(
            <button onClick={()=>setPage('profile')} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',width:'100%',border:'none',background:'transparent',cursor:'pointer',borderRadius:10,transition:'background .15s'}}>
              <Avatar name={user.name} photo={user.avatar_url} size={34}/>
              <div style={{flex:1,minWidth:0,textAlign:'left'}}>
                <div style={{color:'#e2e8f0',fontWeight:700,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.name}</div>
                <div style={{color:'#475569',fontSize:11,textTransform:'capitalize'}}>{user.role.replace('_',' ')}</div>
              </div>
              <span style={{color:'#475569',fontSize:12}}>›</span>
            </button>
          ):(
            <button className="icon-btn" style={{color:'#475569',width:'100%',justifyContent:'center'}} onClick={()=>setPage('profile')}>👤</button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Topbar */}
        <header style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'0 22px',height:62,display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          <button className="icon-btn" onClick={()=>setSideOpen(p=>!p)} style={{fontSize:20}}>☰</button>
          <div style={{flex:1,fontWeight:700,fontSize:15,color:'var(--text)'}}>
            {nav.find(n=>n.id===page)?.label||'Rise & Shine'}
          </div>
          <button className="icon-btn" onClick={loadAll} title="Refresh">🔄</button>
          {unreadCount>0&&(
            <button className="icon-btn" style={{position:'relative'}} onClick={()=>setPage('notifications')}>
              🔔
              <span style={{position:'absolute',top:3,right:3,width:8,height:8,borderRadius:'50%',background:'#ef4444',border:'2px solid var(--card)'}}/>
            </button>
          )}
          <div style={{width:1,height:26,background:'var(--border)'}}/>
          <AvatarDropdown user={user} setPage={setPage} onLogout={()=>setUser(null)} dark={dark} setDark={setDark}/>
        </header>

        {/* Pages */}
        <main style={{flex:1,overflowY:'auto',background:'var(--bg)'}}>
          {page==='dashboard'    && <Dashboard employees={employees} tasks={tasks} updates={updates} user={user}/>}
          {page==='employees'    && <Employees employees={employees} tasks={tasks} loading={loading} onAdd={handleAddEmployee} onEdit={handleEditEmployee} onDelete={handleDeleteEmployee} user={user}/>}
          {page==='tasks'        && <Tasks tasks={tasks} employees={employees} loading={loading} onAdd={handleAddTask} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} user={user}/>}
          {page==='updates'      && <DailyUpdates updates={updates} employees={employees} loading={loading} onAdd={handleAddUpdate} user={user}/>}
          {page==='attendance'   && <Attendance user={user} employees={employees} toast={toast}/>}
          {page==='leaves'       && <LeaveManagement user={user} employees={employees} toast={toast}/>}
          {page==='payroll'      && <Payroll user={user} employees={employees} toast={toast}/>}
          {page==='documents'    && <Documents user={user} employees={employees} toast={toast}/>}
          {page==='performance'  && <Performance employees={employees} tasks={tasks}/>}
          {page==='notifications'&& <NotifPanel notifs={notifs} onMarkRead={handleMarkRead} onMarkAll={handleMarkAllRead} empId={user.id}/>}
          {page==='profile'      && <ProfilePage user={user} setUser={setUser} employees={employees} setEmployees={setEmployees} tasks={tasks} updates={updates} toast={toast}/>}
        </main>
      </div>

      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',-apple-system,sans-serif;}

.page{padding:26px;display:flex;flex-direction:column;gap:18px;max-width:1400px;}
.page-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;}
.page-title{font-size:24px;font-weight:900;color:var(--text);letter-spacing:-0.03em;}
.page-sub{color:var(--muted);font-size:13px;margin-top:3px;}

.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;}
.card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.card-title{font-size:15px;font-weight:700;color:var(--text);}

.emp-card{transition:transform .15s,box-shadow .15s;cursor:default;}
.emp-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.08);}

.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}

.input{width:100%;padding:9px 13px;border:1.5px solid var(--border);border-radius:10px;background:var(--inp);color:var(--text);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color .15s;}
.input:focus{border-color:#6366f1;box-shadow:0 0 0 3px #6366f120;}
textarea.input{font-family:inherit;}
select.input{cursor:pointer;}

.btn-primary{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;border:none;background:#6366f1;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap;}
.btn-primary:hover{background:#4f46e5;box-shadow:0 4px 14px #6366f140;}
.btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;border:1.5px solid var(--border);background:transparent;color:var(--sub);font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;}
.btn-sec:hover{background:var(--bg);}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;padding:6px;border-radius:8px;border:none;background:transparent;color:var(--muted);cursor:pointer;transition:all .15s;font-size:16px;}
.icon-btn:hover{background:var(--border);}

.tbl{width:100%;border-collapse:collapse;}
.tbl th{padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border);background:var(--bg);white-space:nowrap;}
.tbl td{padding:12px 16px;border-bottom:1px solid var(--border);vertical-align:middle;}
.tbl tbody tr{transition:background .1s;}
.tbl tbody tr:hover{background:var(--bg);}
.tbl tbody tr:last-child td{border-bottom:none;}

@media(max-width:1100px){.grid-4{grid-template-columns:repeat(2,1fr);}}
@media(max-width:820px){.grid-3,.grid-2{grid-template-columns:1fr;}.page{padding:14px;}}
@media(max-width:600px){.grid-4{grid-template-columns:1fr;}}

::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px;}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes slideUp{from{transform:translateY(16px);opacity:0;}to{transform:translateY(0);opacity:1;}}
`
