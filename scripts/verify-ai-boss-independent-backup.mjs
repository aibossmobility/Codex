/**
 * Explicit single-artifact independent backup-and-restore verification.
 * Run only on an authorized machine with a pre-mounted, separately hosted backup volume.
 * No customer messaging, payments, invoice authorization or network access.
 * A successful result is NOT evidence that a customer's live workflow passed QA.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {constants} from "node:fs";
const safeLabel=(s)=>typeof s==="string"&&/^[a-z][a-z0-9_-]{2,60}$/i.test(s);
const fileHash=async(filepath)=>{
 const hash=createHash("sha256");
 for await(const part of fs.createReadStream(filepath))hash.update(part);
 return hash.digest("hex");
};
const checkDir=async(dir)=>{
 const st=await fsp.lstat(dir);
 if(!st.isDirectory()||st.isSymbolicLink())throw Error("Existing, non-symlink directory required: "+dir);
 return st;
};
export async function verifyIndependentBackup({sourcePath,backupDirectory,restoreDirectory,label}){
 if(!safeLabel(label))throw Error("Safe backup label required");
 if(!path.isAbsolute(sourcePath)||!path.isAbsolute(backupDirectory)||
    !path.isAbsolute(restoreDirectory))throw Error("Absolute paths required");
 const [source,backup,restore]=await Promise.all([
  fsp.lstat(sourcePath),checkDir(backupDirectory),checkDir(restoreDirectory)
 ]);
 if(!source.isFile()||source.isSymbolicLink()||source.size<1||
    source.size>40_000_000)throw Error("Nonempty bounded regular source file required");
 if(source.dev===backup.dev)throw Error("Independent backup must be on a DIFFERENT filesystem device");
 if(restore.dev!==source.dev)throw Error("Restore proof must be on the original filesystem");
 const sourceSha=await fileHash(sourcePath),runId=randomUUID();
 const fileName=label+"-"+runId+".backup";
 const backupPath=path.join(backupDirectory,fileName);
 const restorePath=path.join(restoreDirectory,label+"-"+runId+".restored");
 const manifestPath=backupPath+".proof.json";
 // COPYFILE_EXCL refuses overwrite. No existing customer file is touched.
 await fsp.copyFile(sourcePath,backupPath,constants.COPYFILE_EXCL);
 const copied=await fsp.open(backupPath,"r");
 try{await copied.sync();}finally{await copied.close();}
 const backupSha=await fileHash(backupPath);
 if(backupSha!==sourceSha)throw Error("Backup hash does not match source");
 // This is a real read from the separately-mounted backup volume.
 await fsp.copyFile(backupPath,restorePath,constants.COPYFILE_EXCL);
 const restoredSha=await fileHash(restorePath);
 if(restoredSha!==sourceSha)throw Error("Restored backup hash does not match source");
 const proof={version:1,runId,label,verifiedAt:new Date().toISOString(),
  verification:"bytes restored from separate filesystem",
  sourcePath,backupPath,restorePath,sourceDevice:source.dev,
  backupDevice:backup.dev,sizeBytes:source.size,
  originalSha256:sourceSha,backupSha256:backupSha,restoredSha256:restoredSha,
  matches:sourceSha===backupSha&&sourceSha===restoredSha,
  invoiceAuthorized:false,customerAccepted:false,customerWorkTested:false};
 await fsp.writeFile(manifestPath,JSON.stringify(proof,null,2)+"\n",{flag:"wx",mode:0o600});
 return {...proof,manifestPath};
}
if(process.argv[1] && fs.realpathSync(process.argv[1])===fs.realpathSync(new URL(import.meta.url))){
 const [sourcePath,backupDirectory,restoreDirectory,label]=process.argv.slice(2);
 verifyIndependentBackup({sourcePath,backupDirectory,restoreDirectory,label})
 .then(result=>{process.stdout.write(JSON.stringify(result,null,2)+"\n");})
 .catch(error=>{console.error("BACKUP VERIFICATION FAILED:",error.message);process.exitCode=1;});
}
