/** `box-NN-<first 8 chars of the order id>@<domain>`, NN zero-padded to two digits. */
export function buildMailboxAddress(orderId: string, position: number, domain: string): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError('Mailbox position must be a positive integer.');
  }
  const shortId = orderId.replaceAll('-', '').slice(0, 8).toLowerCase();
  return `box-${String(position).padStart(2, '0')}-${shortId}@${domain}`;
}
