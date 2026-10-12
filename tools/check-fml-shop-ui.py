# -*- coding: utf-8 -*-
"""真实公会配置页、合成接口；FML_SHOP_UI_BASE指定本地Vite，无真实账号请求。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = os.environ.get('FML_SHOP_UI_BASE', 'https://127.0.0.1:18122')
(OUT / 'fml-shop-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView} from 'vue-router'; import router from '/src/router';
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {}
errors, unexpected, writes = [], [], []


def handler(route):
    global saved
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append(req.url)
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
        page.goto(BASE + '/artifacts/fml-shop-test.html', wait_until='networkidle')
        assert not errors, errors
        assert not unexpected, unexpected
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='公会', exact=True).click()

    def choose(control, text):
        control.click()
        page.locator('.ant-select-dropdown:visible').get_by_text(text, exact=True).click()

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()

    load()
    shop = page.get_by_role('region', name='公会商店设置')
    master = shop.get_by_role('switch').first
    expect(master).to_have_attribute('aria-checked', 'false')
    expect(shop.locator('.shop-product')).to_have_count(0)
    master.click()
    expect(shop.locator('.shop-product')).to_have_count(36)
    first = shop.locator('[data-product-id="10001"]')
    expect(first.get_by_text('石灰水 ×10', exact=True)).to_be_visible()
    expect(shop.get_by_text('水滴 ×100', exact=True)).to_be_visible()
    first.get_by_role('switch').click()
    expect(first.get_by_label('库存低于')).to_have_count(0)
    expect(first.get_by_label('接受折扣')).to_have_count(1)
    for name, stock, discount in [('按库存', True, False), ('库存或折扣', True, True),
                                  ('库存且折扣', True, True), ('出现即买', False, False), ('按折扣', False, True)]:
        choose(first.locator('.ant-select').first, name)
        expect(first.get_by_label('库存低于')).to_have_count(1 if stock else 0)
        expect(first.get_by_label('接受折扣')).to_have_count(1 if discount else 0)
    choose(first.locator('.ant-select').first, '库存且折扣')
    first.get_by_label('库存低于').fill('123')
    first.get_by_label('库存低于').blur()
    choose(first.locator('.ant-select').last, '3折及以下（≤30币）')
    reserve = shop.get_by_label('最低保留公会币', exact=True)
    reserve.fill('500')
    reserve.blur()
    unlock = shop.locator('.custom-form-item').filter(has=page.locator('.label-text', has_text='自动解锁格子')).get_by_role('switch')
    unlock.click()
    expect(shop.get_by_label('解锁到', exact=True)).to_have_value('16')
    unlock.click()
    expect(shop.get_by_label('解锁到', exact=True)).to_have_count(0)
    unlock.click()
    refresh = shop.locator('.shop-refresh-select')
    choose(refresh, '免费刷新后允许付费刷新')
    expect(shop.locator('.shop-spend-hint')).to_be_visible()
    choose(refresh, '仅使用免费刷新')
    # 真实拖拽句柄排序；方向按钮另外提供键盘/触屏备用操作。
    source = first.locator('.shop-drag-handle')
    target = shop.locator('[data-product-id="10002"] .shop-drag-handle')
    first.evaluate("el => el.scrollIntoView({block: 'center'})")
    page.screenshot(path=str(OUT / 'fml-shop-before-drag.png'))
    a, b = source.bounding_box(), target.bounding_box()
    page.mouse.move(a['x'] + a['width'] / 2, a['y'] + a['height'] / 2)
    page.mouse.down()
    page.mouse.move(a['x'] + 12, a['y'] + 12, steps=5)
    page.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] + 12, steps=20)
    page.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] + 14)
    page.mouse.up()
    expect(shop.locator('.shop-product').first).to_have_attribute('data-product-id', '10002')
    first.get_by_role('button', name='上移石灰水').click()
    expect(shop.locator('.shop-product').first).to_have_attribute('data-product-id', '10001')
    shop.locator('[data-product-id="10002"]').get_by_role('button', name='上移蓖麻液').click()
    save()
    result = writes[-1]['union']['fmlShop']
    assert result['coinReserve'] == 500 and result['autoUnlock'] and result['unlockTo'] == 16
    assert result['items'][0]['id'] == 10002
    item = next(x for x in result['items'] if x['id'] == 10001)
    assert item['stockBelow'] == 123 and item['discount'] == 3 and item['mode'] == 'stockAndDiscount'
    load()
    expect(reserve).to_have_value('500')
    expect(shop.locator('.shop-product').first).to_have_attribute('data-product-id', '10002')
    expect(first.get_by_label('库存低于')).to_have_value('123')
    master.click()
    save()
    assert writes[-1]['union']['fmlShop']['items'] == result['items']
    master.click()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        master.evaluate("el => el.scrollIntoView({block: 'start'})")
        page.evaluate('window.scrollBy(0, -150)')
        page.screenshot(path=str(OUT / f'fml-shop-{width}.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, page.evaluate("Array.from(document.querySelectorAll('.fml-shop-settings *')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>[e.className,e.getBoundingClientRect().right])"))
        # 检查所有下拉/输入在组件边界内，截取标题和配置首屏。
        box = shop.bounding_box()
        for field in shop.locator('.shop-product-options .ant-select, .shop-product-options .ant-input-number, .shop-top-number, .ant-input-number-group-addon').all():
            fb = field.bounding_box()
            assert fb['x'] >= box['x'] - 1 and fb['x'] + fb['width'] <= box['x'] + box['width'] + 1, (width, fb, box)
        page.screenshot(path=str(OUT / f'fml-shop-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('公会商店真实页面：36商品/五种条件/拖拽/隐藏保值/保存重载/三种宽度通过')
