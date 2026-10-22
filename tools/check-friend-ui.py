# -*- coding: utf-8 -*-
"""真实好友配置页，全部API为合成数据；不连接真实账号。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = 'https://127.0.0.1:18124'
(OUT / 'friend-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView} from 'vue-router'; import router from '/src/router';
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {'plant': {}}
errors, unexpected, writes = [], [], []

def handler(route):
    global saved
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append(url.hostname)
        route.abort()
    elif not url.path.startswith('/api/'):
        route.continue_()
    elif url.path == '/api/challenge':
        route.fulfill(json={'success': True, 'data': {'challenge': '0' * 64}})
    elif url.path == '/api/challenge/verify-fingerprint':
        route.fulfill(json={'success': True})
    elif url.path == '/api/points/balance':
        route.fulfill(json={'success': True, 'points': '100'})
    elif url.path == '/api/flower-market/settings':
        route.fulfill(json={'success': True, 'data': {'enabled': False}})
    elif url.path == '/api/game-accounts/1/setting':
        if req.method == 'PUT':
            saved = req.post_data_json
            writes.append(saved)
            route.fulfill(json={'success': True})
        else:
            route.fulfill(json={'success': True, 'data': saved})
    else:
        unexpected.append((req.method, url.path))
        route.fulfill(status=404, json={'success': False})

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(viewport={'width': 1100, 'height': 1000}, ignore_https_errors=True, reduced_motion='reduce')
    ctx.route('**/*', handler)
    token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
    ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成果友',role:'user'}))")
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))

    def load():
        page.goto(BASE + '/artifacts/friend-test.html', wait_until='networkidle')
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='种植', exact=True).click()

    def field(label):
        return page.locator('.ant-form-item').filter(has=page.get_by_text(label, exact=True))

    def switch(label):
        return field(label).get_by_role('switch')

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()

    load()
    master = switch('好友通过')
    expect(master).to_have_attribute('aria-checked', 'false')
    expect(switch('启动时拒绝全部申请')).to_have_count(0)
    master.click()
    expect(switch('启动时拒绝全部申请')).to_have_attribute('aria-checked', 'false')
    switch('启动时拒绝全部申请').click()
    for label, value in [('好友数上限','100'),('自动删除','30'),('自动删除未上线好友','7')]:
        field(label).get_by_role('spinbutton').fill(value)
        field(label).get_by_role('spinbutton').blur()
    save()
    expected = {'enabled': True, 'rejectOnStart': True, 'maxFriends': 100, 'deleteAfterMinutes': 30, 'deleteOfflineDays': 7}
    assert writes[-1]['plant']['friend'] == expected, writes[-1]['plant']['friend']
    load()
    expect(switch('启动时拒绝全部申请')).to_have_attribute('aria-checked', 'true')
    for label, value in [('好友数上限','100'),('自动删除','30'),('自动删除未上线好友','7')]:
        expect(field(label).get_by_role('spinbutton')).to_have_value(value)
    master.click()
    save()
    expected['enabled'] = False
    assert writes[-1]['plant']['friend'] == expected
    master.click()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        page.get_by_text('好友处理', exact=True).evaluate("el => el.scrollIntoView({block: 'start'})")
        page.evaluate('window.scrollBy(0, -140)')
        for label in ['好友通过', '启动时拒绝全部申请', '好友数上限', '自动删除', '自动删除未上线好友']:
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            text = field(label).locator('.label-text')
            assert text.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width,label,'label clipped')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.locator('.friend-settings-group').screenshot(path=str(OUT / f'friend-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('好友真实页面：旧配置/新开关/隐藏保值/保存重载/1100及390及320宽度通过')
