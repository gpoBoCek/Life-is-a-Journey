"""Test rituals that need more than one cast a day, plus migration of old saves."""
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
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2).new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    # old save without per/hits must migrate
    page.goto(URL); page.wait_for_timeout(200)
    page.evaluate("""() => { const s = freshState(); const t = today();
      s.rituals.push({ id: 'old1', name: 'Old habit', least: '', cue: '', time: null, created: addDays(t, -3), casts: { [addDays(t,-1)]: '09:00', [addDays(t,-2)]: '09:00' }, rests: {}, spellName: null, archived: false });
      localStorage.setItem('lij.state.v1', JSON.stringify(s)); }""")
    page.reload(); page.wait_for_timeout(300)
    m = page.evaluate("() => { const r = S.rituals[0]; return { per: r.per, hits: r.hits, st: ritualStats(r) }; }")
    print('migrated old ritual:', m)
    # new ritual, 2 a day
    click(page, '[data-a=setForm][data-v=ritual]')
    page.fill('#f-add', 'Brush teeth'); click(page, 'button[data-a=add]')
    rid = page.evaluate("() => S.rituals[1].id")
    click(page, 'nav [data-v=quests]')
    page.locator('[data-a=openRitual][data-id="%s"]' % rid).click(); page.wait_for_timeout(60)
    page.fill('#r-per', '2'); click(page, '[data-a=saveRitual]')
    click(page, 'nav [data-v=camp]')
    row = '[data-a=cast][data-id="%s"]' % rid
    page.locator(row).click(); page.wait_for_timeout(60); closeModals(page)
    s1 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); return { hits: hitsToday(r), done: !!r.casts[today()], mark: page_mark = ritualMark(r, ritualStats(r)) }; }", rid)
    print('after 1 tap:', s1)
    page.locator(row).click(); page.wait_for_timeout(60); closeModals(page)
    s2 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); const st = ritualStats(r); return { hits: hitsToday(r), done: st.castToday, flame: st.flame, total: st.total, mark: ritualMark(r, st), castEvents: S.events.filter(e => e.k==='cast' && e.rid===id).length }; }", rid)
    print('after 2 taps:', s2)
    page.locator(row).click(); page.wait_for_timeout(60); closeModals(page)
    s3 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); const st = ritualStats(r); return { hits: hitsToday(r), done: st.castToday, total: st.total, mark: ritualMark(r, st), castEvents: S.events.filter(e => e.k==='cast' && e.rid===id).length }; }", rid)
    print('after 3rd tap (takes one back):', s3)
    page.screenshot(path='/tmp/claude-0/shots/20_per_camp.png')
    # detail screen: +1 completes, per change re-judges today
    click(page, 'nav [data-v=quests]')
    page.locator('[data-a=openRitual][data-id="%s"]' % rid).click(); page.wait_for_timeout(60)
    click(page, '[data-a=castPlus]'); closeModals(page)
    page.screenshot(path='/tmp/claude-0/shots/21_per_detail.png')
    page.fill('#r-per', '3'); click(page, '[data-a=saveRitual]')
    s4 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); const st = ritualStats(r); return { per: r.per, hits: hitsToday(r), done: st.castToday, total: st.total }; }", rid)
    print('after raising to 3 a day:', s4)
    page.fill('#r-per', '1'); click(page, '[data-a=saveRitual]'); closeModals(page)
    s5 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); const st = ritualStats(r); return { per: r.per, hits: hitsToday(r), done: st.castToday, total: st.total, castEvents: S.events.filter(e => e.k==='cast' && e.rid===id).length }; }", rid)
    print('after lowering to 1 a day:', s5)
    click(page, '[data-a=rest]')
    s6 = page.evaluate("(id) => { const r = S.rituals.find(x => x.id === id); const st = ritualStats(r); return { hits: hitsToday(r), done: st.castToday, rest: st.restToday, castEvents: S.events.filter(e => e.k==='cast' && e.rid===id).length }; }", rid)
    print('after rest:', s6)
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
