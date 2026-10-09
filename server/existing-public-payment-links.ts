/** Existing HighLevel/FastPayDirect regular-price public links. No new prices or provider records. */
const publicPaymentLinks: Record<string, string> = {
  "curriculum.digital.module.01": "https://agent.bossmobility.net/payment-link/6a5aceb9a655fa0b802a4ec0",
  "curriculum.digital.module.02": "https://agent.bossmobility.net/payment-link/6a5acef97b99151a5403f3d8",
  "curriculum.digital.module.03": "https://agent.bossmobility.net/payment-link/6a5acf00a655fa0b802a4ec2",
  "curriculum.digital.module.04": "https://agent.bossmobility.net/payment-link/6a5acf3aa655fa0b802a4ec3",
  "curriculum.digital.module.05": "https://agent.bossmobility.net/payment-link/6a5acf407b99151a5403f3d9",
  "curriculum.digital.module.06": "https://agent.bossmobility.net/payment-link/6a5acf47a655fa0b802a4ec4",
  "curriculum.digital.module.07": "https://agent.bossmobility.net/payment-link/6a5acf4ea655fa0b802a4ec5",
  "curriculum.digital.module.08": "https://agent.bossmobility.net/payment-link/6a5acf567b99151a5403f3dc",
  "curriculum.digital.module.09": "https://agent.bossmobility.net/payment-link/6a5acf5ca655fa0b802a4ec6",
  "curriculum.digital.module.10": "https://agent.bossmobility.net/payment-link/6a5acf63a655fa0b802a4ec7",
  "curriculum.digital.module.11": "https://agent.bossmobility.net/payment-link/6a5acf697b99151a5403f3dd",
  "curriculum.digital.module.12": "https://agent.bossmobility.net/payment-link/6a5acf72a655fa0b802a4ec8",
  "curriculum.manuscript.module.01": "https://agent.bossmobility.net/payment-link/6a5acf797b99151a5403f3de",
  "curriculum.manuscript.module.02": "https://agent.bossmobility.net/payment-link/6a5acf807b99151a5403f3e0",
  "curriculum.manuscript.module.03": "https://agent.bossmobility.net/payment-link/6a5acf877b99151a5403f3e1",
  "curriculum.manuscript.module.04": "https://agent.bossmobility.net/payment-link/6a5acf8ea655fa0b802a4eca",
  "curriculum.manuscript.module.05": "https://agent.bossmobility.net/payment-link/6a5acf957b99151a5403f3e2",
  "curriculum.manuscript.module.06": "https://agent.bossmobility.net/payment-link/6a5acf9c7b99151a5403f3e3",
  "curriculum.manuscript.module.07": "https://agent.bossmobility.net/payment-link/6a5acfa37b99151a5403f3e4",
  "curriculum.manuscript.module.08": "https://agent.bossmobility.net/payment-link/6a5acfaa7b99151a5403f3e5",
  "curriculum.manuscript.module.09": "https://agent.bossmobility.net/payment-link/6a5acfb1a655fa0b802a4ecb",
  "curriculum.manuscript.module.10": "https://agent.bossmobility.net/payment-link/6a5acfb87b99151a5403f3e6",
  "curriculum.manuscript.module.11": "https://agent.bossmobility.net/payment-link/6a5acfc0a655fa0b802a4ecc",
  "curriculum.manuscript.module.12": "https://agent.bossmobility.net/payment-link/6a5acfc7a655fa0b802a4ece",
  "curriculum.digital.complete": "https://agent.bossmobility.net/payment-link/6a5acfce7b99151a5403f3e7",
  "curriculum.bundle.complete": "https://agent.bossmobility.net/payment-link/6a5acfd6a655fa0b802a4ecf",
};

/** Preserve database overrides, only restore already-issued links for exact public prices. */
export function getExistingPublicCheckoutLink(code: string, publicPriceCents: number, storedLink: string | null): string | null {
  if (storedLink) return storedLink;
  const expected = code.includes(".module.") ? 1499 : code === "curriculum.digital.complete" ? 7900 : code === "curriculum.bundle.complete" ? 12900 : null;
  return expected !== null && publicPriceCents === expected ? publicPaymentLinks[code] || null : null;
}
