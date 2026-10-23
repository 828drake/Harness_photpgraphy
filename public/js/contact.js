/** Public contact information and contact-form submission. */
(async () => {
  const { api, alertBox } = window.HP;
  const email = document.getElementById('contact-email');
  email.textContent = 'mandydsh@sbcglobal.net';
  email.href = 'mailto:mandydsh@sbcglobal.net';
  // Load configured business contact details
  try {
    const config = await api('/api/config');
    if (config.phone) {
      document.getElementById('phone-row').hidden = false;
      const link=document.getElementById('contact-phone');link.textContent=config.phone;link.href=`tel:${config.phone.replace(/[^\d+]/g,'')}`;
    }
    if (config.location) { document.getElementById('location-row').hidden=false;document.getElementById('contact-location').textContent=config.location; }
    if (config.instagram) {
      document.getElementById('instagram-row').hidden=false;
      const link=document.getElementById('contact-instagram');
      const handle=config.instagram.replace(/^@/,'').replace(/^https?:\/\/[^/]+\//,'').replace(/\/$/,'');
      link.textContent=`@${handle.replace(/\//g,'')} ↗`;
      link.href=`https://www.instagram.com/${encodeURIComponent(handle.replace(/\//g,''))}/`;
    }
  } catch { /* Form will display server errors if submitted. */ }
  // Contact form submission
  const form=document.getElementById('contact-form'),submit=document.getElementById('contact-submit');
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const payload=Object.fromEntries(new FormData(form).entries());
    submit.disabled=true;submit.textContent='SENDING YOUR MESSAGE...';alertBox('contact-alert','');
    try { await api('/api/contact',{method:'POST',body:JSON.stringify(payload)});form.reset();alertBox('contact-alert',"Message received! Thanks for reaching out. I'll be in touch soon.",'success'); }
    catch(err){alertBox('contact-alert',err.message);}
    finally{submit.disabled=false;submit.innerHTML='SEND YOUR MESSAGE <span>↗</span>';}
  });
})();
