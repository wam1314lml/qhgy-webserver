# -*- coding: utf-8 -*-
"""御前献珍真实Vue页面，全部请求为合成接口。"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import atexit
import base64
import json
import re
import threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.startswith('/game-config/'):
            self.path = '/index.html'
        super().do_GET()

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.shutdown)
BASE = f'http://127.0.0.1:{server.server_port}'
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
    elif url.path == '/api/game-accounts/list':
        route.fulfill(json={'success': True, 'data': [{'id': 1, 'nickname': '合成御贡', 'platform': 3}]})
    elif url.path == '/api/game-accounts/1/setting':
        if req.method == 'PUT':
            saved = req.post_data_json
            writes.append(saved)
            route.fulfill(json={'success': True})
        else:
            route.fulfill(json={'success': True, 'platform': 3, 'data': saved})
    else:
        unexpected.append((req.method, url.path))
        route.fulfill(status=404, json={'success': False})

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    ctx = browser.new_context(viewport={'width': 1100, 'height': 900}, ignore_https_errors=True, reduced_motion='reduce')
    ctx.route('**/*', handler)
    token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
    ctx.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成御贡',role:'user'}))")
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))

    def load():
        page.goto(BASE + '/game-config/1', wait_until='networkidle')
        expect(page.get_by_role('tab', name=re.compile(r'^活动(?:\s|$)'))).to_be_visible()
        notice = page.get_by_role('button', name='我知道了', exact=True)
        notice.click()
        expect(page.get_by_role('dialog')).to_be_hidden()
        page.get_by_role('tab', name=re.compile(r'^活动(?:\s|$)')).click()

    def field(label):
        return page.locator('.imperial-tribute-settings .ant-form-item').filter(has=page.get_by_text(label, exact=True))

    def save():
        page.get_by_role('button', name=re.compile(r'^保\s*存$')).click()
        expect(page.get_by_text('配置保存成功', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^确\s*定$')).click()
        expect(page.get_by_role('dialog')).to_be_hidden()

    load()
    expect(page.locator('.imperial-tribute-settings .activity-task-help')).to_contain_text('当期特选水果')
    reward = field('宫廷委托奖励自动领取').get_by_role('switch')
    auto = field('自动进贡珍果').get_by_role('switch')
    gold = field('筹办贡运金币提交').get_by_role('switch')
    refresh = field('勾玉刷新进贡冷却').get_by_role('switch')
    for control in [reward, auto, gold, refresh]:
        expect(control).to_have_attribute('aria-checked', 'false')
    expect(refresh).to_be_disabled()
    reward.click()
    save()
    assert writes[-1]['activity']['imperialTribute'] == {'taskRewardEnabled': True, 'tributeEnabled': False, 'goldTributeEnabled': False, 'jadeRefreshEnabled': False, 'jadeRefreshQualities': [1, 2, 3, 4, 5], 'jadeReserve': 0}
    gold.click()
    save()
    assert writes[-1]['activity']['imperialTribute'] == {'taskRewardEnabled': True, 'tributeEnabled': False, 'goldTributeEnabled': True, 'jadeRefreshEnabled': False, 'jadeRefreshQualities': [1, 2, 3, 4, 5], 'jadeReserve': 0}
    load()
    expect(gold).to_have_attribute('aria-checked', 'true')
    expect(gold).to_be_enabled()
    auto.click()
    refresh.click()
    page.get_by_role('dialog').get_by_role('button', name=re.compile(r'^取\s*消$')).click()
    expect(refresh).to_have_attribute('aria-checked', 'false')
    refresh.click()
    page.get_by_role('button', name='确认开启', exact=True).click()
    expect(refresh).to_have_attribute('aria-checked', 'true')
    reserve = field('保留勾玉').get_by_role('spinbutton')
    expect(reserve).to_have_value('0')
    reserve.fill('500')
    qualities = field('勾玉刷新品质')
    for color in ('绿', '蓝', '紫', '金', '红'):
        expect(qualities.get_by_role('checkbox', name=color, exact=True)).to_be_checked()
    for color in ('绿', '蓝', '紫', '金'):
        qualities.get_by_role('checkbox', name=color, exact=True).uncheck()
    save()
    assert writes[-1]['activity']['imperialTribute']['jadeRefreshQualities'] == [5]
    assert writes[-1]['activity']['imperialTribute']['jadeReserve'] == 500
    load()
    expect(reserve).to_have_value('500')
    expect(qualities.get_by_role('checkbox', name='红', exact=True)).to_be_checked()
    expect(qualities.get_by_role('checkbox', name='金', exact=True)).not_to_be_checked()
    qualities.get_by_role('checkbox', name='金', exact=True).check()
    save()
    assert writes[-1]['activity']['imperialTribute']['jadeRefreshQualities'] == [4, 5]
    refresh.click()
    expect(qualities).to_be_hidden()
    expect(reserve).to_be_hidden()
    save()
    assert writes[-1]['activity']['imperialTribute']['jadeRefreshQualities'] == [4, 5]
    assert writes[-1]['activity']['imperialTribute']['jadeReserve'] == 500
    refresh.click()
    page.get_by_role('button', name='确认开启', exact=True).click()
    for color in ('金', '红'):
        qualities.get_by_role('checkbox', name=color, exact=True).uncheck()
    save()
    assert writes[-1]['activity']['imperialTribute']['jadeRefreshQualities'] == []
    load()
    expect(qualities.get_by_role('checkbox', checked=True)).to_have_count(0)
    for color in ('金', '红'):
        qualities.get_by_role('checkbox', name=color, exact=True).check()
    save()
    load()
    auto.click()
    expect(refresh).to_be_disabled()
    expect(refresh).to_have_attribute('aria-checked', 'true')
    expect(qualities.get_by_role('checkbox', name='红', exact=True)).to_be_disabled()
    expect(reserve).to_be_disabled()
    save()
    assert writes[-1]['activity']['imperialTribute']['jadeRefreshQualities'] == [4, 5]
    load()
    expect(refresh).to_be_disabled()
    expect(reward).to_have_attribute('aria-checked', 'true')
    expect(gold).to_have_attribute('aria-checked', 'true')
    auto.click()
    for width in (1100, 390, 320):
        page.set_viewport_size({'width': width, 'height': 1000})
        page.get_by_role('tab', name=re.compile(r'^活动(?:\s|$)')).click()
        expect(reward).to_be_visible()
        page.locator('.imperial-tribute-settings').evaluate("el => {el.style.scrollMarginTop='140px'; el.scrollIntoView({block:'start'});}")
        for label in ('宫廷委托奖励自动领取', '自动进贡珍果', '筹办贡运金币提交', '勾玉刷新进贡冷却', '勾玉刷新品质', '保留勾玉'):
            box = field(label).bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, (width, label, box)
            assert field(label).locator('.label-text').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1'), (width, label)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        expect(reserve).to_have_value('500')
        box = reserve.bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= width - 8
        for color in ('绿', '蓝', '紫', '金', '红'):
            checkbox = qualities.get_by_role('checkbox', name=color, exact=True)
            expect(checkbox).to_be_visible()
            box = checkbox.bounding_box()
            assert box and box['x'] >= 0 and box['x'] + box['width'] <= width + 1
        page.screenshot(path=str(OUT / f'imperial-tribute-{width}.png'))
    assert not errors, errors
    assert not unexpected, unexpected
    browser.close()
print('PASS 御前献珍生产dist：勾玉确认/取消、品质选择、保留勾玉、关闭保值、保存重载及1100/390/320布局；外网请求0')
