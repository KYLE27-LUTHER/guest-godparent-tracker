import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const app = document.querySelector('#app');

const state = {
  guests: [],
  godparents: [],
  guestSearch: '',
  godparentSearch: '',
  guestRsvpFilter: 'All',
  attendanceFilter: 'All',
  godparentConfirmationFilter: 'All',
  godparentPaymentFilter: 'All',
  tab: 'dashboard'
};

let supabase = null;

function esc(value='') {
  return String(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function money(v) { return `₱${Number(v || 0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function notify(message, type='ok') {
  const n = document.createElement('div');
  n.className = `toast ${type}`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(()=>n.remove(), 2600);
}

function shell() {
  app.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">G</div><div><strong>Event Tracker</strong><small>Guests & Godparents</small></div></div>
      <nav>
        <button data-tab="dashboard" class="nav-btn ${state.tab==='dashboard'?'active':''}">📊 Dashboard</button>
        <button data-tab="guests" class="nav-btn ${state.tab==='guests'?'active':''}">👥 Guest List</button>
        <button data-tab="godparents" class="nav-btn ${state.tab==='godparents'?'active':''}">🎁 Godparents</button>
        <button data-tab="invitation" class="nav-btn ${state.tab==='invitation'?'active':''}">💌 Invitation Card</button>
      </nav>
      <div class="sidebar-bottom">
        <span class="cloud-dot"></span> Connected to cloud database
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div><h1>${state.tab==='dashboard'?'Dashboard':state.tab==='guests'?'Guest List':state.tab==='godparents'?'Godparent List':'Invitation Card Integration'}</h1>
        <p>Manage your event from anywhere.</p></div>
        <div class="top-actions">
          <button class="secondary" id="refreshBtn">↻ Refresh</button>
          <button class="primary" id="quickAddBtn">＋ Add ${state.tab==='godparents'?'Godparent':'Guest'}</button>
        </div>
      </header>
      <section id="content"></section>
    </main>
  </div>
  `;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab; render();});
  document.querySelector('#refreshBtn').onclick=loadData;
  document.querySelector('#quickAddBtn').onclick=()=>state.tab==='godparents'?openGodparentModal():openGuestModal();
}

function render() {
  shell();
  if (state.tab==='dashboard') renderDashboard();
  if (state.tab==='guests') renderGuests();
  if (state.tab==='godparents') renderGodparents();
  if (state.tab==='invitation') renderInvitation();
}

