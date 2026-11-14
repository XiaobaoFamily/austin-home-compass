import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './client';
import { signInWithUsername, USERNAME_PATTERN } from './auth';
import { monthlyCost, parseBackup } from './domain.mjs';
import './style.css';
type Listing = {id:string;address:string;url:string;zip:string;price:number;beds:number;status:string;note:string};
type Metric = {source:string;region:string;period:string;metric:string;value:number;property_type:string};
const statuses = ['待研究','值得看','已看房','考虑出价','放弃'];
const money = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function App(){
 const activeUser = useRef<string|null>(null);
 const [tab,setTab] = useState('总览'), [user,setUser] = useState<string|null>(null), [username,setUsername] = useState(''), [password,setPassword] = useState('');
 const [listings,setListings] = useState<Listing[]>([]), [metrics,setMetrics] = useState<Metric[]>([]), [message,setMessage] = useState(''), [busy,setBusy] = useState(false), [online,setOnline] = useState(navigator.onLine);
 const [calc,setCalc] = useState({price:650000,down:20,rate:6.5,years:30,tax:12000,insurance:3000,hoa:60,maintenance:1});
 const [draft,setDraft] = useState({address:'',url:'',zip:'',price:'',beds:'4',note:''});
 const [campus,setCampus] = useState('Apple Austin campus');
 useEffect(()=>{
  const on=()=>setOnline(navigator.onLine);window.addEventListener('online',on);window.addEventListener('offline',on);
  if(!supabase) return ()=>{window.removeEventListener('online',on);window.removeEventListener('offline',on)};
  const {data} = supabase.auth.onAuthStateChange((_event,session)=>{
   const nextUserId = session?.user.id ?? null;
   if(activeUser.current!==nextUserId) {
    setListings([]);setMetrics([]);
    setDraft({address:'',url:'',zip:'',price:'',beds:'4',note:''});
    setPassword('');setMessage('');
   }
   activeUser.current=nextUserId;setUser(nextUserId);
  });
  return ()=>{data.subscription.unsubscribe();window.removeEventListener('online',on);window.removeEventListener('offline',on)};
 },[]);
 useEffect(()=>{if(user) void refresh()},[user]);
 async function refresh(){if(!supabase||!user)return;setBusy(true);try{
  const [a,b]=await Promise.all([supabase.from('listings').select('*').order('created_at',{ascending:false}),supabase.from('market_metrics').select('source,region,period,metric,value,property_type').order('period',{ascending:false}).limit(100)]);
  if(activeUser.current!==user)return;if(a.error)throw a.error;if(b.error)throw b.error;setListings(a.data as Listing[]);setMetrics(b.data as Metric[]);setMessage('已同步云端记录。');
 }catch(e){if(activeUser.current===user)setMessage(String(e))}finally{setBusy(false)}}
 async function login(e:React.FormEvent){
  e.preventDefault();if(!supabase||busy)return;setBusy(true);
  try {
   const {error}=await signInWithUsername(supabase.auth,username,password);
   if(error){setMessage(error.code==='invalid_credentials'?'用户名或密码错误。':'登录失败，请检查连接或稍后重试。');return;}
   setUsername(username.trim().toLowerCase());setPassword('');setMessage('已登录。');
  } catch(error) {
   setMessage(error instanceof Error && error.message.startsWith('用户名需为')?error.message:'登录失败，请检查连接或稍后重试。');
  } finally {setBusy(false)}
 }
 async function saveListing(e:React.FormEvent){e.preventDefault();if(!supabase||!user)return;setBusy(true);try{
  const entry:Listing={id:crypto.randomUUID(),address:draft.address.trim(),url:draft.url.trim(),zip:draft.zip,price:Number(draft.price),beds:Number(draft.beds),note:draft.note,status:'待研究'};
  parseBackup(JSON.stringify({version:1,listings:[entry]}));
  const {error}=await supabase.from('listings').insert({...entry,user_id:user});if(error)throw error;
  setDraft({address:'',url:'',zip:'',price:'',beds:'4',note:''});await refresh();
 }catch(e){setMessage(String(e))}finally{setBusy(false)}}
 async function updateStatus(item:Listing,status:string){if(!supabase)return;const {error}=await supabase.from('listings').update({status}).eq('id',item.id);if(error)setMessage(error.message);else setListings(xs=>xs.map(x=>x.id===item.id?{...x,status}:x))}
 async function remove(item:Listing){if(!supabase||!window.confirm(`删除 ${item.address}？此操作可通过已有备份恢复。`))return;const {error}=await supabase.from('listings').delete().eq('id',item.id);if(error)setMessage(error.message);else setListings(xs=>xs.filter(x=>x.id!==item.id))}
 function backup(){const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),listings},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='home-compass-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 async function restore(file?:File){if(!file||!supabase||!user)return;setBusy(true);try{if(file.size>2_000_000)throw new Error('备份不能超过 2MB');const rows=parseBackup(await file.text()) as Listing[];if(!window.confirm(`导入 ${rows.length} 套房源？相同 ID 的记录会更新，其他记录保留。`))return;
  // Existing IDs must belong to this user. RLS rejects attempts to overwrite someone else's row.
  if(rows.length){const {error}=await supabase.from('listings').upsert(rows.map(row=>({...row,user_id:user})));if(error)throw error}await refresh();
 }catch(e){setMessage(String(e))}finally{setBusy(false)}}
 const cost=monthlyCost(calc.price,calc.down,calc.rate,calc.years,calc.tax,calc.insurance,calc.hoa,calc.maintenance);
 return <div className="app"><aside><a className="brand" href="#"><span className="brand-icon">⌂</span><span>Home Compass<small>AUSTIN · 私人购房决策台</small></span></a><p className="side-label">你的下一处归属</p><nav>{['总览','区域观察','我的房源','成本计算','设置'].map((name,i)=><button className={tab===name?'active':''} key={name} onClick={()=>setTab(name)}><span>{['◫','◎','⌂','▤','⚙'][i]}</span>{name}</button>)}</nav><div className="side-foot"><span className="dot"/>North Austin / Cedar Park / Round Rock<p>Single-family · 4+ bedrooms</p></div></aside><main><header><span>PERSONAL HOME BUYING WORKSPACE</span><span className="pill">{online?'在线':'离线 · 云端操作暂不可用'}</span></header><section className="heading"><div><p className="eyebrow">A LITTLE CLARITY, BEFORE A BIG DECISION.</p><h1>{tab==='总览'?'把下一步，看得更清楚。':tab}</h1><p>从市场背景，到一套真正适合你的家。</p></div><button onClick={()=>setTab('我的房源')} className="primary">＋ 添加候选房源</button></section>
 {message&&<div className="notice" role="status">{message}<button aria-label="关闭消息" onClick={()=>setMessage('')}>×</button></div>}
 {!supabase&&<div className="notice">尚未连接 Supabase。当前为项目预览，无真实市场数据；配置完成后可登录并同步私人记录。</div>}
 {!user&&<form className="login card" onSubmit={login}><div><h2>进入你的私人工作台</h2><p>使用已授权的用户名和密码登录。</p></div><label>用户名<input type="text" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required minLength={3} maxLength={32} pattern={USERNAME_PATTERN} title="3–32 位英文字母、数字、下划线或短横线，以字母或数字开头" aria-describedby="username-help" value={username} onChange={e=>setUsername(e.target.value)}/><small id="username-help">3–32 位字母、数字、下划线或短横线</small></label><label>密码<input type="password" name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={!supabase||busy||!online} className="primary">{busy?'登录中…':'登录'}</button></form>}
 {tab==='总览'&&<><div className="stats"><article className="card"><p>市场数据</p><strong>{metrics.length?'已连接':'等待接入'}</strong><small>{metrics.length?'最近 100 条指标预览':'公开数据采集尚未启用'}</small></article><article className="card"><p>私人候选房源</p><strong>{listings.length.toString().padStart(2,'0')}</strong><small>至少四房 · 独栋住宅</small></article><article className="card"><p>值得安排看房</p><strong>{listings.filter(x=>x.status==='值得看').length.toString().padStart(2,'0')}</strong><small>由你的研究与核实决定</small></article></div><div className="grid"><article className="card feature"><p className="eyebrow">YOUR NEXT MOVE</p><h2>先锁定生活，再判断价格。</h2><p>目前没有足够数据判断买入时机。先明确月度成本上限和通勤要求，再建立你的房源候选池。</p><button className="primary" onClick={()=>setTab('成本计算')}>试算购房成本 ↗</button><div className="feature-bottom">01 预算与通勤　 /　 02 区域观察　 /　 03 实地看房</div></article><article className="card"><p className="eyebrow">BUYER'S NOTEBOOK</p><h2>这周可以做的三件事</h2><ol className="tasks"><li>确定 Apple 园区的准确通勤入口</li><li>保存 3–5 套符合四房要求的候选房源</li><li>核实税费、保险和挂牌历史</li></ol><button onClick={()=>setTab('设置')}>设置你的通勤锚点 →</button></article></div><article className="card sources"><h2>证据有来源，判断有边界。</h2><p>Zillow：长期价格背景　 ·　 Redfin：供需与成交　 ·　 Unlock MLS：本地月报</p><small>汇总数据不等于四房住宅的可比成交；未接入的数据不会用示例数字填充。</small></article></>}
 {tab==='区域观察'&&<article className="card"><h2>关注区域的市场证据</h2><p>只有实际导入的数据才会出现在这里；每项指标保留来源、统计月份与房型口径。</p>{!metrics.length?<div className="empty"><span>◎</span><h3>等待第一批真实数据</h3><p>采集端需完成数据源与运行限额验证；目前没有自动排名。</p></div>:<div className="table-wrap"><table><thead><tr>{['区域','月份','指标','数值','房型口径','来源'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{metrics.map((m,i)=><tr key={i}><td>{m.region}</td><td>{m.period}</td><td>{m.metric}</td><td>{m.value.toLocaleString()}</td><td>{m.property_type}</td><td>{m.source}</td></tr>)}</tbody></table></div>}<div className="links"><a href="https://www.zillow.com/research/data/" target="_blank" rel="noreferrer">Zillow Research ↗</a><a href="https://www.redfin.com/news/data-center/" target="_blank" rel="noreferrer">Redfin Data Center ↗</a><a href="https://www.unlockmls.com/stats" target="_blank" rel="noreferrer">Unlock MLS 月报 ↗</a></div></article>}
 {tab==='我的房源'&&<><article className="card"><h2>添加一套值得研究的房子</h2><p>房型固定为 single-family。请在原始页面确认房型与信息；粘贴链接不会自动抓取。</p><form onSubmit={saveListing} className="form-grid"><label className="wide">地址<input required maxLength={300} value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})}/></label><label className="wide">原始房源链接<input required type="url" pattern="https?://.*" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label><label>ZIP<input required pattern="[0-9]{5}" value={draft.zip} onChange={e=>setDraft({...draft,zip:e.target.value})}/></label><label>挂牌价（USD）<input required type="number" min="1" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/></label><label>卧室数<input required type="number" min="4" step="1" value={draft.beds} onChange={e=>setDraft({...draft,beds:e.target.value})}/></label><label className="wide">看房笔记 / 议价线索<textarea maxLength={10000} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label><button className="primary" disabled={!user||busy||!online}>保存到私人候选池</button></form></article><div className="listing-grid">{listings.map(item=><article className="card listing" key={item.id}><p className="eyebrow">{item.zip} · {item.beds} BED · SINGLE-FAMILY</p><h2>{money(item.price)}</h2><h3>{item.address}</h3><p className="note">{item.note||'尚未记录看房笔记。'}</p><label>研究进度<select disabled={!online} value={item.status} onChange={e=>void updateStatus(item,e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label><div className="links"><a target="_blank" rel="noreferrer" href={item.url}>原房源 ↗</a><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.address)}&destination=${encodeURIComponent(campus)}&travelmode=driving`}>查看通勤 ↗</a><button disabled={!online} onClick={()=>void remove(item)}>删除</button></div></article>)}</div>{!listings.length&&<div className="empty"><h3>你的候选清单，从第一套房开始。</h3><p>登录后添加。房源链接与笔记不会提交到 GitHub。</p></div>}</>}
 {tab==='成本计算'&&<div className="grid"><article className="card"><h2>每个月，实际需要承担多少？</h2><p>以下为可编辑的演示假设，不是当前贷款报价或具体房屋税费。</p><div className="form-grid">{([['price','房价（USD）',1,100000000],['down','首付比例（%）',0,100],['rate','年利率（%）',0,30],['years','贷款年限',1,50],['tax','预计年房产税（USD）',0,1000000],['insurance','年保险（USD）',0,1000000],['hoa','月 HOA（USD）',0,100000],['maintenance','年维护预留（房价 %）',0,100]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} step={key==='years'?'1':'0.1'} value={calc[key]} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=min&&n<=max)setCalc({...calc,[key]:n})}}/></label>)}</div></article><article className="card cost"><p className="eyebrow">ESTIMATED MONTHLY COST</p><strong>{money(cost.total)}<small> / 月</small></strong>{[['贷款本息',cost.principalInterest],['房产税',cost.tax],['保险',cost.insurance],['HOA',cost.hoa],['维护预留',cost.maintenance]].map(([label,value])=><div className="cost-row" key={String(label)}><span>{label}</span><b>{money(Number(value))}</b></div>)}<p>首付：{money(calc.price*calc.down/100)}</p><small>未含 PMI、交割费、水电及特殊评估。首付不足 20% 时需另核实 PMI。原业主税额未必适用于新买家。</small></article></div>}
 {tab==='设置'&&<div className="grid"><article className="card"><h2>数据与访问</h2><p>账户：{user?'已登录私人账户':'未登录'}</p><p>工作台页面公开托管，私人数据由 Supabase 权限保护。此版本不缓存私人数据到离线存储。</p><button disabled={!user||busy||!online} onClick={()=>void refresh()}>刷新云端记录</button>{user&&<button onClick={async()=>{await supabase?.auth.signOut();setMessage('已退出，已清除界面中的私人记录。')}}>退出登录</button>}<h3>备份与恢复</h3><p>导出仅包含当前账号的候选房源及笔记；市场数据、通勤锚点、成本演示输入不包含在备份中。</p><button disabled={!user||busy} onClick={backup}>导出房源 JSON</button><label className="file-label">导入房源备份<input type="file" accept="application/json,.json" disabled={!user||busy||!online} onChange={e=>{void restore(e.target.files?.[0]);e.target.value=''}}/></label></article><article className="card"><h2>通勤锚点</h2><label>Apple 园区地址或入口<input value={campus} onChange={e=>setCampus(e.target.value)}/></label><p>当前值只在本次打开期间有效。默认名称仅作占位，请替换成准确园区地址。地图预测需自行选择早晚高峰核实。</p><h3>安装与离线</h3><p>Chrome 可通过地址栏安装；iPhone Safari 通过“分享 → 添加到主屏幕”。首次联网访问后，应用外壳和成本计算可离线使用。</p></article></div>}
 <footer>HOME COMPASS · 让每一步决定，都有据可依。<span>数据不足时，保留判断。</span></footer></main></div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
if(import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load',()=>{navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(console.error)});
