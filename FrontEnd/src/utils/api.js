import axios from 'axios';
export const API_BASE_URL='http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response)=>response,
    async(error)=>{
        const originalRequest=error.config;
        if (error.response.status===401 && !originalRequest._retry){
            originalRequest._retry=true;
            const refresh =localStorage.getItem('refresh_token');
            if(refresh){
                try{
                    const response=await axios.post(`${API_BASE_URL}/token/refresh/`,{
                        refresh
                    });
                    localStorage.setItem('access_token',response.data.access);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    return api(originalRequest);
                }catch(err){
                    console.error('Resfresh Token failed',err);
                    //handel logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);
export default api;