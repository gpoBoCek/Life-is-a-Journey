#!/usr/bin/env python3
"""Bundle the app.

dist/life-is-a-journey.html  page body for the claude.ai artifact (the publisher adds doctype/head/body)
dist/standalone.html         a complete HTML document, used for local testing
docs/                        the installable phone app (served by GitHub Pages from /docs):
                             index.html, sw.js, manifest.webmanifest, version.json, icons

BUILD is a short hash of the app's code. It changes only when the code changes, so the phone app is told about an
update only when there is a real one. Saved journeys are never part of the build.
"""
import base64, hashlib, json, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
DOCS = ROOT / 'docs'
DIST.mkdir(exist_ok=True)
DOCS.mkdir(exist_ok=True)

css = (SRC / 'style.css').read_text()
js = '\n'.join((SRC / f).read_text() for f in ['content_spells.js', 'content_world.js', 'content_bestiary.js', 'app.js'])
# A literal "</script" inside the bundle would end the script tag early.
js = js.replace('</script', '<\\/script')
FONT_B64 = base64.b64encode((ROOT / 'fonts' / 'vt323-sub.woff').read_bytes()).decode()
FONTFACE = "@font-face{font-family:'VT323';src:url(data:font/woff;base64," + FONT_B64 + ") format('woff');font-display:block}"
BUILD = hashlib.sha1((css + js + FONT_B64).encode()).hexdigest()[:10]


def body(pwa):
    head = "const BUILD = '" + BUILD + "';\nconst PWA = " + ('true' if pwa else 'false') + ";\n"
    return (
        '<title>Life is a Journey</title>\n'
        + '<style>\n' + FONTFACE + '\n' + css + '\n</style>\n'
        + '<div id="app"></div>\n'
        + '<script>\n' + head + js + '\n</script>\n'
    )


BASE_STYLE = ('<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
              'html,body{background:#000}body{margin:0}[hidden]{display:none!important}</style>')


def document(pwa):
    extra = ''
    if pwa:
        extra = ('<meta name="theme-color" content="#000000">'
                 '<meta name="color-scheme" content="dark">'
                 '<meta name="mobile-web-app-capable" content="yes">'
                 '<link rel="manifest" href="manifest.webmanifest">'
                 '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">'
                 '<link rel="apple-touch-icon" href="apple-touch-icon.png">')
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            + extra + BASE_STYLE + '</head><body>' + body(pwa) + '</body></html>')


artifact = body(False)
(DIST / 'life-is-a-journey.html').write_text(artifact)
(DIST / 'standalone.html').write_text(document(False))

# ---- the phone app ----
(DOCS / 'index.html').write_text(document(True))
(DOCS / 'version.json').write_text(json.dumps({'build': BUILD}) + '\n')
(DOCS / '.nojekyll').write_text('')
for f in ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']:
    shutil.copyfile(ROOT / 'icons' / f, DOCS / f)
manifest = {
    'id': './',
    'name': 'Life is a Journey',
    'short_name': 'Journey',
    'description': 'A chronicle of small days.',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'portrait',
    'background_color': '#000000',
    'theme_color': '#000000',
    'icons': [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
(DOCS / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
(DOCS / 'sw.js').write_text((ROOT / 'sw.template.js').read_text().replace('__BUILD__', BUILD))

print('built', len(artifact) // 1024, 'KB, build', BUILD)
