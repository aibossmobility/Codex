"""Prepare a reviewed candidate for the Mac worker; never restart or replace live worker."""
from pathlib import Path
import shutil
home=Path.home()
active=home/'.ai-boss-os/bin/agent-team-queue-worker.ts'
source=Path(__file__).with_name('mac-worker-readonly-deliverables.mjs')
staging=home/'.ai-boss-os/staging/worker-evidence-20261020'
staging.mkdir(parents=True,exist_ok=True,mode=0o700)
s=active.read_text()
old="""  return {...result,...review({project:project as "papa-life"|"ai-boss-mobility",instruction,root})};"""
new="""  Object.assign(result, review({project:project as "papa-life"|"ai-boss-mobility",instruction,root}));"""
assert s.count(old)==1,"GHL return signature changed; fail safely"
s=s.replace(old,new)
old=""" return result;
}
// Approved, allowlisted local *work* tasks."""
new=""" const evidenceSkill=await import(root+'/bin/worker-readonly-deliverables.mjs');
 return {...result,...await evidenceSkill.inspectReadOnlyTask(role,project,instruction,root)};
}
// Approved, allowlisted local *work* tasks."""
assert s.count(old)==1,"Worker role footer changed; fail safely"
s=s.replace(old,new)
old="""   const details=await executeRole(p.role as Role,a.project_key!,String(p.instruction||a.requested_outcome));
   return {summary:'Agent '+p.role+' completed scoped read-only review for '+a.project_key,details};"""
new="""   const details=await executeRole(p.role as Role,a.project_key!,String(p.instruction||a.requested_outcome));
   if(details.deliverable_verified!==true){
     throw Error('Needs follow-up; result not delivered: '+String(details.block_reason||'No verifiable deliverable provided').slice(0,1500)
       +' Next: '+String(details.next_step||'Assign an execution-capable worker.').slice(0,350));
   }
   return {summary:details.deliverable_summary,details};"""
assert s.count(old)==1,"Worker completion handler changed; fail safely"
s=s.replace(old,new)
candidate=staging/'agent-team-queue-worker.ts'
candidate.write_text(s)
shutil.copyfile(source,staging/'worker-readonly-deliverables.mjs')
shutil.copyfile(source.parent.parent/'server/ai-boss-worker-mac-poller.ts',staging/'ai-boss-worker-mac-poller.ts')
shutil.copyfile(source.parent.parent/'server/ai-boss-worker-evidence.ts',staging/'ai-boss-worker-evidence.ts')
print('STAGED_AGENT',candidate)
print('STAGED_SKILL',staging/'worker-readonly-deliverables.mjs')
print('LIVE_WORKER_UNCHANGED',active)
