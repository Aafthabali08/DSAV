import json,sys,subprocess,os,time
payload=json.load(sys.stdin)
language=payload['language']
open('/work/stdin.txt','w').write(payload.get('stdin',''))
names={'python':'main.py','c':'main.c','cpp':'main.cpp','java':'Main.java','javascript':'main.cjs'}
open('/work/'+names[language],'w').write(payload['code'])
compile_ms=0

def run(cmd,measure=False):
    if measure:cmd=['python3','/opt/sortscope/measure.py',*cmd]
    return subprocess.run(cmd,cwd='/work',capture_output=True,text=True,timeout=12)

def finish(result):
    metrics={'compileMs':compile_ms}
    if os.path.exists('/work/execution-metrics.json'):
        metrics.update(json.load(open('/work/execution-metrics.json')))
    result['metrics']=metrics
    print(json.dumps(result))

try:
    if language in ('c','cpp','java'):
        cmd=['javac','-encoding','UTF-8','-g','-J-Xmx128m','Main.java'] if language=='java' else ['gcc' if language=='c' else 'g++','-g','-O0','-std=c17' if language=='c' else '-std=c++17',names[language],'-o','program']
        started=time.perf_counter()
        built=run(cmd)
        compile_ms=round((time.perf_counter()-started)*1000,2)
        if built.returncode:
            finish({'events':[],'stdout':'','error':built.stderr[:16000],'phase':'compile'})
            sys.exit()
    commands={
        'python':['python3','/opt/sortscope/python_trace.py'],
        'javascript':['node','--max-old-space-size=128','/opt/sortscope/js_trace.cjs'],
        'java':['java','-Xmx128m','-XX:ActiveProcessorCount=1','--add-modules','jdk.jdi','-cp','/opt/sortscope','JavaTracer'],
        'c':['gdb','--batch','-q','-x','/opt/sortscope/gdb_trace.py','./program'],
        'cpp':['gdb','--batch','-q','-x','/opt/sortscope/gdb_trace.py','./program']
    }
    result=run(commands[language],measure=True)
    if language in ('c','cpp') and os.path.exists('/work/trace.json'):
        trace=json.load(open('/work/trace.json'))
        stderr=open('/work/program.err').read()[:16000] if os.path.exists('/work/program.err') else ''
        if stderr:trace['stderr']=stderr
        finish(trace)
    else:
        try:parsed=json.loads(result.stdout)
        except Exception:parsed={'events':[],'stdout':result.stdout[:16000],'error':result.stderr[:16000] or 'Execution did not produce a trace.','phase':'runtime'}
        finish(parsed)
except subprocess.TimeoutExpired:
    finish({'events':[],'stdout':'','error':'Execution timed out after 12 seconds. Reduce input or check for an infinite loop.','phase':'runtime'})
except Exception as e:
    finish({'events':[],'stdout':'','error':str(e),'phase':'runtime'})
