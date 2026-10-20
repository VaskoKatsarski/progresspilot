const canvas = document.getElementById('orbCanvas');
const ctx = canvas.getContext('2d');
const W = 320, H = 320, cx = 160, cy = 160;
let t = 0, state = 'idle';
let isListening = false;
let recognition = null;
let chatHistory = [];

const cfg = {
  idle:      { energy: 0.25, speed: 1.0,  color: '#00e5ff', particleAlpha: 0.4 },
  listening: { energy: 1.0,  speed: 2.0,  color: '#00ffff', particleAlpha: 0.9 },
  thinking:  { energy: 0.6,  speed: 3.0,  color: '#40e0d0', particleAlpha: 0.7 },
  speaking:  { energy: 0.85, speed: 1.5,  color: '#00e5ff', particleAlpha: 0.85 }
};

// Orbital rings
const orbitalRings = [
  { baseRadius: 120, tiltX: 0.15,  tiltY: 0.0,  rotSpeed: 0.003,  rot: 0,   count: 600, spread: 12 },
  { baseRadius: 120, tiltX: -0.1,  tiltY: 0.08, rotSpeed: -0.002, rot: 1.2, count: 500, spread: 10 },
  { baseRadius: 100, tiltX: 0.25,  tiltY: 0.05, rotSpeed: 0.004,  rot: 0.5, count: 350, spread: 9  },
  { baseRadius: 68,  tiltX: 0.2,   tiltY: -0.1, rotSpeed: -0.005, rot: 2.0, count: 200, spread: 7  },
];

orbitalRings.forEach(ring => {
  ring.particles = [];
  for (let i = 0; i < ring.count; i++) {
    ring.particles.push({
      angle: (i / ring.count) * Math.PI * 2,
      radiusOffset: (Math.random() - 0.5) * ring.spread,
      noiseOff: Math.random() * 100,
      size: Math.random() * 1.3 + 0.3,
      alpha: Math.random() * 0.5 + 0.5
    });
  }
});

const sphereDots = [];
const N = 80;
for (let i = 0; i < N; i++) {
  const phi = Math.acos(1 - 2*(i+0.5)/N);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  sphereDots.push({ phi, theta, r: Math.random() > 0.8 ? 1.4 : 0.7 });
}

function noise(x) {
  return Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.3) * 0.3 + Math.sin(x * 7.1) * 0.2;
}

function hex(x, y, r, alpha, col) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
            : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.strokeStyle = col;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function setState(s) {
  state = s;
  const labels = { idle: 'STANDBY', listening: 'LISTENING...', thinking: 'PROCESSING...', speaking: 'SPEAKING' };
  document.getElementById('statusText').textContent = labels[s];
}

