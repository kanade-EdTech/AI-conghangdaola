"""Export only the independent AI project to a publication checkout under output/."""
from pathlib import Path
import argparse, json, zipfile

root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('destination',type=Path)
parser.add_argument('--release-version',help='Include this completed release instead of the working version')
args=parser.parse_args()
destination=args.destination.resolve()
if not destination.is_relative_to(root/'output') or destination==root/'output':
    raise SystemExit('Publication destination must be a child of this workspace output/')
if destination.is_symlink():raise SystemExit('Refusing symlink destination')
files=set()
for name in ['README.md','LICENSE','THIRD_PARTY_NOTICES.md','.gitignore','package.json','ai-project.json','启动AI预览.cmd']:
    files.add(root/name)
for folder in ['src/ai','assets/ai-icons']:
    files.update(file for file in (root/folder).rglob('*') if file.is_file())
for pattern in ['data/ai-*.json','data/llm-models.json','scripts/ai-*.mjs','scripts/ai-*.py','scripts/import-*-image-pack.py','scripts/browser-ai*.js','tests/ai-*.test.cjs','tests/fixtures/ai.catalog.json']:
    files.update(root.glob(pattern))
if args.release_version:
    cutoff=max((root/'release'/f'ai-tier-list-{platform}-{args.release_version}.zip').stat().st_mtime for platform in ['toy','xhs'])
    files={file for file in files if not (file.parent==root/'scripts' and file.name.startswith('browser-ai') and file.stat().st_mtime>cutoff)}
for file in (root/'docs').glob('*.md'):
    if file.name.startswith('AI') or (file.name.startswith('2026-10-24-') and '-GitHub' in file.name) or any(word in file.name for word in ['-AI','-App','-LLM','-Toy-0.1','-Toy首次预览','-Toy审核与minitool','-常用触屏','-新增App','-用户确认分期','-语言模型半年','-结果图模型名','-界面文案','-小红书官方禁止']):
        files.add(file)
project=json.loads((root/'ai-project.json').read_text(encoding='utf-8'))
for platform in ['toy','xhs']:
    version=args.release_version or project['platforms'][platform]['version']
    if not version or any(char not in '0123456789.-abcdefghijklmnopqrstuvwxyz' for char in version):raise SystemExit('Invalid release version')
    for name in [f'ai-tier-list-{platform}-{version}.zip',f'ai-{platform}-{version}-manifest.json']:
        files.add(root/'release'/name)
files.update((root/'release').glob('ai-toy-submission-*.json'))
files.update((root/'release').glob('ai-toy-cover-*.png'))
files.update((root/'release').glob('ai-toy-icon-*.png'))
for source in sorted(files):
    if not source.is_file():raise SystemExit('Missing export input: '+str(source.relative_to(root)))
source_bytes={source:source.read_bytes() for source in sorted(files)}
if args.release_version:
    runtime=['index.html','style.css','core.js','storage.js','poster.js','app.js','interaction/session.js','interaction/hit-test.js','interaction/input.js','interaction/drag.js']
    for platform in ['toy','xhs']:
        with zipfile.ZipFile(root/'release'/f'ai-tier-list-{platform}-{args.release_version}.zip') as archive:
            if platform=='toy':
                for name in runtime:source_bytes[root/'src/ai'/name]=archive.read(name)
            elif any(archive.read(name)!=source_bytes[root/'src/ai'/name] for name in runtime):
                raise SystemExit('Unexpected platform-specific runtime source differences')
            source_bytes[root/'src/ai/platforms'/f'{platform}.js']=archive.read('platform.js')
    for config_name in ['ai-project.json','package.json']:
        value=json.loads(source_bytes[root/config_name])
        if config_name=='package.json':value['version']=args.release_version+'-dev.1'
        else:
            for platform in value['platforms'].values():platform.update(version=args.release_version,previewVersion=args.release_version+'-dev.1')
        source_bytes[root/config_name]=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
for source,payload in source_bytes.items():
    relative=source.relative_to(root)
    if '.git' in relative.parts or source.is_symlink():raise SystemExit('Unsafe export input')
    target=destination/relative
    if target.is_symlink():raise SystemExit('Refusing symlink target')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(payload)
print(json.dumps({'destination':str(destination),'files':len(files),'bytes':sum(map(len,source_bytes.values()))},ensure_ascii=False))
