# -*- coding: utf-8 -*-
"""完整首页/正式dist验证；所有API为合成数据，禁止外网，不写真实Redis。"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import base64
import json
import re
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/redeem-upload'
OUT.mkdir(parents=True, exist_ok=True)
errors, unexpected, submissions = [], [], []
state = {'mode': 'added', 'retryAfter': 0, 'pending': None, 'statusError': False}
account = dict(id=1, nickname='合成角色', username='synthetic-1', platform=3,
               server_id='801', status='active', expire_time='2099-10-01T00:00:00Z', created_at='2026-01-01T00:00:00Z')

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def route_request(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append('external ' + str(url.hostname)); route.abort(); return
    if not url.path.startswith('/api/'):
        route.continue_(); return
    path = url.path
    if path == '/api/redeem-uploads/status':
        if state['statusError']:
            route.fulfill(status=503, json={'success': False, 'message': '上传服务暂时不可用'}); return
        data = {'success': True, 'data': {'retryAfter': state['retryAfter'], 'pending': state['pending']}}
    elif path == '/api/redeem-uploads' and req.method == 'POST':
        submissions.append(req.post_data_json)
        if state['mode'] == 'limited':
            route.fulfill(status=429, json={'success': False, 'message': '每位用户每30分钟可新增一个兑换码，请稍后再试', 'retryAfter': 1750}); return
        if state['mode'] == 'unavailable':
            route.fulfill(status=503, json={'success': False, 'message': '上传服务暂时不可用；如已提交，请保留原兑换码重试确认'}); return
        if state['mode'] == 'malformed':
            route.fulfill(json={'success': True, 'data': {'outcome': 'unknown'}}); return
        if state['mode'] == 'added': state.update(retryAfter=1800, pending=None)
        data = {'success': True, 'data': {'outcome': state['mode'], 'retryAfter': state['retryAfter'], 'pending': state['pending']}}
    elif path == '/api/game-accounts/list': data = {'success': True, 'data': [account]}
    elif path == '/api/game-accounts/player_records': data = {'code': 200, 'data': {'results': []}}
    elif path == '/api/points/balance': data = {'success': True, 'points': 500}
    elif path == '/api/challenge': data = {'success': True, 'data': {'challenge': '0' * 64}}
    elif path == '/api/challenge/verify-fingerprint': data = {'success': True}
    elif path == '/api/quota-settings/active': data = {'success': True, 'data': []}
    elif path == '/api/domain-redirect/status': data = {'success': True, 'data': {'enabled': False}}
    else:
        unexpected.append(req.method + ' ' + path)
        route.fulfill(status=404, json={'success': False}); return
    route.fulfill(json=data)

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1100, 'height': 900}, reduced_motion='reduce')
        context.route('**/*', route_request)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成用户',role:'user',points:500}))")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
        expect(page.locator('.account-card')).to_have_count(1)

        def open_dialog():
            page.get_by_role('button', name=re.compile('菜单')).click()
            page.locator('.redeem-upload-button').click()
            expect(page.get_by_role('dialog', name='上传兑换码')).to_be_visible()
            expect(page.get_by_label('限时兑换码', exact=True)).to_be_enabled()

        open_dialog()
        dialog = page.get_by_role('dialog', name='上传兑换码')
        code = page.get_by_label('限时兑换码', exact=True)
        submit = dialog.get_by_role('button', name='提交兑换码', exact=True)
        expect(dialog.get_by_role('radio')).to_have_count(2)
        expect(dialog.get_by_role('radio', name='微信／抖音')).to_be_checked()
        expect(submit).to_be_disabled()
        code.fill('两个 兑换码')
        submit.click()
        expect(dialog).to_contain_text('请填写一个完整兑换码')
        assert not submissions
        code.fill('  合成AbC-123  ')
        submit.evaluate('(button) => { button.click(); button.click() }')
        expect(dialog).to_contain_text('上传成功，已加入所选渠道的限时码。')
        assert submissions == [{'channel': 'wechat_douyin', 'code': '合成AbC-123'}]
        expect(dialog).to_contain_text('下次可新增')
        expect(submit).to_be_enabled()
        state['mode'] = 'duplicate'
        submit.click()
        expect(dialog).to_contain_text('该兑换码已收录，本次不占提交次数。')
        dialog.get_by_text('支付宝', exact=True).click()
        code.fill('支付宝合成CODE')
        state['mode'] = 'limited'
        submit.click()
        expect(dialog).to_contain_text('每位用户每30分钟可新增一个兑换码，请稍后再试')
        assert submissions[-1] == {'channel': 'alipay', 'code': '支付宝合成CODE'}
        expect(page.locator('.ant-message-notice')).to_have_count(0)
        state['mode'] = 'unavailable'
        submit.click()
        expect(dialog).to_contain_text('请保留原兑换码重试确认')
        expect(code).to_have_value('支付宝合成CODE')
        state['mode'] = 'malformed'
        submit.click()
        expect(dialog).to_contain_text('提交结果尚未确认')
        state['mode'] = 'added'
        submit.click()
        expect(dialog).to_contain_text('上传成功')
        for width in [1100, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            expect(dialog.get_by_text('微信／抖音', exact=True)).to_be_visible()
            expect(dialog.get_by_text('支付宝', exact=True)).to_be_visible()
            assert dialog.evaluate('(e) => { const r=e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && e.scrollWidth <= r.width + 1 }'), width
            page.screenshot(path=str(OUT / f'upload-{width}.png'))
        dialog.get_by_role('button', name=re.compile(r'^关\s*闭$')).click()
        expect(dialog).to_be_hidden()
        open_dialog()
        expect(dialog).to_contain_text('下次可新增')
        dialog.get_by_role('button', name=re.compile(r'^关\s*闭$')).click()
        state.update(pending={'channel': 'wechat_douyin', 'code': '待确认合成码'}, retryAfter=0)
        open_dialog()
        expect(code).to_have_value('待确认合成码')
        expect(dialog.get_by_role('radio', name='微信／抖音')).to_be_checked()
        dialog.get_by_role('button', name='重试确认').click()
        expect(dialog).to_contain_text('上传成功')
        assert submissions[-1] == {'channel': 'wechat_douyin', 'code': '待确认合成码'}
        dialog.get_by_role('button', name=re.compile(r'^关\s*闭$')).click()
        state['statusError'] = True
        open_dialog()
        expect(dialog).to_contain_text('上传服务暂时不可用')
        code.fill('查询失败后重试')
        submit.click()
        expect(dialog).to_contain_text('上传成功')
        assert all(set(body) == {'channel', 'code'} for body in submissions)
        assert not errors, errors
        assert not unexpected, unexpected
        browser.close()
    print('兑换码上传完整首页：双渠道、新增、重复、限额、断线重试、待确认恢复、异常回包、1100/390/320布局通过；页面异常/外网请求0。')
finally:
    server.shutdown(); server.server_close()
