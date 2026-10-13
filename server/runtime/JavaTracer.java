import com.sun.jdi.*;
import com.sun.jdi.connect.*;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;
import java.util.*;
import java.nio.file.*;
import java.io.*;
public class JavaTracer {
 static List<Object> events=new ArrayList<>(); static StringBuffer out=new StringBuffer(),err=new StringBuffer();
 static Object val(Value v,int depth){
  if(v==null)return null;if(v instanceof StringReference)return ((StringReference)v).value();
  if(v instanceof PrimitiveValue){if(v instanceof BooleanValue)return ((BooleanValue)v).value();if(v instanceof CharValue)return v.toString();if(v instanceof IntegerValue)return ((IntegerValue)v).value();return v.toString();}
  if(depth>2)return "…";
  if(v instanceof ArrayReference){List<Object>a=new ArrayList<>();ArrayReference ar=(ArrayReference)v;for(Value x:ar.getValues(0,Math.min(64,ar.length())))a.add(val(x,depth+1));return a;}
  if(v instanceof ObjectReference){ObjectReference o=(ObjectReference)v;if(o.referenceType().name().equals("java.util.Scanner"))return "<Scanner>";Map<String,Object>m=new LinkedHashMap<>();for(Field f:o.referenceType().allFields()){if(m.size()>=12)break;if(!f.isStatic())m.put(f.name(),val(o.getValue(f),depth+1));}return m;}
  return v.toString();
 }
 static String json(Object o){if(o==null)return "null";if(o instanceof Boolean||o instanceof Number)return o.toString();if(o instanceof Map){List<String>a=new ArrayList<>();for(Object k:((Map<?,?>)o).keySet())a.add(json(k.toString())+":"+json(((Map<?,?>)o).get(k)));return "{"+String.join(",",a)+"}";}if(o instanceof Iterable){List<String>a=new ArrayList<>();for(Object x:(Iterable<?>)o)a.add(json(x));return "["+String.join(",",a)+"]";}StringBuilder escaped=new StringBuilder("\"");for(char c:o.toString().toCharArray()){if(c=='"'||c=='\\')escaped.append('\\').append(c);else if(c<32)escaped.append(String.format("\\u%04x",(int)c));else escaped.append(c);}return escaped.append('"').toString();}

 static void capture(ThreadReference t)throws Exception{List<Object>frames=new ArrayList<>();for(StackFrame f:t.frames()){Location l=f.location();if(!l.declaringType().name().startsWith("Main"))continue;Map<String,Object>vars=new LinkedHashMap<>();try{for(LocalVariable v:f.visibleVariables())vars.put(v.name(),val(f.getValue(v),0));}catch(AbsentInformationException e){}frames.add(Map.of("name",l.method().name(),"line",l.lineNumber(),"variables",vars));}if(frames.size()>0){Map f=(Map)frames.get(0);events.add(Map.of("line",f.get("line"),"event","line","variables",f.get("variables"),"frames",frames,"stdout",out.toString()));}}
 static Thread drain(InputStream stream,StringBuffer target){Thread t=new Thread(()->{try{Reader reader=new InputStreamReader(stream,java.nio.charset.StandardCharsets.UTF_8);int c;while((c=reader.read())!=-1){if(target.length()<16000)target.append((char)c);}}catch(Exception e){}});t.setDaemon(true);t.start();return t;}
 public static void main(String[]args)throws Exception{
  LaunchingConnector connector=Bootstrap.virtualMachineManager().defaultConnector();Map<String,Connector.Argument> options=connector.defaultArguments();options.get("main").setValue("Main");options.get("options").setValue("-cp /work -Xmx128m -XX:ActiveProcessorCount=1");VirtualMachine vm=connector.launch(options);Process p=vm.process();Thread output=drain(p.getInputStream(),out),errors=drain(p.getErrorStream(),err);p.getOutputStream().write(Files.readAllBytes(Path.of("/work/stdin.txt")));p.getOutputStream().close();EventRequestManager manager=vm.eventRequestManager();ClassPrepareRequest prepare=manager.createClassPrepareRequest();prepare.addClassFilter("Main");prepare.enable();String error=null;boolean done=false;vm.resume();
  try{while(!done&&events.size()<1500){EventSet set=vm.eventQueue().remove(1000);if(set==null)continue;for(Event event:set){if(event instanceof ClassPrepareEvent){ReferenceType cls=((ClassPrepareEvent)event).referenceType();for(Method m:cls.methodsByName("main")){BreakpointRequest b=manager.createBreakpointRequest(m.location());b.enable();}}
   if(event instanceof BreakpointEvent||event instanceof StepEvent){ThreadReference thread=((LocatableEvent)event).thread();capture(thread);for(StepRequest r:new ArrayList<>(manager.stepRequests()))manager.deleteEventRequest(r);StepRequest request=manager.createStepRequest(thread,StepRequest.STEP_LINE,StepRequest.STEP_INTO);for(String prefix:new String[]{"java.*","javax.*","sun.*","jdk.*","com.sun.*"})request.addClassExclusionFilter(prefix);request.addCountFilter(1);request.enable();}
   if(event instanceof VMDeathEvent||event instanceof VMDisconnectEvent)done=true;
  }if(!done)set.resume();}}
  catch(VMDisconnectedException e){}catch(Exception e){error=e.toString();}
  if(events.size()>=1500){error="Trace limit reached (1500 events).";try{vm.exit(1);}catch(Exception e){}}
  output.join(500);errors.join(500);if(err.length()>0)error=err.toString();Map<String,Object>result=new LinkedHashMap<>();result.put("events",events);result.put("stdout",out.toString());result.put("error",error);result.put("traceKind","automatic JVM line trace");System.out.println(json(result));
 }
}
