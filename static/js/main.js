// SafeNet main JS: DOM interactions, charts, quiz, password checker, live counter

document.addEventListener('DOMContentLoaded', function(){
  // Theme toggle: restore saved theme
  const themeToggle = document.getElementById('theme-toggle')
  const applyTheme = (t) => {
    if(t === 'light') document.body.classList.add('light-theme')
    else document.body.classList.remove('light-theme')
  }
  const saved = localStorage.getItem('safenet_theme') || 'dark'
  applyTheme(saved)
  if(themeToggle){
    themeToggle.addEventListener('click', () => {
      const now = document.body.classList.contains('light-theme') ? 'dark' : 'light'
      applyTheme(now)
      localStorage.setItem('safenet_theme', now)
    })
  }
  // Smooth scroll for CTA buttons
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', e => {
      const sel = btn.getAttribute('data-scroll-to')
      const el = document.querySelector(sel)
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'})
    })
  })

  // Expandable threat cards
  document.querySelectorAll('.expand-card').forEach(card => {
    const head = card.querySelector('.expand-head')
    head.addEventListener('click', () => {
      const expanded = card.getAttribute('data-expanded') === 'true'
      card.setAttribute('data-expanded', expanded ? 'false' : 'true')
    })
  })

  // Password checker
  const pwInput = document.getElementById('pw-input')
  const pwFeedback = document.getElementById('pw-feedback')
  pwInput && pwInput.addEventListener('input', e => {
    const pw = e.target.value
    const result = checkPasswordStrength(pw)
    pwFeedback.textContent = `Strength: ${result.level}`
    pwFeedback.style.color = result.color
    pwFeedback.title = result.suggestion
  })

  // Live counter
  const phishingCounter = document.getElementById('phishing-counter')
  const counterSmall = document.getElementById('counter-small')
  // Live counter — only run when elements exist (some pages don't include counter)
  if(phishingCounter){
    const counterEl = phishingCounter
    const smallEl = counterSmall
    let base = parseInt(counterEl.textContent.replace(/,/g,''),10) || 24000

    // Try to fetch server-provided base (simulated)
    fetch('/api/attack_count').then(r=>r.json()).then(data=>{
      if(data && data.phishing_attempts_today) base = data.phishing_attempts_today
      updateCounterDisplay()
    }).catch(()=>updateCounterDisplay())

    function updateCounterDisplay(){
      counterEl.textContent = base.toLocaleString()
      if(smallEl) smallEl.textContent = base.toLocaleString()
    }

    // Increment every ~2.5s by a small random amount
    setInterval(()=>{
      base += Math.floor(Math.random()*6) + 1
      updateCounterDisplay()
    }, 2500)
  }

  // Quiz logic (step-by-step) — uses SAFENET_QUESTIONS provided by quiz page
  const quizApp = document.getElementById('quiz-app')
  if(quizApp && window.SAFENET_QUESTIONS){
    const questions = window.SAFENET_QUESTIONS
    let idx = 0
    const answers = new Array(questions.length).fill(null)
    const qTotal = document.getElementById('q-total')
    const qIndex = document.getElementById('q-index')
    const qContainer = document.getElementById('q-container')
    const prevBtn = document.getElementById('q-prev')
    const nextBtn = document.getElementById('q-next')
    const submitBtn = document.getElementById('q-submit')
    const resultBox = document.getElementById('quiz-result')
    qTotal.textContent = questions.length

    function renderQuestion(i){
      qIndex.textContent = i+1
      const q = questions[i]
      const html = [`<p class="q-text">${q.text}</p>`]
      html.push('<div class="q-options">')
      q.options.forEach((opt,oi)=>{
        const id = `opt-${i}-${oi}`
        const checked = answers[i] === oi ? 'checked' : ''
        // structured markup: input + span so CSS can style option and checked state
        html.push(`<label class="q-option"><input type="radio" name="qsel" data-q="${i}" value="${oi}" ${checked}><span class="opt-text">${opt}</span></label>`)
      })
      html.push('</div>')
      qContainer.innerHTML = html.join('')
      // wire option click
      qContainer.querySelectorAll('input[name="qsel"]').forEach(r=>{
        r.addEventListener('change', e=>{
          const qi = parseInt(e.target.getAttribute('data-q'),10)
          answers[qi] = parseInt(e.target.value,10)
        })
      })
      // update buttons
      prevBtn.disabled = i === 0
      // toggle visibility via class so layout remains stable; submit is absolutely positioned
      nextBtn.classList.toggle('hidden', i === questions.length-1)
      submitBtn.classList.toggle('hidden', i !== questions.length-1)
    }

    prevBtn.addEventListener('click', ()=>{ if(idx>0){ idx--; renderQuestion(idx) } })
    nextBtn.addEventListener('click', ()=>{ if(idx<questions.length-1){ idx++; renderQuestion(idx) } })
    submitBtn.addEventListener('click', ()=>{
      // compute score
      let score = 0
      questions.forEach((q,i)=>{ if(answers[i] === q.correct) score++ })
      const pct = Math.round((score / questions.length) * 100)
      resultBox.textContent = `You are ${pct}% cyber-safe` 
      // send minimal record to backend (no name field)
      const name = 'Anonymous'
      fetch('/submit-quiz', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,score,max_score:questions.length,details: JSON.stringify(answers)})})
        .then(()=>console.log('Quiz saved')).catch(()=>console.warn('Quiz save failed'))
    })

    renderQuestion(idx)
  }

  // Contact form
  const contactForm = document.getElementById('contact-form')
  const contactStatus = document.getElementById('contact-status')
  contactForm && contactForm.addEventListener('submit', e => {
    e.preventDefault()
    const name = document.getElementById('c-name').value || 'Anonymous'
    const email = document.getElementById('c-email').value || ''
    const message = document.getElementById('c-message').value || ''
    fetch('/contact', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,message})})
      .then(r=>r.json()).then(()=>{contactStatus.textContent='Message sent — thanks!'; contactStatus.style.color='var(--accent-green)'}).catch(()=>{contactStatus.textContent='Failed to send'; contactStatus.style.color='var(--accent-red)'} )
  })

  // Initialize charts
  initCharts()
})

