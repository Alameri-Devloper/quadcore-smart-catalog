import net from "node:net";
import { once } from "node:events";
export type FaultMode = "BeforeExecution" | "AfterCommitMissing" | "AfterCommitDelayed";
/** QA-only loopback protocol gate. Never records SQL arguments, packets or URLs.
 * BeforeExecution suppresses Parse BEFORE forwarding; it is not an in-flight abort.
 * ReadyForQuery after autocommit establishes the after-commit injection boundary. */
export async function recoveryFaultProxy() {
  const sockets=new Set<net.Socket>();
  let armed=false, target=1, ready=0, mode:FaultMode="AfterCommitMissing";
  const evidence={injected:false,commandSuppressed:false,committedReadyObserved:false,lateDeliveryAttempted:false,lateSocketClosed:false,serverError:false};
  const server=net.createServer(front=>{
    const back=net.connect({host:"127.0.0.1",port:5432});
    sockets.add(front);sockets.add(back);
    front.on("error",()=>back.destroy());back.on("error",()=>front.destroy());
    front.on("close",()=>{sockets.delete(front);back.destroy();});
    back.on("close",()=>{sockets.delete(back);front.destroy();});
    let incoming=Buffer.alloc(0), outgoing=Buffer.alloc(0), suppressed=false;
    front.on("data",data=>{
      if(!armed){back.write(data);return;}
      if(suppressed)return;
      incoming=Buffer.concat([incoming,data]);
      while(incoming.length>=5){
        const size=incoming.readUInt32BE(1)+1;
        if(size<5||size>1048576){front.destroy();back.destroy();return;}
        if(incoming.length<size)return;
        const frame=incoming.subarray(0,size);incoming=incoming.subarray(size);
        if(mode==="BeforeExecution"&&frame[0]===80){
          const text=frame.subarray(frame.indexOf(0,5)+1).toString("utf8");
          const name=["prepare_operation","decide_operation","finalize_operation"][target-1];
          if(text.includes("qsc_public_admission."+name)){
            suppressed=true;evidence.injected=true;evidence.commandSuppressed=true;return;
          }
        }
        back.write(frame);
      }
    });
    back.on("data",data=>{
      if(!armed){front.write(data);return;}
      outgoing=Buffer.concat([outgoing,data]);
      while(outgoing.length>=5){
        const size=outgoing.readUInt32BE(1)+1;
        if(size<5||size>1048576){front.destroy();back.destroy();return;}
        if(outgoing.length<size)return;
        const frame=outgoing.subarray(0,size);outgoing=outgoing.subarray(size);
        if(frame[0]===69)evidence.serverError=true;
        if(frame[0]===90&&++ready===target&&mode!=="BeforeExecution"){
          evidence.injected=true;evidence.committedReadyObserved=true;
          if(mode==="AfterCommitDelayed")setTimeout(()=>{
            evidence.lateDeliveryAttempted=true;evidence.lateSocketClosed=front.destroyed;
            if(!front.destroyed)front.write(frame);
          },300);
          continue;
        }
        front.write(frame);
      }
    });
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const address=server.address();if(!address||typeof address==="string")throw Error("QaProxyUnavailable");
  return {port:address.port,evidence,arm:(stage:number,selected:FaultMode)=>{target=stage;mode=selected;ready=0;armed=true;},disarm:()=>{armed=false;},
    close:async()=>{armed=false;for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
