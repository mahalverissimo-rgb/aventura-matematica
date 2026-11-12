// Geradores dos desafios matemáticos de cada região.
// Código puro (sem DOM): é testado automaticamente no Node (tests/challenges.test.js).
import { rnd, pick, shuffle, rep } from "./util.js";
import { SHAPES, shapeSVG } from "./shapes.js";

export const OBJ = ["🍎","⭐","🍄","💎","🧪","🐸","🌸","🔮"];
export function numOptions(correct, n=4, min=0, spread=3){
  const s=new Set([correct]); let guard=0;
  while(s.size<n && guard++<200){ const v=correct+rnd(-spread,spread); if(v>=min && v!==correct) s.add(v); }
  let k=correct+spread+1; while(s.size<n) s.add(k++);
  return shuffle([...s]).map(v=>({label:String(v), value:v}));
}
/** Monta um desafio: texto, parte visual (HTML), alternativas, resposta certa e dica. */
export function Q(text, visual, options, answer, hint, opts={}){ return Object.assign({text, visual, options, answer, hint}, opts); }

/** Um gerador por região; recebe o nível (1 a 5) e devolve um desafio novo. */
export const GEN = [
  // 0 Floresta da Soma — adição e subtração
  function(l){
    const max = Math.min(6 + l*3, 20);
    const sub = l>=3 && Math.random()<0.5;
    if(!sub){
      let a=rnd(1,max-1), b=rnd(1,max-a);
      if(l<=2){ const o=pick(OBJ);
        return Q("Quantos tem ao todo?", `<span class="grp"><span>${rep(o,a)}</span><span class="bignum">${a}</span></span><span class="op">+</span><span class="grp"><span>${rep(o,b)}</span><span class="bignum">${b}</span></span><span class="eqline">${a} + ${b} = ?</span>`,
          numOptions(a+b,4,1), a+b, `Conte tudo junto: ${a} e mais ${b}.`, {speech:`${a} mais ${b}`}); }
      return Q("Lance o feitiço da soma!", `${a} + ${b} = ?`, numOptions(a+b,4,1), a+b, `Comece no ${Math.max(a,b)} e conte mais ${Math.min(a,b)} nos dedos.`, {eq:true});
    }
    let a=rnd(3,max), b=rnd(1,a-1);
    return Q("Feitiço da subtração!", `${a} − ${b} = ?`, numOptions(a-b,4,0), a-b, `Tinha ${a}, tira ${b}. Conte para trás a partir do ${a}.`, {eq:true, speech:`${a} menos ${b}`});
  },
  // 1 Torre das Sequências
  function(l){
    if(l<=2 && Math.random()<0.6){
      const pats=[[0,1],[0,1,2],[0,0,1],[0,1,1]];
      const p=pick(l===1?pats.slice(0,1).concat([[0,1]]):pats);
      const sym=shuffle(["🔴","🔵","🟡","🟢","⭐","🌙","🍄","💎"]).slice(0,3);
      const seq=[]; for(let i=0;i<7;i++) seq.push(sym[p[i%p.length]]);
      const ans=seq[6];
      const opts=shuffle([...new Set([ans,...sym.slice(0,Math.max(2,new Set(p).size)), sym[2]])]).slice(0,3);
      if(!opts.includes(ans)) opts[0]=ans;
      return Q("O que vem depois no padrão mágico?", seq.slice(0,6).join(" ")+" ❓", shuffle(opts).map(v=>({label:v,value:v})), ans, "Olhe como as figuras se repetem.");
    }
    const steps = l<=2?[1,2]: l===3?[2,5]: [2,5,10,3];
    const step=pick(steps); const down = l>=4 && Math.random()<0.4;
    let start = down ? rnd(step*5, step*5+10) : rnd(0, l<=2?5:10);
    const seq=[]; for(let i=0;i<5;i++) seq.push(start + (down?-1:1)*step*i);
    const hole = l>=5 && Math.random()<0.5 ? rnd(1,3) : 4;
    const ans=seq[hole]; const shown=seq.map((v,i)=>i===hole?"❓":v).join(", ");
    return Q("Complete a sequência para abrir o portal!", shown, numOptions(ans,4,0,Math.max(2,step)), ans,
      `Os números ${down?"diminuem":"aumentam"} de ${step} em ${step}.`, {speech:shown.replace("❓","qual número")});
  },
  // 2 Lago dos Números — comparação, contagem, número escondido
  function(l){
    const kinds = l===1?["maior","contar"]: l===2?["menor","maior","contar"]: l===3?["falta","maior3"]: l===4?["falta","contar","menor3"]:["falta","faltasub","maior3"];
    const k=pick(kinds);
    if(k==="maior"||k==="menor"){ let a=rnd(1,10), b; do{b=rnd(1,10)}while(b===a);
      return Q(`Qual número é o ${k.toUpperCase()}?`, "🐟 ⚖️ 🐟", shuffle([a,b]).map(v=>({label:String(v),value:v})), k==="maior"?Math.max(a,b):Math.min(a,b), `O ${k} é o que fica ${k==="maior"?"mais longe":"mais perto"} do zero.`); }
    if(k==="maior3"||k==="menor3"){ const s=new Set(); while(s.size<3) s.add(rnd(1,20)); const arr=[...s]; const big=k==="maior3";
      return Q(`Toque no número ${big?"MAIOR":"MENOR"}!`, "🐟 🐠 🐡", shuffle(arr).map(v=>({label:String(v),value:v})), big?Math.max(...arr):Math.min(...arr), "Compare as dezenas primeiro, depois as unidades."); }
    if(k==="contar"){ const n=rnd(3, l===1?8:14), o=pick(["🐟","🐠","🦆","🐚","🪷"]);
      return Q("Quantos tem no lago?", `<span style="font-size:${n>9?32:40}px">${rep(o,n)}</span>`, numOptions(n,4,1,2), n, "Toque com o dedo em cada um enquanto conta."); }
    if(k==="falta"){ const a=rnd(1,9), b=rnd(1,10);
      return Q("Qual número está escondido?", `${a} + ❓ = ${a+b}`, numOptions(b,4,0), b, `Quanto falta do ${a} até o ${a+b}? Conte nos dedos.`, {eq:true, speech:`${a} mais qual número é igual a ${a+b}`}); }
    const b=rnd(1,8), r=rnd(1,10);
    return Q("Qual número está escondido?", `❓ − ${b} = ${r}`, numOptions(r+b,4,1), r+b, `Faça ao contrário: ${r} + ${b}.`, {eq:true, speech:`qual número menos ${b} é igual a ${r}`});
  },
  // 3 Vale das Formas
  function(l){
    const basic=["circulo","quadrado","triangulo","retangulo"], all=Object.keys(SHAPES).filter(k=>k!=="estrela");
    const kinds = l<=2?["achar"]: l===3?["lados","achar"]: l===4?["contar","lados"]:["contar","lados","achar"];
    const k=pick(kinds);
    if(k==="achar"){ const pool=l===1?basic.slice(0,3):l===2?basic.concat(["estrela"]):Object.keys(SHAPES);
      const opts=shuffle(pool).slice(0,l===1?3:4); const ans=pick(opts);
      return Q(`Toque no ${SHAPES[ans].nome.toUpperCase()}!`, "✨", opts.map(s=>({label:shapeSVG(s,64),value:s})), ans,
        ({circulo:"É redondinho, não tem pontas.",quadrado:"Tem 4 lados todos iguais.",triangulo:"Tem 3 lados e 3 pontas.",retangulo:"Tem 4 lados, dois compridos e dois curtos.",pentagono:"Tem 5 lados.",hexagono:"Tem 6 lados, como um favo de mel.",estrela:"Tem pontas como as do céu."})[ans],
        {speech:`toque no ${SHAPES[ans].nome}`}); }
    if(k==="lados"){ const s=pick(l===3?["triangulo","quadrado","retangulo"]:all.filter(x=>x!=="circulo"));
      return Q(`Quantos lados tem o ${SHAPES[s].nome}?`, shapeSVG(s,130), numOptions(SHAPES[s].lados,4,3,2), SHAPES[s].lados, "Passe o dedo em cada lado e conte."); }
    const target=pick(["triangulo","circulo","quadrado"]); const n=rnd(2,l===4?5:7); const others=rnd(2,4);
    const items=shuffle(Array(n).fill(target).concat(Array.from({length:others},()=>pick(["circulo","quadrado","triangulo","estrela"].filter(x=>x!==target)))));
    return Q(`Quantos ${SHAPES[target].nome}s você vê?`, items.map(s=>shapeSVG(s,46)).join(""), numOptions(n,4,1,2), n, `Procure só os ${SHAPES[target].nome}s e conte devagar.`);
  },
  // 4 Castelo dos Enigmas — lógica
  function(l){
    const groups=[["🍎","🍌","🍇","🍓","🍐"],["🐶","🐱","🐰","🐻","🐼"],["🚗","🚌","🚲","🚂","✈️"],["⚽","🏀","🎾","🏐"],["🌞","🌙","⭐","☁️"]];
    const kinds = l<=2?["intruso"]: l<=4?["problema","intruso"]:["problema","entre","intruso","par"];
    const k=pick(kinds);
    if(k==="intruso"){ const [g1,g2]=shuffle(groups).slice(0,2); const same=shuffle(g1).slice(0,3); const odd=pick(g2);
      return Q("Qual NÃO combina com os outros?", "🔍", shuffle(same.concat([odd])).map(v=>({label:v,value:v})), odd, "Três são da mesma família. Qual é diferente?"); }
    if(k==="problema"){ const t=pick([
        ()=>{const a=rnd(2,8),b=rnd(1,6);return [`O mago tem ${a} poções 🧪 e ganhou mais ${b}. Quantas poções ele tem agora?`,a+b,`Junte ${a} com ${b}.`]},
        ()=>{const a=rnd(5,12),b=rnd(1,a-1);return [`Havia ${a} sapos 🐸 no lago. ${b} pularam para fora. Quantos ficaram?`,a-b,`Tire ${b} de ${a}.`]},
        ()=>{const a=rnd(2,5);return [`Cada dragão 🐉 tem 2 asas. Quantas asas têm ${a} dragões?`,a*2,`Conte de 2 em 2, ${a} vezes.`]},
        ()=>{const a=rnd(3,9),b=rnd(1,a-1);return [`Luna tem ${a} estrelas ⭐ e Teo tem ${b}. Quantas a mais Luna tem?`,a-b,`Quanto falta do ${b} até o ${a}?`]}
      ])();
      return Q(t[0], "🧙‍♂️", numOptions(t[1],4,0), t[1], t[2]); }
    if(k==="entre"){ const a=rnd(1,18);
      return Q("Qual número fica no meio?", `${a} , ❓ , ${a+2}`, numOptions(a+1,4,0,2), a+1, `Qual vem logo depois do ${a}?`, {eq:true}); }
    const nums=shuffle([rnd(1,9)*2, rnd(0,9)*2+1, rnd(0,9)*2+1, rnd(0,9)*2+1]); const ans=nums.find(n=>n%2===0);
    return Q("Qual número é PAR? (dá para dividir em 2 grupos iguais)", "👯", [...new Set(nums)].map(v=>({label:String(v),value:v})), ans, "Números pares terminam em 0, 2, 4, 6 ou 8.");
  }
];

/** Gera um desafio para a região r (0 a 4) e nível 1 a 5. */
export function generateChallenge(r, level) {
  return GEN[r](level);
}
