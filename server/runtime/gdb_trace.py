import gdb,json,itertools
steps=[]
status={'signal':None,'exit':0}
def on_stop(event):
    if isinstance(event,gdb.SignalEvent):status['signal']=event.stop_signal
def on_exit(event):
    status['exit']=getattr(event,'exit_code',0)
gdb.events.stop.connect(on_stop)
gdb.events.exited.connect(on_exit)
gdb.execute('set pagination off');gdb.execute('set confirm off');gdb.execute('set print elements 64');gdb.execute('set startup-with-shell off')
def value(v,depth=0):
    if depth>3:return '…'
    t=v.type.strip_typedefs()
    try:
        if t.code in (gdb.TYPE_CODE_INT,gdb.TYPE_CODE_ENUM,gdb.TYPE_CODE_BOOL):return int(v)
        if t.code==gdb.TYPE_CODE_FLT:return float(v)
        if t.code==gdb.TYPE_CODE_ARRAY:
            lo,hi=t.range();return [value(v[i],depth+1) for i in range(lo,min(hi+1,lo+64))]
        visual=gdb.default_visualizer(v)
        if visual and hasattr(visual,'children'):
            children=list(itertools.islice(visual.children(),64))
            return [value(x,depth+1) for _,x in children]
        if t.code==gdb.TYPE_CODE_STRUCT:return {f.name:value(v[f],depth+1) for f in t.fields()[:16] if f.name}
        return str(v)[:500]
    except:return '<unavailable>'
def capture():
    f=gdb.newest_frame();frames=[]
    while f:
        sal=f.find_sal()
        if sal.symtab and sal.symtab.fullname().startswith('/work/main.'):
            variables={};block=f.block()
            while block:
                for symbol in block:
                    if (symbol.is_argument or symbol.is_variable) and not symbol.name.startswith('__'):
                        try:variables[symbol.name]=value(f.read_var(symbol))
                        except:pass
                if block.function:break
                block=block.superblock
            frames.append({'name':f.name(),'line':sal.line,'variables':variables})
        f=f.older()
    if frames:
        output=open('/work/program.out').read()[:16000]
        steps.append({'line':frames[0]['line'],'event':'line','frames':frames,'variables':frames[0]['variables'],'stdout':output})
    return bool(frames)
try:
    gdb.execute('break main',to_string=True)
    gdb.execute('set environment LD_PRELOAD=/opt/sortscope/io_redirect.so',to_string=True)
    gdb.execute('run',to_string=True)
    while gdb.selected_inferior().threads() and len(steps)<1500:
        if status['signal']:break
        in_source=capture()
        gdb.execute('next' if in_source else 'continue',to_string=True)
    error=('Program stopped with '+status['signal']) if status['signal'] else ('Program exited with code '+str(status['exit'])) if status['exit'] else 'Trace limit reached (1500 events).' if len(steps)>=1500 else None
except Exception as e:error=str(e)
finally:
    result={'events':steps,'stdout':open('/work/program.out').read()[:16000] if __import__('os').path.exists('/work/program.out') else '', 'error':error,'traceKind':'debugger line trace (step over calls)'}
    open('/work/trace.json','w').write(json.dumps(result))
