"""Carried errands: they stay on camp counting the days, and after N days camp asks for a decision first."""
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
def closeModals(page):
    while page.locator('[data-a=closeModal]').count(): click(page, '[data-a=closeModal]')
def text(page): return page.locator('#app').inner_text()
def expect(page, s):
    if s not in text(page): errors.append('NOT FOUND: ' + s)
def absent(page, s):
    if s in text(page): errors.append('SHOULD NOT BE THERE: ' + s)
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)
def overflow(page, where):
    w = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if w > 0: errors.append('OVERFLOW %dpx at %s' % (w, where))
def ev(page, js, arg=None): return page.evaluate(js, arg) if arg is not None else page.evaluate(js)
def errand(page, text, days_ago):
    return ev(page, "(a) => { const e = newErrand(a[0], addDays(today(), -a[1])); S.errands.push(e); save(); render(true); return e.id; }", [text, days_ago])
def camp(page): click(page, 'nav [data-v=camp]')

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    ev(page, "() => { Math.random = () => 0.99; S.created = addDays(today(), -30); save(); }")
    check(ev(page, "() => S.settings.gateDays") == 3, 'gate after 3 days by default')

    # carried one day: stays on camp, labelled, no gate
    a = errand(page, 'Return the library book', 1)
    camp(page)
    expect(page, 'carried 1 day'); absent(page, 'THE ROAD IS BLOCKED'); expect(page, 'INNER WEATHER')

    # carried three days: camp opens on the decision, the rest of camp is hidden, other screens are open
    ev(page, "(id) => { S.errands.find(e => e.id === id).date = addDays(today(), -3); save(); render(true); }", a)
    expect(page, 'THE ROAD IS BLOCKED'); expect(page, 'carried 3 days'); absent(page, 'INNER WEATHER')
    page.screenshot(path=str(SHOTS / 'gate.png'), full_page=True)
    click(page, 'nav [data-v=arts]'); expect(page, 'WHEN THE ROAD GOES DARK')
    click(page, 'nav [data-v=quests]'); expect(page, 'Return the library book')
    camp(page)

    # move it, once
    click(page, '[data-a=gateMode][data-v=move]'); expect(page, 'MOVE IT TO')
    click(page, '[data-a=gateMove][data-v="1"]')
    e = ev(page, "(id) => S.errands.find(x => x.id === id)", a)
    check(e['date'] == ev(page, "() => addDays(today(), 1)") and e['moved'] == 1, 'moved to tomorrow, once')
    absent(page, 'THE ROAD IS BLOCKED')
    ev(page, "(id) => { S.errands.find(e => e.id === id).date = addDays(today(), -4); save(); render(true); }", a)
    expect(page, 'THE ROAD IS BLOCKED')
    check(page.locator('[data-a=gateMode][data-v=move]').count() == 0, 'no second move')

    # smaller: a first step for today, and the count restarts
    click(page, '[data-a=gateMode][data-v=smaller]')
    page.fill('#g-step', 'Put the book by the door'); click(page, '[data-a=gateSmaller]')
    check(ev(page, "() => S.errands.some(e => e.text === 'Put the book by the door' && e.date === today())"), 'first step added for today')
    check(ev(page, "(id) => S.errands.find(e => e.id === id).date", a) == ev(page, "() => today()"), 'smaller restarts the count')
    absent(page, 'THE ROAD IS BLOCKED'); expect(page, 'INNER WEATHER')

    # chest
    c = errand(page, 'Call the tax office', 5)
    camp(page); expect(page, 'Call the tax office')
    click(page, '[data-a=gateChest][data-id="%s"]' % c)
    check(ev(page, "(id) => S.errands.find(e => e.id === id).dread", c), 'became a chest')
    expect(page, 'A CHEST BY THE ROAD')

    # no date
    d = errand(page, 'Sort old photos', 6)
    camp(page)
    click(page, '[data-a=gateSomeday][data-id="%s"]' % d)
    check(ev(page, "(id) => S.errands.find(e => e.id === id).date", d) is None, 'no date for now')

    # let it go: two taps, recorded, not a deed
    g = errand(page, 'Learn the ukulele', 9)
    camp(page)
    click(page, '[data-a=gateDrop][data-id="%s"]' % g); expect(page, 'TAP AGAIN TO LET IT GO')
    click(page, '[data-a=gateDrop][data-id="%s"]' % g)
    check(not ev(page, "(id) => S.errands.some(e => e.id === id)", g), 'let go')
    check(ev(page, "() => S.events.some(e => e.k === 'errand_drop' && e.text === 'Learn the ukulele')"), 'letting go is recorded')
    check(not ev(page, "() => todayCounts()"), 'letting go is not a deed')

    # two waiting, one at a time; a peek restarts the count; done records the days carried
    h1 = errand(page, 'Renew the gym card', 4)
    h2 = errand(page, 'Email the landlord', 3)
    camp(page)
    expect(page, '2 waiting'); expect(page, 'Renew the gym card')
    click(page, '[data-a=peekStart][data-id="%s"]' % h1)
    click(page, '[data-a=peekBegin]'); click(page, '[data-a=peekClose]'); closeModals(page)
    check(ev(page, "(id) => S.errands.find(e => e.id === id).date", h1) == ev(page, "() => today()"), 'a peek restarts the count')
    camp(page)
    expect(page, 'Email the landlord')
    click(page, '[data-a=gateDone][data-id="%s"]' % h2); closeModals(page)
    done = ev(page, "() => S.events.filter(e => e.k === 'errand').pop()")
    check(done['carried'] == 3, 'done records the days carried')
    absent(page, 'THE ROAD IS BLOCKED')

    # off in options
    errand(page, 'Fix the shelf', 10)
    camp(page); expect(page, 'THE ROAD IS BLOCKED')
    click(page, '[data-a=openOptions]'); click(page, '[data-a=gateDaysSet][data-v="0"]'); click(page, '[data-a=back]')
    camp(page); absent(page, 'THE ROAD IS BLOCKED'); expect(page, 'carried 10 days')
    click(page, '[data-a=openOptions]'); click(page, '[data-a=gateDaysSet][data-v="3"]'); click(page, '[data-a=back]')

    # road statistics and the day card
    ev(page, "() => { for (let i = 0; i < 4; i++) S.events.push({ k: 'errand', d: addDays(today(), -i - 1), t: 0, id: 'x' + i, text: 'x' }); save(); }")
    click(page, 'nav [data-v=road]')
    expect(page, 'Done on their day or earlier'); expect(page, 'Let go: 1')
    click(page, '.heat .grid button[data-d="%s"]' % ev(page, "() => today()"))
    expect(page, 'after 3 days carried'); expect(page, 'ERRAND LET GO')
    page.set_viewport_size({'width': 320, 'height': 640})
    camp(page); overflow(page, 'gate 320')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
