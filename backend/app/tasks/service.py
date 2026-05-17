import asyncio
from app.store import TASKS, next_task_id, now
from app.router.policy import choose_provider_key

def serialize_task(t): return dict(t)
def list_tasks(): return [serialize_task(t) for t in TASKS]
def get_task(task_id:int):
    for t in TASKS:
        if t['id']==task_id: return serialize_task(t)
    return None

def create_video_task(payload: dict):
    task={"id":next_task_id(),"type":"video","mode":payload.get('mode','image_to_video'),"provider":payload.get('provider') or 'fake',"status":"queued","prompt":payload.get('prompt',''),"image_url":payload.get('image_url'),"output_url":None,"error":None,"created_at":now(),"finished_at":None}
    TASKS.append(task)
    try:
        provider, key_row, secret = choose_provider_key(task['provider'])
        task['status']='running'
        result=asyncio.run(provider.submit(payload, secret))
        task.update({"status":"completed","provider_task_id":result.provider_task_id,"output_url":result.output_url,"metadata":result.metadata,"finished_at":now()})
        key_row['success_count'] += 1
    except Exception as exc:
        task.update({"status":"failed","error":str(exc),"finished_at":now()})
    return serialize_task(task)
