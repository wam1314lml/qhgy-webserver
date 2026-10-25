# -*- coding: utf-8 -*-
"""绮梦云游真实Vue页面：合成API、开关依赖、勾玉确认、保存和手机布局。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = 'https://127.0.0.1:18129'
(OUT / 'wing-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView} from 'vue-router'; import router from '/src/router';
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {'activity': {}}
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
    ctx = browser.new_context(viewport={'width': 1100, 'height': 850}, ignore_https_errors=True, reduced_motion='reduce')
    ctx.route('**/*', handler)
    token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
    ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成筑翼',role:'user'}))")
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))

    def load():
        page.goto(BASE + '/artifacts/wing-test.html', wait_until='networkidle')
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='活动', exact=True).click()

    def field(label):
        return page.locator('.ant-form-item').filter(has=page.get_by_text(label, exact=True))

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
        expect(page.get_by_role('dialog')).to_be_hidden()

    load()
    labels = ['七日福利签到', '莓光筑翼每日任务领奖', '自动筑翼', '自动购买筑翼礼包']
    keys = ['hd3010SignEnabled', 'hd3009TaskRewardEnabled', 'hd3009DrawEnabled', 'hd3009GiftEnabled']
    for label in labels:
        expect(field(label).get_by_role('switch')).to_have_attribute('aria-checked', 'false')
    expect(field(labels[3]).get_by_role('switch')).to_be_disabled()
    for label in labels[:3]:
        field(label).get_by_role('switch').click()
    purchase = field(labels[3]).get_by_role('switch')
    expect(purchase).to_be_enabled()
    purchase.click()
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^取\s*消$')).click()
    expect(purchase).to_have_attribute('aria-checked', 'false')
    purchase.click()
    page.get_by_role('button', name='确认开启', exact=True).click()
    expect(purchase).to_have_attribute('aria-checked', 'true')
    save()
    assert all(writes[-1]['activity']['hdReward'][key] is True for key in keys)
    load()
    for label in labels:
        expect(field(label).get_by_role('switch')).to_have_attribute('aria-checked', 'true')
    field('自动筑翼').get_by_role('switch').click()
    expect(purchase).to_be_disabled()
    expect(purchase).to_have_attribute('aria-checked', 'true')
    save()
    load()
    expect(purchase).to_be_disabled()
    field('自动筑翼').get_by_role('switch').click()
    expect(purchase).to_be_enabled()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 850})
        page.get_by_text('绮梦云游', exact=True).evaluate("el => el.scrollIntoView({block: 'center'})")
        for label in labels:
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            assert field(label).locator('.label-text').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), label
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.screenshot(path=str(OUT / f'wing-{width}.png'))
    purchase.click()
    expect(purchase).to_have_attribute('aria-checked', 'false')
    save()
    assert writes[-1]['activity']['hdReward']['hd3009GiftEnabled'] is False
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('绮梦云游真实页面：默认关闭、筑翼依赖、购买确认/取消、保存重载、关闭保值及1100/390/320布局通过')
