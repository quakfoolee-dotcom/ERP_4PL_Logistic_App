import { useState } from "react";
import { Building2, DollarSign, Bell, Users, Save, Edit2, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useActionDialog } from "./ActionDialog";

interface RateRow { zone:string; codes:string; rate:number; editing:boolean; }
interface UserRow { name:string; email:string; role:string; status:"active"|"inactive"; }
interface NotifSetting { id:string; label:string; labelEn:string; enabled:boolean; }

const initRates: RateRow[] = [
  {zone:"YYZ Series (Toronto)", codes:"YYZ4 · YYZ7 · YYZ9", rate:35, editing:false},
  {zone:"YOO1 Oakville",        codes:"YOO1",               rate:40, editing:false},
  {zone:"YHM1 Hamilton",        codes:"YHM1",               rate:40, editing:false},
  {zone:"YXU1 London",          codes:"YXU1",               rate:50, editing:false},
  {zone:"YGK1 Kingston",        codes:"YGK1",               rate:50, editing:false},
  {zone:"YOW Ottawa (per P)",   codes:"YOW1 · YOW3",        rate:80, editing:false},
];
const initUsers: UserRow[] = [
  {name:"Ops Team (Admin)",  email:"ops@fengtu.ca",      role:"Administrator", status:"active"},
  {name:"Dispatch Coord.",   email:"dispatch@fengtu.ca", role:"Dispatcher",    status:"active"},
  {name:"Finance Manager",   email:"finance@fengtu.ca",  role:"Finance",       status:"active"},
  {name:"Driver AF",         email:"af@driver.ca",       role:"Driver",        status:"active"},
  {name:"Driver LH",         email:"lh@driver.ca",       role:"Driver",        status:"inactive"},
];
const initNotifs: NotifSetting[] = [
  {id:"n1", label:"拒收 POD 告警",        labelEn:"Rejected POD alert",           enabled:true},
  {id:"n2", label:"发票逾期提醒",          labelEn:"Overdue invoice reminder",      enabled:true},
  {id:"n3", label:"新柜到仓通知",          labelEn:"New container arrival",         enabled:true},
  {id:"n4", label:"司机证件即将到期",       labelEn:"Driver document expiry warning",enabled:true},
  {id:"n5", label:"仓库占用率超90%",       labelEn:"Warehouse utilization >90%",    enabled:false},
  {id:"n6", label:"司机位置更新",          labelEn:"Driver location update",        enabled:false},
  {id:"n7", label:"每日运营报告",          labelEn:"Daily operations digest email", enabled:true},
];

const card: React.CSSProperties = {background:"var(--card)",borderRadius:12,border:"1px solid var(--border)",boxShadow:"0 1px 4px rgba(0,0,0,.04)"};
const inputStyle: React.CSSProperties = {width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--input-background)",color:"var(--foreground)",fontSize:13};
const th: React.CSSProperties = {background:"var(--muted)",fontSize:11,fontWeight:600,padding:"8px 12px",textAlign:"left",color:"var(--muted-foreground)"};
const td: React.CSSProperties = {padding:"10px 12px",fontSize:12,borderBottom:"1px solid var(--border)"};
const label: React.CSSProperties = {fontSize:11,fontWeight:600,color:"var(--muted-foreground)",display:"block",marginBottom:6};

