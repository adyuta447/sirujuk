import { api } from "./api";
import type { Stats } from "../types/referral";

export const getStats = () => api<Stats>("/stats");
