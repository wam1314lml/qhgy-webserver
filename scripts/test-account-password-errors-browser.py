# -*- coding: utf-8 -*-
"""生产dist的账密错误提示回归；全部账号/API合成，仅监听本机，不访问认证服务。"""
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/password-login-errors'
OUT.mkdir(parents=True, exist_ok=True)
reason = '认证尝试 20 次均失败，最后一次原因：system.getSerList 被服务器拒绝（s=0，err.type=0）：当前网络请求受限，请稍后重试'
state = {'status': 502, 'message': reason, 'login_calls': 0}
errors, unexpected = [], []


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def handle(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append('external ' + str(url.hostname))
        route.abort()
        return
    if not url.path.startswith('/api/'):
        route.continue_()
        return
    if url.path == '/api/game-accounts/login' and req.method == 'POST':
        assert req.post_data_json == {'username': 'offline-account', 'password': 'offline-password', 'platform': 0}
        state['login_calls'] += 1
        route.fulfill(status=state['status'], json={'success': False, 'code': 'ACCOUNT_PASSWORD_LOGIN_FAILED', 'message': state['message']})
        return
    responses = {
        '/api/challenge': {'success': True, 'data': {'challenge': '0' * 64}},
        '/api/challenge/verify-fingerprint': {'success': True},
        '/api/game-accounts/list': {'success': True, 'data': []},
        '/api/game-accounts/script-servers': {'success': True, 'data': [{'id': 'offline', 'name': '合成脚本服'}]},
        '/api/game-accounts/player_records': {'code': 200, 'data': {'results': []}},
        '/api/points/balance': {'success': True, 'points': 500},
        '/api/quota-settings/active': {'success': True, 'data': []},
        '/api/domain-redirect/status': {'success': True, 'data': {'enabled': False}},
    }
    if url.path not in responses:
        unexpected.append(req.method + ' ' + url.path)
        route.fulfill(status=500, json={'success': False})
        return
    route.fulfill(json=responses[url.path])


assert (ROOT / 'dist/index.html').is_file(), '请先运行 npm run build'
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1100, 'height': 1000})
        context.route('**/*', handle)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成用户',role:'user',points:500}))")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        scenarios = [(width, 502, reason, reason) for width in [1100, 390, 320]] + [
            (390, 401, '账号或密码错误', '账号或密码错误'),
            (390, 200, '奇幻果园 CDN JSON 解析失败：响应不是合法 JSON', '奇幻果园 CDN JSON 解析失败：响应不是合法 JSON'),
            (390, 502, 'token=synthetic-private-value', '账号密码登录失败，请稍后重试'),
        ]
        for i, (width, status, msg, expected) in enumerate(scenarios):
            state.update(status=status, message=msg)
            page.set_viewport_size({'width': width, 'height': 1000})
            page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
            notice = page.get_by_role('button', name='我知道了', exact=True)
            if notice.is_visible():
                notice.click()
            page.locator('.add-account-card').click()
            modal = page.get_by_role('dialog')
            modal.get_by_role('button', name='下一步', exact=True).click()
            modal.get_by_placeholder('请输入游戏账号').fill('offline-account')
            modal.get_by_placeholder('请输入游戏密码').fill('offline-password')
            modal.get_by_role('button', name='下一步', exact=True).click()
            toast = page.locator('.ant-message-notice:visible')
            expect(toast).to_have_count(1, timeout=10000)
            expect(toast).to_contain_text(expected)
            expect(modal.get_by_placeholder('请输入游戏密码')).to_have_value('')
            expect(modal.get_by_role('button', name='下一步', exact=True)).to_be_enabled()
            assert 'synthetic-private-value' not in page.locator('body').inner_text()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            assert toast.evaluate('(e) => {const r=e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1}'), width
            assert '/login' not in page.url, '游戏401不能退出网站'
            if i < 3:
                page.screenshot(path=str(OUT / f'auth-error-{width}.png'))
        assert state['login_calls'] == len(scenarios)
        assert not errors, errors
        assert not unexpected, unexpected
        browser.close()
    print('生产页面6场景通过：具体原因、长提示、单次弹窗、游戏401、200业务失败、敏感过滤及1100/390/320布局；真实外网请求0')
finally:
    server.shutdown()
    server.server_close()
