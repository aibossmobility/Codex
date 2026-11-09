import type { Express, Request, Response } from "express";
import type {} from "express-session";
import fs from "node:fs";
import path from "node:path";
import {
  createPrivateKey, createPublicKey, generateKeyPairSync,
  randomBytes, randomUUID, sign, createHash
} from "node:crypto";

const ORIGIN = "https://papalifecoach.com";
const CALLBACK = "https://ai.bossmobilelifecoach.com/auth/papa/callback";
const STATE = /^[A-Za-z0-9_-]{43}$/;
const OWNER_EMAIL = "brian@bossmobility.net";
const OWNER_USERNAME = "papalife";
const KEY_NAME = "papa-ai-boss-owner-sso-ed25519.pem";

type Admin = { id: number; username: string; email: string };

function keyPair(directory: string) {
  const file = path.join(directory, KEY_NAME);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(file)) {
    const pair = generateKeyPairSync("ed25519");
    const privatePem = pair.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
    try {
      const fd = fs.openSync(file, "wx", 0o600);
      try { fs.writeFileSync(fd, privatePem, { encoding: "utf8" }); }
      finally { fs.closeSync(fd); }
    } catch (err: any) {
      if (err?.code !== "EEXIST") throw err;
    }
  }
  const st = fs.lstatSync(file);
  if (!st.isFile() || (st.mode & 0o077) !== 0)
    throw new Error("Papa Life SSO private signing key has unsafe permissions");
  const privateKey = createPrivateKey(fs.readFileSync(file, "utf8"));
  const publicKey = createPublicKey(privateKey);
  const publicDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
  const publicBase64 = publicDer.toString("base64");
  const kid = "papa-owner-sso-" + createHash("sha256").update(publicDer).digest("hex").slice(0,16);
  return { privateKey, publicBase64, kid };
}

function signedTicket(directory: string, user: Admin, state: string) {
  const { privateKey, kid } = keyPair(directory);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg:"EdDSA",typ:"JWT",kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify({
    iss: ORIGIN, aud: "ai-boss-mobility-owner-os", sub: String(user.id),
    email: OWNER_EMAIL, state, iat: now, exp: now + 90, jti: randomUUID(),
    owner_verified: true
  })).toString("base64url");
  const content = header + "." + body;
  const signature = sign(null, Buffer.from(content), privateKey).toString("base64url");
  return content + "." + signature;
}

/** A separate-site login: no shared cookies or password copies. One-time
 * 90-second signed tickets are issued only from Papa's existing owner session.
 * The public key is safe to publish; private signer stays on the /data volume. */
export function installPapaAiBossOwnerSso(
  app: Express,
  options: { directory: string; getAdminById: (id: number) => Admin | undefined }
) {
  app.get("/api/auth/ai-boss-sso/public-key", (_req: Request, res: Response) => {
    res.set("Cache-Control","no-store");
    res.set("X-Robots-Tag","noindex, nofollow");
    try {
      const { publicBase64, kid } = keyPair(options.directory);
      res.json({ ok:true,alg:"EdDSA",kid,publicKey:publicBase64,issuer:ORIGIN });
    } catch {
      res.status(503).json({ok:false,error:"Owner SSO not configured"});
    }
  });

  app.get("/api/auth/ai-boss-sso/authorize", (req: Request, res: Response) => {
    res.set("Cache-Control","no-store");
    res.set("Referrer-Policy","no-referrer");
    res.set("X-Robots-Tag","noindex, nofollow");
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!STATE.test(state)) return res.status(400).type("text/plain").send("Invalid sign-in request");
    const session = req.session as any;
    const adminId = Number(session?.adminId);
    if (!Number.isSafeInteger(adminId) || adminId <= 0 || !session?.adminUser) {
      const returnTo = "/api/auth/ai-boss-sso/authorize?state="+encodeURIComponent(state);
      return res.redirect(302, "/login?returnTo="+encodeURIComponent(returnTo));
    }
    const owner = options.getAdminById(adminId);
    if (!owner || owner.username !== OWNER_USERNAME ||
      owner.email.trim().toLowerCase() !== OWNER_EMAIL ||
      String(session.adminUser?.email||"").trim().toLowerCase() !== OWNER_EMAIL ||
      Number(session.adminUser?.id) !== owner.id) {
      return res.status(403).type("text/plain").send("This account is not authorized for the AI Boss owner dashboard");
    }
    try {
      const ticket = signedTicket(options.directory,owner,state);
      const returnUrl = new URL(CALLBACK);
      returnUrl.searchParams.set("state",state);
      returnUrl.searchParams.set("ticket",ticket);
      return res.redirect(303,returnUrl.toString());
    } catch {
      return res.status(503).type("text/plain").send("Unified sign-in is temporarily unavailable");
    }
  });
}
