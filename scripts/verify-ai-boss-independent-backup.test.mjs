import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {verifyIndependentBackup} from "./verify-ai-boss-independent-backup.mjs";
test("rejects unapproved labels without touching files",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"qa-backup-"));
 try{await assert.rejects(()=>verifyIndependentBackup({
 sourcePath:"/tmp/a",backupDirectory:root,restoreDirectory:root,label:"../../forged"
 }),/Safe backup label/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test("rejects same-volume backups before writing anything",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"qa-backup-"));
 try{
  const file=path.join(root,"source.txt");
  await fs.writeFile(file,"internal fake QA fixture, no customer data");
  await assert.rejects(()=>verifyIndependentBackup({
   sourcePath:file,backupDirectory:root,restoreDirectory:root,label:"internal-qa"
  }),/DIFFERENT filesystem/);
  assert.deepEqual((await fs.readdir(root)).sort(),["source.txt"]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("rejects symlink source and empty content",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"qa-backup-"));
 try{
  const file=path.join(root,"source.txt"),link=path.join(root,"symlink.txt");
  await fs.writeFile(file,"");
  await fs.symlink(file,link);
  await assert.rejects(()=>verifyIndependentBackup({
   sourcePath:link,backupDirectory:root,restoreDirectory:root,label:"internal-qa"
  }),/Nonempty bounded regular source/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
