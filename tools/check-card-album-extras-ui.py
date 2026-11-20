# -*- coding: utf-8 -*-
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse
import base64, json, re, threading, os
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/card-album-extras'; OUT.mkdir(parents=True,exist_ok=True)
saved={'activity':{'actCardCollect':{'enabledCardCollect':True}}}
errors=[]; unexpected=[]; writes=[]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  if self.path.startswith('/game-config/'): self.path='/index.html'
  super().do_GET()
def route_handler(route):
 global saved
 req=route.request; url=urlparse(req.url)
 if url.hostname not in ('127.0.0.1','localhost'):
  unexpected.append(url.hostname); route.abort(); return
 if not url.path.startswith('/api/'): route.continue_(); return
 if url.path=='/api/game-accounts/1/setting':
  if req.method=='PUT': saved=req.post_data_json; writes.append(saved); route.fulfill(json={'success':True})
  else: route.fulfill(json={'success':True,'platform':3,'data':saved})
  return
 responses={'/api/challenge':{'success':True,'data':{'challenge':'0'*64}},
 '/api/challenge/verify-fingerprint':{'success':True},'/api/points/balance':{'success':True,'points':'100'},
 '/api/flower-market/settings':{'success':True,'data':{'enabled':False}},
 '/api/game-accounts/list':{'success':True,'data':[{'id':1,'nickname':'合成卡册','platform':3}]}}
 if url.path not in responses: unexpected.append((req.method,url.path))
 route.fulfill(json=responses.get(url.path,{'success':False}))
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True)
  ctx=browser.new_context(viewport={'width':1100,'height':850},reduced_motion='reduce')
  ctx.route('**/*',route_handler)
  token='synthetic.'+base64.urlsafe_b64encode(json.dumps({'exp':4102444800}).encode()).decode().rstrip('=')+'.synthetic'
  ctx.add_init_script("localStorage.setItem('token',"+json.dumps(token)+");localStorage.setItem('user',JSON.stringify({id:999,username:'卡册离线验证',role:'user'}))")
  page=ctx.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
  def load():
   page.goto(f'http://127.0.0.1:{server.server_port}/game-config/1',wait_until='networkidle')
   notice=page.get_by_role('button',name='我知道了',exact=True)
   if notice.is_visible(): notice.click()
   page.get_by_role('tab',name='活动',exact=True).click()
  def field(label):
   return page.locator('.ant-form-item').filter(has=page.locator('.ant-form-item-label').get_by_text(label,exact=True)).get_by_role('switch')
  def save():
   page.get_by_role('button',name=re.compile(r'^保\s*存$')).click()
   expect(page.get_by_text('配置保存成功',exact=True)).to_be_visible()
   page.get_by_role('dialog').get_by_role('button',name=re.compile(r'^确\s*定$')).click()
  load()
  gift=page.locator('[id="activity.actCardCollect.enabledJadeGift"]')
  cutting=field('自动扦插育果')
  if gift.count()!=1:
   gift=page.locator('.ant-form-item').filter(has=page.get_by_text('自动购买勾玉礼包',exact=True)).first.get_by_role('switch')
  expect(gift).to_have_attribute('aria-checked','false')
  expect(cutting).to_have_attribute('aria-checked','false')
  expect(gift).to_be_enabled()
  expect(page.get_by_role('button',name='刷新礼包',exact=True)).to_have_count(0)
  expect(page.get_by_role('checkbox')).to_have_count(0)
  gift.click()
  dialog=page.get_by_role('dialog')
  expect(dialog).to_contain_text('全部可购买的勾玉礼包')
  dialog.get_by_role('button',name=re.compile(r'^取\s*消$')).click()
  expect(gift).to_have_attribute('aria-checked','false')
  cutting.click(); save(); load()
  expect(cutting).to_have_attribute('aria-checked','true')
  expect(gift).to_have_attribute('aria-checked','false')
  gift.click(); page.get_by_role('dialog').get_by_role('button',name='确认开启',exact=True).click()
  expect(gift).to_have_attribute('aria-checked','true')
  field('领取卡册任务奖励').click(); save()
  assert saved['activity']['actCardCollect']['enabledJadeGift'] is True
  assert saved['activity']['actCardCollect']['enabledCuttingFruit'] is True
  assert saved['activity']['actCardCollect']['enabledCardCollect'] is False
  assert saved['activity']['actCardCollect']['enabledOpenCardPack'] is False
  load()
  expect(gift).to_have_attribute('aria-checked','true')
  expect(cutting).to_have_attribute('aria-checked','true')
  for width in (1100,390,320):
   page.set_viewport_size({'width':width,'height':850})
   field('领取卡册任务奖励').scroll_into_view_if_needed()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
   for control in [gift,cutting]:
    box=control.bounding_box(); assert box and box['x']>=0 and box['x']+box['width']<=width
   page.screenshot(path=str(OUT/f'card-album-{width}.png'))
  gift.click(); cutting.click(); save(); load()
  expect(gift).to_have_attribute('aria-checked','false')
  expect(cutting).to_have_attribute('aria-checked','false')
  assert saved['activity']['actCardCollect']['enabledJadeGift'] is False
  assert saved['activity']['actCardCollect']['enabledCuttingFruit'] is False
  assert not errors,errors
  assert not unexpected,unexpected
  (OUT/'validation.json').write_text(json.dumps({'saveRequests':len(writes),'widths':[1100,390,320],'pageErrors':errors,'externalRequests':unexpected},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  browser.close()
 print('PASS 生产dist勾玉礼包确认/取消、扦插独立开启、保存重载及1100/390/320布局；外网请求0。')
finally: server.shutdown()
