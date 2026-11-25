# -*- coding: utf-8 -*-
"""真实ProfilePage/Vue/Ant页面；接口与无关子组件隔离，不使用真实账号。"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse, parse_qs
import json
import subprocess
import sys
import tempfile
import threading
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
(ROOT / 'tmp').mkdir(exist_ok=True)
WORK = Path(tempfile.mkdtemp(prefix='profile-invite-', dir=ROOT / 'tmp'))
(WORK / 'index.html').write_text('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>', encoding='utf-8')
(WORK / 'main.js').write_text('''
import { createApp } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import Profile from ''' + json.dumps((ROOT / 'src/pages/ProfilePage.vue').as_posix()) + ''';
localStorage.setItem('token', 'synthetic-only');
localStorage.setItem('user', JSON.stringify({id: 999, username: '合成用户', role: 'user', points: 804}));
const router = createRouter({history: createMemoryHistory(), routes: [{path: '/profile', component: Profile}]});
const app = createApp(Profile).use(router).use(Antd);
await router.push('/profile'); app.mount('#app');
''', encoding='utf-8')
(WORK / 'build.mjs').write_text('''
import {build} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
await build({configFile: false, root, logLevel: 'warn', plugins: [{
  name: 'profile-offline-boundaries', enforce: 'pre',
  resolveId(id, importer) {
    if (!importer?.replaceAll('\\\\', '/').split('?')[0].endsWith('/src/pages/ProfilePage.vue')) return;
    if (id === '../utils/axios') return '\\0profile-api';
    if (['PointTransactionHistory','TopNavBar','UserAvatar','ForgotPasswordModal'].some(name => id.endsWith('/' + name + '.vue'))) return '\\0profile-stub';
  },
  load(id) {
    if (id === '\\0profile-stub') return 'export default {render() { return null }}';
    if (id === '\\0profile-api') return `export default {async get(path, options = {}) {
      const url = new URL(path, location.origin);
      if (options.params) url.search = options.params.toString();
      const response = await fetch(url); if (!response.ok) throw Error('合成HTTP失败');
      return {data: await response.json()};
    }};`;
  }
}, vue()], build: {target: 'esnext', outDir: root + 'dist', minify: false, chunkSizeWarningLimit: 5000}});
''', encoding='utf-8')
subprocess.run(['node', str(WORK / 'build.mjs')], cwd=ROOT, check=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(WORK / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
state = {'mode': 'legacy', 'count': 0, 'fail_page': 0}
errors, unexpected, invite_requests = [], [], []
rows = [dict(id=i, username=f'合成邀请用户{i:02d}', email='', created_at='2026-11-25T00:00:00Z') for i in range(1, 28)]

def handle(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname != '127.0.0.1':
        unexpected.append(url.hostname); route.abort(); return
    if not url.path.startswith('/api/'):
        route.continue_(); return
    if req.method != 'GET':
        unexpected.append(req.method); route.abort(); return
    if url.path == '/api/invite/info':
        query = parse_qs(url.query)
        page, size = int(query['page'][0]), int(query['pageSize'][0])
        invite_requests.append((page, size)); assert size == 5
        if state['mode'] == 'fail' or state['fail_page'] == page:
            route.fulfill(status=503, json={'message': '合成暂时失败'}); return
        data = dict(invite_code='DEMO5', invite_url='https://example.invalid/register?invite=DEMO5', total_invites=state['count'])
        if state['mode'] != 'malformed':
            data['invited_users'] = rows[:min(state['count'], 20)]
        if state['mode'] == 'paged':
            data['invited_users'] = rows[(page - 1) * size:page * size]
            data['pagination'] = dict(page=page, pageSize=size, total=state['count'], totalPages=(state['count'] + size - 1) // size)
        route.fulfill(json=data)
    elif url.path == '/api/points/balance':
        route.fulfill(json={'points': 804})
    elif url.path == '/api/admin/customer-service-info':
        route.fulfill(json={'data': {'enabled': False}})
    elif url.path == '/api/card-key/user/welfare-cards':
        route.fulfill(json={'success': True, 'data': []})
    elif url.path == '/api/points/operation-logs':
        route.fulfill(json={'list': [], 'pagination': {'total': 0, 'hasMore': False}})
    else:
        unexpected.append(url.path); route.fulfill(status=404, json={})

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 1100})
        context.route('**/*', handle)
        page = context.new_page()
        page.on('pageerror', lambda err: errors.append(str(err)))
        def load():
            page.goto(BASE, wait_until='networkidle')
        def ok():
            expect(page.locator('.invite-code-display')).to_have_text('DEMO5')
            expect(page.locator('.invite-error')).to_have_count(0)
            expect(page.locator('.invite-link-input')).to_have_value(BASE + '/login?invite=DEMO5')
        def shown():
            return page.locator('.profile-invited-list .invited-username').all_text_contents()

        load(); ok()
        expect(page.locator('.invite-empty')).to_have_text('暂无邀请用户')
        print('PASS 旧接口空名单正常显示邀请码与空态，无pagination也不报错')
        state.update(mode='legacy', count=27)
        load(); ok()
        assert len(shown()) == 20
        expect(page.locator('.invite-pagination')).to_have_count(0)
        expect(page.get_by_text('已加载 20 人', exact=True)).to_be_visible()
        expect(page.get_by_text('显示最近的邀请用户', exact=True)).to_be_visible()
        print('PASS 旧接口只展示实际返回的最近20人，不伪造完整名单或分页')

        state['mode'] = 'paged'
        load(); ok(); seen = shown()
        for number in range(2, 7):
            page.locator('.invite-pagination .ant-pagination-next').click()
            expect(page.locator('.invite-pagination input')).to_have_value(str(number))
            expect(page.locator('.invited-users')).to_have_attribute('aria-busy', 'false')
            seen += shown()
        assert seen == [row['username'] for row in rows]
        assert len(shown()) == 2
        print('PASS 新接口每页5人，27人完整翻页，无遗漏或重复')

        load(); state['fail_page'] = 2
        page.locator('.invite-pagination .ant-pagination-next').click()
        expect(page.locator('.invite-error')).to_be_visible()
        assert shown() == [row['username'] for row in rows[:5]]
        expect(page.locator('.invite-code-display')).to_have_text('DEMO5')
        state['fail_page'] = 0
        page.locator('.invite-error button').click()
        expect(page.locator('.invite-error')).to_have_count(0)
        expect(page.locator('.invite-pagination input')).to_have_value('2')
        print('PASS 翻页失败保留原页和邀请码，重试恢复正确页')

        for mode in ['fail', 'malformed']:
            state['mode'] = mode; load()
            expect(page.locator('.invite-error')).to_be_visible()
            state.update(mode='legacy', count=0)
            page.locator('.invite-error button').click(); ok()
        print('PASS HTTP失败及缺少名单不假报成功，旧格式重试可恢复')
        state.update(mode='legacy', count=7)
        for width in [1280, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1100}); load(); ok()
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        page.locator('.user-info-card').screenshot(path=str(WORK / 'legacy-mobile.png'))
        assert not errors, errors
        assert not unexpected, unexpected
        print('PASS 1280/390/320布局；页面异常0，外部请求0')
        print('截图：' + str(WORK / 'legacy-mobile.png'))
        browser.close()
finally:
    server.shutdown()
