/** Gallery filters, accessible photo cards, and full-screen image viewer. */
(async () => {
  const { api } = window.HP;
  const grid = document.getElementById('gallery-grid');
  const count = document.getElementById('gallery-count');
  const filters = [...document.querySelectorAll('.filter-button')];
  const lightbox = document.getElementById('lightbox');
  const picture = document.getElementById('lightbox-image');
  const caption = document.getElementById('lightbox-caption');
  let photos = [], visible = [], activeIndex = 0;
  const categories = {portraits:'Portraits',couples:'Couples',families:'Families',celebrations:'Celebrations',landscapes:'Landscapes'};
  // Full-screen gallery viewer
  function open(index) { activeIndex = index; showPicture(); lightbox.hidden = false; document.body.style.overflow = 'hidden'; document.getElementById('lightbox-close').focus(); }
  function close() { lightbox.hidden = true; document.body.style.overflow = ''; }
  function showPicture() { const p=visible[activeIndex]; if (!p) return; picture.src=p.src;picture.alt=p.title;caption.textContent=p.title; }
  const move = delta => { activeIndex=(activeIndex+delta+visible.length)%visible.length;showPicture(); };
  document.getElementById('lightbox-close').addEventListener('click', close);
  document.getElementById('lightbox-prev').addEventListener('click', () => move(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => move(1));
  lightbox.addEventListener('click',e=>{if(e.target===lightbox)close();});
  document.addEventListener('keydown',e=>{if(lightbox.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1);});
  // Filter and render photo cards
  function render(category = 'all') {
    visible = category === 'all' ? photos : photos.filter(photo => photo.category === category);
    grid.replaceChildren(); count.textContent = `${visible.length} ${visible.length===1?'PHOTOGRAPH':'PHOTOGRAPHS'}`;
    if (!visible.length) { grid.innerHTML='<p class="gallery-loading">More stories coming soon. Check back later!</p>';return; }
    visible.forEach((p,i) => {
      const item = document.createElement('button');item.type='button';item.className='gallery-card';
      item.setAttribute('aria-label',`View photograph: ${p.title}`); item.style.border='0';item.style.padding='0';item.style.textAlign='left';
      const img=document.createElement('img'); img.src=p.src;img.alt=p.title;img.loading=i<3?'eager':'lazy';
      const details=document.createElement('span');details.className='gallery-card-info';
      const nameWrap=document.createElement('span'),title=document.createElement('strong'),label=document.createElement('small');
      title.textContent=p.title;label.textContent=(p.sample ? 'Sample · ' : '')+(categories[p.category]||'Photography');nameWrap.append(title,label);
      const magnify=document.createElement('span');magnify.className='gallery-zoom';magnify.textContent='↗';
      details.append(nameWrap,magnify);item.append(img,details);
      item.addEventListener('click',()=>open(i));grid.append(item);
    });
  }
  filters.forEach(btn=>btn.addEventListener('click',()=>{
    filters.forEach(other=>{other.classList.toggle('is-active',other===btn);other.setAttribute('aria-pressed',String(other===btn));});
    render(btn.dataset.filter);
  }));
  try { const response=await api('/api/gallery');photos=response.photos;render(); }
  catch {grid.innerHTML='<p class="gallery-loading">The gallery could not load. Please try again shortly.</p>';}
})();