function renderDashboard() {
  const guestInvited = state.guests.reduce((s,g)=>s+Number(g.invited_count||1),0);
  const attending = state.guests.filter(g=>g.rsvp==='Attending').reduce((s,g)=>s+Number(g.invited_count||1),0);
  const attended = state.guests.filter(g=>g.attendance==='Attended').reduce((s,g)=>s+Number(g.invited_count||1),0);
  const gpConfirmed = state.godparents.filter(g=>g.confirmation==='Confirmed').length;
  const paid = state.godparents.filter(g=>g.payment_status==='Paid').length;
  const partial = state.godparents.filter(g=>g.payment_status==='Partial').length;
  const paymentTotal = state.godparents.reduce((s,g)=>s+Number(g.payment_amount||0),0);

  document.querySelector('#content').innerHTML = `
    <div class="cards">
      <div class="stat"><span>Total guest records</span><strong>${state.guests.length}</strong><small>${guestInvited} invited seats</small></div>
      <div class="stat"><span>Expected attendance</span><strong>${attending}</strong><small>${guestInvited?Math.round(attending/guestInvited*100):0}% of invited seats</small></div>
      <div class="stat"><span>Actual attendance</span><strong>${attended}</strong><small>${guestInvited?Math.round(attended/guestInvited*100):0}% of invited seats</small></div>
      <div class="stat"><span>Godparents</span><strong>${state.godparents.length}</strong><small>${gpConfirmed} confirmed</small></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Guest status</h2><button class="link-btn" data-tab="guests">Open list →</button></div>
        ${bar('Attending', attending, guestInvited)}
        ${bar('Pending', state.guests.filter(g=>g.rsvp==='Pending').reduce((s,g)=>s+Number(g.invited_count||1),0), guestInvited)}
        ${bar('Declined', state.guests.filter(g=>g.rsvp==='Declined').reduce((s,g)=>s+Number(g.invited_count||1),0), guestInvited)}
        ${bar('Attended', attended, guestInvited)}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Godparent confirmation & payments</h2><button class="link-btn" data-tab="godparents">Open list →</button></div>
        <div class="mini-grid">
          <div><b>${gpConfirmed}</b><span>Confirmed</span></div>
          <div><b>${state.godparents.filter(g=>g.confirmation==='Pending').length}</b><span>Pending</span></div>
          <div><b>${paid}</b><span>Paid</span></div>
          <div><b>${partial}</b><span>Partial</span></div>
        </div>
        <div class="payment-total">Tracked payments: <strong>${money(paymentTotal)}</strong></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Quick actions</h2></div>
      <div class="quick-actions">
        <button class="action-card" id="addGuestCard">＋ Add guest</button>
        <button class="action-card" id="addGpCard">＋ Add godparent</button>
        <button class="action-card" id="exportAll">⇩ Export all data</button>
        <button class="action-card" id="printAll">🖨 Print summary</button>
      </div>
    </div>
  `;
  document.querySelector('#addGuestCard').onclick=openGuestModal;
  document.querySelector('#addGpCard').onclick=openGodparentModal;
  document.querySelector('#exportAll').onclick=()=>{exportCSV('guests',state.guests); exportCSV('godparents',state.godparents);};
  document.querySelector('#printAll').onclick=()=>window.print();
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();});
}
function bar(label,val,total) {
  const pct=total?Math.min(100,Math.round(val/total*100)):0;
  return `<div class="bar-row"><div><span>${label}</span><b>${val}</b></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

function renderGuests() {
  const filtered=state.guests.filter(g=>{
    const q=state.guestSearch.toLowerCase();
    return (!q || `${g.guest_name} ${g.family_name} ${g.phone} ${g.email}`.toLowerCase().includes(q))
      && (state.guestRsvpFilter==='All'||g.rsvp===state.guestRsvpFilter)
      && (state.attendanceFilter==='All'||g.attendance===state.attendanceFilter);
  });
  const invited=filtered.reduce((s,g)=>s+Number(g.invited_count||1),0);
  document.querySelector('#content').innerHTML=`
    <div class="toolbar">
      <input id="guestSearch" placeholder="Search name, family, phone..." value="${esc(state.guestSearch)}">
      <select id="guestRsvp"><option>All</option><option>Pending</option><option>Attending</option><option>Declined</option></select>
      <select id="attendance"><option>All</option><option>Not checked</option><option>Attended</option><option>Absent</option></select>
      <button class="secondary" id="exportGuests">⇩ Excel/CSV</button>
      <button class="secondary" id="printGuests">🖨 Print</button>
    </div>
    <div class="summary-strip"><b>${filtered.length}</b> guest records <span>•</span> <b>${invited}</b> invited seats</div>
    <div class="table-wrap"><table><thead><tr><th>Guest</th><th>Family</th><th>Seats</th><th>RSVP</th><th>Attendance</th><th>Contact</th><th></th></tr></thead>
    <tbody>${filtered.map(g=>`<tr>
      <td><strong>${esc(g.guest_name)}</strong><small>${esc(g.notes)}</small></td><td>${esc(g.family_name)}</td><td>${g.invited_count}</td>
      <td><span class="pill ${g.rsvp.toLowerCase()}">${g.rsvp}</span></td>
      <td><select class="inline-select attendance-edit" data-id="${g.id}">${['Not checked','Attended','Absent'].map(x=>`<option ${x===g.attendance?'selected':''}>${x}</option>`).join('')}</select></td>
      <td><small>${esc(g.phone)}<br>${esc(g.email)}</small></td>
      <td class="row-actions"><button class="icon edit-g" data-id="${g.id}">✎</button><button class="icon delete-g" data-id="${g.id}">🗑</button></td>
    </tr>`).join('') || `<tr><td colspan="7" class="empty">No guests found.</td></tr>`}</tbody></table></div>
  `;
  document.querySelector('#guestSearch').oninput=e=>{state.guestSearch=e.target.value;renderGuests();};
  document.querySelector('#guestRsvp').value=state.guestRsvpFilter;
  document.querySelector('#attendance').value=state.attendanceFilter;
  document.querySelector('#guestRsvp').onchange=e=>{state.guestRsvpFilter=e.target.value;renderGuests();};
  document.querySelector('#attendance').onchange=e=>{state.attendanceFilter=e.target.value;renderGuests();};
  document.querySelector('#exportGuests').onclick=()=>exportCSV('guests',state.guests);
  document.querySelector('#printGuests').onclick=()=>window.print();
  document.querySelectorAll('.edit-g').forEach(b=>b.onclick=()=>openGuestModal(state.guests.find(x=>String(x.id)===b.dataset.id)));
  document.querySelectorAll('.delete-g').forEach(b=>b.onclick=()=>deleteRecord('guests',b.dataset.id));
  document.querySelectorAll('.attendance-edit').forEach(s=>s.onchange=()=>updateRecord('guests',s.dataset.id,{attendance:s.value}));
}

function renderGodparents() {
  const filtered=state.godparents.filter(g=>{
    const q=state.godparentSearch.toLowerCase();
    return (!q || `${g.name} ${g.role} ${g.phone} ${g.notes}`.toLowerCase().includes(q))
      && (state.godparentConfirmationFilter==='All'||g.confirmation===state.godparentConfirmationFilter)
      && (state.godparentPaymentFilter==='All'||g.payment_status===state.godparentPaymentFilter);
  });
  document.querySelector('#content').innerHTML=`
    <div class="toolbar">
      <input id="gpSearch" placeholder="Search godparent..." value="${esc(state.godparentSearch)}">
      <select id="gpConfirm"><option>All</option><option>Pending</option><option>Confirmed</option><option>Declined</option></select>
      <select id="gpPayment"><option>All</option><option>Unpaid</option><option>Partial</option><option>Paid</option><option>Not required</option></select>
      <button class="secondary" id="exportGp">⇩ Excel/CSV</button>
      <button class="secondary" id="printGp">🖨 Print</button>
    </div>
    <div class="summary-strip"><b>${filtered.length}</b> godparents <span>•</span> <b>${filtered.filter(g=>g.confirmation==='Confirmed').length}</b> confirmed <span>•</span> <b>${money(filtered.reduce((s,g)=>s+Number(g.payment_amount||0),0))}</b> tracked payments</div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Confirmation</th><th>Payment</th><th>Amount</th><th>Contact</th><th></th></tr></thead>
    <tbody>${filtered.map(g=>`<tr>
      <td><strong>${esc(g.name)}</strong><small>${esc(g.notes)}</small></td><td>${esc(g.role)}</td>
      <td><span class="pill ${g.confirmation.toLowerCase()}">${g.confirmation}</span></td>
      <td><span class="pill ${g.payment_status.toLowerCase().replace(' ','-')}">${g.payment_status}</span></td>
      <td>${money(g.payment_amount)}</td><td><small>${esc(g.phone)}</small></td>
      <td class="row-actions"><button class="icon edit-p" data-id="${g.id}">✎</button><button class="icon delete-p" data-id="${g.id}">🗑</button></td>
    </tr>`).join('') || `<tr><td colspan="7" class="empty">No godparents found.</td></tr>`}</tbody></table></div>
  `;
  document.querySelector('#gpSearch').oninput=e=>{state.godparentSearch=e.target.value;renderGodparents();};
  document.querySelector('#gpConfirm').value=state.godparentConfirmationFilter;
  document.querySelector('#gpPayment').value=state.godparentPaymentFilter;
  document.querySelector('#gpConfirm').onchange=e=>{state.godparentConfirmationFilter=e.target.value;renderGodparents();};
  document.querySelector('#gpPayment').onchange=e=>{state.godparentPaymentFilter=e.target.value;renderGodparents();};
  document.querySelector('#exportGp').onclick=()=>exportCSV('godparents',state.godparents);
  document.querySelector('#printGp').onclick=()=>window.print();
  document.querySelectorAll('.edit-p').forEach(b=>b.onclick=()=>openGodparentModal(state.godparents.find(x=>String(x.id)===b.dataset.id)));
  document.querySelectorAll('.delete-p').forEach(b=>b.onclick=()=>deleteRecord('godparents',b.dataset.id));
}

function renderInvitation() {
  document.querySelector('#content').innerHTML=`
    <div class="panel invitation-panel">
      <h2>Invitation-card integration</h2>
      <p>This tracker is ready to share the same Supabase database with your invitation-card app.</p>
      <div class="integration-grid">
        <div><b>Guest headcount</b><span id="inviteGuestCount">${state.guests.reduce((s,g)=>s+Number(g.invited_count||1),0)}</span></div>
        <div><b>Godparent headcount</b><span>${state.godparents.length}</span></div>
        <div><b>Confirmed godparents</b><span>${state.godparents.filter(g=>g.confirmation==='Confirmed').length}</span></div>
      </div>
      <div class="notice">For your existing invitation-card project, use the same Supabase project URL and anon key, then query the <code>guests</code> and <code>godparents</code> tables. The invitation editor can therefore show the live final guest/godparent counts.</div>
      <h3>Suggested integration fields</h3>
      <ul><li>Final guest headcount = sum of <code>invited_count</code> for guests.</li><li>Final godparent list = all godparents, with optional filter for confirmed only.</li><li>Invitation card can display the final godparent list automatically.</li></ul>
    </div>
  `;
}

function modal(title, body, onSave) {
  const wrap=document.createElement('div'); wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="icon close">×</button></div><form id="modalForm">${body}<div class="modal-actions"><button type="button" class="secondary close">Cancel</button><button class="primary" type="submit">Save</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.querySelectorAll('.close').forEach(x=>x.onclick=()=>wrap.remove());
  wrap.querySelector('#modalForm').onsubmit=async e=>{e.preventDefault(); await onSave(new FormData(e.target)); wrap.remove();};
}
function openGuestModal(g=null) {
  const x=g||{family_name:'',guest_name:'',phone:'',email:'',invited_count:1,rsvp:'Pending',attendance:'Not checked',notes:''};
  modal(g?'Edit Guest':'Add Guest',`
    <div class="form-grid"><label>Guest name*<input name="guest_name" required value="${esc(x.guest_name)}"></label>
    <label>Family name<input name="family_name" value="${esc(x.family_name)}"></label>
    <label>Number of guests/seats*<input type="number" min="1" name="invited_count" required value="${x.invited_count}"></label>
    <label>Phone<input name="phone" value="${esc(x.phone)}"></label><label>Email<input name="email" type="email" value="${esc(x.email)}"></label>
    <label>RSVP<select name="rsvp">${['Pending','Attending','Declined'].map(v=>`<option ${v===x.rsvp?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Attendance<select name="attendance">${['Not checked','Attended','Absent'].map(v=>`<option ${v===x.attendance?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="wide">Notes<textarea name="notes">${esc(x.notes)}</textarea></label></div>
  `, async fd=>{
    const data=Object.fromEntries(fd.entries()); data.invited_count=Number(data.invited_count);
    if(g) await updateRecord('guests',g.id,data); else await insertRecord('guests',data);
  });
}
function openGodparentModal(g=null) {
  const x=g||{name:'',role:'',phone:'',confirmation:'Pending',payment_status:'Unpaid',payment_amount:0,notes:''};
  modal(g?'Edit Godparent':'Add Godparent',`
    <div class="form-grid"><label>Name*<input name="name" required value="${esc(x.name)}"></label><label>Role<input name="role" value="${esc(x.role)}" placeholder="Ninong / Ninang"></label>
    <label>Phone<input name="phone" value="${esc(x.phone)}"></label>
    <label>Confirmation<select name="confirmation">${['Pending','Confirmed','Declined'].map(v=>`<option ${v===x.confirmation?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Payment status<select name="payment_status">${['Unpaid','Partial','Paid','Not required'].map(v=>`<option ${v===x.payment_status?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Payment amount<input name="payment_amount" type="number" min="0" step="0.01" value="${x.payment_amount}"></label>
    <label class="wide">Notes<textarea name="notes">${esc(x.notes)}</textarea></label></div>
  `, async fd=>{
    const data=Object.fromEntries(fd.entries()); data.payment_amount=Number(data.payment_amount||0);
    if(g) await updateRecord('godparents',g.id,data); else await insertRecord('godparents',data);
  });
}

async function loadData() {
  if(!supabase){renderOffline();return;}
  const [{data:guests,error:gerr},{data:godparents,error:perr}]=await Promise.all([
    supabase.from('guests').select('*').order('family_name').order('guest_name'),
    supabase.from('godparents').select('*').order('name')
  ]);
  if(gerr||perr){console.error(gerr||perr); notify('Database error. Check Supabase setup.','error'); return;}
  state.guests=guests||[]; state.godparents=godparents||[]; render();
}
async function insertRecord(table,data){const {error}=await supabase.from(table).insert(data); if(error){notify(error.message,'error');return;} notify('Saved'); await loadData();}
async function updateRecord(table,id,data){const {error}=await supabase.from(table).update(data).eq('id',id); if(error){notify(error.message,'error');return;} notify('Updated'); await loadData();}
async function deleteRecord(table,id){if(!confirm('Delete this record?'))return; const {error}=await supabase.from(table).delete().eq('id',id); if(error){notify(error.message,'error');return;} notify('Deleted'); await loadData();}

function exportCSV(name,rows) {
  if(!rows.length){notify('Nothing to export','error');return;}
  const cols=Object.keys(rows[0]);
  const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(','))].join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=`${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
function renderOffline(){app.innerHTML=`<div class="setup"><h1>Guest & Godparent Tracker</h1><p>Add your Supabase environment variables, then run <code>npm install</code> and <code>npm run dev</code>.</p></div>`;}

async function start(){
  if(supabaseUrl && supabaseAnonKey) {
    supabase=createClient(supabaseUrl,supabaseAnonKey);
    await loadData();
  } else renderOffline();
}
start();
