import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client } from "../models/clients/Client";

const CLIENT_KEY = "client";

export async function saveClient(client: Client) {
  await AsyncStorage.setItem(CLIENT_KEY, JSON.stringify(client));
}

export async function getClient(): Promise<Client | null> {
  const raw = await AsyncStorage.getItem(CLIENT_KEY);
  return raw ? JSON.parse(raw) as Client : null;
}

export async function clearClient() {
  await AsyncStorage.removeItem(CLIENT_KEY);
}
