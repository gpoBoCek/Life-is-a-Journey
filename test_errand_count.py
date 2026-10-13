"""Errands that need doing several times: tap once per time, the last tap completes it; no league farming."""
import pathlib
from playwright.sync_api import sync_playwright
URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
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
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)
def ev(page, js, arg=None): return page.evaluate(js, arg) if arg is not None else page.evaluate(js)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    # an old save whose errands predate the count
    click(page, '[data-a=begin]')
    ev(page, "() => { S.errands.push({ id: 'old', text: 'Old errand', date: today(), time: null, dread: false, dreadAt: null, list: [], repeat: null, created: today() }); save(); }")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    old = ev(page, "() => S.errands.find(e => e.id === 'old')")
    check(old['need'] == 1 and old['got'] == 0, 'old errands get need 1')
    ev(page, "() => { Math.random = () => 0.99; }")

    # "x3" at the end sets the count
    page.fill('#f-add', 'Take out trash bags x3'); page.press('#f-add', 'Enter'); page.wait_for_timeout(80)
    e = ev(page, "() => S.errands.find(e => e.text.startsWith('Take out'))")
    print('added:', e['text'], e['need'], e['got'])
    check(e['text'] == 'Take out trash bags' and e['need'] == 3, 'x3 parsed')
    page.fill('#f-add', 'Buy 2x4 planks'); page.press('#f-add', 'Enter'); page.wait_for_timeout(80)
    check(ev(page, "() => S.errands.find(e => e.text.startsWith('Buy')).need") == 1, '2x4 inside text is not a count')
    eid = e['id']
    row = '[data-a=tick][data-id="%s"]' % eid
    check(page.locator(row).inner_text() == '[0/3]', 'row shows [0/3]')

    # taps 1 and 2: progress, a deed for today, no completion
    click(page, row)
    check(page.locator(row).inner_text() == '[1/3]', 'first tap [1/3]')
    expect(page, 'Take out trash bags: 1 of 3')
    check(ev(page, "() => todayCounts()"), 'partial progress counts for today')
    # undo from the toast takes it back and leaves no deed
    click(page, '[data-a=undo]')
    check(page.locator(row).inner_text() == '[0/3]', 'undo back to [0/3]')
    check(not ev(page, "() => todayCounts()") and ev(page, "() => S.events.filter(x => x.k === 'errand_part').length") == 0, 'undo leaves no deed')
    click(page, row); click(page, row)
    check(page.locator(row).inner_text() == '[2/3]', 'two taps [2/3]')
    check(ev(page, "() => S.events.filter(x => x.k === 'errand').length") == 0, 'not completed yet')
    # third tap completes it
    click(page, row); closeModals(page)
    check(ev(page, "(id) => !S.errands.some(e => e.id === id)", eid), 'third tap completes and removes it')
    done = ev(page, "() => S.events.filter(x => x.k === 'errand').pop()")
    check(done['of'] == 3, 'completion records the count')
    expect(page, 'Done: Take out trash bags')
    # undoing the completion returns it at 2 of 3
    click(page, '[data-a=undo]')
    back = ev(page, "(id) => S.errands.find(e => e.id === id)", eid)
    check(back and back['got'] == 2 and ev(page, "() => S.events.filter(x => x.k === 'errand').length") == 0, 'undo completion returns to 2 of 3')

    # repeating errand resets its count
    page.fill('#f-add', 'Water plants x2'); page.press('#f-add', 'Enter'); page.wait_for_timeout(80)
    wid = ev(page, "() => S.errands.find(e => e.text === 'Water plants').id")
    ev(page, "(id) => { const e = S.errands.find(x => x.id === id); e.repeat = 2; save(); render(); }", wid)
    click(page, '[data-a=tick][data-id="%s"]' % wid); click(page, '[data-a=tick][data-id="%s"]' % wid); closeModals(page)
    w = ev(page, "(id) => S.errands.find(e => e.id === id)", wid)
    print('repeat after completion:', w['got'], w['date'])
    check(w['got'] == 0 and w['date'] == ev(page, "() => addDays(today(), 2)"), 'repeat resets the count')

    # the errand screen: +1/-1, change the count, lowering to what is done finishes it
    click(page, '[data-a=openErrand][data-id="%s"]' % eid)
    expect(page, 'DONE SO FAR: 2 OF 3')
    click(page, '[data-a=errMinus]')
    expect(page, 'DONE SO FAR: 1 OF 3')
    page.fill('#e-need', '5'); click(page, '[data-a=saveErrand]')
    check(ev(page, "(id) => S.errands.find(e => e.id === id).need", eid) == 5, 'count changed to 5')
    check(page.locator('[data-a=tick][data-id="%s"]' % eid).inner_text() == '[1/5]', 'row shows [1/5]')
    click(page, '[data-a=openErrand][data-id="%s"]' % eid)
    page.fill('#e-need', '1'); click(page, '[data-a=saveErrand]'); closeModals(page)
    check(ev(page, "(id) => !S.errands.some(e => e.id === id)", eid), 'lowering below what is done completes it')

    # +1 on the screen for the last one returns to the list
    page.fill('#f-add', 'Send letters x2'); page.press('#f-add', 'Enter'); page.wait_for_timeout(80)
    lid = ev(page, "() => S.errands.find(e => e.text === 'Send letters').id")
    click(page, '[data-a=openErrand][data-id="%s"]' % lid)
    click(page, '[data-a=errPlus]'); click(page, '[data-a=errPlus]'); closeModals(page)
    check(ev(page, "() => UI.stack.length") == 0 and ev(page, "(id) => !S.errands.some(e => e.id === id)", lid), '+1 on the last one completes and goes back')

    # a tap yesterday is not erased by taking one back today
    page.fill('#f-add', 'Read chapters x4'); page.press('#f-add', 'Enter'); page.wait_for_timeout(80)
    rid = ev(page, "() => S.errands.find(e => e.text === 'Read chapters').id")
    click(page, '[data-a=tick][data-id="%s"]' % rid)
    ev(page, "() => { const y = addDays(today(), -1); S.events.forEach(x => { if (x.k === 'errand_part') x.d = y; }); save(); }")
    ev(page, "(id) => { errandStep(S.errands.find(e => e.id === id), -1); }", rid)
    check(ev(page, "() => S.events.some(x => x.k === 'errand_part' && x.d === addDays(today(), -1))"), "yesterday's progress stays on the record")

    # day card lists progress
    click(page, '[data-a=tick][data-id="%s"]' % rid)
    click(page, 'nav [data-v=road]')
    click(page, '.heat .grid button[data-d="%s"]' % ev(page, "() => today()"))
    expect(page, 'ERRAND PROGRESS'); expect(page, 'Read chapters · 1 of 4'); expect(page, 'Send letters · all 2')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
