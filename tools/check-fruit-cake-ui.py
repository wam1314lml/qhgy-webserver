# -*- coding: utf-8 -*-
"""生产页面缀果成糕开关：合成API、保存重载、旧开关隔离及手机布局。"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import base64, json, re, threading, sys
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/fruit-cake'
OUT.mkdir(parents=True, exist_ok=True)
PLATFORM = 1 if '--zfb' in sys.argv else 3
saved = {'activity': {'actCardCollect': {'enabledCardCollect': True}}}
errors, unexpected, writes = [], [], []

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        if self.path.startswith('/game-config/'): self.path = '/index.html'
        super().do_GET()

def handler(route):
    global saved
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append(url.hostname); route.abort(); return
    if not url.path.startswith('/api/'):
        route.continue_(); return
    if url.path == '/api/game-accounts/1/setting':
        if req.method == 'PUT':
            saved = req.post_data_json; writes.append(saved); route.fulfill(json={'success': True})
        else:
            route.fulfill(json={'success': True, 'platform': PLATFORM, 'data': saved})
        return
    responses = {
        '/api/challenge': {'success': True, 'data': {'challenge': '0' * 64}},
        '/api/challenge/verify-fingerprint': {'success': True},
        '/api/points/balance': {'success': True, 'points': '100'},
        '/api/flower-market/settings': {'success': True, 'data': {'enabled': False}},
        '/api/game-accounts/list': {'success': True, 'data': [{'id': 1, 'nickname': '合成卡册', 'platform': PLATFORM}]},
    }
    if url.path not in responses: unexpected.append((req.method, url.path))
    route.fulfill(json=responses.get(url.path, {'success': False}))

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        ctx = browser.new_context(viewport={'width': 1100, 'height': 850}, reduced_motion='reduce')
        ctx.route('**/*', handler)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'卡册离线验证',role:'user'}))")
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))

        def load():
            page.goto(f'http://127.0.0.1:{server.server_port}/game-config/1', wait_until='networkidle')
            notice = page.get_by_role('button', name='我知道了', exact=True)
            if notice.is_visible(): notice.click()
            page.get_by_role('tab', name=re.compile(r'^活动')).click()

        def field(label):
            keys = {'领取卡册任务奖励': 'enabledCardCollect', '自动开启卡包': 'enabledOpenCardPack',
                    '自动购买勾玉礼包': 'enabledJadeGift', '自动扦插育果': 'enabledCuttingFruit', '自动缀果成糕': 'enabledFruitCake'}
            return page.locator('[id="form_item_activity.actCardCollect.' + keys[label] + '"]')

        def save():
            page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
            expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
            page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
            expect(page.get_by_role('dialog')).to_be_hidden()

        load()
        cake = field('自动缀果成糕')
        expect(cake).to_have_attribute('aria-checked', 'false')
        expect(cake).to_be_enabled()
        cake.click(); save(); load()
        expect(cake).to_have_attribute('aria-checked', 'true')
        assert saved['activity']['actCardCollect']['enabledFruitCake'] is True
        assert saved['activity']['actCardCollect']['enabledCardCollect'] is True
        for key in ('enabledJadeGift', 'enabledCuttingFruit', 'enabledOpenCardPack'):
            assert saved['activity']['actCardCollect'][key] is False
        field('领取卡册任务奖励').click(); save(); load()
        expect(cake).to_have_attribute('aria-checked', 'true')
        labels = ['领取卡册任务奖励', '自动开启卡包', '自动购买勾玉礼包', '自动扦插育果', '自动缀果成糕']
        for width in (1100, 390, 320):
            page.set_viewport_size({'width': width, 'height': 850})
            page.get_by_text('卡册活动', exact=True).evaluate("el => el.scrollIntoView({block:'start'})")
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            for label in labels:
                box = field(label).bounding_box()
                assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            page.screenshot(path=str(OUT / f'cake-{PLATFORM}-{width}.png'))
        cake.click(); save(); load()
        expect(cake).to_have_attribute('aria-checked', 'false')
        assert saved['activity']['actCardCollect']['enabledFruitCake'] is False
        assert not errors, errors
        assert not unexpected, unexpected
        (OUT / f'validation-{PLATFORM}.json').write_text(json.dumps({'saveRequests': len(writes),
            'widths': [1100, 390, 320], 'pageErrors': errors, 'externalRequests': unexpected}, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
    print('PASS 缀果成糕默认关闭、独立开关、保存重载、关闭保存及1100/390/320布局；页面异常/外网请求0。')
finally:
    server.shutdown()
