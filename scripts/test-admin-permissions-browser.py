"""生产 dist 管理面板回归；Python Playwright + Edge，全部接口使用合成数据。"""
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
MODULES = dict(zip(
    'statistics user_management batch_filter_users expired_accounts account_migration recharge_records order_user_search recharge_packages permission_settings announcements customer_service group_chat_qr payment_settings invite_settings quota_settings vip_invites monthly_report admin_panel_permissions lottery_system operation_logs game_accounts_stats change_password login_lock player_records card_keys script_servers server_migration domain_redirect activity_management quota_transfers'.split(),
    '统计数据 用户管理 批量筛选用户 过期账号管理 账号迁移 充值记录 订单查用户 充值套餐管理 权限设置 公告管理 客服设置 群聊二维码 支付设置 邀请设置 配额设置 VIP邀请关系 月度报告 管理面板权限分配 抽奖系统 管理员操作日志 游戏账号统计 修改密码 IP封锁管理 玩家记录 卡密系统 服务器管理 跨服迁移 域名跳转 活动管理 玩家交易配额'.split()))
state = {'permissions': {}, 'saved': {}, 'role': 'subadmin'}
calls, errors, unexpected = [], [], []

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def route_request(route):
    request, url = route.request, urlparse(route.request.url)
    if url.hostname not in ('127.0.0.1', 'localhost'):
        unexpected.append('external ' + str(url.hostname))
        return route.abort()
    path = url.path
    if not path.startswith('/api/'):
        return route.continue_()
    calls.append(request.method + ' ' + path)
    data = {'success': True, 'data': []}
    if path == '/api/admin/my-admin-panel-permissions':
        data['data'] = {'isAdmin': False, 'permissions': state['permissions']}
    elif path == '/api/admin/users':
        data.update(users=[], total=0, page=1, pageSize=10)
    elif path in ('/api/admin/available-roles', '/api/admin/permission-levels'):
        data['data'] = [{'id': 2, 'name': 'subadmin', 'level': 99, 'permissions': {}}, {'id': 3, 'name': 'custom', 'level': 20, 'permissions': {}}]
    elif path == '/api/admin/admin-panel-modules':
        data['data'] = [{'key': key, 'name': name, 'description': '合成模块说明'} for key, name in MODULES.items()]
    elif path == '/api/admin/admin-panel-permissions/2':
        if request.method == 'PUT':
            state['saved'] = request.post_data_json['adminPanelAccess']
        data['data'] = {'roleName': 'subadmin', 'roleLevel': 99, 'adminPanelAccess': state['saved']}
    elif path in ('/api/admin/user-operation-logs', '/api/admin/user-transactions'):
        assert state['permissions'].get('player_records') is True
        data.update(user={'id': 10, 'username': '合成玩家'}, list=[], pagination={'total': 0})
    elif path == '/api/admin/recharge-statistics':
        data['data'] = {'today': {}, 'yesterday': {}, 'thisMonth': {}, 'lastMonth': {}, 'total': {}}
    elif path == '/api/admin/monthly-recharge-statistics':
        data['data'] = {'statistics': [], 'total': 0}
    elif path == '/api/game-accounts/player_records':
        data = {'code': 200, 'data': {'results': []}}
    elif path == '/api/points/balance':
        data['points'] = 500
    elif path == '/api/challenge':
        data['data'] = {'challenge': '0' * 64}
    elif path == '/api/domain-redirect/status':
        data['data'] = {'enabled': False}
    elif path not in ('/api/game-accounts/list', '/api/quota-settings/active', '/api/challenge/verify-fingerprint',
                       '/api/quota-settings/admin/list', '/api/activities/admin/list', '/api/admin/announcements'):
        unexpected.append(request.method + ' ' + path)
        return route.fulfill(status=500, json={'success': False})
    route.fulfill(json=data)

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        context.route('**/*', route_request)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('adminToken'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成总代',role:'subadmin',points:500,permissions:{admin_panel:true}}))")
        page = context.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        base = f'http://127.0.0.1:{server.server_port}'

        def open_panel(permissions, role='subadmin'):
            state['permissions'] = permissions
            page.goto(base, wait_until='networkidle')
            if role != 'subadmin':
                page.evaluate("role => { const user = JSON.parse(localStorage.getItem('user')); user.role = role; localStorage.setItem('user', JSON.stringify(user)); window.dispatchEvent(new Event('userInfoUpdated')); }", role)
            page.get_by_role('menuitem', name='管理面板', exact=True).click()
            expect(page.locator('.admin-panel .ant-tabs-tab-active')).to_have_count(1)
            page.wait_for_load_state('networkidle')

        # 初始只加载可见模块；旧用户管理授权经后端展开后玩家记录能查询。
        open_panel({'user_management': True, 'player_records': True, 'login_lock': True, 'announcements': True, 'change_password': True})
        expect(page.get_by_role('tab', name=re.compile('用户管理$'))).to_have_attribute('aria-selected', 'true')
        page.get_by_role('tab', name=re.compile('玩家记录$')).click()
        page.locator('.ant-tabs-tabpane-active input').fill('合成玩家')
        page.get_by_role('button', name=re.compile('查\s*询')).click()
        expect(page.get_by_role('tab', name=re.compile('交易记录$'))).to_be_visible()
        with page.expect_response('**/api/admin/user-transactions?*'):
            page.get_by_role('tab', name=re.compile('交易记录$')).click()
        assert 'GET /api/admin/user-transactions' in calls
        assert not any('script-servers' in call for call in calls)

        # 单独授权配额模块可直接进入，不再被用户名/状态硬编码拦截。
        open_panel({'quota_settings': True, 'activity_management': True})
        expect(page.get_by_text('配额设置管理', exact=True)).to_be_visible()
        page.get_by_role('button', name='活动管理', exact=True).click()
        expect(page.get_by_role('tab', name=re.compile('活动管理$'))).to_have_attribute('aria-selected', 'true')
        expect(page.get_by_role('button', name='添加活动', exact=True)).to_be_visible()

        # 充值统计的两个配套请求和自定义角色导航。
        open_panel({'monthly_report': True}, 'custom')
        expect(page.get_by_role('tab', name=re.compile('充值统计$'))).to_have_attribute('aria-selected', 'true')
        expect(page.get_by_role('tab', name=re.compile('用户管理$'))).to_have_count(0)
        assert 'GET /api/admin/monthly-recharge-statistics' in calls

        # 全部管理页签可见；授权配置的30项全部保存并可重新读取。
        open_panel({key: True for key in MODULES})
        expect(page.locator('.admin-panel > div > .ant-tabs > .ant-tabs-nav [role=tab]')).to_have_count(29)
        permissions_tab = page.get_by_role('tab', name=re.compile('管理面板权限分配$'))
        permissions_tab.focus()
        permissions_tab.press('Enter')
        expect(permissions_tab).to_have_attribute('aria-selected', 'true')
        page.locator('.admin-panel-permissions .ant-select-selector').click()
        page.locator('.ant-select-item-option-content').filter(has_text='subadmin').click()
        expect(page.locator('.admin-panel-permissions .ant-checkbox-wrapper')).to_have_count(30)
        page.get_by_role('button', name=re.compile('全\s*选$')).click()
        page.get_by_role('button', name=re.compile('保存权限配置$')).click()
        expect(page.get_by_text('权限配置保存成功', exact=True)).to_be_visible()
        assert state['saved'] == {key: True for key in MODULES}
        page.locator('.admin-panel-permissions').get_by_role('button', name=re.compile('刷\s*新$')).click()
        expect(page.locator('.admin-panel-permissions input[type=checkbox]:checked')).to_have_count(30)
        page.get_by_role('button', name='全不选', exact=True).click()
        expect(page.locator('.admin-panel-permissions input[type=checkbox]:checked')).to_have_count(1)
        assert not unexpected, unexpected
        assert not errors, errors
        out = ROOT / 'artifacts/admin-permissions'
        out.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(out / 'authorization.png'), full_page=True)
        context.close()
        browser.close()
        print('PASS 管理面板生产dist：玩家记录、独立模块、自定义角色、全部29页签、30项授权保存重读；无外部接口。')
finally:
    server.shutdown()
    server.server_close()
