"""Day cards from the 12-week grid and the whole-journey calendar on the Road."""
import pathlib
from playwright.sync_api import sync_playwright
URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
SHOTS = pathlib.Path('/tmp/claude-0/-home-claude/d62f4bed-cb54-5b99-892b-7b654af717cc/scratchpad')
errors = []
def click(page, sel):
    loc = page.locator(sel)
    if not loc.count(): errors.append('MISSING ' + sel); return
    loc.first.click(); page.wait_for_timeout(80)
def closeModals(page):
    while page.locator('[data-a=closeModal]').count(): click(page, '[data-a=closeModal]')
def text(page): return page.locator('#app').inner_text()
def expect(page, s):
    if s not in text(page): errors.append('NOT FOUND: ' + s)
def absent(page, s):
    if s in text(page): errors.append('SHOULD NOT BE THERE: ' + s)
def overflow(page, where):
    w = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if w > 0: errors.append('OVERFLOW %dpx at %s' % (w, where))

SEED = """() => {
  const t = today(), D = (n) => addDays(t, -n);
  S.created = D(70);
  S.settings.dayOne = D(70);
  const r = newRitual('Brush teeth'); r.per = 2; r.created = D(70);
  const r2 = newRitual('Walk'); r2.created = D(20);
  S.rituals.push(r, r2);
  for (let i = 1; i <= 70; i++) {
    const d = D(i);
    if (i % 3 === 0) continue;             // quiet days
    r.casts[d] = '08:1' + (i % 10); r.hits[d] = ['08:10', '21:30'];
    S.events.push({ k: 'cast', d: d, rid: r.id, t: 0 });
    if (i <= 20 && i % 2) { r2.casts[d] = '18:00'; S.events.push({ k: 'cast', d: d, rid: r2.id, t: 0 }); }
    if (i % 4 === 0) S.days[d] = { w: i % 5, l: 'Line for day minus ' + i };
  }
  r.hits[D(3)] = ['08:00'];                  // a started but unfinished ritual on a quiet day
  const d5 = D(5);
  S.events.push({ k: 'errand', d: d5, id: 'x1', text: 'Post the parcel', t: 0 });
  S.events.push({ k: 'peek', d: d5, wait: 12, text: 'Call the bank', t: 0 });
  S.events.push({ k: 'floor', d: d5, scout: 7, found: 4, text: 'Open the tax letter', delve: 'Taxes', t: 0 });
  S.events.push({ k: 'review', d: d5, res: 'dissolved', sid: 's1', text: 'They will be angry', t: 0 });
  S.events.push({ k: 'steady', d: d5, t: 0 }); S.events.push({ k: 'steady', d: d5, t: 0 });
  S.events.push({ k: 'errand', d: D(40), id: 'x0', t: 0 });            // an old record without text
  S.dispels.push({ id: 'h1', t: 0, d: d5, words: 'I am useless', hex: 'brand', answer: 'I did three things today', before: 80, after: 40 });
  S.events.push({ k: 'dispel', d: d5, before: 80, after: 40, t: 0 });
  S.seals.push({ id: 's1', t: parseD(D(6)).getTime() + 3600000, d: D(6), text: 'They will be angry', status: 'dissolved', reviewed: 0 });
  S.prophecies.push({ id: 'p1', text: 'The call goes badly', p: 85, t: 0, d: D(7), due: D(5), src: 'prophecy', ref: null, o: 'no', charm: false, judged: d5 });
  S.events.push({ k: 'prophecy', d: d5, p: 85, o: 'no', charm: false, t: 0 });
  S.suppressions.push({ id: 'u1', mode: 'urge', label: 'phone', dur: 600, spent: 600, t: 0, d: d5, before: 8, after: 3, held: true });
  S.events.push({ k: 'suppress', d: d5, sec: 600, mode: 'urge', t: 0 });
  S.spells.push({ key: 'zz1', n: 'Lantern of Small Hours', e: 'test', r: 'r', src: 'cast', d: d5, at: 0, reg: '' });
  S.days[d5] = { w: 1, l: 'A heavy day, but I did things' };
  S.journey.done = 0;
  save();
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    page.evaluate(SEED)
    page.reload(); page.wait_for_timeout(400)
    closeModals(page)
    print('leagues after seeding:', page.evaluate("() => leagues()"), 'walked', page.evaluate("() => walkedDays().length"))

    click(page, 'nav [data-v=road]')
    expect(page, 'THE WHOLE JOURNEY')
    expect(page, 'Tap a square to open that day.')
    n_cells = page.locator('.heat .grid button').count()
    n_fut = page.locator('.heat .grid i.fut').count()
    print('12-week grid buttons:', n_cells, 'future cells:', n_fut, 'total', n_cells + n_fut)
    overflow(page, 'road')
    page.locator('.cal').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'road_calendar.png'))

    # open five days ago from the 12-week grid
    d5 = page.evaluate("() => addDays(today(), -5)")
    click(page, '.heat .grid button[data-d="%s"]' % d5)
    for s in ['League', 'walked through', 'Inner weather', 'THE LINE', 'A heavy day, but I did things', 'RITUALS', 'Brush teeth', 'DONE',
              'ERRAND DONE', 'Post the parcel', 'CHEST OPENED', 'Call the bank', 'FLOOR CLEARED', 'Open the tax letter', 'scouted 7, found 4',
              'HEX BROKEN', 'I am useless', 'WORRY REVIEWED', 'faded', 'PROPHECY JUDGED', 'The call goes badly', 'did not happen',
              'STEADYING', '2 sessions', 'RIDE AN URGE', 'phone', '10 minutes', '8 > 3', 'held', 'ON THE ROAD', 'Lantern of Small Hours']:
        expect(page, s)
    overflow(page, 'day card')
    page.screenshot(path=str(SHOTS / 'day_card.png'), full_page=True)
    print('day card header:', page.locator('.win h2').first.inner_text())

    # previous day (6 days ago): the worry was sealed then
    click(page, '[aria-label="Previous day"]')
    expect(page, 'WORRY SEALED')
    print('stack depth after prev:', page.evaluate("() => UI.stack.length"))
    # previous again (7 days ago): prophecy written
    click(page, '[aria-label="Previous day"]')
    expect(page, 'PROPHECY WRITTEN'); expect(page, '85%')
    # 9 days ago is a quiet day
    page.evaluate("() => { UI.stack[UI.stack.length-1] = { type: 'day', d: addDays(today(), -9), title: 'DAY' }; render(true); }")
    expect(page, 'A quiet day'); expect(page, 'You were resting in'); expect(page, 'missed')
    # 3 days ago a ritual was started but not finished; a started ritual still walks the league
    page.evaluate("() => { UI.stack[UI.stack.length-1] = { type: 'day', d: addDays(today(), -3), title: 'DAY' }; render(true); }")
    expect(page, '[1/2]'); expect(page, 'started'); expect(page, 'walked through')
    # next day until today, then the next button is disabled
    for _ in range(3): click(page, '[aria-label="Next day"]')
    expect(page, 'Today.')
    print('next disabled on today:', page.locator('[aria-label="Next day"]').is_disabled())
    click(page, '[data-a=back]')
    print('back lands on road:', 'THE WHOLE JOURNEY' in text(page), 'stack', page.evaluate("() => UI.stack.length"))

    # calendar: walk back to the first month, next disabled at current month
    print('next month disabled now:', page.locator('[aria-label="Next month"]').is_disabled())
    months = [page.locator('.calnav span').inner_text()]
    for _ in range(6):
        if page.locator('[aria-label="Previous month"]').is_disabled(): break
        click(page, '[aria-label="Previous month"]'); months.append(page.locator('.calnav span').inner_text())
    print('months:', months, 'prev disabled at first:', page.locator('[aria-label="Previous month"]').is_disabled())
    page.locator('.cal').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'calendar_first_month.png'))
    # the old record without text, 40 days ago
    d40 = page.evaluate("() => addDays(today(), -40)")
    while d40[:7] != page.evaluate("() => UI.calMonth || today().slice(0,7)"):
        click(page, '[aria-label="Next month"]')
    click(page, '.cal button[data-d="%s"]' % d40)
    expect(page, 'an errand')
    # a day before the journey began (from the first month, if it has one)
    page.evaluate("() => { UI.stack[UI.stack.length-1] = { type: 'day', d: addDays(today(), -80), title: 'DAY' }; render(true); }")
    expect(page, 'Before the journey began.')
    absent(page, 'DAY -')
    click(page, '[data-a=back]')
    print('calendar month kept after back:', page.locator('.calnav span').inner_text())
    # future cells are not buttons
    print('future buttons in calendar:', page.evaluate("() => [...document.querySelectorAll('.cal button')].filter(b => b.dataset.d > today()).length"))

    # a fresh journey: calendar shows only this month, both arrows disabled, today opens
    page.evaluate("() => { localStorage.clear(); }")
    page.reload(); page.wait_for_timeout(300)
    click(page, '[data-a=begin]')
    click(page, 'nav [data-v=road]')
    print('fresh: prev disabled', page.locator('[aria-label="Previous month"]').is_disabled(), 'next disabled', page.locator('[aria-label="Next month"]').is_disabled())
    click(page, '.cal button.istoday')
    expect(page, 'Today. Nothing is on the record yet.')
    expect(page, 'DAY 1')
    # small screen check
    page.set_viewport_size({'width': 320, 'height': 640})
    page.wait_for_timeout(100)
    overflow(page, 'day card 320px')
    click(page, '[data-a=back]')
    overflow(page, 'road 320px')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
