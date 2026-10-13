"""Test prophecies: free, delve-linked, seal-linked, judging, and the calibration record."""
import pathlib
from playwright.sync_api import sync_playwright
URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
SH = '/tmp/claude-0/shots/'
errors = []
def click(page, sel):
    loc = page.locator(sel)
    if not loc.count(): errors.append('MISSING ' + sel); return
    loc.first.click(); page.wait_for_timeout(60)
def closeModals(page):
    while page.locator('[data-a=closeModal]').count(): click(page, '[data-a=closeModal]')
def expect(page, s):
    if s not in page.locator('#app').inner_text(): errors.append('NOT FOUND: ' + s)
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    # migration: a save made before prophecies existed
    page.goto(URL); page.wait_for_timeout(200)
    page.evaluate("() => { const s = freshState(); delete s.prophecies; localStorage.setItem('lij.state.v1', JSON.stringify(s)); }")
    page.reload(); page.wait_for_timeout(300)
    print('migrated prophecies array:', page.evaluate("() => Array.isArray(S.prophecies)"))

    # free prophecy due today
    click(page, 'nav [data-v=arts]')
    expect(page, 'PROPHECY')
    click(page, '[data-a=openView][data-v=prophecy]')
    page.fill('#pr-text', 'The landlord will refuse the repair')
    page.locator('#pr-p').fill('80')
    page.fill('#pr-due', page.evaluate('() => today()'))
    click(page, '[data-a=newProphecy]')
    expect(page, 'TO JUDGE')
    click(page, 'nav [data-v=camp]')
    expect(page, 'TO REVISIT'); expect(page, 'its day is today')
    click(page, '[data-a=openView][data-v=prophecy]')
    click(page, '[data-a=judge][data-v=no]'); closeModals(page)
    expect(page, 'did not happen')

    # delve-linked prophecy with a safety charm
    click(page, 'nav [data-v=arts]')
    click(page, '[data-a=openView][data-v=delves]')
    page.fill('#d-name', 'Speaking up'); click(page, '[data-a=newDelve]')
    page.fill('#fl-text', 'Ask a question in a meeting'); click(page, 'button[data-a=addFloor]')
    click(page, '[data-a=openFloor]')
    page.fill('#fl-proph', 'My voice will shake and someone will smirk')
    page.locator('#fl-p').fill('70')
    click(page, '[data-a=scout][data-v="8"]')
    expect(page, 'The Banshee predicted')
    click(page, '[data-a=setForm][data-k="fl-o"][data-v=partly]')
    click(page, '[data-a=setForm][data-k="fl-charm"]')
    page.screenshot(path=SH + '30_floor_prophecy.png')
    click(page, '[data-a=found][data-v="4"]'); closeModals(page)
    expect(page, 'The prophecy partly happened')
    fp = page.evaluate("() => S.prophecies.find(p => p.src === 'delve')")
    print('delve prophecy:', {k: fp[k] for k in ('p', 'o', 'charm', 'src')})

    # seal-linked prophecy, default due in a week
    click(page, 'nav [data-v=arts]')
    click(page, '[data-a=openView][data-v=seal]')
    click(page, '[data-a=setForm][data-k="s-track"]')   # off by default now
    page.fill('#s-text', 'I will be blamed for the delay'); page.locator('#s-p').fill('60')
    click(page, '[data-a=sealIt]')
    sp = page.evaluate("() => { const p = S.prophecies.find(p => p.src === 'seal'); return { p: p.p, due: p.due, inAWeek: p.due === addDays(today(), 7) }; }")
    print('seal prophecy:', sp)
    # untracked seal creates no prophecy
    click(page, '[data-a=setForm][data-k="s-track"]')
    page.fill('#s-text', 'untracked worry'); click(page, '[data-a=sealIt]')
    print('prophecies after untracked seal:', page.evaluate("() => S.prophecies.length"))

    # simulated history: 30 judged prophecies, confident early, calmer later
    page.evaluate("""() => {
      for (let i = 0; i < 30; i++) {
        const p = i < 15 ? 70 + (i % 4) * 10 : 30 + (i % 4) * 10;
        const o = (i % 9 === 0) ? 'yes' : (i % 7 === 0 ? 'partly' : 'no');
        S.prophecies.push({ id: 'sim' + i, text: 'sim ' + i, p: p, t: Date.now() - (40 - i) * 86400000, d: addDays(today(), -(40 - i)), due: null, src: 'free', ref: null, o: o, charm: i % 5 === 0, judged: addDays(today(), -(39 - i)) });
      }
      save();
    }""")
    page.reload(); page.wait_for_timeout(300)
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=prophecy]')
    page.evaluate("() => { const ws = [...document.querySelectorAll('.win')].find(w => w.textContent.includes('RECORD')); ws.scrollIntoView(); }")
    page.wait_for_timeout(100)
    page.screenshot(path=SH + '31_record.png')
    print('record text:', page.locator('.win', has_text="BANSHEE'S RECORD").inner_text().replace('\n', ' | ')[:700])
    click(page, 'nav [data-v=road]')
    expect(page, "THE BANSHEE'S RECORD")
    expect(page, 'Prophecies judged')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
