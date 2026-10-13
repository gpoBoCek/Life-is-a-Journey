"""Test SUPPRESS sessions and the sealed mana reserve, simulating the passage of time."""
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
def txt(page): return page.locator('#app').inner_text()
def expect(page, s):
    if s not in txt(page): errors.append('NOT FOUND: ' + s)
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    # mana is sealed during the first week
    click(page, 'nav [data-v=grimoire]')
    expect(page, 'Your mana is suppressed')
    expect(page, 'in 7 days')

    # urge, run to time-up
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=suppress]')
    page.fill('#su-label', 'scroll the phone')
    click(page, '[data-a=setForm][data-k="su-before"][data-v="7"]')
    click(page, '[data-a=setForm][data-k="su-dur"][data-v="5"]')
    click(page, '[data-a=supBegin]')
    if page.locator('nav').count(): errors.append('nav should be hidden while running')
    page.screenshot(path=SH + '40_suppress_running.png')
    page.evaluate("() => { S.active.start = Date.now() - 5 * 60 * 1000 - 500; }")
    page.wait_for_timeout(600)
    expect(page, 'How strong is the urge now?')
    click(page, '[data-a=setForm][data-k="su-after"][data-v="2"]')
    page.screenshot(path=SH + '41_suppress_after.png')
    click(page, '[data-a=supFinish][data-v=held]'); closeModals(page)
    expect(page, 'flowed into your mana')
    r1 = page.evaluate("() => S.suppressions[0]")
    print('urge record:', {k: r1[k] for k in ('mode', 'label', 'spent', 'before', 'after', 'held')})

    # burst on an errand, stopped early at 3 minutes, errand marked finished
    page.evaluate("() => { S.errands.push(newErrand('Declutter the desk', today())); save(); }")
    click(page, '[data-a=supAgain]')
    click(page, '[data-a=supMode][data-v=burst]')
    click(page, '[data-a=supPick]')
    click(page, '[data-a=supBegin]')
    page.evaluate("() => { S.active.start = Date.now() - 3 * 60 * 1000 - 2000; }")
    click(page, '[data-a=supStop]')
    expect(page, 'Is the errand finished?')
    click(page, '[data-a=supFinish][data-v=errandDone]'); closeModals(page)
    r2 = page.evaluate("() => ({ rec: S.suppressions[1], errandsLeft: S.errands.length })")
    print('burst record:', {k: r2['rec'][k] for k in ('mode', 'label', 'spent', 'dur')}, 'errands left:', r2['errandsLeft'])

    # stillness: reload mid-session, then let it run out while "closed"
    click(page, '[data-a=supAgain]')
    click(page, '[data-a=supMode][data-v=still]')
    click(page, '[data-a=setForm][data-k="su-dur"][data-v="2"]')
    click(page, '[data-a=supBegin]')
    page.reload(); page.wait_for_timeout(400)
    expect(page, 'STILLNESS')
    print('resumed after reload, timer shows:', page.locator('#sup-timer').inner_text())
    page.evaluate("() => { S.active.start = Date.now() - 3 * 60 * 1000; save(); }")
    page.reload(); page.wait_for_timeout(400); closeModals(page)
    r3 = page.evaluate("() => ({ n: S.suppressions.length, last: S.suppressions[2], active: S.active })")
    print('stillness auto-finished on reopen:', r3['n'] == 3, r3['last']['spent'], 'active:', r3['active'])

    # mana: open the seal after the first week
    page.evaluate("""() => { S.created = addDays(today(), -10);
      for (let i = 10; i >= 1; i--) { const k = addDays(today(), -i); S.days[k] = { a: 2, w: i % 3 === 0 ? 4 : 1 }; S.events.push({ k: 'cast', d: k, t: Date.now() }); }
      S.events.push({ k: 'peek', d: addDays(today(), -3), t: Date.now() }); save(); }""")
    page.reload(); page.wait_for_timeout(300)
    click(page, 'nav [data-v=camp]')
    expect(page, 'The seal has weakened')
    click(page, 'nav [data-v=grimoire]')
    btn = page.locator('[data-hold=releaseMana]')
    box = btn.bounding_box()
    page.mouse.move(box['x'] + 20, box['y'] + 10); page.mouse.down(); page.wait_for_timeout(1000); page.mouse.up(); page.wait_for_timeout(100)
    print('short press did not release:', page.evaluate("() => S.mana.at") is None)
    page.mouse.move(box['x'] + 20, box['y'] + 10); page.mouse.down(); page.wait_for_timeout(3300); page.mouse.up(); page.wait_for_timeout(150)
    expect(page, 'Your first release')
    expect(page, 'WHAT IT IS MADE OF')
    page.evaluate("() => document.querySelector('main').scrollTop = 0")
    page.screenshot(path=SH + '42_mana_first.png')
    snap = page.evaluate("() => S.mana.snaps[0]")
    print('first release total:', snap['total'], 'counts:', snap['counts'], 'bonus:', snap['bonus'], 'storm', snap['stormActive'], '/', snap['stormDays'])

    # 2 days later it is sealed until 8 days after release
    page.evaluate("() => { S.mana.at = Date.now() - 2 * 86400000; save(); }")
    page.reload(); page.wait_for_timeout(300); click(page, 'nav [data-v=grimoire]')
    expect(page, 'sealed again')
    print('sealed text:', [l for l in txt(page).split('\n') if 'released' in l][:1])

    # 12 days later: more done, release again via keyboard (two-step), delta shows
    page.evaluate("""() => { S.mana.at = Date.now() - 12 * 86400000; S.mana.snaps[0].t = S.mana.at;
      for (let i = 0; i < 6; i++) S.events.push({ k: 'floor', d: today(), t: Date.now() });
      S.events.push({ k: 'suppress', d: today(), t: Date.now(), sec: 1500 }); save(); }""")
    page.reload(); page.wait_for_timeout(300); click(page, 'nav [data-v=grimoire]')
    page.evaluate("() => { const b = document.querySelector('[data-hold]'); b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); }")
    page.wait_for_timeout(100)
    expect(page, 'PRESS AGAIN TO RELEASE')
    page.evaluate("() => { const b = document.querySelector('[data-hold]'); b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); }")
    page.wait_for_timeout(150)
    expect(page, 'since your last release')
    print('second release line:', [l for l in txt(page).split('\n') if 'since your last' in l])
    page.evaluate("() => document.querySelector('main').scrollTop = 0")
    page.screenshot(path=SH + '43_mana_second.png')
    page.evaluate("() => { const w = [...document.querySelectorAll('.win')][0]; w.scrollIntoView({block: 'end'}); }")
    page.screenshot(path=SH + '44_mana_second_bottom.png')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
