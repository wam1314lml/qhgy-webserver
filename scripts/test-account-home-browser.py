# -*- coding: utf-8 -*-
"""运行完整首页及生产 dist；需已安装 Python Playwright 和 Edge，全部 API 使用合成数据。

python scripts/test-account-home-browser.py [--url https://127.0.0.1:8089] [--screenshots DIR]
默认用临时本地端口提供 dist，不访问真实账号或外部服务。
"""
import argparse
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--url')
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
catalog = json.loads((ROOT / 'src/data/guild-artwork.json').read_text(encoding='utf-8'))
game = catalog['game']
icon = '3_8_12' if game == 'qhgy' else '1|101|201'
title_id = 2 if game == 'qhgy' else 1
guild = dict(status='joined', id=101, name='合成公会', icon=icon, titleId=title_id,
             level=4, members=24, capacity=26, wealth=6660, guildCoin=903)
accounts = [dict(id=i, nickname=f'合成角色{i}', username=f'synthetic-{i}', platform=0,
                 server_id=str(800+i), status='active', expire_time='2099-10-01T00:00:00Z',
                 created_at='2026-01-01T00:00:00Z') for i in range(1, 8)]
records = [dict(id=str(a['id']), isStarted=False, isOnline=False, status='offline',
                record=dict(player={'nickName': a['nickname']}, playerAttrs={'level': 60},
                            fmlRace={'usedTaskNum': 2, 'totalTaskNum': 10}, guild=dict(guild)))
           for a in accounts]
records[0]['isOnline'] = True
records[1]['record']['isOnline'] = True
records[3]['record']['guild'] = {'status': 'not_joined'}
del records[4]['record']['guild']
records[5]['record'] = None
records[6]['record']['guild'].update(icon='999_999_999', titleId=999, titleName='未知称号')
state = {'empty': False, 'break_images': False}
errors, unexpected, calls = [], [], []

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def route_request(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append(req.method + ' external ' + str(url.hostname))
        route.abort()
        return
    if state['break_images'] and url.path.startswith('/guild-overview/'):
        route.fulfill(status=404, body='synthetic missing image')
        return
    if not url.path.startswith('/api/'):
        route.continue_()
        return
    calls.append(req.method + ' ' + url.path)
    if req.method == 'GET' and url.path == '/api/game-accounts/list':
        data = {'success': True, 'data': [] if state['empty'] else accounts}
    elif req.method == 'GET' and url.path == '/api/game-accounts/player_records':
        data = {'code': 200, 'data': {'results': records}}
    elif req.method == 'GET' and url.path == '/api/points/balance':
        data = {'success': True, 'points': 500}
    elif req.method == 'GET' and url.path == '/api/challenge':
        data = {'success': True, 'data': {'challenge': '0' * 64}}
    elif req.method == 'POST' and url.path == '/api/challenge/verify-fingerprint':
        data = {'success': True}
    elif req.method == 'GET' and url.path == '/api/quota-settings/active':
        data = {'success': True, 'data': []}
    elif req.method == 'GET' and url.path == '/api/domain-redirect/status':
        data = {'success': True, 'data': {'enabled': False}}
    else:
        unexpected.append(req.method + ' ' + url.path)
        route.fulfill(status=500, json={'success': False})
        return
    route.fulfill(json=data)

server = None
try:
    if args.url:
        assert urlparse(args.url).hostname in ('127.0.0.1', 'localhost'), '只允许本地测试地址'
        base = args.url
    else:
        assert (ROOT / 'dist/index.html').is_file(), '请先运行 npm run build'
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 1000}, ignore_https_errors=True)
        context.route('**/*', route_request)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成用户',role:'user',points:500}))")
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base, wait_until='networkidle')
        cards = page.locator('.account-card')
        expect(cards).to_have_count(7)
        expect(page.locator('.account-guild')).to_have_count(7)
        for i in range(7):
            expect(cards.nth(i)).to_contain_text(f'合成角色{i+1}')
        for i in [0, 1]:
            expect(cards.nth(i).locator('.guild-snapshot')).to_have_count(0)
        expect(cards.nth(2).locator('.guild-snapshot')).to_have_text('上次同步')
        expect(cards.nth(3)).to_contain_text('尚未加入公会')
        for i in [4, 5]:
            expect(cards.nth(i)).to_contain_text('公会信息待同步')
        expect(cards.nth(6).locator('.guild-avatar-fallback')).to_have_text('会')
        expect(cards.nth(6).locator('.guild-title-text')).to_have_text('未知称号')
        expect(cards.nth(0).locator('.guild-race')).to_contain_text('2/10')
        expect(cards.nth(5).locator('.guild-race')).to_contain_text('0/0')
        for i in [0, 1, 2]:
            expect(cards.nth(i).locator('.guild-avatar img')).to_have_count(4)
            expect(cards.nth(i).locator('.guild-title-badge')).to_contain_text(catalog['titles'][str(title_id)]['name'])
        assert page.locator('.account-guild img').evaluate_all('(imgs) => imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0)')
        for width in [1280, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 1000})
            assert cards.evaluate_all('(items) => items.every(e => {const r=e.getBoundingClientRect();return r.left >= 0 && r.right <= innerWidth + 1})'), width
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            if args.screenshots:
                args.screenshots.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(args.screenshots / f'{game}-home-{width}.png'))
        state['break_images'] = True
        page.reload(wait_until='networkidle')
        expect(cards).to_have_count(7)
        for i in [0, 1, 2]:
            expect(cards.nth(i).locator('.guild-avatar-fallback')).to_have_text('会')
            expect(cards.nth(i).locator('.guild-title-text')).to_contain_text(catalog['titles'][str(title_id)]['name'])
        state.update(empty=True, break_images=False)
        page.reload(wait_until='networkidle')
        expect(cards).to_have_count(0)
        expect(page.locator('.add-account-card')).to_have_count(1)
        assert not errors, errors
        assert not unexpected, unexpected
        assert 'GET /api/game-accounts/list' in calls
        browser.close()
    print(f'{game}: 完整首页7角色、在线/离线/旧记录/未入会/未知编号、图片404、空列表及1280/390/320宽度通过')
finally:
    if server:
        server.shutdown()
        server.server_close()
