
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_vault_create_and_list_key_masks_secret():
    r = client.post('/v1/vault/keys', json={'provider':'fake','label':'Primary Fake','secret':'sk-test','priority':10})
    assert r.status_code == 200
    key = r.json()
    assert key['provider'] == 'fake'
    assert key['label'] == 'Primary Fake'
    assert key['secret_preview'] == 'sk-...test'
    assert 'secret' not in key
    keys = client.get('/v1/vault/keys').json()
    assert any(k['id'] == key['id'] for k in keys)

def test_generate_video_completes_with_fake_provider():
    client.post('/v1/vault/keys', json={'provider':'fake','label':'Fake','secret':'sk-live','priority':5})
    r = client.post('/v1/generate/video', json={'mode':'image_to_video','prompt':'make a dance reel','image_url':'https://example.com/a.jpg','provider':'fake'})
    assert r.status_code == 200
    task = r.json()
    assert task['status'] == 'completed'
    assert task['provider'] == 'fake'
    assert task['output_url'].endswith('.mp4')
    fetched = client.get(f"/v1/tasks/{task['id']}").json()
    assert fetched['status'] == 'completed'

def test_upload_image_returns_public_asset_url():
    files = {'file': ('photo.jpg', b'fake-jpeg-bytes', 'image/jpeg')}
    r = client.post('/v1/uploads/image', files=files)
    assert r.status_code == 200
    data = r.json()
    assert data['url'].startswith('/uploads/')
    asset = client.get(data['url'])
    assert asset.status_code == 200
    assert asset.content == b'fake-jpeg-bytes'


def test_fal_provider_can_run_in_dry_run_mode():
    client.post('/v1/vault/keys', json={'provider':'fal','label':'Fal','secret':'fal-key','priority':7})
    r = client.post('/v1/generate/video', json={
        'mode':'image_to_video',
        'prompt':'make a cinematic dance reel',
        'image_url':'https://example.com/a.jpg',
        'provider':'fal',
        'dry_run': True,
    })
    assert r.status_code == 200
    task = r.json()
    assert task['status'] == 'completed'
    assert task['provider'] == 'fal'
    assert task['output_url'].startswith('fal-dry-run://')
    assert task['metadata']['model']


def test_presets_available():
    r = client.get('/v1/presets')
    assert r.status_code == 200
    names = [p['name'] for p in r.json()]
    assert 'TikTok Girl Dance' in names
