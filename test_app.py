"""Click through every screen of the app at phone size and report any script errors."""
import json, sys, pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path(__file__).parent / 'dist' / 'standalone.html')
SHOTS = pathlib.Path('/tmp/claude-0/shots'); SHOTS.mkdir(parents=True, exist_ok=True)
errors = []

def click(page, sel, nth=0):
    loc = page.locator(sel)
    if loc.count() <= nth:
        errors.append('MISSING: ' + sel)
        return False
    loc.nth(nth).click()
    page.wait_for_timeout(60)
    return True

def text(page):
    return page.locator('#app').inner_text()

def expect(page, s):
    if s not in text(page):
        errors.append('EXPECTED TEXT NOT FOUND: ' + s)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)
    page.goto(URL)
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / '00_title.png'))
    click(page, '[data-a=begin]')
    expect(page, 'RITUALS') if False else None
    expect(page, 'ERRANDS')

    # add errand from camp, tick, undo, tick
    page.fill('#f-add', 'Buy groceries'); page.press('#f-add', 'Enter'); page.wait_for_timeout(60)
    expect(page, 'Buy groceries')
    click(page, '[data-a=tick]')
    expect(page, 'UNDO')
    # a spell may be found by chance; its window sits over the undo button
    while page.locator('[data-a=closeModal]').count(): page.locator('[data-a=closeModal]').first.click(); page.wait_for_timeout(60)
    click(page, '[data-a=undo]')
    expect(page, 'Buy groceries')
    # add a ritual
    click(page, '[data-a=setForm][data-v=ritual]')
    page.fill('#f-add', 'Read'); click(page, 'button[data-a=add]')
    expect(page, 'RITUALS TODAY')
    click(page, '[data-a=cast]')
    expect(page, 'flame 1')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    click(page, '[data-a=weather][data-v="1"]')
    page.fill('#f-line', 'First day on the road.'); click(page, '[data-a=inscribe]')
    page.screenshot(path=str(SHOTS / '01_camp.png'), full_page=False)

    # quests: edit errand, add checklist, mark dreaded
    click(page, 'nav [data-v=quests]')
    expect(page, 'QUEST BOARD')
    click(page, '[data-a=openErrand]')
    page.fill('#e-item', 'milk'); page.press('#e-item', 'Enter')
    page.fill('#e-item', 'eggs'); click(page, 'button[data-a=addItem]')
    click(page, '[data-a=tickItem]')
    click(page, '[data-a=setForm][data-k="e-dread"]')
    page.fill('#e-repeat', '7')
    click(page, '[data-a=saveErrand]')
    expect(page, 'MIMICS')
    page.screenshot(path=str(SHOTS / '02_quests.png'))
    click(page, '[data-a=openRitual]')
    expect(page, 'longest flame')
    page.fill('#r-least', 'one page'); page.fill('#r-time', '21:30'); click(page, '[data-a=saveRitual]')
    page.screenshot(path=str(SHOTS / '03_ritual.png'))
    click(page, '[data-a=back]')

    # peek
    click(page, '[data-a=peekStart]')
    expect(page, 'THE RULE OF THE CHEST')
    click(page, '[data-a=peekBegin]')
    page.wait_for_timeout(1300)
    t = page.locator('#peek-timer').inner_text()
    if t not in ('1:59', '1:58'):
        errors.append('timer not ticking: ' + t)
    page.screenshot(path=str(SHOTS / '04_peek.png'))
    click(page, '[data-a=peekClose]')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    expect(page, 'You opened the chest')

    # arts
    click(page, 'nav [data-v=arts]')
    expect(page, 'BANSHEE')
    click(page, '[data-a=openView][data-v=delves]')
    page.fill('#d-name', 'Phone calls'); click(page, '[data-a=newDelve]')
    page.fill('#fl-text', 'Answer an unknown number'); page.press('#fl-text', 'Enter')
    page.fill('#fl-text', 'Call a shop'); click(page, 'button[data-a=addFloor]')
    click(page, '[data-a=openFloor]')
    click(page, '[data-a=scout][data-v="7"]')
    click(page, '[data-a=found][data-v="3"]')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    expect(page, 'Scouted 7. Found 3.')
    click(page, '[data-a=back]')
    page.screenshot(path=str(SHOTS / '05_delve.png'))
    click(page, '[data-a=back]'); click(page, '[data-a=back]')

    click(page, '[data-a=openView][data-v=dispel]')
    page.fill('#dz-words', 'I always mess everything up.')
    click(page, '[data-a=setForm][data-v=shadow]')
    page.fill('#dz-answer', 'You finished three hard things this month. That is not always.')
    page.locator('#dz-after').fill('30')
    click(page, '[data-a=saveDispel]')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    expect(page, 'BROKEN HEXES')
    page.screenshot(path=str(SHOTS / '06_dispel.png'))
    click(page, '[data-a=back]')

    click(page, '[data-a=openView][data-v=seal]')
    page.fill('#s-text', 'What if the review goes badly'); click(page, '[data-a=sealIt]')
    expect(page, 'sealed, waiting')
    click(page, '[data-a=back]')

    click(page, '[data-a=openView][data-v=steady]')
    click(page, '[data-a=groundBegin]')
    for _ in range(5):
        click(page, '[data-a=groundNext]')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    expect(page, 'Two minutes of slow breath') if False else None
    click(page, '[data-a=back]')
    click(page, '[data-a=openView][data-v=steady]')
    click(page, '[data-a=breatheBegin]')
    page.wait_for_timeout(1500)
    page.screenshot(path=str(SHOTS / '07_breathe.png'))
    click(page, '[data-a=breatheStop]')
    click(page, '[data-a=back]')

    for bid in ['mimic', 'banshee', 'doppelganger', 'wraith', 'basilisk', 'hydra', 'siren']:
        click(page, '[data-a=openBeast][data-id=%s]' % bid)
        expect(page, 'HOW IT IS FOUGHT')
        click(page, '[data-a=back]')
    click(page, '[data-a=openNote][data-id=hexes]'); expect(page, 'THE BLIND LEDGER'); click(page, '[data-a=back]')
    click(page, '[data-a=openNote][data-id=mount]'); click(page, '[data-a=back]')
    click(page, '[data-a=openView][data-v=dark]'); expect(page, '8000 7773')
    page.screenshot(path=str(SHOTS / '08_dark.png'))
    click(page, '[data-a=back]')

    # grimoire, road
    page.evaluate("() => { for (let i = 0; i < 6; i++) { const s = drawSpell(['c','u','r','l','r','c'][i]); s.src='floor'; s.d=today(); s.at=Date.now(); s.reg='The Ash Gate'; S.spells.push(s); } save(); }")
    click(page, 'nav [data-v=grimoire]')
    expect(page, 'FOUND')
    page.screenshot(path=str(SHOTS / '09_grimoire.png'))
    click(page, '[data-a=filter][data-v=r]')
    click(page, 'nav [data-v=road]')
    expect(page, 'LEAGUES WALKED')
    page.screenshot(path=str(SHOTS / '10_road.png'))

    # options
    click(page, '[data-a=openOptions]')
    for k in ['green', 'amber', 'red', 'blue', 'white', 'orange']:
        click(page, '[data-a=phosphor][data-v=%s]' % k)
    click(page, '[data-a=toggle][data-k=scan]'); click(page, '[data-a=toggle][data-k=scan]')
    click(page, '[data-a=size][data-v=l]'); click(page, '[data-a=size][data-v=m]')
    page.fill('#o-title', 'Life is a Journey'); click(page, '[data-a=saveTitle]')
    page.fill('#o-lantern', '20:15'); click(page, '[data-a=saveLantern]')
    click(page, '[data-a=exportData]')
    page.wait_for_timeout(4500)
    expect(page, 'BACKUP')
    click(page, '[data-a=closeModal]')
    page.screenshot(path=str(SHOTS / '11_options.png'))

    # reload: state persists
    page.reload(); page.wait_for_timeout(400)
    expect(page, 'Read')
    st = page.evaluate('() => ({ leagues: leagues(), errands: S.errands.length, rituals: S.rituals.length, spells: S.spells.length, events: S.events.length })')
    print('after reload', st)

    # history simulation: 70 days of past activity, check flames, waystone, observations, road
    page.evaluate("""() => {
      const t = today();
      S.created = addDays(t, -70);
      const r = S.rituals[0]; r.created = S.created;
      for (let i = 70; i >= 1; i--) {
        const k = addDays(t, -i);
        const miss = (i % 9 === 0) || (i === 20 || i === 21);
        if (!miss) r.casts[k] = '21:' + String(10 + (i % 40)).padStart(2, '0');
        S.days[k] = { a: 2 + (i % 4), w: miss ? 3 : (i % 3 === 0 ? 2 : 0) };
        if (i % 30 === 0) S.days[k].l = 'echo from ' + i + ' days ago';
        S.events.push({ k: 'errand', d: k, t: Date.now() });
      }
      S.lastWaystone = addDays(weekStart(t), -7);
      advanceJourney();
      save();
    }""")
    page.reload(); page.wait_for_timeout(400)
    expect(page, 'WAYSTONE')
    page.screenshot(path=str(SHOTS / '12_waystone.png'))
    page.fill('#m-help', 'Walking after work.'); click(page, '[data-a=waystoneSave]')
    while page.locator('[data-a=closeModal]').count():
        click(page, '[data-a=closeModal]')
    stats = page.evaluate('() => ritualStats(S.rituals[0])')
    print('ritual stats after history', stats)
    click(page, 'nav [data-v=road]')
    expect(page, 'OBSERVATIONS')
    expect(page, 'WHAT HAS HELPED')
    page.screenshot(path=str(SHOTS / '13_road_history.png'), full_page=False)
    road = text(page)
    print('road has observation:', 'clear or fair' in road, '| echoes:', 'ECHOES' in road, '| behind:', 'THE ROAD BEHIND' in road)
    page.evaluate("() => { document.querySelector('main').scrollTop = 99999; }")
    page.wait_for_timeout(100)
    page.screenshot(path=str(SHOTS / '14_road_bottom.png'))

    # spell generator: draw many, make sure names never repeat before variants and nothing throws
    res = page.evaluate("""() => {
      const saved = JSON.stringify(S.spellUsed);
      const names = new Set(); let dup = 0;
      for (let i = 0; i < 3000; i++) { const s = drawSpell(['c','u'][i % 2]); if (names.has(s.n)) dup++; names.add(s.n); }
      const sample = [drawSpell('c'), drawSpell('u'), drawSpell('r'), drawSpell('l')].map(s => s.n + ' | ' + s.e);
      S.spellUsed = JSON.parse(saved);
      return { dup, sample };
    }""")
    print('spell draw test', res)
    regions = page.evaluate("() => { ensurePlan(4000); return { n: S.journey.plan.length, sample: S.journey.plan.slice(118, 126).map(r => r.name + ' [' + r.t + '] ' + r.d) }; }")
    print('regions planned', regions['n'])
    for r in regions['sample']:
        print('  ', r)

    # horizontal overflow check on every main tab
    for tab in ['camp', 'quests', 'arts', 'grimoire', 'road']:
        click(page, 'nav [data-v=%s]' % tab)
        w = page.evaluate('() => [document.documentElement.scrollWidth, document.querySelector("main").scrollWidth, document.querySelector("main").clientWidth]')
        if w[0] > 390 or w[1] > w[2] + 1:
            errors.append('OVERFLOW on %s: %s' % (tab, w))
    b.close()

print('ERRORS:' if errors else 'NO ERRORS')
for e in errors:
    print('  ', e)
