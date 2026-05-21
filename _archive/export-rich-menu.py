"""
export-rich-menu.py
Usage: python3 export-rich-menu.py
Outputs: rich-menu-A.png and rich-menu-B.png at 2500×1686 (LINE spec)
"""
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

W, H = 2500, 1686  # LINE Rich Menu spec

# Standalone HTML template for each menu
# Inlines all CSS — no external sofa.css dependency needed for capture
TEMPLATE = """<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width={W},height={H}"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700;900&family=Noto+Sans+TC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --peach:#E7BBA7;--peach-2:#D4A088;
  --cream:#F5F0EA;--navy:#19303E;--navy-2:#1F3848;--navy-3:#142836;
  --line:rgba(245,240,234,.1);--line-2:rgba(245,240,234,.06);
  --mono:'JetBrains Mono',monospace;
  --serif:'Noto Serif TC',serif;
  --sans:'Noto Sans TC',sans-serif;
}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#0A1620}}
.rm{{
  width:{W}px;height:{H}px;
  container-type:inline-size;
  background:
    radial-gradient(ellipse 90% 70% at 30% 25%, rgba(231,187,167,.06) 0%, transparent 55%),
    radial-gradient(ellipse 80% 60% at 80% 90%, rgba(74,99,115,.18) 0%, transparent 60%),
    linear-gradient(160deg, #142836 0%, #0D1C28 50%, #08141C 100%);
  display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;
  position:relative;
}}
.rm::before{{
  content:"§";position:absolute;
  right:-6%;bottom:-20%;
  font-family:var(--serif);font-weight:500;
  font-size:46cqw;line-height:.8;
  color:rgba(231,187,167,.04);letter-spacing:-.04em;
  pointer-events:none;
}}
.rm::after{{
  content:"";position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(245,240,234,.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,240,234,.018) 1px, transparent 1px);
  background-size:6% 9%;
  mask-image:radial-gradient(ellipse 70% 60% at 50% 40%, #000 40%, transparent 80%);
  pointer-events:none;
}}
.cell{{
  position:relative;display:flex;flex-direction:column;
  padding:8.5% 6% 7%;
  border-right:1px solid rgba(245,240,234,.06);
  border-bottom:1px solid rgba(245,240,234,.06);
  z-index:1;
}}
.cell:nth-child(3n){{border-right:none}}
.cell:nth-child(n+4){{border-bottom:none}}
.cell .tag{{
  font-family:var(--mono);font-size:1.4cqw;font-weight:500;
  color:rgba(231,187,167,.78);letter-spacing:.24em;
  display:flex;align-items:center;gap:.6em;
}}
.cell .tag::before{{
  content:"";width:1.4em;height:1px;background:rgba(231,187,167,.7);
}}
.cell .num{{
  position:absolute;top:8.5%;right:6%;
  font-family:var(--mono);font-size:1.2cqw;font-weight:400;
  color:rgba(245,240,234,.22);letter-spacing:.08em;
}}
.cell .ic{{
  flex:1;display:flex;align-items:center;justify-content:center;
  margin:6% 0 4%;
}}
.cell .ic svg{{
  width:5.2cqw;height:5.2cqw;
  stroke:var(--peach);stroke-width:1.4;fill:none;
  stroke-linecap:round;stroke-linejoin:round;
  opacity:.92;
}}
.cell .zh{{
  font-family:var(--serif);font-weight:500;
  font-size:3.6cqw;color:var(--cream);line-height:1;letter-spacing:.05em;
  margin-bottom:.35em;
}}
.cell .desc{{
  font-family:var(--sans);font-size:1.15cqw;font-weight:300;
  color:rgba(245,240,234,.45);letter-spacing:.08em;
}}
.cell.pri{{
  background:linear-gradient(180deg, rgba(231,187,167,.08) 0%, rgba(231,187,167,.02) 100%);
}}
.cell.pri::after{{
  content:"";position:absolute;left:6%;right:6%;top:0;
  height:2px;background:var(--peach);
}}
.cell.pri .tag{{color:var(--peach)}}
.cell.pri .tag::before{{background:var(--peach)}}
.cell.pri .ic svg{{stroke:var(--peach-2);opacity:1}}
.cell.mute .zh{{color:rgba(245,240,234,.62)}}
.cell.mute .ic svg{{stroke:rgba(231,187,167,.55)}}
.cell.mute .tag{{color:rgba(231,187,167,.5)}}
.cell.mute .tag::before{{background:rgba(231,187,167,.45)}}
.corner{{
  position:absolute;bottom:3%;right:3%;
  font-family:var(--mono);font-size:1cqw;
  color:rgba(245,240,234,.28);letter-spacing:.18em;
  z-index:2;
}}
.corner b{{color:var(--peach);font-weight:500}}
</style>
</head>
<body>
<div class="rm">
{CELLS}
<div class="corner">{LABEL}</div>
</div>
</body>
</html>
"""

