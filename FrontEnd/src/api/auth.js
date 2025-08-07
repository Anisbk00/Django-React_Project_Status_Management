import axios from 'axios'
import {API_BASE_URL} from  '../utils/api';

export const loginn = async(username,password)=>{
    const response=await axios.post(`${API_BASE_URL}/token/`,{username,password});

    const userResponse=await axios.get(`${API_BASE_URL}/users/me/`,{
        headers:{AUthorization:`Bearer ${response.data.access}`}
    });

    return {
        access:response.data.success,
        refresh: response.data.refresh,
        user:userResponse.data
    };

};
export const refreshToken=async (refresh)=>{
    const response =await axios.post(`${API_BASE_URL}/token/refresh/`,{refresh});
    return response.data;
};