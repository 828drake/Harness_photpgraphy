/** Session selection, calendar rendering, time slots, and booking submission. */
(async () => {
  const { api, alertBox, formatDate, formatTime } = window.HP;
  const daysEl = document.getElementById('calendar-days');
  const monthEl = document.getElementById('calendar-month');
  const prev = document.getElementById('calendar-prev');
  const next = document.getElementById('calendar-next');
  const timesEl = document.getElementById('times-grid');
  const selectionLabel = document.getElementById('selected-day-label');
  const summary = document.getElementById('book-summary-date');
  const form = document.getElementById('booking-form');
  const submit = document.getElementById('booking-submit');
  let config;
  try { config = await api('/api/config'); }
  catch (e) { alertBox('booking-alert', `${e.message} Start the Node server to enable live booking.`); return; }
  const today = config.today;
  const origin = new Date(`${today}T12:00:00Z`);
  let displayed = new Date(Date.UTC(origin.getUTCFullYear(), origin.getUTCMonth(), 1));
  let selectedDate = '';
  let selectedTime = '';
  let type = 'portraits';
  let loadSerial = 0;
  const iso = date => `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  const offset = date => Math.round((date - origin) / 86400000);
  const tz = config.timeZone.replace(/_/g, ' ').replace(/\//g, ' / ');
  document.getElementById('calendar-timezone').textContent = tz;

  // Calendar date selection
  function calendar() {
    monthEl.textContent = displayed.toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
    const firstDow = displayed.getUTCDay();
    const count = new Date(Date.UTC(displayed.getUTCFullYear(), displayed.getUTCMonth()+1, 0)).getUTCDate();
    daysEl.replaceChildren();
    for (let i=0; i<firstDow; i++) {
      const blank = document.createElement('span'); blank.className = 'calendar-day is-outside'; daysEl.append(blank);
    }
    for (let day=1; day<=count; day++) {
      const date = new Date(Date.UTC(displayed.getUTCFullYear(),displayed.getUTCMonth(),day));
      const key = iso(date); const distant = offset(date);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'calendar-day'; btn.textContent = day;
      btn.setAttribute('aria-label', formatDate(key));
      btn.disabled = distant < 2 || distant > 120;
      if (key === today) btn.classList.add('is-today');
      if (selectedDate === key) { btn.classList.add('is-selected'); btn.setAttribute('aria-pressed','true'); }
      btn.addEventListener('click', () => chooseDate(key));
      daysEl.append(btn);
    }
    const monthDelta = (displayed.getUTCFullYear()-origin.getUTCFullYear())*12 + displayed.getUTCMonth()-origin.getUTCMonth();
    prev.disabled = monthDelta <= 0;
    next.disabled = monthDelta >= 4;
  }
  // Fetch and display available appointment times
  async function slots() {
    const serial = ++loadSerial;
    selectedTime = '';
    summary.value = selectedDate ? `${formatDate(selectedDate)} · Select a time` : 'Choose a date & time';
    if (!selectedDate) { selectionLabel.textContent = 'Choose a date on the calendar'; timesEl.innerHTML = '<p class="empty-times">Select a date to see available times.</p>'; return; }
    selectionLabel.textContent = formatDate(selectedDate);
    timesEl.innerHTML = '<p class="empty-times">Checking availability...</p>';
    try {
      const result = await api(`/api/availability?date=${encodeURIComponent(selectedDate)}&type=${encodeURIComponent(type)}`);
      if (serial !== loadSerial) return;
      timesEl.replaceChildren();
      if (!result.slots.length) { timesEl.innerHTML = '<p class="empty-times">No openings on this date. Try another day!</p>'; return; }
      for (const slot of result.slots) {
        const btn = document.createElement('button');btn.type = 'button';btn.className = 'time-button';
        btn.textContent = slot.label;
        btn.addEventListener('click', () => {
          selectedTime = slot.value;
          timesEl.querySelectorAll('button').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed','false'); });
          btn.classList.add('is-active');btn.setAttribute('aria-pressed','true');
          summary.value = `${formatDate(selectedDate)} · ${formatTime(selectedTime)}`;
          alertBox('booking-alert', '');
        });
        timesEl.append(btn);
      }
    } catch (e) { if (serial === loadSerial) timesEl.innerHTML = `<p class="empty-times">Unable to load available times. Please try another date.</p>`; }
  }
  function chooseDate(date) { selectedDate = date; calendar(); slots(); alertBox('booking-alert',''); }
  prev.addEventListener('click', () => { displayed = new Date(Date.UTC(displayed.getUTCFullYear(), displayed.getUTCMonth()-1, 1)); calendar(); });
  next.addEventListener('click', () => { displayed = new Date(Date.UTC(displayed.getUTCFullYear(), displayed.getUTCMonth()+1, 1)); calendar(); });
  document.querySelectorAll('input[name="session"]').forEach(input => input.addEventListener('change', () => {
    type = input.value;
    document.querySelectorAll('.session-option').forEach(option => option.classList.toggle('selected', option.contains(input) && input.checked));
    slots();
  }));
  // Validate and submit a booking
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!selectedDate || !selectedTime) { alertBox('booking-alert', 'Please select a date and an available time first.'); return; }
    const payload = {
      name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value,
      type, date: selectedDate, time: selectedTime, notes: form.elements.notes.value, website: form.elements.website.value,
    };
    submit.disabled = true;submit.textContent = 'CONFIRMING YOUR SESSION...';alertBox('booking-alert','');
    try {
      const result = await api('/api/bookings', { method:'POST', body:JSON.stringify(payload) });
      alertBox('booking-alert', `You're booked! Your confirmation number is ${result.bookingId}. ${formatDate(selectedDate)} at ${formatTime(selectedTime)}. We look forward to seeing you!`, 'success');
      form.reset(); type = 'portraits'; document.querySelectorAll('.session-option').forEach(option => option.classList.toggle('selected', option.querySelector('input').checked)); selectedDate = ''; selectedTime = ''; slots();calendar();
      document.getElementById('booking-alert').scrollIntoView({behavior:'smooth',block:'center'});
    } catch (err) {
      alertBox('booking-alert', err.message);
      if (/slot|available|date|time/i.test(err.message)) slots();
    } finally { submit.disabled = false; submit.innerHTML = 'CONFIRM MY SESSION <span>↗</span>'; }
  });
  calendar();
})();
