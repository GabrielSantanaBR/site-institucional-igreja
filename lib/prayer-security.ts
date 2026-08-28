import { decryptPrivateData, encryptPrivateData, saltedHash } from "./private-data";

export type PrayerPayload = { name: string; contact: string; message: string };

export async function encryptPrayer(payload: PrayerPayload) {
  return encryptPrivateData(payload);
}

export async function decryptPrayer(value: string): Promise<PrayerPayload> {
  return decryptPrivateData<PrayerPayload>(value);
}

export async function hashIp(ip: string) {
  return saltedHash(ip);
}
