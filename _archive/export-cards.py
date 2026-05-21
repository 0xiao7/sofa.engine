"""
export-cards.py — 渲染 LINE Flex Message Hero Image
Usage: python3 export-cards.py
Outputs: account.png, qa.png, pricing.png, buy.png, help.png (1040×520 PNG)

每張卡片只渲染「header 區」當 hero image，body/footer 由 LINE Flex 動態生成。
這樣可以保留宋體大標、Peach 漸層裝飾線、§ 浮水印等 CSS 質感，
同時保有按鈕互動性與動態文字（序號、到期日）。
"""
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

W, H = 1040, 520  # LINE Flex hero image, aspect ratio 13:6.5 ~= 2:1

# 共用 HTML template：只有 header 區（brand / title / sub / 裝飾元素）
TEMPLATE = """<!doctype html>
<html lang="zh-Hant"><head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700;900&family=Noto+Sans+TC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --navy:#1F3848;--navy-2:#19303E;--navy-3:#142836;--navy-4:#0D1C28;
  --peach:#E7BBA7;--peach-2:#F0CDBD;--peach-3:#C89580;
  --cream:#F5F0EA;--cream-2:#ECE5DB;
  --serif:'Noto Serif TC',serif;
  --sans:'Noto Sans TC',sans-serif;
  --mono:'JetBrains Mono',monospace;
}}
html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{
  background:
    radial-gradient(ellipse 90% 70% at 30% 25%, rgba(231,187,167,.08) 0%, transparent 55%),
    radial-gradient(ellipse 80% 60% at 80% 90%, rgba(74,99,115,.18) 0%, transparent 60%),
    linear-gradient(160deg, #142836 0%, #0D1C28 50%, #08141C 100%);
  position:relative;
}}
/* § 浮水印 */
body::before{{
  content:"§";position:absolute;
  right:-3%;bottom:-30%;
  font-family:var(--serif);font-weight:500;
  font-size:540px;line-height:.8;
  color:rgba(231,187,167,.06);letter-spacing:-.04em;
  pointer-events:none;z-index:0;
}}
/* 格線 */
body::after{{
  content:"";position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(245,240,234,.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,240,234,.025) 1px, transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse 70% 60% at 50% 40%, #000 40%, transparent 80%);
  pointer-events:none;z-index:0;
}}
.wrap{{
  position:relative;z-index:1;
  padding:80px 80px 70px;
  height:100%;display:flex;flex-direction:column;justify-content:center;
}}
.br{{
  font-family:var(--mono);font-size:22px;font-weight:500;
  color:var(--peach);letter-spacing:.32em;
  display:flex;align-items:center;gap:18px;margin-bottom:30px;
}}
.br::before{{content:"";width:48px;height:1px;background:var(--peach)}}
.t{{
  font-family:var(--serif);font-weight:600;
  font-size:96px;line-height:1.1;letter-spacing:.04em;
  color:var(--cream);margin-bottom:18px;
}}
.sub{{
  font-family:var(--mono);font-size:18px;color:rgba(245,240,234,.55);
  letter-spacing:.22em;text-transform:uppercase;margin-bottom:34px;
}}
/* 漸層 peach 裝飾線 */
.deco{{
  height:1.5px;width:100%;
  background:linear-gradient(90deg, transparent, rgba(231,187,167,.85) 30%, rgba(231,187,167,.85) 70%, transparent);
}}
/* 角落 watermark */
.corner{{
  position:absolute;bottom:36px;right:80px;z-index:2;
  font-family:var(--mono);font-size:15px;color:rgba(245,240,234,.32);
  letter-spacing:.22em;
}}
.corner b{{color:var(--peach);font-weight:500}}
</style>
</head>
<body>
<div class="wrap">
  <div class="br">{BR}</div>
  <div class="t">{TITLE}</div>
  <div class="sub">{SUB}</div>
  <div class="deco"></div>
</div>
<div class="corner">{CORNER}</div>
</body></html>"""

CARDS = [
    # (filename, brand label, big title, English subtitle, corner watermark)
    ("account.png",          "SOFA ENGINE / ACCOUNT",    "帳號狀態",    "Member Status · Serial · Expiry",      "SOFA <b>·</b> ACCOUNT"),
    ("qa.png",               "SOFA ENGINE / Q&A",        "常見問題",    "Browse by Topic",                      "SOFA <b>·</b> Q&amp;A"),
    ("qa-serial.png",        "SOFA ENGINE / Q&A",        "序號相關",    "Serial Code FAQ",                      "SOFA <b>·</b> SERIAL"),
    ("qa-pay.png",           "SOFA ENGINE / Q&A",        "方案 / 付費", "Pricing &amp; Payment",                "SOFA <b>·</b> PAYMENT"),
    ("qa-sys.png",           "SOFA ENGINE / Q&A",        "系統操作",    "System Operations",                    "SOFA <b>·</b> SYSTEM"),
    ("pricing.png",          "SOFA ENGINE / PLANS",      "訂閱方案",    "Monthly · Quarterly",                  "SOFA <b>·</b> PLANS"),
    ("pricing-monthly.png",  "SOFA ENGINE / MONTHLY",    "月費方案",    "Monthly · NT$380",                     "SOFA <b>·</b> MONTHLY"),
    ("pricing-quarterly.png","SOFA ENGINE / QUARTERLY",  "季費方案",    "Quarterly · NT$990 · Save 13%",        "SOFA <b>·</b> QUARTERLY"),
    ("buy.png",              "SOFA ENGINE / CHECKOUT",   "立即購買",    "Secure Payment · 5 min",               "SOFA <b>·</b> BUY"),
    ("help.png",             "SOFA ENGINE / GUIDE",      "使用說明",    "Full Command Reference",               "SOFA <b>·</b> GUIDE"),
]

async def main():
    out_dir = Path(__file__).parent
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for fname, br, title, sub, corner in CARDS:
            html = TEMPLATE.format(W=W, H=H, BR=br, TITLE=title, SUB=sub, CORNER=corner)
            page = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
            await page.set_content(html, wait_until="domcontentloaded")
            await page.wait_for_timeout(2500)  # 等 Google Fonts 載入
            out = out_dir / fname
            await page.screenshot(path=str(out), full_page=False, type="png")
            await page.close()
            size_kb = out.stat().st_size // 1024
            print(f"✅ {fname}  {size_kb} KB")
        await browser.close()
    print("\n📤 推到 GitHub Pages 後可用 URL：")
    print("   https://sofaengine.org/cards/<filename>.png")

asyncio.run(main())
