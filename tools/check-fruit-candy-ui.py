# -*- coding: utf-8 -*-
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import base64, json, re, threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/fruit-candy'
OUT.mkdir(parents=True, exist_ok=True)
saved = {'activity': {}}
errors, unexpected, writes = [], [], []
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        if self.path.startswith('/game-config/'): self.path = '/index.html'
        super().do_GET()
def handle(route):
    global saved
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('localhost', '127.0.0.1'):
        unexpected.append(url.hostname); route.abort(); return
    if not url.path.startswith('/api/'):
        route.continue_(); return
    if url.path == '/api/game-accounts/1/setting':
        if req.method == 'PUT':
            saved = req.post_data_json; writes.append(saved); route.fulfill(json={'success': True})
        else: route.fulfill(json={'success': True, 'platform': 3, 'data': saved})
        return
    responses = {'/api/challenge': {'success': True, 'data': {'challenge': '0' * 64}},
        '/api/challenge/verify-fingerprint': {'success': True}, '/api/points/balance': {'success': True, 'points': '100'},
        '/api/flower-market/settings': {'success': True, 'data': {'enabled': False}},
        '/api/game-accounts/list': {'success': True, 'data': [{'id': 1, 'nickname': '离线果露配置', 'platform': 3}]}}
    if url.path not in responses: unexpected.append((req.method, url.path))
    route.fulfill(json=responses.get(url.path, {'success': False}))
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1100, 'height': 850}, reduced_motion='reduce')
        context.route('**/*', handle)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'离线验证',role:'user'}))")
        page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        def load():
            page.goto(f'http://127.0.0.1:{server.server_port}/game-config/1', wait_until='networkidle')
            expect(page.get_by_role('tab', name=re.compile(r'^活动(?:\s|$)'))).to_be_visible()
            notice = page.get_by_role('button', name='我知道了', exact=True)
            notice.click()
            expect(page.get_by_role('dialog')).to_be_hidden()
            page.get_by_role('tab', name=re.compile(r'^活动(?:\s|$)')).click()
        def field(suffix):
            forms = page.get_by_role('separator').filter(has_text='果漾糖衣').locator('xpath=following-sibling::div[contains(@class,"ant-form-item")]')
            index, role = {'enabled': (0, 'switch'), 'shop.enabled': (1, 'switch'),
                'shop.beforeEndMinutes': (2, 'spinbutton'), 'shop.shopItemId': (3, 'combobox')}[suffix]
            return forms.nth(index).get_by_role(role)
        def save():
            page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
            expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
            page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
        load()
        expect(field('enabled')).to_have_attribute('aria-checked', 'false')
        expect(field('shop.enabled')).to_have_attribute('aria-checked', 'false')
        field('shop.enabled').click()
        expect(field('enabled')).to_have_attribute('aria-checked', 'false')
        field('shop.beforeEndMinutes').fill('7')
        field('shop.shopItemId').locator('xpath=ancestor::div[contains(@class,"ant-select-selector")]').click()
        page.get_by_text('百果券×5（50果露）', exact=True).click()
        save(); load()
        expect(field('enabled')).to_have_attribute('aria-checked', 'false')
        expect(field('shop.enabled')).to_have_attribute('aria-checked', 'true')
        assert saved['activity']['fruitCandy'] == {'enabled': False, 'shop': {'enabled': True, 'beforeEndMinutes': 7, 'shopItemId': 3}}
        field('enabled').click(); save(); load()
        expect(field('enabled')).to_have_attribute('aria-checked', 'true')
        for width in [1100, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 850})
            page.get_by_role('separator').filter(has_text='果漾糖衣').scroll_into_view_if_needed()
            field('shop.shopItemId').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT / f'{width}.png'))
            for control in [field('shop.beforeEndMinutes'), field('shop.shopItemId').locator('xpath=ancestor::div[contains(@class,"ant-select-selector")]')]:
                box = control.bounding_box()
                assert box and box['x'] >= 0 and box['x'] + box['width'] <= width - 8, f'{width}控件超出可视区域'
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}页面横向溢出'
        assert not errors, errors
        assert not unexpected, unexpected
        (OUT / 'validation.json').write_text(json.dumps({'saves': len(writes), 'widths': [1100, 390, 320], 'errors': errors, 'externalRequests': unexpected}, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
    print('PASS 果露独立开关/商品分钟选择/保存重载/1100、390、320布局；外部请求0')
finally:
    server.shutdown()
