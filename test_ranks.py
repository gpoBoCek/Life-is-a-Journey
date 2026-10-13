"""Mage classes granted at mana releases, and the suppression rate of one mana per 10 minutes."""
import pathlib
from playwright.sync_api import sync_playwright
URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
SHOTS = pathlib.Path('/tmp/claude-0/-home-claude-life-is-a-journey/d62f4bed-cb54-5b99-892b-7b654af717cc/scratchpad')
SHOTS.mkdir(parents=True, exist_ok=True)
errors = []
def click(page, sel):
    loc = page.locator(sel)
    if not loc.count(): errors.append('MISSING ' + sel); return
    loc.first.click(); page.wait_for_timeout(70)
def text(page): return page.locator('#app').inner_text()
def expect(page, s):
    if s not in text(page): errors.append('NOT FOUND: ' + s)
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)
def ev(page, js, arg=None): return page.evaluate(js, arg) if arg is not None else page.evaluate(js)
def reload(page):
    page.reload(); page.wait_for_timeout(300)
    ev(page, "() => { Math.random = () => 0.99; }")
    # spells from landmarks walked on reopening, or a waystone, may be waiting
    while page.locator('[data-a=closeModal]').count(): page.locator('[data-a=closeModal]').first.click(); page.wait_for_timeout(60)
def release(page):
    """Two-step keyboard release (a real press is held for 3 seconds)."""
    for _ in range(2):
        ev(page, "() => { const b = document.querySelector('[data-hold]'); b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })); }")
        page.wait_for_timeout(100)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    ev(page, "() => { Math.random = () => 0.99; }")

    # the class ladder rises steeply and stays in order
    ladder = ev(page, "() => MAGE_CLASSES.map(c => c.at)")
    print('ladder:', ladder)
    check(all(a < b for a, b in zip(ladder, ladder[1:])), 'thresholds rise')
    check(ev(page, "() => mageClassIndex(299)") == -1 and ev(page, "() => mageClassIndex(300)") == 0 and ev(page, "() => mageClassIndex(42000)") == 9, 'class lookup')

    # suppression: one mana per 10 minutes spent, in total; stormy days count those twice
    ev(page, """() => { const t = today();
      S.events.push({ k: 'suppress', d: t, t: 0, sec: 600, mode: 'urge' });
      S.events.push({ k: 'suppress', d: t, t: 0, sec: 1500, mode: 'burst' });
      S.events.push({ k: 'suppress', d: t, t: 0, sec: 300, mode: 'still' });
      save(); }""")
    s1 = ev(page, "() => manaSnapshot()")
    print('suppression 10+25+5 min ->', s1['counts']['sup10'], 'mana')
    check(s1['counts']['sup10'] == 4, '40 minutes is 4 mana')
    ev(page, "() => { dayRec(today()).w = 4; save(); }")
    s2 = ev(page, "() => manaSnapshot()")
    check(s2['bonus'] == 4, 'stormy day doubles the suppression mana')
    ev(page, "() => { delete dayRec(today()).w; save(); }")
    check(ev(page, "() => { S.days[today()].s = 7400; return manaSnapshot().counts.steps; }") == 7, 'steps: 1,000 = 1')

    # sealed: shows no class yet
    click(page, 'nav [data-v=grimoire]')
    expect(page, 'Your class: no class yet.')

    # first release with ~450 mana: assessed through two classes at once
    ev(page, """() => { S.created = addDays(today(), -10);
      for (let i = 0; i < 90; i++) S.events.push({ k: 'peek', d: addDays(today(), -1 - (i % 9)), t: 0 });
      save(); }""")
    reload(page)
    click(page, 'nav [data-v=grimoire]')
    expect(page, 'Classes are assessed at each release')
    release(page)
    total = ev(page, "() => S.mana.snaps[0].total")
    print('first release total:', total, '| rank', ev(page, '() => S.mana.rank'))
    check(400 <= total < 550 and ev(page, '() => S.mana.rank') == 1, '8th class at ~450 mana')
    expect(page, 'PROMOTION'); expect(page, 'ASSESSED THROUGH 2 CLASSES'); expect(page, '8TH-CLASS MAGE')
    page.screenshot(path=str(SHOTS / 'promotion.png'))
    click(page, '[data-a=closeModal]')
    expect(page, 'YOUR CLASS'); expect(page, 'Next: 7th-class mage at 550 mana.'); expect(page, 'THE CLASSES'); expect(page, 'great mage')
    ev(page, "() => document.querySelector('main').scrollTop = 0")
    page.screenshot(path=str(SHOTS / 'class_open.png'), full_page=True)

    # a class is never taken away: undo most of the record, release again, still 8th
    ev(page, """() => { S.events = S.events.filter(e => e.k !== 'peek'); S.mana.at = Date.now() - 9 * 86400000; save(); }""")
    reload(page); click(page, 'nav [data-v=grimoire]')
    expect(page, 'Your class: 8th-class mage.')
    release(page)
    check(ev(page, '() => S.mana.rank') == 1, 'class kept after mana fell')
    check(page.locator('.overlay').count() == 0, 'no promotion modal without a promotion')

    # earning past the next threshold while sealed promotes only at the next release
    ev(page, """() => { for (let i = 0; i < 140; i++) S.events.push({ k: 'peek', d: addDays(today(), -2), t: 0 }); S.mana.at = Date.now() - 2 * 86400000; save(); }""")
    reload(page)
    check(ev(page, '() => S.mana.rank') == 1 and ev(page, '() => mageClassIndex(manaSnapshot().total)') >= 2, 'no promotion while sealed')
    ev(page, "() => { S.mana.at = Date.now() - 9 * 86400000; save(); }")
    reload(page); click(page, 'nav [data-v=grimoire]')
    release(page)
    print('after third release: rank', ev(page, '() => S.mana.rank'), mageclass := ev(page, '() => mageClassName(S.mana.rank)'))
    check(ev(page, '() => S.mana.rank') >= 2, 'promoted at the next release')

    # a snapshot from the old rules is not compared with the new count
    ev(page, """() => { const s = S.mana.snaps; s[s.length - 2].rules = undefined; save(); render(); }""")
    expect(page, 'Mana is counted differently since your last release')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
