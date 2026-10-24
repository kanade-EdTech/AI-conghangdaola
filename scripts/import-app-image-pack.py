"""Link the user-confirmed common App selection without changing its source pack."""
from pathlib import Path
import csv, hashlib, json, re, sys

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]).resolve()
csv_file = source / '图标清单.csv'
rows = list(csv.DictReader(csv_file.open(encoding='utf-8-sig', newline='')))
pack = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
date = pack['download_date']
catalog_file = root / 'data/ai-apps.json'
if catalog_file.exists() and json.loads(catalog_file.read_text(encoding='utf-8')).get('importOrigin', {}).get('adapter') != 'app-image-pack':
    raise ValueError('Existing App catalog belongs to another editor')
manifest_file = root / 'assets/ai-icons/manifest.json'
links_file = root / 'data/ai-image-links.json'
manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
links = json.loads(links_file.read_text(encoding='utf-8'))
icons = {entry['key']: entry for entry in manifest['icons']}
records = {entry.get('web_id') or entry['ios_id']: entry for entry in pack['icons']}
items, providers, assets, mapping = [], {}, {}, {}
seen = set()
for row in rows:
    store_id = row.get('ios_id', '')
    web_id = row.get('web_id', '')
    identity = web_id or store_id
    if (web_id and (store_id or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', web_id))) or (not web_id and not re.fullmatch(r'\d+', store_id)) or identity in seen:
        raise ValueError('Invalid or duplicate App identity')
    seen.add(identity)
    if row['group'] not in ['国内', '国外']:
        raise ValueError('Unexpected source group')
    image_file = (source / row['file']).resolve()
    if not image_file.is_relative_to(source):
        raise ValueError('Image escapes source pack')
    image = image_file.read_bytes()
    digest = hashlib.sha256(image).hexdigest()
    if image[:8] != b'\x89PNG\r\n\x1a\n' or digest != row['sha256'] or digest != records[identity]['sha256']:
        raise ValueError('Source image signature/checksum mismatch: ' + identity)
    identifier = 'builtin:app:web:' + web_id if web_id else 'builtin:app:appstore:' + store_id
    shared = next((entry for entry in icons.values() if entry['sha256'] == digest), None) if web_id else None
    key = shared['key'] if shared else 'app-' + ('web-' + web_id if web_id else store_id)
    relative = shared['path'] if shared else 'assets/ai-icons/' + key + '.png'
    destination = root / relative
    if destination.exists() and destination.read_bytes() != image:
        raise ValueError('Conflicting asset: ' + relative)
    if key in icons and icons[key]['sha256'] != digest:
        raise ValueError('Conflicting icon manifest entry')
    if not shared:
        icons[key] = {'key': key, 'path': relative, 'source': row['icon_url'], 'acquiredAt': date, 'sha256': digest,
                      'usageNotes': 'User-selected official App or web-app brand icon. Icon and trademark rights belong to their owners.', 'sourcePackFile': row['file']}
    assets[relative] = image
    mapping[identifier] = key
    provider = 'web-' + web_id if web_id else 'appstore-' + store_id
    providers[provider] = row['name']
    items.append({'id': identifier, 'kind': 'app', 'name': row['name'], 'aliases': [row['current_store_name'][:80]],
                  'providerId': provider, 'providerName': row['name'], 'categoryIds': ['app-domestic' if row['group'] == '国内' else 'app-overseas'],
                  'subtitle': row['group'], 'iconKey': key, 'lifecycle': 'unknown',
                  'sources': [row['app_store_url'], row['lookup_url']], 'verifiedAt': date})
if len(items) != pack.get('app_count', len(pack['icons'])) or len(records) != len(items) or set(records) != seen:
    raise ValueError('Expected the complete confirmed App selection')
catalog = {'catalogRevision': 'app-pack-' + hashlib.sha256(csv_file.read_bytes()).hexdigest()[:16], 'verifiedAt': date,
           'providers': providers, 'categories': {'app-domestic': '国内 App', 'app-overseas': '国外 App'}, 'items': items,
           'importOrigin': {'adapter': 'app-image-pack', 'source': str(source), 'csvSha256': hashlib.sha256(csv_file.read_bytes()).hexdigest(),
                            'selectionBasis': pack['selection_basis'], 'appCount': len(items), 'note': 'Source pack read-only; no popularity ranking implied.'}}
# Verify every input before changing runtime files.
for relative, image in assets.items():
    (root / relative).write_bytes(image)
manifest['icons'] = list(icons.values())
links.setdefault('items', {}).update(mapping)
for file, value in [(manifest_file, manifest), (links_file, links), (catalog_file, catalog)]:
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Imported', len(items), 'Apps and', len(assets), 'verified local PNG files; source pack unchanged')
