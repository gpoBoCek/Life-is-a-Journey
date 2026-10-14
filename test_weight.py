"""Weight: logged like steps, judged by the 7-day average, goals up or down, 1 mana per 10% of the way."""
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
    ev(page, "() => { S.created = addDays(today(), -60); save(); Math.random = () => 0.99; }")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    ev(page, "() => { Math.random = () => 0.99; }")

    # camp: one window for steps and weight; a comma works as a decimal point
    expect(page, 'STEPS AND WEIGHT')
    page.fill('#f-kg', '84,6'); page.press('#f-kg', 'Enter'); page.wait_for_timeout(80)
    check(ev(page, "() => S.days[today()].kg") == 84.6, 'weight saved with a comma')
    check(page.input_value('#f-kg') == '84.6', 'field shows 84.6')
    check(not ev(page, "() => todayCounts()"), 'weight is not a deed for leagues')
    page.fill('#f-kg', 'heavy'); click(page, '#f-kg + [data-a=saveKg]'); expect(page, 'Weight is a number in kilograms')
    page.fill('#f-kg', '900'); click(page, '#f-kg + [data-a=saveKg]'); expect(page, 'That weight looks off')
    check(ev(page, "() => S.days[today()].kg") == 84.6, 'bad input changes nothing')
    # yesterday from camp
    click(page, '[data-a=stepsDay][data-v=y]')
    page.fill('#f-kg', '85.0'); click(page, '#f-kg + [data-a=saveKg]')
    check(ev(page, "() => S.days[addDays(today(), -1)].kg") == 85.0, 'yesterday saved')
    click(page, '[data-a=stepsDay][data-v=t]')

    # a goal needs a start, and at least 2 kg of distance
    click(page, 'nav [data-v=road]')
    expect(page, 'WEIGHT'); expect(page, 'KG, 7-DAY AVERAGE')
    page.fill('#wg-target', '84'); click(page, '[data-a=setWeightGoal]')
    expect(page, 'at least 2 kg')
    page.fill('#wg-target', '79.8'); click(page, '[data-a=setWeightGoal]')
    g = ev(page, "() => weightGoal()")
    print('goal:', g)
    check(g and g['start'] == 84.8 and g['target'] == 79.8, 'goal starts at the 7-day average')
    expect(page, 'GOAL: DOWN TO 79.8 KG'); expect(page, '0% of the way')
    check(ev(page, "() => manaSnapshot().counts.weight10") == 0, 'no mana at the start')

    # a single low day barely moves the 7-day average: no free milestones from a swing
    ev(page, "() => { S.days[today()].kg = 83.8; save(); }")
    check(ev(page, "() => goalMilestones(weightGoal())") <= 1, 'one low day: 84.8 -> 84.4 average is 1 milestone at most')

    # simulate: a week at 85 before the goal, then steady loss of 0.25 kg a day for 3 weeks, nothing logged this week
    ev(page, """() => { const g = weightGoal(); g.from = addDays(today(), -28); g.start = 84.8;
      for (let i = 0; i <= 35; i++) { const k = addDays(today(), -i); if (S.days[k]) delete S.days[k].kg; }
      for (let i = 29; i <= 35; i++) { const k = addDays(today(), -i); S.days[k] = Object.assign(S.days[k] || {}, { kg: 85.0 }); }
      for (let i = 28; i >= 7; i--) { const k = addDays(today(), -i); S.days[k] = Object.assign(S.days[k] || {}, { kg: Math.round((84.8 - (28 - i) * 0.25) * 10) / 10 }); }
      save(); render(); }""")
    pr = ev(page, "() => goalProgress(weightGoal())")
    m = ev(page, "() => goalMilestones(weightGoal())")
    print('after 3 weeks: best', round(pr['best'], 3), 'now avg', round(pr['now']['avg'], 2), 'milestones', m)
    check(m == int(pr['best'] * 10 + 1e-9) and 5 <= m <= 9, 'milestones follow the 7-day average')
    check(ev(page, "() => manaSnapshot().counts.weight10") == m, 'mana counts the milestones')
    # regaining this week does not take earned mana away
    ev(page, "() => { for (let i = 0; i < 7; i++) { const k = addDays(today(), -i); S.days[k] = Object.assign(S.days[k] || {}, { kg: 84.0 }); } save(); }")
    check(ev(page, "() => goalMilestones(weightGoal())") == m, 'earned milestones stay after a regain')

    # reach the goal: capped at 10
    ev(page, "() => { for (let i = 0; i < 7; i++) { const k = addDays(today(), -i); S.days[k] = Object.assign(S.days[k] || {}, { kg: 78.0 }); } save(); render(); }")
    check(ev(page, "() => goalMilestones(weightGoal())") == 10, 'goal reached gives 10')
    expect(page, 'The goal is reached')
    expect(page, '[##########]')

    # a new goal (up this time) needs two taps; the old goal's mana stays
    page.fill('#wg-target', '82'); click(page, '[data-a=setWeightGoal]')
    expect(page, 'Mana already earned stays')
    click(page, '[data-a=setWeightGoal]')
    goals = ev(page, "() => S.weightGoals.map(g => [g.start, g.target, !!g.to])")
    print('goals:', goals)
    check(len(goals) == 2 and goals[0][2] and not goals[1][2] and goals[1][1] == 82, 'old goal ended, new goal active')
    expect(page, 'GOAL: UP TO 82.0 KG')
    check(ev(page, "() => manaSnapshot().counts.weight10") == 10, 'earned mana kept across goals')
    page.locator('section.win', has_text='KG, 7-DAY AVERAGE').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'weight_road.png'), full_page=False)
    print('weight window:\n' + page.locator('section.win', has_text='KG, 7-DAY AVERAGE').inner_text())
    overflow(page, 'road')

    # end the goal
    click(page, '[data-a=endWeightGoal]'); click(page, '[data-a=endWeightGoal]')
    check(ev(page, "() => weightGoal()") is None, 'goal ended')
    expect(page, 'SET A GOAL')

    # day card editor for an older day
    d10 = ev(page, "() => addDays(today(), -10)")
    click(page, '.heat .grid button[data-d="%s"]' % d10)
    expect(page, 'STEPS AND WEIGHT')
    page.fill('#f-dkg', ''); click(page, '#f-dkg + [data-a=saveKg]')
    check(ev(page, "(d) => S.days[d].kg", d10) is None, 'clearing a past weight')
    click(page, '[data-a=back]')

    # an old save without weight goals loads fine
    ev(page, "() => { delete S.weightGoals; save(); }")
    page.reload(); page.wait_for_timeout(300); closeModals(page)
    check(ev(page, "() => Array.isArray(S.weightGoals)"), 'migration adds weight goals')

    # small screen, large text
    page.set_viewport_size({'width': 320, 'height': 640})
    click(page, '[data-a=openOptions]'); click(page, '[data-a=size][data-v=l]'); click(page, '[data-a=back]')
    overflow(page, 'camp 320 L')
    page.locator('#f-kg').scroll_into_view_if_needed()
    page.screenshot(path=str(SHOTS / 'weight_camp_small.png'))
    click(page, 'nav [data-v=road]'); overflow(page, 'road 320 L')
    b.close()
print('ERRORS' if errors else 'NO ERRORS', errors)
