"""Review readable XHS artifacts against the official document sections 4.1-4.3.

This is a static worklist, not a platform moderation decision or an obfuscation analyzer.
"""
import argparse, hashlib, json, re, zipfile
from pathlib import Path
from html.parser import HTMLParser

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('zip',type=Path)
args=parser.parse_args()
with zipfile.ZipFile(args.zip) as archive:
    assert archive.testzip() is None
    files=archive.namelist()
    texts={name:archive.read(name).decode('utf-8') for name in files if name.endswith(('.js','.html','.css'))}

rules=[
 ('4.1 定位',r'\bgeolocation\b|\b(?:getCurrentPosition|watchPosition)\s*\('),
 ('4.1 剪贴板',r'\bclipboard\b|\bexecCommand\s*\('),
 ('4.1 硬件连接',r'\b(?:bluetooth|usb|hid|serial)\b'),
 ('4.1 Web 传感器',r'\b(?:Accelerometer|Gyroscope|Magnetometer|AmbientLightSensor|DeviceMotionEvent|DeviceOrientationEvent|devicemotion|deviceorientation)\b'),
 ('4.1 实时通信',r'\b(?:RTCPeerConnection|webkitRTCPeerConnection|RTCDataChannel|WebSocket|EventSource)\b'),
 ('4.1 Worker 与 Service Worker',r'\b(?:Worker|SharedWorker|serviceWorker)\b'),
 ('4.1 共享屏幕与全屏',r'\b(?:getDisplayMedia|requestFullscreen|webkitRequestFullscreen|webkitEnterFullscreen|mozRequestFullScreen)\b'),
 ('4.1 设备信息',r'\b(?:getBattery|enumerateDevices)\b|\b(?:navigator|global\.navigator|window\.navigator)\s*\.\s*connection\b'),
 ('4.1 存储进阶',r'\b(?:requestStorageAccess|hasStorageAccess)\b|\.\s*storage\s*\.\s*persist\b'),
 ('4.1 凭据与 Web Locks',r'\.\s*(?:credentials|locks)\b|\bPublicKeyCredential\b'),
 ('4.1 新窗口及 prompt',r'\.\s*(?:open|prompt)\s*\(|\bprompt\s*\('),
 ('4.2 fetch / XHR',r'\b(?:fetch\s*\(|XMLHttpRequest|sendBeacon\s*\()'),
 ('4.2 动态代码',r'\beval\s*\(|\bnew\s+Function\s*\('),
 ('4.2 WebAssembly',r'\bWebAssembly\b'),
 ('4.2 iframe / object / embed',r'<\s*(?:iframe|object|embed)\b|\b(?:createElement|node)\s*\(\s*[\x22\x27](?:iframe|object|embed)[\x22\x27]'),
 ('4.2 文件下载',r'\bdownload\b|\bcreateObjectURL\b|\bnew\s+Blob\b|blob:'),
 ('4.2 外链与其他小工具跳转',r'\b_blank\b|\blocation\s*\.\s*(?:assign|replace)\s*\(|\blocation\s*\.\s*href\s*=(?!=)|\blocation\s*=(?!=)|\bopenRedPage\s*\('),
 ('4.2 Flash 插件',r'\b(?:ShockwaveFlash|ActiveXObject)\b|application/x-shockwave-flash'),
 ('4.3 支付',r'\bPaymentRequest\b|\bpaymentRequest\b'),
 ('4.3 通知及推送',r'\b(?:Notification|PushManager|PushSubscription|showNotification)\b'),
 ('4.3 NFC',r'\b(?:NDEFReader|NDEFWriter|NFC)\b'),
 ('4.3 MIDI',r'\b(?:requestMIDIAccess|MIDIAccess)\b'),
 ('4.3 XR / AR / VR',r'\.\s*xr\b|\b(?:XRSession|VRDisplay|getVRDisplays)\b'),
 ('4.3 后台同步与下载',r'\b(?:SyncManager|PeriodicSyncManager|BackgroundFetchManager|backgroundFetch|periodicSync)\b'),
 ('4.3 PWA 安装',r'\b(?:beforeinstallprompt|appinstalled)\b|application/manifest\+json'),
 ('4.3 窗口管理',r'\b(?:getScreenDetails|requestWindowPlacement|WindowManagement)\b|\.\s*(?:moveTo|resizeTo)\s*\('),
 ('4.3 指针及键盘锁定',r'\b(?:requestPointerLock|exitPointerLock|pointerLockElement)\b|\.\s*keyboard\s*\.\s*lock\b'),
]
results=[]
for label,pattern in rules:
    findings=[]
    for name,text in texts.items():
        for match in re.finditer(pattern,text,re.I if label.startswith('4.2') else 0):
            findings.append({'file':name,'line':text.count('\n',0,match.start())+1,'match':match.group(0)})
    results.append({'rule':label,'status':'REVIEW' if findings else 'PASS','findings':findings})

class Resources(HTMLParser):
    def __init__(self):super().__init__();self.findings=[];self.forms=0;self.script_open=False
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='form':self.forms+=1
        if tag=='script':self.script_open=True
        if tag=='base':self.findings.append('base element')
        if tag=='a' and ('download' in attrs or attrs.get('target')=='_blank'):self.findings.append('anchor download/blank')
        for key in ['src','href','action','poster']:
            value=attrs.get(key)
            if value and (not value.startswith('./') or value[2:] not in files):self.findings.append(tag+' '+key+' '+value)
    def handle_endtag(self,tag):
        if tag=='script':self.script_open=False
    def handle_data(self,data):
        if self.script_open and data.strip():self.findings.append('inline script')
html=Resources();html.feed(texts['index.html'])
for name,text in texts.items():
    if name.endswith('.css'):
        for match in re.finditer(r'url\(\s*[\x22\x27]?([^\x22\x27)]+)',text):
            if not match[1].startswith(('./','data:')):html.findings.append(name+' external CSS URL '+match[1])
catalog=json.loads(texts['catalog.js'].split('window.AITier.catalogData=',1)[1].strip().removesuffix(';'))
for path in catalog.get('icons',{}).values():
    if not path.startswith('./') or path[2:] not in files:html.findings.append('invalid dynamic icon path '+path)
results.append({'rule':'HTML / CSS / 动态模型图片只引用包内资源','status':'REVIEW' if html.findings else 'PASS','findings':html.findings})
report={
 'artifact':str(args.zip.resolve()),'sha256':hashlib.sha256(args.zip.read_bytes()).hexdigest(),
 'officialDocument':'https://miniapp-sandbox.xiaohongshu.com/minitool/doc#s4-3',
 'checkedOn':'2026-10-23','rules':results,
 'manualReview':['app.js dynamically creates forms; submit handler calls preventDefault before processing.',
                 'contextmenu is cancelled on item cards; no business function requires a system long-press menu.',
                 'source URLs are JSON provenance; item detail renders text without anchors or navigation.',
                 'setPointerCapture / Pointer Events support dragging; no pointer or keyboard lock used.',
                 'album API is called only by save-current-page action; postNote only by share action.'],
 'limits':'Static review of readable project code plus manual call-path review. Does not predict content moderation or guarantee physical WebView behavior.'
}
output=root/'output/ai-xhs-prohibitions-2026-10-23.json'
output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
flagged=[entry for entry in results if entry['status']=='REVIEW']
print(json.dumps({'checked':len(results),'needsReview':flagged,'report':str(output)},ensure_ascii=False,indent=2))
raise SystemExit(1 if flagged else 0)
