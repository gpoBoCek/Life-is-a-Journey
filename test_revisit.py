"""Two-step arts: dispel (catch, answer later, revisit, test as prophecy), peek (expected vs found),
seal/prophecy linking, and the TO REVISIT window at camp."""
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
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)
def overflow(page, where):
    w = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if w > 0: errors.append('OVERFLOW %dpx at %s' % (w, where))
def ev(page, js, arg=None): return page.evaluate(js, arg) if arg is not None else page.evaluate(js)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    # an old save with a hex broken the old way: it loads with no revisit
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    ev(page, """() => { S.created = addDays(today(), -20); S.dispels.push({ id: 'old1', t: 0, d: addDays(today(), -10), words: 'old words', hex: 'brand', answer: 'old answer', before: 80, after: 40 }); save(); }""")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    old = ev(page, "() => S.dispels.find(x => x.id === 'old1')")
    print('migrated old hex:', {k: old.get(k) for k in ('ad', 'rv', 'due', 'later')})
    check(old['ad'] == ev(page, "() => addDays(today(), -10)") and old['rv'] == 0 and old['due'] is None, 'old hex migrated without a revisit')
    check(ev(page, "() => hexesDue().length") == 0, 'old hex not due')
    ev(page, "() => { Math.random = () => 0.99; }")   # no spells, so no modals in the way

    # 1. catch a predictive hex and test it as a prophecy
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=dispel]')
    page.fill('#dz-words', 'If I ask for help at work they will think I am incompetent')
    absent(page, 'Test it as a prophecy')
    click(page, '[data-a=setForm][data-k="dz-hex"][data-v=mind]')
    expect(page, 'Test it as a prophecy')
    page.locator('#dz-before').fill('80')
    click(page, '[data-a=setForm][data-k="dz-test"]')
    check(page.input_value('#dz-ptext').startswith('If I ask for help'), 'prophecy text prefilled with the words')
    page.fill('#dz-ptext', 'My manager will look annoyed when I ask'); page.locator('#dz-pp').fill('75')
    page.screenshot(path=str(SHOTS / 'dispel_form.png'), full_page=True)
    click(page, '[data-a=saveDispel][data-v=catch]'); closeModals(page)
    x = ev(page, "() => S.dispels[S.dispels.length - 1]")
    pr = ev(page, "(id) => S.prophecies.find(p => p.id === id)", x['pid'])
    print('caught:', {k: x[k] for k in ('before', 'after', 'rv', 'pid')}, 'prophecy:', {k: pr[k] for k in ('text', 'p', 'src', 'due')})
    check(x['after'] is None and x['rv'] == 3 and pr['src'] == 'hex' and pr['p'] == 75, 'caught with a linked prophecy')
    check(ev(page, "() => todayCounts()"), 'catching counts for today')
    expect(page, 'CAUGHT, NOT YET ANSWERED')
    hid = x['id']

    # 2. break a hex in one go: an answer is required
    page.fill('#dz-words', 'I am a failure')
    click(page, '[data-a=setForm][data-k="dz-hex"][data-v=brand]')
    click(page, '[data-a=saveDispel][data-v=break]')
    expect(page, "Write the companion's answer first")
    page.fill('#dz-answer', 'You finished three hard things this month.')
    page.locator('#dz-after').fill('35')
    click(page, '[data-a=saveDispel][data-v=break]'); closeModals(page)
    y = ev(page, "() => S.dispels[S.dispels.length - 1]")
    print('broken now:', {k: y[k] for k in ('before', 'after', 'ad', 'due', 'rv')})
    check(y['after'] == 35 and y['due'] == ev(page, "() => addDays(today(), 3)"), 'broken with a revisit in 3 days')

    # 3. camp: TO REVISIT lists the caught hex; answer it there
    click(page, 'nav [data-v=camp]')
    expect(page, 'TO REVISIT'); expect(page, 'waiting for an answer')
    click(page, '[data-a=openHex][data-id="%s"]' % hid)
    expect(page, 'Tested as a prophecy')
    click(page, '[data-a=answerHex]')
    expect(page, "Write the companion's answer first")
    page.fill('#hx-answer', 'People here have helped each other all month. Asking is normal.')
    page.locator('#hx-after').fill('40')
    click(page, '[data-a=setForm][data-k="hx-rv"][data-v="1"]')
    click(page, '[data-a=answerHex]'); closeModals(page)
    x = ev(page, "(id) => S.dispels.find(d => d.id === id)", hid)
    check(x['after'] == 40 and x['due'] == ev(page, "() => addDays(today(), 1)"), 'answered later, revisit tomorrow')
    expect(page, 'You will look at it again on')
    check(ev(page, "() => S.events.filter(e => e.k === 'dispel').length") == 2, 'two dispel events')

    # 4. a day later: the revisit is due
    ev(page, "(id) => { const x = S.dispels.find(d => d.id === id); x.due = today(); save(); }", hid)
    click(page, '[data-a=back]')
    expect(page, 'how true does it feel now?')
    page.screenshot(path=str(SHOTS / 'camp_revisit.png'), full_page=True)
    click(page, '[data-a=openHex][data-id="%s"]' % hid)
    check(page.input_value('#hx-later') == '40', 'revisit slider starts at the answered value')
    page.locator('#hx-later').fill('60')
    page.screenshot(path=str(SHOTS / 'hex_revisit.png'), full_page=True)
    click(page, '[data-a=revisitHex]'); closeModals(page)
    x = ev(page, "(id) => S.dispels.find(d => d.id === id)", hid)
    print('revisited:', x['before'], x['after'], x['later'], x['ld'])
    expect(page, 'crept back up by 20'); expect(page, '50% of the drop held')
    check(ev(page, "() => manaSnapshot().counts.hex_revisit") == 1, 'mana counts the revisit')
    click(page, '[data-a=back]')
    absent(page, 'TO REVISIT')

    # 5. skip a revisit, remove a caught hex
    yid = y['id']
    ev(page, "(id) => { const x = S.dispels.find(d => d.id === id); x.due = today(); save(); render(); }", yid)
    click(page, '[data-a=openHex][data-id="%s"]' % yid)
    click(page, '[data-a=skipRevisit]')
    check(ev(page, "(id) => S.dispels.find(d => d.id === id).due", yid) is None, 'revisit skipped')
    click(page, '[data-a=back]')
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=dispel]')
    page.fill('#dz-words', 'typo hex'); click(page, '[data-a=saveDispel][data-v=catch]')
    zid = ev(page, "() => S.dispels[S.dispels.length - 1].id")
    click(page, '[data-a=openHex][data-id="%s"]' % zid)
    click(page, '[data-a=dropHex]'); click(page, '[data-a=dropHex]')
    check(ev(page, "(id) => !S.dispels.some(d => d.id === id) && !S.events.some(e => e.hid === id)", zid), 'caught hex removed with its event')

    # 6. prophecy view shows where the hex prophecy came from
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=prophecy]')
    expect(page, 'from a hex, the mind-reader')

    # 7. the Doppelganger's record, with enough revisits per hex
    ev(page, """() => { for (let i = 0; i < 6; i++) S.dispels.push({ id: 'r' + i, t: 0, d: addDays(today(), -9), words: 'w' + i, hex: i < 3 ? 'should' : 'fortune', answer: 'a', before: 80, after: 40, ad: addDays(today(), -9), rv: 3, due: addDays(today(), -6), later: i < 3 ? 70 : 35, ld: addDays(today(), -6), pid: null }); save(); }""")
    click(page, 'nav [data-v=road]')
    expect(page, "THE DOPPELGANGER'S RECORD"); expect(page, 'BY HEX'); expect(page, 'THE IRON SHOULD comes back the most')
    rec = page.locator('section.win', has_text="THE DOPPELGANGER'S RECORD")
    print('record:\n' + rec.inner_text())
    rec.scroll_into_view_if_needed(); page.screenshot(path=str(SHOTS / 'doppel_record.png'))
    overflow(page, 'road')

    # 8. day card entries for today
    click(page, '.heat .grid button[data-d="%s"]' % ev(page, "() => today()"))
    for s in ['HEX BROKEN', 'HEX REVISITED', '80 > 40 > 60', 'PROPHECY WRITTEN']: expect(page, s)
    d6 = ev(page, "() => addDays(today(), -6)")
    ev(page, "(d) => { UI.stack[UI.stack.length-1] = { type: 'day', d: d, title: 'DAY' }; render(true); }", d6)
    expect(page, 'HEX REVISITED')

    # 9. peek: expected and found
    click(page, 'nav [data-v=camp]')
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=peek]')
    page.fill('#pk-text', 'Reply to the landlord'); click(page, '[data-a=peekFree]')
    expect(page, 'How bad do you expect it to be?')
    click(page, '[data-a=peekExp][data-v="8"]')
    click(page, '[data-a=peekBegin]')
    click(page, '[data-a=peekClose]')
    expect(page, 'You expected it to be 8 out of 10.')
    check(page.locator('nav').count() == 0, 'nav hidden while rating the chest')
    page.screenshot(path=str(SHOTS / 'peek_after.png'))
    click(page, '[data-a=peekFound][data-v="3"]'); closeModals(page)
    pk = ev(page, "() => S.events.filter(e => e.k === 'peek').pop()")
    print('peek event:', {k: pk.get(k) for k in ('text', 'exp', 'found')})
    check(pk['exp'] == 8 and pk['found'] == 3, 'peek recorded expected and found')
    expect(page, 'You expected 8 and found 3')
    # without an expectation it closes at once
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=peek]')
    page.fill('#pk-text', 'Open the bank letter'); click(page, '[data-a=peekFree]')
    click(page, '[data-a=peekBegin]'); click(page, '[data-a=peekClose]'); closeModals(page)
    pk2 = ev(page, "() => S.events.filter(e => e.k === 'peek').pop()")
    check(pk2['exp'] is None and pk2['found'] is None and ev(page, "() => UI.tab") == 'camp', 'plain peek closes at once')

    # 10. seal: no prophecy unless asked; the jar shows the link; faded
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=seal]')
    n0 = ev(page, "() => S.prophecies.length")
    page.fill('#s-text', 'Why am I like this'); click(page, '[data-a=sealIt]')
    check(ev(page, "() => S.prophecies.length") == n0, 'seal makes no prophecy by default')
    click(page, '[data-a=setForm][data-k="s-track"]')
    page.fill('#s-text', 'I will be blamed for the delay'); page.locator('#s-p').fill('60'); click(page, '[data-a=sealIt]')
    check(ev(page, "() => S.prophecies.length") == n0 + 1, 'tracked seal makes a prophecy')
    ev(page, "() => { S.seals.forEach(s => { s.t = Date.now() - 3 * 86400000; }); save(); render(); }")
    expect(page, 'THE JAR IS OPEN'); expect(page, 'its prophecy: 60%')
    page.screenshot(path=str(SHOTS / 'jar.png'), full_page=True)
    click(page, 'nav [data-v=camp]')
    expect(page, 'sealed worries ready to look at')
    click(page, '[data-a=openView][data-v=seal]')
    sid = ev(page, "() => S.seals.find(s => s.text.startsWith('I will')).id")
    click(page, '[data-a=sealDissolve][data-id="%s"]' % sid); closeModals(page)
    expect(page, 'LATELY'); expect(page, 'faded')
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=prophecy]')
    expect(page, 'from the jar, faded at lantern hour')

    # small screen
    page.set_viewport_size({'width': 320, 'height': 640})
    click(page, 'nav [data-v=arts]'); click(page, '[data-a=openView][data-v=dispel]')
    overflow(page, 'dispel 320')
    click(page, 'nav [data-v=camp]'); overflow(page, 'camp 320')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
