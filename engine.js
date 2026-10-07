(function(){
  const EPS=1e-6;
  const area=r=>Math.max(0,r.w)*Math.max(0,r.h);

  function orientations(piece){
    const out=[{w:piece.w,h:piece.h,rotated:false}];
    if(piece.canRotate && Math.abs(piece.w-piece.h)>EPS) out.push({w:piece.h,h:piece.w,rotated:true});
    return out;
  }

  function dimensionCanBeSeparated(container,piece,kerf){
    const delta=container-piece;
    return delta>=-EPS && (Math.abs(delta)<=EPS || delta+EPS>=kerf);
  }

  function rectFits(piece,rect,kerf){
    return dimensionCanBeSeparated(rect.w,piece.w,kerf) && dimensionCanBeSeparated(rect.h,piece.h,kerf);
  }

  function classifyFree(r,cfg){
    if(r.w<=EPS||r.h<=EPS) return 'none';
    const a=area(r)/1e6;
    const dimsOk=(r.w>=cfg.scrapMinL && r.h>=cfg.scrapMinW)||(r.h>=cfg.scrapMinL && r.w>=cfg.scrapMinW);
    return dimsOk && a>=cfg.scrapMinArea ? 'scrap':'waste';
  }

  function splitOptions(rect,p,kerf){
    const hasRight=rect.w-p.w>EPS;
    const hasBottom=rect.h-p.h>EPS;
    const rightW=hasRight?rect.w-p.w-kerf:0;
    const bottomH=hasBottom?rect.h-p.h-kerf:0;
    const variants=[];

    // Variante A : coupe verticale, puis horizontale dans la bande gauche.
    const freeA=[]; const cutsA=[];
    if(hasRight){
      freeA.push({x:rect.x+p.w+kerf,y:rect.y,w:rightW,h:rect.h});
      cutsA.push({axis:'V',x:rect.x+p.w,y:rect.y,length:rect.h,kerf});
    }
    if(hasBottom){
      freeA.push({x:rect.x,y:rect.y+p.h+kerf,w:p.w,h:bottomH});
      cutsA.push({axis:'H',x:rect.x,y:rect.y+p.h,length:p.w,kerf});
    }
    variants.push({free:freeA.filter(r=>r.w>EPS&&r.h>EPS),cuts:cutsA});

    // Variante B : coupe horizontale, puis verticale dans la bande haute.
    const freeB=[]; const cutsB=[];
    if(hasBottom){
      freeB.push({x:rect.x,y:rect.y+p.h+kerf,w:rect.w,h:bottomH});
      cutsB.push({axis:'H',x:rect.x,y:rect.y+p.h,length:rect.w,kerf});
    }
    if(hasRight){
      freeB.push({x:rect.x+p.w+kerf,y:rect.y,w:rightW,h:p.h});
      cutsB.push({axis:'V',x:rect.x+p.w,y:rect.y,length:p.h,kerf});
    }
    variants.push({free:freeB.filter(r=>r.w>EPS&&r.h>EPS),cuts:cutsB});

    // Si une seule direction de coupe existe, les deux variantes sont identiques : on déduplique.
    if(JSON.stringify(variants[0])===JSON.stringify(variants[1])) return [variants[0]];
    return variants;
  }

  function placementScore(rect,p,variant,strategy){
    const leftover=area(rect)-area(p);
    const maxFree=Math.max(0,...variant.free.map(area));
    const fragmentation=variant.free.length;
    const cutCount=variant.cuts.length;
    const short=Math.min(Math.abs(rect.w-p.w),Math.abs(rect.h-p.h));
    if(strategy==='material') return leftover + short*4 + fragmentation*30 + cutCount*20;
    if(strategy==='scraps') return leftover - maxFree*.35 + fragmentation*10 + cutCount*15;
    if(strategy==='cuts') return leftover*.35 + fragmentation*250 + cutCount*1500 + short*2;
    return leftover*.7 - maxFree*.12 + fragmentation*55 + cutCount*80 + short*2.5;
  }

  function choosePlacement(freeRects,piece,cfg,strategy){
    let best=null;
    freeRects.forEach((rect,ri)=>{
      orientations(piece).forEach(o=>{
        if(!rectFits(o,rect,cfg.kerf)) return;
        splitOptions(rect,o,cfg.kerf).forEach((variant,si)=>{
          const score=placementScore(rect,o,variant,strategy);
          if(!best||score<best.score) best={ri,rect,o,variant,splitType:si,score};
        });
      });
    });
    return best;
  }

  function placeIntoSheet(sheet,piece,cfg,strategy){
    const choice=choosePlacement(sheet.free,piece,cfg,strategy);
    if(!choice) return false;
    const target=sheet.free[choice.ri];
    sheet.free.splice(choice.ri,1,...choice.variant.free);
    sheet.items.push({
      id:piece.id,sourceId:piece.sourceId,rep:piece.rep,name:piece.name,
      x:target.x,y:target.y,w:choice.o.w,h:choice.o.h,
      finalW:piece.w,finalH:piece.h,rotated:choice.o.rotated,
      grain:piece.grain,edges:piece.edges
    });
    choice.variant.cuts.forEach((cut,index)=>sheet.cuts.push({
      ...cut,
      label:`${piece.rep} · coupe ${cut.axis==='V'?'verticale':'horizontale'} ${index+1}/${choice.variant.cuts.length}`
    }));
    return true;
  }

  function makeSheet(cfg,index){
    const usableW=cfg.panelW-cfg.trimLeft-cfg.trimRight;
    const usableH=cfg.panelH-cfg.trimTop-cfg.trimBottom;
    return {index,items:[],cuts:[],free:[{x:cfg.trimLeft,y:cfg.trimTop,w:usableW,h:usableH}]};
  }

  function expandPieces(rows,cfg){
    const out=[];
    rows.forEach(r=>{
      const qty=Math.max(0,Math.floor(Number(r.qty)||0));
      for(let i=0;i<qty;i++){
        const followsGrain=r.grain==='follow';
        out.push({
          id:`${r.id}-${i+1}`,sourceId:r.id,rep:r.rep,name:r.name,
          w:Number(r.length),h:Number(r.width),grain:r.grain,edges:r.edges,
          canRotate:r.rotation==='free' && !(cfg.panelGrain&&followsGrain),source:r
        });
      }
    });
    return out;
  }

  function orderVariants(pieces){
    const variants=[];
    const add=(name,fn)=>variants.push({name,pieces:[...pieces].sort(fn)});
    add('surface',(a,b)=>b.w*b.h-a.w*a.h);
    add('longueur',(a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h));
    add('largeur',(a,b)=>Math.min(b.w,b.h)-Math.min(a.w,a.h));
    add('contrainte',(a,b)=>Number(a.canRotate)-Number(b.canRotate)||b.w*b.h-a.w*a.h);
    add('ratio',(a,b)=>Math.max(b.w/b.h,b.h/b.w)-Math.max(a.w/a.h,a.h/a.w));
    add('bandes-horizontales',(a,b)=>b.h-a.h||b.w-a.w||b.w*b.h-a.w*a.h);
    add('bandes-verticales',(a,b)=>b.w-a.w||b.h-a.h||b.w*b.h-a.w*a.h);
    add('bandes-basses',(a,b)=>a.h-b.h||b.w-a.w||b.w*b.h-a.w*a.h);
    add('bandes-etroites',(a,b)=>a.w-b.w||b.h-a.h||b.w*b.h-a.w*a.h);
    return variants;
  }

  function runOne(pieces,cfg,strategy,variant,placementStrategy=strategy){
    const sheets=[]; const impossible=[];
    const maxW=cfg.panelW-cfg.trimLeft-cfg.trimRight;
    const maxH=cfg.panelH-cfg.trimTop-cfg.trimBottom;
    const usableRect={w:maxW,h:maxH};

    for(const piece of variant.pieces){
      if(!orientations(piece).some(o=>rectFits(o,usableRect,cfg.kerf))){impossible.push(piece);continue;}
      let placed=false;
      for(const sheet of sheets){
        if(placeIntoSheet(sheet,piece,cfg,placementStrategy)){placed=true;break;}
      }
      if(!placed){
        const sheet=makeSheet(cfg,sheets.length+1);
        if(placeIntoSheet(sheet,piece,cfg,placementStrategy)){sheets.push(sheet);} else impossible.push(piece);
      }
    }

    let pieceArea=0,scrapArea=0,wasteArea=0,kerfArea=0;
    const scraps=[];
    sheets.forEach(sheet=>{
      sheet.items.forEach(item=>pieceArea+=item.w*item.h);
      sheet.cuts.forEach(cut=>kerfArea+=cut.length*cut.kerf);
      sheet.free.forEach((rect,idx)=>{
        const type=classifyFree(rect,cfg); rect.type=type;
        if(type==='scrap'){
          scrapArea+=area(rect);
          const wholeStrip=Math.abs(rect.w-maxW)<=EPS||Math.abs(rect.h-maxH)<=EPS;
          rect.wholeStrip=wholeStrip;
          scraps.push({...rect,sheet:sheet.index,id:`CH-${String(sheet.index).padStart(2,'0')}-${String(idx+1).padStart(2,'0')}`,wholeStrip});
        }else wasteArea+=area(rect);
      });
    });

    const grossArea=sheets.length*cfg.panelW*cfg.panelH;
    const usableArea=sheets.length*maxW*maxH;
    const trimArea=Math.max(0,grossArea-usableArea);
    const balanceError=usableArea-pieceArea-scrapArea-wasteArea-kerfArea;
    const yieldPct=grossArea?pieceArea/grossArea*100:0;
    const cutCount=sheets.reduce((sum,sheet)=>sum+sheet.cuts.length,0);
    const scrapCount=scraps.length;
    const largestScrap=scraps.reduce((best,s)=>area(s)>area(best||{w:0,h:0})?s:best,null);
    const largestScrapArea=largestScrap?area(largestScrap):0;
    const largestScrapLongEdge=largestScrap?Math.max(largestScrap.w,largestScrap.h):0;
    const largestScrapShortEdge=largestScrap?Math.min(largestScrap.w,largestScrap.h):0;
    const wholeStripScraps=scraps.filter(s=>s.wholeStrip).length;
    const fragmentationPenalty=scrapCount*1.8e7;
    const continuityBonus=largestScrapArea*2.8 + largestScrapLongEdge*11000 + wholeStripScraps*2.5e7;

    let score=sheets.length*1e12 + wasteArea*10 + cutCount*1e6 + fragmentationPenalty - continuityBonus;
    if(strategy==='material') score=sheets.length*1e12 + wasteArea*14 + cutCount*2e5 + scrapCount*6e6 - largestScrapArea*.7 - largestScrapLongEdge*2500;
    if(strategy==='scraps') score=sheets.length*1e12 + wasteArea*12 + scrapCount*3.2e7 - largestScrapArea*6 - largestScrapLongEdge*22000 - wholeStripScraps*4e7 + cutCount*2e5;
    if(strategy==='cuts') score=sheets.length*1e12 + cutCount*5e7 + wasteArea*2 + scrapCount*3e6 - largestScrapArea*.25 - largestScrapLongEdge*1000;

    return {
      sheets,impossible,scraps,score,variant:variant.name,placementStrategy,
      stats:{pieceArea,scrapArea,wasteArea,grossArea,usableArea,trimArea,kerfArea,balanceError,yieldPct,cutCount,scrapCount,largestScrapArea,largestScrapLongEdge,largestScrapShortEdge,wholeStripScraps}
    };
  }

  function validateConfig(cfg){
    const nums=['panelW','panelH','panelThickness','panelPrice','kerf','trimLeft','trimRight','trimTop','trimBottom','scrapMinL','scrapMinW','scrapMinArea'];
    for(const key of nums){if(!Number.isFinite(Number(cfg[key]))) throw new Error(`Paramètre non numérique : ${key}`);}
    if(cfg.panelW<=0||cfg.panelH<=0||cfg.panelThickness<=0) throw new Error('Dimensions panneau invalides.');
    if(cfg.panelPrice<0) throw new Error('Prix panneau négatif interdit.');
    if(cfg.kerf<0||cfg.trimLeft<0||cfg.trimRight<0||cfg.trimTop<0||cfg.trimBottom<0) throw new Error('Kerf/purges négatifs interdits.');
    if(cfg.scrapMinL<0||cfg.scrapMinW<0||cfg.scrapMinArea<0) throw new Error('Seuils de chute négatifs interdits.');
    if(cfg.panelW<=cfg.trimLeft+cfg.trimRight||cfg.panelH<=cfg.trimTop+cfg.trimBottom) throw new Error('Les purges rendent le panneau inexploitable.');
  }

  function validateRows(rows){
    if(!Array.isArray(rows)) throw new Error('Liste de débit invalide.');
    rows.forEach((r,index)=>{
      const length=Number(r.length), width=Number(r.width), qty=Number(r.qty);
      if(!Number.isFinite(length)||!Number.isFinite(width)||length<=0||width<=0) throw new Error(`Dimensions invalides ligne ${index+1}.`);
      if(!Number.isInteger(qty)||qty<1) throw new Error(`Quantité invalide ligne ${index+1}.`);
    });
  }

  function optimize(rows,cfg,strategy='balanced'){
    validateConfig(cfg);
    validateRows(rows);
    const pieces=expandPieces(rows,cfg);
    if(!pieces.length) return {sheets:[],impossible:[],stats:{pieceArea:0,scrapArea:0,wasteArea:0,grossArea:0,usableArea:0,trimArea:0,kerfArea:0,balanceError:0,yieldPct:0,cutCount:0,scrapCount:0,largestScrapArea:0,largestScrapLongEdge:0,largestScrapShortEdge:0,wholeStripScraps:0},scraps:[],score:0,alternatives:[]};
    const results=[];
    const placementStrategies=[...new Set([strategy,'balanced','scraps','material','cuts'])];
    orderVariants(pieces).forEach(v=>placementStrategies.forEach(ps=>results.push(runOne(pieces,cfg,strategy,v,ps))));
    results.sort((a,b)=>{
      if(a.impossible.length!==b.impossible.length) return a.impossible.length-b.impossible.length;
      if(a.sheets.length!==b.sheets.length) return a.sheets.length-b.sheets.length;
      return a.score-b.score;
    });
    const best=results[0];
    best.alternatives=results.slice(1,7).map(r=>({variant:r.variant,placementStrategy:r.placementStrategy,sheets:r.sheets.length,yieldPct:r.stats.yieldPct,cutCount:r.stats.cutCount,impossible:r.impossible.length,scrapCount:r.stats.scrapCount,largestScrapArea:r.stats.largestScrapArea,largestScrapLongEdge:r.stats.largestScrapLongEdge,largestScrapShortEdge:r.stats.largestScrapShortEdge,wholeStripScraps:r.stats.wholeStripScraps,wasteArea:r.stats.wasteArea}));
    return best;
  }

  window.SpeedArtiCutEngine={optimize,classifyFree,validateConfig,validateRows,_internals:{rectFits,splitOptions,orientations}};
})();
