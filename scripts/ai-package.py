"""Package only previously audited AI build manifests. Never reuse legacy releases."""
from pathlib import Path
import argparse,hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--platform',choices=['toy','xhs'])
args=parser.parse_args()
for platform in ([args.platform] if args.platform else ['toy','xhs']):
    manifest=json.loads((root/'output'/('ai-build-'+platform+'.json')).read_text(encoding='utf-8'))
    assert manifest['applicationId']=='ai-tier-list'
    build=root/'dist'/platform
    assert sorted(str(p.relative_to(build)).replace('\\','/') for p in build.rglob('*') if p.is_file())==manifest['files']
    data={}
    for name in manifest['files']:
        payload=(build/name).read_bytes()
        assert hashlib.sha256(payload).hexdigest()==manifest['hashes'][name], 'Build hash mismatch'
        data[name]=payload
    assert 'index.html' in data
    release=root/'release';release.mkdir(exist_ok=True)
    target=release/('ai-tier-list-'+platform+'-'+manifest['version']+'.zip')
    # An existing version may only be reused for identical content.
    if target.exists():
        with zipfile.ZipFile(target) as archive:
            assert sorted(archive.namelist())==sorted(data) and all(archive.read(k)==v for k,v in data.items()), 'Existing version differs; bump version before packaging'
    else:
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
            for name,payload in data.items():
                info=zipfile.ZipInfo(name,(2026,10,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
                archive.writestr(info,payload)
    with zipfile.ZipFile(target) as archive:assert archive.testzip() is None
    assert target.stat().st_size<=10*1024*1024
    record=dict(manifest,zip=target.name,bytes=target.stat().st_size,unpackedBytes=sum(map(len,data.values())),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),reviewSubmitted=False)
    (release/('ai-'+platform+'-'+manifest['version']+'-manifest.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    print(platform,manifest['version'],target.stat().st_size,'bytes',record['sha256'])