CELLS_A = """
<div class="cell">
  <span class="tag">LAW</span><span class="num">01</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 8h7M9 12h7M9 16h5"/></svg></div>
  <div class="zh">法條</div><div class="desc">全文 · 釋字 · 條號跳轉</div>
</div>
<div class="cell pri">
  <span class="tag">SEARCH</span><span class="num">02</span>
  <div class="ic"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></div>
  <div class="zh">查法條</div><div class="desc">關鍵字 · 條號直達</div>
</div>
<div class="cell">
  <span class="tag">STATS</span><span class="num">03</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M5 19V13M12 19V9M19 19V5"/><path d="M3 21h18" opacity=".55"/></svg></div>
  <div class="zh">進度</div><div class="desc">各法規學習統計</div>
</div>
<div class="cell">
  <span class="tag">COLLECT</span><span class="num">04</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z"/></svg></div>
  <div class="zh">我的收藏</div><div class="desc">已收藏的法條清單</div>
</div>
<div class="cell">
  <span class="tag">HELP</span><span class="num">05</span>
  <div class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg></div>
  <div class="zh">幫助</div><div class="desc">常見問題 · 教學</div>
</div>
<div class="cell mute">
  <span class="tag">MORE</span><span class="num">06</span>
  <div class="ic"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg></div>
  <div class="zh">更多</div><div class="desc">設定 · 帳號 · 序號</div>
</div>
"""

CELLS_B = """
<div class="cell">
  <span class="tag">SERIAL</span><span class="num">01</span>
  <div class="ic"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M18 12v3M15 12v2"/></svg></div>
  <div class="zh">我的序號</div><div class="desc">查詢 · 啟用 · 到期日</div>
</div>
<div class="cell">
  <span class="tag">FAQ</span><span class="num">02</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H10l-4 4z"/><path d="M10 9.5a2 2 0 1 1 2.5 1.9c-.5.2-.5.6-.5 1.1"/><circle cx="12" cy="14.5" r=".5" fill="currentColor" stroke="none"/></svg></div>
  <div class="zh">Q&amp;A</div><div class="desc">常見問題選單</div>
</div>
<div class="cell">
  <span class="tag">PLAN</span><span class="num">03</span>
  <div class="ic"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M8 9h8M8 13h8M8 17h5"/></svg></div>
  <div class="zh">方案</div><div class="desc">月卡 · 季卡 · 年卡</div>
</div>
<div class="cell pri">
  <span class="tag">BUY</span><span class="num">04</span>
  <div class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 10h18M7 15h4"/></svg></div>
  <div class="zh">購買</div><div class="desc">立即升級方案</div>
</div>
<div class="cell">
  <span class="tag">REPORT</span><span class="num">05</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M5 3v18"/><path d="M5 4h11l-2 4 2 4H5"/></svg></div>
  <div class="zh">回報</div><div class="desc">錯誤 · 內容 · 建議</div>
</div>
<div class="cell mute">
  <span class="tag">BACK</span><span class="num">06</span>
  <div class="ic"><svg viewBox="0 0 24 24"><path d="M10 5l-7 7 7 7"/><path d="M3 12h18"/></svg></div>
  <div class="zh">返回</div><div class="desc">回到主選單</div>
</div>
"""

MENUS = [
    ("A-Main",   CELLS_A, "SOFA <b>·</b> MAIN",    "rich-menu-A.png"),
    ("B-Account",CELLS_B, "SOFA <b>·</b> ACCOUNT", "rich-menu-B.png"),
]

async def main():
    out_dir = Path(__file__).parent
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for name, cells, label, fname in MENUS:
            html = TEMPLATE.format(W=W, H=H, CELLS=cells, LABEL=label)
            page = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
            await page.set_content(html, wait_until="networkidle")
            # wait for web fonts
            await page.wait_for_timeout(2500)
            out = out_dir / fname
            await page.screenshot(path=str(out), full_page=False, type="png")
            await page.close()
            size_kb = out.stat().st_size // 1024
            print(f"[{name}] → {out.name}  {size_kb} KB")
        await browser.close()

asyncio.run(main())
