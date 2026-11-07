"""Run after npm run build: actual dist, synthetic HTTP and local fruit images only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import base64
import json
import threading
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'node_modules' / '.cache' / 'inventory-quality-20261107' / 'screenshots'
OUT.mkdir(parents=True, exist_ok=True)
FRUITS = [
    (54023, '山海·青蛇缘', 5, 0), (54001, '圣域灵花', 5, 800),
    (54002, '九尾仙狐', 5, 800), (54003, '祥瑞灵鸾', 5, 18),
    (53061, '湖畔灵塔', 4, 1600), (53001, '绿宝香瓜', 4, 90),
    (52001, '总统西梅', 3, 600), (52002, '雾琉闻夜铃', 3, 0),
    (51001, '法兰西西梅', 2, 500), (51002, '蓝蜜西梅', 2, 499),
    (50001, '蛇果', 1, 10000), (50002, '红颜草莓', 1, 12),
    (999999, '未知品质示例', 99, 2),
]
ITEMS = [dict(itemId=i, name=n, quality=q, value=str(v), cultivated=True) for i, n, q, v in reversed(FRUITS)]
ACCOUNTS = [dict(id=i, nickname=f'库存演示{i}', username='fixture-role', platform=0,
    server_name='s1201区', status='active', expire_time='2099-12-13T00:00:00Z') for i in [101, 102]]
state = dict(revision=1, mode='tabs', errors=[], external=[], unknown=[], writes=[], bad=[])


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if urlparse(self.path).path == '/':
            self.path = '/index.html'
        super().do_GET()


def handler(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname != '127.0.0.1':
        state['external'].append(url.hostname)
        return route.abort()
    path = url.path
    if not path.startswith('/api/'):
        return route.continue_()
    if req.method != 'GET' and path != '/api/challenge/verify-fingerprint':
        state['writes'].append([req.method, path])
        return route.fulfill(status=405, json=dict(success=False))
    if path == '/api/site-status':
        body = dict(success=True, data=dict(enabled=False, durationHours=0, startedAt=None,
            expectedEndAt=None, version=1, serverTime='2026-11-07T12:00:00Z'))
    elif path == '/api/challenge':
        body = dict(success=True, data=dict(challenge='0'*64))
    elif path == '/api/challenge/verify-fingerprint':
        body = dict(success=True)
    elif path == '/api/game-accounts/list':
        body = dict(success=True, data=ACCOUNTS)
    elif path == '/api/game-accounts/player_records':
        body = dict(code=200, data=dict(results=[dict(id=str(a['id']), isStarted=True,
            isOnline=True, status='online', record=dict(playerAttrs=dict(level=53))) for a in ACCOUNTS]))
    elif path == '/api/points/balance':
        body = dict(success=True, points=100)
    elif path == '/api/admin/my-admin-panel-permissions':
        body = dict(success=True, data=dict(isAdmin=False, hasPanelAccess=False, permissions={}))
    elif path == '/api/flower-market/settings':
        body = dict(success=True, data=dict(enabled=False))
    elif path in ['/api/domain-redirect/status', '/api/auth/group-chat-image', '/api/recharge-notice']:
        body = dict(success=True, data=dict(enabled=False))
    elif path in ['/api/quota-settings/active', '/api/leaderboard/catalog', '/api/admin/announcements/active', '/api/auth/announcements']:
        body = dict(success=True, data=[])
    elif path.endswith('/evt-state'):
        state['revision'] += 1
        items = ITEMS if parse_qs(url.query).get('id') == ['101'] else ITEMS[-4:]
        layout = dict(rankListLabel='水果明细', rankTabDefault='count', rankTabsMode=state['mode'],
            rankTabs=[dict(key='count', label='按数量', items=items),
                dict(key='cultivated', label='已培育', items=items[::2]),
                dict(key='uncultivated', label='未培育', items=items[1::2])])
        body = dict(code=200, data=dict(success=True, protocol=2, revision=str(state['revision']), epoch='local',
            online=True, updatedAt=int(time.time()*1000), modules={'水果库存': dict(layout=layout)}))
    elif path.endswith('/evt-history'):
        body = dict(code=200, data=dict(success=True, protocol=2, events=[], modules=[dict(module='水果库存', count=0)],
            liveCursor='local', nextCursor=None, hasMore=False, retainedFrom=int(time.time()*1000)-86400000))
    else:
        state['unknown'].append(path)
        return route.fulfill(status=404, json=dict(success=False, code='FIXTURE_MISSING'))
    return route.fulfill(json=body)


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True, args=['--no-proxy-server'])
        ctx = browser.new_context(viewport=dict(width=1280, height=1000), reduced_motion='reduce')
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.signature'
        ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成果友',role:'user',points:100}))")
        ctx.route('**/*', handler)
        page = ctx.new_page()
        page.on('pageerror', lambda e: state['errors'].append(str(e)))
        page.on('response', lambda r: state['bad'].append([r.status, r.url]) if r.status >= 400 else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
        page.locator('.account-card').first.get_by_role('button', name='查看日志', exact=True).click()
        page.locator('.evt-section-toggle').filter(has_text='水果明细').click()

        def tab(name):
            page.locator('.evt-rank-tab').filter(has_text=name).click()

        def quality(name):
            page.get_by_role('group', name='水果品质筛选').get_by_role('button', name=name, exact=True).click()

        def sort(name):
            page.get_by_role('group', name='品质内库存排序').get_by_role('button', name=name, exact=True).click()

        def names():
            return page.locator('.evt-fruit-name').all_text_contents()

        def refresh():
            with page.expect_response(lambda r: urlparse(r.url).path.endswith('/evt-state')):
                page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")

        tab('按品质')
        expect(page.locator('.evt-fruit-quality-heading > span:first-child')).to_have_text(
            ['红色品质', '金色品质', '紫色品质', '蓝色品质', '绿色品质', '未知品质'])
        quality('红')
        assert names() == ['圣域灵花', '九尾仙狐', '祥瑞灵鸾', '山海·青蛇缘']
        sort('从少到多 ↑')
        assert names() == ['山海·青蛇缘', '祥瑞灵鸾', '圣域灵花', '九尾仙狐']
        search = page.get_by_label('搜索水果库存', exact=True)
        search.fill('山海')
        expect(page.locator('.evt-inventory-matches')).to_have_text('找到 1 / 4 种')
        search.fill('蛇果')
        expect(page.locator('.evt-rank-empty')).to_have_text('未找到匹配的红色水果')
        quality('绿')
        expect(page.locator('.evt-fruit-name')).to_have_text('蛇果')
        search.fill('')
        quality('红')
        refresh()
        expect(page.locator('.evt-inventory-quality-option[aria-pressed="true"]')).to_have_text('红')
        expect(page.locator('.evt-inventory-quality-sort-option[aria-pressed="true"]')).to_have_text('从少到多 ↑')
        tab('500库存↑')
        assert page.locator('.evt-inventory-quality-option').count() == 0
        assert all(int(v) >= 500 for v in page.locator('.evt-fruit-stock b').all_text_contents())
        tab('按品质')
        assert names() == ['山海·青蛇缘', '祥瑞灵鸾', '圣域灵花', '九尾仙狐']
        print('PASS production dist: quality selection, numeric sort/ties/zero, search, refresh and tab isolation', flush=True)
        for width in [1280, 390, 320]:
            page.set_viewport_size(dict(width=width, height=1000))
            quality('全部')
            expect(page.locator('.evt-fruit-quality-heading')).to_have_count(6)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert page.locator('.evt-inventory-quality-option,.evt-inventory-quality-sort-option').evaluate_all(
                'els => els.every(el => { const r=el.getBoundingClientRect(); return r.width>0 && r.left>=0 && r.right<=innerWidth; })')
            await_images = "els => Promise.all(els.map(img => { img.loading='eager'; return img.decode(); }))"
            page.locator('.evt-fruit-grid img').evaluate_all(await_images)
            assert page.locator('.evt-fruit-grid img').count() == 12
            assert page.locator('.fruit-image-fallback').count() == 1
            assert page.locator('.evt-fruit-grid').evaluate('''grid => {
                const entries=[...grid.children];
                return entries.every((el,i)=> !el.matches('.evt-fruit-quality-heading') ||
                    (el.getBoundingClientRect().width>=grid.clientWidth-30 &&
                    (!i || el.getBoundingClientRect().top>=entries[i-1].getBoundingClientRect().bottom)));
            }''')
            page.screenshot(path=str(OUT / f'all-{width}.png'))
            quality('红')
            sort('从多到少 ↓')
            page.screenshot(path=str(OUT / f'red-{width}.png'))
            print(f'PASS {width}px: quality controls/group rows fit, real fruit images loaded', flush=True)
        page.set_viewport_size(dict(width=1280, height=1000))
        page.locator('.log-view-modal-wrap .ant-modal-close').click()
        page.locator('.account-card').nth(1).get_by_role('button', name='查看日志', exact=True).click()
        page.locator('.evt-section-toggle').filter(has_text='水果明细').click()
        tab('按品质')
        expect(page.locator('.evt-inventory-quality-option[aria-pressed="true"]')).to_have_text('全部')
        expect(page.locator('.evt-inventory-quality-sort-option[aria-pressed="true"]')).to_have_text('从多到少 ↓')
        quality('绿')
        expect(page.locator('.evt-rank-empty')).to_have_text('暂无绿色水果')
        quality('全部')
        expect(page.locator('.evt-fruit-tile')).to_have_count(4)
        print('PASS role switch resets quality/sort; empty quality retains recovery controls', flush=True)
        for key in ['errors', 'external', 'unknown', 'writes']:
            assert not state[key], (key, state[key])
        # The existing index.html points to the absent starter favicon; unrelated to inventory.
        unexpected_bad = [entry for entry in state['bad']
            if not (entry[0] == 404 and urlparse(entry[1]).path == '/vite.svg')]
        assert not unexpected_bad, unexpected_bad
        if state['bad']:
            print('NOTE existing /vite.svg favicon returns 404; inventory resources all loaded', flush=True)
        browser.close()
except Exception:
    print(json.dumps(state, ensure_ascii=True), flush=True)
    raise
finally:
    server.shutdown()
    server.server_close()
print('PASS no page errors, failed inventory resources, external requests or business writes')
