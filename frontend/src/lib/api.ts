import axios from 'axios'
export const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'
export const api = axios.create({ baseURL: API_URL })
export const journeyApi = api
export const analyticsApi = api
export const aiApi = api
export const connectorsApi = api
export const JOURNEY_URL = API_URL
export const ANALYTICS_URL = API_URL
export const AI_URL = API_URL
export const CONNECTORS_URL = API_URL
