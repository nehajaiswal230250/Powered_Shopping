from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "presentation_assets" / "classroom_slide_viewer.html"

desktop = (ROOT / "presentation_assets" / "ui_auth_desktop.png").as_uri()
mobile = (ROOT / "presentation_assets" / "ui_auth_mobile.png").as_uri()
process = (ROOT / "presentation_assets" / "int428_process_flow.png").as_uri()

slides = [
    {
        "title": "Powered Shopping",
        "subtitle": "AI voice assistant for easier online shopping",
        "label": "CLASSROOM PRESENTATION",
        "type": "cover",
        "desktop": desktop,
    },
    {
        "title": "Problem Statement",
        "type": "cards4",
        "cards": [
            ["PROBLEM", "Traditional online shopping needs too many manual clicks, searches, and filters.", "#f29c38"],
            ["PAIN POINT", "Users repeatedly type queries, compare products, and manage carts manually.", "#1fa6c7"],
            ["NEED", "A smarter system should understand natural voice or text commands.", "#e65b87"],
            ["GOAL", "Make shopping faster, simpler, and more interactive with AI assistance.", "#7abd42"],
        ],
    },
    {
        "title": "Proposed Solution and User Journey",
        "type": "twoColumns",
        "leftTitle": "USER JOURNEY",
        "leftItems": [
            "User logs in with email/password or Google",
            "User speaks or types a shopping command",
            "App shows products, recommendations, or cart updates",
            "User adds items and completes checkout",
        ],
        "rightTitle": "SOLUTION MODULES",
        "rightItems": [
            "Authentication and protected dashboard",
            "Voice and text shopping assistant",
            "Catalog, filters, and recommendation engine",
            "Cart, checkout, and persistence layer",
        ],
    },
    {
        "title": "How the Project Works Internally",
        "type": "process",
        "steps": [
            "01  User gives input by voice or text",
            "02  Frontend captures the request and sends it forward",
            "03  Backend routes it to product, cart, or AI services",
            "04  AI tools or fallback parser decide the correct action",
            "05  UI updates products, cart, recommendations, or checkout state",
        ],
        "process": process,
    },
    {
        "title": "System Architecture",
        "type": "architecture",
        "cols": [
            ["CLIENT", "#1e4e8c", ["React + Vite interface", "Speech hooks + UI state", "Firebase authentication"]],
            ["BACKEND", "#1fa6c7", ["Express APIs", "Controllers + services", "Cart, product, and AI logic"]],
            ["AI LAYER", "#e65b87", ["OpenAI chat + tools", "Whisper transcription", "Intent parser fallback"]],
            ["DATA", "#7abd42", ["FakeStore + mock JSON", "Firestore or memory cart", "Browser storage prefs"]],
        ],
    },
    {
        "title": "Main Features",
        "type": "grid6",
        "items": [
            ["Secure access", "Users sign in before entering the dashboard", "#f29c38"],
            ["Voice commands", "Live speech input with spoken assistant replies", "#1fa6c7"],
            ["Manual control", "Typed prompts and quick commands for safe demos", "#1e4e8c"],
            ["Smart discovery", "Search, filter, trending, and similar products", "#e65b87"],
            ["Cart flow", "Add items, remove items, and simulate checkout", "#7abd42"],
            ["Recovery mode", "Fallbacks keep the app usable during failures", "#586b8d"],
        ],
    },
    {
        "title": "Technology Stack and Why I Used It",
        "type": "twoColumns",
        "leftTitle": "CORE TECHNOLOGIES",
        "leftItems": [
            "React 18 + Vite 5 for frontend interface",
            "Node.js + Express 4 for backend APIs",
            "Firebase Auth for secure sign-in",
            "OpenAI for assistant and transcription",
            "FakeStore API + local JSON for products",
        ],
        "rightTitle": "WHY THEY MATTER",
        "rightItems": [
            "Fast and interactive user interface",
            "Simple modular backend structure",
            "Secure login without building auth from scratch",
            "Natural language shopping actions",
            "Fallback-ready data for classroom demos",
        ],
    },
    {
        "title": "Application Screens",
        "type": "screens",
        "desktop": desktop,
        "mobile": mobile,
    },
    {
        "title": "What Makes the Project Special",
        "type": "strengths",
        "stats": [
            ["Voice", "natural user input", "#1e4e8c"],
            ["AI", "smart action handling", "#f29c38"],
            ["Fallback", "better reliability", "#1fa6c7"],
        ],
        "items": [
            ["Strength 1", "Users can interact through both voice and manual text commands.", "#1e4e8c"],
            ["Strength 2", "Fallback logic keeps the app running if speech or AI services fail.", "#1fa6c7"],
            ["Strength 3", "The project connects UI, backend, auth, data, and AI in one flow.", "#e65b87"],
            ["Strength 4", "The app is structured for classroom demo and real feature explanation.", "#7abd42"],
        ],
    },
    {
        "title": "Live Demo Plan",
        "type": "twoColumns",
        "leftTitle": "WHAT I WILL SHOW",
        "leftItems": [
            "Login and protected entry into the dashboard",
            "Product search through voice or typed command",
            "Add to cart, view totals, and remove item",
            "Checkout flow and final confirmation state",
        ],
        "rightTitle": "WHAT IT PROVES",
        "rightItems": [
            "The project has secure authentication and clear user flow",
            "The assistant triggers real shopping actions, not only chat replies",
            "Frontend and backend stay synchronized",
            "The app works end to end in demo conditions",
        ],
    },
    {
        "title": "Conclusion",
        "subtitle": "A smarter and more natural shopping experience",
        "type": "closing",
    },
]