function drawOrbitalRing(ring, energy, particleAlpha, color) {
  ring.rot += ring.rotSpeed * (1 + energy * 0.5);
  ring.particles.forEach(p => {
    const angle = p.angle + ring.rot;
    const r = ring.baseRadius + p.radiusOffset + noise(p.noiseOff + t * 0.005) * 6 * energy;
    const x3 = Math.cos(angle) * r;
    const z3 = Math.sin(angle) * r;
    const tiltedX = x3;
    const tiltedY = z3 * Math.cos(ring.tiltX);
    const tiltedZ = z3 * Math.sin(ring.tiltX);
    const px = cx + tiltedX * Math.cos(ring.tiltY) - tiltedZ * Math.sin(ring.tiltY);
    const py = cy + tiltedY + tiltedX * Math.sin(ring.tiltY) * 0.15;
    const depth = (Math.sin(angle + ring.rot) + 1) * 0.5;
    const alpha = p.alpha * particleAlpha * (0.2 + depth * 0.8) * (0.4 + energy * 0.6);
    ctx.beginPath();
    ctx.arc(px, py, p.size * (0.5 + depth * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const s = cfg[state];
  const c = s.color;
  const pulse = Math.sin(t * 0.03 * s.speed) * s.energy;

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
  bg.addColorStop(0, `rgba(0,100,120,${0.08 + s.energy * 0.06})`);
  bg.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();

  hex(W - 45, 25, 16, 0.06, c);
  hex(W - 25, 25, 9,  0.04, c);
  hex(25, H - 25, 16, 0.06, c);
  hex(45, H - 25, 9,  0.04, c);

  orbitalRings.forEach(ring => drawOrbitalRing(ring, s.energy, s.particleAlpha, c));

  const sR = 36 + pulse * 3;
  const sGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sR * 1.8);
  sGlow.addColorStop(0, `rgba(0,229,255,${0.15 + s.energy * 0.1})`);
  sGlow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, sR * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = sGlow;
  ctx.fill();

  const sFill = ctx.createRadialGradient(cx - sR*0.3, cy - sR*0.3, 0, cx, cy, sR);
  sFill.addColorStop(0, `rgba(0,200,220,${0.25 + s.energy * 0.1})`);
  sFill.addColorStop(1, `rgba(0,40,60,0.4)`);
  ctx.beginPath();
  ctx.arc(cx, cy, sR, 0, Math.PI * 2);
  ctx.fillStyle = sFill;
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.globalAlpha = 0.3 + s.energy * 0.2;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const rotX = t * 0.006 * (state === 'thinking' ? 3 : 1);
  const rotY = t * 0.004;
  sphereDots.forEach(dot => {
    const x3 = Math.sin(dot.phi) * Math.cos(dot.theta + rotY);
    const y3 = Math.cos(dot.phi) * Math.cos(rotX) - Math.sin(dot.phi) * Math.sin(dot.theta + rotY) * Math.sin(rotX);
    const z3 = Math.cos(dot.phi) * Math.sin(rotX) + Math.sin(dot.phi) * Math.sin(dot.theta + rotY) * Math.cos(rotX);
    if (z3 > 0) {
      const px = cx + x3 * sR * 0.92;
      const py = cy + y3 * sR * 0.92;
      ctx.beginPath();
      ctx.arc(px, py, dot.r * (0.5 + z3 * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = dot.r > 1 ? '#ffffff' : c;
      ctx.globalAlpha = z3 * (state === 'idle' ? 0.5 : 0.9);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;

  if (state === 'thinking') {
    const scanY = cy - 36 + ((t * 1.2) % 72);
    ctx.beginPath();
    ctx.moveTo(cx - 36, scanY);
    ctx.lineTo(cx + 36, scanY);
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  t++;
  requestAnimationFrame(draw);
}

draw();

// Voice functionality
function toggleVoice() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Voice recognition not supported in this browser. Please use Chrome.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    setState('listening');
    document.getElementById('micBtn').classList.add('active');
    document.getElementById('micLabel').textContent = 'LISTENING...';
    document.getElementById('transcript').textContent = '';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('transcript').textContent = transcript;
    stopListening();
    sendToAgent(transcript);
  };

  recognition.onerror = () => {
    stopListening();
    setState('idle');
  };

  recognition.onend = () => {
    if (isListening) stopListening();
  };

  recognition.start();
}

function stopListening() {
  isListening = false;
  if (recognition) recognition.stop();
  document.getElementById('micBtn').classList.remove('active');
  document.getElementById('micLabel').textContent = 'TAP TO SPEAK';
}

async function sendToAgent(message) {
  setState('thinking');

  chatHistory.push({ role: 'user', content: message });

  try {
    const res = await fetch('/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory.slice(0, -1) })
    });

    const data = await res.json();
    const reply = data.response;

    chatHistory.push({ role: 'assistant', content: reply });

    setState('speaking');
    document.getElementById('transcript').textContent = reply;
    speak(reply);

  } catch (err) {
    setState('idle');
    document.getElementById('transcript').textContent = 'Error connecting to agent.';
  }
}



async function speak(text) {
  setState('speaking');
  
  try {
    const res = await fetch('/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setState('idle');
      document.getElementById('transcript').textContent = '';
    };

    audio.play();

  } catch (err) {
    console.error('ElevenLabs error:', err);
    setState('idle');
  }
}