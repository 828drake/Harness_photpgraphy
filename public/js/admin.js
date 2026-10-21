(async () => {
  const {api, alertBox, esc, formatDate, formatTime} = window.HP;
  const loginView = document.getElementById('login-view');
  const dashboard = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const uploadForm = document.getElementById('upload-form');
  const uploadFile = document.getElementById('upload-file');
  let imageData = '';

  function displayLoggedIn(isLoggedIn) { loginView.hidden = isLoggedIn; dashboard.hidden = !isLoggedIn; }
  async function refresh() {
    const [gallery, bookings, messages, user] = await Promise.all([
      api('/api/gallery'), api('/api/admin/bookings'), api('/api/admin/messages'), api('/api/admin/me')
    ]);
    renderGallery(gallery.photos); renderBookings(bookings.bookings); renderMessages(messages.messages);
    const banner = document.getElementById('email-status');
    if (user.emailConfigured) { banner.className='admin-status ok';banner.textContent=`✓ Booking and contact email notifications are configured for ${user.adminEmail}.`; }
    else {banner.className='admin-status';banner.textContent='⚠ Email notifications are not configured yet. Your bookings and inquiries are saved here, but admin emails will not send until you complete the SMTP settings in .env.';}
  }
  async function checkAuth() {
    try { await api('/api/admin/me');displayLoggedIn(true);await refresh(); }
    catch {displayLoggedIn(false);}
  }
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();alertBox('login-alert','');
    const button=loginForm.querySelector('button');button.disabled=true;
    try {await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:document.getElementById('admin-password').value})});document.getElementById('admin-password').value='';displayLoggedIn(true);await refresh();}
    catch(err){alertBox('login-alert',err.message);}
    finally{button.disabled=false;}
  });
  document.getElementById('logout-button').addEventListener('click',async()=>{await api('/api/admin/logout',{method:'POST'});displayLoggedIn(false);});
  document.querySelectorAll('.admin-tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.admin-tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.tab-panel').forEach(x=>x.hidden=x.id!==`${btn.dataset.tab}-panel`);
  }));

  uploadFile.addEventListener('change',()=>{
    const file=uploadFile.files[0];imageData='';
    const preview=document.getElementById('upload-preview');
    if (!file){preview.hidden=true;document.getElementById('upload-placeholder').hidden=false;return;}
    if (file.size>8*1024*1024) {alertBox('upload-alert','The photo must be smaller than 8MB.');uploadFile.value='';return;}
    const reader=new FileReader();
    reader.onload=()=>{imageData=reader.result;preview.src=imageData;preview.hidden=false;document.getElementById('upload-placeholder').hidden=true;alertBox('upload-alert','');};
    reader.onerror=()=>alertBox('upload-alert','Could not read the photo.');
    reader.readAsDataURL(file);
  });
  uploadForm.addEventListener('submit',async e=>{
    e.preventDefault();
    if (!uploadForm.reportValidity())return;
    if (!imageData){alertBox('upload-alert','Please choose a photo first.');return;}
    const submit=document.getElementById('upload-submit');submit.disabled=true;submit.textContent='UPLOADING PHOTO...';
    try {
      await api('/api/admin/gallery',{method:'POST',body:JSON.stringify({title:document.getElementById('upload-title').value,category:document.getElementById('upload-category').value,featured:document.getElementById('upload-featured').checked,image:imageData})});
      uploadForm.reset();imageData='';document.getElementById('upload-preview').hidden=true;document.getElementById('upload-placeholder').hidden=false;
      alertBox('upload-alert','Your photo is live in the gallery!', 'success');await refresh();
    } catch(err){alertBox('upload-alert',err.message);}
    finally{submit.disabled=false;submit.innerHTML='PUBLISH PHOTO <span>↗</span>';}
  });
  function renderGallery(items) {
    document.getElementById('admin-gallery-count').textContent=`(${items.length})`;
    const grid=document.getElementById('admin-photos');grid.replaceChildren();
    if(!items.length){grid.innerHTML='<p class="admin-empty">No photos yet. Upload your first one!</p>';return;}
    for(const p of items){
      const card=document.createElement('div');card.className='admin-photo';
      card.innerHTML=`<img src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy"><div class="admin-photo-meta"><strong>${esc(p.title)}</strong><span>${esc(p.category)}${p.sample?' · starter sample':''}</span><button class="admin-delete" type="button">REMOVE PHOTO</button></div>`;
      card.querySelector('button').addEventListener('click',async()=>{
        if(!confirm(`Remove "${p.title}" from your gallery?`))return;
        try{await api('/api/admin/gallery/delete',{method:'POST',body:JSON.stringify({id:p.id})});await refresh();}
        catch(err){alert(err.message);}
      });grid.append(card);
    }
  }
  const bookingStatus = b=>b.status==='cancelled'?'<span class="admin-tag cancelled">Cancelled</span>':'<span class="admin-tag">Confirmed</span>';
  function renderBookings(items){
    const el=document.getElementById('admin-bookings');el.replaceChildren();
    if(!items.length){el.innerHTML='<p class="admin-empty">No bookings yet. When someone books a session, it will appear here.</p>';return;}
    for(const b of items){
      const card=document.createElement('article');card.className='admin-booking-card';
      const failed=b.notificationStatus!=='sent'?'<span class="admin-tag failed">Email not sent</span>':'';
      card.innerHTML=`<div><h3>${esc(b.name)} ${bookingStatus(b)} ${failed}</h3><p><strong>${esc(b.type)}</strong> · ${esc(formatDate(b.date))} at ${esc(formatTime(b.time))}</p><p>${esc(b.email)} · ${esc(b.phone)}</p>${b.notes?`<p>Notes: ${esc(b.notes)}</p>`:''}<small>BOOKING ID: ${esc(b.id.slice(0,8).toUpperCase())}</small></div><div class="admin-booking-actions"></div>`;
      const actions=card.querySelector('.admin-booking-actions');
      if(b.notificationStatus!=='sent'){
        const btn=document.createElement('button');btn.textContent='RETRY EMAIL';btn.addEventListener('click',async()=>{try{await api('/api/admin/resend',{method:'POST',body:JSON.stringify({id:b.id})});await refresh();}catch(err){alert(err.message);}});actions.append(btn);
      }
      if(b.status!=='cancelled'){
        const btn=document.createElement('button');btn.textContent='CANCEL SESSION';btn.addEventListener('click',async()=>{if(!confirm(`Cancel ${b.name}'s session on ${formatDate(b.date)}? This frees the time slot. Clients are not automatically emailed.`))return;try{await api('/api/admin/bookings/cancel',{method:'POST',body:JSON.stringify({id:b.id})});await refresh();}catch(err){alert(err.message);}});actions.append(btn);
      }
      el.append(card);
    }
  }
  function renderMessages(items){
    const el=document.getElementById('admin-messages');el.replaceChildren();
    if(!items.length){el.innerHTML='<p class="admin-empty">No inquiries yet. New contact messages will appear here.</p>';return;}
    for(const m of items){
      const card=document.createElement('article');card.className='admin-booking-card';
      card.innerHTML=`<div><h3>${esc(m.subject)} ${m.notificationStatus==='failed'?'<span class="admin-tag failed">Email not sent</span>':''}</h3><p>From <strong>${esc(m.name)}</strong> · <a href="mailto:${encodeURIComponent(m.email)}">${esc(m.email)}</a></p><p style="white-space:pre-wrap">${esc(m.message)}</p><small>RECEIVED: ${esc(new Date(m.createdAt).toLocaleString())}</small></div><div class="admin-booking-actions"></div>`;
      if(m.notificationStatus!=='sent'){
        const btn=document.createElement('button');btn.textContent='RETRY EMAIL';btn.addEventListener('click',async()=>{try{await api('/api/admin/resend',{method:'POST',body:JSON.stringify({id:m.id})});await refresh();}catch(err){alert(err.message);}});card.querySelector('.admin-booking-actions').append(btn);
      }
      el.append(card);
    }
  }
  await checkAuth();
})();
