# -*- coding: utf-8 -*-
"""果灵指定真实页面：只用合成API，验证旧ID保留、重选、空选及手机布局。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = 'https://127.0.0.1:18139'
(OUT / 'elf-plant-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView} from 'vue-router'; import router from '/src/router';
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {'plant': {'elves': {'enabled': True, 'selectedElvesIds': ['210111'],
    'dispatch': True, 'dispatchMode': 'doubleOnly', 'dispatchCount': 7}}}
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
    ctx = browser.new_context(viewport={'width': 1100, 'height': 900}, ignore_https_errors=True, reduced_motion='reduce')
    ctx.route('**/*', handler)
    token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
    ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成果灵',role:'user'}))")
    page = ctx.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))

    def load():
        page.goto(BASE + '/artifacts/elf-plant-test.html', wait_until='networkidle')
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='种植', exact=True).click()

    def save(expected):
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
        expect(page.get_by_role('dialog')).to_be_hidden()
        assert writes[-1]['plant']['elves']['selectedElvesIds'] == expected
        assert writes[-1]['plant']['elves']['dispatch'] is True
        assert writes[-1]['plant']['elves']['dispatchMode'] == 'doubleOnly'
        assert writes[-1]['plant']['elves']['dispatchCount'] == 7

    field = page.locator('.elf-plant-selection')
    extra = field.locator('.ant-form-item-extra')
    load()
    expect(field.locator('.ant-tag')).to_contain_text('210111')
    expect(field.locator('.ant-tag')).to_contain_text('【摩羯·汐月星帘】')
    expect(field.locator('.ant-tag')).to_contain_text('当前图鉴未收录有效种植组合，请重新选择')
    expect(extra).to_contain_text('暂停果灵种植')
    expect(extra).to_contain_text('不自动改选本周双倍')
    save(['210111'])
    load()
    expect(field.locator('.ant-tag')).to_contain_text('210111')
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        field.scroll_into_view_if_needed()
        box = field.bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, box)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        assert field.locator('.ant-tag').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), width
        page.screenshot(path=str(OUT / f'elf-plant-invalid-{width}.png'))
    page.set_viewport_size({'width': 1100, 'height': 900})
    field.locator('.ant-tag-close-icon').click()
    expect(field.locator('.ant-tag')).to_have_count(0)
    expect(extra).to_contain_text('未指定果灵：按本周双倍名单')
    save([])
    load()
    expect(field.locator('.ant-tag')).to_have_count(0)
    expect(extra).to_contain_text('未指定果灵')
    field.locator('.ant-select-selector').click()
    field.get_by_role('combobox').fill('汀南暖熹')
    option = page.locator('.ant-select-dropdown:visible .ant-select-item-option')
    expect(option).to_have_count(1)
    expect(option).to_contain_text('210311')
    expect(option).to_contain_text('【甜苹华舞】')
    expect(option).to_contain_text('副果：汀南暖熹')
    option.click()
    field.get_by_role('combobox').press('Escape')
    expect(extra).to_contain_text('首个有效指定')
    expect(field.locator('.ant-tag')).to_contain_text('210311')
    save(['210311'])
    load()
    expect(field.locator('.ant-tag')).to_contain_text('210311')

    saved['plant']['elves']['selectedElvesIds'] = ['210111', '999999', '210309', '210311']
    load()
    expect(field.locator('.ant-tag')).to_have_count(4)
    expect(extra).to_contain_text('210111')
    expect(extra).to_contain_text('999999')
    expect(extra).to_contain_text('首个有效指定：【甜苹华舞】柔粉龙面果灵')
    save(['210111', '999999', '210309', '210311'])
    for value in ('210111', '999999'):
        field.locator('.ant-tag').filter(has_text=value).locator('.ant-tag-close-icon').click()
    save(['210309', '210311'])
    switch = page.locator('.ant-form-item').filter(has=page.get_by_text('自动种果灵', exact=True)).get_by_role('switch')
    switch.click()
    expect(field).to_be_hidden()
    save(['210309', '210311'])
    load()
    expect(field).to_be_hidden()
    switch.click()
    expect(field.locator('.ant-tag')).to_have_count(2)
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        field.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        for tag in field.locator('.ant-tag').all():
            assert tag.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), width
        page.screenshot(path=str(OUT / f'elf-plant-valid-{width}.png'))
    saved['plant']['friendSteal'] = {'enabled': True, 'stealElves': True,
        'onlyStealSpecifiedElves': True, 'specifiedElvesIds': ['210111', '210311']}
    load()
    friend_field = page.locator('.elf-identity-select')
    expect(friend_field).to_contain_text('【摩羯·汐月星帘】汀南暖熹果灵（ID：210111）')
    expect(friend_field).to_contain_text('【甜苹华舞】汀南暖熹果灵（ID：210311）')
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 900})
        friend_field.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        for tag in friend_field.locator('.ant-select-selection-item-content').all():
            assert tag.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), width
        page.screenshot(path=str(OUT / f'elf-friend-titles-{width}.png'))
    save(['210309', '210311'])
    assert writes[-1]['plant']['friendSteal']['specifiedElvesIds'] == ['210111', '210311']
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('果灵真实页面：旧ID保留、可主动移除、空选双倍、有效组合重选、混合无效提示、保存重载、关闭保值、派遣不变及1100/390/320布局通过；外网访问0')
