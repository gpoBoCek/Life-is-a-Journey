"""The phone app: installable, works offline, picks up a new version without touching the saved journey."""
import json, pathlib, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).parent
SHOTS = pathlib.Path('/tmp/claude-0/-home-claude/d62f4bed-cb54-5b99-892b-7b654af717cc/scratchpad')
errors = []
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)

site = pathlib.Path(tempfile.mkdtemp())
app_dir = site / 'life-is-a-journey'          # same shape as a GitHub Pages project address
shutil.copytree(ROOT / 'docs', app_dir)
server = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--directory', str(site)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://localhost:8765/life-is-a-journey/'
old_build = json.loads((app_dir / 'version.json').read_text())['build']

def deploy_new_version(new_build):
    """Simulates pushing a new version: same files, new build id (as a real code change would produce)."""
    for name in ['index.html', 'sw.js', 'version.json']:
        p = app_dir / name
        p.write_text(p.read_text().replace(old_build, new_build))
    idx = app_dir / 'index.html'
    idx.write_text(idx.read_text().replace('a chronicle of small days', 'a chronicle of small days, updated'))

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
        page.goto(URL); page.wait_for_timeout(1200)
        page.click('[data-a=begin]'); page.wait_for_timeout(100)
        page.fill('#f-add', 'Water the basil'); page.press('#f-add', 'Enter'); page.wait_for_timeout(100)
        page.reload(); page.wait_for_timeout(1200)
        ctl = page.evaluate("() => !!navigator.serviceWorker.controller")
        print('service worker in control:', ctl, '| build', page.evaluate('() => BUILD'), '| PWA', page.evaluate('() => PWA'))
        check(ctl, 'service worker controls the page')

        cdp = ctx.new_cdp_session(page)
        inst = cdp.send('Page.getInstallabilityErrors')
        print('installability errors:', inst.get('installabilityErrors'))
        manifest = cdp.send('Page.getAppManifest')
        print('manifest errors:', manifest.get('errors'))
        check(not manifest.get('errors'), 'manifest parses cleanly')
        check(not [e for e in inst.get('installabilityErrors', []) if e.get('errorId') not in ('in-incognito',)], 'installable')

        # offline: the app and the journey are still there
        ctx.set_offline(True)
        page.reload(); page.wait_for_timeout(800)
        txt = page.locator('#app').inner_text()
        print('offline loads:', 'Water the basil' in txt)
        check('Water the basil' in txt, 'works offline with the saved journey')
        ctx.set_offline(False)

        # a new version is published while the app is open
        deploy_new_version('abc123new0')
        page.evaluate("() => { Pwa.lastCheck = 0; return Pwa.check(); }"); page.wait_for_timeout(500)
        bar = page.locator('.updbar')
        print('update bar shown:', bar.count() == 1, bar.inner_text() if bar.count() else '')
        check(bar.count() == 1, 'update notice appears')
        page.screenshot(path=str(SHOTS / 'pwa_update_bar.png'))
        page.click('[data-a=applyUpdate]'); page.wait_for_timeout(1500)
        nb = page.evaluate('() => BUILD')
        txt = page.locator('#app').inner_text()
        snaps = page.evaluate("() => Pwa.snapshots().map(s => [s.from, s.to])")
        print('after update: build', nb, '| journey kept:', 'Water the basil' in txt, '| safety copies:', snaps)
        check(nb == 'abc123new0', 'new version running')
        check('Water the basil' in txt, 'journey survives the update')
        check(snaps == [[old_build, 'abc123new0']], 'a copy was kept from before the update')
        check(page.locator('.updbar').count() == 0, 'no notice once updated')

        # restore the copy (two taps), and save a backup file
        page.click('[data-a=openOptions]'); page.wait_for_timeout(100)
        txt = page.locator('#app').inner_text()
        check('BEFORE EACH UPDATE' in txt and 'Saved on this phone' in txt, 'options show the phone wording and copies')
        page.evaluate("() => { S.errands = []; save(); render(); }")
        page.click('[data-a=restoreSnap]'); page.click('[data-a=restoreSnap]'); page.wait_for_timeout(200)
        print('restored errands:', page.evaluate("() => S.errands.map(e => e.text)"))
        check(page.evaluate("() => S.errands.length") == 1, 'restore brings the copy back')
        page.click('[data-a=openOptions]'); page.wait_for_timeout(100)
        with page.expect_download() as dl:
            page.click('[data-a=exportData]')
        d = dl.value
        data = json.loads(pathlib.Path(d.path()).read_text())
        print('backup file:', d.suggested_filename, '| errands in it:', len(data['errands']))
        check(d.suggested_filename.startswith('life-is-a-journey-') and data['v'] == 1, 'backup file downloads')
        check(page.evaluate("() => !!S.lastBackup"), 'last backup remembered')
        page.screenshot(path=str(SHOTS / 'pwa_options.png'), full_page=True)

        # a fresh visit (new launch) after another deploy gets the new page straight away
        deploy_new_version_2 = lambda: None
        for name in ['index.html', 'sw.js', 'version.json']:
            pth = app_dir / name; pth.write_text(pth.read_text().replace('abc123new0', 'def456new1'))
        page2 = ctx.new_page(); page2.goto(URL); page2.wait_for_timeout(1200)
        print('new launch build:', page2.evaluate('() => BUILD'), '| journey:', 'Water the basil' in page2.locator('#app').inner_text())
        check(page2.evaluate('() => BUILD') == 'def456new1', 'next launch runs the newest version')
        b.close()
finally:
    server.terminate()
print('ERRORS' if errors else 'NO ERRORS', errors)
