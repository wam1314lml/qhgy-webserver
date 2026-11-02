# -*- coding: utf-8 -*-
"""真实库存配置页；本地18135，QHGY_STOCK_UI_PRODUCTION=1使用生产preview，全部API使用合成账号。"""
from pathlib import Path
from urllib.parse import urlparse
import base64
import copy
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
BASE = os.environ.get('QHGY_STOCK_UI_BASE', 'https://127.0.0.1:18135')
PRODUCTION = os.environ.get('QHGY_STOCK_UI_PRODUCTION') == '1'
(OUT / 'low-stock-priority-test.html').write_text('''<!doctype html><html lang="zh-CN">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<div id="app"></div><script type="module">
import {createApp,h} from 'vue'; import {RouterView,createRouter,createMemoryHistory} from 'vue-router';
import GameConfigPage from '/src/pages/GameConfigPage.vue';
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/game-config/:accountId',component:GameConfigPage}]});
import Antd from 'ant-design-vue'; import 'ant-design-vue/dist/reset.css';
import '/src/index.scss'; import 'virtual:uno.css';
await router.push('/game-config/1'); createApp({render:()=>h(RouterView)}).use(router).use(Antd).mount('#app');
</script></html>''', encoding='utf-8')
saved = {
    '1': {'plant': {'flower': {'plantEnabled': True, 'plantingMode': 'lowStock', 'lowStockThreshold': 500}}},
    '2': {'plant': {'flower': {'plantEnabled': True, 'plantingMode': 'lowStock', 'lowStockPriority': 'closest', 'lowStockThreshold': 600}}},
}
errors, unexpected, writes = [], [], []

def handler(route):
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
    elif url.path == '/api/game-accounts/list':
        route.fulfill(json={'success': True, 'data': [{'id': 1, 'nickname': '合成果园一', 'platform': 3}, {'id': 2, 'nickname': '合成果园二', 'platform': 1}]})
    elif re.fullmatch('/api/game-accounts/[12]/setting', url.path):
        account = url.path.split('/')[3]
        if req.method == 'PUT':
            saved[account] = req.post_data_json
            writes.append((account, copy.deepcopy(saved[account])))
            route.fulfill(json={'success': True})
        else:
            route.fulfill(json={'success': True, 'platform': 3 if account == '1' else 1, 'data': saved[account]})
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
        print('正在加载合成配置页', flush=True)
        page.goto(BASE + ('/game-config/1' if PRODUCTION else '/artifacts/low-stock-priority-test.html'), wait_until='networkidle', timeout=120000)
        print('合成配置页已载入', flush=True)
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='种植', exact=True).click()

    def field(label):
        return page.locator('.ant-form-item').filter(has=page.get_by_text(label, exact=True))

    def priority(value):
        field('补库存优先级').locator('.ant-select-selector').click()
        page.locator('.ant-select-dropdown:visible').get_by_text(value, exact=True).click()

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()

    load()
    print('检查默认选项与保存', flush=True)
    expect(field('补库存优先级')).to_contain_text('优先补最低库存')
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        field('最低库存').evaluate("el => el.scrollIntoView({block:'center'})")
        expect(field('补库存优先级')).to_be_visible()
        page.screenshot(path=str(OUT / f'low-stock-priority-default-{width}.png'))
    page.set_viewport_size({'width': 1100, 'height': 1000})
    priority('优先补快满库存')
    save()
    assert writes[-1][1]['plant']['flower']['lowStockPriority'] == 'closest'
    assert 'lowStockPriority' not in writes[-1][1]['union']['land']
    load()
    print('检查重载与隐藏保值', flush=True)
    expect(field('补库存优先级')).to_contain_text('优先补快满库存')
    page.get_by_role('radio', name='指定种类', exact=True).click()
    expect(field('补库存优先级')).to_have_count(0)
    save()
    assert writes[-1][1]['plant']['flower']['lowStockPriority'] == 'closest'
    page.get_by_role('radio', name='库存模式', exact=True).click()
    expect(field('补库存优先级')).to_contain_text('优先补快满库存')
    priority('优先补最低库存')
    save()
    assert writes[-1][1]['plant']['flower']['lowStockPriority'] == 'lowest'
    # 真实“从其他号导入”处理器，支付宝合成号复制到微信合成号。
    page.get_by_role('button', name=re.compile(r'^导\s*入$')).click()
    print('检查实际配置导入', flush=True)
    dialog = page.get_by_role('dialog', name='配置复制')
    dialog.locator('.ant-select-selector').click()
    page.locator('.ant-select-dropdown:visible').get_by_text('合成果园二', exact=False).click()
    dialog.get_by_role('button', name=re.compile(r'^导\s*入$')).click()
    expect(page.get_by_text('配置导入成功', exact=True)).to_be_visible()
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
    assert saved['1']['plant']['flower']['lowStockPriority'] == 'closest'
    expect(field('补库存优先级')).to_contain_text('优先补快满库存')
    for width in (1100, 390, 320):
        print(f'检查{width}px布局', flush=True)
        page.set_viewport_size({'width': width, 'height': 1000})
        field('最低库存').evaluate("el => el.scrollIntoView({block:'center'})")
        for label in ['最低库存', '补库存优先级']:
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            text = field(label).locator('.label-text')
            assert text.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width, label, 'label clipped')
        selected = field('补库存优先级').locator('.ant-select-selection-item')
        assert selected.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width, 'selection clipped')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.screenshot(path=str(OUT / f'low-stock-priority-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('库存优先级真实页面：旧配置默认、两项切换、保存重载、隐藏保值、跨渠道导入复制、1100/390/320布局通过；外网及真实账号访问为0')
