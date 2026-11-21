"""正式dist的兑换奖励管理页，API为合成数据，禁止外网和真实发奖。"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import base64, json, re, threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/redeem-audit'
OUT.mkdir(parents=True, exist_ok=True)
rows = [dict(id='wechat_douyin:' + 'a'*64, source='website', userId='123', channel='wechat_douyin', code='合成成功CODE', redeemSuccess='1', successCount='2', gameRewardSeen='1', uploadedAt='1795190400000', reward=None),
        dict(id='alipay:'+'b'*64, source='admin', channel='alipay', code='合成管理员CODE', redeemSuccess='1', reward=None),
        dict(id='wechat_douyin:'+'c'*64, source='website', userId='456', channel='wechat_douyin', code='合成失败CODE', lastStatus='failed', reward=None)]
errors, outside, requests = [], [], []
state = {'fail': True}
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def handle(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname != '127.0.0.1': outside.append(url.hostname); route.abort(); return
    if not url.path.startswith('/api/'): route.continue_(); return
    p = url.path
    if p == '/api/admin/my-admin-panel-permissions': data = {'isAdmin':False,'permissions':{'redeem_codes':True}}
    elif p == '/api/admin/redeem-codes': data = {'records':rows,'total':len(rows)}
    elif p.endswith('/attempts'): data = {'records':[{'accountHash':'synthetic','field':'official','stamp':'2026-11-21','status':'success','gameRewardSeen':True,'at':1795190400000}],'total':1}
    elif p.endswith('/reward'):
        requests.append(req.post_data_json)
        if state['fail']: route.fulfill(status=503,json={'success':False,'message':'发奖结果未确认，请重试同一码核对'}); return
        reward = dict(amount=30,admin_id=99,admin_username='合成管理员',transaction_id=12,created_at='2026-11-21T00:00:00Z',reason='测试贡献奖励')
        rows[0]['reward'] = reward
        data = {'reward':reward,'mirrorSynced':True,'replayed':False}
    elif p == '/api/game-accounts/list': data = []
    elif p == '/api/game-accounts/player_records': route.fulfill(json={'code':200,'data':{'results':[]}}); return
    elif p == '/api/points/balance': route.fulfill(json={'success':True,'points':100}); return
    elif p == '/api/challenge': data = {'challenge':'0'*64}
    elif p == '/api/challenge/verify-fingerprint': data = {}
    elif p == '/api/quota-settings/active': data = []
    elif p == '/api/domain-redirect/status': data = {'enabled':False}
    elif p == '/api/activities/active': data = []
    else: outside.append(req.method+' '+p); route.fulfill(status=404,json={'success':False}); return
    route.fulfill(json={'success':True,'data':data})

server = ThreadingHTTPServer(('127.0.0.1',0), partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
        context.route('**/*',handle)
        token='fixture.'+base64.urlsafe_b64encode(json.dumps({'exp':4102444800}).encode()).decode().rstrip('=')+'.fixture'
        user=dict(id=99,username='合成管理用户',role='subadmin',points=100)
        context.add_init_script('localStorage.setItem("user",'+json.dumps(json.dumps(user))+');'+''.join('localStorage.setItem('+json.dumps(k)+','+json.dumps(token)+');' for k in ['token','adminToken']))
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
        page.get_by_role('menuitem',name='管理面板',exact=True).click()
        panel=page.locator('.redeem-admin');expect(panel).to_be_visible()
        expect(panel).to_contain_text('网站用户 #123');expect(panel).to_contain_text('管理员上传')
        first=panel.get_by_role('row').filter(has_text='合成成功CODE')
        for text in ['合成管理员CODE','合成失败CODE']:
            expect(panel.get_by_role('row').filter(has_text=text).get_by_role('button',name='发放配额')).to_be_disabled()
        first.get_by_role('button',name='发放配额').click()
        dialog=page.get_by_role('dialog',name='发放兑换码贡献奖励')
        confirm=dialog.get_by_role('button',name=re.compile(r'^确\s*定$'))
        confirm.click();expect(dialog).to_contain_text('请填写正整数配额点数和发放原因');assert not requests
        dialog.get_by_role('spinbutton').fill('30');dialog.get_by_role('textbox').fill('测试贡献奖励')
        confirm.evaluate('(b)=>{b.click();b.click()}');expect(dialog).to_contain_text('发奖结果未确认')
        assert len(requests)==1
        expect(dialog.get_by_role('spinbutton')).to_have_value('30')
        state['fail']=False;confirm.click();expect(dialog).to_be_hidden()
        expect(first).to_contain_text('已发 30 点');expect(first.get_by_role('button',name='发放配额')).to_be_disabled()
        assert requests==[{'amount':30,'reason':'测试贡献奖励'}]*2
        first.get_by_role('button',name=re.compile(r'^记\s*录$')).click()
        drawer=page.locator('.ant-drawer-content');expect(drawer).to_contain_text('流水 #12');expect(drawer).to_contain_text('兑换成功')
        page.wait_for_function("() => { const r=document.querySelector('.ant-drawer-content')?.getBoundingClientRect(); return r && r.right <= innerWidth + 1 && r.width >= 700 }")
        page.screenshot(path=str(OUT/'detail-1280.png'))
        drawer.get_by_role('button',name='Close',exact=True).click()
        expect(drawer).to_be_hidden()
        for width in [1280,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            expect(panel).to_be_visible()
            assert panel.evaluate('(e)=>e.getBoundingClientRect().right <= innerWidth+1')
            page.screenshot(path=str(OUT/f'admin-{width}.png'))
        assert not errors,errors
        assert not outside,outside
        browser.close()
    print('兑换奖励管理页面：来源/成功门禁、输入校验、防连点、503重试、SQL流水、详情与1280/390/320截图通过；真实发奖和外网请求0。')
finally:
    server.shutdown();server.server_close()
