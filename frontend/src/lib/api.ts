import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const articleApi = {
  getAll: () => api.get("/articles"),
  getById: (id: string) => api.get(`/articles/${id}`),
  upload: (formData: FormData) => api.post("/articles/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  analyze: (id: string) => api.post(`/articles/${id}/analyze`),
};

export const insightApi = {
  getStats: () => api.get("/insights/stats"),
  queryAI: (query: string) => api.post("/insights/ask", { query }),
};

export default api;
