(function(){
  const QA_VERSION='2026-09-04.3';
  const STORAGE_KEY='speedarti-cut-demo-qa-validation';
  const runtimeIssues=[];
  let lastReport=null;

  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const n=v=>Number(v);
  const finite=v=>Number.isFinite(Number(v));
  const statusOrder={BLOCKING:4,WARNING:3,VALIDATE:2,OK:1};
  const statusLabel={BLOCKING:'BLOQUANT',WARNING:'AVERTISSEMENT',VALIDATE:'À VALIDER',OK:'OK'};

  function check(id,domain,status,label,detail=''){
    return {id,domain,status,label,detail};
  }

  function hashString(input){
    let h=2166136261;
    for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,'0');
  }

  function getApi(){return window.SpeedArtiDemoAPI||null;}
  function getState(){return getApi()?.getState?.()||{pieces:[],result:null};}
  function getConfig(){return getApi()?.getConfig?.()||{};}

  function requestedCount(pieces){return pieces.reduce((sum,p)=>sum+Math.max(0,Math.floor(n(p.qty)||0)),0);}
  function rectsOverlap(a,b){return a.x < b.x+b.w-1e-6 && a.x+a.w > b.x+1e-6 && a.y < b.y+b.h-1e-6 && a.y+a.h > b.y+1e-6;}

  function staticChecks(report){
    const requiredIds=['stepsNav','projectName','panelSearch','panelFamilyFilter','panelManufacturerFilter','panelThicknessFilter','catalogResultCount','panelProduct','panelLength','panelWidth','panelThickness','panelPrice','piecesBody','kerf','trimLeft','trimRight','trimTop','trimBottom','scrapMinL','scrapMinW','scrapMinArea','emptyResult','resultArea','technicalSummary','scrapList','qaReportBody','qaGlobalStatus'];
    const missing=requiredIds.filter(id=>!document.getElementById(id));
    report.push(check('MOD-001','Module',missing.length?'BLOCKING':'OK','Structure DOM obligatoire',missing.length?`Éléments absents : ${missing.join(', ')}`:'Tous les éléments indispensables sont présents.'));
    report.push(check('MOD-002','Module',window.SpeedArtiCutEngine?.optimize?'OK':'BLOCKING','Moteur de découpe chargé',window.SpeedArtiCutEngine?.optimize?'SpeedArtiCutEngine disponible.':'Le moteur SpeedArtiCutEngine est introuvable.'));
    const catalog=window.SPEEDARTI_PANEL_CATALOG;
    report.push(check('CAT-001','Catalogue',Array.isArray(catalog)&&catalog.length?'OK':'BLOCKING','Catalogue panneaux chargé',Array.isArray(catalog)?`${catalog.length} références disponibles.`:'Catalogue absent.'));
    const demoRefs=Array.isArray(catalog)?catalog.filter(p=>p.demo).length:0;
    report.push(check('CAT-002','Catalogue',demoRefs?'VALIDATE':'OK','Références de démonstration',demoRefs?`${demoRefs} référence(s) sont encore marquées démo.`:'Aucune référence n’est marquée démo.'));
    report.push(check('CAT-003','Catalogue',Array.isArray(catalog)&&catalog.length>=200?'OK':'WARNING','Volume catalogue',Array.isArray(catalog)?`${catalog.length} références chargées.`:'Catalogue indisponible.'));
    const filterIds=['panelSearch','panelFamilyFilter','panelManufacturerFilter','panelThicknessFilter'];
    report.push(check('CAT-004','Catalogue',filterIds.every(id=>!!document.getElementById(id))?'OK':'WARNING','Recherche et filtres catalogue',filterIds.every(id=>!!document.getElementById(id))?'Recherche texte + filtres type/fabricant/épaisseur disponibles.':'Un ou plusieurs filtres catalogue sont absents.'));
    const connectorButtons=$$('.integration-btn[data-action]');
    const expected=['chiffrage','devis','supplier_quote','supplier_order'];
    const got=connectorButtons.map(b=>b.dataset.action);
    const missingConnectors=expected.filter(x=>!got.includes(x));
    report.push(check('CONN-001','Connecteurs',missingConnectors.length?'BLOCKING':'OK','4 passerelles SpeedArti présentes',missingConnectors.length?`Passerelles absentes : ${missingConnectors.join(', ')}`:'Chiffrage, devis, demande fournisseur et commande fournisseur présents.'));
    report.push(check('CONN-002','Connecteurs','VALIDATE','Connecteurs production simulés','La démo n’écrit volontairement dans aucune table SpeedArti. Le raccord production devra être validé séparément.'));
    report.push(check('RESP-001','Interface','VALIDATE','Contrôle smartphone réel','Les règles responsive sont présentes, mais la validation finale doit inclure un test réel iPhone/Android avant publication de la démo.'));
    const strategy=$('input[name="strategy"]:checked')?.value;
    const allowedStrategies=['balanced','material','scraps','cuts'];
    report.push(check('OPT-PARAM-001','Atelier',allowedStrategies.includes(strategy)?'OK':'BLOCKING','Stratégie d’optimisation valide',allowedStrategies.includes(strategy)?`Stratégie active : ${strategy}.`:'Aucune stratégie valide sélectionnée.'));
  }

  function projectAndPanelChecks(report,cfg){
    const project=($('#projectName')?.value||'').trim();
    report.push(check('PROJ-001','Projet',project?'OK':'BLOCKING','Nom du projet renseigné',project||'Le nom du projet est obligatoire.'));
    const selected=$('#panelProduct')?.value;
    const product=(window.SPEEDARTI_PANEL_CATALOG||[]).find(p=>p.id===selected);
    report.push(check('PAN-001','Panneau',product?'OK':'BLOCKING','Référence panneau sélectionnée',product?`${product.manufacturer||product.supplier} · ${product.label}`:'Aucune référence catalogue valide sélectionnée.'));

    const dimsOk=finite(cfg.panelW)&&finite(cfg.panelH)&&cfg.panelW>0&&cfg.panelH>0;
    report.push(check('PAN-002','Panneau',dimsOk?'OK':'BLOCKING','Dimensions panneau valides',dimsOk?`${cfg.panelW} × ${cfg.panelH} mm`:'Longueur/largeur invalides.'));
    const thickOk=finite(cfg.panelThickness)&&cfg.panelThickness>0;
    report.push(check('PAN-003','Panneau',thickOk?'OK':'BLOCKING','Épaisseur panneau valide',thickOk?`${cfg.panelThickness} mm`:'Épaisseur invalide.'));
    const priceOk=finite(cfg.panelPrice)&&cfg.panelPrice>=0;
    report.push(check('PAN-004','Panneau',priceOk?(cfg.panelPrice===0?'VALIDATE':'OK'):'BLOCKING','Prix panneau',priceOk?(cfg.panelPrice===0?'Prix à 0 € : acceptable pour une simulation, à valider avant usage économique.':`${cfg.panelPrice.toFixed(2)} € HT`):'Prix invalide.'));
    if(product&&product.id!=='custom'&&dimsOk&&thickOk){
      const altered=Number(product.length)!==Number(cfg.panelW)||Number(product.width)!==Number(cfg.panelH)||Number(product.thickness)!==Number(cfg.panelThickness);
      report.push(check('PAN-005','Panneau',altered?'WARNING':'OK','Format conforme à la référence catalogue',altered?`Catalogue : ${product.length} × ${product.width} × ${product.thickness} mm · saisi : ${cfg.panelW} × ${cfg.panelH} × ${cfg.panelThickness} mm. Sélectionner “Panneau personnalisé” si la modification est volontaire.`:'Dimensions et épaisseur conformes à la référence sélectionnée.'));
    }

    const trims=['trimLeft','trimRight','trimTop','trimBottom'];
    const trimsFinite=trims.every(k=>finite(cfg[k])&&cfg[k]>=0);
    report.push(check('ATL-001','Atelier',trimsFinite?'OK':'BLOCKING','Purges numériques et non négatives',trimsFinite?`G ${cfg.trimLeft} · D ${cfg.trimRight} · H ${cfg.trimTop} · B ${cfg.trimBottom} mm`:'Une purge est invalide ou négative.'));
    const usableOk=dimsOk&&trimsFinite&&cfg.panelW>cfg.trimLeft+cfg.trimRight&&cfg.panelH>cfg.trimTop+cfg.trimBottom;
    report.push(check('ATL-002','Atelier',usableOk?'OK':'BLOCKING','Surface exploitable après purges',usableOk?`${cfg.panelW-cfg.trimLeft-cfg.trimRight} × ${cfg.panelH-cfg.trimTop-cfg.trimBottom} mm`:'Les purges rendent le panneau inexploitable.'));

    const kerfOk=finite(cfg.kerf)&&cfg.kerf>=0;
    report.push(check('ATL-003','Atelier',kerfOk?(cfg.kerf===0?'VALIDATE':'OK'):'BLOCKING','Trait de scie / kerf',kerfOk?(cfg.kerf===0?'Kerf à 0 mm : simulation possible, valeur atelier réelle à valider.':`${cfg.kerf} mm`):'Kerf invalide.'));
    report.push(check('ATL-004','Atelier','VALIDATE','Valeurs atelier Idea Bois','Le kerf et les purges exacts d’Idea Bois ne sont pas confirmés publiquement : conserver ces valeurs comme paramètres modifiables et les faire valider avant raccord fournisseur.'));

    const scrapOk=['scrapMinL','scrapMinW','scrapMinArea'].every(k=>finite(cfg[k])&&cfg[k]>=0);
    report.push(check('ATL-005','Atelier',scrapOk?'OK':'BLOCKING','Seuils de chute valides',scrapOk?`Mini ${cfg.scrapMinL} × ${cfg.scrapMinW} mm · ${cfg.scrapMinArea} m²`:'Un seuil de chute est invalide.'));
  }

  function piecesChecks(report,pieces,cfg){
    report.push(check('DEB-001','Débit',pieces.length?'OK':'BLOCKING','Liste de débit non vide',pieces.length?`${pieces.length} ligne(s) de pièces.`:'Ajoutez au moins une pièce.'));
    const reps=pieces.map(p=>(p.rep||'').trim()).filter(Boolean);
    const duplicates=[...new Set(reps.filter((r,i)=>reps.indexOf(r)!==i))];
    report.push(check('DEB-002','Débit',duplicates.length?'BLOCKING':'OK','Repères uniques',duplicates.length?`Repères dupliqués : ${duplicates.join(', ')}`:'Aucun repère dupliqué.'));

    const usableW=cfg.panelW-cfg.trimLeft-cfg.trimRight;
    const usableH=cfg.panelH-cfg.trimTop-cfg.trimBottom;
    pieces.forEach((p,index)=>{
      const tag=(p.rep||`L${index+1}`).replace(/[^A-Za-z0-9_-]/g,'_');
      const prefix=`PIECE-${tag}`;
      const rep=(p.rep||'').trim(), name=(p.name||'').trim();
      report.push(check(`${prefix}-01`,'Débit',rep?'OK':'BLOCKING',`${p.rep||`Ligne ${index+1}`} · repère`,rep||'Repère obligatoire.'));
      report.push(check(`${prefix}-02`,'Débit',name?'OK':'BLOCKING',`${p.rep||`Ligne ${index+1}`} · désignation`,name||'Désignation obligatoire.'));
      const dims=finite(p.length)&&finite(p.width)&&n(p.length)>0&&n(p.width)>0;
      report.push(check(`${prefix}-03`,'Débit',dims?'OK':'BLOCKING',`${p.rep||`Ligne ${index+1}`} · dimensions`,dims?`${p.length} × ${p.width} mm`:'Dimensions invalides.'));
      const qty=finite(p.qty)&&n(p.qty)>=1&&Number.isInteger(n(p.qty));
      report.push(check(`${prefix}-04`,'Débit',qty?'OK':'BLOCKING',`${p.rep||`Ligne ${index+1}`} · quantité`,qty?`${p.qty} unité(s)`:'La quantité doit être un entier ≥ 1.'));
      if(dims&&usableW>0&&usableH>0){
        const canRotate=p.rotation==='free' && !(cfg.panelGrain&&p.grain==='follow');
        const options=[[n(p.length),n(p.width)]];
        if(canRotate) options.push([n(p.width),n(p.length)]);
        const fits=options.some(([w,h])=>{
          const dw=usableW-w, dh=usableH-h;
          const sepW=dw>=-1e-6&&(Math.abs(dw)<=1e-6||dw+1e-6>=cfg.kerf);
          const sepH=dh>=-1e-6&&(Math.abs(dh)<=1e-6||dh+1e-6>=cfg.kerf);
          return sepW&&sepH;
        });
        report.push(check(`${prefix}-05`,'Débit',fits?'OK':'BLOCKING',`${p.rep} · pièce débitable dans le panneau`,fits?'Au moins une orientation est réalisable avec les purges et le kerf actuels.':`Pièce ${p.length} × ${p.width} mm impossible dans la zone utile ${usableW} × ${usableH} mm.`));
      }
      if(cfg.panelGrain&&p.grain==='follow'){
        report.push(check(`${prefix}-06`,'Débit','OK',`${p.rep} · sens du fil protégé`,'La rotation sera automatiquement interdite par le moteur, même si le champ Rotation est sur “Autorisée”.'));
      }
    });
    report.push(check('DEB-CHANT-001','Débit','VALIDATE','Codification des chants','Les chants sont encore saisis en texte libre dans la démo. Avant production, les 4 côtés G/D/H/B doivent être structurés et reliés aux références de chants.'));
  }

  function resultChecks(report,state,cfg){
    const result=state.result;
    if(!result){
      report.push(check('OPT-001','Optimisation','BLOCKING','Optimisation exécutée','Aucun résultat calculé : le module ne peut pas être validé intégralement avant un calcul réussi.'));
      return;
    }
    const requested=requestedCount(state.pieces);
    const placed=result.sheets.reduce((sum,s)=>sum+s.items.length,0);
    const impossible=result.impossible?.length||0;
    report.push(check('OPT-001','Optimisation','OK','Optimisation exécutée',`${result.sheets.length} panneau(x), variante ${result.variant||'—'}.`));
    report.push(check('OPT-002','Optimisation',impossible?'BLOCKING':'OK','Aucune pièce impossible',impossible?`${impossible} occurrence(s) impossible(s) : ${result.impossible.map(p=>p.rep).join(', ')}`:'Toutes les pièces sont plaçables.'));
    report.push(check('OPT-003','Optimisation',placed+impossible===requested?'OK':'BLOCKING','Conservation du nombre de pièces',`Demandées ${requested} · placées ${placed} · impossibles ${impossible}.`));

    const stats=result.stats||{};
    const numericStats=['pieceArea','scrapArea','wasteArea','grossArea','usableArea','trimArea','kerfArea','balanceError','yieldPct','cutCount'];
    const statsOk=numericStats.every(k=>finite(stats[k]));
    report.push(check('OPT-004','Optimisation',statsOk?'OK':'BLOCKING','Statistiques numériques valides',statsOk?'Aucun NaN/Infinity détecté.':'Une statistique est non numérique ou infinie.'));
    if(statsOk){
      const yieldOk=stats.yieldPct>=0&&stats.yieldPct<=100+1e-6;
      report.push(check('OPT-005','Optimisation',yieldOk?'OK':'BLOCKING','Rendement compris entre 0 et 100 %',`${stats.yieldPct.toFixed(3)} %`));
      const tol=Math.max(0.1,Math.abs(stats.usableArea)*1e-9);
      const balanced=Math.abs(stats.balanceError)<=tol;
      report.push(check('OPT-006','Optimisation',balanced?'OK':'BLOCKING','Conservation des surfaces',balanced?`Écart ${stats.balanceError.toFixed(6)} mm².`:`Écart matière anormal : ${stats.balanceError.toFixed(3)} mm².`));
    }

    let boundsErrors=[],overlapErrors=[],cutErrors=[];
    const minX=cfg.trimLeft,minY=cfg.trimTop,maxX=cfg.panelW-cfg.trimRight,maxY=cfg.panelH-cfg.trimBottom;
    result.sheets.forEach(sheet=>{
      sheet.items.forEach(item=>{
        if(item.x<minX-1e-6||item.y<minY-1e-6||item.x+item.w>maxX+1e-6||item.y+item.h>maxY+1e-6) boundsErrors.push(`P${sheet.index}/${item.rep}`);
      });
      for(let i=0;i<sheet.items.length;i++) for(let j=i+1;j<sheet.items.length;j++) if(rectsOverlap(sheet.items[i],sheet.items[j])) overlapErrors.push(`P${sheet.index}:${sheet.items[i].rep}/${sheet.items[j].rep}`);
      sheet.cuts.forEach((cut,idx)=>{
        const valid=finite(cut.x)&&finite(cut.y)&&finite(cut.length)&&cut.length>0&&finite(cut.kerf)&&cut.kerf>=0;
        const inside=cut.axis==='V' ? cut.x>=minX-1e-6&&cut.x<=maxX+1e-6&&cut.y>=minY-1e-6&&cut.y+cut.length<=maxY+1e-6 : cut.y>=minY-1e-6&&cut.y<=maxY+1e-6&&cut.x>=minX-1e-6&&cut.x+cut.length<=maxX+1e-6;
        if(!valid||!inside) cutErrors.push(`P${sheet.index}/C${idx+1}`);
      });
    });
    report.push(check('GEO-001','Géométrie',boundsErrors.length?'BLOCKING':'OK','Toutes les pièces restent dans la zone utile',boundsErrors.length?`Hors limites : ${boundsErrors.join(', ')}`:'Aucun dépassement détecté.'));
    report.push(check('GEO-002','Géométrie',overlapErrors.length?'BLOCKING':'OK','Aucun chevauchement de pièces',overlapErrors.length?`Chevauchements : ${overlapErrors.join(', ')}`:'Aucun chevauchement détecté.'));
    report.push(check('GEO-003','Géométrie',cutErrors.length?'BLOCKING':'OK','Traits de coupe géométriquement valides',cutErrors.length?`Coupes invalides : ${cutErrors.join(', ')}`:`${stats.cutCount} coupe(s) contrôlée(s).`));

    report.push(check('OUT-001','Sorties',result.sheets.length?'OK':'BLOCKING','Plans 2D générés',result.sheets.length?`${result.sheets.length} plan(s) panneau disponible(s).`:'Aucun plan généré.'));
    report.push(check('OUT-002','Sorties','VALIDATE','Export PDF atelier','La démo utilise l’impression navigateur pour produire un PDF. Le modèle PDF SpeedArti dédié reste à raccorder en production.'));
    report.push(check('STOCK-001','Chutes','VALIDATE','Stock réel des chutes','Les chutes sont calculées et identifiées mais leur écriture dans le module Stock SpeedArti est volontairement simulée dans la démo.'));
  }

  function runtimeChecks(report){
    if(runtimeIssues.length){
      runtimeIssues.slice(-20).forEach((issue,i)=>report.push(check(`RUN-${String(i+1).padStart(3,'0')}`,'Exécution',issue.status||'BLOCKING',issue.status==='WARNING'?'Avertissement d’exécution capturé':'Erreur JavaScript capturée',`${issue.message}${issue.source?` · ${issue.source}`:''}`)));
    }else report.push(check('RUN-001','Exécution','OK','Aucune erreur JavaScript capturée','Aucune erreur window.error / unhandledrejection enregistrée pendant cette session.'));
  }

  function buildFingerprint(report,state,cfg){
    const stable={version:QA_VERSION,form:{project:$('#projectName')?.value||'',panel:$('#panelProduct')?.value||'',cfg},pieces:state.pieces,result:state.result?{variant:state.result.variant,sheets:state.result.sheets.length,placed:state.result.sheets.reduce((a,s)=>a+s.items.length,0),impossible:state.result.impossible?.length||0,stats:state.result.stats}:null,checks:report.map(c=>[c.id,c.status,c.detail])};
    return hashString(JSON.stringify(stable));
  }

  function readManual(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))}catch(e){return null}}
  function writeManual(value){try{if(value)localStorage.setItem(STORAGE_KEY,JSON.stringify(value));else localStorage.removeItem(STORAGE_KEY);return true}catch(e){const text=String(e?.message||e||'Stockage local indisponible');if(!runtimeIssues.some(x=>x.message===text&&x.source==='localStorage QA'))runtimeIssues.push({message:text,source:'localStorage QA',status:'WARNING',date:new Date().toISOString()});return false;}}

  function runAll(){
    const report=[]; const state=getState(); const cfg=getConfig();
    staticChecks(report); projectAndPanelChecks(report,cfg); piecesChecks(report,state.pieces||[],cfg); resultChecks(report,state,cfg); runtimeChecks(report);
    report.sort((a,b)=>(statusOrder[b.status]-statusOrder[a.status])||a.domain.localeCompare(b.domain)||a.id.localeCompare(b.id));
    const fingerprint=buildFingerprint(report,state,cfg);
    let manual=readManual();
    if(manual&&manual.fingerprint!==fingerprint){manual=null;writeManual(null);}
    const counts={BLOCKING:0,WARNING:0,VALIDATE:0,OK:0}; report.forEach(c=>counts[c.status]++);
    let globalStatus='VALIDABLE';
    if(counts.BLOCKING) globalStatus='BLOCKED'; else if(counts.WARNING) globalStatus='CONTROL'; else if(manual) globalStatus='VALIDATED';
    lastReport={version:QA_VERSION,date:new Date().toISOString(),checks:report,counts,fingerprint,manual,globalStatus};
    render(lastReport);
    return lastReport;
  }

  function render(r){
    const body=$('#qaReportBody'); if(!body)return;
    const labels={BLOCKED:'BLOQUÉ',CONTROL:'À CONTRÔLER',VALIDABLE:'VALIDABLE POUR DÉMO',VALIDATED:'VALIDÉ POUR DÉMO'};
    const status=$('#qaGlobalStatus');
    status.textContent=labels[r.globalStatus]; status.dataset.status=r.globalStatus; const top=$('#qaTopBtn');if(top)top.textContent=`Rapport QA · ${labels[r.globalStatus]}`;
    $('#qaBlockingCount').textContent=r.counts.BLOCKING;
    $('#qaWarningCount').textContent=r.counts.WARNING;
    $('#qaValidateCount').textContent=r.counts.VALIDATE;
    $('#qaOkCount').textContent=r.counts.OK;
    $('#qaLastRun').textContent=new Date(r.date).toLocaleString('fr-FR');
    const manual=$('#qaManualState');
    manual.textContent=r.manual?`Validé manuellement le ${new Date(r.manual.date).toLocaleString('fr-FR')} · empreinte ${r.fingerprint}`:'Non validé manuellement';
    body.innerHTML=r.checks.map(c=>`<tr class="qa-${c.status.toLowerCase()}"><td><code>${c.id}</code></td><td>${c.domain}</td><td><span class="qa-badge ${c.status.toLowerCase()}">${statusLabel[c.status]}</span></td><td><strong>${escapeHtml(c.label)}</strong></td><td>${escapeHtml(c.detail)}</td></tr>`).join('');
    const validateBtn=$('#qaValidateBtn');
    if(validateBtn){validateBtn.disabled=!!(r.counts.BLOCKING||r.counts.WARNING);validateBtn.textContent=r.manual?'✓ Démo validée':'Valider le module pour démo';}
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}

  function validateManual(){
    const r=runAll();
    if(r.counts.BLOCKING||r.counts.WARNING){alert('Validation impossible : le rapport contient encore une balise BLOQUANTE ou AVERTISSEMENT.');return false;}
    const value={fingerprint:r.fingerprint,date:new Date().toISOString(),version:QA_VERSION}; if(!writeManual(value)){runAll();alert('Validation non enregistrée : le stockage local du navigateur est indisponible.');return false;} runAll(); return true;
  }

  function resetManual(){writeManual(null);runAll();}

  function exportReport(){
    const r=runAll();
    const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url;a.download=`rapport-validation-agencement-decoupe-${new Date().toISOString().slice(0,10)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function gate(action){
    const r=runAll();
    if(action==='optimize'){
      const pre=r.checks.filter(c=>['Module','Projet','Catalogue','Panneau','Atelier','Débit','Exécution'].includes(c.domain));
      return {ok:!pre.some(c=>c.status==='BLOCKING'||c.status==='WARNING'),report:r};
    }
    return {ok:!r.counts.BLOCKING&&!r.counts.WARNING,report:r};
  }

  function captureRuntimeError(message,source=''){
    const text=String(message||'Erreur inconnue');
    if(!runtimeIssues.some(x=>x.message===text&&x.source===source)) runtimeIssues.push({message:text,source,status:'BLOCKING',date:new Date().toISOString()});
    runAll();
  }

  function captureRuntimeWarning(message,source=''){
    const text=String(message||'Avertissement inconnu');
    if(!runtimeIssues.some(x=>x.message===text&&x.source===source)) runtimeIssues.push({message:text,source,status:'WARNING',date:new Date().toISOString()});
    runAll();
  }

  let runtimeListenersInstalled=false;
  function installRuntimeListeners(){
    if(runtimeListenersInstalled)return;runtimeListenersInstalled=true;
    window.addEventListener('error',e=>captureRuntimeError(e.message,e.filename?`${e.filename}:${e.lineno||''}`:''));
    window.addEventListener('unhandledrejection',e=>captureRuntimeError(e.reason?.message||e.reason||'Promise rejetée','unhandledrejection'));
  }

  function init(){
    installRuntimeListeners();
    $('#qaRunBtn')?.addEventListener('click',runAll);
    $('#qaExportBtn')?.addEventListener('click',exportReport);
    $('#qaValidateBtn')?.addEventListener('click',validateManual);
    $('#qaResetValidationBtn')?.addEventListener('click',resetManual);
    runAll();
  }

  window.SpeedArtiModuleValidation={init,runAll,gate,captureRuntimeError,captureRuntimeWarning,exportReport,validateManual,resetManual,getReport:()=>lastReport,version:QA_VERSION};
  installRuntimeListeners();
})();
