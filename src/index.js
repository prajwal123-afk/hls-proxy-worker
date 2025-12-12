export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Handle favicon request
  if (path === '/favicon.ico') {
    return new Response('', { status: 204 })
  }
  
  // Get streaming parameters
  const id = url.searchParams.get("id")
  const server = url.searchParams.get("server") || "hd-1"
  const type = url.searchParams.get("type") || "sub"
  
  if (!id) {
    return new Response("Missing ?id= parameter", { status: 400 })
  }
  
  try {
    // Fetch stream data from your backend
    const backendUrl = `https://backednstreaminggggggg.onrender.com/api/stream?id=${encodeURIComponent(id)}&server=${encodeURIComponent(server)}&type=${encodeURIComponent(type)}`
    
    const response = await fetch(backendUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    })
    
    if (!response.ok) {
      return new Response(`Backend API error: ${response.status}`, { status: 500 })
    }
    
    const data = await response.json()
    
    if (!data.success || !data.results?.streamingLink) {
      return new Response("No streaming data available", { status: 404 })
    }
    
    const streamData = data.results.streamingLink
    const videoLink = streamData.link?.proxy || streamData.link?.file || ""
    const directLink = streamData.link?.file || ""
    const tracks = data.results.streamingLink.tracks || []
    const intro = data.results.streamingLink.intro
    const outro = data.results.streamingLink.outro
    
    if (!videoLink) {
      return new Response("No video link available", { status: 404 })
    }
    
    // Extract title from ID (basic parsing)
    const title = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    const storageKey = `player:${id}:${server}:${type}`

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>${title}</title>
  <style>
  html, body { margin:0; height:100%; background:#000; font-family:'Roboto',sans-serif; overflow:hidden; }
  #player { width:100%; height:100%; position:relative; cursor:default; }
  #player.mobile-fullscreen { position:fixed; inset:0; width:100vw; height:100vh; z-index:9999; background:#000; }
  #player.mobile-fullscreen video { object-fit:contain; }
  body.mobile-fs-lock { overflow:hidden; touch-action:none; }
  video { width:100%; height:100%; object-fit:cover; background:#000; }
  #overlay { position:absolute; top:20px; left:20px; color:#fff; font-size:20px; font-weight:bold; text-shadow:2px 2px 5px #000; pointer-events:none; opacity:0; transition:opacity .25s ease; }
  #player.show-controls #overlay { opacity:1; }
  #player.hide-cursor #overlay { opacity:0; }
  #watermark { position:absolute; top:20px; right:20px; padding:6px 12px; font-size:14px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,0.85); background:rgba(0,0,0,0.45); border-radius:6px; pointer-events:none; backdrop-filter:blur(4px); }
  #centerPlay { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80px; height:80px; background:rgba(0,0,0,0.7); border:2px solid rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto; transition:all 0.3s ease; backdrop-filter:blur(8px); box-shadow:0 4px 20px rgba(0,0,0,0.5); }
  #centerPlay:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,1); transform:translate(-50%,-50%) scale(1.05); }
  #centerPlay:active { transform:translate(-50%,-50%) scale(0.95); }
  #centerPlay svg { width:32px; height:32px; color:#fff; transition:opacity 0.3s ease; }
  #centerPlay:hover svg { opacity:1; }
  #centerPlay.hidden { opacity:0; pointer-events:none; transform:translate(-50%,-50%) scale(0.9); }
  
  /* Netflix-like controls */
  #controls { position:absolute; left:0; right:0; bottom:0; padding:16px 16px calc(20px + env(safe-area-inset-bottom)); background:linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0)); opacity:0; transform:translateY(10px); transition:opacity .25s ease, transform .25s ease; }
  #player.show-controls #controls { opacity:1; transform:translateY(0); }
  #player.hide-cursor { cursor:none; }
  .row { display:flex; align-items:center; gap:10px; color:#fff; }
  .btn { background:rgba(255,255,255,0.08); border:none; color:white; cursor:pointer; font-size:18px; padding:8px 12px; border-radius:10px; transition:background .2s ease; }
  .btn:hover { background:rgba(255,255,255,0.1); }
  .time { font-variant-numeric:tabular-nums; font-size:14px; color:#ddd; }
  
  /* Seek bar */
  #seekContainer { position:relative; height:6px; background:rgba(255,255,255,0.25); border-radius:3px; cursor:pointer; margin:8px 0 6px; touch-action:none; }
  #seekProgress { position:absolute; top:0; left:0; height:100%; width:0%; background:#e50914; border-radius:3px; }
  
  /* Volume */
  #volumeContainer { display:flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; background:rgba(0,0,0,0.28); }
  #volume { -webkit-appearance:none; appearance:none; width:110px; height:4px; background:#666; border-radius:2px; outline:none; }
  #volume::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:12px; height:12px; background:#fff; border-radius:50%; cursor:pointer; }
  
  /* Audio menu */
  #audioMenu { position:absolute; right:16px; bottom:56px; background:rgba(20,20,20,0.95); color:#fff; border-radius:6px; padding:8px 0; min-width:180px; display:none; box-shadow:0 8px 24px rgba(0,0,0,0.5); max-height:50vh; overflow:auto; }
  #audioMenu.show { display:block; }
  .audio-item { padding:8px 14px; cursor:pointer; font-size:14px; }
  .audio-item:hover { background:rgba(255,255,255,0.1); }
  .audio-item.active { color:#e50914; font-weight:600; }
  
  /* Quality & Speed menus */
  #qualityMenu, #speedMenu { position:absolute; right:16px; bottom:56px; background:rgba(20,20,20,0.95); color:#fff; border-radius:6px; padding:8px 0; min-width:180px; display:none; box-shadow:0 8px 24px rgba(0,0,0,0.5); max-height:50vh; overflow:auto; }
  #qualityMenu.show, #speedMenu.show { display:block; }
  .menu-item { padding:8px 14px; cursor:pointer; font-size:14px; }
  .menu-item:hover { background:rgba(255,255,255,0.1); }
  .menu-item.active { color:#e50914; font-weight:600; }
  
  /* Mobile-first tweaks */
  @media (max-width: 768px) {
  #controls { padding:20px 12px calc(30px + env(safe-area-inset-bottom)); }
  .controls-bottom { flex-direction:column; align-items:stretch; gap:14px; }
  .desktop-actions { display:none; }
  .main-controls { background:rgba(0,0,0,0.5); border-radius:20px; padding:12px 16px; justify-content:space-between; align-items:center; backdrop-filter:blur(8px); }
  .round-btn { display:flex; font-size:18px; background:rgba(255,255,255,0.14); }
  .round-btn.active { background:#e50914; }
  #mobilePlayToggle { width:60px; height:60px; font-size:26px; }
  .mobile-actions { display:flex; flex:1; justify-content:flex-end; gap:12px; }
  .time { flex:1; text-align:center; font-size:14px; color:#f5f5f5; font-weight:500; }
  #seekContainer { height:6px; margin:6px 0 10px; }
  #volumeContainer { display:none; }
  #audioMenu, #qualityMenu, #speedMenu { position:fixed; left:0; right:0; bottom:0; border-radius:20px 20px 0 0; padding-bottom:calc(20px + env(safe-area-inset-bottom)); margin:0; max-height:50vh; backdrop-filter:blur(10px); }
  .audio-item, .menu-item { padding:18px 24px; font-size:16px; }
  }
  
  /* Control layout */
  .controls-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .controls-bottom { display:flex; align-items:center; justify-content:space-between; gap:18px; width:100%; }
  .main-controls { display:flex; align-items:center; justify-content:flex-start; gap:12px; width:100%; }
  .mobile-actions { display:none; align-items:center; gap:10px; }
  .desktop-actions { display:flex; align-items:center; gap:12px; }
  .round-btn { background:rgba(255,255,255,0.12); border:none; color:white; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; padding:0; transition:all 0.3s ease; cursor:pointer; backdrop-filter:blur(8px); box-shadow:0 2px 10px rgba(0,0,0,0.3); }
  .round-btn:hover { background:rgba(255,255,255,0.2); transform:scale(1.05); }
  .round-btn:active { transform:scale(0.95); }
  .round-btn.active { background:#e50914; box-shadow:0 0 20px rgba(229,9,20,0.5); }
  .round-btn.active:hover { background:#ff0f1a; }
  #mobilePlayToggle svg { width:24px; height:24px; transition:opacity 0.3s ease; }
  #mobilePlayToggle .play-icon { display:block; }
  #mobilePlayToggle .pause-icon { display:none; }
  .left, .right { display:flex; align-items:center; gap:12px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
</head>
<body>
  <div id="player">
  <video id="video" autoplay muted preload="auto" playsinline webkit-playsinline x5-playsinline></video>
  <div id="overlay">${title}</div>
  <div id="watermark">Stream Player</div>
  <button id="centerPlay" class="center-play-btn">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  </button>
  <div id="controls">
  <div id="seekContainer"><div id="seekProgress"></div></div>
  <div class="controls-bottom">
  <div class="main-controls">
  <button class="round-btn" id="mobilePlayToggle" aria-label="Play/Pause">
    <svg viewBox="0 0 24 24" fill="currentColor" class="play-icon">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <svg viewBox="0 0 24 24" fill="currentColor" class="pause-icon" style="display:none;">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  </button>
  <span class="time" id="timeLabel">00:00 / 00:00</span>
  <div class="mobile-actions">
  <button class="round-btn" id="mobileMute" aria-label="Mute">🔊</button>
  <button class="round-btn" id="mobileAudio" aria-label="Subtitles">CC</button>
  <button class="round-btn" id="mobileQuality" aria-label="Quality">HD</button>
  <button class="round-btn" id="mobileSpeed" aria-label="Playback speed">⏱</button>
  <button class="round-btn" id="mobileFullscreen" aria-label="Fullscreen">⛶</button>
  </div>
  </div>
  <div class="desktop-actions">
  <div id="volumeContainer">
  <button class="btn" id="muteBtn" aria-label="Mute" title="Mute">🔊</button>
  <input type="range" id="volume" min="0" max="1" step="0.05" value="1" />
  </div>
  <button class="btn" id="audioBtn" aria-label="Subtitles" title="Subtitles">Subtitles ▾</button>
  <button class="btn" id="qualityBtn" aria-label="Quality" title="Quality">Quality ▾</button>
  <button class="btn" id="speedBtn" aria-label="Playback speed" title="Playback speed">Speed ▾</button>
  <button class="btn" id="pipBtn" aria-label="Picture in picture" title="Picture in picture">PiP</button>
  <button class="btn" id="fullscreen" aria-label="Fullscreen" title="Fullscreen">⛶</button>
  </div>
  </div>
  <div id="audioMenu"></div>
  <div id="qualityMenu"></div>
  <div id="speedMenu"></div>
  </div>
  </div>
  <script>
  const video = document.getElementById("video");
  const centerPlay = document.getElementById("centerPlay");
  const seekProgress = document.getElementById("seekProgress");
  const seekContainer = document.getElementById("seekContainer");
  const fullscreenBtn = document.getElementById("fullscreen");
  const audioBtn = document.getElementById("audioBtn");
  const audioMenu = document.getElementById("audioMenu");
  const qualityBtn = document.getElementById("qualityBtn");
  const qualityMenu = document.getElementById("qualityMenu");
  const speedBtn = document.getElementById("speedBtn");
  const speedMenu = document.getElementById("speedMenu");
  const pipBtn = document.getElementById("pipBtn");
  const muteBtn = document.getElementById("muteBtn");
  const volume = document.getElementById("volume");
  const timeLabel = document.getElementById("timeLabel");
  const mobilePlayToggle = document.getElementById("mobilePlayToggle");
  const mobileMute = document.getElementById("mobileMute");
  const mobileAudio = document.getElementById("mobileAudio");
  const mobileQuality = document.getElementById("mobileQuality");
  const mobileSpeed = document.getElementById("mobileSpeed");
  const mobileFullscreen = document.getElementById("mobileFullscreen");
  const player = document.getElementById("player");
  const body = document.body;
  
  const initialStreamUrl = ${JSON.stringify(videoLink)};
  const directStreamUrl = ${JSON.stringify(directLink)};
  const subtitleTracks = ${JSON.stringify(tracks)};
  const introData = ${JSON.stringify(intro)};
  const outroData = ${JSON.stringify(outro)};
  const storageKey = ${JSON.stringify(storageKey)};
  
  let currentStreamUrl = initialStreamUrl;
  let hls = null;
  let controlsHideTimer = null;
  
  // Subtitle functions
  function buildSubtitleMenu(){
    audioMenu.innerHTML = '';
    
    // Add "Off" option
    const offDiv = document.createElement('div');
    offDiv.className = 'audio-item';
    offDiv.dataset.index = '-1';
    offDiv.innerHTML = '<strong>Subtitles Off</strong>';
    audioMenu.appendChild(offDiv);
    
    // Add subtitle tracks
    if (Array.isArray(subtitleTracks) && subtitleTracks.length) {
      subtitleTracks.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'audio-item' + (track.default ? ' active' : '');
        div.dataset.index = String(index);
        div.innerHTML = '<strong>' + track.label + '</strong>';
        audioMenu.appendChild(div);
      });
    }
  }
  
  function addSubtitleTracks() {
    if (!Array.isArray(subtitleTracks) || !subtitleTracks.length) return;
    
    subtitleTracks.forEach((track, index) => {
      const trackElement = document.createElement('track');
      trackElement.kind = track.kind || 'captions';
      trackElement.label = track.label;
      trackElement.src = track.proxy || track.file;
      trackElement.default = track.default || false;
      video.appendChild(trackElement);
    });
  }
  
  // Player initialization
  function initPlayer(){
    if (window.Hls && Hls.isSupported()){
      hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: false,
        lowLatencyMode: true,
        startLevel: 0,
        maxBufferLength: 12,
        maxLiveSyncPlaybackRate: 1.5,
        liveDurationInfinity: true,
        startFragPrefetch: true,
        backBufferLength: 30
      });
      
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        buildQualityMenu();
        addSubtitleTracks();
        buildSubtitleMenu();
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try direct URL if proxy fails
              if (currentStreamUrl !== directStreamUrl && directStreamUrl) {
                console.log('Trying direct stream URL...');
                currentStreamUrl = directStreamUrl;
                hls.loadSource(currentStreamUrl);
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              // Try direct URL as fallback
              if (currentStreamUrl !== directStreamUrl && directStreamUrl) {
                console.log('Fallback to direct stream URL...');
                video.src = directStreamUrl;
              } else {
                video.src = currentStreamUrl;
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentStreamUrl;
      addSubtitleTracks();
      buildSubtitleMenu();
    } else {
      console.error('HLS not supported');
    }
  }
  
  // Play/pause controls
  function togglePlay(){
    if(video.paused){
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }
  
  centerPlay.addEventListener("click", togglePlay);
  video.addEventListener("click", togglePlay);
  
  video.addEventListener("play", ()=>{
    centerPlay.classList.add('hidden');
    if (mobilePlayToggle){
      mobilePlayToggle.querySelector('.play-icon').style.display = 'none';
      mobilePlayToggle.querySelector('.pause-icon').style.display = 'block';
      mobilePlayToggle.classList.add('active');
    }
  });
  
  video.addEventListener("pause", ()=>{
    centerPlay.classList.remove('hidden');
    if (mobilePlayToggle){
      mobilePlayToggle.querySelector('.play-icon').style.display = 'block';
      mobilePlayToggle.querySelector('.pause-icon').style.display = 'none';
      mobilePlayToggle.classList.remove('active');
    }
  });
  
  if (mobilePlayToggle){
    mobilePlayToggle.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
      showControls();
    });
  }
  
  // Time display
  function fmtTime(t){ 
    if(!isFinite(t)) return '00:00'; 
    const h=Math.floor(t/3600); 
    const m=Math.floor((t%3600)/60); 
    const s=Math.floor(t%60); 
    return (h>0?(h+':'):'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); 
  }
  
  function updateTime(){
    const percent = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    seekProgress.style.width = (percent)+"%";
    timeLabel.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
  }
  
  video.addEventListener('timeupdate', updateTime);
  video.addEventListener('loadedmetadata', updateTime);
  
  // Seek bar
  seekContainer.addEventListener('click', (e) => {
    const rect = seekContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * video.duration;
    if (isFinite(newTime) && newTime >= 0 && newTime <= video.duration) {
      video.currentTime = newTime;
    }
  });
  
  // Volume controls
  volume.addEventListener('input', () => {
    video.volume = volume.value;
    video.muted = volume.value == 0;
    muteBtn.textContent = video.muted ? '🔇' : '🔊';
  });
  
  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? '🔇' : '🔊';
    volume.value = video.muted ? 0 : video.volume;
  });
  
  // Subtitle menu
  audioBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    buildSubtitleMenu();
    audioMenu.classList.toggle('show');
    showControls();
  });
  
  mobileAudio.addEventListener('click', (e) => {
    e.stopPropagation();
    buildSubtitleMenu();
    audioMenu.classList.toggle('show');
    showControls();
  });
  
  // Subtitle selection
  audioMenu.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || !target.classList.contains('audio-item')) return;
    
    const index = parseInt(target.dataset.index);
    const textTracks = video.textTracks;
    
    // Disable all tracks
    for (let i = 0; i < textTracks.length; i++) {
      textTracks[i].mode = 'disabled';
    }
    
    // Enable selected track
    if (index >= 0 && textTracks[index]) {
      textTracks[index].mode = 'showing';
    }
    
    // Update active state
    Array.from(audioMenu.children).forEach(child => child.classList.remove('active'));
    target.classList.add('active');
    
    audioMenu.classList.remove('show');
  });
  
  // Quality menu
  function buildQualityMenu(){
    qualityMenu.innerHTML = '';
    if (hls && hls.levels && hls.levels.length){
      const auto = document.createElement('div'); 
      auto.className='menu-item'; 
      auto.textContent='Auto'; 
      auto.dataset.level='-1'; 
      qualityMenu.appendChild(auto);
      
      hls.levels.forEach((lvl, i)=>{
        const label = (lvl.height? (lvl.height+'p') : (Math.round((lvl.bitrate||0)/1000)+'kbps'));
        const el = document.createElement('div'); 
        el.className='menu-item'; 
        el.textContent=label; 
        el.dataset.level=String(i); 
        qualityMenu.appendChild(el);
      });
      
      const active = hls.currentLevel;
      Array.from(qualityMenu.children).forEach((c)=>{ 
        if (parseInt(c.dataset.level)===active) c.classList.add('active'); 
        if(active===-1 && c.dataset.level==='-1') c.classList.add('active');
      });
    } else {
      const only = document.createElement('div'); 
      only.className='menu-item active'; 
      only.textContent='Auto'; 
      qualityMenu.appendChild(only);
    }
  }
  
  qualityBtn.addEventListener('click', (e)=>{ 
    e.stopPropagation(); 
    buildQualityMenu(); 
    qualityMenu.classList.toggle('show'); 
    speedMenu.classList.remove('show'); 
    audioMenu.classList.remove('show'); 
    showControls();
  });
  
  qualityMenu.addEventListener('click', (e)=>{
    const t = e.target; 
    if(!t || !t.classList || !t.classList.contains('menu-item')) return;
    const level = parseInt(t.dataset.level);
    if (hls){ hls.currentLevel = level; }
    buildQualityMenu();
  });
  
  // Speed menu
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  function buildSpeedMenu(){
    speedMenu.innerHTML='';
    const current = video.playbackRate;
    for (let i=0;i<speeds.length;i++){
      const s = speeds[i];
      const el = document.createElement('div'); 
      el.className='menu-item'+(Math.abs(s-current)<0.001?' active':''); 
      el.textContent = (s+'x'); 
      el.dataset.speed=String(s); 
      speedMenu.appendChild(el);
    }
  }
  
  speedBtn.addEventListener('click',(e)=>{ 
    e.stopPropagation(); 
    buildSpeedMenu(); 
    speedMenu.classList.toggle('show'); 
    qualityMenu.classList.remove('show'); 
    audioMenu.classList.remove('show'); 
    showControls();
  });
  
  speedMenu.addEventListener('click',(e)=>{ 
    const t=e.target; 
    if(!t||!t.classList||!t.classList.contains('menu-item')) return; 
    const s=parseFloat(t.dataset.speed); 
    video.playbackRate=s; 
    localStorage.setItem(storageKey+':speed', String(s)); 
    buildSpeedMenu();
  });
  
  // Picture in Picture
  pipBtn.addEventListener('click', async ()=>{
    try {
      if (document.pictureInPictureElement){ 
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture){ 
        await video.requestPictureInPicture();
      }
    } catch(e){ console.error(e); }
  });
  
  // Fullscreen
  async function toggleFullscreen(){
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await player.requestFullscreen();
      }
    } catch(e){ console.error(e); }
  }
  
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  mobileFullscreen.addEventListener("click", toggleFullscreen);
  
  // Controls visibility
  function showControls(){
    player.classList.add('show-controls');
    player.classList.remove('hide-cursor');
    if (controlsHideTimer){
      clearTimeout(controlsHideTimer);
      controlsHideTimer = null;
    }
    const autoHideDelay = 3000;
    controlsHideTimer = setTimeout(() => {
      if (audioMenu.classList.contains('show') || video.paused){
        player.classList.add('show-controls');
        player.classList.remove('hide-cursor');
        return;
      }
      player.classList.remove('show-controls');
      player.classList.add('hide-cursor');
    }, autoHideDelay);
  }
  
  ['mousemove','pointermove','touchstart','touchmove'].forEach(evt => {
    player.addEventListener(evt, showControls, { passive: true });
  });
  
  document.addEventListener('click', ()=>{ 
    audioMenu.classList.remove('show'); 
    qualityMenu.classList.remove('show'); 
    speedMenu.classList.remove('show');
  });
  
  // Keyboard controls
  document.addEventListener('keydown', (e)=>{
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    showControls();
    if (e.code === 'Space'){ e.preventDefault(); togglePlay(); }
    if (e.key === 'ArrowLeft'){ 
      const newTime = Math.max(0, video.currentTime - 10);
      if (isFinite(newTime)) video.currentTime = newTime;
    }
    if (e.key === 'ArrowRight'){ 
      const newTime = Math.min(video.duration || 0, video.currentTime + 10);
      if (isFinite(newTime)) video.currentTime = newTime;
    }
    if (e.key === 'f' || e.key === 'F'){ toggleFullscreen(); }
    if (e.key === 'm' || e.key === 'M'){ 
      video.muted=!video.muted; 
      muteBtn.textContent = (video.muted?'🔇':'🔊');
    }
  });
  
  // Initialize player
  initPlayer();
  buildSubtitleMenu();
  showControls();
  
  // Load saved settings
  const savedVol = parseFloat(localStorage.getItem(storageKey+':volume')||'1');
  if (!isNaN(savedVol)){ 
    volume.value=String(savedVol); 
    video.volume=savedVol; 
    video.muted=(savedVol===0); 
    muteBtn.textContent=(video.muted?'🔇':'🔊');
  }
  
  const savedSpd = parseFloat(localStorage.getItem(storageKey+':speed')||'1');
  if (!isNaN(savedSpd)){ video.playbackRate = savedSpd; }
  
  const savedPos = parseFloat(localStorage.getItem(storageKey+':time')||'NaN');
  if (!isNaN(savedPos)){
    video.addEventListener('loadedmetadata', ()=>{ 
      if (savedPos>0 && savedPos < (video.duration||Infinity)-2){ 
        video.currentTime = savedPos; 
      } 
    });
  }
  
  // Save settings
  setInterval(()=>{ 
    if(!video.seeking && isFinite(video.currentTime)){ 
      localStorage.setItem(storageKey+':time', String(video.currentTime)); 
    } 
  }, 3000);
  
  volume.addEventListener('change', ()=>{ 
    localStorage.setItem(storageKey+':volume', String(video.volume)); 
  });
  
    </script>
  </body>
  </html>`
    
    return new Response(html, { headers: { "Content-Type": "text/html" } })
    
  } catch(err) {
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
}
