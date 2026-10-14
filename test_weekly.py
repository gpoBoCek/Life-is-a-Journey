"""Weekly rituals: X sessions a week, graded flame in weeks, rest weeks, the weekly reminder."""
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
    page.goto(URL); page.wait_for_timeout(200)
    click(page, '[data-a=begin]')
    ev(page, "() => { Math.random = () => 0.99; }")

    # quick add parses the weekly target
    for txt, name, wk in [('Workout 4/week', 'Workout', 4), ('Run 3x a week', 'Run', 3), ('Swim 2 times a week', 'Swim', 2), ('Yoga 2 per week', 'Yoga', 2), ('Read', 'Read', None)]:
        r = ev(page, "(t) => newRitual(t)", txt)
        check(r['name'] == name and ((r['mode'] == 'weekly' and r['week'] == wk) if wk else r['mode'] == 'daily'), 'parse ' + txt)
    click(page, '[data-a=setForm][data-v=ritual]')
    page.fill('#f-add', 'Workout 4/week'); click(page, 'button[data-a=add]')
    rid = ev(page, "() => S.rituals.find(r => r.name === 'Workout').id")
    row = '[data-a=cast][data-id="%s"]' % rid
    # the reminder depends on the weekday; compute what it should say
    dl = ev(page, "() => 7 - ((parseD(today()).getDay() + 6) % 7)")
    check(page.locator(row + ' .mark').inner_text() == '[0/4]', 'row shows [0/4]')
    rowtxt = page.locator(row).inner_text()
    print('row:', rowtxt.replace('\n', ' | '), '| days left', dl)
    if dl >= 4: check('4 more, ' in rowtxt, 'reminder shown while reachable')
    else: check('more,' not in rowtxt, 'no reminder when the week cannot be met')

    # tap: a session, a deed, a cast event; tap again: taken back, nothing left
    click(page, row)
    check(page.locator(row + ' .mark').inner_text() == '[1/4]' and 'session done today' in page.locator(row).inner_text(), 'one session today')
    check(ev(page, "() => todayCounts()") and ev(page, "(id) => S.events.filter(e => e.k === 'cast' && e.rid === id).length", rid) == 1, 'session is a cast and a deed')
    click(page, row)
    check(page.locator(row + ' .mark').inner_text() == '[0/4]' and not ev(page, "() => todayCounts()"), 'tap again takes it back')

    # the ritual screen: two sessions in a day count as two
    click(page, '[data-a=openRitual][data-id="%s"]' % rid) if page.locator('[data-a=openRitual][data-id="%s"]' % rid).count() else None
    if not page.locator('[data-a=castPlus]').count():
        click(page, 'nav [data-v=quests]'); click(page, '[data-a=openRitual][data-id="%s"]' % rid)
    expect(page, 'THIS WEEK'); expect(page, 'REST WEEKS'); expect(page, 'SESSIONS, LAST 12 WEEKS')
    click(page, '[data-a=castPlus]'); click(page, '[data-a=castPlus]'); closeModals(page)
    st = ev(page, "(id) => weeklyStats(S.rituals.find(r => r.id === id))", rid)
    check(st['week'] == 2 and st['total'] == 2, 'two sessions today count as two')
    check(ev(page, "(id) => S.events.filter(e => e.k === 'cast' && e.rid === id).length", rid) == 2, 'two cast events')
    click(page, '[data-a=castMinus]')
    check(ev(page, "(id) => weeklyStats(S.rituals.find(r => r.id === id)).week", rid) == 1, '-1 takes one back')

    # the graded flame over a simulated history (oldest week first)
    hist = ev(page, """(id) => {
      const r = S.rituals.find(x => x.id === id);
      const cur = weekStart(today());
      r.created = addDays(cur, -56); r.casts = {}; r.hits = {}; r.restWeeks = [];
      const plan = [4, 2, 0, 4, 0, 0, 4, 0];          // weeks -8 .. -1
      plan.forEach((n, i) => { const w = addDays(cur, -7 * (8 - i)); for (let k = 0; k < n; k++) { const d = addDays(w, k); r.casts[d] = '18:00'; r.hits[d] = ['18:00']; } });
      r.restWeeks = [addDays(cur, -7)];                 // last week was a rest week
      r.casts[today()] = '18:00'; r.hits[today()] = ['18:00'];
      save();
      return weeklyStats(r);
    }""", rid)
    print('history stats:', {k: hist[k] for k in ('flame', 'longest', 'status', 'full', 'judged', 'total', 'week')})
    check(hist['flame'] == 1 and hist['status'] == 'burning' and hist['longest'] == 2 and hist['full'] == 3 and hist['judged'] == 7 and hist['total'] == 15, 'graded flame follows the rules')
    # without the rest week, last week's emptiness is a first miss: flickering, flame kept
    fl = ev(page, "(id) => { const r = S.rituals.find(x => x.id === id); const keep = r.restWeeks; r.restWeeks = []; const c = r.casts[today()], h = r.hits[today()]; delete r.casts[today()]; delete r.hits[today()]; const s = weeklyStats(r); r.restWeeks = keep; r.casts[today()] = c; r.hits[today()] = h; return s; }", rid)
    check(fl['status'] == 'flickering' and fl['flame'] == 1, 'one empty week flickers')
    fl2 = ev(page, "(id) => { const r = S.rituals.find(x => x.id === id); const keep = r.restWeeks; r.restWeeks = []; const s = weeklyStats(r); r.restWeeks = keep; return s; }", rid)
    check(fl2['status'] == 'burning' and fl2['flame'] == 1, 'a session this week settles the flicker')
    # a partial week holds the flame without growing it
    pt = ev(page, "(id) => { const r = S.rituals.find(x => x.id === id); return weeklyStats(r).longest; }", rid)
    check(pt == 2, 'the 2-of-4 week held but did not grow the flame')

    # rest weeks: this week, a picked past week, unmark
    ev(page, "() => render()")
    click(page, '[data-a=restWeek][data-v="%s"]' % ev(page, "() => weekStart(today())"))
    check(ev(page, "(id) => isRestWeek(S.rituals.find(r => r.id === id), weekStart(today()))", rid), 'this week marked as rest')
    past = ev(page, "() => addDays(today(), -24)")
    page.fill('#rw-date', past); click(page, '[data-a=restWeek][data-v=pick]')
    check(ev(page, "(a) => isRestWeek(S.rituals.find(r => r.id === a[0]), weekStart(a[1]))", [rid, past]), 'picked past week marked')
    expect(page, 'MARKED')
    page.screenshot(path=str(SHOTS / 'weekly_view.png'), full_page=True)
    click(page, '[data-a=restWeek][data-v="%s"]' % ev(page, "(d) => weekStart(d)", past))
    check(not ev(page, "(a) => isRestWeek(S.rituals.find(r => r.id === a[0]), weekStart(a[1]))", [rid, past]), 'tapping a marked week unmarks it')
    click(page, '[data-a=back]')
    click(page, 'nav [data-v=camp]')
    check(page.locator(row + ' .mark').inner_text() == '[r]' and 'rest week' in page.locator(row).inner_text(), 'camp shows the rest week')
    page.screenshot(path=str(SHOTS / 'weekly_camp.png'))

    # day card: a day without a session is not a miss
    nosess = ev(page, "() => { const cur = weekStart(today()); return addDays(cur, -7 * 3 + 5); }")
    ev(page, "(d) => { UI.stack = [{ type: 'day', d: d, title: 'DAY' }]; render(true); }", nosess)
    expect(page, 'no session'); expect(page, 'week 0 of 4')
    ev(page, "() => { UI.stack = []; render(true); }")

    # switching a daily ritual to weekly in settings
    click(page, 'nav [data-v=quests]')
    did = ev(page, "() => { const r = newRitual('Stretch'); r.per = 2; const y = addDays(today(), -1); r.casts[y] = '08:00'; r.hits[y] = ['08:00', '20:00']; r.hits[today()] = ['07:00']; S.rituals.push(r); save(); render(); return r.id; }")
    click(page, '[data-a=openRitual][data-id="%s"]' % did)
    click(page, '[data-a=setForm][data-k="r-mode"][data-v=weekly]')
    page.fill('#r-week', '3'); click(page, '[data-a=saveRitual]')
    r2 = ev(page, "(id) => { const r = S.rituals.find(x => x.id === id); return { mode: r.mode, week: r.week, per: r.per, y: (r.hits[addDays(today(), -1)] || []).length, t: !!r.hits[today()] }; }", did)
    print('switched:', r2)
    check(r2['mode'] == 'weekly' and r2['week'] == 3 and r2['per'] == 1 and r2['y'] == 1 and not r2['t'], 'daily ritual switched to weekly cleanly')
    expect(page, 'SESSIONS, LAST 12 WEEKS')
    # and back to daily
    click(page, '[data-a=setForm][data-k="r-mode"][data-v=daily]'); click(page, '[data-a=saveRitual]')
    check(ev(page, "(id) => S.rituals.find(x => x.id === id).mode", did) == 'daily', 'switched back to daily')

    # old rituals load as daily
    ev(page, "() => { S.rituals.forEach(r => { delete r.mode; delete r.week; delete r.restWeeks; }); save(); }")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    check(ev(page, "() => S.rituals.every(r => r.mode && r.week && Array.isArray(r.restWeeks))"), 'migration fills mode, week and rest weeks')

    # sessions added later: a past day this week (or, on a Monday, yesterday from its day card)
    ev(page, "(id) => { const r = S.rituals.find(x => x.id === id); r.mode = 'weekly'; r.week = 4; r.restWeeks = []; r.casts = {}; r.hits = {}; r.created = addDays(today(), -20); S.events = S.events.filter(e => e.rid !== id); save(); render(); }", rid)
    click(page, 'nav [data-v=quests]'); click(page, '[data-a=openRitual][data-id="%s"]' % rid)
    past = ev(page, "() => { const ws = weekStart(today()); return ws < today() ? ws : null; }")
    spells0 = ev(page, "() => S.spells.length")
    if past:
        click(page, '.weekdays [data-d="%s"]' % past)
        r3 = ev(page, "(a) => { const r = S.rituals.find(x => x.id === a[0]); return { c: r.casts[a[1]], week: weeklyStats(r).week, deed: deedsOn(a[1]), ev: S.events.filter(e => e.rid === a[0] && e.late).length, mana: manaSnapshot().counts.cast }; }", [rid, past])
        print('added later:', r3)
        check(r3['c'] == 'late' and r3['week'] == 1 and r3['deed'] == 0 and r3['ev'] == 1 and r3['mana'] >= 1, 'late session counts for the week and mana, not the league')
        check(ev(page, "() => S.spells.length") == spells0, 'no spell from a late session')
        check(page.locator('.weekdays [data-d="%s"] .wdn' % past).inner_text() == '+', 'day button shows + for added later')
        page.screenshot(path=str(SHOTS / 'weekly_days.png'))
        click(page, '.weekdays [data-d="%s"]' % past)
        check(ev(page, "(a) => !S.rituals.find(x => x.id === a[0]).casts[a[1]] && !S.events.some(e => e.rid === a[0] && e.late)", [rid, past]), 'tapping again removes it')
        # today from the same row works like the camp tap
        click(page, '.weekdays [data-d="%s"]' % ev(page, "() => today()"))
        check(ev(page, "() => todayCounts()"), 'today from the week row is a normal session')
        click(page, '.weekdays [data-d="%s"]' % ev(page, "() => today()"))
    # a session logged on its own (past) day is locked; an empty past day can take one from its day card
    y = ev(page, "() => addDays(today(), -1)")
    ev(page, "(a) => { const r = S.rituals.find(x => x.id === a[0]); r.casts[a[1]] = '18:00'; r.hits[a[1]] = ['18:00']; S.events.push({ k: 'cast', rid: a[0], d: a[1], t: 0 }); save(); }", [rid, y])
    d2 = ev(page, "() => addDays(today(), -2)")
    ev(page, "(d) => { UI.stack = [{ type: 'day', d: d, title: 'DAY' }]; render(true); }", y)
    check(page.locator('[data-a=toggleSession]').count() == 0, 'a session logged on its day cannot be toggled from its card')
    ev(page, "(d) => { UI.stack = [{ type: 'day', d: d, title: 'DAY' }]; render(true); }", d2)
    expect(page, 'tap to add')
    click(page, '[data-a=toggleSession][data-d="%s"]' % d2)
    expect(page, 'session, added later')
    check(ev(page, "(a) => S.rituals.find(x => x.id === a[0]).casts[a[1]] === 'late' && deedsOn(a[1]) === 0", [rid, d2]), 'day card adds a late session, no league')
    ev(page, "() => { UI.stack = []; render(true); }")

    page.set_viewport_size({'width': 320, 'height': 640})
    click(page, 'nav [data-v=quests]'); click(page, '[data-a=openRitual][data-id="%s"]' % rid)
    overflow(page, 'weekly view 320')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