html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Classroom Slides</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f3f6fb;
      color: #0f2744;
      width: 1366px;
      height: 768px;
      overflow: hidden;
    }}
    .slide {{
      width: 1366px;
      height: 768px;
      padding: 46px 54px;
      position: relative;
      background: linear-gradient(180deg, #f7fafc 0%, #eef4fb 100%);
    }}
    .dark {{
      background: radial-gradient(circle at top left, rgba(70,124,193,0.2), transparent 20%), linear-gradient(135deg, #112748, #19375f);
      color: white;
    }}
    .label {{
      display: inline-block;
      background: #f29c38;
      color: white;
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: .04em;
    }}
    h1 {{
      margin: 18px 0 10px;
      font-size: 46px;
      line-height: 1.06;
    }}
    .dark h1 {{ color: white; }}
    .subtitle {{
      font-size: 23px;
      color: #45617f;
      max-width: 700px;
      line-height: 1.35;
    }}
    .dark .subtitle {{ color: #dceaf7; }}
    .footer {{
      position: absolute;
      left: 54px;
      bottom: 24px;
      color: #617489;
      font-size: 15px;
    }}
    .dark .footer {{ color: #dceaf7; }}
    .screen-frame {{
      position: absolute;
      right: 54px;
      top: 54px;
      width: 560px;
      height: 620px;
      background: white;
      border-radius: 26px;
      border: 2px solid #b9d2eb;
      padding: 18px;
      box-shadow: 0 20px 60px rgba(17,39,72,.18);
    }}
    .screen-frame img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 16px;
    }}
    .chips {{ display: flex; gap: 14px; margin-top: 30px; }}
    .chip {{
      padding: 12px 18px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.1);
      color: white;
      font-weight: 600;
    }}
    .cards4 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
      margin-top: 34px;
    }}
    .card {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 22px;
      padding: 22px 24px;
      min-height: 220px;
      box-shadow: 0 8px 24px rgba(17,39,72,.06);
    }}
    .card-label {{
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      color: white;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 18px;
    }}
    .card p {{
      margin: 0;
      font-size: 25px;
      line-height: 1.3;
      font-weight: 600;
    }}
    .two-col {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
      margin-top: 34px;
    }}
    .panel {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 24px;
      padding: 24px;
      min-height: 560px;
      box-shadow: 0 8px 24px rgba(17,39,72,.06);
    }}
    .panel-title {{
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      color: white;
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 16px;
    }}
    .list {{
      display: grid;
      gap: 14px;
      margin-top: 6px;
    }}
    .list-item {{
      background: #dceaf7;
      border-radius: 16px;
      padding: 14px 16px;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 600;
    }}
    .list-item.alt {{ background: #f8f5ef; }}
    .process-wrap {{
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 28px;
      margin-top: 28px;
    }}
    .process-steps {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 24px;
      padding: 22px;
    }}
    .step {{
      background: #dceaf7;
      border-radius: 15px;
      padding: 14px 16px;
      margin-bottom: 14px;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 600;
    }}
    .step.alt {{ background: #f8f5ef; }}
    .process-image {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 24px;
      padding: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .process-image img {{
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 16px;
    }}
    .architecture {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-top: 34px;
    }}
    .col {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 22px;
      padding: 18px;
      min-height: 560px;
    }}
    .col-title {{
      display: inline-block;
      padding: 8px 12px;
      border-radius: 999px;
      color: white;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 14px;
    }}
    .col-item {{
      background: #dceaf7;
      border-radius: 15px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 19px;
      line-height: 1.25;
      font-weight: 600;
    }}
    .grid6 {{
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-top: 32px;
    }}
    .feature {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 22px;
      padding: 20px;
      min-height: 220px;
    }}
    .feature-title {{
      display: inline-block;
      padding: 8px 12px;
      border-radius: 999px;
      color: white;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }}
    .feature p {{
      margin: 0;
      font-size: 23px;
      line-height: 1.3;
      font-weight: 600;
    }}
    .screens {{
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 24px;
      margin-top: 32px;
      align-items: start;
    }}
    .desktop-panel, .mobile-panel {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 24px;
      padding: 16px;
    }}
    .desktop-panel img {{
      width: 100%;
      height: 480px;
      object-fit: cover;
      border-radius: 16px;
    }}
    .mobile-panel img {{
      width: 100%;
      height: 480px;
      object-fit: cover;
      border-radius: 16px;
    }}
    .screen-chips {{
      display: flex;
      gap: 16px;
      margin-top: 18px;
    }}
    .screen-chip {{
      padding: 10px 16px;
      border-radius: 999px;
      color: white;
      font-weight: 700;
      font-size: 16px;
    }}
    .strengths-top {{
      display: flex;
      gap: 16px;
      margin-top: 28px;
    }}
    .stat {{
      flex: 1;
      border-radius: 24px;
      color: white;
      padding: 18px 20px;
      min-height: 108px;
    }}
    .stat .big {{
      font-size: 34px;
      font-weight: 800;
      line-height: 1;
    }}
    .stat .small {{
      font-size: 18px;
      margin-top: 8px;
      font-weight: 600;
    }}
    .strength-list {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
    }}
    .strength {{
      background: white;
      border: 2px solid #b9d2eb;
      border-radius: 22px;
      padding: 20px;
      min-height: 165px;
    }}
    .strength .tag {{
      display: inline-block;
      padding: 8px 12px;
      border-radius: 999px;
      color: white;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 14px;
    }}
    .strength p {{
      margin: 0;
      font-size: 23px;
      line-height: 1.3;
      font-weight: 600;
    }}
    .closing-right {{
      position: absolute;
      right: 72px;
      top: 120px;
      width: 330px;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 26px;
      padding: 24px;
      backdrop-filter: blur(10px);
    }}
    .closing-pill {{
      background: rgba(255,255,255,.12);
      color: white;
      padding: 12px 16px;
      border-radius: 999px;
      text-align: center;
      font-weight: 700;
      margin-bottom: 14px;
    }}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const slides = {json.dumps(slides)};
    const params = new URLSearchParams(location.search);
    const index = Math.max(0, Math.min(slides.length - 1, Number(params.get('slide') || '1') - 1));
    const s = slides[index];
    const app = document.getElementById('app');

    const footer = `<div class="footer">${{String(index + 1).padStart(2, '0')}} | Powered Shopping | Classroom presentation</div>`;

    if (s.type === 'cover') {{
      app.innerHTML = `
        <div class="slide dark">
          <div class="label">${{s.label}}</div>
          <h1>${{s.title}}</h1>
          <div class="subtitle">${{s.subtitle}}</div>
          <div class="chips">
            <div class="chip">Voice Search</div>
            <div class="chip">Smart Cart</div>
            <div class="chip">AI Assistant</div>
          </div>
          <div class="screen-frame"><img src="${{s.desktop}}" /></div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'cards4') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="cards4">
            ${{s.cards.map(c => `
              <div class="card">
                <div class="card-label" style="background:${{c[2]}}">${{c[0]}}</div>
                <p>${{c[1]}}</p>
              </div>`).join('')}}
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'twoColumns') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="two-col">
            <div class="panel">
              <div class="panel-title" style="background:#1e4e8c">${{s.leftTitle}}</div>
              <div class="list">${{s.leftItems.map((item, i) => `<div class="list-item ${{i % 2 ? 'alt' : ''}}">${{item}}</div>`).join('')}}</div>
            </div>
            <div class="panel">
              <div class="panel-title" style="background:#1fa6c7">${{s.rightTitle}}</div>
              <div class="list">${{s.rightItems.map((item, i) => `<div class="list-item ${{i % 2 ? 'alt' : ''}}">${{item}}</div>`).join('')}}</div>
            </div>
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'process') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="process-wrap">
            <div class="process-steps">
              ${{s.steps.map((item, i) => `<div class="step ${{i % 2 ? 'alt' : ''}}">${{item}}</div>`).join('')}}
            </div>
            <div class="process-image"><img src="${{s.process}}" /></div>
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'architecture') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="architecture">
            ${{s.cols.map(col => `
              <div class="col">
                <div class="col-title" style="background:${{col[1]}}">${{col[0]}}</div>
                ${{col[2].map(item => `<div class="col-item">${{item}}</div>`).join('')}}
              </div>`).join('')}}
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'grid6') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="grid6">
            ${{s.items.map(item => `
              <div class="feature">
                <div class="feature-title" style="background:${{item[2]}}">${{item[0]}}</div>
                <p>${{item[1]}}</p>
              </div>`).join('')}}
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'screens') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="screens">
            <div>
              <div class="desktop-panel"><img src="${{s.desktop}}" /></div>
              <div class="screen-chips">
                <div class="screen-chip" style="background:#1e4e8c">Desktop view</div>
                <div class="screen-chip" style="background:#1fa6c7">Mobile view</div>
                <div class="screen-chip" style="background:#e65b87">Live project proof</div>
              </div>
            </div>
            <div class="mobile-panel"><img src="${{s.mobile}}" /></div>
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'strengths') {{
      app.innerHTML = `
        <div class="slide">
          <h1>${{s.title}}</h1>
          <div class="strengths-top">
            ${{s.stats.map(stat => `
              <div class="stat" style="background:${{stat[2]}}">
                <div class="big">${{stat[0]}}</div>
                <div class="small">${{stat[1]}}</div>
              </div>`).join('')}}
          </div>
          <div class="strength-list">
            ${{s.items.map(item => `
              <div class="strength">
                <div class="tag" style="background:${{item[2]}}">${{item[0]}}</div>
                <p>${{item[1]}}</p>
              </div>`).join('')}}
          </div>
          ${{footer}}
        </div>`;
    }} else if (s.type === 'closing') {{
      app.innerHTML = `
        <div class="slide dark">
          <div class="label">CONCLUSION</div>
          <h1>${{s.title}}</h1>
          <div class="subtitle">${{s.subtitle}}</div>
          <div class="subtitle" style="margin-top:34px;max-width:710px;">
            This project combines AI, voice interaction, and full-stack development.
            It shows how technology can improve shopping while staying reliable and demo-ready.
          </div>
          <div class="closing-right">
            <div class="closing-pill">Questions</div>
            <div class="closing-pill">Project flow</div>
            <div class="closing-pill">Technology used</div>
            <div class="closing-pill">Live demo</div>
            <div class="closing-pill">Future scope</div>
          </div>
          ${{footer}}
        </div>`;
    }}
  </script>
</body>
</html>"""

OUT.write_text(html, encoding="utf-8")
print(OUT)
