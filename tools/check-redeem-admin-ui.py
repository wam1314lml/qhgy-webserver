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
batch_requests = []
retry_requests = []
state = {'fail': True, 'batch': 'fail', 'empty_list': False, 'retry': 'fail'}
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def handle(route):
    req, url = route.request, urlparse(route.request.url)
    if url.hostname != '127.0.0.1': outside.append(url.hostname); route.abort(); return
    if not url.path.startswith('/api/'): route.continue_(); return
    p = url.path
    if p == '/api/admin/my-admin-panel-permissions': data = {'isAdmin':False,'permissions':{'redeem_codes':True}}
    elif p == '/api/admin/redeem-codes': data = {'records':[] if state['empty_list'] else rows,'total':0 if state['empty_list'] else len(rows)}
    elif p == '/api/admin/redeem-codes/batch-reward':
        batch_requests.append(req.post_data_json)
        if state['batch'] == 'fail': route.fulfill(status=503,json={'success':False,'message':'批量发放结果未确认，请刷新后重试'}); return
        if state['batch'] == 'malformed': data = {'issued': 23}
        elif state['batch'] == 'empty': data = dict(total=27,issued=0,alreadyRewarded=25,ineligible=2,failed=0,mirrorPending=0,pointsIssued=0,failures=[])
        else: data = dict(total=27,issued=23,alreadyRewarded=2,ineligible=1,failed=1,mirrorPending=1,pointsIssued=46,
            failures=[dict(id='synthetic-failed',code='待核对CODE',userId='456',message='结果未确认，请刷新记录后重试')])
    elif p.endswith('/retry-failed'):
        retry_requests.append((p, req.post_data_json))
        if state['retry'] == 'fail': route.fulfill(status=503,json={'success':False,'message':'清理结果未确认，请在当前窗口重试核对'}); return
        target = next(row for row in rows if row['id'] in p)
        data = dict(requestId=req.post_data_json['requestId'],code=target['code'],channel=target['channel'],day='2026-11-21',eligible=3,cleared=2,skipped=1,missing=0)
        if state['retry'] == 'malformed': data['cleared'] = 99
        if state['retry'] == 'empty': data.update(eligible=0,cleared=0,skipped=0,missing=0)
    elif p.endswith('/attempts'): data = {'records':[{'accountHash':'synthetic','field':'official','stamp':'2026-11-21','status':'success','gameRewardSeen':True,'at':1795190400000}],'total':1}
    elif p.endswith('/reward'):
        requests.append(req.post_data_json)
        if state['fail']: route.fulfill(status=503,json={'success':False,'message':'发奖结果未确认，请重试同一码核对'}); return
        reward = dict(amount=30,uploader_user_id=456,admin_id=99,admin_username='合成管理员',transaction_id=12,created_at='2026-11-21T00:00:00Z',reason='测试贡献奖励')
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
        rows[0].update(startHour=16, startAt=1795248000000)
        context.route('**/*',handle)
        token='fixture.'+base64.urlsafe_b64encode(json.dumps({'exp':4102444800}).encode()).decode().rstrip('=')+'.fixture'
        user=dict(id=99,username='合成管理用户',role='subadmin',points=100)
        context.add_init_script('localStorage.setItem("user",'+json.dumps(json.dumps(user))+');'+''.join('localStorage.setItem('+json.dumps(k)+','+json.dumps(token)+');' for k in ['token','adminToken']))
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
        page.get_by_role('menuitem',name='管理面板',exact=True).click()
        panel=page.locator('.redeem-admin');expect(panel).to_be_visible()
        expect(panel).to_contain_text('不区分英文字母大小写')
        expect(panel).to_contain_text('网站用户 #123');expect(panel).to_contain_text('管理员上传')
        first=panel.get_by_role('row').filter(has_text='合成成功CODE')
        expect(panel).to_contain_text('开始兑换时间（北京时间）')
        expect(first).to_contain_text('16:00:00 起')
        expect(panel.get_by_role('row').filter(has_text='合成管理员CODE')).to_contain_text('全天')
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
        # 历史大小写记录合并后，实际收款人仍以原SQL为准，不改成当前最早收录者。
        expect(drawer).to_contain_text('上传者：网站用户 #123');expect(drawer).to_contain_text('实际受奖 userid：456')
        page.wait_for_function("() => { const r=document.querySelector('.ant-drawer-content')?.getBoundingClientRect(); return r && r.right <= innerWidth + 1 && r.width >= 700 }")
        page.screenshot(path=str(OUT/'detail-1280.png'))
        drawer.get_by_role('button',name='Close',exact=True).click()
        expect(drawer).to_be_hidden()
        # 每行只操作指定码；已存在成功用户/奖励的码仍可有其他失败账号。
        first.get_by_role('button',name='清理失败',exact=True).click()
        retry=page.get_by_role('dialog',name='清理指定兑换码的失败尝试',exact=True)
        expect(retry).to_contain_text('合成成功CODE');expect(retry).to_contain_text('奖励流水保留')
        retry.get_by_role('button',name=re.compile(r'^取\s*消$')).click();assert not retry_requests
        failed=panel.get_by_role('row').filter(has_text='合成失败CODE')
        failed.get_by_role('button',name='清理失败',exact=True).click()
        expect(retry).to_contain_text('合成失败CODE');expect(retry).to_contain_text('无需重启脚本')
        retry_confirm=retry.get_by_role('button',name='清理失败，允许重试',exact=True)
        retry_confirm.evaluate('(b)=>{b.click();b.click()}');expect(retry).to_contain_text('清理结果未确认')
        assert len(retry_requests)==1 and set(retry_requests[0][1])=={'requestId'}
        state['retry']='malformed';retry_confirm.click();expect(retry).to_contain_text('清理结果未确认')
        assert len(retry_requests)==2
        state['retry']='ok';retry_confirm.click();expect(retry).to_be_hidden()
        assert len(retry_requests)==3 and retry_requests[0]==retry_requests[1]==retry_requests[2]
        assert retry_requests[0][0].endswith(rows[2]['id']+'/retry-failed')
        expect(panel.locator('.retry-result')).to_contain_text('已放行重试 2 条')
        expect(panel.locator('.retry-result')).to_contain_text('合成失败CODE')
        first.get_by_role('button',name='清理失败',exact=True).click();state['retry']='empty'
        page.set_viewport_size({'width':320,'height':900})
        expect(retry).to_be_visible()
        page.wait_for_function("() => [...document.querySelectorAll('.ant-modal')].some(e => e.getBoundingClientRect().width > 200 && getComputedStyle(e).opacity === '1' && !e.getAnimations({subtree:true}).some(a => a.playState === 'running'))")
        assert retry.evaluate('(e)=>e.getBoundingClientRect().right <= innerWidth+1')
        page.screenshot(path=str(OUT/'retry-modal-320.png'))
        retry_confirm.click();expect(retry).to_be_hidden()
        expect(panel.locator('.retry-result')).to_contain_text('符合条件 0 条')
        assert retry_requests[-1][1]['requestId']!=retry_requests[0][1]['requestId']
        assert len(requests)==2 and not batch_requests, '清理失败不调用发奖接口'
        page.set_viewport_size({'width':1280,'height':900})
        # 当前精确查询没有结果，也能发放全部分页；浏览器只发一次批量API，不逐码POST。
        state['empty_list']=True
        panel.get_by_placeholder('精确查询兑换码（留空显示全部）').fill('不存在的合成查询')
        panel.get_by_role('button',name='查询 / 刷新').click()
        expect(first).to_be_hidden()
        panel.get_by_role('button',name='批量发放奖励',exact=True).click()
        batch=page.get_by_role('dialog',name='批量发放兑换码贡献奖励',exact=True)
        expect(batch).to_contain_text('不受当前查询条件限制')
        expect(batch).to_contain_text('按码累计奖励')
        batch.get_by_role('button',name=re.compile(r'^取\s*消$')).click()
        assert not batch_requests
        panel.get_by_role('button',name='批量发放奖励',exact=True).click()
        batch_confirm=batch.get_by_role('button',name=re.compile(r'^确\s*定$'))
        batch_confirm.click();expect(batch).to_contain_text('请填写正整数配额点数和发放原因');assert not batch_requests
        batch.get_by_role('spinbutton').fill('2');batch.get_by_role('textbox').fill('批量贡献奖励')
        batch_confirm.evaluate('(b)=>{b.click();b.click()}')
        expect(batch).to_contain_text('批量发放结果未确认');assert len(batch_requests)==1
        expect(batch.get_by_role('spinbutton')).to_have_value('2')
        expect(batch.get_by_role('textbox')).to_have_value('批量贡献奖励')
        state['batch']='malformed';batch_confirm.click()
        expect(batch).to_contain_text('已到账奖励不会重复发放');assert len(batch_requests)==2
        state['batch']='partial';batch_confirm.click();expect(batch).to_be_hidden()
        expect(panel.locator('.batch-result')).to_contain_text('确认新增 23 条，共 46 点')
        expect(panel.locator('.batch-result')).to_contain_text('失败或待核对 1 条')
        expect(panel.locator('.batch-result')).to_contain_text('更新器展示待同步')
        panel.get_by_text('查看 1 条失败或待核对记录',exact=True).click()
        expect(panel).to_contain_text('待核对CODE')
        assert batch_requests==[{'amount':2,'reason':'批量贡献奖励'}]*3
        assert len(requests)==2, '批量发奖不能循环调用逐码发奖API'
        for width in [1280,390,320]:
            page.set_viewport_size({'width':width,'height':900})
            expect(panel).to_be_visible()
            assert panel.evaluate('(e)=>e.getBoundingClientRect().right <= innerWidth+1')
            page.screenshot(path=str(OUT/f'admin-{width}.png'))
        panel.get_by_role('button',name='批量发放奖励',exact=True).click()
        expect(batch).to_be_visible()
        page.wait_for_function("() => [...document.querySelectorAll('.ant-modal')].some(e => e.getBoundingClientRect().width > 200 && getComputedStyle(e).opacity === '1' && !e.getAnimations({subtree:true}).some(a => a.playState === 'running'))")
        assert batch.evaluate('(e)=>e.getBoundingClientRect().right <= innerWidth+1')
        page.screenshot(path=str(OUT/'batch-modal-320.png'))
        state['batch']='empty';batch.get_by_role('spinbutton').fill('2');batch_confirm.click()
        expect(batch).to_be_hidden();expect(panel.locator('.batch-result')).to_contain_text('确认新增 0 条')
        expect(panel.locator('.batch-result')).to_contain_text('跳过已发奖 25 条')
        expect(panel.get_by_text('待核对CODE',exact=True)).to_be_hidden()
        assert not errors,errors
        assert not outside,outside
        browser.close()
    print('兑换奖励管理页面：单条与批量门禁/校验、防连点、503及畸形回包重试、全部分页单次API、部分失败/零新增/镜像待同步、SQL流水与1280/390/320截图通过；真实发奖和外网请求0。')
finally:
    server.shutdown();server.server_close()
