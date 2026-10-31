"""生产 dist 报表下载回归；仅本机合成接口，不访问真实账号或账本。"""
from pathlib import Path
import os
root = Path(__file__).resolve().parents[1]
fixture_path = root / 'scripts/test-admin-permissions-browser.py'
fixture = fixture_path.read_text(encoding='utf-8').split('server = ThreadingHTTPServer', 1)[0]
exec(compile(fixture, str(fixture_path), 'exec'), globals())
from urllib.parse import parse_qs, quote
original_route = route_request
report_state = {'status': 200, 'html': False}
report_calls = []
CSV = '\ufeff结算报表\r\n三级代理,本次扣款(元)\r\n合成代理,283.09'.encode('utf-8')
FILENAME = '结算报表_合成代理_全部历史.csv'

def route_request(route):
    req, url = route.request, urlparse(route.request.url)
    if url.path == '/api/admin/my-admin-panel-permissions':
        return route.fulfill(json={'success': True, 'data': {'isAdmin': False, 'permissions': {'vip_invites': True}}})
    if url.path == '/api/admin/vip-invites':
        return route.fulfill(json={'success': True, 'data': [{'id': 456, 'username': '合成代理', 'email': 'fixture@example.test', 'role': 'vip1', 'created_at': '2026-10-31T00:00:00Z', 'sub_agents_available': 0, 'sub_agents_withdrawn': 283.09}]})
    if url.path == '/api/commission/admin/stats':
        return route.fulfill(json={'success': True, 'data': []})
    if url.path == '/api/admin/settlement-batches':
        return route.fulfill(json={'success': True, 'data': [{'batch_time': '2026-10-31T01:00:00.000Z', 'self_amount': 0, 'sub_amount': 283.09, 'total': 283.09}]})
    if url.path == '/api/admin/commission-report':
        query = parse_qs(url.query)
        report_calls.append(query)
        assert req.method == 'GET'
        assert req.headers.get('authorization') == 'Bearer ' + token
        assert 'token' not in query
        assert query.get('agentId') == ['456']
        if report_state['html']:
            return route.fulfill(status=report_state.get('htmlStatus', 502), content_type='text/html', body='<html>Bad Gateway</html>')
        if report_state['status'] != 200:
            return route.fulfill(status=report_state['status'], json={'success': False, 'message': '合成：没有导出报表的权限'})
        return route.fulfill(status=200, headers={'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="' + quote(FILENAME) + '"'}, body=CSV)
    return original_route(route)

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000}, accept_downloads=True)
        context.route('**/*', route_request)
        token = 'synthetic.' + base64.urlsafe_b64encode(json.dumps({'exp': 4102444800}).encode()).decode().rstrip('=') + '.synthetic'
        context.add_init_script("localStorage.setItem('token'," + json.dumps(token) + ");localStorage.setItem('adminToken'," + json.dumps(token) + ");localStorage.setItem('user',JSON.stringify({id:999,username:'合成总代',role:'subadmin',points:500,permissions:{admin_panel:true}}))")
        state['permissions'] = {'vip_invites': True}
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        downloads = []
        page.on('download', lambda item: downloads.append(item))
        page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
        page.get_by_role('menuitem', name='管理面板', exact=True).click()
        page.wait_for_load_state('networkidle')
        page.get_by_role('button', name=re.compile(r'报\s*表')).click()
        modal = page.get_by_role('dialog')
        expect(modal.get_by_text('共 1 次结算记录', exact=False)).to_be_visible()
        with page.expect_download() as event:
            modal.get_by_role('button', name='导出全部历史', exact=True).click()
        result = event.value
        assert result.suggested_filename == FILENAME
        assert Path(result.path()).read_bytes() == CSV
        assert report_calls[-1]['batchTime'] == ['all']
        expect(modal).not_to_be_visible()
        page.get_by_role('button', name=re.compile(r'报\s*表')).click()
        expect(modal.get_by_text('共 1 次结算记录', exact=False)).to_be_visible()
        modal.locator('tbody input[type=checkbox]').check()
        with page.expect_download() as event:
            modal.get_by_role('button', name='导出选中', exact=False).click()
        assert Path(event.value.path()).read_bytes() == CSV
        assert report_calls[-1]['batchTime'] == ['2026-10-31T01:00:00.000Z']
        page.get_by_role('button', name=re.compile(r'报\s*表')).click()
        report_state['status'] = 403
        modal.get_by_role('button', name='导出全部历史', exact=True).click()
        expect(page.get_by_text('报表导出失败：合成：没有导出报表的权限', exact=True)).to_be_visible()
        expect(modal).to_be_visible()
        assert len(downloads) == 2
        report_state['html'] = True
        modal.get_by_role('button', name='导出全部历史', exact=True).click()
        expect(page.get_by_text('报表导出失败：服务器响应异常（HTTP 502）', exact=True)).to_be_visible()
        assert len(downloads) == 2
        report_state['htmlStatus'] = 200
        modal.get_by_role('button', name='导出全部历史', exact=True).click()
        expect(page.get_by_text('报表导出失败：服务器未返回 CSV 报表', exact=True)).to_be_visible()
        assert len(downloads) == 2
        page.wait_for_timeout(1200)
        screenshots = os.environ.get('REPORT_SCREENSHOT_DIR')
        if screenshots:
            expect(page.locator('.ant-message-notice')).to_have_count(0)
            directory = Path(screenshots)
            directory.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(directory / 'report-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(600)
            page.screenshot(path=str(directory / 'report-mobile.png'), full_page=True)
        # 401 沿用项目统一退出登录；不允许局部错误处理绕过失效会话。
        report_state['html'] = False
        report_state['status'] = 401
        modal.get_by_role('button', name='导出全部历史', exact=True).click()
        expect(page).to_have_url(re.compile(r'/login$'))
        assert page.evaluate("localStorage.getItem('token')") is None
        assert page.evaluate("localStorage.getItem('adminToken')") is None
        assert len(downloads) == 2
        assert errors == [], errors
        assert unexpected == [], unexpected
        print('PASS: production Chromium downloads all/selected CSV with exact BOM bytes and Chinese filename; Bearer header only; 403/502/non-CSV 200 display errors; 401 logs out with zero extra downloads; no page errors or external requests.')
        context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
