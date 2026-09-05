import axios from 'axios'
export const JOURNEY_URL = (import.meta as any).env.VITE_JOURNEY_SERVICE_URL || 'http://localhost:8081'
export const ANALYTICS_URL = (import.meta as any).env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:8082'
export const AI_URL = (import.meta as any).env.VITE_AI_SERVICE_URL || 'http://localhost:8084'
export const CONNECTORS_URL = (import.meta as any).env.VITE_CONNECTORS_SERVICE_URL || 'http://localhost:8083'
export const journeyApi = axios.create({ baseURL: JOURNEY_URL })
export const analyticsApi = axios.create({ baseURL: ANALYTICS_URL })
export const aiApi = axios.create({ baseURL: AI_URL })
export const connectorsApi = axios.create({ baseURL: CONNECTORS_URL })
