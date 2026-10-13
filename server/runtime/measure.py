"""Measure one compiler/debugger process tree without altering its stdout."""
import os,sys,time,json
start=time.perf_counter()
pid=os.fork()
if pid==0:
    os.execvp(sys.argv[1],sys.argv[1:])
_,status,usage=os.wait4(pid,0)
with open('/work/execution-metrics.json','w') as f:
    json.dump({'executionMs':round((time.perf_counter()-start)*1000,2),'cpuMs':round((usage.ru_utime+usage.ru_stime)*1000,2),'peakMemoryKiB':usage.ru_maxrss,'scope':'Execution process tree, including interpreter/debugger and trace recording; compilation excluded.'},f)
sys.exit(os.waitstatus_to_exitcode(status))
