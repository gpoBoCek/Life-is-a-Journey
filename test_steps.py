"""Steps: entry at camp (today and yesterday), any past day from the day card, league rules, stats, mana."""
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
def check(cond, what):
    if not cond: errors.append('FAILED: ' + what)
def overflow(page, where):
    w = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if w > 0: errors.append('OVERFLOW %dpx at %s' % (w, where))
def st(page, d):
    return page.evaluate("(n) => { const k = addDays(today(), -n); const x = S.days[k] || {}; return { s: x.s, sl: x.sl || 0, leagues: leagues(), done: S.journey.done, deed: deedsOn(k) }; }", d)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    # a journey that began 30 days ago, with a ritual cast on every third day
    page.evaluate("""() => { const t = today(); S.created = addDays(t, -30); S.settings.dayOne = S.created;
      const r = newRitual('Read'); r.created = S.created; S.rituals.push(r);
      for (let i = 3; i <= 30; i += 3) { const d = addDays(t, -i); r.casts[d] = '09:00'; S.events.push({ k: 'cast', d: d, rid: r.id, t: 0 }); }
      save(); }""")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    page.evaluate("() => { Math.random = () => 0; }")   # every roll finds a spell
    base = st(page, 1)
    spells0 = page.evaluate("() => S.spells.length")
    print('start:', base)
    expect(page, 'STEPS'); expect(page, 'Yesterday has no steps yet.')

    # today: typed with a comma, saved with Enter
    page.fill('#f-steps', '8,412'); page.press('#f-steps', 'Enter'); page.wait_for_timeout(80); closeModals(page)
    s0 = st(page, 0)
    print('today 8,412:', s0, 'field shows', page.input_value('#f-steps'))
    check(s0['s'] == 8412 and s0['sl'] == 0 and s0['deed'] == 0, 'today saved, not a deed')
    check(not page.evaluate("() => todayCounts()"), 'steps alone do not make a league')
    check(page.evaluate("() => S.spells.length") == spells0, 'steps roll no spell')
    check(page.input_value('#f-steps') == '8,412', 'field shows formatted steps')
    spells_after_today = page.evaluate("() => S.spells.length")
    # bad input changes nothing
    page.fill('#f-steps', 'lots'); click(page, '#f-steps + [data-a=saveSteps]')
    expect(page, 'Steps are a whole number')
    page.fill('#f-steps', '999999'); click(page, '#f-steps + [data-a=saveSteps]')
    expect(page, 'more steps than one day holds')
    check(st(page, 0)['s'] == 8412, 'bad input left steps unchanged')

    # yesterday (a day with nothing else recorded): steps give it its league, walked straight away
    click(page, '[data-a=stepsDay][data-v=y]')
    check(page.input_value('#f-steps') == '', 'yesterday field starts empty')
    page.fill('#f-steps', '10000'); click(page, '#f-steps + [data-a=saveSteps]'); closeModals(page)
    s1 = st(page, 1)
    print('yesterday 10,000:', s1)
    check(s1['s'] == 10000 and s1['sl'] == 0 and s1['leagues'] == base['leagues'] and s1['done'] == base['done'], 'yesterday recorded, no league')
    k1 = page.evaluate("() => S.spells.map(x => x.key)")
    # clearing yesterday takes the league and the spell back; entering again returns the same spell
    page.fill('#f-steps', ''); click(page, '#f-steps + [data-a=saveSteps]'); closeModals(page)
    s1c = st(page, 1)
    print('yesterday cleared:', s1c)
    check(s1c['s'] is None and s1c['leagues'] == base['leagues'], 'clearing yesterday')
    page.fill('#f-steps', '10000'); click(page, '#f-steps + [data-a=saveSteps]'); closeModals(page)
    k2 = page.evaluate("() => S.spells.map(x => x.key)")
    check(k1 == k2, 'no new spell from clearing and re-entering')
    # editing yesterday's number does not roll again
    page.fill('#f-steps', '11,000'); click(page, '#f-steps + [data-a=saveSteps]'); closeModals(page)
    check(page.evaluate("() => S.spells.map(x => x.key)") == k2, 'editing does not roll a spell')
    check(st(page, 1)['s'] == 11000, 'yesterday edited')
    click(page, '[data-a=stepsDay][data-v=t]')
    check(page.input_value('#f-steps') == '8,412', 'back on today')

    # an older day, filled in from the calendar: statistics and mana, not the road
    click(page, 'nav [data-v=road]')
    d10 = page.evaluate("() => addDays(today(), -10)")
    page.evaluate("(d) => { UI.calMonth = d.slice(0, 7); render(); }", d10)
    click(page, '.cal button[data-d="%s"]' % d10)
    expect(page, 'not leagues')
    before = st(page, 10)
    nspells = page.evaluate("() => S.spells.length")
    page.fill('#f-dsteps', '5000'); page.press('#f-dsteps', 'Enter'); page.wait_for_timeout(80); closeModals(page)
    s10 = st(page, 10)
    print('ten days ago 5,000:', s10, 'toast:', page.locator('.toast').inner_text() if page.locator('.toast').count() else None)
    check(s10['s'] == 5000 and s10['sl'] == 0 and s10['leagues'] == before['leagues'] and s10['deed'] == 0, 'older day: recorded, no league')
    check(page.evaluate("() => S.spells.length") == nspells, 'older day: no spell')
    # a day already walked by a ritual: steps added later keep its league, and the field moves with the day
    d9 = page.evaluate("() => addDays(today(), -9)")
    click(page, '[aria-label="Next day"]')
    check(page.input_value('#f-dsteps') == '', 'next day field is its own')
    page.fill('#f-dsteps', '7,000'); click(page, '#f-dsteps + [data-a=saveSteps]')
    check(st(page, 9)['s'] == 7000, 'day nine saved')
    expect(page, 'walked through')
    page.screenshot(path=str(SHOTS / 'steps_daycard.png'), full_page=True)
    click(page, '[data-a=back]')

    # the Road's steps window
    exp = page.evaluate("""() => { const w = stepsIn(weekStart(today()), 7); const a = stepsAll(); return { avg: w.avg, n: w.n, sum: a.sum }; }""")
    print('expected:', exp)
    expect(page, 'A DAY THIS WEEK'); expect(page, 'STEPS IN ALL')
    expect(page, '{:,}'.format(exp['sum']))
    check(exp['sum'] == 8412 + 11000 + 5000 + 7000, 'total steps')
    win = page.locator('section.win', has_text='STEPS IN ALL')
    print('road window:\n' + win.inner_text())
    win.scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'steps_road.png'))
    overflow(page, 'road')

    # mana ledger
    snap = page.evaluate("() => manaSnapshot()")
    print('mana steps part:', snap['counts']['steps'])
    check(snap['counts']['steps'] == (8412 + 11000 + 5000 + 7000) // 1000, 'mana counts thousands of steps')
    page.evaluate("() => { S.mana.at = Date.now() - 1000; S.mana.snaps = [manaSnapshot()]; save(); render(); }")
    click(page, 'nav [data-v=grimoire]')
    expect(page, 'Steps walked, per 1,000')
    # stormy day bonus from steps
    page.evaluate("() => { const k = addDays(today(), -10); S.days[k].w = 4; save(); }")
    snap2 = page.evaluate("() => manaSnapshot()")
    print('bonus before/after storm:', snap['bonus'], snap2['bonus'])
    check(snap2['bonus'] == snap['bonus'], 'steps are not deeds, so no storm bonus')

    # weekly waystone stats
    ws = page.evaluate("() => weekStats(weekStart(today()))")
    print('this week stats:', {k: ws[k] for k in ('steps', 'stepDays', 'stepAvg')})

    # observation: steps against weather
    page.evaluate("""() => { const t = today();
      for (let i = 31; i <= 60; i++) { const d = addDays(t, -i); const hi = i % 2 === 0; S.days[d] = { w: hi ? (i % 6 === 0 ? 2 : 0) : (i % 5 === 0 ? 1 : 3), s: hi ? 9000 + i * 10 : 3000 + i * 10 }; }
      S.created = addDays(t, -60); save(); render(); }""")
    obs = page.evaluate("() => observations().list")
    print('observations:', obs)
    check(any('steps or more' in o for o in obs), 'steps observation appears')

    # small screen, large text
    click(page, 'nav [data-v=camp]')
    page.set_viewport_size({'width': 320, 'height': 640})
    click(page, '[data-a=openOptions]'); click(page, '[data-a=size][data-v=l]'); click(page, '[data-a=back]')
    overflow(page, 'camp 320 L')
    page.locator('#f-steps').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'steps_camp_small.png'))
    click(page, 'nav [data-v=road]')
    overflow(page, 'road 320 L')
    page.locator('section.win', has_text='STEPS IN ALL').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'steps_road_small.png'))
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