/* Password strength helper */
function checkPasswordStrength(pw){
  const res = {level:'Weak', color:'#ff3b3b', suggestion:'Use at least 12 characters with symbols, numbers and mixed case.'}
  if(!pw || pw.length < 6) return res
  let score = 0
  if(pw.length >= 8) score++
  if(/[A-Z]/.test(pw)) score++
  if(/[0-9]/.test(pw)) score++
  if(/[^A-Za-z0-9]/.test(pw)) score++
  if(pw.length >= 12) score++

  if(score <=1){res.level='Weak'; res.color='#ff3b3b'; res.suggestion='Add length and include numbers/symbols.'}
  else if(score <=3){res.level='Medium'; res.color='#ffb347'; res.suggestion='Add more length and special characters.'}
  else {res.level='Strong'; res.color='#00c48c'; res.suggestion='Great — store it in a password manager.'}
  return res
}

/* Charts with Chart.js */
function initCharts(){
  // Create charts only when their canvas elements exist (page-specific)
  const el1 = document.getElementById('chart-attacks')
  if(el1){
    const ctx1 = el1.getContext('2d')
    new Chart(ctx1, {
      type:'line',
      data:{labels:['2018','2019','2020','2021','2022','2023','2024'], datasets:[{label:'Reported incidents',data:[1200,1800,3000,5200,7600,10300,13800],borderColor:'#ff3b3b',backgroundColor:'rgba(255,59,59,0.08)',tension:0.3}]},
      options:{plugins:{legend:{display:false}},responsive:true,scales:{y:{beginAtZero:true}}}
    })
  }

  const el2 = document.getElementById('chart-threats')
  if(el2){
    const ctx2 = el2.getContext('2d')
    new Chart(ctx2, {type:'bar',data:{labels:['Phishing','Malware','Password attacks','Social engineering','Fake websites'], datasets:[{label:'Incidents',data:[45,30,20,10,8],backgroundColor:['#ff3b3b','#ffb347','#00c48c','#ffd166','#6c5ce7']}]},options:{plugins:{legend:{display:false}},responsive:true}})
  }

  const el3 = document.getElementById('chart-causes')
  if(el3){
    const ctx3 = el3.getContext('2d')
    new Chart(ctx3, {type:'pie',data:{labels:['Weak passwords','Clicking unknown links','No updates','Unsafe Wi-Fi','Software bugs'],datasets:[{data:[30,25,20,15,10],backgroundColor:['#ff3b3b','#ffb347','#00c48c','#ffd166','#6c5ce7']}]},options:{responsive:true}})
  }

  const el4 = document.getElementById('chart-age')
  if(el4){
    const ctx4 = el4.getContext('2d')
    new Chart(ctx4, {type:'doughnut',data:{labels:['Under 18','18–30','30–50','50+'],datasets:[{data:[8,42,33,17],backgroundColor:['#6c5ce7','#00c48c','#ffd166','#ffb347']}]},options:{responsive:true}})
  }

  const el5 = document.getElementById('chart-passwords')
  if(el5){
    const ctx5 = el5.getContext('2d')
    new Chart(ctx5, {type:'bar',data:{labels:['6-char','8-char','10-char+symbols'],datasets:[{label:'Est. time to crack',data:[10/60, 30, 365*24],backgroundColor:['#ff3b3b','#ffb347','#00c48c']}]},options:{scales:{y:{beginAtZero:true, ticks:{callback:function(v){ if(v<1) return `${Math.round(v*60)}s`; if(v<60) return `${v}min`; if(v<24*365) return `${Math.round(v/60)}h`; return `${Math.round(v/24/365)}y`}}}},responsive:true}})
  }

  const el6 = document.getElementById('chart-india')
  if(el6){
    const ctx6 = el6.getContext('2d')
    new Chart(ctx6, {type:'bar',data:{labels:['UPI fraud','Fake job offers','OTP scams','Fake delivery links'], datasets:[{data:[42,35,30,22],backgroundColor:['#ff3b3b','#ffd166','#00c48c','#ffb347']}]},options:{plugins:{legend:{display:false}},responsive:true}})
  }
}
