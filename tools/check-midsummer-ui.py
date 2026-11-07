# -*- coding: utf-8 -*-
"""仲夏夜之梦生产preview页面；本地18139，全部API使用合成账号。"""
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
BASE = os.environ.get('QHGY_MIDSUMMER_UI_BASE', 'https://127.0.0.1:18139')
PRODUCTION = os.environ.get('QHGY_STOCK_UI_PRODUCTION') == '1'
saved = {'1': {}, '2': {}}
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
        page.goto(BASE + '/game-config/1', wait_until='networkidle', timeout=120000)
        print('合成配置页已载入', flush=True)
        page.get_by_role('button', name='我知道了', exact=True).click()
        page.get_by_role('tab', name='活动', exact=True).click()

    def field(label):
        return page.locator('.ant-form-item').filter(has=page.get_by_text(label, exact=True)).first

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()

    load()
    sign = field('七日福利签到').get_by_role('switch')
    task = field('自动领取任务奖励').get_by_role('switch')
    draw = field('活动抽奖').get_by_role('switch')
    gift = field('自动购买勾玉礼包').get_by_role('switch')
    expect(sign).to_have_attribute('aria-checked', 'false')
    expect(gift).to_have_attribute('aria-checked', 'false')
    expect(gift).to_be_disabled()
    expect(task).to_have_attribute('aria-checked', 'true')
    task.click()
    expect(draw).to_be_disabled()
    expect(sign).to_be_enabled()
    sign.click()
    save()
    assert writes[-1][1]['activity']['hdReward']['hd3013SignEnabled'] is True
    assert writes[-1][1]['activity']['hdReward']['enabled'] is False
    load()
    expect(sign).to_have_attribute('aria-checked', 'true')
    task.click()
    draw.click()
    expect(gift).to_be_enabled()
    gift.click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_contain_text('消耗勾玉')
    dialog.get_by_role('button', name=re.compile(r'^取\s*消$')).click()
    expect(gift).to_have_attribute('aria-checked', 'false')
    gift.click()
    page.get_by_role('dialog').get_by_role('button', name='确认开启', exact=True).click()
    expect(gift).to_have_attribute('aria-checked', 'true')
    draw.click()
    expect(gift).to_be_disabled()
    expect(gift).to_have_attribute('aria-checked', 'true')
    draw.click()
    save()
    assert all(writes[-1][1]['activity']['hdReward'][key] is True for key in
               ('enabled', 'hd3013SignEnabled', 'hd3013DrawEnabled', 'hd3013GiftEnabled'))
    load()
    expect(gift).to_have_attribute('aria-checked', 'true')
    task.click()
    expect(gift).to_be_disabled()
    expect(sign).to_be_enabled()
    task.click()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        field('自动购买勾玉礼包').evaluate("el => el.scrollIntoView({block:'center'})")
        for label in ('七日福利签到', '自动领取任务奖励', '活动抽奖', '自动购买勾玉礼包'):
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            text = field(label).locator('.label-text')
            assert text.evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width, label, 'label clipped')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        page.screenshot(path=str(OUT / f'midsummer-activities-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('PASS 仲夏夜之梦生产页面：默认关闭、独立签到、购买依赖与确认/取消、保存重载、1100/390/320布局；全部API为合成数据')
