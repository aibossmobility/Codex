/* Small, optional Papa Life Digital Brian text launcher. No paid providers or storage. */
(() => {
  if (window.__papaPhoneReady) return;
  window.__papaPhoneReady = true;
  const style = document.createElement('style');
  style.textContent = '#papa-phone{position:fixed;right:16px;bottom:16px;z-index:9000;border:2px solid #e7c56e;border-radius:100px;background:#183a27;color:#fff5db;display:flex;align-items:center;gap:9px;padding:9px 16px 9px 10px;min-height:56px;box-shadow:0 10px 32px #0008;font:800 14px system-ui,sans-serif;cursor:pointer}#papa-phone:hover{background:#295537}#papa-phone svg{width:34px;height:34px;border-radius:50%;padding:7px;background:#f0ce7b;color:#183a27}#papa-phone-conversation{display:none;position:fixed;z-index:9001;right:12px;bottom:85px;width:min(365px,calc(100vw - 24px));max-height:min(610px,calc(100dvh - 105px));flex-direction:column;background:#19291f;color:#fff5dd;border:2px solid #e7c56e;border-radius:20px;box-shadow:0 12px 40px #0009;overflow:hidden;font:14px/1.5 system-ui,sans-serif}#papa-phone-conversation[data-open=true]{display:flex}#papa-phone-conversation header{display:flex;align-items:center;gap:11px;background:#284532;padding:12px}#papa-phone-conversation header img{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1px solid #e7c56e}#papa-phone-conversation header strong{font-size:17px}#papa-phone-conversation header small{display:block;color:#e2cea9}#papa-phone-conversation header button{margin-left:auto;color:white;background:transparent;border:1px solid #b9a77c;border-radius:50%;width:35px;height:35px;font-size:23px;cursor:pointer}#papa-phone-conversation .body{overflow:auto;padding:15px}#papa-phone-conversation p{margin:0 0 11px}#papa-phone-conversation .clarify{color:#d9cbb4;font-size:12px}#papa-phone-conversation label{font-weight:800;display:block;margin-bottom:6px}#papa-phone-conversation textarea{box-sizing:border-box;width:100%;background:#101d14;color:white;padding:11px;border:1px solid #d9bd81;border-radius:10px;font:14px system-ui;resize:vertical;min-height:86px}#papa-phone-conversation .submit{width:100%;background:#f0ce7b;color:#13261c;min-height:44px;margin:9px 0 13px;border:0;border-radius:9px;font-weight:800;cursor:pointer}#papa-phone-conversation .submit:disabled{opacity:.6;cursor:wait}#papa-phone-conversation .reply{display:none;background:#314233;border-left:3px solid #e7c56e;border-radius:0 8px 8px 0;padding:12px;margin-bottom:12px;white-space:pre-wrap}#papa-phone-conversation .reply[data-show=true]{display:block}#papa-phone-conversation a{color:#f1d78a;font-weight:750;margin-right:13px}#papa-phone:focus-visible,#papa-phone-conversation :focus-visible{outline:3px solid #ffcf60;outline-offset:3px}#papa-phone[hidden]{display:none!important}@media(max-width:480px){#papa-phone{right:12px;bottom:max(12px,env(safe-area-inset-bottom));padding:8px 11px;font-size:12px;min-height:50px}#papa-phone-conversation{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 62px);max-height:calc(100dvh - 93px)}}';
  document.head.appendChild(style);
  const btn=document.createElement('button');
  btn.id='papa-phone';btn.type='button';btn.setAttribute('aria-controls','papa-phone-conversation');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Talk with Digital Brian — open free prepared text guidance');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19 19 0 0 1-8.6-3.1 19 19 0 0 1-6-6A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13 1 .39 2 .78 3a2 2 0 0 1-.45 2.11L8.2 10.1a16 16 0 0 0 5.7 5.7l1.32-1.23a2 2 0 0 1 2.11-.45c.97.39 1.98.65 3 .78a2 2 0 0 1 1.67 1.79Z"/></svg><span>Talk with Digital Brian</span>';
  const panel=document.createElement('section');
  panel.id='papa-phone-conversation';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Digital Brian conversation');panel.setAttribute('aria-modal','false');panel.dataset.open='false';
  panel.innerHTML='<header><img src="/images/brian-keith-hill.png" alt="Brian Keith Hill"><div><strong>Digital Brian</strong><small>Free Papa Life guidance</small></div><button type="button" aria-label="Close Digital Brian">×</button></header><div class="body"><p>I’m Brian’s digital counterpart, not Brian himself. What would you like to think through?</p><p class="clarify">Prepared text guidance only. No live voice call, no AI credits, and no message is sent to Brian.</p><label for="papa-phone-input">Your question</label><textarea id="papa-phone-input" rows="3" maxlength="2000" placeholder="What would be one helpful next step?"></textarea><button class="submit" type="button">Get a next step</button><div class="reply" role="status" aria-live="polite" data-show="false"></div><a href="https://papalifecoach.com/house">Explore the house</a><a href="https://papalifecoach.com/assessment">2-minute check-in</a><p class="clarify" style="margin-top:12px">You decide when to continue. Close this anytime.</p></div>';
  document.body.append(panel,btn);
  const close=panel.querySelector('header button');
  const input=panel.querySelector('textarea');
  const submit=panel.querySelector('.submit');
  const reply=panel.querySelector('.reply');
  let open=false;
  const show=(next,refocus=true)=>{open=Boolean(next);panel.dataset.open=String(open);btn.setAttribute('aria-expanded',String(open));if(refocus)(open?input:btn).focus();};
  btn.addEventListener('click',()=>show(!open));
  close.addEventListener('click',()=>show(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)show(false);});
  submit.addEventListener('click',async()=>{
    if(!input.value.trim()){input.focus();return;}
    submit.disabled=true;submit.textContent='Finding a next step…';
    reply.dataset.show='true';reply.textContent='Preparing guidance…';
    try{
      const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.value.trim()})});
      const result=await response.json();
      if(!response.ok||!result.ok||result.provider!=='scripted-guidance'||result.live_ai_enabled!==false||result.conversation_saved!==false)throw Error('Backend not safe');
      reply.textContent=String(result.reply);
    }catch{
      reply.textContent='Prepared guidance is unavailable right now. You can still explore the house or take the Papa Life check-in.';
    }finally{submit.disabled=false;submit.textContent='Get a next step';}
  });
  // Avoid doubling controls on React screens which already supply their own Twin launcher.
  const dedupe=()=>{
    const external=[...document.querySelectorAll('button')].some(x=>x!==btn&&!panel.contains(x)&&/Talk with Brian.s Twin/i.test(x.textContent||''));
    btn.hidden=external;panel.hidden=external;if(external)show(false,false);
  };
  dedupe();
  let checks=0;const timer=setInterval(()=>{dedupe();if(++checks>14)clearInterval(timer);},400);
})();
