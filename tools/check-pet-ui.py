# -*- coding: utf-8 -*-
"""真实宠物配置页，全部API为合成数据；不连接真实账号。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = 'https://127.0.0.1:18123'
(OUT / 'pet-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView} from 'vue-router'; import router from '/src/router';
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {'basic': {'feedCat': {'enabled': False, 'autoRecall': True, 'autoBuyFood': True, 'autoFeed': True, 'autoStroke': True}}}
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
        page.goto(BASE + '/artifacts/pet-test.html', wait_until='networkidle')
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='基础', exact=True).click()

    def field(label):
        return page.locator('.ant-form-item').filter(has=page.get_by_text(label, exact=True))

    def switch(label):
        return field(label).get_by_role('switch')

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()

    load()
    master = switch('宠物总开关')
    expect(master).to_have_attribute('aria-checked', 'false')
    expect(switch('首次宠物指引')).to_have_count(0)
    master.click()
    expect(switch('首次宠物指引')).to_have_attribute('aria-checked', 'true')
    expect(switch('查看外出记录')).to_have_attribute('aria-checked', 'true')
    for label in ['自动购买狗粮', '自动喂狗狗', '自动摸狗狗', '自动找回与处理事件']:
        expect(switch(label)).to_have_attribute('aria-checked', 'true')
    switch('首次宠物指引').click()
    switch('查看外出记录').click()
    save()
    assert writes[-1]['basic']['feedCat']['autoGuide'] is False
    assert writes[-1]['basic']['feedCat']['autoReadLog'] is False
    load()
    expect(switch('首次宠物指引')).to_have_attribute('aria-checked', 'false')
    master.click()
    save()
    assert writes[-1]['basic']['feedCat']['autoFeed'] is True
    assert writes[-1]['basic']['feedCat']['autoGuide'] is False
    master.click()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        page.get_by_text('宠物狗狗', exact=True).evaluate("el => el.scrollIntoView({block: 'start'})")
        page.evaluate('window.scrollBy(0, -140)')
        for label in ['宠物总开关', '首次宠物指引', '自动找回与处理事件', '自动购买狗粮', '自动喂狗狗', '自动摸狗狗', '查看外出记录']:
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            assert field(label).locator('.label-text').bounding_box()['height'] < 30, (width, label)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.locator('.pet-settings').screenshot(path=str(OUT / f'pet-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('宠物真实页面：旧配置/新开关/隐藏保值/保存重载/1100及390及320宽度通过')
