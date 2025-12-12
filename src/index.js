export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle favicon request
  if (url.pathname === '/favicon.ico') {
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
    const iframe = streamData.iframe || ""
    const servers = data.results.servers || []
    
    if (!iframe) {
      return new Response("No iframe available", { status: 404 })
    }
    
    // Extract title from ID (basic parsing)
    const title = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #000;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    #player {
      position: relative;
      width: 100vw;
      height: 100vh;
      background: #000;
    }
    
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #000;
    }
    
    #overlay {
      position: absolute;
      top: 20px;
      left: 20px;
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 10;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    #player:hover #overlay {
      opacity: 1;
    }
    
    #watermark {
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
      background: rgba(0,0,0,0.5);
      border-radius: 4px;
      z-index: 10;
      pointer-events: none;
      backdrop-filter: blur(4px);
    }
    
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 16px;
      z-index: 5;
      text-align: center;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top: 4px solid #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    #serverSelector {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 10;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .server-btn {
      padding: 8px 12px;
      background: rgba(0,0,0,0.7);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      text-decoration: none;
      transition: all 0.3s ease;
      backdrop-filter: blur(4px);
    }
    
    .server-btn:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.5);
    }
    
    .server-btn.active {
      background: #e50914;
      border-color: #e50914;
    }
    
    @media (max-width: 768px) {
      #overlay {
        font-size: 16px;
        top: 16px;
        left: 16px;
      }
      
      #watermark {
        top: 16px;
        right: 16px;
        font-size: 10px;
        padding: 6px 10px;
      }
      
      #serverSelector {
        bottom: 16px;
        left: 16px;
        right: 16px;
        justify-content: center;
      }
      
      .server-btn {
        flex: 1;
        text-align: center;
        min-width: 60px;
      }
    }
  </style>
</head>
<body>
  <div id="player">
    <div id="loading">
      <div class="spinner"></div>
      <div>Loading player...</div>
    </div>
    <div id="overlay">${title}</div>
    <div id="watermark">Stream Player</div>
    <iframe 
      id="streamFrame"
      src="${iframe}" 
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
      allowfullscreen 
      referrerpolicy="no-referrer-when-downgrade"
      onload="document.getElementById('loading').style.display='none'"
    ></iframe>
    
    <div id="serverSelector">
      ${servers.map((srv, idx) => 
        `<a href="?id=${encodeURIComponent(id)}&server=${encodeURIComponent(srv.serverName.toLowerCase())}&type=${encodeURIComponent(type)}" 
           class="server-btn ${srv.serverName.toLowerCase() === server ? 'active' : ''}"
           title="Switch to ${srv.serverName}">
           ${srv.serverName}
         </a>`
      ).join('')}
    </div>
  </div>
  
  <script>
    // Simple fullscreen toggle on double-click
    document.addEventListener('dblclick', async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch(e) {
        console.log('Fullscreen not supported');
      }
    });
    
    // Hide loading after timeout if onload doesn't fire
    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';
    }, 10000);
    
    // Handle iframe load errors
    const iframe = document.getElementById('streamFrame');
    iframe.addEventListener('error', () => {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.innerHTML = '<div>Failed to load player. Try a different server.</div>';
      }
    });
  </script>
</body>
</html>`
    
    return new Response(html, { headers: { "Content-Type": "text/html" } })
    
  } catch(err) {
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
}
