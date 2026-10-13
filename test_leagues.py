"""Leagues and spells cannot be farmed by doing and undoing; Day 1 settings; the day-turn hour."""
import pathlib
from playwright.sync_api import sync_playwright
URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
errors = []
def click(page, sel):
    loc = page.locator(sel)
    if not loc.count(): errors.append('MISSING ' + sel); return
    loc.first.click(); page.wait_for_timeout(60)
def closeModals(page):
    while page.locator('[data-a=closeModal]').count(): click(page, '[data-a=closeModal]')
def expect(page, s):
    if s not in page.locator('#app').inner_text(): errors.append('NOT FOUND: ' + s)
def st(page): return page.evaluate("() => ({ todayCounts: todayCounts(), leagues: leagues(), done: S.journey.done, spells: S.spells.length })")
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    page.evaluate("() => { Math.random = () => 0; }")   # every roll would find a spell
    # adding plans alone does not count
    page.fill('#f-add', 'Buy groceries'); page.press('#f-add', 'Enter'); page.wait_for_timeout(60)
    print('after adding an errand:', st(page))
    # tick + undo
    click(page, '[data-a=tick]'); closeModals(page)
    print('after ticking:', st(page))
    click(page, '[data-a=undo]')
    print('after undo:', st(page))
    # ritual cast, uncast, recast: one spell at most, and it is the same one
    click(page, '[data-a=setForm][data-v=ritual]'); page.fill('#f-add', 'Read'); click(page, 'button[data-a=add]')
    click(page, '[data-a=cast]'); closeModals(page)
    k1 = page.evaluate("() => S.spells.map(x => x.key)")
    click(page, '[data-a=cast]'); closeModals(page)
    after_uncast = st(page)
    click(page, '[data-a=cast]'); closeModals(page)
    k2 = page.evaluate("() => S.spells.map(x => x.key)")
    print('cast spells', k1, '| after uncast', after_uncast, '| after recast', k2, 'same:', k1 == k2)
    click(page, '[data-a=cast]'); closeModals(page)
    # weather: set then clear by tapping again
    click(page, '[data-a=weather][data-v="1"]'); closeModals(page)
    print('weather set:', st(page))
    click(page, '[data-a=weather][data-v="1"]'); closeModals(page)
    print('weather cleared:', st(page), page.evaluate("() => dayRec().w"))
    # journal line then erase
    page.fill('#f-line', 'a line'); click(page, '[data-a=inscribe]'); closeModals(page)
    print('line written:', st(page)['todayCounts'])
    page.fill('#f-line', ''); click(page, '[data-a=inscribe]'); closeModals(page)
    print('line erased:', st(page)['todayCounts'])
    click(page, 'nav [data-v=road]')
    expect(page, 'Nothing is on the record for today yet.')
    # a real deed stays: the day is walked only once it has ended
    click(page, 'nav [data-v=camp]')
    click(page, '[data-a=cast]'); closeModals(page)
    click(page, 'nav [data-v=road]')
    expect(page, "Today's league is waiting")
    print('today with a cast:', st(page))
    # simulate: move today's record to yesterday and reopen -> the league is walked
    page.evaluate("""() => { const y = addDays(today(), -1), t = today();
      S.events.forEach(e => { if (e.d === t) e.d = y; });
      S.rituals.forEach(r => { if (r.casts[t]) { r.casts[y] = r.casts[t]; delete r.casts[t]; } if (r.hits[t]) { r.hits[y] = r.hits[t]; delete r.hits[t]; } });
      S.created = y; save(); }""")
    page.reload(); page.wait_for_timeout(300)
    print('next day:', st(page), 'ash gate entered:', page.evaluate("() => S.journey.plan[0].entered === addDays(today(), -1)"))
    # old saves that had already counted today are corrected, not walked backwards in the log
    page.evaluate("() => { S.journey.done = 5; advanceJourney(); }")
    print('over-counted journey corrected to:', page.evaluate("() => S.journey.done"))
    # Day 1 settings
    click(page, '[data-a=openOptions]')
    page.fill('#o-dayone', '2026-09-14'); click(page, '[data-a=setDayOne]')
    expect(page, 'Tap again to confirm')
    click(page, '[data-a=setDayOne]')
    print('header after moving Day 1:', page.locator('.hdr').inner_text().split('\n')[1])
    click(page, '[data-a=resetDays]'); click(page, '[data-a=resetDays]')
    print('header after reset:', page.locator('.hdr').inner_text().split('\n')[1])
    # the day turns later
    click(page, '[data-a=dayTurn][data-v="4"]')
    print('day turn check:', page.evaluate("() => today() === dkey(new Date(Date.now() - 4 * 3600000))"))
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
