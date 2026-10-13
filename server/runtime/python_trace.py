import sys, json, io, traceback, types, math
from collections import deque
source = open('/work/main.py').read()
output = io.StringIO()
events = []
def safe(value, depth=0):
    if type(value) is float and not math.isfinite(value): return str(value)
    if value is None or type(value) in (bool,int,float,str): return value if not isinstance(value,str) else value[:2000]
    if depth>5: return '…'
    if type(value) in (list,tuple): return [safe(v,depth+1) for v in value[:64]]
    if type(value) is dict: return {str(k)[:100]:safe(v,depth+1) for k,v in list(value.items())[:32]}
    if type(value) is set: return [safe(v,depth+1) for v in list(value)[:64]]
    if type(value) is deque: return {'__sortscopeType':'Queue','items':[safe(v,depth+1) for v in list(value)[:64]]}
    if hasattr(value, '__dict__') and not isinstance(value,(types.ModuleType,types.FunctionType,type)):
        return {str(k):safe(v,depth+1) for k,v in list(vars(value).items())[:32] if not k.startswith('__')}
    return '<'+type(value).__name__+'>'
def tracer(frame,event,arg):
    if frame.f_code.co_filename!='/work/main.py': return tracer
    if event not in ('line','return','exception','call'): return tracer
    if len(events)>=1500: raise RuntimeError('Trace limit reached (1500 events). Use a smaller input.')
    frames=[]; f=frame
    while f:
        if f.f_code.co_filename=='/work/main.py':
            variables={k:safe(v) for k,v in f.f_locals.items() if not k.startswith('__') and not isinstance(v,(types.ModuleType,types.FunctionType,type))}
            frames.append({'name':f.f_code.co_name,'line':f.f_lineno,'variables':variables})
        f=f.f_back
    events.append({'line':frame.f_lineno,'event':event,'frames':frames,'variables':frames[0]['variables'] if frames else {},'stdout':output.getvalue()[:16000]})
    if output.tell()>16000: raise RuntimeError('Output limit reached (16000 characters).')
    return tracer
error=None
phase=None
error_line=None
original=sys.stdout
try:
    sys.stdin=io.StringIO(open('/work/stdin.txt').read());sys.stdout=output
    code=compile(source,'/work/main.py','exec');sys.settrace(tracer)
    exec(code,{'__name__':'__main__','__file__':'/work/main.py'})
except BaseException as e:
    phase='syntax' if isinstance(e,SyntaxError) else 'runtime'
    frames=[f for f in traceback.extract_tb(e.__traceback__) if f.filename=='/work/main.py']
    error_line=e.lineno if isinstance(e,SyntaxError) else (frames[-1].lineno if frames else None)
    error=('Traceback (most recent call last):\n'+''.join(traceback.format_list(frames)) if frames else '')+''.join(traceback.format_exception_only(type(e),e)).strip()
finally:
    sys.settrace(None);sys.stdout=original
print(json.dumps({'events':events,'stdout':output.getvalue()[:16000],'error':error,'phase':phase,'errorLine':error_line,'traceKind':'automatic line trace'}))