export function SettingsView() {
  const { promptDialog, confirmDialog, ActionDialog } = useActionDialog();
  const [company, setCompany] = useState({name:"枫途物流 Canada",address:"10 Whybank Dr, Brampton, ON L7A 1B6",phone:"(905) 555-0192",email:"ops@fengtu.ca",hst:"12345-6789 RT 0001",currency:"CAD"});
  const [rates, setRates]     = useState<RateRow[]>(initRates);
  const [notifs, setNotifs]   = useState<NotifSetting[]>(initNotifs);
  const [users, setUsers]     = useState<UserRow[]>(initUsers);
  const [editedRate, setEditedRate] = useState<Record<number,number>>({});
  const [dirty, setDirty]     = useState(false);

  function setField(k: keyof typeof company, v: string) { setCompany(p=>({...p,[k]:v})); setDirty(true); }
  function saveCompany() { setDirty(false); toast.success("Company settings saved ✓"); }

  function startEditRate(i: number) {
    setRates(p=>p.map((r,idx)=>({...r,editing:idx===i})));
    setEditedRate({[i]:rates[i].rate});
  }
  function saveRate(i: number) {
    const newRate = editedRate[i]??rates[i].rate;
    setRates(p=>p.map((r,idx)=>idx===i?{...r,rate:newRate,editing:false}:r));
    toast.success(`Rate updated: ${rates[i].zone} → CAD $${newRate}/P`);
  }

  function toggleNotif(id: string) {
    setNotifs(p=>p.map(n=>n.id===id?{...n,enabled:!n.enabled}:n));
    const n = notifs.find(n=>n.id===id);
    toast.info(n ? `${n.labelEn} ${n.enabled?"disabled":"enabled"}` : "");
  }
  function toggleUser(i: number) {
    setUsers(p=>p.map((u,idx)=>idx===i?{...u,status:u.status==="active"?"inactive":"active"}:u));
    toast.info(`User ${users[i].name} ${users[i].status==="active"?"deactivated":"activated"}`);
  }
  async function addUser() {
    const name = await promptDialog("Add User", { message: "Full name" });
    if (!name) return;
    const email = await promptDialog("User Email", { message: "Email address" });
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email address");
      return;
    }
    const role = await promptDialog("User Role", { message: "Role (e.g. Dispatcher)", defaultValue: "Viewer" }) || "Viewer";
    setUsers(p=>[...p,{name,email,role,status:"active"}]);
    toast.success("User added");
  }
  async function removeUser(i: number) {
    const ok = await confirmDialog("Remove User", { message: `Remove ${users[i].name}?` });
    if (!ok) return;
    setUsers(p=>p.filter((_,idx)=>idx!==i));
    toast.success("User removed");
  }

  return (
    <div className="flex-1 overflow-auto p-5" style={{background:"var(--background)"}}>
      <ActionDialog />
      <div className="grid gap-5" style={{gridTemplateColumns:"1fr 1fr"}}>

        {/* Company Info */}
        <div style={{...card,padding:20}}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} style={{color:"var(--primary)"}}/>
            <div><div style={{fontWeight:700,fontSize:14}}>公司信息 Company Info</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>Edit and save to update</div></div>
          </div>
          <div className="space-y-3">
            {([["name","公司名称 Company Name"],["address","地址 Address"],["phone","电话 Phone"],["email","Email"],["hst","HST # (Canada)"],["currency","Currency"]] as [keyof typeof company, string][]).map(([k,lbl])=>(
              <div key={k}>
                <label style={label}>{lbl}</label>
                <input value={company[k]} onChange={e=>setField(k,e.target.value)} style={inputStyle}/>
              </div>
            ))}
          </div>
          <button onClick={saveCompany} className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full justify-center"
            style={{background:dirty?"var(--primary)":"#d1fae5",color:dirty?"white":"#047857",border:"none",cursor:"pointer",transition:"all .2s"}}>
            {dirty?<><Save size={14}/> Save Changes</>:<><Check size={14}/> Saved</>}
          </button>
        </div>

        {/* Notifications */}
        <div style={{...card,padding:20}}>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} style={{color:"var(--primary)"}}/>
            <div><div style={{fontWeight:700,fontSize:14}}>通知设置 Notifications</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>Toggle to enable/disable alerts</div></div>
          </div>
          <div className="space-y-1">
            {notifs.map(n=>(
              <div key={n.id} onClick={()=>toggleNotif(n.id)} className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{n.label}</div>
                  <div style={{fontSize:11,color:"var(--muted-foreground)"}}>{n.labelEn}</div>
                </div>
                {/* Toggle */}
                <div style={{width:40,height:22,borderRadius:11,background:n.enabled?"var(--primary)":"var(--muted)",position:"relative",transition:"background .2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:2,left:n.enabled?19:2,width:18,height:18,borderRadius:"50%",background:"white",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>toast.success("Notification preferences saved")} className="mt-3 w-full py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" style={{background:"var(--primary)",color:"white",border:"none",cursor:"pointer"}}>
            Save Notification Settings
          </button>
        </div>

        {/* Rate Card */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div className="flex items-center gap-2" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
            <DollarSign size={16} style={{color:"var(--primary)"}}/>
            <div><div style={{fontWeight:700,fontSize:14}}>费率设置 Rate Card</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>Click Edit to modify a rate, Save to commit</div></div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Zone","FC Codes","Rate CAD/P",""].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rates.map((r,i)=>(
                <tr key={i} style={{background:"var(--card)"}} className="hover:bg-muted/30 transition-colors">
                  <td style={{...td,fontWeight:600}}>{r.zone}</td>
                  <td style={{...td,fontFamily:"monospace",fontSize:11,color:"var(--muted-foreground)"}}>{r.codes}</td>
                  <td style={td}>
                    {r.editing
                      ? <input type="number" value={editedRate[i]??r.rate} onChange={e=>setEditedRate(p=>({...p,[i]:Number(e.target.value)}))}
                          style={{width:80,padding:"4px 8px",borderRadius:6,border:"1px solid var(--primary)",fontFamily:"monospace",fontWeight:700,fontSize:14,color:"var(--primary)"}} autoFocus/>
                      : <span style={{fontFamily:"monospace",fontWeight:700,fontSize:15,color:"var(--primary)"}}>${r.rate}</span>}
                  </td>
                  <td style={td}>
                    {r.editing
                      ? <button onClick={()=>saveRate(i)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,border:"none",background:"#10B981",color:"white",cursor:"pointer",fontWeight:700}}>Save</button>
                      : <button onClick={()=>startEditRate(i)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",color:"var(--muted-foreground)"}}><Edit2 size={11}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User Management */}
        <div style={{...card,padding:0,overflow:"hidden"}}>
          <div className="flex items-center justify-between" style={{padding:"12px 16px",borderBottom:"1px solid var(--border)"}}>
            <div className="flex items-center gap-2">
              <Users size={16} style={{color:"var(--primary)"}}/>
              <div><div style={{fontWeight:700,fontSize:14}}>用户管理 Users</div><div style={{fontSize:11,color:"var(--muted-foreground)"}}>Manage access and roles</div></div>
            </div>
            <button onClick={addUser} className="flex items-center gap-1" style={{padding:"4px 12px",borderRadius:6,fontSize:11,border:"none",background:"var(--primary)",color:"white",cursor:"pointer",fontWeight:600}}>
              <Plus size={12}/> Add User
            </button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Name","Email","Role","Status",""].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={i} style={{background:"var(--card)",opacity:u.status==="inactive"?.6:1}} className="hover:bg-muted/30 transition-colors">
                  <td style={{...td,fontWeight:600}}>{u.name}</td>
                  <td style={{...td,fontSize:11,color:"var(--muted-foreground)"}}>{u.email}</td>
                  <td style={td}><span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"var(--muted)",fontWeight:500}}>{u.role}</span></td>
                  <td style={td}>
                    <button onClick={()=>toggleUser(i)} style={{padding:"2px 8px",borderRadius:999,fontSize:11,border:"none",cursor:"pointer",fontWeight:600,background:u.status==="active"?"#d1fae5":"#f3f4f6",color:u.status==="active"?"#047857":"#6b7280"}}>
                      {u.status==="active"?"Active":"Inactive"}
                    </button>
                  </td>
                  <td style={td}>
                    {i>0&&<button onClick={()=>removeUser(i)} style={{border:"none",background:"none",cursor:"pointer",color:"#b91c1c",padding:"2px 4px"}}><Trash2 size={13}/></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
