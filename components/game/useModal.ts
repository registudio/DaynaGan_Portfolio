'use client';
import { useEffect, useRef } from 'react';

/** Focus containment, restoration, Escape and gamepad navigation for every game dialog. */
export function useModal(close:()=>void) {
  const ref=useRef<HTMLDivElement>(null), closeRef=useRef(close);
  closeRef.current=close;
  useEffect(()=>{
    const root=ref.current;if(!root)return;
    const previous=document.activeElement as HTMLElement|null;
    const controls=()=>Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, textarea, summary, [tabindex="0"]')).filter(e=>e.getClientRects().length>0);
    (controls()[0]??root).focus();
    const move=(delta:number)=>{
      const list=controls();if(!list.length)return;
      const index=list.indexOf(document.activeElement as HTMLElement);
      list[(index+delta+list.length)%list.length].focus();
    };
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRef.current();}
      if(e.key==='Tab'){e.preventDefault();e.stopPropagation();move(e.shiftKey?-1:1);}
    };
    document.addEventListener('keydown',key,true);
    let raf=0,previousButtons=new Set<number>();
    const poll=()=>{
      const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);
      const buttons=new Set<number>();pad?.buttons.forEach((b,i)=>{if(b.pressed)buttons.add(i);});
      for(const b of buttons) if(!previousButtons.has(b)) {
        const el=document.activeElement as HTMLInputElement|null;
        if(b===12)move(-1);if(b===13)move(1);
        if(b===14||b===15){
          if(el?.tagName==='INPUT'&&el.type==='range'){
            const value=Math.min(+el.max,Math.max(+el.min,+el.value+(b===15?1:-1)*Number(el.step||1)));
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,String(value));
            el.dispatchEvent(new Event('input',{bubbles:true}));
            el.dispatchEvent(new Event('change',{bubbles:true}));
          } else move(b===15?1:-1);
        }
        if(b===0 && el && root.contains(el))el.click();
        if(b===1)closeRef.current();
      }
      previousButtons=buttons;raf=requestAnimationFrame(poll);
    };
    // Seed held buttons so the button that opened a modal cannot activate its first control.
    const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);
    pad?.buttons.forEach((b,i)=>{if(b.pressed)previousButtons.add(i);});
    raf=requestAnimationFrame(poll);
    return ()=>{cancelAnimationFrame(raf);document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus();};
  },[]);
  return ref;
}
