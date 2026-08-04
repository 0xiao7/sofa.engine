(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SoFaScratchpad=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SUBJECTS=new Set(['會計學概要','稅務相關法規概要','記帳相關法規概要']);
  const EMPTY=()=>({version:1,strokes:[]});
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

  function isScratchpadSubject(subject){return SUBJECTS.has(String(subject||'').trim());}

  function scratchpadStorageKey(identity){
    const user=encodeURIComponent(String(identity?.userId||'guest'));
    const exam=encodeURIComponent(String(identity?.examKey||''));
    const question=encodeURIComponent(String(identity?.questionId||''));
    return `sofa_question_scratchpad_v1:${user}:${exam}:${question}`;
  }

  class ScratchpadState{
    constructor({storage}={}){
      this.storage=storage||null;
      this.identity=null;
      this.document=EMPTY();
      this.revision=0;
      this.undoStack=[];
      this.redoStack=[];
      this.activeStroke=null;
      this.dirty=false;
    }
    _snapshot(){return clone(this.document);}
    _remember(){
      this.undoStack.push(this._snapshot());
      if(this.undoStack.length>80)this.undoStack.shift();
      this.redoStack=[];
    }
    setIdentity(identity){
      this.identity={...identity};
      this.document=EMPTY();
      this.revision=0;
      this.undoStack=[];
      this.redoStack=[];
      this.activeStroke=null;
      this.dirty=false;
      if(!this.storage)return this.document;
      try{
        const saved=JSON.parse(this.storage.getItem(scratchpadStorageKey(this.identity))||'null');
        if(saved?.document?.version===1&&Array.isArray(saved.document.strokes)){
          this.document=clone(saved.document);
          this.revision=Number(saved.revision)||0;
          this.dirty=!!saved.pending;
        }
      }catch(_error){}
      return this.document;
    }
    _point({x,y,pressure,width,height}){
      return [
        Number(clamp((Number(x)||0)/Math.max(1,Number(width)||1)).toFixed(6)),
        Number(clamp((Number(y)||0)/Math.max(1,Number(height)||1)).toFixed(6)),
        Number(clamp(pressure==null?0.5:pressure).toFixed(6)),
      ];
    }
    beginStroke(input){
      this._remember();
      this.activeStroke={
        id:`s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,
        tool:input.tool==='highlighter'?'highlighter':'pen',
        color:String(input.color||'#173143'),
        width:Math.max(0.001,Math.min(0.1,Number(input.strokeWidth)||0.008)),
        points:[this._point(input)],
      };
      this.document.strokes.push(this.activeStroke);
      this.dirty=true;
      return this.activeStroke;
    }
    appendPoint(input){
      if(!this.activeStroke)return;
      const point=this._point(input);
      const last=this.activeStroke.points[this.activeStroke.points.length-1];
      if(!last||last[0]!==point[0]||last[1]!==point[1])this.activeStroke.points.push(point);
      this.dirty=true;
    }
    endStroke(){this.activeStroke=null;this.saveLocal();}
    undo(){
      if(!this.undoStack.length)return false;
      this.redoStack.push(this._snapshot());
      this.document=this.undoStack.pop();this.dirty=true;this.saveLocal();return true;
    }
    redo(){
      if(!this.redoStack.length)return false;
      this.undoStack.push(this._snapshot());
      this.document=this.redoStack.pop();this.dirty=true;this.saveLocal();return true;
    }
    eraseAt({x,y,width,height,radius=0.035}){
      const target=this._point({x,y,width,height,pressure:0.5});
      const before=this.document.strokes.length;
      const kept=this.document.strokes.filter(stroke=>!(stroke.points||[]).some(point=>Math.hypot(point[0]-target[0],point[1]-target[1])<=radius));
      if(kept.length===before)return false;
      this._remember();this.document.strokes=kept;this.dirty=true;this.saveLocal();return true;
    }
    clear(){
      if(!this.document.strokes.length)return false;
      this._remember();this.document=EMPTY();this.dirty=true;this.saveLocal();return true;
    }
    replace(document,revision=0,{pending=false}={}){
      this.document=document?.version===1&&Array.isArray(document.strokes)?clone(document):EMPTY();
      this.revision=Number(revision)||0;this.undoStack=[];this.redoStack=[];this.activeStroke=null;this.dirty=!!pending;
      this.saveLocal({pending});return this.document;
    }
    saveLocal({pending=true}={}){
      if(!this.storage||!this.identity?.questionId)return false;
      try{
        this.storage.setItem(scratchpadStorageKey(this.identity),JSON.stringify({document:this.document,revision:this.revision,pending:!!pending,updatedAt:Date.now()}));
        return true;
      }catch(_error){return false;}
    }
    markSynced(revision){this.revision=Number(revision)||this.revision;this.dirty=false;this.saveLocal({pending:false});}
  }

  return {ScratchpadState,scratchpadStorageKey,isScratchpadSubject,EMPTY};
});
