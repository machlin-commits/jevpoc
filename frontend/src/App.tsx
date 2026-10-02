import {useEffect,useRef,useState} from 'react';
import {LayoutGroup,motion,useReducedMotion} from 'framer-motion';
import {ArrowUp,ArrowUpRight,Check,Command,Layers3,Loader2,RotateCcw,Sparkles,X,Zap} from 'lucide-react';
import {catalog,categories,Tech} from './catalog';
import paths from './logo-paths.json';
interface Match {id:string;confidence:number}
interface Result {matches:Match[];engine:string;latency_ms:number;cost_usd:number|null;cost_estimated:boolean;reason:string|null}
const prompts=['iOS & macOS native app','Azure Multi-Agent AI system','B2B SaaS with Next.js & Postgres','Real-time streaming media pipeline'];
const spring={type:'spring' as const,stiffness:350,damping:28};
const positions=catalog.map((_,i)=>{const random=(seed:number)=>{const x=Math.sin(seed*127.1+311.7)*43758.5453;return x-Math.floor(x)};return {left:2+random(i+1)*92,top:45+random(i+300)*210,rotate:random(i+600)*30-15}});
const logos=paths as Record<string,{path:string;hex:string}>;
function Brand({tech}:{tech:Tech}) {if(!logos[tech.slug])return <img src={`/logos/${tech.slug}.svg`} alt={`${tech.name} logo`}/>;return <svg role="img" aria-label={`${tech.name} logo`} viewBox="0 0 24 24" fill={tech.hex}><path d={logos[tech.slug].path}/></svg>}
function Logo({tech,confidence,index=0}:{tech:Tech;confidence?:number;index?:number}) {
 const reduced=useReducedMotion(); const active=confidence!==undefined;
 return <motion.div layoutId={`logo-${tech.id}`} layout transition={reduced?{duration:0}:spring} className={active?'tech-card':'pile-card'} initial={false} animate={{opacity:active?1:.35,rotate:active?0:positions[index].rotate}} title={`${tech.name}${active?` · ${Math.round(confidence*100)}% match`:''}`}>
 <Brand tech={tech}/>{active&&<><span className="tech-name">{tech.name}</span><span className="confidence" title="Relevance score">{Math.round(confidence*100)}<small>%</small></span></>}
 </motion.div>
}
export default function App(){
 const [prompt,setPrompt]=useState('');const [result,setResult]=useState<Result|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);const input=useRef<HTMLInputElement>(null);const sequence=useRef(0);const debounce=useRef<ReturnType<typeof setTimeout>|null>(null);const [submitted,setSubmitted]=useState('');
 const matches=new Map(result?.matches.map(m=>[m.id,m.confidence])??[]);
 function clear(){sequence.current++;controller.current?.abort();setPrompt('');setSubmitted('');setResult(null);setLoading(false);setError('');input.current?.focus()}
 async function query(value:string){
  if(!value.trim())return;if(debounce.current)clearTimeout(debounce.current); const id=++sequence.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;setLoading(true);setError('');
  try{const response=await fetch('/api/classify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:value}),signal:abort.signal});if(!response.ok)throw new Error('Could not build your stack. Please try again.');const data:Result=await response.json();if(id!==sequence.current)return;setResult(data);setSubmitted(value)}
  catch(e){if(id===sequence.current&&!abort.signal.aborted)setError(e instanceof TypeError?'Cannot reach the backend. Start FastAPI on port 8000, then try again.':(e as Error).message)}
  finally{if(id===sequence.current)setLoading(false)}
 }
 useEffect(()=>{if(!prompt.trim()){if(result||loading)clear();return}if(prompt===submitted)return;debounce.current=setTimeout(()=>query(prompt),700);return ()=>{if(debounce.current)clearTimeout(debounce.current)}},[prompt]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const visibleCategories=categories.filter(c=>catalog.some(t=>t.category===c&&matches.has(t.id)));
 return <div className="app-shell">
 <header><a className="wordmark" href="/" aria-label="Jev POC home"><span className="jev-mark">j<span>↗</span></span>Jev <span className="poc">POC</span></a><div className="telemetry"><span className="metric" title={result?.cost_estimated?'Estimated from reported input tokens':'Query cost'}>{result?.cost_estimated?'≈ ':''}${(result?.cost_usd??0).toFixed(5)}</span><span className="metric"><Zap size={12}/>{result?.latency_ms??'—'} ms</span><span className={`engine ${result?.engine.includes('Fallback')?'fallback':''}`}><i/>{result?.engine??'System One · ready'}</span></div><a className="header-link" href="https://docs.typesafe.ai" target="_blank" rel="noreferrer">Powered by Jev <ArrowUpRight size={14}/></a></header>
 <main>
 <section className={`hero ${result?'has-results':''}`}>
 <div className="eyebrow"><span/><span>A LITTLE INTELLIGENCE. A LOT OF POSSIBILITY.</span></div>
 <h1>Your idea. <span>The right stack.</span></h1><p className="intro">Describe what you’re building. Watch the pieces fall into place.</p>
 <form className={`search ${loading?'search-loading':''}`} onSubmit={e=>{e.preventDefault();query(prompt)}}><Sparkles size={21} className="search-icon"/><input ref={input} aria-label="Describe your project" value={prompt} maxLength={2000} onChange={e=>{sequence.current++;controller.current?.abort();setLoading(false);setPrompt(e.target.value)}} placeholder="What do you want to build?"/>{prompt&&<button type="button" className="clear-button" onClick={clear} aria-label="Clear prompt"><X size={17}/></button>}<button className="submit" disabled={loading||!prompt.trim()} aria-label="Find my stack">{loading?<Loader2 size={20} className="spin"/>:<ArrowUp size={21}/>}</button></form>
 <div className="quick-prompts"><span>TRY AN IDEA</span>{prompts.slice(0,3).map((p,i)=><button key={p} onClick={()=>{setPrompt(p);input.current?.focus()}}><span className="chip-dot" style={{background:['#8b8b91','#408aff','#b599dc'][i]}}/>{p}<ArrowUpRight size={12}/></button>)}</div>
 </section>
 <LayoutGroup id="stack-canvas"><section className="recommendations" aria-label="Recommended technologies" aria-busy={loading}>
 <div className="status" aria-live="polite">{error?<span className="error">{error}</span>:loading?<><Loader2 size={14} className="spin"/>Finding the right pieces for your idea…</>:result?<><span className="status-dot"/>{matches.size?`${matches.size} technologies, one possible starting point`:'No strong matches. Try describing a platform or use case.'}<button onClick={clear}><RotateCcw size={12}/>Reset canvas</button></>:null}</div>
 {visibleCategories.map((category,i)=><motion.div layout className="category-row" key={category} transition={spring}><div className="category-title"><span>{String(i+1).padStart(2,'0')}</span><h2>{category}</h2><div/></div><div className="category-tiles">{catalog.filter(t=>t.category===category&&matches.has(t.id)).sort((a,b)=>matches.get(b.id)!-matches.get(a.id)!).map(t=><Logo key={t.id} tech={t} confidence={matches.get(t.id)}/>)}</div></motion.div>)}
 {result&&<p className="result-note"><Check size={13}/>{result.engine.includes('Fallback')?'Keyword relevance scores · not calibrated probabilities':'Calibrated relevance probabilities from System One'}{result.reason&&<span title={result.reason}>{result.reason}</span>}</p>}
 {!result&&!loading&&<div className="empty-hint"><div className="hint-line"/><Layers3 size={19}/><span>140 technologies. Endless combinations.</span><div className="hint-line"/></div>}
 </section>
 <section className="pile-section" aria-label="Unselected technology logo canvas"><div className="pile-caption"><span className="tiny-dot"/>THE POSSIBILITIES, BEFORE THE PLAN<span className="pile-count">{catalog.length-matches.size} in the mix</span></div><div className="logo-pile">{catalog.map((tech,i)=>!matches.has(tech.id)&&<div className="pile-slot" key={tech.id} style={{left:`${positions[i].left}%`,top:positions[i].top}}><Logo tech={tech} index={i}/></div>)}</div><div className="pile-fade"/></section></LayoutGroup>
 </main><footer><span>From a jumble to a starting point.</span><span><Command size={12}/> An experiment in reactive discovery <span className="footer-divider">/</span> JEV POC · 2026</span></footer>
 </div>
}
